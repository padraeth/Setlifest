# Setlifest — Personal Life OS

Setlifest is a private, persistent life-management workspace for habits (including respectful reduction tracking), tasks, goals and reviews, an interactive roadmap canvas, courses/lessons, and a live-data dashboard.

## Stack and architecture

- React 19, TypeScript, Vite, React Router, custom CSS design tokens, Framer Motion, Lucide icons.
- `src/app` contains the authenticated shell, routes, navigation, and sign-in screen. `src/features` separates dashboard, habits, tasks, goals, roadmaps, courses, course detail, and settings. `src/components` and `src/styles.css` provide reusable UI and visual tokens. `src/lib` contains client API, validation, date helpers, and pure domain calculations. `shared/types.ts` is shared between browser and server.
- Express serves same-origin `/api`; Drizzle/MySQL provides durable normalized, owner-scoped storage. `server/auth.ts` implements Manus OAuth and server-side application sessions. `server/workspace.ts` validates CRUD requests, scopes reads/writes by the authenticated user, and validates relationship ownership/cycles. `server/db/migrations` contains additive SQL migrations. The client build is served by Express in production from `dist/`.
- `@xyflow/react` provides the interactive roadmap editor; Recharts provides data-derived dashboard trends; Vitest covers business rules.

## Run locally / in Webdev

Use Node.js 20+ and the pinned pnpm version declared in `package.json` (`pnpm@11.25.0`). Install dependencies and configure the environment:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Fill .env only for a separately configured local runtime; never commit .env.
pnpm db:migrate
pnpm dev
```

The Webdev managed runtime supplies its managed `DATABASE_URL` and Manus OAuth values. For a standalone runtime, configure `DATABASE_URL`, `MANUS_PROJECT_ID`, `MANUS_OAUTH_PORTAL_URL`, `MANUS_OAUTH_API_URL`, and `MANUS_JWT_SECRET` in the server environment. Keep them server-side; `.env.example` intentionally contains variable names only. `PORT` defaults to 3000 for production; Vite Preview is configured on port 3000 and proxies `/api` to the Express development listener on 3001.

Useful commands:

```bash
pnpm dev          # Vite + Express development services
pnpm db:migrate   # Apply only pending migrations; safe to run again
pnpm test         # Run deterministic domain tests (no managed user-data writes)
pnpm build        # Type-check and produce the production client in dist/
pnpm start        # Run the production Express server; set PORT if needed
```

Run `pnpm db:migrate` once against a new database before serving traffic. The migration runner records applied versions in `schema_migrations` and does not seed or overwrite user data. **Webdev development and published deployments share the same managed database**, so use migrations additively and do not run destructive experiments there.

## Authentication and data handling

Sign-in uses Manus OAuth. Application sessions are held in hashed server-side session records; the Preview-compatible `webdev_app_session` cookie uses `SameSite=None; Secure` for HTTPS Preview/production and a separate `SameSite=Lax` (non-Secure) policy for localhost HTTP development. Workspace API reads and mutations require a validated session and CSRF token, and SQL queries include the authenticated owner ID. Related records use owner-scoped foreign keys where applicable; the API also validates JSON-based relationships and graph/goal cycles. Passwords are not stored. Export is available from Settings as a private workspace JSON download.

The `/api/health` endpoint is unauthenticated and checks database readiness. `/manus-routes.json` lists the client page routes for the Webdev host.

## Known scope boundaries

- The project uses the available managed MySQL backend rather than the brief's preferred Supabase/PostgreSQL. It does not claim Supabase is configured.
- The dashboard has live habit/task/goal/course summaries and a weekly chart, but does not yet include a recent-activity feed, a separate upcoming-deadline preview, or drag-to-reorder widgets. The roadmap does not yet include search or undo/redo.
- Account identity and recovery are handled by Manus OAuth; Setlifest does not provide an app-owned password-reset flow.
- Habit reminder times can be stored as a planning cue; the application does not deliver push or scheduled browser notifications. Notification controls are not presented as working features.
- Learning records are user-authored organization and progress tracking; external links open at their source. Setlifest does not invent course content or embed external course video.
- The interface is currently English/LTR. Persian/RTL localization is not implemented.
- Verification: strict TypeScript check, 13 deterministic domain tests (including task recurrence IDs and roadmap cycle rules), successful production client build, HTTP checks (homepage/routes/health return 200; signed-out auth returns 401), and Playwright overflow checks at 360, 390, 430, 768, 1024, 1440, and 1920 px on the sign-in screen. No browser console errors/warnings were observed. Authenticated module workflows and their responsive layouts were not exercised because they require an interactive Manus OAuth session.
