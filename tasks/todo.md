# Session 6 — Capstone: Eventify v1.0

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 1 — Test Infrastructure & Test Environment Setup
- [ ] Install test dependencies (`vitest`, `supertest`, `@types/supertest`)
- [ ] Update `package.json` test script to run Vitest (`"test": "vitest run"`)
- [ ] Configure `vitest.config.ts` (`fileParallelism: false`, setup file registration)
- [ ] Implement `tests/setup.ts` (Point to `eventify_test` database, `beforeEach` table truncation, Redis test cleanup)
- [ ] Implement test helpers in `tests/helpers/`:
  - [ ] Auth helper (`tests/helpers/auth.helper.ts` for signing valid test JWTs and creating users)
  - [ ] Database helper (`tests/helpers/db.helper.ts` for truncating tables and seeding test fixtures)

## Phase 2 — Integration Test Suite (Task 1)
- [ ] Auth integration tests (`tests/integration/auth.test.ts`):
  - [ ] Register new user & login flow
  - [ ] Refresh token rotation (valid exchange issues new access + refresh pair, revokes old token)
  - [ ] Reused/revoked refresh token rejected with 401
- [ ] Role-gated event creation tests (`tests/integration/events.test.ts`):
  - [ ] `ORGANIZER` can create an event (201)
  - [ ] `ADMIN` can create an event (201)
  - [ ] `ATTENDEE` receives 403 Forbidden
  - [ ] Unauthenticated user receives 401 Unauthorized
- [ ] Booking capacity & waitlist tests (`tests/integration/bookings.test.ts`):
  - [ ] Booking an open event returns 201 (`CONFIRMED`)
  - [ ] Booking a full event creates a `WAITLISTED` booking (or returns 409)
- [ ] Soft-cancel & rebooking tests (`tests/integration/rebooking.test.ts`):
  - [ ] User cancels booking (`DELETE /v1/bookings/:id`) -> status becomes `CANCELLED`
  - [ ] Same user rebooks the event -> status flips back to `CONFIRMED` without duplicate key error
- [ ] Cache invalidation tests (`tests/integration/cache.test.ts`):
  - [ ] Read event caches data in Redis
  - [ ] Write/update event invalidates Redis cache
  - [ ] Subsequent read fetches fresh updated data from DB
- [ ] Run test suite locally and verify:
  - [ ] Tests pass in any order
  - [ ] All Supertest calls are awaited
  - [ ] Zero race conditions or database leaks

## Phase 3 — CI/CD Pipeline & GitHub Branch Protection (Task 2)
- [ ] Create `.github/workflows/ci.yml`:
  - [ ] Setup Postgres & Redis service containers
  - [ ] Run `npm run lint`
  - [ ] Run `npm run typecheck`
  - [ ] Run `npx prisma migrate deploy`
  - [ ] Run `npm run test`
- [ ] Configure GitHub Branch Protection on `main`:
  - [ ] Require `checks` job to pass before merging
- [ ] Capture proof/screenshot of green CI check and red failing check

## Phase 4 — Production Cloud Deployment (Task 3)
- [ ] Verify `Dockerfile` (two-stage build on `node:24-slim`, `prisma generate` before `tsc`, `USER node`)
- [ ] Verify `src/infra/shutdown.ts` for graceful SIGTERM/SIGINT shutdown
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
- [ ] Update root `README.md`:
  - [ ] One-paragraph project pitch
  - [ ] Live demo URL & health check link
  - [ ] Architecture diagram / system sketch
  - [ ] Endpoint table & access policies
  - [ ] 3-command local setup instructions
  - [ ] Decisions, trade-offs, and AI-usage disclosure section
- [ ] Verify gates:
  - [ ] `npm run typecheck` passes
  - [ ] `npm run lint` passes
  - [ ] `npm run test` passes
- [ ] Open PR titled `capstone: Eventify v1.0` with `tasks/todo.md` as the first commit
