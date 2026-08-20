# Session 4 — Locking Eventify Down

Plan-first rule: this file is the PR's first commit. Check items off as you go.

## Phase 1 — Config, Dependencies & Environment (Task 1 & 3 Prereqs)
- [x] Install auth dependencies: `jsonwebtoken`, `cookie-parser`, `bcryptjs` and type definitions
- [x] Update `src/config.ts` with validated `JWT_ACCESS_SECRET`, `WEB_ORIGIN` via `envSchema`
- [x] Update `.env.example` and `.env` with `JWT_ACCESS_SECRET` and `WEB_ORIGIN`
- [x] Configure `cookie-parser` in `src/app.ts`

## Phase 2 — Database Schema & Migrations (Task 3 Prereq)
- [x] Add `passwordHash String` to `User` model in `prisma/schema.prisma`
- [x] Add `RefreshToken` model to `prisma/schema.prisma` with `tokenHash`, `expiresAt`, `revokedAt`, `replacedById`, and `user` relation
- [x] Add `refreshTokens RefreshToken[]` back-relation on `User`
- [x] Run Prisma migration & client generation (`npx prisma generate`)
- [x] Update `src/domain.ts` types for User, AuthTokenPayload, AuthSession, and RefreshToken

## Phase 3 — Auth Infrastructure & Middlewares (Task 1 & 3)
- [x] Implement password hashing helper (`hashPassword`, `verifyPassword`) with bcrypt
- [x] Implement JWT helper with pinned `HS256`, 15-minute expiration, and Zod payload schema validation
- [x] Implement opaque token generator (`randomBytes(32)`) and SHA-256 token hashing helper (`hashToken`)
- [x] Implement `requireAuth` middleware (extracts Bearer token, validates JWT, populates `req.user`)
- [x] Implement `requireRole(...roles: Role[])` middleware (checks `req.user.role`, returns 403 on mismatch)

## Phase 4 — Auth Endpoints & Token Rotation (Task 3)
- [x] Implement `RefreshTokenRepository` and `AuthService`:
  - [x] `signup(data)`: hashes password, creates user, returns sanitized user DTO (no `passwordHash`)
  - [x] `login(email, password)`: generic 401 on bad credentials, generates access JWT + opaque refresh token, stores SHA-256 hash in DB, sets `httpOnly` cookie
  - [x] `refresh(rawRefreshToken)`: finds unrevoked, unexpired token by SHA-256 hash; atomically sets `revokedAt` and `replacedById`, creates new token, issues new access token + cookie; returns generic 401 on reuse/expiry/invalid
  - [x] `logout(rawRefreshToken)`: revokes token in DB, clears cookie
- [x] Implement `auth.controller.ts` and `auth.routes.ts` mounted at `/v1/auth`
- [x] Mount `/v1/auth` routes in `src/app.ts`

## Phase 5 — Route Protection & Ownership Checks (Tasks 1 & 2 - BOLA)
- [x] Protect `POST /v1/events`: `requireAuth` + `requireRole("ORGANIZER", "ADMIN")`, set `organizerId` from token `sub`
- [x] Protect `PATCH /v1/events/:id` & `DELETE /v1/events/:id`: `requireAuth` + ownership check (`event.organizerId === req.user.id`, ADMIN bypasses)
- [x] Protect `POST /v1/bookings`: `requireAuth` (uses `req.user.id` as `userId`)
- [x] Protect `DELETE /v1/bookings/:id`: `requireAuth` + ownership check (`booking.userId === req.user.id`, ADMIN bypasses)
- [x] Keep `GET /v1/events`, `GET /v1/events/:id`, and `GET /health` public

## Phase 6 — Seed Update & Proof Script (Task 2 Acceptance)
- [x] Update `prisma/seed.ts` with two distinct `ORGANIZER` users, one `ADMIN`, and `ATTENDEE` users with hashed passwords
- [x] Update deterministic seed with second organizer for BOLA test
- [x] Create verification script `scripts/verify-auth.ts` to prove:
  - [x] Unauthenticated requests to protected endpoints return 401
  - [x] `ATTENDEE` calling `POST /v1/events` returns 403
  - [x] `ORGANIZER 1` cannot edit/delete `ORGANIZER 2`'s event (403 BOLA check)
  - [x] `ORGANIZER 1` can edit own event (200 OK)
  - [x] `ADMIN` can edit any event (200 OK)
  - [x] User cannot cancel another user's booking (403 BOLA check)
  - [x] Refresh token rotation works, and token reuse yields 401

## Phase 7 — AI Security Audit, Quality Checks & Submission (Task 4 & Submission)
- [x] Run OWASP API Security Top 10 prompt against endpoints and triage at least 3 findings
- [x] Document findings (fixed / false-positive / accepted-risk) and exit ticket in PR description
- [x] Run `npm run typecheck` and `npm run lint` to verify zero errors
