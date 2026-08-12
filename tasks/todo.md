# Session 1 — Eventify's First Server

Check items off as they land. AI-assisted work is verified line by line.

## Task 1 — Domain types (`src/domain.ts`)

- [x] `Role` and `BookingStatus` as literal unions
- [x] `Event`, `User`, `Booking` interfaces matching the course contract exactly
- [x] Generic `findById<T extends { id: string }>`
- [x] `npm run typecheck` passes, no `any` anywhere

## Task 2 — Routes on the raw server

- [x] `GET /health` → `200` status + uptime
- [x] `GET /events` → `200` with hardcoded `Event[]`
- [x] `GET /events/:id` → `200` one event, or `404` `{ "error": "Event not found" }`
- [x] Any other path → `404` `{ "error": "Not found" }`
- [x] All bodies are JSON with `content-type: application/json`
- [x] Verified with `curl` across every table row (incl. garbage path + missing id)

## Task 3 — Async data loading from `data/events.json`

- [x] `GET /events` (+ `/events/:id`) load `data/events.json` lazily on first request
- [x] `node:fs/promises`, async/await + `try/catch`, no `.then` chains
- [x] On read failure: log the error, return `500` JSON body, process never crashes
- [x] `/health` still answers `200` with data file deleted

## Task 4 — PR hygiene

- [x] Working on a feature branch (`feat/session-1-server`) in logical commits
- [x] PR description: what was built + how to run it
- [x] PR description: which parts were AI-assisted and how they were verified
- [x] PR description: one concrete thing the agent got wrong and how it was caught
- [x] `tasks/todo.md` included in the PR (commit lands before the code)

## Stretch (optional)

- [x] `POST /events`: accumulate body chunks, parse JSON manually, validate by hand