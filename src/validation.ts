import { BookInput, BookStatus, NoteInput, Settings } from "./types";
export const STATUS_VALUES: BookStatus[] = [
  "want",
  "reading",
  "finished",
  "paused",
  "abandoned",
];
export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  libraryView: "grid",
  keepScreenAwake: false,
  timerTargetMinutes: 25,
};
export function integer(value: number, label: string, min = 0, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`${label}: укажите целое число от ${min} до ${max}.`);
  return value;
}
function dateOrNull(value: string | null, label: string): string | null {
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime()))
    throw new Error(`${label}: некорректная дата.`);
  return d.toISOString();
}
export function validateBook(input: BookInput): BookInput {
  const title = input.title.trim();
  if (!title) throw new Error("Укажите название книги.");
  if (title.length > 1000) throw new Error("Название слишком длинное.");
  integer(input.totalPages, "Количество страниц");
  integer(input.currentPage, "Текущая страница");
  if (input.totalPages > 0 && input.currentPage > input.totalPages)
    throw new Error("Текущая страница больше объёма книги.");
  if (!STATUS_VALUES.includes(input.status))
    throw new Error("Выберите статус книги.");
  if (!Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5)
    throw new Error("Оценка должна быть от 0 до 5.");
  const startedAt = dateOrNull(input.startedAt, "Начало чтения"),
    finishedAt = dateOrNull(input.finishedAt, "Завершение чтения");
  if (startedAt && finishedAt && new Date(finishedAt) < new Date(startedAt))
    throw new Error("Дата завершения раньше даты начала.");
  return {
    ...input,
    title,
    author: input.author.trim(),
    isbn: input.isbn.trim(),
    startedAt,
    finishedAt,
  };
}
export function validateNote(input: NoteInput, totalPages = 0): NoteInput {
  if (!input.text.trim()) throw new Error("Напишите текст заметки.");
  if (input.page !== null) {
    integer(input.page, "Страница");
    if (totalPages > 0 && input.page > totalPages)
      throw new Error("Страница заметки больше объёма книги.");
  }
  if (!["quote", "thought", "summary"].includes(input.type))
    throw new Error("Выберите тип заметки.");
  return { ...input, text: input.text.trim(), favorite: !!input.favorite };
}
export function validatePage(page: number, totalPages: number) {
  integer(page, "Текущая страница");
  if (totalPages > 0 && page > totalPages)
    throw new Error("Текущая страница больше объёма книги.");
}
export function validateSettings(patch: Partial<Settings>): Partial<Settings> {
  if (
    patch.theme !== undefined &&
    !["system", "light", "dark"].includes(patch.theme)
  )
    throw new Error("Некорректная тема.");
  if (
    patch.libraryView !== undefined &&
    !["grid", "list"].includes(patch.libraryView)
  )
    throw new Error("Некорректный вид библиотеки.");
  if (patch.timerTargetMinutes !== undefined)
    integer(patch.timerTargetMinutes, "Цель таймера", 1, 1440);
  if (
    patch.keepScreenAwake !== undefined &&
    typeof patch.keepScreenAwake !== "boolean"
  )
    throw new Error("Некорректная настройка экрана.");
  return patch;
}
