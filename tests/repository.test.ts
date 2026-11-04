import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";
import { EMPTY_BOOK } from "../src/types";

/** Execute the actual production repository against Node's SQLite engine, replacing
 * only Expo's native bridge. Validation, SQL, transactions and mapping stay real. */
function openRepository(dbPath: string) {
  const adapter = {
    openDatabaseSync: () => {
      const db = new DatabaseSync(dbPath);
      return {
        execSync: (sql: string) => db.exec(sql),
        closeSync: () => db.close(),
        getFirstSync: (sql: string, ...params: any[]) =>
          db.prepare(sql).get(...params),
        getAllSync: (sql: string, ...params: any[]) =>
          db.prepare(sql).all(...params),
        runSync: (sql: string, ...params: any[]) => {
          const r = db.prepare(sql).run(...params);
          return {
            changes: Number(r.changes),
            lastInsertRowId: Number(r.lastInsertRowid),
          };
        },
        withTransactionSync: (fn: () => void) => {
          db.exec("BEGIN");
          try {
            fn();
            db.exec("COMMIT");
          } catch (e) {
            db.exec("ROLLBACK");
            throw e;
          }
        },
      };
    },
  };
  const filename = path.resolve("src/database.ts");
  const output = transformSync(fs.readFileSync(filename, "utf8"), {
    loader: "ts",
    format: "cjs",
    target: "es2022",
  }).code;
  const actualRequire = createRequire(filename),
    module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require: (name: string) =>
      name === "expo-sqlite" ? adapter : actualRequire(name),
    Date,
    console,
    Math,
  });
  vm.runInContext(output, context, { filename });
  return (module.exports as typeof import("../src/database")).repository;
}
test("repository CRUD, restart durability, transactions, timers and cascade use real SQLite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "folio-test-")),
    file = path.join(dir, "folio.db");
  const repo = openRepository(file);
  assert.equal(repo.read().books.length, 0);
  const id = repo.saveBook({
    ...EMPTY_BOOK,
    title: "Offline book",
    author: "Author",
    totalPages: 200,
  });
  repo.setSettings({ theme: "dark" });
  repo.setYearGoal(20);
  repo.updateProgress(id, 10);
  assert.equal(repo.read().books[0].currentPage, 10);
  assert.equal(repo.read().sessions[0].source, "progress");
  repo.startTimer(id);
  const started = repo.read().timer!;
  assert.equal(started.startPage, 10);
  assert.throws(() =>
    repo.saveBook({ ...repo.read().books[0], status: "finished" }, id),
  );
  repo.pauseTimer();
  const paused = repo.read().timer!;
  assert.equal(paused.runningSince, null);
  // New JS repository instance opens the same on-disk DB as after process death.
  const restored = openRepository(file);
  assert.equal(restored.read().timer!.runningSince, null);
  assert.equal(restored.read().settings.theme, "dark");
  assert.equal(restored.read().yearGoal, 20);
  assert.equal(restored.read().books[0].title, "Offline book");
  restored.resumeTimer();
  assert.notEqual(restored.read().timer!.runningSince, null);
  restored.pauseTimer();
  restored.saveSession(
    {
      bookId: id,
      startPage: 10,
      endPage: 30,
      durationSeconds: 60,
      startedAt: started.startedAt,
      source: "timer",
    },
    true,
  );
  assert.equal(restored.read().timer, null);
  assert.equal(restored.read().books[0].currentPage, 30);
  assert.equal(restored.read().sessions.length, 2);
  assert.throws(() =>
    restored.saveSession(
      {
        bookId: id,
        startPage: 10,
        endPage: 30,
        durationSeconds: 60,
        startedAt: started.startedAt,
        source: "timer",
      },
      true,
    ),
  );
  assert.throws(() => restored.updateProgress(id, 201));
  assert.equal(restored.read().books[0].currentPage, 30);
  assert.throws(() =>
    restored.saveSession({
      bookId: id,
      startPage: 30,
      endPage: 20,
      durationSeconds: 60,
      startedAt: started.startedAt,
      source: "manual",
    }),
  );
  restored.saveNote({
    bookId: id,
    text: "A thought",
    page: 30,
    type: "thought",
    favorite: false,
  });
  let note = restored.read().notes[0];
  restored.saveNote({ ...note, text: "Edited", favorite: true }, note.id);
  note = restored.read().notes[0];
  assert.equal(note.text, "Edited");
  assert.equal(note.favorite, true);
  restored.saveBook({ ...restored.read().books[0], status: "finished" }, id);
  assert.equal(restored.read().books[0].currentPage, 200);
  assert.ok(restored.read().books[0].finishedAt);
  restored.deleteBook(id);
  assert.equal(restored.read().books.length, 0);
  assert.equal(restored.read().sessions.length, 0);
  assert.equal(restored.read().notes.length, 0);
  restored.clearAll();
  assert.equal(restored.read().yearGoal, 12);
  assert.equal(restored.read().settings.theme, "system");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("rereading progress belongs to the new attempt without changing previous history", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "folio-reread-"));
  const file = path.join(dir, "folio.db");
  const repo = openRepository(file);
  const id = repo.saveBook({ ...EMPTY_BOOK, title: "Reread", totalPages: 100 });
  repo.updateProgress(id, 100);
  const first = repo.read().sessions[0];
  repo.updateProgress(id, 0);
  repo.updateProgress(id, 20);
  const latest = repo.read().sessions[0];
  assert.notEqual(latest.attemptId, first.attemptId);
  assert.equal(repo.read().sessions.length, 2);
  assert.equal(repo.read().books[0].status, "reading");
  const check = new DatabaseSync(file);
  const attempts = check
    .prepare("SELECT * FROM ReadingAttempts ORDER BY id")
    .all();
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].status, "finished");
  assert.ok(attempts[0].endedAt);
  assert.equal(attempts[1].status, "reading");
  assert.equal(attempts[1].endedAt, null);
  check.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("malformed persisted timer cannot crash startup or block a new session", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "folio-timer-"));
  const file = path.join(dir, "folio.db");
  const repo = openRepository(file);
  const id = repo.saveBook({ ...EMPTY_BOOK, title: "Safe recovery" });
  const check = new DatabaseSync(file);
  check
    .prepare("INSERT INTO AppSettings(key,value) VALUES('timer',?)")
    .run(JSON.stringify({ bookId: { broken: true } }));
  assert.equal(repo.read().timer, null);
  repo.startTimer(id);
  assert.equal(repo.read().timer?.bookId, id);
  check.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("status and progress edited together attach the session to the reopened attempt", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "folio-attempt-"));
  const file = path.join(dir, "folio.db");
  const repo = openRepository(file);
  const id = repo.saveBook({
    ...EMPTY_BOOK,
    title: "Unknown length",
    status: "finished",
    currentPage: 10,
  });
  repo.saveBook(
    { ...repo.read().books[0], status: "reading", currentPage: 20 },
    id,
  );
  const check = new DatabaseSync(file);
  const session = check
    .prepare(
      "SELECT s.startPage,s.endPage,a.status,a.endedAt FROM ReadingSessions s JOIN ReadingAttempts a ON a.id=s.attemptId",
    )
    .get();
  assert.equal(session?.status, "reading");
  assert.equal(session?.endedAt, null);
  assert.equal(session?.startPage, 10);
  assert.equal(session?.endPage, 20);
  assert.equal(
    check.prepare("SELECT count(*) AS n FROM ReadingAttempts").get()?.n,
    2,
  );
  check.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
