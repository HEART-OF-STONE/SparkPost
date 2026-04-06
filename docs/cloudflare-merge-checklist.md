# Cloudflare Merge Checklist

## Branches
- Current development branch: `codex/cloudflare-migration`
- Current deploy branch: `feature/project-bootstrap`

This checklist is for merging the Cloudflare-native migration work from the development branch back into the deploy branch without losing the currently working Pages homepage.

## What Is Already Done
- Pages homepage fallback remains available on the deploy branch.
- Workers API now covers:
  - `GET /api/health`
  - `GET /api/me`
  - `GET /api/generate/status`
  - `POST /api/auth/dev-login`
  - `POST /api/auth/send-code`
  - `POST /api/auth/verify-code`
  - `POST /api/auth/logout`
  - `POST /api/generate/image`
- Frontend requests can target an independent Workers API origin through `NEXT_PUBLIC_WORKERS_API_BASE_URL`.
- Generated images are stored in R2 instead of temporary data URLs.
- Generated image previews are served through Workers asset routes under `/api/assets/*`.
- Next.js API routes now act as transitional proxies to Workers when a Workers base URL is configured.
- The legacy Next.js uploads route no longer reads from the local filesystem.
- Local smoke coverage exists for:
  - `GET /api/health`
  - `POST /api/auth/dev-login`
  - `POST /api/generate/image`
  - `GET /api/assets/*`

## Local Validation Commands
Run these before any merge back to the deploy branch:

`npx tsc --noEmit`
`npm run build`
`npm run test:workers`

Expected result:
- Type check passes.
- Next build passes.
- Workers smoke tests pass.
- No Turbopack warning remains for `src/app/uploads/[...path]/route.ts`.

## Required Environment Variables
Only variable names should be documented publicly. Do not commit real values.

### Frontend / Next
- `NEXT_PUBLIC_WORKERS_API_BASE_URL`
- `WORKERS_API_BASE_URL`
- `APP_URL`
- `APP_ENV`
- `DATABASE_URL`
- `SESSION_SECRET`
- `DEV_AUTH_DEBUG_CODE`
- `IMAGE_MODEL`
- `IMAGE_BASE_URL`

### Workers
- `SESSION_SECRET`
- `DEV_AUTH_DEBUG_CODE`
- `AUTH_CODE_TTL_MINUTES`
- `AUTH_CODE_COOLDOWN_SECONDS`
- `AUTH_VERIFY_CODE_MAX_ATTEMPTS`
- `AUTH_VERIFY_CODE_LOCKOUT_SECONDS`
- `AUTH_SESSION_TTL_DAYS`
- `SIGNUP_BONUS_CREDITS`
- `IMAGE_API_KEY`
- `TEXT_TO_IMAGE_COST`

## Required Cloudflare Bindings
### D1
- Binding name: `SPARKPOST_DB`
- Database name: `sparkpost`
- Replace placeholder `database_id` in `workers/api/wrangler.jsonc` before remote deploy.

### R2
- Binding name: `SPARKPOST_R2`
- Bucket name: `sparkpost-assets`

## Merge Order
1. Keep the Pages static homepage behavior intact while merging the Cloudflare-native backend work.
2. Merge shared frontend helper changes first:
   - `src/lib/api/client.ts`
   - `src/lib/api/server.ts`
   - `src/app/page.tsx`
3. Merge Workers API and D1/R2 support:
   - `workers/api/src/index.ts`
   - `workers/api/wrangler.jsonc`
   - `workers/api/migrations/0001_initial.sql`
4. Merge the transitional Next route proxy layer:
   - `src/app/api/**/route.ts`
   - `src/app/uploads/[...path]/route.ts`
   - `.gitignore`
5. Re-run local validation.
6. Only then push the deploy branch and let Cloudflare redeploy.

## Post-Merge Cloudflare Checks
After the deploy branch is updated, verify these items in Cloudflare:
- Pages project still points to `pages_build_output_dir: .pages`.
- Worker/API environment variables are present.
- D1 binding is attached.
- R2 binding is attached.
- If frontend should call an independent Workers origin, `NEXT_PUBLIC_WORKERS_API_BASE_URL` must be set for the Pages build.
- If Next transitional proxies should forward server-side, `WORKERS_API_BASE_URL` must be set for the Next environment.

## Expected Runtime Checks
After redeploy, verify:
- `GET /api/health` reports D1 and R2 as configured.
- Frontend can resolve session state through `GET /api/me`.
- Email verification sign-in works end to end.
- `POST /api/generate/image` creates a task and returns a Worker asset URL.
- The returned asset URL renders an image successfully.

## Remaining Follow-up Work
- Decide whether to keep the transitional Next proxy routes long term or remove them after the frontend fully switches to Workers.
- Decide whether README should be updated again before merge. Keep it secret-safe.
- Decide when to merge the development branch back into the deploy branch.
