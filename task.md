# CivicFix: Go Backend Migration Task List

Port `backend/` (Node, Express, MongoDB) to `backend-v2/apps/backend` (Go, Echo, PostgreSQL, Clerk, Redis/asynq), then move the frontend over and retire the Node backend.

Work through the phases in order. Each phase builds on the one before it. Tick `[x]` as you go.

**Already done:** Go boilerplate renamed to `go-civicfix`; config, CORS allow-list, Cloudinary config; migrations `001_setup` and `002_users`; Clerk auth middleware with `RequireRole`; `GET /me`, `POST /me/onboarding`, `PATCH /me/location`, `POST /admin/users/:id/promote`; frontend `VITE_AUTH_PROVIDER` flag, Clerk sign-in, and onboarding pages.

> 🔶 = a decision to make before coding that task (stack or behaviour choice).

### How models and DTOs work in the Go backend

In Node, a Mongoose model (`backend/src/models/*.model.js`) did three jobs at once: it defined the schema, validated data, and ran queries. In Go those jobs are split across separate pieces, and each feature needs all of them:

| Piece | Where | Job | Example (users, done) |
|---|---|---|---|
| Migration | `internal/database/migrations/NNN_*.sql` | Table schema, constraints, indexes | `002_users.sql` |
| Model | `internal/model/<thing>.go` | Go structs with `json` and `db` tags, enums with `Valid()` | `model/user.go` (`User`, `Role`, `CitizenProfile`) |
| Request DTOs | `internal/model/<thing>_requests.go` | Input structs (body, `param`, `query` tags) with `validate` tags and a `Validate()` method | `model/user_requests.go` (`OnboardRequest`) |
| Response DTOs | `internal/model/<thing>.go` | The model itself when it can be returned as-is; a separate struct when the response differs (joined data, hidden fields) | `Me`, `PaginatedResponse[T]` |
| Repository | `internal/repository/<thing>.go` | SQL queries that return models | `repository/user.go` |
| Service | `internal/service/<thing>.go` | Business rules | `service/user.go` |
| Handler and route | `internal/handler/<thing>.go`, `router/v1.go` | HTTP | `handler/user.go` |

Node model → Go model mapping:

| Node model | Go model file |
|---|---|
| `citizen.model.js`, `authority.model.js`, `admin.model.js` | `model/user.go` (one `User` + profile structs), done |
| `posts.model.js` (post, media) | `model/post.go`: `Post`, `PostMedia`, `PostStatus`, `Severity` |
| `posts.model.js` (embedded `comments`, `upvotedBy`) | `model/comment.go`: `Comment`; upvotes are a table only, no struct needed |
| `notification.model.js` | `model/notification.go`: `Notification`, `NotificationType` |
| aggregates in `getAnalytics`, `getLeaderboard` | `model/analytics.go`: response-only structs |

---

## Phase 0: Lock in what exists

- [ ] Commit the current `backend-v2` working tree and the frontend Clerk work on the `backend-v2` branch.
- [ ] Run `task check` (Postgres on 5433, Redis, Clerk) and `go test ./...` and confirm both pass.
- [ ] Add a CI workflow for `backend-v2`: `go build`, `go vet`, `golangci-lint`, `go test` (with testcontainers).
- [ ] Write down the Node → Go endpoint map (below) in `backend-v2/apps/backend/README.md` so the frontend switch is mechanical.

## Phase 1: All models and DTOs

Write every struct the later phases need, all in `internal/model/`, before any repository, service or handler. When this phase is done, `go build ./...` passes and later phases only add SQL and logic.

### 1.1 Decisions that change the structs (make these first)

- [ ] 🔶 **Geo storage:** plain `lat/lng` columns or **PostGIS** `geography(Point)`. Either way, reuse the existing `GeoPoint` / `LocationInput` in the structs; this mainly changes the `db` mapping.
- [ ] 🔶 **Upload strategy:** server-side **multipart** like Node (then `CreatePostRequest` holds form fields and files are read in the handler) or **signed direct uploads** to Cloudinary (then `CreatePostRequest` carries a `[]MediaInput` of URLs and public IDs).
- [ ] 🔶 **Resolved posts:** Node **deletes** a post when the reporter confirms resolution and on auto-resolve. Keeping it as `resolved` instead means `Post` keeps `ResolvedAt` and analytics and the leaderboard keep their data.
- [ ] 🔶 **Unverified authorities:** may they act before an admin verifies them? (Changes nothing in the structs, but decide while `AuthorityProfile.IsVerified` is in front of you.)

### 1.2 Shared (`model/base.go`, `model/common.go`)

- [ ] `PaginationQuery` (`page`, `limit` with `query` tags, defaults, max limit 100) to embed in every list request.
- [ ] Check `PaginatedResponse[T]` has what the frontend needs (`data`, `page`, `limit`, `total`, `totalPages`).
- [ ] `IDParam` (`param:"id"`, UUID validation) for routes on posts, comments and notifications.

### 1.3 Users (`model/user.go`, `model/user_requests.go`)

- [ ] `Department` enum (`water`, `electricity`, `road`, `sanitation`, `other`) with `Valid()`; use it in `OnboardRequest` and `AuthorityProfile`.
- [ ] `PublicUser` response DTO (id, name, role) for comment authors and the leaderboard.
- [ ] `UpdateMeRequest`: optional name, address (citizen), phone, department, zone (authority); pointers so missing fields mean "no change".
- [ ] `ListAuthoritiesRequest`: `PaginationQuery` + department, zone, verified filters.
- [ ] `VerifyAuthorityRequest`: `param:"id"` + `isVerified`.
- [ ] `ClerkWebhookEvent`: the fields used from `user.updated` / `user.deleted`.

### 1.4 Posts (`model/post.go`, `model/post_requests.go`)

- [ ] Enums with `Valid()`: `PostStatus` (`new`, `inProgress`, `pendingResolution`, `resolved`), `Severity` (`low`, `medium`, `high`), `MediaKind` (`photo`, `video`).
- [ ] Status alias: parse `in-progress` as `inProgress` (custom `UnmarshalText` on `PostStatus`).
- [ ] `Post`: id, citizenId, title, description, category, location (`GeoPoint`), status, severity, locationPriority, priorityScore, upvotes, statusNote, assignedTo `*string`, resolvedByAuthorityAt `*time.Time`, createdAt, updatedAt, media `[]PostMedia`.
- [ ] `PostMedia`: kind, url, publicId, resourceType, format, bytes, duration `*float64`, position.
- [ ] `PostDetail` response DTO: `Post` + `Reporter PublicUser` + `AssignedAuthority *PublicUser` + `HasUpvoted bool` (for the current user).
- [ ] `PostSummary` response DTO: counts per status.
- [ ] `ListPostsRequest`: `PaginationQuery` + `sortBy` (allow-list: createdAt, priorityScore, upvotes), `sortOrder`, status, category, severity, assignedTo.
- [ ] `NearbyPostsRequest`: lat, lng, radius (metres, capped).
- [ ] `CreatePostRequest`: title (required, max length), description, category, location `LocationInput`, severity, locationPriority (0–10), plus media per the 1.1 decision. Put the "photos (max 10) **or** one video" rule in `Validate()`.
- [ ] `UpdateStatusRequest`: `param:"id"`, status, statusNote (max 500).
- [ ] `AssignPostRequest`: `param:"id"`, authorityId (`startswith=user_`).
- [ ] `PostIDRequest`: `param:"id"`, for upvote, delete, confirm-resolution and reject-resolution.

### 1.5 Comments (`model/comment.go`, `model/comment_requests.go`)

- [ ] `Comment`: id, postId, userId, role, text, createdAt, author `PublicUser`.
- [ ] `ListCommentsRequest`: `param:"id"` + `PaginationQuery`.
- [ ] `AddCommentRequest`: `param:"id"`, text (required, trimmed, max 1000).
- [ ] `DeleteCommentRequest`: `param:"id"`, `param:"commentId"`.

### 1.6 Notifications (`model/notification.go`, `model/notification_requests.go`)

- [ ] `NotificationType` enum: `status-update`, `new-comment`, `resolution-confirmation`, `auto-resolved`, `assigned`.
- [ ] `Notification`: id, recipientId, recipientRole, type, title, message, postId `*string`, isRead, createdAt.
- [ ] `ListNotificationsRequest`: `PaginationQuery` + `unread` filter.
- [ ] `MarkReadRequest`: `param:"id"`.
- [ ] `UnreadCount` response DTO.

### 1.7 Analytics and leaderboard (`model/analytics.go`, response-only)

- [ ] `CountBucket` (key, count), `TimeBucket` (day, count).
- [ ] `Analytics`: byCategory, bySeverity, byStatus `[]CountBucket`, overTime `[]TimeBucket`, avgResolutionHours.
- [ ] `LeaderboardEntry`: user `PublicUser`, issuesReported, totalUpvotes, resolvedCount; `Leaderboard`: citizens, authorities.
- [ ] `AnalyticsRequest`: optional `from` / `to` date range.

### 1.8 Real-time events (`model/event.go`)

- [ ] `Event` envelope (type, payload) and payloads `NotificationEvent`, `IssueStatusEvent` (postId, status, updatedAt).

### 1.9 Check it

- [ ] Unit tests for every `Validate()` with tricky rules: `CreatePostRequest` media rule, status alias, `UpdateMeRequest` per role, pagination bounds. Follow `user_requests_test.go`.
- [ ] `go build ./...` and `go vet ./...` pass.
- [ ] Field names and `json` tags match what the frontend reads (or note each rename for Phase 10, e.g. `_id` → `id`).

## Phase 2: Finish users and auth

Node endpoints replaced: `/api/auth/*` (register, login, logout, profile, change-password, admin/authorities, authority/location).

- [ ] `PATCH /me`: update name, address (citizen), phone, department, zone (authority). Replaces `PATCH /auth/profile`.
- [ ] `GET /admin/authorities`: list authorities with filters (department, zone, verified) and pagination.
- [ ] `PATCH /admin/authorities/:id/verify`: set `is_verified`.
- [ ] `GET /users/:id/public`: minimal public profile (name, role).
- [ ] Clerk webhook `POST /webhooks/clerk` (svix-signed): handle `user.updated` (email/name sync) and `user.deleted` (cascade).
- [ ] Confirm the bootstrap admin flow works end to end with `CIVICFIX_AUTH.BOOTSTRAP_ADMIN_EMAILS`.
- [ ] Not ported, because Clerk handles them: register, login, logout, change-password. Note this in the README.
- [ ] Tests: service tests for profile update and authority listing; handler tests for role guards.

## Phase 3: Posts schema and read APIs

- [ ] Migration `003_posts.sql`, matching `model/post.go`:
  - `posts` (id UUID, citizen_id → users, title, description, category, lat, lng / geom, status, severity, location_priority, priority_score, upvotes, status_note, assigned_to → users, resolved_by_authority_at, timestamps)
  - `CHECK` constraints for status, severity and location_priority (0–10)
  - `post_media` (post_id, kind, url, public_id, resource_type, format, bytes, duration, position)
  - Indexes: status, category, citizen_id, assigned_to, `(priority_score DESC)`, created_at, geo
- [ ] Port `priority.service.js` to Go (`normalizeSeverity`, `clampLocationPriority`, `calculatePriorityScore`) with table-driven tests.
- [ ] Repository and service: list (filtered, paginated, total count), get by id (with media), my posts, summary counts by status.
- [ ] Routes: `GET /posts`, `GET /posts/mine`, `GET /posts/summary`, `GET /posts/:id`.
- [ ] Optional: `GET /posts/nearby?lat=&lng=&radius=` (replaces the 2dsphere use case on the map).
- [ ] Tests: repository tests against the test container; pagination and filter edge cases.

## Phase 4: Creating posts and media uploads

- [ ] Cloudinary client in `internal/lib/storage` (upload, delete by public_id), optional at boot as configured.
- [ ] `POST /posts` (citizen only): size and MIME limits on media (the field rules already live in `CreatePostRequest`).
- [ ] Compute `priority_score` on create; insert the post and its media in one transaction.
- [ ] `DELETE /posts/:id` (owner or admin): delete Cloudinary assets too (best effort, or via an asynq job).
- [ ] Tests: validation matrix (no media, both, two videos), role guard.

## Phase 5: Post workflow (status, assignment, upvotes, comments)

- [ ] Port `isAllowedStatusTransition`: `new → inProgress → pendingResolution/resolved`, `pendingResolution → resolved/inProgress`; admin may do any transition.
- [ ] `PATCH /posts/:id/status` (authority/admin). An authority marking `resolved` from `inProgress` becomes `pendingResolution` and sets `resolved_by_authority_at`.
- [ ] `PATCH /posts/:id/assign` (admin): assign to an authority id, validating that the user is an authority.
- [ ] `POST /posts/:id/confirm-resolution` and `POST /posts/:id/reject-resolution` (reporter only, status must be `pendingResolution`); apply the Phase 1.1 delete-or-resolve decision.
- [ ] Migration `004_upvotes_comments.sql`: `post_upvotes (post_id, user_id, PK both)`, `comments (id, post_id, user_id, role, text, created_at)`.
- [ ] `POST /posts/:id/upvote` and `DELETE /posts/:id/upvote` (citizen): use the PK for idempotency; update `upvotes` and `priority_score` in the same transaction.
- [ ] `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /posts/:id/comments/:commentId` (author or admin).
- [ ] Tests: every allowed and blocked transition per role; concurrent double upvote.

## Phase 6: Notifications

- [ ] Migration `005_notifications.sql`: `notifications (id, recipient_id, recipient_role, type, title, message, post_id NULL, is_read, created_at)`, index `(recipient_id, created_at DESC)`.
- [ ] Notification service with a single `Notify(ctx, tx, …)` entry point, called inside the same transaction as the triggering change.
- [ ] Wire triggers: status change → reporter; pendingResolution → reporter (confirmation request); new comment → reporter (skip self); assignment → authority.
- [ ] `GET /notifications` (paginated, `unread` filter), `PATCH /notifications/:id/read` (owner only), `PATCH /notifications/read-all`, `GET /notifications/unread-count`.
- [ ] Optional: email for important notifications through the existing asynq email task.

## Phase 7: Real-time updates

- [ ] 🔶 Replace socket.io: plain **WebSocket** (e.g. `coder/websocket`) or **Server-Sent Events** (simpler; the traffic is all server → client). Either way the frontend `socket.io-client` code changes.
- [ ] Authenticate the connection with the Clerk session token (query param or first message); the user joins their own channel. No client-supplied user id, unlike Node's `join-user-room`.
- [ ] Redis pub/sub fan-out so events reach clients on any API instance.
- [ ] Events: `notification:new` (to user), `issue:status-updated` (broadcast). Remove the client-triggered `issue:status-change` broadcast from Node, since any client could spoof it.
- [ ] Publish events **after** the DB transaction commits.

## Phase 8: Background jobs

- [ ] Auto-resolve as an asynq **periodic task** (scheduler, every 30 min): handle posts in `pendingResolution` with `resolved_by_authority_at <= now() - AUTO_RESOLVE_DAYS`; apply the Phase 1.1 delete-or-resolve decision; notify the reporter.
- [ ] Make `AUTO_RESOLVE_DAYS` and the interval config values (`CIVICFIX_JOBS.*`).
- [ ] Ensure only one scheduler runs across instances (asynq scheduler + unique task).
- [ ] Media cleanup job for deleted posts (if Phase 4 deferred it).
- [ ] Tests: run the handler directly against the test DB with backdated rows.

## Phase 9: Analytics and leaderboard

- [ ] `GET /analytics`: counts by category, by severity, by status, posts over time (daily buckets with `date_trunc`), average resolution time.
- [ ] `GET /leaderboard`: top citizens (issues reported, total upvotes) and top authorities (resolved count), joined to `users` for names.
- [ ] Cache both in Redis with a short TTL (30–60 s) and invalidate on post changes, or accept the staleness.
- [ ] Check query plans (`EXPLAIN ANALYZE`) on seeded data; add indexes where needed.

## Phase 10: Frontend cutover

- [ ] Point `frontend/src/api/posts.js`, `notifications.js`, `users.js` at the Go routes; adapt to the Go response and error shapes (`_id` → `id`, pagination envelope).
- [ ] Attach the Clerk session token in `api/client.js` for all calls when `AUTH_PROVIDER=clerk`.
- [ ] Page-by-page check: Citizen, Authority, and Admin dashboards; Report Issue; Post Detail; My Posts; Map View; Notifications; Leaderboard; Analytics; Profile.
- [ ] Replace the socket.io client with the Phase 7 transport.
- [ ] Profile page: remove change-password (link to Clerk's `<UserProfile/>` instead).
- [ ] Switch the default to `VITE_AUTH_PROVIDER=clerk`, then delete `LoginPage`, the legacy `AuthContext`, and `api/auth.js`.

## Phase 11: Data migration, hardening, and launch

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
| `auth/profile` GET / PATCH                | `GET /me`, `PATCH /me`                | 2     |
| `auth/change-password`                    | Clerk                                 | 2     |
| `auth/admin/authorities`                  | `GET /admin/authorities`              | 2     |
| `posts` GET, `my-posts`, `summary`, `:id` | `GET /posts`, `/posts/mine`, `/posts/summary`, `/posts/:id` | 3 |
| `posts/create`, `DELETE posts/:id`        | `POST /posts`, `DELETE /posts/:id`    | 4     |
| `PATCH/PUT posts/:id` (status)            | `PATCH /posts/:id/status`             | 5     |
| `posts/:id/assign`                        | `PATCH /posts/:id/assign`             | 5     |
| `posts/:id/upvote` POST / DELETE          | same                                  | 5     |
| `posts/:id/comments` (+ `:commentId`)     | same                                  | 5     |
| `posts/:id/confirm-` / `reject-resolution`| same                                  | 5     |
| `notifications/my`, `:id/read`            | `GET /notifications`, `PATCH /notifications/:id/read` | 6 |
| socket.io                                 | WebSocket / SSE                       | 7     |
| `autoResolve` setInterval                 | asynq periodic task                   | 8     |
| `posts/analytics`, `posts/leaderboard`    | `GET /analytics`, `GET /leaderboard`  | 9     |
