# TODO: Flashcards functionality

Short: add in-extension flashcards so users can create, study and track learning (decks, cards, spaced repetition, import/export).

## Goals
- Create/manage decks & cards (front/back, tags, optional media)
- Study sessions with scheduling (SRS/Leitner) and basic stats
- Local-first storage, offline support, optional sync/import/export

## MVP (must have)
- [ ] Deck CRUD (create/rename/delete)
- [ ] Card CRUD (front/back, tags, optional example/media)
- [ ] Study mode: flip, mark response (Again/Hard/Good/Easy)
- [ ] Basic scheduling (SM-2 or simplified Leitner)
- [ ] Persist review state & stats in browser.storage.local
- [ ] Import / export JSON and CSV
- [ ] Keyboard shortcuts (flip, next, rate) + basic accessibility (aria + focus)
- [ ] Unit tests for scheduler + storage; integration test for study flow
- [ ] UI: "Flashcards" route, deck list, deck view, card editor, study view

## Next / Nice-to-have
- [ ] Optional sync (browser.storage.sync or opt‑in cloud)
- [ ] Import from Anki / .apkg support
- [ ] Deck sharing / public decks
- [ ] Notifications/reminders, session timer, progress analytics
- [ ] Advanced filters, bulk edit, tagging, spaced repetition tuning
- [ ] Localization

## Implementation notes
- Data model (example): Deck {id,name,created,updated,settings}, Card {id,deckId,front,back,tags,media}, Review {cardId,nextReview,interval,efactor,history}
- Storage: browser.storage.local (consider IndexedDB for larger media); use a versioned key (flashcards.v1) and migrations
- Scheduler: implement SM-2; keep simple defaults for MVP
- UI: consistent with extension theme; responsive; modal editor for cards
- Shortcuts: Space/Enter flip, Arrow keys navigation, 1–4 for rating
- Privacy: data local by default; provide full export & "delete all data"
- Tests: unit tests for algorithm, storage migration tests, E2E study session test

## Acceptance criteria
- All MVP checklist items implemented and tested
- Data persists after restart and can be exported/imported successfully
- Basic accessibility passes (keyboard + screen reader basics)
- UX flows demoable and documented in README

## Estimates (rough)
- MVP: 5–10 dev days (1–2 devs)
- Sync & extras: +2–4 weeks depending on scope

Notes: prefer client-side only for first release; add opt-in cloud sync later. 