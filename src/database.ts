import * as SQLite from "expo-sqlite";
import type {
  ActiveTimer,
  Book,
  BookInput,
  Note,
  NoteInput,
  ReadingSession,
  Settings,
  Snapshot,
} from "./types";
import {
  DEFAULT_SETTINGS,
  integer,
  validateBook,
  validateNote,
  validatePage,
  validateSettings,
  isActiveTimer,
} from "./validation";
import { MIGRATIONS } from "./schema";
import { timerElapsedMs } from "./analytics";

export interface SessionInput {
  bookId: number;
  startPage: number;
  endPage: number;
  durationSeconds: number;
  startedAt: string;
  source: "manual" | "timer" | "progress";
}
let connection: SQLite.SQLiteDatabase | undefined;
function db() {
  if (!connection) {
    const opened = SQLite.openDatabaseSync("folio.db");
    try {
      opened.execSync(
        "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
      );
      const version =
        opened.getFirstSync<{ user_version: number }>("PRAGMA user_version")
          ?.user_version || 0;
      if (version > MIGRATIONS.length)
        throw new Error(
          "Эта база создана более новой версией FOLIO. Обновите приложение.",
        );
      for (let i = version; i < MIGRATIONS.length; i++)
        opened.withTransactionSync(() => {
          opened.execSync(MIGRATIONS[i]);
          opened.execSync(`PRAGMA user_version=${i + 1}`);
        });
      connection = opened;
    } catch (error) {
      opened.closeSync();
      throw error;
    }
  }
  return connection;
}
function setting<T>(key: string, fallback: T): T {
  const row = db().getFirstSync<{ value: string }>(
    "SELECT value FROM AppSettings WHERE key=?",
    key,
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
function getTimer(): ActiveTimer | null {
  const value = setting<unknown>("timer", null);
  return isActiveTimer(value) ? value : null;
}
function putSetting(key: string, value: unknown) {
  db().runSync(
    "INSERT INTO AppSettings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    key,
    JSON.stringify(value),
  );
}
function getBook(id: number): Book {
  integer(id, "Книга", 1);
  const book = db().getFirstSync<Book>("SELECT * FROM Books WHERE id=?", id);
  if (!book) throw new Error("Книга не найдена.");
  return book;
}
function attemptId(book: Book): number {
  const latest = db().getFirstSync<{ id: number }>(
    "SELECT id FROM ReadingAttempts WHERE bookId=? ORDER BY id DESC LIMIT 1",
    book.id,
  );
  if (latest) return latest.id;
  return db().runSync(
    "INSERT INTO ReadingAttempts(bookId,startedAt,status) VALUES(?,?,?)",
    book.id,
    book.startedAt || new Date().toISOString(),
    book.status,
  ).lastInsertRowId;
}
function normalizedBook(input: BookInput, existing?: Book): BookInput {
  const result = validateBook(input),
    now = new Date().toISOString();
  if (result.status === "reading" || result.status === "finished")
    result.startedAt ||= existing?.startedAt || now;
  if (result.status === "finished") {
    result.finishedAt ||= now;
    if (result.totalPages > 0) result.currentPage = result.totalPages;
  } else result.finishedAt = null;
  return validateBook(result);
}
function addProgress(book: Book, page: number) {
  if (page <= book.currentPage) return;
  const now = new Date().toISOString();
  db().runSync(
    "INSERT INTO ReadingSessions(bookId,attemptId,startedAt,endedAt,durationSeconds,startPage,endPage,source) VALUES(?,?,?,?,0,?,?,?)",
    book.id,
    attemptId(book),
    now,
    now,
    book.currentPage,
    page,
    "progress",
  );
}
function updateAttempt(book: Book, next: BookInput) {
  const latest = db().getFirstSync<{ id: number; endedAt: string | null }>(
    "SELECT id,endedAt FROM ReadingAttempts WHERE bookId=? ORDER BY id DESC LIMIT 1",
    book.id,
  );
  const endedAt =
    next.status === "finished"
      ? next.finishedAt
      : next.status === "abandoned"
        ? new Date().toISOString()
        : null;
  if (
    !latest ||
    (latest.endedAt && next.status === "reading" && book.status !== "reading")
  ) {
    db().runSync(
      "INSERT INTO ReadingAttempts(bookId,startedAt,endedAt,status) VALUES(?,?,?,?)",
      book.id,
      latest?.endedAt
        ? new Date().toISOString()
        : next.startedAt || new Date().toISOString(),
      endedAt,
      next.status,
    );
  } else
    db().runSync(
      "UPDATE ReadingAttempts SET status=?, endedAt=? WHERE id=?",
      next.status,
      endedAt,
      latest.id,
    );
}
const bookColumns = [
  "title",
  "author",
  "isbn",
  "coverUri",
  "description",
  "totalPages",
  "publicationYear",
  "publisher",
  "language",
  "genre",
  "format",
  "status",
  "startedAt",
  "finishedAt",
  "currentPage",
  "rating",
  "review",
] as const;

export const repository = {
  read(): Snapshot {
    const database = db();
    let settings = {
      ...DEFAULT_SETTINGS,
      ...setting<Partial<Settings>>("settings", {}),
    };
    try {
      validateSettings(settings);
    } catch {
      settings = DEFAULT_SETTINGS;
    }
    const rawTimer = setting<unknown>("timer", null);
    const timer =
      isActiveTimer(rawTimer) &&
      database.getFirstSync("SELECT id FROM Books WHERE id=?", rawTimer.bookId)
        ? rawTimer
        : null;
    return {
      books: database.getAllSync<Book>(
        "SELECT * FROM Books ORDER BY createdAt DESC,id DESC",
      ),
      sessions: database.getAllSync<ReadingSession>(
        "SELECT * FROM ReadingSessions ORDER BY startedAt DESC,id DESC",
      ),
      notes: database
        .getAllSync<Omit<Note, "favorite"> & { favorite: number }>(
          "SELECT * FROM Notes ORDER BY createdAt DESC,id DESC",
        )
        .map((n) => ({ ...n, favorite: !!n.favorite })),
      settings,
      yearGoal:
        database.getFirstSync<{ target: number }>(
          "SELECT target FROM ReadingGoals WHERE year=?",
          new Date().getFullYear(),
        )?.target || 12,
      timer,
    };
  },
  saveBook(input: BookInput, id?: number): number {
    let savedId = id || 0;
    db().withTransactionSync(() => {
      const existing = id ? getBook(id) : undefined;
      const next = normalizedBook(input, existing);
      if (
        existing &&
        getTimer()?.bookId === id &&
        (next.currentPage !== existing.currentPage ||
          next.totalPages !== existing.totalPages ||
          next.status !== existing.status)
      )
        throw new Error(
          "Сначала сохраните или отмените текущую сессию таймера.",
        );
      const values = bookColumns.map((k) => next[k]);
      if (existing) {
        updateAttempt(existing, next);
        if (next.currentPage !== existing.currentPage)
          addProgress(existing, next.currentPage);
        db().runSync(
          `UPDATE Books SET ${bookColumns.map((k) => `${k}=?`).join(",")} WHERE id=?`,
          ...values,
          id!,
        );
      } else {
        savedId = db().runSync(
          `INSERT INTO Books(${bookColumns.join(",")},createdAt) VALUES(${bookColumns.map(() => "?").join(",")},?)`,
          ...values,
          new Date().toISOString(),
        ).lastInsertRowId;
        updateAttempt(
          { ...next, id: savedId, createdAt: new Date().toISOString() },
          next,
        );
      }
    });
    return savedId;
  },
  deleteBook(id: number) {
    db().withTransactionSync(() => {
      getBook(id);
      db().runSync("DELETE FROM Books WHERE id=?", id);
      if (getTimer()?.bookId === id) putSetting("timer", null);
    });
  },
  updateProgress(bookId: number, page: number) {
    const book = getBook(bookId);
    validatePage(page, book.totalPages);
    if (getTimer()?.bookId === bookId)
      throw new Error("Сначала сохраните или отмените текущую сессию таймера.");
    db().withTransactionSync(() => {
      const complete = book.totalPages > 0 && page === book.totalPages;
      const status = complete
        ? "finished"
        : book.status === "want" || book.status === "finished"
          ? "reading"
          : book.status;
      const next: BookInput = {
        ...book,
        currentPage: page,
        status,
        startedAt: book.startedAt || new Date().toISOString(),
        finishedAt: complete
          ? book.finishedAt || new Date().toISOString()
          : null,
      };
      updateAttempt(book, next);
      addProgress(book, page);
      db().runSync(
        "UPDATE Books SET currentPage=?,status=?,startedAt=?,finishedAt=? WHERE id=?",
        next.currentPage,
        next.status,
        next.startedAt,
        next.finishedAt,
        bookId,
      );
    });
  },
  saveSession(input: SessionInput, finishTimer = false) {
    const book = getBook(input.bookId);
    validatePage(input.startPage, book.totalPages);
    validatePage(input.endPage, book.totalPages);
    if (input.endPage < input.startPage)
      throw new Error("Конечная страница не может быть меньше начальной.");
    integer(input.durationSeconds, "Время чтения", 0, 31536000);
    if (!["timer", "manual", "progress"].includes(input.source))
      throw new Error("Некорректный тип сессии.");
    const started = new Date(input.startedAt);
    if (
      !Number.isFinite(started.getTime()) ||
      started.getTime() > Date.now() + 60000
    )
      throw new Error("Укажите корректную дату сессии, не позже текущей.");
    if (input.durationSeconds === 0 && input.startPage === input.endPage)
      throw new Error("Укажите прочитанные страницы или время чтения.");
    const timer = getTimer();
    if (finishTimer && (!timer || timer.bookId !== book.id))
      throw new Error("Эта сессия таймера уже сохранена или отменена.");
    if (timer?.bookId === book.id && !finishTimer)
      throw new Error("Сначала сохраните или отмените текущую сессию таймера.");
    if (finishTimer && timer && input.startPage !== timer.startPage)
      throw new Error("Начальная страница сессии не совпадает с таймером.");
    db().withTransactionSync(() => {
      const endedAt = finishTimer
        ? new Date().toISOString()
        : new Date(
            Math.min(
              Date.now(),
              started.getTime() + input.durationSeconds * 1000,
            ),
          ).toISOString();
      db().runSync(
        "INSERT INTO ReadingSessions(bookId,attemptId,startedAt,endedAt,durationSeconds,startPage,endPage,source) VALUES(?,?,?,?,?,?,?,?)",
        book.id,
        attemptId(book),
        started.toISOString(),
        endedAt,
        input.durationSeconds,
        input.startPage,
        input.endPage,
        input.source,
      );
      const page = Math.max(book.currentPage, input.endPage),
        complete = book.totalPages > 0 && page === book.totalPages;
      const status = complete
        ? "finished"
        : book.status === "want"
          ? "reading"
          : book.status;
      const next: BookInput = {
        ...book,
        currentPage: page,
        status,
        startedAt: book.startedAt || started.toISOString(),
        finishedAt: complete ? book.finishedAt || endedAt : book.finishedAt,
      };
      db().runSync(
        "UPDATE Books SET currentPage=?,status=?,startedAt=?,finishedAt=? WHERE id=?",
        page,
        status,
        next.startedAt,
        next.finishedAt,
        book.id,
      );
      updateAttempt(book, next);
      if (finishTimer) putSetting("timer", null);
    });
  },
  saveNote(input: NoteInput, id?: number) {
    const book = getBook(input.bookId);
    const next = validateNote(input, book.totalPages);
    const now = new Date().toISOString();
    if (id) {
      const result = db().runSync(
        "UPDATE Notes SET bookId=?,page=?,type=?,text=?,favorite=?,updatedAt=? WHERE id=?",
        next.bookId,
        next.page,
        next.type,
        next.text,
        next.favorite ? 1 : 0,
        now,
        id,
      );
      if (!result.changes) throw new Error("Заметка не найдена.");
    } else
      db().runSync(
        "INSERT INTO Notes(bookId,page,type,text,favorite,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)",
        next.bookId,
        next.page,
        next.type,
        next.text,
        next.favorite ? 1 : 0,
        now,
        now,
      );
  },
  deleteNote(id: number) {
    db().runSync("DELETE FROM Notes WHERE id=?", id);
  },
  setSettings(patch: Partial<Settings>) {
    validateSettings(patch);
    putSetting("settings", {
      ...DEFAULT_SETTINGS,
      ...setting<Partial<Settings>>("settings", {}),
      ...patch,
    });
  },
  setYearGoal(goal: number) {
    integer(goal, "Годовая цель", 1, 10000);
    db().runSync(
      "INSERT INTO ReadingGoals(year,target) VALUES(?,?) ON CONFLICT(year) DO UPDATE SET target=excluded.target",
      new Date().getFullYear(),
      goal,
    );
  },
  startTimer(bookId: number) {
    const book = getBook(bookId);
    const active = getTimer();
    if (active) {
      if (active.bookId === bookId) return;
      throw new Error(
        "Уже идёт сессия другой книги. Сохраните или отмените её.",
      );
    }
    if (book.totalPages > 0 && book.currentPage >= book.totalPages)
      throw new Error(
        "Книга завершена. Для повторного чтения измените прогресс.",
      );
    const now = new Date().toISOString();
    db().withTransactionSync(() => {
      if (book.status !== "reading") {
        db().runSync(
          "UPDATE Books SET status=?,startedAt=?,finishedAt=NULL WHERE id=?",
          "reading",
          book.startedAt || now,
          book.id,
        );
        updateAttempt(book, {
          ...book,
          status: "reading",
          startedAt: book.startedAt || now,
          finishedAt: null,
        });
      }
      putSetting("timer", {
        bookId,
        startedAt: now,
        runningSince: Date.now(),
        elapsedMs: 0,
        startPage: book.currentPage,
      } satisfies ActiveTimer);
    });
  },
  pauseTimer() {
    const timer = getTimer();
    if (timer && timer.runningSince !== null)
      putSetting("timer", {
        ...timer,
        elapsedMs: timerElapsedMs(timer),
        runningSince: null,
      });
  },
  resumeTimer() {
    const timer = getTimer();
    if (timer && timer.runningSince === null)
      putSetting("timer", { ...timer, runningSince: Date.now() });
  },
  discardTimer() {
    putSetting("timer", null);
  },
  clearAll() {
    db().withTransactionSync(() => {
      db().execSync(
        "DELETE FROM Books; DELETE FROM ReadingGoals; DELETE FROM AppSettings;",
      );
    });
  },
};
