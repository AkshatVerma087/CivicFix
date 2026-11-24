# Go civicfix Backend

A production-ready Go backend service built with Echo framework, featuring clean architecture, comprehensive middleware, and modern DevOps practices.

## Architecture Overview

This backend follows clean architecture principles with clear separation of concerns:

```
backend/
├── cmd/go-civicfix/        # Application entry point
├── internal/                  # Private application code
│   ├── config/               # Configuration management
│   ├── database/             # Database connections and migrations
│   ├── handler/              # HTTP request handlers
│   ├── service/              # Business logic layer
│   ├── repository/           # Data access layer
│   ├── model/                # Domain models
│   ├── middleware/           # HTTP middleware
│   ├── lib/                  # Shared libraries
│   └── validation/           # Request validation
├── static/                   # Static files (OpenAPI spec)
├── templates/                # Email templates
└── Taskfile.yml              # Task automation
```

## Features

### Core Framework
- **Echo v4**: High-performance, minimalist web framework
- **Clean Architecture**: Handlers → Services → Repositories → Models
- **Dependency Injection**: Constructor-based DI for testability

### Database
- **PostgreSQL**: Primary database with pgx/v5 driver
- **Migration System**: Tern for schema versioning
- **Connection Pooling**: Optimized for production workloads
- **Transaction Support**: ACID compliance for critical operations

### Authentication & Security
- **Clerk Integration**: Modern authentication service
- **JWT Validation**: Secure token verification
- **Role-Based Access**: Configurable permission system
- **Rate Limiting**: 20 requests/second per IP
- **Security Headers**: XSS, CSRF, and clickjacking protection

### Observability
- **New Relic APM**: Application performance monitoring
- **Structured Logging**: JSON logs with Zerolog
- **Request Tracing**: Distributed tracing support
- **Health Checks**: Readiness and liveness endpoints
- **Custom Metrics**: Business-specific monitoring

### Background Jobs
- **Asynq**: Redis-based distributed task queue
- **Priority Queues**: Critical, default, and low priority
- **Job Scheduling**: Cron-like task scheduling
- **Retry Logic**: Exponential backoff for failed jobs
- **Job Monitoring**: Real-time job status tracking

### Email Service
- **Resend Integration**: Reliable email delivery
- **HTML Templates**: Beautiful transactional emails
- **Preview Mode**: Test emails in development
- **Batch Sending**: Efficient bulk operations

### API Documentation
- **OpenAPI 3.0**: Complete API specification
- **Swagger UI**: Interactive API explorer
- **Auto-generation**: Code-first approach

## Getting Started

### Prerequisites
- Go 1.24+
- PostgreSQL 16+
- Redis 8+
- Task (taskfile.dev)

### Installation

1. Install dependencies:
```bash
go mod download
```

2. Set up environment:
```bash
cp .env.example .env
# Configure your environment variables
```

3. Run migrations:
```bash
task migrations:up
```

4. Start the server:
```bash
task run
```

## Configuration

Configuration is managed through environment variables with the `CIVICFIX_` prefix:

## Migrating from the Node backend

This service replaces `backend/` (Express + MongoDB). Use this map to switch the frontend's API calls one at a time.

**Base URL:** Node served `/api/...`; Go serves `/api/v1/...`.

**Auth:** Node issued its own JWT from `/api/auth/*/login`. Go accepts a **Clerk session token** (`Authorization: Bearer <token>`); the user's role comes from the token's `role` claim. Sign-up, sign-in, sign-out and password changes happen in Clerk, so those Node endpoints have no Go equivalent.

**Response shape changes:**
- Ids: Mongo `_id` (ObjectId) → `id` (UUID for posts, comments and notifications; Clerk id `user_...` for users).
- Lists: `{ posts, total, page, ... }` → `PaginatedResponse`: `{ data, page, limit, total, totalPages }`.
- Status `in-progress` is still accepted as input but is always returned as `inProgress`.

| Node (`/api/...`) | Method | Go (`/api/v1/...`) | Status |
|---|---|---|---|
| `auth/citizen/register`, `auth/authority/register`, `auth/admin/register` | POST | Clerk sign-up, then `POST /me/onboarding` | ✅ done |
| `auth/*/login`, `auth/*/logout` | POST | Clerk (no API call) | ✅ done |
| `auth/authority/location` | PATCH | `PATCH /me/location` | ✅ done |
| (first admin / promote) | — | `POST /admin/users/:id/promote` | ✅ done |
| `auth/profile` | GET | `GET /me` | ✅ done |
| `auth/profile` | PATCH | `PATCH /me` | ⏳ |
| `auth/change-password` | POST | Clerk `<UserProfile/>` | ⏳ |
| `auth/admin/authorities` | GET | `GET /admin/authorities` | ⏳ |
| — | PATCH | `PATCH /admin/authorities/:id/verify` | ⏳ new |
| `posts` | GET | `GET /posts` | ⏳ |
| `posts/my-posts` | GET | `GET /posts/mine` | ⏳ |
| `posts/summary` | GET | `GET /posts/summary` | ⏳ |
| `posts/:id` | GET | `GET /posts/:id` | ⏳ |
| — | GET | `GET /posts/nearby?lat=&lng=&radius=` | ⏳ new |
| `posts/create` | POST | `POST /posts` | ⏳ |
| `posts/:id` | PATCH, PUT | `PATCH /posts/:id/status` | ⏳ |
| `posts/:id` | DELETE | `DELETE /posts/:id` | ⏳ |
| `posts/:id/assign` | PATCH | `PATCH /posts/:id/assign` | ⏳ |
| `posts/:id/upvote` | POST, DELETE | `POST`, `DELETE /posts/:id/upvote` | ⏳ |
| `posts/:id/confirm-resolution` | POST | `POST /posts/:id/confirm-resolution` | ⏳ |
| `posts/:id/reject-resolution` | POST | `POST /posts/:id/reject-resolution` | ⏳ |
| `posts/:id/comments` | GET, POST | `GET`, `POST /posts/:id/comments` | ⏳ |
| `posts/:id/comments/:commentId` | DELETE | `DELETE /posts/:id/comments/:commentId` | ⏳ |
| `notifications/my` | GET | `GET /notifications` | ⏳ |
| `notifications/:id/read` | PATCH | `PATCH /notifications/:id/read` | ⏳ |
| — | PATCH, GET | `PATCH /notifications/read-all`, `GET /notifications/unread-count` | ⏳ new |
| `posts/analytics` | GET | `GET /analytics` | ⏳ |
| `posts/leaderboard` | GET | `GET /leaderboard` | ⏳ |
| `health` | GET | `GET /status` (at the root, not under `/api/v1`) | ✅ done |
| socket.io `notification:new`, `issue:status-updated` | WS | WebSocket or SSE (to be decided) | ⏳ |

Update the Status column as each route lands.

## Development

### Available Tasks

```bash
task help                    # Show all available tasks
task run                     # Run the application
task test                    # Run tests
task migrations:new name=X   # Create new migration
task migrations:up           # Apply migrations
task migrations:down         # Rollback last migration
task tidy                    # Format and tidy dependencies
```

### Project Structure

#### Handlers (`internal/handler/`)
HTTP request handlers that:
- Parse and validate requests
- Call appropriate services
- Format responses
- Handle HTTP-specific concerns

#### Services (`internal/service/`)
Business logic layer that:
- Implements use cases
- Orchestrates operations
- Enforces business rules
- Handles transactions

#### Repositories (`internal/repository/`)
Data access layer that:
- Encapsulates database queries
- Provides data mapping
- Handles database-specific logic
- Supports multiple data sources

#### Models (`internal/model/`)
Domain entities that:
- Define core business objects
- Include validation rules
- Remain database-agnostic

#### Middleware (`internal/middleware/`)
Cross-cutting concerns:
- Authentication/Authorization
- Request logging
- Error handling
- Rate limiting
- CORS
- Security headers

### Testing

#### Unit Tests
```bash
go test ./...
```

## Logging

Structured logging with Zerolog:

```go
log.Info().
    Str("user_id", userID).
    Str("action", "login").
    Msg("User logged in successfully")
```

Log levels:
- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors that cause shutdown

### Production Checklist

- [ ] Set production environment variables
- [ ] Enable SSL/TLS
- [ ] Configure production database
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Enable rate limiting
- [ ] Set up backup strategy
- [ ] Configure auto-scaling
- [ ] Implement graceful shutdown
- [ ] Set up CI/CD pipeline

## Performance Optimization

### Database
- Connection pooling configured
- Prepared statements for frequent queries
- Indexes on commonly queried fields
- Query optimization with EXPLAIN ANALYZE

### Caching
- Redis for session storage
- In-memory caching for hot data
- HTTP caching headers

### Concurrency
- Goroutine pools for parallel processing
- Context-based cancellation
- Proper mutex usage

## Security Best Practices

1. **Input Validation**: All inputs validated and sanitized
2. **SQL Injection**: Parameterized queries only
3. **XSS Protection**: Output encoding and CSP headers
4. **CSRF Protection**: Token-based protection
5. **Rate Limiting**: Per-IP and per-user limits
6. **Secrets Management**: Environment variables, never in code
7. **HTTPS Only**: Enforce TLS in production
8. **Dependency Scanning**: Regular vulnerability checks

## Contributing

1. Follow Go best practices and idioms
2. Write tests for new features
3. Update documentation
4. Run linters before committing
5. Keep commits atomic and well-described

## License

See the parent project's LICENSE file.