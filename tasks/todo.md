# Session 5 — Caching, Queues & Background Jobs

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 1 — Infrastructure & Dependencies (Task 2 & 3 Prereqs)
- [x] Install Redis client (`redis`) and BullMQ (`bullmq`) dependencies
- [x] Update `docker-compose.yml` to include `redis:8` service on port `6379`
- [x] Update `src/config.ts` with validated `REDIS_URL` in `envSchema`
- [x] Update `.env.example` and `.env` with `REDIS_URL=redis://localhost:6379`
- [x] Implement `src/infra/redis.ts` (Node-redis client for cache and rate limiter)
- [x] Implement `src/infra/queue-backend.ts` (Dedicated connection wrapped for BullMQ v6)

## Phase 2 — Redis Rate Limiting Rollout (Task 3)
- [x] Implement fixed-window rate limiter middleware in `src/middleware/rateLimiter.ts`:
  - [x] Key format: `rl:{identifier}:{path}:{window}`
  - [x] Support custom key generators (IP address vs. Authenticated User ID)
  - [x] Return standard 429 Too Many Requests with `Retry-After` header when limit exceeded
- [x] Apply rate limiter to `POST /v1/auth/login` (strict, per-IP limit: e.g., 5 attempts / 60s)
- [x] Apply rate limiter to `POST /v1/bookings` (per-user limit: key by `req.user.sub`, e.g., 10 bookings / 60s)
- [x] Create verification script `scripts/verify-rate-limit.ts` to prove:
  - [x] Burst beyond threshold returns 429 status code
  - [x] Requests recover after window expiry

## Phase 3 — Cache-Aside & Cache Metrics (Task 2)
- [x] Implement cache metrics collector with `{ hits, misses, ratio }` tracking
- [x] Add periodic logging (structured JSON via `console.log` every 60s or 100 lookups)
- [x] Update `src/events/event.service.ts` with cache-aside read path:
  - [x] `getEventById`: Read `event:{id}` from Redis; on miss fetch from DB and set with 60s TTL + jitter
  - [x] `listEvents`: Read `events:list:{v}:{page}` from Redis; on miss fetch from DB and cache
- [x] Implement cache invalidation (delete-on-write & list versioning):
  - [x] `updateEvent`: `DEL event:{id}` and `INCR events:list:v`
  - [x] `deleteEvent`: `DEL event:{id}` and `INCR events:list:v`
  - [x] `createEvent`: `INCR events:list:v`

## Phase 4 — Background Jobs & Workers (Option A: Waitlist Promotion) (Task 1)
- [x] Update booking transaction in `src/bookings/booking.service.ts`:
  - [x] When event is full (`confirmedCount >= event.capacity`), create booking with status `WAITLISTED` instead of throwing 409
  - [x] If existing booking was `CANCELLED` and event is full, update status to `WAITLISTED`
- [x] Implement queues in `src/jobs/`:
  - [x] `src/jobs/email.queue.ts` (`booking-email` queue, job `confirmation`, payload `{ bookingId }`)
  - [x] `src/jobs/waitlist.queue.ts` (`waitlist-promote` queue, job `promote`, payload `{ eventId }`)
- [x] Update `cancelBooking` in `src/bookings/booking.service.ts`:
  - [x] When a `CONFIRMED` booking is cancelled, enqueue a `waitlist-promote` job with `{ eventId }`
- [x] Implement worker in `src/worker.ts` (independent process):
  - [x] Worker for `waitlist-promote`:
    - [x] Finds oldest `WAITLISTED` booking for the event (ordered by `createdAt ASC`)
    - [x] In a serializable transaction, re-checks capacity and promotes booking to `CONFIRMED`
    - [x] Enqueues confirmation email job (`booking-email`)
  - [x] Worker for `booking-email`:
    - [x] Simulates sending confirmation email (log confirmation payload)
- [x] Create verification script `scripts/verify-waitlist.ts` to prove:
  - [x] Booking a full event creates a `WAITLISTED` row
  - [x] Cancelling a confirmed booking triggers worker promotion of the oldest waitlisted booking
  - [x] Re-running worker job does not double-promote

## Phase 5 — Deploy Prep for Session 6 & Final Verification (Task 4 & Submission)
- [ ] Provision cloud instances:
  - [ ] Render account
  - [ ] Neon Postgres database instance
  - [ ] Upstash Redis instance
  - [ ] Store connection strings securely in private `.env`
- [x] Run verification gates:
  - [x] `npm run typecheck` passes with zero errors
  - [x] `npm run lint` passes
- [x] Prepare PR description:
  - [x] AI caching-strategy interrogation notes
  - [x] Exit ticket answer (why `updateEvent` deletes cache key instead of SET)
  - [x] Cache hit/miss ratio logs quote
