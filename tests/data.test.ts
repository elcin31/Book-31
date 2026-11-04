import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { MIGRATIONS } from "../src/schema";
import {
  validateBook,
  validateNote,
  validatePage,
  validateSettings,
} from "../src/validation";
import { EMPTY_BOOK } from "../src/types";
import type { Book, ReadingSession } from "../src/types";
import {
  activityByDay,
  computeAnalytics,
  dayKey,
  timerElapsedMs,
} from "../src/analytics";

test("schema enforces normalized relationships, cascades, and invalid progress constraints", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  MIGRATIONS.forEach((m) => db.exec(m));
  db.prepare(
    "INSERT INTO Books(id,title,status,createdAt,totalPages) VALUES(1,?,?,?,?)",
  ).run("Test", "reading", new Date().toISOString(), 300);
  db.prepare(
    "INSERT INTO ReadingAttempts(id,bookId,startedAt,status) VALUES(1,1,?,?)",
  ).run(new Date().toISOString(), "reading");
  db.prepare(
    "INSERT INTO ReadingSessions(bookId,attemptId,startedAt,endedAt,durationSeconds,startPage,endPage,source) VALUES(1,1,'2026-01-01','2026-01-01',120,0,10,'manual')",
  ).run();
  db.prepare(
    "INSERT INTO Notes(bookId,type,text,createdAt,updatedAt) VALUES(1,'quote','Test','2026-01-01','2026-01-01')",
  ).run();
  assert.throws(() =>
    db.prepare("UPDATE Books SET currentPage=-1 WHERE id=1").run(),
  );
  assert.throws(() =>
    db.prepare("UPDATE Books SET currentPage=301 WHERE id=1").run(),
  );
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO ReadingSessions(bookId,attemptId,startedAt,endedAt,durationSeconds,startPage,endPage,source) VALUES(2,1,'x','x',1,0,1,'timer')",
      )
      .run(),
  );
  assert.throws(() =>
    db.prepare("UPDATE ReadingSessions SET durationSeconds=-1").run(),
  );
  db.prepare("DELETE FROM Books WHERE id=1").run();
  for (const table of ["ReadingAttempts", "ReadingSessions", "Notes"])
    assert.equal(
      (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number })
        .n,
      0,
    );
  db.close();
});
test("input validators reject invalid page, rating, dates and notes", () => {
  assert.throws(() => validateBook({ ...EMPTY_BOOK, title: " " }));
  assert.throws(() =>
    validateBook({
      ...EMPTY_BOOK,
      title: "x",
      totalPages: 100,
      currentPage: 101,
    }),
  );
  assert.throws(() =>
    validateBook({ ...EMPTY_BOOK, title: "x", rating: Infinity }),
  );
  assert.throws(() =>
    validateBook({
      ...EMPTY_BOOK,
      title: "x",
      startedAt: "2026-01-02",
      finishedAt: "2026-01-01",
    }),
  );
  assert.throws(() => validatePage(NaN, 100));
  assert.throws(() => validatePage(-1, 100));
  assert.throws(() => validatePage(1.5, 100));
  assert.throws(() =>
    validateNote(
      { bookId: 1, page: 101, type: "quote", text: "a", favorite: false },
      100,
    ),
  );
  assert.throws(() => validateSettings({ timerTargetMinutes: 0 }));
  assert.equal(validateBook({ ...EMPTY_BOOK, title: " Book " }).title, "Book");
});
test("wall clock timer survives process restart and excludes paused time", () => {
  const timer = {
    bookId: 1,
    startedAt: "2026-01-01T00:00:00.000Z",
    runningSince: 1000,
    elapsedMs: 3000,
    startPage: 0,
  };
  assert.equal(timerElapsedMs(JSON.parse(JSON.stringify(timer)), 7000), 9000);
  assert.equal(
    timerElapsedMs({ ...timer, runningSince: null, elapsedMs: 9000 }, 900000),
    9000,
  );
  assert.equal(timerElapsedMs({ ...timer, runningSince: 10000 }, 9000), 3000);
  assert.equal(timerElapsedMs(null), 0);
});
test("analytics derives activity from real sessions and guards empty denominators", () => {
  const now = new Date(2026, 2, 15, 12),
    date = new Date(2026, 2, 15, 8).toISOString();
  const book: Book = {
    ...EMPTY_BOOK,
    id: 1,
    title: "Test",
    status: "finished",
    finishedAt: date,
    createdAt: date,
  };
  const sessions: ReadingSession[] = [
    {
      id: 1,
      bookId: 1,
      attemptId: 1,
      startedAt: date,
      endedAt: date,
      durationSeconds: 3600,
      startPage: 0,
      endPage: 40,
      source: "timer",
    },
    {
      id: 2,
      bookId: 1,
      attemptId: 1,
      startedAt: date,
      endedAt: date,
      durationSeconds: 0,
      startPage: 40,
      endPage: 50,
      source: "progress",
    },
  ];
  const stats = computeAnalytics([book], sessions, 10, now);
  assert.equal(stats.todayPages, 50);
  assert.equal(stats.yearPages, 50);
  assert.equal(stats.totalSeconds, 3600);
  assert.equal(stats.averagePagesPerHour, 40);
  assert.equal(stats.averageSessionSeconds, 3600);
  assert.equal(stats.goalPercent, 10);
  assert.equal(stats.activeDays, 1);
  assert.equal(activityByDay(sessions)[dayKey(now)].bookIds.length, 1);
  const empty = computeAnalytics([], [], 12, now);
  assert.equal(empty.averagePagesPerHour, 0);
  assert.equal(empty.averageSessionSeconds, 0);
  assert.equal(
    empty.monthly.reduce((n, m) => n + m.pages, 0),
    0,
  );
});

test("annual and monthly completions survive rereading and count each completed attempt", () => {
  const now = new Date(2026, 6, 15, 12);
  const end = new Date(2026, 2, 10, 12).toISOString();
  const book = {
    ...EMPTY_BOOK,
    id: 1,
    createdAt: end,
    title: "Reread",
    status: "reading" as const,
  };
  const attempts = [
    {
      id: 1,
      bookId: 1,
      startedAt: end,
      endedAt: end,
      status: "finished" as const,
    },
    {
      id: 2,
      bookId: 1,
      startedAt: end,
      endedAt: null,
      status: "reading" as const,
    },
  ];
  const stats = computeAnalytics([book], [], 10, now, attempts);
  assert.equal(stats.completedThisYear, 1);
  assert.equal(stats.monthly[2].books, 1);
  assert.equal(stats.goalPercent, 10);
  const twice = computeAnalytics([book], [], 10, now, [
    attempts[0],
    { ...attempts[0], id: 2, endedAt: new Date(2026, 6, 10, 12).toISOString() },
  ]);
  assert.equal(twice.completedThisYear, 2);
  assert.equal(twice.monthly[6].books, 1);
  const finished = { ...book, status: "finished" as const, finishedAt: end };
  assert.equal(computeAnalytics([finished], [], 10, now).completedThisYear, 1);
  assert.equal(
    computeAnalytics([finished], [], 10, now, [attempts[0]]).completedThisYear,
    1,
  );
});
