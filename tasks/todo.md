# Session 2 — Bookings, Pagination & the Consistency Pass

- [x] task1: In-memory `/v1/bookings` resource (routes, controller, service) with POST (service-level duplicate & capacity 409 checks), GET /:id, and soft DELETE /:id returning the cancelled record.
- [x] task2: Pagination on `GET /v1/events` (`?page=&limit=`) with Zod query validation via `validateQuery` (`res.locals.query`) returning the `{ data, page, limit, total }` envelope.
- [x] task3: Filtering on `GET /v1/events` (`?venue=&from=&to=`) validated and applied before pagination.
- [x] task4: API-wide consistency pass across `/health`, `/v1/venues`, `/v1/events`, and `/v1/bookings` with shared `validate`/`validateQuery` middleware, `HttpError` exceptions, and centralized error handling.