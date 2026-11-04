import type {
  ActiveTimer,
  Book,
  ReadingSession,
  ReadingAttempt,
} from "./types";

/** Calendar keys deliberately use the device's local timezone, never UTC slicing. */
export function dayKey(value: Date | string | number = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function timerElapsedMs(
  timer: ActiveTimer | null,
  now = Date.now(),
): number {
  if (!timer) return 0;
  return Math.max(
    0,
    timer.elapsedMs +
      (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince)),
  );
}
export function pagesRead(session: ReadingSession): number {
  return Math.max(0, session.endPage - session.startPage);
}
export function formatDuration(seconds: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return n >= 3600
    ? `${Math.floor(n / 3600)} ч ${Math.floor((n % 3600) / 60)} мин`
    : n >= 60
      ? `${Math.floor(n / 60)} мин`
      : `${n} сек`;
}
export interface DayActivity {
  key: string;
  pages: number;
  seconds: number;
  bookIds: number[];
  sessions: ReadingSession[];
}
export function activityByDay(
  sessions: ReadingSession[],
): Record<string, DayActivity> {
  const result: Record<string, DayActivity> = {};
  for (const session of sessions) {
    const key = dayKey(session.startedAt);
    if (!key) continue;
    const row = (result[key] ||= {
      key,
      pages: 0,
      seconds: 0,
      bookIds: [],
      sessions: [],
    });
    row.pages += pagesRead(session);
    row.seconds += Math.max(0, session.durationSeconds);
    if (!row.bookIds.includes(session.bookId)) row.bookIds.push(session.bookId);
    row.sessions.push(session);
  }
  return result;
}
export function computeAnalytics(
  books: Book[],
  sessions: ReadingSession[],
  goal = 12,
  now = new Date(),
  attempts?: ReadingAttempt[],
) {
  const year = now.getFullYear(),
    month = now.getMonth();
  const today = dayKey(now);
  const byDay = activityByDay(sessions);
  const yearSessions = sessions.filter(
    (s) => new Date(s.startedAt).getFullYear() === year,
  );
  const monthSessions = yearSessions.filter(
    (s) => new Date(s.startedAt).getMonth() === month,
  );
  // Attempt history survives moving a book between shelves and rereading it.
  // Legacy callers and books without attempt records retain their book dates.
  const completions = attempts
    ? [
        ...attempts
          .filter((a) => a.status === "finished" && a.endedAt)
          .map((a) => ({ bookId: a.bookId, endedAt: a.endedAt! })),
        ...books
          .filter(
            (b) =>
              b.status === "finished" &&
              b.finishedAt &&
              !attempts.some(
                (a) =>
                  a.bookId === b.id && a.status === "finished" && a.endedAt,
              ),
          )
          .map((b) => ({ bookId: b.id, endedAt: b.finishedAt! })),
      ]
    : books
        .filter((b) => b.status === "finished" && b.finishedAt)
        .map((b) => ({ bookId: b.id, endedAt: b.finishedAt! }));
  const completedThisYear = completions.filter(
    (a) => new Date(a.endedAt).getFullYear() === year,
  ).length;
  const timedSessions = sessions.filter((s) => s.durationSeconds > 0);
  const seconds = timedSessions.reduce((n, s) => n + s.durationSeconds, 0);
  const timedPages = timedSessions.reduce((n, s) => n + pagesRead(s), 0);
  const monthly = Array.from({ length: 12 }, (_, monthIndex) => ({
    month: monthIndex,
    pages: 0,
    seconds: 0,
    books: 0,
  }));
  yearSessions.forEach((s) => {
    const item = monthly[new Date(s.startedAt).getMonth()];
    if (item) {
      item.pages += pagesRead(s);
      item.seconds += s.durationSeconds;
    }
  });
  completions.forEach((completion) => {
    const d = new Date(completion.endedAt);
    if (d.getFullYear() === year) monthly[d.getMonth()].books++;
  });
  const daily = Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, i) =>
      byDay[dayKey(new Date(year, month, i + 1))] || {
        key: dayKey(new Date(year, month, i + 1)),
        pages: 0,
        seconds: 0,
        bookIds: [],
        sessions: [],
      },
  );
  const secondsByBook = new Map<number, number>();
  sessions.forEach((s) =>
    secondsByBook.set(
      s.bookId,
      (secondsByBook.get(s.bookId) || 0) + Math.max(0, s.durationSeconds),
    ),
  );
  const bookTimes = books
    .map((book) => ({ book, seconds: secondsByBook.get(book.id) || 0 }))
    .filter((x) => x.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
  return {
    totalBooks: books.length,
    finishedBooks: books.filter((b) => b.status === "finished").length,
    readingBooks: books.filter((b) => b.status === "reading").length,
    todayPages: byDay[today]?.pages || 0,
    todaySeconds: byDay[today]?.seconds || 0,
    monthPages: monthSessions.reduce((n, s) => n + pagesRead(s), 0),
    yearPages: yearSessions.reduce((n, s) => n + pagesRead(s), 0),
    totalSeconds: seconds,
    averageSessionSeconds: timedSessions.length
      ? seconds / timedSessions.length
      : 0,
    averagePagesPerHour: seconds ? (timedPages * 3600) / seconds : 0,
    activeDays: Object.values(byDay).filter((d) => d.seconds > 0 || d.pages > 0)
      .length,
    completedThisYear,
    goal,
    goalPercent: goal > 0 ? Math.round((completedThisYear / goal) * 100) : 0,
    byDay,
    daily,
    monthly,
    bookTimes,
  };
}
