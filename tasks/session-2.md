# Session 2 — Move to Express

Check items off as they land.

## Task 1 — Install Express

- [ ] Add `express` to dependencies and `@types/express` to devDependencies

## Task 2 — Split app from server

- [ ] Create `src/app.ts` that builds the Express app, applies `express.json()`, defines `GET /health`, and exports it
- [ ] Slim `src/server.ts` down to importing the app and calling `app.listen(3000)`

## Task 3 — Routers

- [ ] Create `src/routes/events.ts` with an `express.Router` handling `GET /`, `GET /:id`, and `POST /`
- [ ] Mount the events router at `/events` in `app.ts`

## Task 4 — Middleware

- [ ] Create `src/middleware/notFound.ts` returning `404 { error: "Not Found" }` for unmatched paths
- [ ] Create `src/middleware/errorHandler.ts` logging errors and returning `500 { error: "Internal Server Error" }`
- [ ] Register both middleware last in `app.ts`

## Task 5 — Cleanup

- [ ] Delete `src/http.ts` and replace all `sendJson` calls with `res.status().json()`
- [ ] Remove the manual body-chunk parsing in `POST /` (server.ts:42-46) in favor of `express.json()`

## Task 6 — Verify

- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] `curl` `GET /health`, `GET /events`, `GET /events/:id`, `POST /events`, and a garbage path
