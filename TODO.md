# Setlifest — Delivery Outcomes

Status: checked items have implementation or execution evidence; unchecked items remain open where behavior is incomplete or authenticated/browser verification is not available. See README for test and Preview evidence.

## 1. Premium product identity, application shell, navigation, and design system

- [x] Deliver an original, premium personal workspace identity for Setlifest rather than a generic SaaS/admin template. Use pure white `#FFFFFF`, warm cream `#F2EBDD`, electric blue `#3168F5`, deep navy `#111827`, and near-black `#090B10`, with consistent semantic colors for states and charts.
- [x] Apply editorial design, modern spatial UI, controlled dimensional/layered surfaces, restrained glass effects, ambient lighting, refined shadows, geometric visual elements, asymmetric composition, and elegant readable typography without clutter, identical white cards everywhere, excessive gradients, random decorations, or emoji as the primary icon system.
- [x] Use 3D selectively and purposefully (for example, a dimensional dashboard progress/object motif), with CSS transforms or a lightweight implementation only when valuable. Provide responsive/performance fallbacks and do not load a heavy engine on every page.
- [x] Establish consistent spacing, typography, radius, shadow, color, focus, and responsive-grid tokens. Provide coherent light and dark themes. Support Persian/English and correct RTL, type, and number formatting if Persian is exposed; the current UI is English/LTR and does not expose Persian.
- [x] Build a desktop shell with Setlifest mark, expandable/collapsible sidebar, organized working navigation, contextual titles, useful quick actions, profile/settings access, notifications only if implemented, and responsive content containers.
- [ ] Build a dedicated practical phone experience with compact header, usable drawer or bottom navigation, large touch targets, mobile-friendly forms, responsive charts, touch-friendly roadmap controls, safe areas, appropriately sized text, no horizontal overflow, and no clipped dialogs or inaccessible menus; do not merely shrink desktop.
- [x] Make navigation and every visible primary control actionable; forms validate; interactive elements show feedback; no fake links, dead buttons, or placeholder controls. Use semantic/accessibly labeled UI and a consistent icon family.
- [ ] Provide reusable accessible buttons, inputs, selects, checkboxes, dialogs, drawers, dropdowns, tooltips, tabs, cards, badges, progress bars, chart wrappers, empty/loading/error states, toast notifications, and destructive-action confirmations, with visible keyboard focus and useful status announcements. Core used controls are reusable; standalone drawers, dropdowns, and tooltips are not yet provided as shared primitives.
- [x] Provide meaningful page transitions, staggered entry, hover/press feedback, progress changes, dialogs/drawers, graph interactions, completion feedback, skeleton/loading states, and clear success/error/empty transitions; animations communicate state and do not delay essential actions. Respect reduced-motion preferences; avoid excessive bounce, distracting loops, and unnecessary movement.

## 2. Dashboard

- [x] Show personalized greeting, current date, concise non-generic motivational message, premium dimensional visual, primary action for today's plan, and contextual progress where useful.
- [x] Calculate live statistics from persisted application data only: habits completed today, tasks completed today, active goals, weekly activity, current learning progress, and meaningful completion trends. Never present hard-coded or fabricated values as actual user progress.
- [ ] Include today's habits, priority tasks, upcoming deadlines, active goals, current courses, and recent activity when implemented; each summary navigates directly to its source module.
- [x] Provide an honest compact weekly activity visualization with meaningful daily indicators, supported activity history, and navigation to detailed views; do not fabricate historical information.
- [ ] Where feasible, allow users to choose which dashboard widgets appear and reorder them; persist their preferences. Visibility is persisted; drag reordering is not implemented.

## 3. Positive habits and reduction-oriented habit tracking

- [x] Create habits with name, description, category, positive or reduction-oriented type, icon/visual identity, frequency, selected weekdays, daily or weekly target, optional reminder time, start date, optional duration, and color accent. Use a validated, usable form and do not require unnecessary fields.
- [x] Support daily completion, uncompleted states, skip/rest states where appropriate, history, calendar tracking, weekly/monthly summaries, current and best streaks, completion percentages, missed-day analysis, edit, and delete.
- [ ] Define streak rules clearly, handle timezone/date boundaries correctly, and never treat an intentionally scheduled rest day as a failure.
- [x] For reduction-oriented habits, support user-defined reduction targets, recording successful avoidance/reduction events, tracking frequency over time, optional notes about patterns/triggers, and recovery after a lapse without losing historical progress. Use respectful nonjudgmental language; no shame messaging and no implication that one lapse erases prior progress.
- [ ] Show insight summaries (consistency, completion by weekday, recent trends, improvement/decline) only where actual records support them.
- [x] Habit completion immediately updates UI and related dashboard statistics. Use optimistic updates only when safe; support editing, deletion, appropriate undo and clear destructive-action confirmation.

## 4. Task management

- [x] Store task title, description, due date, optional start date, priority, status, category/project, estimated duration, tags, optional subtasks, optional recurrence, and optional goal/roadmap-node relationship. Roadmap relationships are stored on linked nodes that reference the task.
- [x] Provide Today, Upcoming, All tasks, Completed, Overdue and category/project-grouped views; provide practical list and compact board views where feasible.
- [x] Support task create/edit/complete/reopen/delete/search, status/priority filters, deadline/importance sort, subtask creation/completion, rescheduling, and goal linking.
- [x] Support keyboard-friendly creation/editing, clear overdue/completed/high-priority states, and appropriate confirmation or undo for destructive actions.
- [x] Recurrence generates new instances according to selected rules; completing one occurrence must not accidentally complete future occurrences. Stable occurrence IDs and retry handling keep a next instance idempotent if a response fails.

## 5. Goal management

- [x] Store title, description, category, time horizon, start date, target date, status, priority, completion percentage, measurable success criteria, milestones, related habits/tasks/roadmap nodes, notes, and dated review-history entries that retain the progress percentage captured with each note.
- [x] Allow large goals to be broken into smaller goals, milestones, and actionable steps; prevent invalid relationships and circular hierarchies.
- [x] Support manual progress, milestone-based progress, and task-derived progress only when configured; make the calculation mode and rule explicit and do not silently mix manual and automatic progress.
- [x] Support deadline tracking, goal history/review snapshots, progress visualization, completion, and archiving.
- [ ] Show active goals, upcoming milestones, at-risk goals only using transparent rules, recently completed goals, and progress trends; do not make unsupported predictions about future performance.

## 6. Interactive tree roadmap editor

- [x] Deliver a genuinely interactive node-based tree/graph editor, not a static diagram or simple nested list. Support root creation, multiple branch levels, child creation, rename, description edit, delete, expand/collapse, move, zoom, pan, fit-to-viewport, selection, node details, appropriate connections, and saved/restored layout.
- [x] Support distinct node types with appropriate Setlifest visuals: main objective, goal, milestone, action, decision, and learning resource.
- [x] Store node title, description, status, priority, due date, progress, notes, linked tasks, parent relationship, and optional dependencies.
- [ ] Provide dedicated canvas, contextual toolbar, details panel, helpful empty state, useful minimap, search/filter where useful, visible autosave status, and undo/redo where practical; adapt editor for mobile/touch. Canvas, minimap, and autosave are implemented; search/filter and undo/redo remain open.
- [x] Link nodes to actual application goals and tasks without duplicating task records. When a linked task is completed, update node state/derived progress according to a documented rule. Validate links and prevent cycles where the relationship type requires a DAG.

## 7. Courses and learning management

- [x] Create courses with name, description, category, optional instructor/source, cover image or selected visual, optional external URL, start date, target completion date, status, and notes.
- [x] Support ordered sections/chapters and individual lessons; lesson completion, optional duration, lesson notes, external links, last accessed lesson, and course-level progress.
- [x] When lesson-based progress is selected, calculate it from completed lessons; handle empty courses and differently weighted content explicitly. Do not invent lesson content or claim a linked external video plays inside Setlifest.
- [x] Provide distinct course cards, course detail, lesson list, completion indicators, continue-learning action, course search/filter, active/completed views, and personal notes without requiring an external platform integration.

## 8. Cross-module relationships and data consistency

- [x] Use stable identifiers and explicit relation models: goals may relate to habits/tasks/roadmaps; roadmap nodes may reference goals/tasks; courses may contribute to learning goals; lesson completion updates course progress; milestones affect goal progress only when that calculation method is selected; deadlines surface in daily/upcoming views.
- [x] Dashboard statistics update as tasks/habits change; related views update predictably. Avoid duplicated entity data, inconsistent counters, and fragile relationships based on display names. Deletes refresh canonical server state, including cascaded records and cleaned goal links.

## 9. Authentication, persistence, schema, and security

- [x] Use a reliable persistent backend. Preferred user request is Supabase/PostgreSQL/Auth; when credentials/access are unavailable, use a clearly defined persistent development mode or available managed platform backend and document the adaptation. Do not pretend simulated authentication is secure or local storage syncs to cloud. This project uses the available managed MySQL service and Manus OAuth; no Supabase access was configured.
- [ ] Where configured, support account creation/sign-in/sign-out/password recovery/session persistence/protected user pages. Without configured auth, do not imply private multi-user isolation. Show honest loading/logged-out/error states.
- [x] Ensure private records have ownership fields and authorization checks and cannot be read/changed across users. For Supabase, apply RLS to private tables; never expose service-role keys or other privileged values in browser code. Use `.env.example` with variable names only. The configured backend is owner-scoped MySQL, not Supabase.
- [x] Include normalized, reproducible migrations/schema and appropriate ownership, FKs, constraints, indexes, and deletion behavior for profiles, habits, habit logs, tasks/subtasks, goals/milestones, roadmaps/nodes/edges, courses/sections/lessons/lesson progress, notes, and user preferences.
- [x] If using local demo mode due unavailable backend credentials, persist demonstrable user-created data locally, distinguish it from demo data, do not claim cloud sync, and provide a feasible migration path. This conditional is not applicable: managed database credentials are configured and the project uses managed MySQL.
- [x] Validate inputs, safely render user content, perform ownership checks, handle errors safely, protect environment variables, confirm destructive actions, preserve relationship/deletion integrity, and never store passwords in local storage. Never claim security controls that were not implemented.

## 10. Settings and personalization

- [x] Provide functional profile preferences, light/dark theme, notification preferences only if notifications truly work, week-start preference, date/time preferences where applicable, dashboard customization where implemented, data export, and account management only when authentication is configured. Nonfunctional notification switches are omitted.
- [x] Persist preferences; retain the core Setlifest palette in light/dark modes. Omit settings that cannot be implemented rather than showing nonfunctional switches.

## 11. Accessibility, responsiveness, performance, and reliability

- [ ] Verify layouts at representative widths 360, 390, 430, 768, 1024, 1440, and 1920 px: no accidental horizontal overflow, clipped content, overlapping controls, inaccessible mobile menus, unreadable text, or broken RTL where supported.
- [x] Provide suitable contrast, visible keyboard focus, keyboard-accessible forms/dialogs, accessible labels, meaningful status announcements, reduced-motion behavior, and touch-friendly primary actions.
- [ ] Avoid unnecessary rerenders; lazy-load expensive modules where useful; keep 3D/assets lightweight and images optimized; use efficient database queries; paginate/virtualize large collections where needed; do not load unnecessary full history on dashboard interaction; handle loading, empty, errors, network failures, edit data-loss, caching/invalidation, and subscription/animation cleanup; keep bundle reasonable.

## 12. Critical tests, production build, and handoff

- [ ] Add and run unit tests for habit completion percentages/streak logic, task status transitions, goal progress, course progress, and roadmap relationship/cycle validation. Add integration coverage for key workflows. Thirteen unit tests pass; integration coverage remains open.
- [ ] Where browser automation is available, exercise: create/complete/reload habit and verify persistence; create reduction tracker and record progress; create/edit/complete task and verify dashboard; create goal/update progress; create nested roadmap and verify after reload; link node to existing goal/task; create course with sections/lessons and verify completion progress; verify user isolation when authentication is configured; test forms/navigation/dialogs/error states; check mobile/desktop; inspect console errors. Current Playwright checks covered the signed-out screen at all specified widths; authenticated module scenarios remain unrun.
- [x] Run actual type/language diagnostics and production build; fix discovered errors. Do not mark tests/build successful unless they were executed. If a scenario cannot run, document the specific limitation.
- [x] Deliver an executable working application, feature summary, architecture and technology choices, important project structure, run instructions, required environment variables, database setup/migration instructions, actual test results, known limitations, and recommended next steps. Do not claim successful deployment or unimplemented features as complete.
