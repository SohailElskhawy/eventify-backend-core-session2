# Eventify — Production-Ready Event Booking Platform (v1.0)

**Eventify** is a high-performance, concurrency-resilient event booking and ticketing backend API built with **Node.js 24**, **Express 5**, **TypeScript**, **Prisma ORM / PostgreSQL**, **Redis**, and **BullMQ**. It guarantees zero overselling under race conditions, features secure JWT authentication with rotating refresh tokens, provides low-latency reads through Redis cache-aside with versioned list invalidation, and processes asynchronous waitlist promotions and emails via dedicated background workers.

---

## 🌐 Live Deployment

- **API Base URL**: `https://eventify-backend-core.onrender.com`
- **Health Check**: `https://eventify-backend-core.onrender.com/health`
- **Database**: Neon Managed PostgreSQL
- **Cache & Queues**: Upstash Managed Redis

---

## 🏛️ System Architecture

```
                       ┌─────────────────────────────────────┐
                       │           Clients / Web UI          │
                       └──────────────────┬──────────────────┘
                                          │ HTTP / JSON
                                          ▼
                       ┌─────────────────────────────────────┐
                       │          Express 5 API App          │
                       │   (Auth, RBAC, Validation, BOLA)    │
                       └──────────┬────────────────┬─────────┘
                                  │                │
            Prisma (Serializable) │                │ Redis Cache-Aside & Rate Limiting
                                  ▼                ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │ PostgreSQL (Neon)│    │  Redis (Upstash) │
                     │  (ACID Storage)  │    │  (Cache & Queues)│
                     └──────────────────┘    └────────┬─────────┘
                                                      │
                                                      │ BullMQ Jobs (waitlist, email)
                                                      ▼
                                             ┌──────────────────┐
                                             │ Background Worker│
                                             │ (Waitlist Promo) │
                                             └──────────────────┘
```

---

## 🚀 3-Command Local Quickstart

Get the entire stack (API, Worker, PostgreSQL, Redis) running locally:

```bash
# 1. Install dependencies and create your local env file
npm install && cp .env.example .env

# 2. Start PostgreSQL and Redis in Docker
docker compose up -d

# 3. Apply database migrations, seed demo data, and start the development server
npx prisma migrate dev && npx prisma db seed && npm run dev
```

To run the background worker concurrently in a second terminal:
```bash
npm run worker
```

---

## 📋 API Specification & Policy Matrix

| Method | Path | Auth / Role Policy | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Service health & uptime probe |
| `POST` | `/v1/auth/signup` | Public | Register a new user (`ATTENDEE` / `ORGANIZER`) |
| `POST` | `/v1/auth/login` | Public (Rate-limited: 5 req/min per IP) | Authenticate user, receive JWT & set refresh cookie |
| `POST` | `/v1/auth/refresh` | Public (`refreshToken` cookie required) | Rotate refresh token and issue fresh JWT |
| `POST` | `/v1/auth/logout` | Public (`refreshToken` cookie required) | Revoke token and clear refresh cookie |
| `GET` | `/v1/events` | Public | List events with pagination (`?page`, `?limit`), filters (`?venue`, `?from`, `?to`) — cached |
| `GET` | `/v1/events/:id` | Public | Retrieve event details by ID — cached in Redis |
| `POST` | `/v1/events` | `ORGANIZER` or `ADMIN` | Create a new event |
| `PATCH` | `/v1/events/:id` | `ORGANIZER` (owner) or `ADMIN` | Update event (invalidates cache) |
| `DELETE`| `/v1/events/:id` | `ORGANIZER` (owner) or `ADMIN` | Delete event (invalidates cache) |
| `POST` | `/v1/bookings` | Authenticated (Rate-limited: 10 req/min per user) | Book event (creates `CONFIRMED` or `WAITLISTED` if full) |
| `GET` | `/v1/bookings/:id` | Authenticated (owner or `ADMIN`) | Get booking details |
| `DELETE`| `/v1/bookings/:id` | Authenticated (owner or `ADMIN`) | Soft-cancel booking (`CANCELLED`), enqueues waitlist promotion |

---

## 🧪 Testing & Quality Gates

Run the automated test suite and verification commands:

```bash
# Run Vitest integration test suite (sequential execution, isolated test DB)
npm test

# Run strict TypeScript typechecking
npm run typecheck

# Run ESLint analysis
npm run lint
```

---

## 📐 Engineering Decisions & Trade-offs

1. **Serializable Isolation for Bookings**:
   - *Decision*: We wrap booking creation inside PostgreSQL `Serializable` transactions with retry logic.
   - *Trade-off*: Higher database contention under heavy load in exchange for absolute mathematical guarantee against overselling.
2. **Delete-on-Write & List Version Counter Caching**:
   - *Decision*: On event mutations, single keys are deleted (`DEL event:{id}`) and list versions are bumped (`INCR events:list:v`).
   - *Trade-off*: Eliminates cache race conditions and stale pagination state without complex cache updating logic.
3. **Opaque Hashed Refresh Tokens in HttpOnly Cookies**:
   - *Decision*: Refresh tokens are cryptographic random strings hashed with SHA-256 at rest, stored in strict `httpOnly` cookies with single-use rotation.
   - *Trade-off*: Requires database lookup on refresh, but prevents token theft and XSS vulnerabilities.
4. **Soft Deletion & Rebooking Flip**:
   - *Decision*: Booking cancellations set status to `CANCELLED` rather than deleting rows. Rebooking flips the same row back to `CONFIRMED`.
   - *Trade-off*: Retains audit trail and respects unique composite index `@@unique([userId, eventId])`.

---

## 🤖 AI Usage & Verification Disclosure

- **AI Assistance**: AI was utilized to draft initial boilerplate schemas, generate comprehensive integration test scenarios, and assemble CI workflow definitions.
- **Verification & Ownership**: Every AI-generated component was independently verified:
  - Validated Zod 4 runtime schemas and custom error transformations.
  - Ensured all Supertest HTTP assertions are explicitly `await`ed to prevent unhandled promise drops.
  - Verified that Prisma transactions execute exclusively through `tx` to preserve ACID serializability.
  - Confirmed 100% pass rate across TypeScript typecheck, ESLint, and Vitest test suites.