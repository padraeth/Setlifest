# Setlifest — Implementation Plan

## Environment and implementation approach

The initialized project is an empty Webdev workspace (no existing framework or code), with the managed server and managed MySQL database enabled, Preview on port 3000, and no Supabase credentials configured. Use the platform's managed backend rather than requiring unavailable Supabase credentials: a React + TypeScript + Vite client, a Node/Express API, Drizzle ORM with MySQL migrations, and Manus OAuth with validated server-side application sessions. This is an environment adaptation of the brief's preferred Supabase/Postgres option, not a claim that Supabase is configured. All private records will carry and be queried by the authenticated owner ID; user input will be validated at API boundaries. Never ship server credentials to the browser. If an integration is blocked, keep a truthful logged-out/error state and document it rather than simulating success.

Use React Router for module routes, custom CSS design tokens and reusable accessible primitives (Tailwind only if it improves maintainability), Framer Motion for restrained transitions, `@xyflow/react` for the actual roadmap canvas, Recharts for honest activity data, Lucide icons, and Zod for request/form validation. Use Vitest for business-logic tests and add browser-flow coverage if the runtime supports it. Database migrations will be deterministic and additive. Since managed development and published application share a database, routine tests should use isolated mocks/test repositories and must not seed or delete real user data.

## Product structure

- `src/app`: routing, shell, navigation, auth-aware entry points, responsive layout.
- `src/components` and `src/styles.css`: reusable accessible UI primitives, feedback/toasts, Setlifest design tokens, typography, forms/dialogs, badges, chart styling, and confirmation UI.
- `src/features/dashboard`: data-derived greeting, summaries, weekly activity and optional saved widget preferences.
- `src/features/habits`: positive and reduction-oriented habit forms, schedules, logs, calendar, streaks and supported insights.
- `src/features/tasks`: views, filters, subtasks, priorities, dates, recurrence and links.
- `src/features/goals`: goals, milestones, transparent progress modes and cross-links.
- `src/features/roadmaps`: React Flow tree editor, typed nodes, edge validation, persistence, selection/details and task/goal links.
- `src/features/courses`: course, section, lesson completion and notes.
- `src/features/settings`: real preferences, theme, week start and export.
- `shared/types.ts`: typed domain models shared by browser and API; `src/lib`: pure calculations, date/time helpers, client API, and validation.
- `server`: OAuth/session routes, authenticated API modules, authorization and error handling.
- `server/db`: Drizzle schema, ownership-aware repositories and committed migrations.
- `tests`: deterministic unit tests for calculations/transitions/relationship validation, plus focused integration and user-flow tests when the environment allows them.
- `public/manus-routes.json`: route manifest kept in sync with the app.

## Design system

**Design Movement:** premium editorial design fused with a restrained modern spatial interface.

**Core Principles:** (1) orient the user at a glance, (2) let important progress feel tangible, (3) give every module its own composition while preserving a shared visual grammar, and (4) keep motion and dimensional effects useful and lightweight.

**Color Philosophy:** use warm cream as a calm reading surface, white for clarity, deep navy/near-black for editorial contrast, and electric blue as the decisive action/progress accent; use restrained semantic colors for states. Support coherent light and dark modes with accessible contrast.

**Layout Paradigm:** an asymmetric workspace: compact navigation rail/sidebar beside a broad editorial canvas, with an occasional right-side context panel for selected goals, tasks, or roadmap nodes; on phones, use compact headers and thumb-reachable bottom navigation/drawers.

**Signature Elements:** a custom orbital/branching Setlifest mark; a dimensional blue progress-orbit motif; and thin editorial rules with layered, tactile surfaces.

**Interaction Philosophy:** direct manipulation, clear action feedback, undo where safe, and no controls that merely look interactive. Reduced-motion preferences disable nonessential movement.

**Animation:** short, purposeful transitions for route/view changes, card entrances, pressed/hover states, completion and progress updates, drawers and graph interactions; no blocking animation, perpetual distracting loops or motion when reduced motion is requested.

**Typography System:** use a highly legible editorial sans/variable family for interface text with a restrained display face for major page titles; choose locally available/web-safe fallback stacks and verify performance. Keep compact labels calm, body copy readable, and Persian/RTL-compatible fallbacks if Persian support is implemented.

**Brand Essence:** a personal operating system that connects everyday actions to a considered life plan; focused, humane, dimensional.

**Brand Voice:** clear, encouraging without pressure, and specific. Examples: “Make room for what matters today.” “A lapse is a moment, not the whole story.”

**Wordmark & Logo:** a custom wordmark paired with an open, branching orbital glyph suggesting connected paths, not a generic checkmark.

**Signature Brand Color:** electric blue `#3168F5`.

## Build sequence

1. **Foundation:** configure TypeScript diagnostics, establish the project shell, route manifest, package scripts, visual tokens, accessible primitives, server/API structure, authentication boundary and migrations.
2. **Connected core:** implement persistence and CRUD for habits (including lapse-resilient reduction tracking), tasks, goals/milestones, roadmap graphs and courses/lessons, then connect stable IDs and progress rules across them.
3. **Experience:** build the live-data dashboard and each module's distinct desktop/mobile views, settings/export, loading/empty/error states, keyboard/touch behavior, reduced-motion support and responsive polish.
4. **Verification and handoff:** run type diagnostics, unit/integration tests and production build; exercise critical flows and responsive rendering where tools permit; correct defects; document launch, migrations/environment, actual test results, backend/auth status and any known limitations. Do not claim unexecuted checks or successful publication.

## Constraints and integrity

The user asked for an actual functional application spanning every specified module; the feature scope is not being reduced to a dashboard or prototype. Calculations must use real records and clearly stated rules. Habit streaks honor scheduled rest days and calendar dates; course progress comes from lessons; goal progress separates manual from derived modes; recurring task completion creates only the relevant instance; roadmap dependency rules prevent cycles. Persist preferences and graph layout. Provide an honest nonjudgmental reduction experience. Use data ownership checks, safe rendering, clear destructive-action handling, and no fake authentication or cloud-sync claim. The brief's request for Supabase/Postgres is documented as an unavailable preferred alternative; available managed MySQL is the chosen persistent backend unless the user prefers otherwise.
