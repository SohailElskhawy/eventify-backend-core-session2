# Session 2 Homework — Bookings, Pagination & the Consistency Pass

One PR from branch **`session-2`** to your `eventify` repo. Estimated effort: **4–6 hours**. Everything below is exactly the API Session 3 assumes exists when we put PostgreSQL underneath it — in-memory tonight, so restarting your server losing the data is fine.

There is **no starter tonight**: you build in the repo you grew in class. Your reference for the error patterns is the fixed drill file (`buggy.ts` on the `drill/session-2` branch) — every status-code rule below was one of its five bugs.

## Before any code: plan first

The Superpowers loop from Foundations, same as last week:

1. **Brainstorm** the tasks with your agent.
2. Commit a short **`tasks/todo.md`** plan with checkable items — as the PR's **first commit**.
3. **Implement against it**, checking items off as you go.

The plan is part of the deliverable.

## The contract

### Data model — already in your repo, don't reinvent it

`Booking` and `BookingStatus` have been sitting in **`src/domain.ts`** since Session 1:

```ts
type BookingStatus = "CONFIRMED" | "CANCELLED" | "WAITLISTED";

interface Booking {
  id: string;        // crypto.randomUUID(), like createEvent from class
  userId: string;
  eventId: string;
  status: BookingStatus;
  createdAt: string;
}
```

There is **no auth yet** (Session 4). The "current user" is a hard-coded constant: the controller passes it into the service as a parameter — exactly the way class hard-coded `organizerId` in `createEvent`. The client never sends `userId`; with `z.strictObject`, a body that tries gets a 400.

The `Event.capacity` field you already have drives the capacity rule below.

### Endpoints

| Request | Success | Failure |
|---|---|---|
| `POST /v1/bookings` — body `{ "eventId": "…" }` | `201` — the Booking, status `CONFIRMED` | `400` invalid body · `404` unknown `eventId` · `409` this user already has a booking for this event · `409` event at capacity |
| `GET /v1/bookings/:id` | `200` — the Booking | `404` unknown booking id |
| `DELETE /v1/bookings/:id` | `200` — the Booking, status now `CANCELLED` (**the record is kept**) | `404` unknown booking id |
| `GET /v1/events?page=&limit=&venue=&from=&to=` | `200` — envelope below | `400` invalid query params |

Cancellation is a **state change, not an erasure** — never hard-delete the row. And per the drill: a `204` must never carry a body, and deleting a missing id must `404`, not silently "succeed".

The two 409s are distinct rules, and **both live in the service**:

- **Duplicate:** the `userId`+`eventId` pair already has a booking — any status, including `CANCELLED` (rebook-after-cancel semantics arrive in Session 3).
- **Capacity:** the event's **`CONFIRMED`** bookings have reached `Event.capacity`. Cancelled bookings must not eat capacity.

Every error leaves through your one error middleware, in its one shape: `{ "error": "<message>", "details": … }`. No stack traces to the client, ever.

### The events list — query contract

| Param | Rule | Default |
|---|---|---|
| `page` | integer ≥ 1 | `1` |
| `limit` | integer 1–100 | `20` |
| `venue` | exact string match | — |
| `from` / `to` | dates; inclusive range on `startsAt` | — |

Response envelope: `{ "data": Event[], "page": number, "limit": number, "total": number }`.

Anything non-numeric or out of range → `400`, via a **Zod query schema + the `validateQuery` middleware** from class. `req.query` is read-only in Express 5, so `validateQuery` puts the parsed result in **`res.locals.query`** — controllers read from there, never from `req.query`.

## The tasks

1. **In-memory `/v1/bookings`.** Routes → controller → service, same layering as `/events` from class. POST creates with status `CONFIRMED` and the hard-coded current user; GET by id; DELETE flips status to `CANCELLED` and keeps the record. Duplicate and capacity checks are business logic — they belong in the service (put them in the controller and Session 3's Postgres swap rewrites HTTP code).
   *Acceptance:* every row of the endpoint table `curl`s correctly, including both 409s and all three 404/400 failure cases; bodies validated with `z.strictObject`; no capacity or duplicate logic in the controller.

2. **Pagination on `GET /v1/events`.** `?page=` and `?limit=` per the query contract, with the `{ data, page, limit, total }` envelope.
   *Acceptance:* non-numeric and out-of-range values are rejected `400` by the Zod query schema through `validateQuery`; the controller reads parsed values from `res.locals.query`; a page past the end returns `200` with `data: []` — an empty list is a successful query, **not** a 404.

3. **Filtering on `GET /v1/events`.** `?venue=` exact match plus `?from=` / `?to=` date range on `startsAt`, combinable with each other and with pagination.
   *Acceptance:* filter params validated in the same query schema; **filtering happens before pagination** — `total` is the filtered count, otherwise the page math lies.

4. **Consistency pass.** Sweep your whole API — `/health`, `/v1/events`, `/v1/bookings`: every body through the shared `validate` middleware, every query through `validateQuery`, every failure a thrown `HttpError`, one error middleware registered last.
   *Acceptance:* grep your `src/` for `res.status(500)` — the only hit is the fallback inside the error middleware; status codes match the drill reveal (201 create, 200 update, no 204-with-body, and no input a client can send produces a 500).

## Stretch (optional)

- At capacity, create the booking with status **`WAITLISTED`** instead of returning 409 — this is the seed of Session 5's waitlist-promotion job.
- Add `?sort=startsAt:asc|desc` to the events list (validated like every other query param).

## The PR

One PR from branch `session-2`. The description must include:

- what you built and how to run it;
- **where you used AI, and at least one concrete thing it got wrong** that you caught and fixed — the class review checklist (missing 404s, wrong status codes, Zod 3 idioms, `req.query` mutation, logic in controllers, unknown-key acceptance) is your hunting list;
- the exit-ticket line, one sentence: *when Session 3 swaps the in-memory Map for Postgres, why do the controllers not change?*

---

**Remember:** any function in this PR may be your random walkthrough pick at the start of Session 3. AI writes with you — you own and can explain every line you ship.
