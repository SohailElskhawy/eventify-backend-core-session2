# Session 3 — Bookings That Survive a Restart

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 0 — Branch
- [x] Branch `feat/session-3-bookings` from `feat/database` (no session-3 starter available; build from spec)

## Phase 1 — Schema alignment (task 1 prerequisite)
- [ ] Add `enum BookingStatus { CONFIRMED CANCELLED WAITLISTED }` and `enum Role { ATTENDEE ORGANIZER ADMIN }`
- [ ] Drop `Venue` model; make `Event.venue` a plain `String?` field (match class schema)
- [ ] Keep `@@unique([userId, eventId])` on Booking
- [ ] `npx prisma migrate dev` to generate the diff migration

## Phase 2 — Config & env (task 1)
- [ ] Create `src/config.ts` with zod envSchema: `DATABASE_URL`, `PORT`, `NODE_ENV`
- [ ] Create `.env.example` with `DATABASE_URL`
- [ ] Update `prisma.config.ts`: register `prisma/seed.ts`, read `DATABASE_URL` (no implicit .env)
- [ ] Generator -> `prisma-client` with `output` in source tree; install `@prisma/adapter-pg` + `pg`

## Phase 3 — Event repository swap (task 1)
- [ ] Create `src/events/event.repository.ts` (Prisma): create, getById, list (page/limit + venue/from/to filters + `{data,page,limit,total}`), update, delete
- [ ] Refactor `event.service.ts` to async, delegate persistence to repository; remove in-memory `Map`
- [ ] Remove venue routes/files from `src/app.ts` (not in S3 contract)
- [ ] Controllers stay unchanged in shape (become async only if service is async)

## Phase 4 — Transactional bookings (task 2) — the heart
- [ ] Write `src/bookings/create-booking.ts`: `prisma.$transaction({ isolationLevel: Serializable })`
  - [ ] capacity check: `tx.booking.count({ where: { eventId, status: "CONFIRMED" } })` >= event.capacity -> handle
  - [ ] rebooking flip: `tx.booking.findUnique({ where: { userId_eventId } })` -> none=create, CANCELLED=update to CONFIRMED, CONFIRMED=let P2002 fire, WAITLISTED=leave
  - [ ] create the CONFIRMED row
  - [ ] catch `P2002` -> throw `HttpError(409)`
- [ ] Fold function into `src/bookings/bookings.service.ts`; replace in-memory `Map`
- [ ] `cancelBooking` = soft update to `CANCELLED` (row stays)
- [ ] Wire controller to `await` the now-async service; controller shape unchanged
- [ ] **Stretch:** retry loop on `P2034` (bounded retries, re-run whole tx)
- [ ] **Stretch:** on full event, create `WAITLISTED` inside same tx instead of 409

## Phase 5 — Seed script (task 3)
- [ ] `prisma/seed.ts`: 3+ users via upsert (ORGANIZER, ADMIN, ATTENDEE), 5 events (one capacity-5), some bookings
- [ ] 20 distinct users for the parallel script (upsert by email)
- [ ] Print the capacity-5 event id + 20 user ids so I can fill the fixture
- [ ] Idempotent: run twice -> no errors, no duplicates

## Phase 6 — Parallel proof (task 2 acceptance)
- [ ] `docker compose up -d` -> `npx prisma migrate dev` -> `npx prisma db seed`
- [ ] Fill `scripts/fixtures/parallel-users.json` (baseUrl, eventId, capacity, 20 {userId, token:""})
- [ ] `npm run dev` (t1) + `node scripts/parallel-bookings.ts` (t2)
- [ ] Tally: exactly 5x201, 15x409 (zero 500s with retry loop)
- [ ] psql: `SELECT status, COUNT(*) FROM "Booking" WHERE "eventId"='<id>' GROUP BY status;` -> 5 CONFIRMED
- [ ] cancel-then-rebook: DELETE one confirmed -> POST same user -> 201 CONFIRMED

## Phase 7 — Index proof (task 4)
- [ ] Enable `log: ['query']` on PrismaClient
- [ ] Capture "bookings by user" SQL; `EXPLAIN ANALYZE` in psql -> save before plan
- [ ] Add `@@index([userId])` to Booking; `npx prisma migrate dev --name booking_user_idx`
- [ ] `EXPLAIN ANALYZE` again -> save after plan
- [ ] Write two sentences in my own words comparing them

## Phase 8 — PR
- [ ] README: fresh-clone run steps (docker up -> migrate dev -> db seed -> npm run dev)
- [ ] PR description: run steps, task-4 before/after plans + two sentences, exit-ticket one sentence
- [ ] Verify in a literal fresh clone
- [ ] `npm run typecheck` + `npm run lint` green
