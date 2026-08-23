# Session 5 — Caching, Queues & Background Jobs

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 1 — Infrastructure & Dependencies (Task 2 & 3 Prereqs)
- [ ] Install Redis client (`redis`) and BullMQ (`bullmq`) dependencies
- [ ] Update `docker-compose.yml` to include `redis:8` service on port `6379`
- [ ] Update `src/config.ts` with validated `REDIS_URL` in `envSchema`
- [ ] Update `.env.example` and `.env` with `REDIS_URL=redis://localhost:6379`
- [ ] Implement `src/infra/redis.ts` (Node-redis client for cache and rate limiter)
- [ ] Implement `src/infra/queue-backend.ts` (Dedicated connection wrapped for BullMQ v6)

## Phase 2 — Redis Rate Limiting Rollout (Task 3)
- [ ] Implement fixed-window rate limiter middleware in `src/middleware/rateLimiter.ts`:
  - [ ] Key format: `rl:{identifier}:{path}:{window}`
  - [ ] Support custom key generators (IP address vs. Authenticated User ID)
  - [ ] Return standard 429 Too Many Requests with `Retry-After` header when limit exceeded
- [ ] Apply rate limiter to `POST /v1/auth/login` (strict, per-IP limit: e.g., 5 attempts / 60s)
- [ ] Apply rate limiter to `POST /v1/bookings` (per-user limit: key by `req.user.sub`, e.g., 10 bookings / 60s)
- [ ] Create verification script `scripts/verify-rate-limit.ts` to prove:
  - [ ] Burst beyond threshold returns 429 status code
  - [ ] Requests recover after window expiry

## Phase 3 — Cache-Aside & Cache Metrics (Task 2)
- [ ] Implement cache metrics collector with `{ hits, misses, ratio }` tracking
- [ ] Add periodic logging (structured JSON via `console.log` every 60s or 100 lookups)
- [ ] Update `src/events/event.service.ts` with cache-aside read path:
  - [ ] `getEventById`: Read `event:{id}` from Redis; on miss fetch from DB and set with 60s TTL + jitter
  - [ ] `listEvents`: Read `events:list:{v}:{page}` from Redis; on miss fetch from DB and cache
- [ ] Implement cache invalidation (delete-on-write & list versioning):
  - [ ] `updateEvent`: `DEL event:{id}` and `INCR events:list:v`
  - [ ] `deleteEvent`: `DEL event:{id}` and `INCR events:list:v`
  - [ ] `createEvent`: `INCR events:list:v`

## Phase 4 — Background Jobs & Workers (Option A: Waitlist Promotion) (Task 1)
- [ ] Update booking transaction in `src/bookings/booking.service.ts`:
  - [ ] When event is full (`confirmedCount >= event.capacity`), create booking with status `WAITLISTED` instead of throwing 409
  - [ ] If existing booking was `CANCELLED` and event is full, update status to `WAITLISTED`
- [ ] Implement queues in `src/jobs/`:
  - [ ] `src/jobs/email.queue.ts` (`booking-email` queue, job `confirmation`, payload `{ bookingId }`)
  - [ ] `src/jobs/waitlist.queue.ts` (`waitlist-promote` queue, job `promote`, payload `{ eventId }`)
- [ ] Update `cancelBooking` in `src/bookings/booking.service.ts`:
  - [ ] When a `CONFIRMED` booking is cancelled, enqueue a `waitlist-promote` job with `{ eventId }`
- [ ] Implement worker in `src/worker.ts` (independent process):
  - [ ] Worker for `waitlist-promote`:
    - [ ] Finds oldest `WAITLISTED` booking for the event (ordered by `createdAt ASC`)
    - [ ] In a serializable transaction, re-checks capacity and promotes booking to `CONFIRMED`
    - [ ] Enqueues confirmation email job (`booking-email`)
  - [ ] Worker for `booking-email`:
    - [ ] Simulates sending confirmation email (log confirmation payload)
- [ ] Create verification script `scripts/verify-waitlist.ts` to prove:
  - [ ] Booking a full event creates a `WAITLISTED` row
  - [ ] Cancelling a confirmed booking triggers worker promotion of the oldest waitlisted booking
  - [ ] Re-running worker job does not double-promote

## Phase 5 — Deploy Prep for Session 6 & Final Verification (Task 4 & Submission)
- [ ] Provision cloud instances:
  - [ ] Render account
  - [ ] Neon Postgres database instance
  - [ ] Upstash Redis instance
  - [ ] Store connection strings securely in private `.env`
- [ ] Run verification gates:
  - [ ] `npm run typecheck` passes with zero errors
  - [ ] `npm run lint` passes
- [ ] Prepare PR description:
  - [ ] AI caching-strategy interrogation notes
  - [ ] Exit ticket answer (why `updateEvent` deletes cache key instead of SET)
  - [ ] Cache hit/miss ratio logs quote
