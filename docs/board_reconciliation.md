# Board Reconciliation — paste into Paperclip when it's running

> Generated 2026-05-31 after the autonomous UI batch + DLD-505/508 review.
> Paperclip (localhost:3100) was unreachable at write time, so this is the
> manual checklist. Company UUID `7d06e9ba-ace6-4ba7-b523-1180b0310587`.

## Close (work already done, branches confirmed)
- **DLD-506** — Distance filter → **DONE**. Already fixed in commit `02fa317` / PR #34. Verified: `<select>` enabled, renders all 5 options, binds value + onChange. No reachable code path still blanks it. Note: `docs/` (session findings).
- **DLD-507** — Pro sidebar unread badges → **DONE**. Already fixed in commit `76eb6c1` / PR #35. Full chain present: `useProSidebarCounts` → `pro/layout.tsx` → `DashboardSidebar` → `NavBadge`.

## In review (PR open, awaiting human merge — main→Netlify→live, Daniel's hands)
- **DLD-508** — Messages detail page loses sidebar → **IN REVIEW**, PR #59.
  Branch `fix/dld-508-messages-dashboard-sidebar`. Adds `app/dashboard/messages/layout.tsx`
  (76 lines, one new file, nothing else touched). Lint clean on new file, build passes (Node 20).
  **Pre-merge check:** eyeball live customer messages page for pro-sidebar flicker before
  role resolves (Auth Playbook rule #1 — `roleLoaded`), and confirm admins don't land here.
- **DLD-505** — Portfolio upload fails → **ALREADY FIXED & LIVE. CLOSE IT.**
  Fixed by **PR #37** (merged 2026-05-18): "align portfolio code with production DB schema."
  Live `app/api/cleaner/portfolio/route.ts` on main correctly uses `.eq('pro_id', user.id)`
  and inserts `pro_id: user.id`. Only `cleaner_id` left is the harmless DTO shim at line 37
  (`cleaner_id: row.pro_id`) — cosmetic, already logged in rename audit Group B.
  HISTORY / lesson: the size-limit branch (`fix/dld-505-portfolio-upload-size-limit`, PR #33)
  diagnosed the WRONG root cause (1MB cap). A live browser test with DevTools revealed the
  real error was `column portfolio_photos.cleaner_id does not exist` → 500. PR #33 was closed
  without merge; the legit 1MB→5MB bump was folded into PR #37. Verified 2026-05-31: bucket
  `portfolio-photos` file_size_limit = 5242880 (5MB), public, image mimes. Stale branch DELETED.
  **Lesson banked: reproduce in browser before diagnosing. Console error > theory.**

## Keep open / parked (blocked, not launch-critical)
- **/commercial 404** — left as 404 deliberately. Blocked on Coverall franchisor approval +
  Florida attorney consult (DLD-276). Note: `docs/commercial_deferred.md`. Do NOT route
  /commercial to SOTSVC/TCE — violates BOC↔SOTSVC separation rule (hook scans for it).

## Stale branches — DONE (cleaned up 2026-05-31)
- `fix/dld-508-messages-sidebar` — had OPEN PR #36 (23 commits behind main, hardcoded the
  deleted `/dashboard/pro/leads` route). PR #36 CLOSED with explanation, branch DELETED.
- `fix/dld-505-portfolio-upload-size-limit` — PR #33 (closed long ago, wrong root cause).
  Branch DELETED.
- Only remaining fix branch: `fix/dld-508-messages-dashboard-sidebar` (PR #59, the keeper).

## Debt items to file (post-launch)
- **next.config.js**: `eslint.ignoreDuringBuilds: true` + `typescript.ignoreBuildErrors: true`.
  `npm run build` does NOT enforce lint/TS — `npm run lint` is the only real gate. Decide whether
  this is intentional before launch; TS errors can ship to prod unchecked.
- **Pre-existing lint debt**: 5 errors / 17 warnings on main in unrelated files
  (auth-forms.tsx, cleaner-capacity-modal.tsx, training-module.tsx). One is in AUTH — review
  with eyes open, do not batch-autofix.
- **Cleaners→Pros rename epic**: full 7-step sequence in `docs/rename_audit.md`. Backlog, low
  priority, post-launch, NOT autonomous (step 3 enum/auth literal must land atomically).
