# CivicFix: Go Backend Migration Task List

Port `backend/` (Node, Express, MongoDB) to `backend-v2/apps/backend` (Go, Echo, PostgreSQL, Clerk, Redis/asynq), then move the frontend over and retire the Node backend.

Work through the phases in order. Each phase builds on the one before it. Tick `[x]` as you go.

**Already done:** Go boilerplate renamed to `go-civicfix`; config, CORS allow-list, Cloudinary config; migrations `001_setup` and `002_users`; Clerk auth middleware with `RequireRole`; `GET /me`, `POST /me/onboarding`, `PATCH /me/location`, `POST /admin/users/:id/promote`; frontend `VITE_AUTH_PROVIDER` flag, Clerk sign-in, and onboarding pages.

> 🔶 = a decision to make before coding that task (stack or behaviour choice).

---

## Phase 0: Lock in what exists

- [ ] Commit the current `backend-v2` working tree (the boilerplate replacement and users work are still uncommitted).
- [ ] Commit the frontend Clerk work on the `backend-v2` branch of the main repo.
- [ ] Run `task check` (Postgres on 5433, Redis, Clerk) and `go test ./...` and confirm both pass.
- [ ] Add a CI workflow for `backend-v2`: `go build`, `go vet`, `golangci-lint`, `go test` (with testcontainers).
- [ ] Write down the Node → Go endpoint map (below) in `backend-v2/apps/backend/README.md` so the frontend switch is mechanical.

## Phase 1: Finish users and auth

Node endpoints replaced: `/api/auth/*` (register, login, logout, profile, change-password, admin/authorities, authority/location).

- [ ] `PATCH /me`: update name, address (citizen), phone, department, zone (authority). Replaces `PATCH /auth/profile`.
- [ ] `GET /admin/authorities`: list authorities with filters (department, zone, verified) and pagination.
- [ ] `PATCH /admin/authorities/:id/verify`: set `is_verified` (Node had the field; decide whether unverified authorities may act).
- [ ] `GET /users/:id/public`: minimal public profile (name, role) for comments and leaderboard display.
- [ ] Clerk webhook `POST /webhooks/clerk` (svix-signed): handle `user.updated` (email/name sync) and `user.deleted` (cascade).
- [ ] Confirm the bootstrap admin flow works end to end with `CIVICFIX_AUTH.BOOTSTRAP_ADMIN_EMAILS`.
- [ ] Not ported, because Clerk handles them: register, login, logout, change-password. Note this in the README.
- [ ] Tests: service tests for profile update and authority listing; handler tests for role guards.

## Phase 2: Posts schema and read APIs

- [ ] 🔶 Geo storage: plain `lat/lng` columns with a bounding-box index, or the **PostGIS** extension (`geography(Point)` + GiST index, the closest match to Mongo's `2dsphere`). Pick one before writing the migration.
- [ ] Migration `003_posts.sql`:
  - `posts` (id UUID, citizen_id → users, title, description, category, lat, lng / geom, status, severity, location_priority, priority_score, upvotes, status_note, assigned_to → users, resolved_by_authority_at, timestamps)
  - `CHECK` constraints for status (`new`, `inProgress`, `pendingResolution`, `resolved`), severity (`low`, `medium`, `high`), and location_priority (0–10)
  - `post_media` (post_id, kind photo|video, url, public_id, resource_type, format, bytes, duration, position)
  - Indexes: status, category, citizen_id, assigned_to, `(priority_score DESC)`, created_at, geo
- [ ] Port `priority.service.js` to Go (`normalizeSeverity`, `clampLocationPriority`, `calculatePriorityScore`) with table-driven tests.
- [ ] Models and request types: `Post`, `PostMedia`, `ListPostsRequest` (page, limit, sortBy allow-list, sortOrder, status, category, severity, assignedTo). Accept the `in-progress` alias as `inProgress`.
- [ ] Repository and service: list (filtered, paginated, total count), get by id (with media), my posts, summary counts by status.
- [ ] Routes: `GET /posts`, `GET /posts/mine`, `GET /posts/summary`, `GET /posts/:id`.
- [ ] Optional: `GET /posts/nearby?lat=&lng=&radius=` (replaces the 2dsphere use case on the map).
- [ ] Tests: repository tests against the test container; pagination and filter edge cases.

## Phase 3: Creating posts and media uploads

- [ ] 🔶 Upload strategy: keep **server-side multipart** like Node (simple, but the API carries the bytes) or use **signed direct uploads** to Cloudinary (the client uploads, the API only records URLs; scales better). Decide first.
- [ ] Cloudinary client in `internal/lib/storage` (upload, delete by public_id), optional at boot as configured.
- [ ] `POST /posts` (citizen only): validate title, description, category, location, severity, location_priority; enforce photos (max 10) **or** one video, not both; size and MIME limits.
- [ ] Compute `priority_score` on create; insert the post and its media in one transaction.
- [ ] `DELETE /posts/:id` (owner or admin): delete Cloudinary assets too (best effort, or via an asynq job).
- [ ] Tests: validation matrix (no media, both, two videos), role guard.

## Phase 4: Post workflow (status, assignment, upvotes, comments)

- [ ] Port `isAllowedStatusTransition`: `new → inProgress → pendingResolution/resolved`, `pendingResolution → resolved/inProgress`; admin may do any transition.
- [ ] `PATCH /posts/:id/status` (authority/admin): body `{status, statusNote}` (note max 500 chars). An authority marking `resolved` from `inProgress` becomes `pendingResolution` and sets `resolved_by_authority_at`.
- [ ] `PATCH /posts/:id/assign` (admin): assign to an authority id, validating that the user is an authority.
- [ ] `POST /posts/:id/confirm-resolution` and `POST /posts/:id/reject-resolution` (reporter only, status must be `pendingResolution`).
- [ ] 🔶 Node **deletes** the post when the reporter confirms resolution (and on auto-resolve). Decide whether to keep that or mark it `resolved` and keep it (analytics and leaderboard lose data when posts are deleted).
- [ ] Migration `004_upvotes_comments.sql`: `post_upvotes (post_id, user_id, PK both)`, `comments (id, post_id, user_id, role, text, created_at)`.
- [ ] `POST /posts/:id/upvote` and `DELETE /posts/:id/upvote` (citizen): use the PK for idempotency; update `upvotes` and `priority_score` in the same transaction.
- [ ] `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /posts/:id/comments/:commentId` (author or admin).
- [ ] Tests: every allowed and blocked transition per role; concurrent double upvote.

## Phase 5: Notifications

- [ ] Migration `005_notifications.sql`: `notifications (id, recipient_id, recipient_role, type, title, message, post_id NULL, is_read, created_at)`, index `(recipient_id, created_at DESC)`. Types: `status-update`, `new-comment`, `resolution-confirmation`, `auto-resolved`, plus `assigned`.
- [ ] Notification service with a single `Notify(ctx, tx, …)` entry point, called inside the same transaction as the triggering change.
- [ ] Wire triggers: status change → reporter; pendingResolution → reporter (confirmation request); new comment → reporter (skip self); assignment → authority.
- [ ] `GET /notifications` (paginated, `unread` filter), `PATCH /notifications/:id/read` (owner only), `PATCH /notifications/read-all`, `GET /notifications/unread-count`.
- [ ] Optional: email for important notifications through the existing asynq email task.

## Phase 6: Real-time updates

- [ ] 🔶 Replace socket.io: plain **WebSocket** (e.g. `coder/websocket`) or **Server-Sent Events** (simpler; the traffic is all server → client). Either way the frontend `socket.io-client` code changes.
- [ ] Authenticate the connection with the Clerk session token (query param or first message); the user joins their own channel. No client-supplied user id, unlike Node's `join-user-room`.
- [ ] Redis pub/sub fan-out so events reach clients on any API instance.
- [ ] Events: `notification:new` (to user), `issue:status-updated` (broadcast). Remove the client-triggered `issue:status-change` broadcast from Node, since any client could spoof it.
- [ ] Publish events **after** the DB transaction commits.

## Phase 7: Background jobs

- [ ] Auto-resolve as an asynq **periodic task** (scheduler, every 30 min): handle posts in `pendingResolution` with `resolved_by_authority_at <= now() - AUTO_RESOLVE_DAYS`; apply the Phase 4 decision (delete or resolve); notify the reporter.
- [ ] Make `AUTO_RESOLVE_DAYS` and the interval config values (`CIVICFIX_JOBS.*`).
- [ ] Ensure only one scheduler runs across instances (asynq scheduler + unique task).
- [ ] Media cleanup job for deleted posts (if Phase 3 deferred it).
- [ ] Tests: run the handler directly against the test DB with backdated rows.

## Phase 8: Analytics and leaderboard

- [ ] `GET /analytics`: counts by category, by severity, by status, posts over time (daily buckets with `date_trunc`), average resolution time.
- [ ] `GET /leaderboard`: top citizens (issues reported, total upvotes) and top authorities (resolved count), joined to `users` for names.
- [ ] Cache both in Redis with a short TTL (30–60 s) and invalidate on post changes, or accept the staleness.
- [ ] Check query plans (`EXPLAIN ANALYZE`) on seeded data; add indexes where needed.

## Phase 9: Frontend cutover

- [ ] Point `frontend/src/api/posts.js`, `notifications.js`, `users.js` at the Go routes; adapt to the Go response and error shapes (`_id` → `id`, pagination envelope).
- [ ] Attach the Clerk session token in `api/client.js` for all calls when `AUTH_PROVIDER=clerk`.
- [ ] Page-by-page check: Citizen, Authority, and Admin dashboards; Report Issue; Post Detail; My Posts; Map View; Notifications; Leaderboard; Analytics; Profile.
- [ ] Replace the socket.io client with the Phase 6 transport.
- [ ] Profile page: remove change-password (link to Clerk's `<UserProfile/>` instead).
- [ ] Switch the default to `VITE_AUTH_PROVIDER=clerk`, then delete `LoginPage`, the legacy `AuthContext`, and `api/auth.js`.

## Phase 10: Data migration, hardening, and launch

- [ ] 🔶 Existing MongoDB data: migrate it (a one-off Go or Node script mapping Mongo ObjectIds → UUIDs, and users → Clerk via their import API) or start fresh.
- [ ] Regenerate `static/openapi.json` for all new routes; check it in the OpenAPI UI.
- [ ] Rate limits per route group (stricter on create, upvote, comment).
- [ ] Port `backend/benchmarks` (Artillery load tests, geo query, broadcast latency) to target the Go API; compare with the Node numbers.
- [ ] Observability: New Relic transaction names per route, slow-query logging, job metrics.
- [ ] Deployment: Dockerfile for the Go API and worker, managed Postgres and Redis, run migrations on deploy, env vars, CORS origins for the production frontend.
- [ ] Run Node and Go side by side on staging; smoke-test every flow.
- [ ] Cut over production; after a stable period, archive `backend/`.

---

## Node → Go endpoint map

| Node (`/api/...`)                         | Go (`/api/v1/...`)                    | Phase |
|-------------------------------------------|---------------------------------------|-------|
| `auth/*/register`, `login`, `logout`      | Clerk + `POST /me/onboarding`         | done  |
| `auth/authority/location`                 | `PATCH /me/location`                  | done  |
| `auth/profile` GET / PATCH                | `GET /me`, `PATCH /me`                | 1     |
| `auth/change-password`                    | Clerk                                 | 1     |
| `auth/admin/authorities`                  | `GET /admin/authorities`              | 1     |
| `posts` GET, `my-posts`, `summary`, `:id` | `GET /posts`, `/posts/mine`, `/posts/summary`, `/posts/:id` | 2 |
| `posts/create`, `DELETE posts/:id`        | `POST /posts`, `DELETE /posts/:id`    | 3     |
| `PATCH/PUT posts/:id` (status)            | `PATCH /posts/:id/status`             | 4     |
| `posts/:id/assign`                        | `PATCH /posts/:id/assign`             | 4     |
| `posts/:id/upvote` POST / DELETE          | same                                  | 4     |
| `posts/:id/comments` (+ `:commentId`)     | same                                  | 4     |
| `posts/:id/confirm-` / `reject-resolution`| same                                  | 4     |
| `notifications/my`, `:id/read`            | `GET /notifications`, `PATCH /notifications/:id/read` | 5 |
| socket.io                                 | WebSocket / SSE                       | 6     |
| `autoResolve` setInterval                 | asynq periodic task                   | 7     |
| `posts/analytics`, `posts/leaderboard`    | `GET /analytics`, `GET /leaderboard`  | 8     |
