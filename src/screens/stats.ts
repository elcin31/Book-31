import { Book, ReadingSession } from "../types";
import {
  computeAnalytics,
  dayKey,
  formatDuration,
  pagesRead,
} from "../analytics";
export const localDay = dayKey;
export const pages = pagesRead;
export const minutes = formatDuration;
export function total(sessions: ReadingSession[]) {
  return {
    pages: sessions.reduce((v, s) => v + pagesRead(s), 0),
    seconds: sessions.reduce((v, s) => v + Math.max(0, s.durationSeconds), 0),
    count: sessions.length,
  };
}
export function shortDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}
/** The screens adapt the shared, tested calculations into their compact metric groups. */
export function getStats(
  sessions: ReadingSession[],
  books: Book[],
  now = new Date(),
) {
  const stats = computeAnalytics(books, sessions, 12, now);
  return {
    byDay: stats.byDay,
    monthly: stats.monthly,
    bookTimes: stats.bookTimes,
    today: {
      pages: stats.todayPages,
      seconds: stats.todaySeconds,
      count: stats.byDay[dayKey(now)]?.sessions.length || 0,
    },
    month: { pages: stats.monthPages },
    year: { pages: stats.yearPages },
    all: {
      pages: sessions.reduce((v, s) => v + pagesRead(s), 0),
      seconds: stats.totalSeconds,
      count: sessions.length,
    },
    averageSeconds: stats.averageSessionSeconds,
    speed: stats.averagePagesPerHour,
    activeDays: stats.activeDays,
    finished: stats.finishedBooks,
    reading: stats.readingBooks,
    finishedYear: stats.completedThisYear,
  };
}
