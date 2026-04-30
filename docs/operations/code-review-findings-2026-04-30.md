# Career Copilot Code Review Findings

_Last updated: 2026-04-30 — second audit_

Repo reviewed: `johnefficacy-crypto/career-copilot`  
Branch reviewed: `master`

This file records a second audit of the current codebase. It updates the earlier findings after rechecking README, CI, RBAC, notification runtime behavior, eligibility alert upserts, docs, and admin actions.

---

## 1. Executive summary

Career Copilot has a strong working foundation. The repo contains real implementations for Supabase data flows, admin surfaces, RBAC helpers, audit logging, notification preferences, notification governance UI, mission-control dashboard wiring, telemetry, and deterministic eligibility logic.

However, the repo is still not release-clean.

Main current blockers:

- CI still does not run production build.
- RBAC permissions still have naming mismatch: `orgs` vs `organizations`.
- Multiple admin mutations still use broad `requireAdmin()` instead of permission-specific checks.
- Notification kill switch writes to `admin_settings`, but the email dispatcher does not read that flag.
- `upsertNotificationAlerts()` exists, but `runEligibilityForUser()` still directly upserts alerts with `ignoreDuplicates: true`.
- Root README required-reading links were partly fixed, but the documentation map still lists old paths.
- Implementation checklist still contains duplicate/stale historical content.

---

## 2. What improved since the previous audit

| Area | Previous finding | Current status |
|---|---|---|
| README required-reading links | Pointed to old docs paths | Partly fixed. Required-reading section now points to `docs/operations/implementation-checklist.md`, `docs/engineering/domain-model.md`, and `docs/operations/runbook.md`. |
| Review findings file | Did not exist before previous pass | Exists at `docs/operations/code-review-findings-2026-04-30.md`. |
| Admin settings migration | Needed confirmation | Exists. `admin_settings` table seeds `notifications_paused = false`. |
| Notification alert upsert helper | Needed confirmation | Exists in `lib/db/notifications.ts`. |

---

## 3. Documentation findings

### Current status

Root README now partly follows the new docs structure in the required-reading section.

Good current links:

```md
[`docs/operations/implementation-checklist.md`](docs/operations/implementation-checklist.md)
[`docs/engineering/domain-model.md`](docs/engineering/domain-model.md)
[`docs/operations/runbook.md`](docs/operations/runbook.md)
[`docs/engineering/admin-strategy.md`](docs/engineering/admin-strategy.md)
```

### Remaining doc drift

README documentation map still lists old paths:

```text
docs/database-domain-model.md
docs/implementation_status_checklist.md
docs/runbook.md
docs/admin_automation_strategy.md
docs/source-intelligence-strategy.md
docs/product_strategy_architecture_roadmap.md
docs/archive/
```

But current docs live under newer folders:

```text
docs/engineering/domain-model.md
docs/operations/implementation-checklist.md
docs/operations/runbook.md
docs/engineering/admin-strategy.md
docs/engineering/source-intelligence.md
docs/product/roadmap.md
docs/history/
```

### Checklist issue

`docs/operations/implementation-checklist.md` still contains two merged versions:

1. Newer checklist: “Last updated: 2026-04-30 — Sprints 5/6/7 complete”.
2. Older checklist: “Last updated: 2026-04-29”.

This makes the file unreliable as a single source of truth.

### Required fix

- Keep only one current checklist.
- Move older historical section to `docs/history/`.
- Fix root README documentation map.
- Do not claim “single source of truth” until stale duplicate content is removed.

---

## 4. Build and CI findings

### Package scripts

`package.json` has the required scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest"
}
```

### CI current behavior

`.github/workflows/ci.yml` runs:

```yaml
- run: npm ci
- run: npm run lint
- run: npm run typecheck
- run: npm run test -- --run
```

Database job runs:

```yaml
- run: npm install -g supabase
- run: supabase db lint
```

### Gap

CI still does not run:

```bash
npm run build
```

README says build must be run before merging or marking a task complete. CI does not enforce that.

### Required fix

Add this after tests:

```yaml
- run: npm run build
```

### Minor dependency drift

Current versions:

```json
"next": "16.2.4",
"eslint-config-next": "16.2.1"
```

Align `eslint-config-next` with `next` unless there is a specific reason not to.

---

## 5. RBAC findings

### What exists

`requireAdminRole()` exists in `lib/db/admin.ts` and centralizes admin role checks.

Roles:

```ts
super_admin
ops_admin
content_admin
scraper_admin
support_admin
```

### Critical mismatch still present

`ROLE_PERMISSIONS` uses `orgs`:

```ts
ops_admin:     ["scrape", "sources", "queue", "recruitments", "orgs", "audit"],
content_admin: ["recruitments", "orgs", "posts"],
```

But code uses `organizations`:

```ts
requireAdminRole("organizations")
```

This mismatch can block `ops_admin` and `content_admin` from organization actions even though they are intended to have org access.

### Required fix

Use one permission vocabulary everywhere.

Recommended:

```ts
ops_admin:     ["scrape", "sources", "queue", "recruitments", "organizations", "audit", "rbac", "notifications"],
content_admin: ["recruitments", "organizations", "posts"],
scraper_admin: ["scrape", "sources", "queue"],
support_admin: ["users", "notifications"],
```

Then use:

```ts
await requireAdminRole("organizations")
```

---

## 6. Broad admin guards still remain

The checklist says full RBAC enforcement is done, but code still has broad admin guards.

### In `actions/admin.ts`

These still use `requireAdmin()`:

- `adminCreateOrganization`
- `adminUpdateOrganization`
- `adminSavePost`
- `adminDeletePost`
- `adminTriggerEligibilityRecompute`

### In `actions/notifications.ts`

A local `requireAdmin()` wrapper calls `requireAdminRole()` without a permission argument. That still accepts any admin role.

Broad admin access is used for:

- `adminApproveQueueItem`
- `adminRejectQueueItem`
- `adminSetExtractionStatus`
- `adminReviewEvidenceField`
- `adminToggleScrapeSource`
- `adminResetSourceFails`
- `adminFanOutNotifications`
- `adminTriggerScraper`
- `adminTriggerDeadlineSweep`

### Required fix

Replace broad checks with specific permission checks:

```ts
await requireAdminRole("organizations")
await requireAdminRole("posts")
await requireAdminRole("queue")
await requireAdminRole("scrape")
await requireAdminRole("sources")
await requireAdminRole("notifications")
await requireAdminRole("eligibility")
```

### RBAC verdict

RBAC foundation exists, but full RBAC enforcement is still partial.

---

## 7. Audit logging findings

### What exists

`logAdminAction()` exists and writes to `admin_audit_logs`.

It is intentionally non-blocking.

### Good coverage

Audit logging exists for several important actions:

- create recruitment
- update recruitment
- delete recruitment
- submit recruitment for review
- publish recruitment
- withdraw recruitment
- verify organization
- approve/reject scrape item
- set extraction status
- review evidence field
- notification pause/resume
- RBAC role update

### Gaps

Audit logging is still incomplete for:

- organization create
- organization update
- post create/update/delete
- eligibility recompute trigger
- scraper trigger
- deadline sweep trigger
- source toggle/reset actions in `actions/notifications.ts`

### Required fix

Every admin mutation should follow this pattern:

```ts
const ctx = await requireAdminRole("permission")
// perform mutation
void logAdminAction({
  actorId: ctx.userId,
  actorEmail: ctx.userEmail,
  action: "action_name",
  entityType: "entity_type",
  entityId,
  oldValue,
  newValue,
})
```

---

## 8. Notification system findings

### User preferences: implemented

Files:

```text
app/api/notifications/preferences/route.ts
app/dashboard/notifications/preferences/page.tsx
```

Supports:

- email opt-in/off
- digest frequency
- minimum email priority
- in-app notifications
- quiet hours
- DPDP consent note

### Admin governance page: implemented

File:

```text
app/admin/notifications/page.tsx
```

Includes:

- total/sent/pending/failed counts
- recent send log
- emergency kill switch
- audit link

### Admin setting exists

Migration exists:

```text
supabase/migrations/032_admin_settings.sql
```

It creates:

```sql
public.admin_settings
```

And seeds:

```sql
('notifications_paused', 'false')
```

### Critical runtime gap

`supabase/functions/email-dispatcher/index.ts` does not read `admin_settings.notifications_paused`.

So the admin UI can set the flag, but the dispatcher will still send emails if invoked.

### Required dispatcher fix

Add this near the start of the email dispatcher after creating the Supabase client:

```ts
const { data: pauseFlag } = await supabase
  .from("admin_settings")
  .select("value")
  .eq("key", "notifications_paused")
  .maybeSingle()

if (pauseFlag?.value === "true") {
  return new Response(
    JSON.stringify({ dispatched: 0, errors: 0, message: "Notifications paused" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}
```

### Notification verdict

Notification UI and preferences are real. Emergency kill switch is not fully operational until dispatcher enforcement is added.

---

## 9. Notification alert upsert findings

### Helper exists

`lib/db/notifications.ts` defines:

```ts
upsertNotificationAlerts(alerts)
```

It uses:

```ts
ignoreDuplicates: false
```

This is correct for keeping alert state current.

### But runner still bypasses helper

`runEligibilityForUser()` still directly writes to `notification_alerts` using:

```ts
.upsert(alertInserts, {
  onConflict: "user_id,recruitment_id,alert_type",
  ignoreDuplicates: true,
})
```

This conflicts with the checklist claim:

```text
Wire upsertNotificationAlerts into runEligibilityForUser callers
```

### Required fix

Use the helper from `lib/db/notifications.ts`, or change the direct runner upsert to update duplicates:

```ts
await upsertNotificationAlerts(alertInserts)
```

If Edge Function/service-role client compatibility is required, modify the helper to accept an optional Supabase client:

```ts
upsertNotificationAlerts(alerts, supabaseOverride?)
```

### Alert verdict

The helper is correct, but it is not wired into the main eligibility alert path yet.

---

## 10. Eligibility findings

### Completed

`runEligibilityForUser()` performs the core flow:

- loads profile
- loads education
- loads exam attempts
- loads tracked recruitments
- loads active posts
- runs deterministic eligibility
- writes `eligibility_results`
- creates `notification_alerts`

### Good architecture

The deterministic engine remains the source of truth for eligibility. This matches the product rule:

```text
Determinism > Heuristics
```

### Risk

Manual recompute in `actions/admin.ts` is sequential and broad:

```ts
users.map((u) => runEligibilityForUser(u.id))
```

This is acceptable for small data but not for scale.

### Required future fix

Admin-triggered recompute should enqueue jobs into `eligibility_recompute_queue`, not directly run every user in one server action.

---

## 11. Mission-control dashboard findings

### Completed

Dashboard page fetches:

- dashboard data
- eligible recruitments
- notifications
- unread count
- study plans
- chat sessions
- next actions
- mission-control data

`getMissionControlData()` queries:

```text
user_recruitment_state
```

It safely returns an empty object if the view errors.

### Good

This prevents dashboard crashes during migration rollout.

### Risk

Silent fallback can hide DB/migration problems.

### Required improvement

Keep empty fallback for users, but log failures server-side:

```ts
if (error) console.error("getMissionControlData", error.message)
```

---

## 12. Telemetry findings

### Completed

`POST /api/events` exists and writes to:

```text
user_events
```

It validates:

- `entity_type`
- `entity_id` presence
- `event_type`
- `metadata`

### Gap

`entity_id` only checks that it is a non-empty string.

### Required improvement

For entity types that should use UUIDs, validate format:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

Allow non-UUID only for dashboard/global events if needed.

---

## 13. Domain model findings

The domain rule remains correct:

```text
Database = recruitment
Frontend language = exam
Foreign key = recruitment_id
Avoid = public.exams
```

Current source search did not show active app/action/lib usage of:

```ts
from("exams")
```

or direct canonical usage of:

```sql
public.exams
```

The domain model is good. The problem is mostly README/checklist path drift, not domain design.

---

## 14. Completed vs partial vs future

### Completed / mostly complete

| Item | Status |
|---|---|
| Next.js + Supabase foundation | Done |
| Package scripts | Done |
| CI lint/typecheck/test/db lint | Mostly done |
| Domain model | Done |
| Operational runbook | Done |
| RBAC helper | Done |
| Source actions granular RBAC | Done |
| Audit logging helper | Done |
| Notification preferences API | Done |
| Notification preferences UI | Done |
| Notification governance UI | Done |
| Admin settings table | Done |
| Mission-control fetcher | Done |
| Dashboard mission-control wiring | Done |
| Telemetry API | Done |
| Eligibility runner | Done |
| Notification alert upsert helper | Done, but not wired into runner |

### Partial / needs correction

| Item | Gap |
|---|---|
| Root README docs map | Still old paths |
| Implementation checklist | Duplicate/stale historical section |
| CI release gate | Missing `npm run build` |
| Full RBAC | Broad `requireAdmin()` checks remain |
| Organization permission | `orgs` vs `organizations` mismatch |
| Notification kill switch | UI writes flag, dispatcher ignores it |
| Alert state updates | Helper exists, runner bypasses it |
| Audit coverage | Some admin mutations not logged |
| Telemetry validation | No UUID validation |
| Mission-control errors | Silent fallback hides DB issues |

### Future / not implemented

| Item | Status |
|---|---|
| Source URL verification console | Future |
| Domain verification tool | Future |
| Redirect/content-type inspection | Future |
| Recruitment publish gate validation | Future |
| Recruitment version history | Future |
| Change diff viewer | Future |
| Eligibility dead-letter view | Future |
| Rule version tracking | Future |
| Eligibility explanation inspector | Future |
| AI runtime policy enforcement | Future |
| Marketplace trust filters | Future |
| Community/mentorship module | Future |
| Topic proficiency and spaced repetition | Future |

---

## 15. P0 action list

Fix these before calling the codebase release-ready:

1. Add `npm run build` to CI.
2. Fix `orgs` vs `organizations` permission mismatch.
3. Replace broad `requireAdmin()` checks in admin mutations.
4. Add dispatcher enforcement for `notifications_paused`.
5. Wire `upsertNotificationAlerts()` into `runEligibilityForUser()` or update direct upsert behavior.
6. Clean `docs/operations/implementation-checklist.md` duplicate sections.
7. Fix root README documentation map.
8. Add missing audit logs for admin mutations.

---

## 16. Recommended next PRs

### PR 1 — CI and documentation truth

```text
ci+docs: enforce build gate and align docs map
```

Scope:

- Add `npm run build` to CI.
- Fix README documentation map.
- Remove duplicated checklist section.

### PR 2 — RBAC cleanup

```text
fix(rbac): normalize permissions and remove broad admin guards
```

Scope:

- Replace `orgs` with `organizations`.
- Add missing permission keys.
- Replace broad `requireAdmin()` calls.
- Ensure every admin mutation has permission-specific guard.

### PR 3 — Notification runtime safety

```text
fix(notifications): enforce kill switch and update alert state
```

Scope:

- Email dispatcher checks `notifications_paused`.
- `runEligibilityForUser()` uses current-state alert upsert.
- Add tests or manual verification notes.

### PR 4 — Audit coverage

```text
fix(audit): log all admin mutations
```

Scope:

- Organization create/update.
- Post save/delete.
- Eligibility recompute trigger.
- Scraper/deadline trigger.
- Source toggle/reset.

---

## 17. Final verdict

The codebase has a strong architecture and meaningful implementation, but the release gate should remain closed until governance and runtime safety are corrected.

Current status:

```text
Product foundation: strong
Docs structure: improving, still drifting
RBAC: implemented, not fully enforced
Notifications: UI complete, runtime kill switch incomplete
Eligibility: real engine, alert upsert wiring incomplete
CI: useful but missing production build
```

Best immediate focus:

```text
Trust cleanup before feature expansion.
```
