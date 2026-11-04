# FOLIO 1.0 implementation and verification

## Design and skill

Reading this as a private, offline reading journal for Android phones, with an editorial library interface. Design variance 6, motion 3, density 4. Preserve the green FOLIO identity, original icon and system serif headings; use warm paper surfaces, clear sans-serif body text and quieter rectangular controls. Near-black green dark surfaces are designed independently. System text scaling remains enabled.

Installed RubenGlez/mobile-design v0.3.0 into `.agents/skills/mobile-design/`, including its MIT license and complete references. Documentation only: no executable installer, runtime service, dependency or telemetry added. Reviewed SKILL.md and references for process, visual system, typography, accessibility, React Native, Android, and QA. Repository AGENTS.md points future Codex sessions to this standard location. This session explicitly read and applied the skill; automatic discovery by a future fresh Codex session cannot be demonstrated in the current session.

## Public product research (2026-11-04)

- Bookmory: https://play.google.com/store/apps/details?id=net.tonysoft.bookmory — public description emphasizes goals, timer, reading calendar, notes and personal library. Adaptation: make continuing a book the primary Home action; retain private local notes/calendar rather than introduce social infrastructure. Its primary website returned HTTP 410.
- StoryGraph: https://play.google.com/store/apps/details?id=com.thestorygraph.thestorygraph — description emphasizes informative charts, genres, progress journal and flexible discovery. Adaptation: genre filtering, useful empty states and clear metrics. Its main website returned HTTP 403, so the public store description was used.
- Goodreads: https://www.goodreads.com/about/us — shelves, read/current/want-to-read states and reviews. Adaptation: keep recognizable status shelves, book metadata and review access; do not add accounts or social feeds.
- React Native current official accessibility and KeyboardAvoidingView documentation fetched successfully: https://reactnative.dev/docs/accessibility and https://reactnative.dev/docs/keyboardavoidingview . No new version-sensitive native module introduced.

No external screens or assets copied. Book covers remain real catalog/user images with a local fallback; no fabricated book collection or statistics.

## Audit findings and changes

Existing app already implements Home, Library, Diary, Analytics, Settings, Book, BookForm, Search, NoteForm, Timer, Session and Calendar. Keep native-stack/back navigation, SQLite repository, transaction-first persistence and local cached covers. Search alone requires connectivity and has an independent catalog fallback; manual book creation remains offline.

Critical fix: reopening a finished book with progress in the same edit could attach the new session to its closed reading attempt. Create/reopen the attempt before inserting progress, with its actual start time. Regression tests exercise real SQLite, retaining prior history. Invalid persisted timer JSON is validated before it can crash startup or prevent starting a replacement timer. Historical completions now use ReadingAttempts rather than only the current shelf status, so annual goals survive rereads; closed attempts remain unchanged when moving a finished book to paused/want. No schema migration or database filename change.

UI: responsive library/genre filtering; editorial current-reading hierarchy; virtualized diary with indexed book lookups; responsive book detail; timer interval limited to focused screen; improved shared controls, 48dp chips, more legible light-theme secondary text, safe bottom padding, keyboard accommodation and reduced-motion native transitions. Light danger button text is white; dark danger button text uses dark ink for contrast. No endless decorative animation.

## Verification and boundaries

Local checks: npm ci, TypeScript, 17 automated tests (including SQLite CRUD/restart, timer restoration and 5 new regressions), Android production JavaScript/Hermes export. Native build and install evidence is provided by Android GitHub Actions, not by the JavaScript export. CI uses a standalone signed release APK with JavaScript bundled, then an Android emulator smoke test before publishing.

No local Android SDK is installed. CI restores an existing release keystore if configured in repository secrets; otherwise its generated key cannot be assumed compatible with the old installed release. Do not uninstall a data-bearing prior installation to work around signature errors. Package ID remains app.folio.reading; version 1.0.0, versionCode 2. Certificate evidence is packaged with distribution.

Native full-flow QA, TalkBack, largest-font/device matrix, prolonged suspension and physical low-end performance must not be inferred from unit tests or launch smoke checks. Existing QA.md is a checklist, not evidence that every scenario was executed in this session.
