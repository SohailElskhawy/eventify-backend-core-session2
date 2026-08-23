# Session 6 — Capstone: Eventify v1.0

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 1 — Test Infrastructure & Test Environment Setup
- [x] Install test dependencies (`vitest`, `supertest`, `@types/supertest`)
- [x] Update `package.json` test script to run Vitest (`"test": "vitest run"`)
- [x] Configure `vitest.config.ts` (`fileParallelism: false`, setup file registration)
- [x] Implement `tests/setup.ts` (Point to `eventify_test` database, `beforeEach` table truncation, Redis test cleanup)
- [x] Implement test helpers in `tests/helpers/`:
  - [x] Auth helper (`tests/helpers/auth.helper.ts` for signing valid test JWTs and creating users)
  - [x] Database helper (`tests/helpers/db.helper.ts` for truncating tables and seeding test fixtures)

## Phase 2 — Integration Test Suite (Task 1)
- [x] Auth integration tests (`tests/integration/auth.test.ts`):
  - [x] Register new user & login flow
  - [x] Refresh token rotation (valid exchange issues new access + refresh pair, revokes old token)
  - [x] Reused/revoked refresh token rejected with 401
- [x] Role-gated event creation tests (`tests/integration/events.test.ts`):
  - [x] `ORGANIZER` can create an event (201)
  - [x] `ADMIN` can create an event (201)
  - [x] `ATTENDEE` receives 403 Forbidden
  - [x] Unauthenticated user receives 401 Unauthorized
- [x] Booking capacity & waitlist tests (`tests/integration/bookings.test.ts`):
  - [x] Booking an open event returns 201 (`CONFIRMED`)
  - [x] Booking a full event creates a `WAITLISTED` booking (or returns 409)
- [x] Soft-cancel & rebooking tests (`tests/integration/rebooking.test.ts`):
  - [x] User cancels booking (`DELETE /v1/bookings/:id`) -> status becomes `CANCELLED`
  - [x] Same user rebooks the event -> status flips back to `CONFIRMED` without duplicate key error
- [x] Cache invalidation tests (`tests/integration/cache.test.ts`):
  - [x] Read event caches data in Redis
  - [x] Write/update event invalidates Redis cache
  - [x] Subsequent read fetches fresh updated data from DB
- [x] Run test suite locally and verify:
  - [x] Tests pass in any order
  - [x] All Supertest calls are awaited
  - [x] Zero race conditions or database leaks

## Phase 3 — CI/CD Pipeline & GitHub Branch Protection (Task 2)
- [x] Create `.github/workflows/ci.yml`:
  - [x] Setup Postgres & Redis service containers
  - [x] Run `npm run lint`
  - [x] Run `npm run typecheck`
  - [x] Run `npx prisma migrate deploy`
  - [x] Run `npm run test`
- [ ] Configure GitHub Branch Protection on `main`:
  - [ ] Require `checks` job to pass before merging
- [ ] Capture proof/screenshot of green CI check and red failing check

## Phase 4 — Production Cloud Deployment (Task 3)
- [x] Verify `Dockerfile` (two-stage build on `node:24-slim`, `prisma generate` before `tsc`, `USER node`)
- [x] Verify graceful SIGTERM/SIGINT shutdown handling
- [ ] Deploy Web Service to Render:
  - [ ] Connect Neon Postgres (`DATABASE_URL`)
  - [ ] Connect Upstash Redis (`REDIS_URL`)
  - [ ] Set `JWT_ACCESS_SECRET`, `WEB_ORIGIN`, `PORT`
  - [ ] Pre-deploy command: `npx prisma migrate deploy`
- [ ] Seed live database with demo data (`npx prisma db seed`)
- [ ] Verify live endpoints:
  - [ ] `GET /health` returns ok
  - [ ] Register, login, and create booking on live URL

## Phase 5 — Documentation & Final Capstone PR (Task 4 & Submission)
- [x] Update root `README.md`:
  - [x] One-paragraph project pitch
  - [x] Live demo URL & health check link
  - [x] Architecture diagram / system sketch
  - [x] Endpoint table & access policies
  - [x] 3-command local setup instructions
  - [x] Decisions, trade-offs, and AI-usage disclosure section
- [x] Verify gates:
  - [x] `npm run typecheck` passes
  - [x] `npm run lint` passes
- [ ] Open PR titled `capstone: Eventify v1.0` with `tasks/todo.md` as the first commit
