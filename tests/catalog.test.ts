import assert from "node:assert/strict";
import { test } from "node:test";
import { searchCatalog } from "../src/catalog";
const realFetch = globalThis.fetch;
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
test("catalog maps Google metadata and encodes author search", async () => {
  let url = "";
  globalThis.fetch = async (input) => {
    url = String(input);
    return response({
      items: [
        {
          id: "a",
          volumeInfo: {
            title: "Моя книга",
            authors: ["Автор 1", "Автор 2"],
            industryIdentifiers: [
              { type: "ISBN_10", identifier: "123" },
              { type: "ISBN_13", identifier: "978123" },
            ],
            imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
            pageCount: 245,
            publishedDate: "2021-02-03",
            categories: ["Роман"],
          },
        },
      ],
    });
  };
  try {
    const books = await searchCatalog("Автор & имя", "author");
    assert.equal(books.length, 1);
    assert.equal(books[0].title, "Моя книга");
    assert.equal(books[0].author, "Автор 1, Автор 2");
    assert.equal(books[0].isbn, "978123");
    assert.equal(books[0].publicationYear, "2021");
    assert.equal(books[0].totalPages, 245);
    assert.equal(books[0].coverUri, "https://books.google.com/cover.jpg");
    assert.equal(new URL(url).searchParams.get("q"), "inauthor:Автор & имя");
  } finally {
    globalThis.fetch = realFetch;
  }
});
test("catalog falls back to Open Library when Google is unavailable", async () => {
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return urls.length === 1
      ? response({}, 429)
      : response({
          docs: [
            {
              key: "/works/1",
              title: "Found",
              author_name: ["Writer"],
              isbn: ["978999"],
              cover_i: 42,
              first_publish_year: 1998,
              number_of_pages_median: 300,
            },
          ],
        });
  };
  try {
    const books = await searchCatalog("978999", "isbn");
    assert.equal(urls.length, 2);
    assert.equal(new URL(urls[1]).searchParams.get("isbn"), "978999");
    assert.equal(books[0].source, "Open Library");
    assert.equal(
      books[0].coverUri,
      "https://covers.openlibrary.org/b/id/42-M.jpg",
    );
    assert.equal(books[0].totalPages, 300);
  } finally {
    globalThis.fetch = realFetch;
  }
});
test("empty search performs no request and offline failure is actionable", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("offline");
  };
  try {
    assert.deepEqual(await searchCatalog("   ", "title"), []);
    assert.equal(calls, 0);
    await assert.rejects(searchCatalog("Книга", "title"), /вручную/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
});
