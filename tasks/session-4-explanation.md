# Session 4 — Locking Eventify Down: Deep Dive & Explanation Guide

This guide explains the architecture, security principles, and line-by-line details for the **Session 4 Authentication, Authorization, Ownership (BOLA prevention), and Refresh Token Rotation** implementation.

---

## 🗺️ Architectural Overview

```mermaid
flowchart TD
    subgraph Client
        Browser[Client App / Browser]
    end

    subgraph AuthLayer[Auth & Security Layer]
        reqAuth[requireAuth Middleware]
        reqRole[requireRole Middleware]
        jwtUtil[JWT Verify (Pinned HS256 + Zod)]
        rotCheck[Rotation & Theft Detection]
    end

    subgraph ServiceLayer[Domain & Service Layer]
        AuthServ[auth.service.ts]
        EventServ[event.service.ts (BOLA Checks)]
        BookServ[booking.service.ts (BOLA Checks)]
    end

    subgraph Database[PostgreSQL via Prisma]
        UserTable[(User: passwordHash)]
        TokenTable[(RefreshToken: tokenHash, replacedById)]
        EventTable[(Event: organizerId)]
        BookTable[(Booking: userId)]
    end

    Browser -->|Bearer Access JWT| reqAuth
    reqAuth --> jwtUtil
    jwtUtil -->|req.user| reqRole
    reqRole --> EventServ
    reqRole --> BookServ

    Browser -->|httpOnly Cookie /v1/auth/refresh| AuthServ
    AuthServ --> rotCheck
    rotCheck --> TokenTable

    EventServ -->|Check organizerId === req.user.sub| EventTable
    BookServ -->|Check userId === req.user.sub| BookTable
```

---

## 📑 Detailed Code Breakdown by Module

### 1. Configuration & Secrets (`src/config.ts`)
* **File:** [`src/config.ts`](file:///C:/Users/sohai/OneDrive/Desktop/work/core-FullstackDevWithAI/Backend/Session1/eventify-backend-core-session2/src/config.ts)
* **What it does:** Uses Zod (`envSchema`) to parse and validate `JWT_ACCESS_SECRET` (minimum 32 characters) and `WEB_ORIGIN`.
* **Security Rationale:**
  * **Fail-Fast:** If `JWT_ACCESS_SECRET` is missing or too short, the application immediately throws an error at boot time rather than failing on the first user request.
  * **No `process.env` Leaks:** Centralized validation ensures secrets are accessed solely through `config.jwtAccessSecret`.

---

### 2. Database Schema (`prisma/schema.prisma`)
* **File:** [`prisma/schema.prisma`](file:///C:/Users/sohai/OneDrive/Desktop/work/core-FullstackDevWithAI/Backend/Session1/eventify-backend-core-session2/prisma/schema.prisma)
* **What it does:**
  * Adds `passwordHash String` to the `User` model.
  * Adds the `RefreshToken` model:
    ```prisma
    model RefreshToken {
      id           String        @id @default(uuid())
      tokenHash    String        @unique
      userId       String
      expiresAt    DateTime
      revokedAt    DateTime?
      replacedById String?       @unique
      createdAt    DateTime      @default(now())
      user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
      replacedBy   RefreshToken? @relation("TokenRotation", fields: [replacedById], references: [id])
      replacedFrom RefreshToken? @relation("TokenRotation")

      @@index([userId])
    }
    ```
* **Security Rationale:**
  * **Hashed at Rest (`tokenHash`):** Stores only the SHA-256 hash of the opaque token. Even a full database dump will not allow an attacker to forge active user sessions.
  * **Rotation Chain (`replacedById`):** Creates an unbroken family tree. If a revoked token is presented, the system detects a token reuse/theft attack and can revoke the whole chain.

---

### 3. Cryptography & JWT Utilities

#### A. Password Hashing (`src/auth/password.ts`)
* **File:** [`src/auth/password.ts`](file:///C:/Users/sohai/OneDrive/Desktop/work/core-FullstackDevWithAI/Backend/Session1/eventify-backend-core-session2/src/auth/password.ts)
* **What it does:** Uses `bcryptjs` with `SALT_ROUNDS = 10` for `hashPassword` and `verifyPassword`.
* **Security Rationale:** Protects against rainbow table attacks with unique per-password salts and constant-time string comparisons.

#### B. Opaque Tokens (`src/auth/token.ts`)
* **File:** [`src/auth/token.ts`](file:///C:/Users/sohai/OneDrive/Desktop/work/core-FullstackDevWithAI/Backend/Session1/eventify-backend-core-session2/src/auth/token.ts)
* **What it does:**
  * `generateOpaqueToken()`: Generates 32 random bytes from `crypto.randomBytes(32).toString('base64url')`.
  * `hashToken()`: Computes `crypto.createHash('sha256').update(token).digest('hex')`.

#### C. JWT Access Tokens (`src/auth/jwt.ts`)
* **File:** [`src/auth/jwt.ts`](file:///C:/Users/sohai/OneDrive/Desktop/work/core-FullstackDevWithAI/Backend/Session1/eventify-backend-core-session2/src/auth/jwt.ts)
* **What it does:**
  * Signs 15-minute access JWTs with `{ sub, role }`.
  * **Pins algorithm to `HS256`** on both `sign` and `verify`.
  * **Zod Schema Parsing:** Parses the decoded payload using `jwtPayloadSchema.safeParse` (never casts using `as`).
* **Security Rationale:**
  * **Prevents Algorithm Confusion Attacks:** An attacker cannot bypass verification by changing the JWT header to `"alg": "none"` or using asymmetric public keys.
  * **Eliminates Malformed Claims:** Validates that `sub` is a valid UUID and `role` matches domain roles.

---

### 4. Auth & Role Middlewares (`src/auth/auth.middleware.ts`)
* **File:** [`src/auth/auth.middleware.ts`](file:///C:/Users/sohai/OneDrive/Desktop/work/core-FullstackDevWithAI/Backend/Session1/eventify-backend-core-session2/src/auth/auth.middleware.ts)
* **What it does:**
  * `requireAuth`: Reads `Authorization: Bearer <token>`, verifies the JWT, and attaches `req.user = payload`. Throws `401 Unauthorized` if absent or invalid.
  * `requireRole(...roles)`: Verifies `roles.includes(req.user.role)`. Throws `403 Forbidden` if unauthorized.

---

### 5. Auth Endpoints & Token Rotation

#### A. Data Access & Service (`src/auth/auth.service.ts` & `src/auth/auth.repository.ts`)
* **`POST /v1/auth/signup`**: Hashes password, creates user, returns sanitized DTO (omits `passwordHash`).
* **`POST /v1/auth/login`**:
  * Returns **one generic 401 message** (`"Invalid email or password"`) for both unknown emails and incorrect passwords (prevents user enumeration).
  * Returns access token in body + sets `httpOnly` cookie.
* **`POST /v1/auth/refresh`**:
  1. Reads `refreshToken` cookie.
  2. Computes `sha256(cookie)`.
  3. If `revokedAt !== null` $\rightarrow$ **Theft Detected!** Revokes entire user token family and returns `401`.
  4. If expired $\rightarrow$ returns `401`.
  5. Atomically in a transaction: creates new token, sets old token `revokedAt = now()` and `replacedById = newId`.
  6. Issues new access token + new rotated cookie.
* **`POST /v1/auth/logout`**: Revokes token in database and clears the cookie.

#### B. Cookie Security Settings (`src/auth/auth.controller.ts`)
```ts
{
    httpOnly: true,                         // Blocks JavaScript document.cookie access (immune to XSS)
    secure: config.nodeEnv === "production", // Enforces HTTPS in production
    sameSite: "strict",                    // Blocks CSRF
    path: "/v1/auth/refresh",              // Scoped ONLY to the refresh endpoint
    maxAge: 7 * 24 * 60 * 60 * 1000        // 7 days
}
```

---

### 6. Broken Object Level Authorization (BOLA) Prevention

#### A. Events (`src/events/event.service.ts`)
* **`POST /v1/events`**: `organizerId` is automatically set to `req.user.sub` (cannot be forged in request body).
* **`PATCH / DELETE /v1/events/:id`**:
  ```ts
  if (currentUser.role !== "ADMIN" && existing.organizerId !== currentUser.sub) {
      throw new HttpError(403, "Forbidden: You do not own this event");
  }
  ```
  Even with a valid `ORGANIZER` role, an organizer attempting to edit or delete another organizer's event receives a `403 Forbidden`.

#### B. Bookings (`src/bookings/booking.service.ts`)
* **`DELETE /v1/bookings/:id` (Cancel Booking)**:
  ```ts
  if (currentUser.role !== "ADMIN" && booking.userId !== currentUser.sub) {
      throw new HttpError(403, "Forbidden: You do not own this booking");
  }
  ```
  Users can only view or cancel their own bookings.

---

## 🧪 Testing Commands & Verification

### Step 1: Start PostgreSQL Database
```bash
docker compose up -d
```

### Step 2: Apply Migrations & Seed
```bash
npx prisma migrate dev
npx prisma db seed
```

### Step 3: Start Dev Server (Terminal 1)
```bash
npm run dev
```

### Step 4: Run Automated Security Test Suite (Terminal 2)
```bash
node --env-file=.env scripts/verify-auth.ts
```

### Step 5: Run Typecheck & Lint Gates
```bash
npm run typecheck
npm run lint
```
