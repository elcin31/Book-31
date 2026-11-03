/** Versioned, append-only migrations. Do not edit released migrations. */
export const MIGRATIONS = [
  `
CREATE TABLE Books (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL CHECK(length(trim(title))>0), author TEXT NOT NULL DEFAULT '', isbn TEXT NOT NULL DEFAULT '',
 coverUri TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', totalPages INTEGER NOT NULL DEFAULT 0 CHECK(totalPages>=0),
 publicationYear TEXT NOT NULL DEFAULT '', publisher TEXT NOT NULL DEFAULT '', language TEXT NOT NULL DEFAULT '', genre TEXT NOT NULL DEFAULT '',format TEXT NOT NULL DEFAULT 'Бумажная',
 status TEXT NOT NULL CHECK(status IN ('want','reading','finished','paused','abandoned')),
 startedAt TEXT, finishedAt TEXT,currentPage INTEGER NOT NULL DEFAULT 0 CHECK(currentPage>=0 AND (totalPages=0 OR currentPage<=totalPages)),
 rating REAL NOT NULL DEFAULT 0 CHECK(rating>=0 AND rating<=5),review TEXT NOT NULL DEFAULT '',createdAt TEXT NOT NULL
);
CREATE TABLE ReadingAttempts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,bookId INTEGER NOT NULL REFERENCES Books(id) ON DELETE CASCADE,
 startedAt TEXT NOT NULL,endedAt TEXT,status TEXT NOT NULL,
 UNIQUE(id,bookId)
);
CREATE TABLE ReadingSessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,bookId INTEGER NOT NULL REFERENCES Books(id) ON DELETE CASCADE,
 attemptId INTEGER NOT NULL,startedAt TEXT NOT NULL,endedAt TEXT NOT NULL,
 durationSeconds INTEGER NOT NULL CHECK(durationSeconds>=0),startPage INTEGER NOT NULL CHECK(startPage>=0),endPage INTEGER NOT NULL CHECK(endPage>=startPage),
 source TEXT NOT NULL CHECK(source IN ('timer','manual','progress')),
 FOREIGN KEY(attemptId,bookId) REFERENCES ReadingAttempts(id,bookId) ON DELETE CASCADE
);
CREATE TABLE Notes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,bookId INTEGER NOT NULL REFERENCES Books(id) ON DELETE CASCADE,
 page INTEGER CHECK(page IS NULL OR page>=0),type TEXT NOT NULL CHECK(type IN ('quote','thought','summary')),
 text TEXT NOT NULL CHECK(length(trim(text))>0),favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0,1)),createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL
);
CREATE TABLE ReadingGoals(year INTEGER PRIMARY KEY,target INTEGER NOT NULL CHECK(target>=1 AND target<=10000));
CREATE TABLE AppSettings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE INDEX idx_books_status ON Books(status);
CREATE INDEX idx_books_title ON Books(title COLLATE NOCASE);
CREATE INDEX idx_attempt_book ON ReadingAttempts(bookId);
CREATE INDEX idx_sessions_book ON ReadingSessions(bookId,startedAt);
CREATE INDEX idx_sessions_date ON ReadingSessions(startedAt);
CREATE INDEX idx_notes_book ON Notes(bookId,createdAt);
`,
];
