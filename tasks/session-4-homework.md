# Session 4 Homework — Locking Eventify Down

One PR to your `eventify` repo, from branch **`session-4-auth`**. Estimated effort: **4–6 hours**. Everything below builds exactly what Session 5 assumes exists — a defended API is the one we cache, queue, and deploy next.

## Before any code: plan first

The Superpowers loop, same as every session:

1. **Brainstorm** the tasks with your agent.
2. Commit a short **`tasks/todo.md`** plan with checkable items — as the PR's **first commit**.
3. **Implement against it**, checking items off as you go.

The plan is part of the deliverable.

## The starter — copy it, don't invent it

The **`session-4-starter`** branch scaffolds task 3. It contains **no auth code on purpose** — you build the logic; the data model is handed to you.

| File | What it is |
|---|---|
| `prisma/refresh-token.model.prisma` | The complete `RefreshToken` model block, commented. Paste it into `prisma/schema.prisma` and add the `refreshTokens RefreshToken[]` back-relation to `User`. |
| `prisma/migration.sql` | The SQL that model should produce — diff it against what `npx prisma migrate dev --name add-refresh-token` generates for you. |
| `rotation-flow.md` | The rotation flow you implement, numbered, with a sequence diagram. Read it before writing the refresh endpoint. |
| `README.md` | Given vs yours-to-build, getting-started commands, and the session's rules restated. |

Reminder from Session 3: Prisma 7 does not auto-load `.env` — run migrate the way you configured in `prisma.config.ts`.

## The contract

### The `RefreshToken` model (shipped in the starter)

```
RefreshToken
  id           uuid (v7), primary key
  tokenHash    string, unique      // sha256 hex of the opaque token — the raw value never touches the DB
  userId       uuid → User
  expiresAt    DateTime            // issue time + 7 days; expired tokens fail refresh even if never rotated
  revokedAt    DateTime?           // set on rotation (or logout); a revoked token presented again = theft signal
  replacedById uuid?, unique       // rotation chain: which token replaced this one (stretch follows it)
  createdAt    DateTime
```

The full model with comments is `prisma/refresh-token.model.prisma` — copy it, don't retype it.

### Route → policy matrix

Every route you built in Sessions 2–3, with tonight's policy:

| Route | Policy |
|---|---|
| `POST /v1/auth/signup`, `/login`, `/refresh` | public (rate limiting from class stays on `/v1/auth`) |
| `GET /v1/events`, `GET /v1/events/:id` | **public** — and the PR states why |
| `POST /v1/events` | `requireAuth` + role ORGANIZER or ADMIN |
| `PATCH /v1/events/:id`, `DELETE /v1/events/:id` | `requireAuth` + ORGANIZER **owning the event** (`organizerId` === token `sub`); ADMIN bypasses ownership |
| `POST /v1/bookings` | `requireAuth` — any authenticated user books |
| `DELETE /v1/bookings/:id` (cancel) | `requireAuth` + **own booking only** |
| `GET /health` | public |

For any route not pinned above (e.g. `GET /v1/bookings/:id`): you decide — and the PR defends the choice. The circulating question from class applies everywhere: *you checked the role — did you check the owner?*

### The rotation flow, in four lines

1. **Login issues a pair**: access JWT (HS256 pinned, 15 min, claims `sub` + `role`) in the body; opaque refresh token (`randomBytes(32)`, base64url) stored **as a sha256 hash** in `RefreshToken`, raw value only in an `httpOnly` + `Secure` + `SameSite=strict` cookie scoped to `path: '/v1/auth/refresh'`.
2. **Refresh looks up `sha256(token)`** and requires: row exists, not expired, `revokedAt` null.
3. **Rotate atomically**: insert the new row, mark the old one `revokedAt = now()` with `replacedById` pointing at the new row, issue a fresh access token, set the new cookie.
4. **Reuse of a rotated token = theft signal** — 401. Every refresh failure (unknown, expired, revoked) is the **same generic 401**: no oracle.

Full detail and the sequence diagram: `rotation-flow.md` in the starter.

## The tasks

1. **Protect every Eventify endpoint.** Apply class's `requireAuth` / `requireRole` across your routes per the matrix above.
   *Acceptance:* unauthenticated mutations return 401; an ATTENDEE calling `POST /v1/events` gets 403; ORGANIZER/ADMIN can create; any authenticated user can book; `GET /v1/events` stays public **and the PR states why**.

2. **Ownership checks (BOLA).** Role checks are not ownership checks — a valid ORGANIZER token must not edit someone else's event.
   *Acceptance:* an ORGANIZER can update/delete only events where `organizerId` matches their token `sub` (ADMIN bypasses); users can cancel only their own Bookings; **prove the 403** with a Supertest case or curl transcript using **two seeded organizers**. Your Session 3 seed has one ORGANIZER — add a second.

3. **Refresh-token rotation.** Build the `RefreshToken` repository/service and the endpoint logic on top of the starter's model + migration, following `rotation-flow.md`.
   *Acceptance:* `POST /v1/auth/refresh` issues a new access+refresh pair and revokes the presented token; presenting an already-rotated token returns 401.

4. **AI-assisted security audit in the PR description.** Run the class prompt against your endpoints — *"Audit this endpoint against the OWASP API Security Top 10. For each finding: severity, line, fix."* — then **triage the output, don't paste it**.
   *Acceptance:* the PR description shows the prompt used, **at least three AI findings**, each labeled **fixed / false-positive / accepted-risk** with a one-line justification.

## Submission checklist

- PR from branch `session-4-auth`; `tasks/todo.md` committed first.
- The **exit ticket**, one sentence in the PR description: the drill's auth module passed every happy-path test — what exactly made it forgeable anyway, and which single call fixes it? A PR missing this line is incomplete.
- Rules from class the review will check: secrets go through the `envSchema` in `src/config.ts` (`JWT_ACCESS_SECRET`, `WEB_ORIGIN`) mirrored in `.env.example` — never `process.env` directly; pin `HS256` on sign **and** verify, and Zod-parse the JWT payload — never cast; refresh tokens are opaque and hashed at rest — never a JWT, never in localStorage; response DTOs are explicit allowlists — `passwordHash` never crosses the wire; login failures return **one generic message** (no user enumeration); watch for AI-emitted Zod 3 (`z.string().email()`) and Express 4 (`next(err)` wrappers) idioms — both obsolete on this stack.

## Stretch (optional)

- **Reuse detection with family revocation** — presenting an already-rotated refresh token revokes the entire token family via the `replacedById` chain. This is how real systems answer a stolen refresh token.
- **Per-account login throttling with temporary lockout**, keeping responses identical for "wrong email" and "wrong password" — no enumeration, and no timing giveaway either.

---

**Remember:** any function in this PR may be your random walkthrough pick at the start of Session 5. AI writes with you — you own and can explain every line you ship.

