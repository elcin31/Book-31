import { BookInput, EMPTY_BOOK } from "./types";
export type SearchMode = "title" | "author" | "isbn";
export interface CatalogBook extends BookInput {
  catalogId: string;
  source: string;
}
async function json(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Каталог ответил ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
export async function searchCatalog(
  query: string,
  mode: SearchMode,
): Promise<CatalogBook[]> {
  const clean = query.trim();
  if (!clean) return [];
  try {
    const prefix =
      mode === "isbn" ? "isbn:" : mode === "author" ? "inauthor:" : "intitle:";
    const data = await json(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(prefix + clean)}&maxResults=24&printType=books`,
    );
    const books = (data.items || []).map((item: any) => {
      const v = item.volumeInfo || {};
      return {
        ...EMPTY_BOOK,
        catalogId: String(item.id),
        source: "Google Books",
        title: v.title || "Без названия",
        author: (v.authors || []).join(", "),
        isbn:
          (v.industryIdentifiers || []).find((x: any) => x.type === "ISBN_13")
            ?.identifier ||
          (v.industryIdentifiers || [])[0]?.identifier ||
          "",
        coverUri: (v.imageLinks?.thumbnail || "").replace(/^http:/, "https:"),
        description: v.description || "",
        totalPages: Number(v.pageCount) || 0,
        publicationYear: String(v.publishedDate || "").slice(0, 4),
        publisher: v.publisher || "",
        language: v.language || "",
        genre: (v.categories || []).join(", "),
      } as CatalogBook;
    });
    if (books.length) return books;
  } catch {
    /* Try the independent fallback catalog. */
  }
  try {
    const field =
      mode === "author" ? "author" : mode === "isbn" ? "isbn" : "title";
    const data = await json(
      `https://openlibrary.org/search.json?${field}=${encodeURIComponent(clean)}&limit=24&fields=key,title,author_name,isbn,cover_i,first_publish_year,publisher,language,number_of_pages_median`,
    );
    return (data.docs || []).map((d: any) => ({
      ...EMPTY_BOOK,
      catalogId: d.key,
      source: "Open Library",
      title: d.title || "Без названия",
      author: (d.author_name || []).join(", "),
      isbn: d.isbn?.[0] || "",
      coverUri: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : "",
      publicationYear: d.first_publish_year ? String(d.first_publish_year) : "",
      publisher: d.publisher?.[0] || "",
      language: d.language?.[0] || "",
      totalPages: Number(d.number_of_pages_median) || 0,
    }));
  } catch (error) {
    throw new Error(
      "Не удалось связаться с каталогами. Проверьте интернет или добавьте книгу вручную.",
    );
  }
}
export async function cacheCover(uri: string): Promise<string> {
  if (!uri) return uri;
  const FileSystem = await import("expo-file-system/legacy");
  if (!FileSystem.documentDirectory) return uri;
  if (uri.startsWith(FileSystem.documentDirectory)) return uri;
  const dir = FileSystem.documentDirectory + "covers/";
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const target =
    dir + `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  if (/^https?:/i.test(uri)) {
    const task = FileSystem.createDownloadResumable(
      uri.replace(/^http:/, "https:"),
      target,
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        task.downloadAsync(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            void task.cancelAsync().catch(() => {});
            reject(
              new Error(
                "Загрузка обложки заняла слишком долго. Выберите изображение с телефона или уберите обложку.",
              ),
            );
          }, 16000);
        }),
      ]);
      if (!result || result.status !== 200)
        throw new Error(
          "Не удалось загрузить обложку. Выберите изображение с телефона или уберите обложку.",
        );
      return result.uri;
    } catch (error) {
      await FileSystem.deleteAsync(target, { idempotent: true }).catch(
        () => {},
      );
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}
