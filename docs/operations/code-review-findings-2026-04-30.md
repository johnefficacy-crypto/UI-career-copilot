# Career Copilot Code Review Findings

_Last updated: 2026-04-30 — branch copy for Claude worktree_

Repo reviewed: `johnefficacy-crypto/career-copilot`  
Branch context: `claude/bold-rosalind-492811`

This file was copied onto the Claude branch because it existed on `master` but not on this branch. Use this file as the current audit reference while fixing build/runtime issues.

---

## 1. Current release blockers

The project is not release-clean yet.

Current P0 blockers:

1. `npm run build` fails TypeScript in `actions/marketplace.ts`.
2. `/admin/eligibility-queue` crashes at runtime.
3. CI does not run `npm run build`, so CI can miss production build failures.
4. RBAC permission mismatch still exists: `orgs` vs `organizations`.
5. Several admin mutations still use broad admin access.
6. Notification kill switch is not enforced by the email dispatcher.
7. Notification alert current-state helper exists but is not wired into the eligibility runner.
8. Docs/checklist still contain stale duplicated sections.

---

## 2. Runtime crash: `/admin/eligibility-queue`

Observed error:

```text
TypeError: supabase.rpc(...).maybeSingle(...).catch is not a function
at EligibilityQueuePage (app\admin\eligibility-queue\page.tsx:63:96)
```

Problem file:

```text
app/admin/eligibility-queue/page.tsx
```

Problem code pattern:

```ts
const { data: stats } = await supabase
  .rpc("get_eligibility_queue_stats")
  .maybeSingle()
  .catch(() => ({ data: null }))
```

Root cause:

Supabase query builders are awaitable, but do not safely expose `.catch()` like a normal Promise in this chained context.

Recommended fix:

```ts
let stats = null

try {
  const { data, error } = await supabase
    .rpc("get_eligibility_queue_stats")
    .maybeSingle()

  if (!error) stats = data
} catch {
  stats = null
}
```

Smaller alternative:

```ts
const statsRes = await supabase
  .rpc("get_eligibility_queue_stats")
  .maybeSingle()

const stats = statsRes.error ? null : statsRes.data
```

Priority:

```text
P0 — runtime crash
```

---

## 3. Build failure: `actions/marketplace.ts`

Observed build error:

```text
./actions/marketplace.ts:300:7
Type error: Argument of type 'PostgrestFilterBuilder...' is not assignable to parameter of type 'readonly string[]'.
```

Problem file:

```text
actions/marketplace.ts
```

Problem code:

```ts
const { count: totalLessons } = await supabase
  .from("lessons")
  .select("id", { count: "exact", head: true })
  .in(
    "section_id",
    supabase.from("course_sections").select("id").eq("course_id", courseId)
  )
```

Root cause:

Supabase `.in()` expects an array of values, not another query builder.

Recommended fix:

```ts
const { data: sections, error: sectionsError } = await supabase
  .from("course_sections")
  .select("id")
  .eq("course_id", courseId)

if (sectionsError) {
  redirect(`/instructor/courses/${courseId}/edit?error=${encodeURIComponent(sectionsError.message)}`)
}

const sectionIds = (sections ?? []).map((s) => s.id)

let totalLessons = 0

if (sectionIds.length > 0) {
  const { count, error: lessonsCountError } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .in("section_id", sectionIds)

  if (lessonsCountError) {
    redirect(`/instructor/courses/${courseId}/edit?error=${encodeURIComponent(lessonsCountError.message)}`)
  }

  totalLessons = count ?? 0
}

await supabase
  .from("courses")
  .update({
    total_lessons: totalLessons,
    updated_at: new Date().toISOString(),
  })
  .eq("id", courseId)
```

Better long-term option:

Create a database RPC for lesson count by course.

```sql
create or replace function public.count_course_lessons(p_course_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.lessons l
  join public.course_sections cs on cs.id = l.section_id
  where cs.course_id = p_course_id;
$$;
```

Then call:

```ts
const { data: totalLessons } = await supabase.rpc("count_course_lessons", {
  p_course_id: courseId,
})
```

Priority:

```text
P0 — production build blocker
```

---

## 4. Slow local development performance

Observed timings:

```text
GET /admin/rbac 200 in 20.5min
GET /admin/audit 200 in 29.4min
GET /dashboard 200 in 2.0min
GET /dashboard 200 in 112s
GET /marketplace 200 in 36.6s
```

Observed warning:

```text
Slow filesystem detected. The benchmark took 612ms.
```

Also observed:

```text
Finished writing to filesystem cache in 112s
Finished filesystem cache database compaction in 96s
```

Likely causes:

- `.next/dev` cache is huge, corrupted, or slow.
- Turbopack filesystem cache writes are slow on current Windows path.
- Antivirus/indexing may be scanning `.next` and `node_modules`.
- Some admin pages may perform heavy/unbounded queries.

Immediate cleanup:

```powershell
Ctrl + C
Remove-Item -Recurse -Force .next
npm run dev
```

Recommended local setup:

```text
1. Move repo to short local path, e.g. D:\projects\career-copilot.
2. Avoid OneDrive/Dropbox/network/synced folders.
3. Exclude repo/.next/node_modules from antivirus scanning if safe.
4. Add limits/pagination to heavy admin pages.
```

Priority:

```text
P1 — developer productivity and admin performance
```

---

## 5. CI problem

Current CI runs:

```yaml
- run: npm ci
- run: npm run lint
- run: npm run typecheck
- run: npm run test -- --run
```

But CI does not run:

```bash
npm run build
```

Required fix:

```yaml
- run: npm run build
```

Add after tests in `.github/workflows/ci.yml`.

Why this matters:

The current `actions/marketplace.ts` problem was caught by `next build`. CI can miss it until build is added.

Priority:

```text
P0 — release gate correctness
```

---

## 6. RBAC problem

In `lib/db/admin.ts`, role permissions use:

```ts
"orgs"
```

But routes/actions use:

```ts
requireAdminRole("organizations")
```

This mismatch can block admins who should have organization access.

Recommended fix:

```ts
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin:   ["*"],
  ops_admin:     ["scrape", "sources", "queue", "recruitments", "organizations", "audit", "notifications", "eligibility"],
  content_admin: ["recruitments", "organizations", "posts"],
  scraper_admin: ["scrape", "sources", "queue"],
  support_admin: ["users", "notifications"],
}
```

Then use `organizations` everywhere.

Priority:

```text
P0 — admin access correctness
```

---

## 7. Broad admin guards still remain

Some code still uses broad admin access instead of specific permission checks.

Examples in `actions/admin.ts`:

- `adminCreateOrganization`
- `adminUpdateOrganization`
- `adminSavePost`
- `adminDeletePost`
- `adminTriggerEligibilityRecompute`

Examples in `actions/notifications.ts`:

- `adminApproveQueueItem`
- `adminRejectQueueItem`
- `adminSetExtractionStatus`
- `adminReviewEvidenceField`
- `adminToggleScrapeSource`
- `adminResetSourceFails`
- `adminFanOutNotifications`
- `adminTriggerScraper`
- `adminTriggerDeadlineSweep`

Recommended pattern:

```ts
const ctx = await requireAdminRole("queue")
```

Use correct permission per action:

```text
organizations
posts
queue
scrape
sources
notifications
eligibility
```

Priority:

```text
P1 — governance hardening
```

---

## 8. Audit logging gaps

Audit logging exists, but not all admin mutations are logged.

Missing/weak coverage:

- organization create/update
- post create/update/delete
- eligibility recompute trigger
- scraper trigger
- deadline sweep trigger
- source toggle/reset actions

Recommended pattern:

```ts
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

Priority:

```text
P1 — governance hardening
```

---

## 9. Notification kill switch problem

The admin notification page writes:

```text
admin_settings.notifications_paused
```

Migration exists:

```text
supabase/migrations/032_admin_settings.sql
```

But `supabase/functions/email-dispatcher/index.ts` does not read this flag.

So the UI says notifications are paused, but dispatcher can still send emails.

Recommended dispatcher fix:

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

Priority:

```text
P0 — notification safety
```

---

## 10. Alert upsert mismatch

`lib/db/notifications.ts` has:

```ts
upsertNotificationAlerts(alerts)
```

It uses:

```ts
ignoreDuplicates: false
```

But `runEligibilityForUser()` still directly upserts alerts with:

```ts
ignoreDuplicates: true
```

This means existing alert state may not refresh.

Recommended fix:

Use the helper in the eligibility runner, or update runner's direct upsert to use current-state behavior.

If service-role client support is needed:

```ts
upsertNotificationAlerts(alerts, supabaseOverride?)
```

Priority:

```text
P1 — notification correctness
```

---

## 11. Documentation drift

README required-reading links are partly fixed, but README documentation map still lists old paths.

Old examples:

```text
docs/database-domain-model.md
docs/implementation_status_checklist.md
docs/runbook.md
docs/admin_automation_strategy.md
docs/archive/
```

Current structure:

```text
docs/engineering/domain-model.md
docs/operations/implementation-checklist.md
docs/operations/runbook.md
docs/engineering/admin-strategy.md
docs/history/
```

Also, `docs/operations/implementation-checklist.md` contains duplicated historical content.

Recommended fix:

- Keep one current checklist.
- Move old section to `docs/history/`.
- Fix README documentation map.

Priority:

```text
P1 — agent context reliability
```

---

## 12. Immediate fix order

Do this first:

```text
1. Fix app/admin/eligibility-queue/page.tsx runtime crash.
2. Fix actions/marketplace.ts build error.
3. Run npm run build.
4. Add npm run build to CI.
5. Fix orgs vs organizations RBAC mismatch.
6. Add dispatcher kill-switch enforcement.
7. Then handle broad admin guards and audit coverage.
```

---

## 13. Verification checklist

Run:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run dev
```

Manual checks:

```text
/admin/eligibility-queue loads without crashing
/instructor/courses/[id]/edit can add lesson
course total_lessons updates correctly
/admin/notifications kill switch prevents dispatcher sends
/admin/rbac and /admin/audit load in acceptable time
/dashboard loads without 2-minute server time
```

---

## 14. Recommended PR title

```text
fix(build): resolve marketplace type error and eligibility queue runtime crash
```

Recommended scope:

- Fix Supabase `.catch()` usage.
- Fix Supabase `.in()` usage.
- Add `npm run build` to CI.
- Run full verification.
