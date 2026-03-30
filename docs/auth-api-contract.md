# Auth API Contract

This note keeps the frontend and backend aligned for the email-verification login flow.

## Environment And Database Readiness

- `DATABASE_URL` is required for Prisma to initialize.
- This repo currently has `prisma/schema.prisma` but no `prisma/migrations/` directory. For a fresh local database, the current schema-apply step is `npx prisma db push`.
- If the project later adopts migrations, switch the setup step to the migration workflow instead of `db push`.
- `DEV_AUTH_DEBUG_CODE=true` only exposes the generated code in development.

## Endpoints

### `POST /api/auth/send-code`

Request body:

```json
{ "email": "user@example.com" }
```

Responses:

- `200` with `{ ok: true, email, expiresAt, debugCode? }`
- `400` with `{ error }` for invalid JSON or invalid email
- `429` with `{ error, retryAfterSeconds }` when the cooldown is active
- `503` with `{ error }` when the auth database is temporarily unavailable

### `POST /api/auth/verify-code`

Request body:

```json
{ "email": "user@example.com", "code": "123456" }
```

Responses:

- `200` with `{ ok: true, isNewUser, user }` and a session cookie
- `400` with `{ error }` for invalid JSON, invalid email, invalid code format, expired code, used code, or wrong code
- `429` with `{ error, retryAfterSeconds }` after too many failed verification attempts for the same email and request IP fingerprint
- `503` with `{ error }` when the auth database is temporarily unavailable

### `GET /api/me`

Responses:

- `200` with `{ user }`
- `user` is `null` when there is no valid session
- `503` with `{ error }` when the auth database is temporarily unavailable while resolving the session

### `POST /api/auth/logout`

Responses:

- `200` with `{ ok: true }`
- The session cookie is cleared

## Frontend Notes

- Treat `user: null` from `/api/me` as the logged-out state.
- Treat `429` from `/api/auth/send-code` as the cooldown state and use `retryAfterSeconds` if present.
- The verification code length currently matches the backend config and defaults to 6 digits.

## Verification Attempt Throttle

- `verify-code` uses an in-memory failure counter keyed by `email + request IP` when an IP is available, and by `email` as a fallback.
- After 5 failed attempts inside a 15 minute window, the route returns `429` and blocks that fingerprint for 15 minutes.
- This protection is single-instance only. It resets on process restart and does not coordinate across multiple server instances or deployments.
- If we later need horizontal-scale protection, the next step should be a shared store such as Redis or a database-backed attempt table.
