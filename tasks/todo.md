# Session 3 — Bookings That Survive a Restart

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 0 — Branch
- [x] Branch `feat/session-3-bookings` from `feat/database` (no session-3 starter available; build from spec)

## Phase 1 — Schema alignment (task 1 prerequisite)
- [x] Add `enum BookingStatus { CONFIRMED CANCELLED WAITLISTED }` and `enum Role { ATTENDEE ORGANIZER ADMIN }`
- [x] Keep `@@unique([userId, eventId])` on Booking
- [x] `npx prisma migrate dev` to generate the diff migration

## Phase 2 — Config & env (task 1)
- [x] Create `src/config.ts` with zod envSchema: `DATABASE_URL`, `PORT`, `NODE_ENV`
- [x] Create `.env.example` with `DATABASE_URL`
- [x] Update `prisma.config.ts`: register `prisma/seed.ts`, read `DATABASE_URL` (no implicit .env)
- [x] Generator -> `prisma-client` with `output` in source tree; install `@prisma/adapter-pg` + `pg`

## Phase 3 — Event repository swap (task 1)
- [x] Create `src/events/event.repository.ts` (Prisma): create, getById, list (page/limit + venue/from/to filters + `{data,page,limit,total}`), update, delete
- [x] Refactor `event.service.ts` to async, delegate persistence to repository; remove in-memory `Map`
- [x] Controllers stay unchanged in shape (become async only if service is async)

## Phase 4 — Transactional bookings (task 2) — the heart
- [x] Write `src/bookings/booking.service.ts`: `prisma.$transaction({ isolationLevel: Serializable })`
  - [x] capacity check: `tx.booking.count({ where: { eventId, status: "CONFIRMED" } })` >= event.capacity -> handle (throw 409)
  - [x] rebooking flip: `tx.booking.findUnique({ where: { userId_eventId } })` -> none=create, CANCELLED=update to CONFIRMED, CONFIRMED=throw 409, WAITLISTED=leave
  - [x] create the CONFIRMED row
  - [x] catch `P2002` -> throw `HttpError(409)`
- [x] Fold function into `src/bookings/booking.service.ts`; replace in-memory `Map`
- [x] `cancelBooking` = soft update to `CANCELLED` (row stays)
- [x] Wire controller to `await` the now-async service; controller shape unchanged
- [x] **Stretch:** retry loop on `P2034` / `DriverAdapterError` serialization conflicts (bounded retries with backoff, re-run whole tx)

## Phase 5 — Seed script (task 3)
- [x] `prisma/seed.ts`: 3+ users via upsert (ORGANIZER, ADMIN, ATTENDEE), 5 events (one capacity-5), some bookings
- [x] 20 distinct users for the parallel script (upsert by email)
- [x] Print the capacity-5 event id + 20 user ids so I can fill the fixture
- [x] Idempotent: run twice -> no errors, no duplicates

## Phase 6 — Parallel proof (task 2 acceptance)
- [x] `docker compose up -d` -> `npx prisma migrate dev` -> `npx prisma db seed`
- [x] Fill `scripts/fixtures/parallel-users.json` (baseUrl, eventId, capacity, 20 {userId, token:""})
- [x] `npm run dev` (t1) + `node scripts/parallel-bookings.ts` (t2)
- [x] Tally: exactly 5x201, 15x409 (zero 500s with retry loop)
- [x] psql: `SELECT status, COUNT(*) FROM "Booking" WHERE "eventId"='<id>' GROUP BY status;` -> 5 CONFIRMED
- [x] cancel-then-rebook: DELETE one confirmed -> POST same user -> 201 CONFIRMED

## Phase 7 — Index proof (task 4)
- [x] Enable `log: ['query']` on PrismaClient
- [x] Capture "bookings by user" SQL; `EXPLAIN ANALYZE` in psql -> save before plan
- [x] Add `@@index([userId])` to Booking; `npx prisma migrate dev --name booking_user_idx`
- [x] `EXPLAIN ANALYZE` again -> save after plan
- [x] Write two sentences in my own words comparing them

## Phase 8 — PR
- [x] README: fresh-clone run steps (docker up -> migrate dev -> db seed -> npm run dev)
- [x] PR description: run steps, task-4 before/after plans + two sentences, exit-ticket one sentence
- [x] `npm run typecheck` + `npm run lint` green
