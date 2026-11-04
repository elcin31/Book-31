export type BookStatus =
  "want" | "reading" | "finished" | "paused" | "abandoned";
export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "Хочу прочитать",
  reading: "Сейчас читаю",
  finished: "Прочитано",
  paused: "На паузе",
  abandoned: "Брошено",
};
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  coverUri: string;
  description: string;
  totalPages: number;
  publicationYear: string;
  publisher: string;
  language: string;
  genre: string;
  format: string;
  status: BookStatus;
  startedAt: string | null;
  finishedAt: string | null;
  currentPage: number;
  rating: number;
  review: string;
  createdAt: string;
}
export type BookInput = Omit<Book, "id" | "createdAt">;
export interface ReadingAttempt {
  id: number;
  bookId: number;
  startedAt: string;
  endedAt: string | null;
  status: BookStatus;
}
export interface ReadingSession {
  id: number;
  bookId: number;
  attemptId: number;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  startPage: number;
  endPage: number;
  source: "timer" | "manual" | "progress";
}
export interface Note {
  id: number;
  bookId: number;
  page: number | null;
  type: "quote" | "thought" | "summary";
  text: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}
export type NoteInput = Omit<Note, "id" | "createdAt" | "updatedAt">;
export interface ActiveTimer {
  bookId: number;
  startedAt: string;
  runningSince: number | null;
  elapsedMs: number;
  startPage: number;
}
export interface Settings {
  theme: "light" | "dark" | "system";
  libraryView: "grid" | "list";
  keepScreenAwake: boolean;
  timerTargetMinutes: number;
}
export interface Snapshot {
  attempts?: ReadingAttempt[];
  books: Book[];
  sessions: ReadingSession[];
  notes: Note[];
  settings: Settings;
  yearGoal: number;
  timer: ActiveTimer | null;
}
export const EMPTY_BOOK: BookInput = {
  title: "",
  author: "",
  isbn: "",
  coverUri: "",
  description: "",
  totalPages: 0,
  publicationYear: "",
  publisher: "",
  language: "",
  genre: "",
  format: "Бумажная",
  status: "want",
  startedAt: null,
  finishedAt: null,
  currentPage: 0,
  rating: 0,
  review: "",
};
export type RootStackParamList = {
  Tabs: undefined;
  Book: { id: number };
  BookForm: { id?: number; prefill?: Partial<BookInput> } | undefined;
  Search: undefined;
  Timer: undefined;
  Session: { bookId: number; timer?: boolean };
  NoteForm: { id?: number; bookId?: number } | undefined;
  Calendar: undefined;
};
