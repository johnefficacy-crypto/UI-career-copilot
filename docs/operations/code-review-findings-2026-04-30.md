# Career Copilot Code Review Findings

_Last updated: 2026-04-30_

Repo reviewed: `johnefficacy-crypto/career-copilot`  
Branch reviewed: `master`

This review compares the current docs/checklists against the actual codebase. It focuses on implementation truth, release readiness, RBAC, notifications, eligibility, dashboard, CI, and documentation drift.

---

## 1. Executive summary

Career Copilot has moved beyond prototype stage. The repo contains real product structure, Supabase-backed data flows, admin surfaces, notification preferences, mission-control dashboard wiring, eligibility logic, CI checks, and operational documentation.

Main issue: documentation and checklist claims are slightly ahead of the actual code.

The repo is not fully release-clean yet because:

- Some README links point to old doc paths.
- The implementation checklist contains duplicated/stale sections.
- Some admin mutations still use broad `requireAdmin()` instead of permission-based RBAC.
- RBAC permission names are inconsistent.
- CI does not run production build.
- Notification kill-switch UI exists, but dispatcher enforcement still needs verification.
- Audit logging exists, but coverage is incomplete.

---

## 2. Documentation findings

| Area | Finding | Status |
|---|---|---|
| Root README | Links old paths such as `docs/implementation_status_checklist.md`, `docs/database-domain-model.md`, and `docs/runbook.md`. | Needs fix |
| Actual checklist path | Current checklist is `docs/operations/implementation-checklist.md`. | Exists |
| Actual domain model path | Current domain model is `docs/engineering/domain-model.md`. | Exists |
| Actual runbook path | Current runbook is `docs/operations/runbook.md`. | Exists |
| Docs index | `docs/README.md` is cleaner and more current than root README. | Good |
| Checklist | Contains newer sprint-complete content plus older duplicated checklist text. | Needs cleanup |

### Required doc fixes

- Update root README doc links.
- Remove stale duplicate content from `docs/operations/implementation-checklist.md`.
- Keep one checklist as the current truth.
- Move historical sprint claims to `docs/history/` if still useful.

---

## 3. Build and CI findings

Package scripts exist for:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

CI currently runs:

- lint
- typecheck
- tests
- Supabase DB lint

But CI does **not** run:

```bash
npm run build
```

### Required CI fix

Add production build to `.github/workflows/ci.yml`:

```yaml
- run: npm run build
```

### Minor dependency issue

`package.json` has:

```json
"next": "16.2.4",
"eslint-config-next": "16.2.1"
```

These should be aligned to reduce config drift.

---

## 4. RBAC findings

### What exists

`requireAdminRole()` exists in `lib/db/admin.ts`.

Defined roles:

- `super_admin`
- `ops_admin`
- `content_admin`
- `scraper_admin`
- `support_admin`

Role permissions are centralized in `ROLE_PERMISSIONS`.

### Critical mismatch

Role permission key uses:

```ts
"orgs"
```

But some action/page checks use:

```ts
requireAdminRole("organizations")
```

This can block legitimate admins from organization actions.

### Required RBAC fix

Choose one naming convention and use it everywhere.

Recommended:

```ts
content_admin: ["recruitments", "organizations", "posts"]
ops_admin: ["scrape", "sources", "queue", "recruitments", "organizations", "audit"]
```

Then update all checks to:

```ts
requireAdminRole("organizations")
```

### Broad admin checks still remain

Some admin mutations still use `requireAdmin()` instead of permission-based checks:

- `adminCreateOrganization`
- `adminUpdateOrganization`
- `adminSavePost`
- `adminDeletePost`
- `adminTriggerEligibilityRecompute`

### Required action fix

Replace broad checks with granular permissions:

```ts
await requireAdminRole("organizations")
await requireAdminRole("posts")
await requireAdminRole("eligibility")
```

### RBAC verdict

RBAC foundation exists, but “full RBAC enforcement” is not fully true yet.

---

## 5. Audit logging findings

### What exists

`logAdminAction()` exists and writes to `admin_audit_logs`.

It is non-blocking and intentionally does not break the main action if audit insert fails.

### What is good

Audit logging is used in important admin flows like:

- create recruitment
- update recruitment
- delete recruitment
- submit for review
- publish recruitment
- withdraw recruitment
- verify organization
- update admin role
- notification pause/resume

### Gaps

Audit logging is not yet consistent for all mutations, especially:

- organization create/update
- post save/delete
- eligibility recompute trigger

### Required audit fix

Add `logAdminAction()` to every admin mutation that changes database state.

---

## 6. Notification findings

### Completed

Notification preferences are implemented:

- API: `app/api/notifications/preferences/route.ts`
- UI: `app/dashboard/notifications/preferences/page.tsx`

The UI supports:

- email opt-in/off
- digest frequency
- minimum priority
- in-app alerts
- quiet hours
- DPDP consent note

Admin notification governance page exists:

```text
app/admin/notifications/page.tsx
```

It includes:

- notification stats
- recent send log
- emergency kill switch
- audit link

### Mismatch

Checklist says `toggleKillSwitch` is in `actions/admin.ts`, but actual code has it as an inline server action inside:

```text
app/admin/notifications/page.tsx
```

This is acceptable, but docs/checklist should match actual code.

### Runtime risk

The kill-switch UI writes to `admin_settings`, but the email dispatcher must also check this flag before sending.

### Required verification

Check `supabase/functions/email-dispatcher/index.ts` for:

```ts
notifications_paused
```

If missing, implement dispatcher-side enforcement.

---

## 7. Eligibility findings

### Completed

`runEligibilityForUser()` exists and performs the core flow:

- loads user profile
- loads education
- loads exam attempts
- loads tracked recruitments
- loads active posts
- runs deterministic eligibility
- writes `eligibility_results`
- emits `notification_alerts`

`getEligibleRecruitments()` returns eligible and conditional matches.

### Concern

Notification alert upsert uses duplicate avoidance. This prevents spam, but may not refresh existing alert state when eligibility changes.

The checklist says alert state stays current. That claim needs testing.

### Required verification

Test this flow:

1. User becomes eligible.
2. Alert is created.
3. User profile changes and eligibility changes.
4. Existing alert should update or become stale/inactive as intended.

---

## 8. Mission-control dashboard findings

### Completed

Dashboard page fetches and passes:

- dashboard data
- eligible recruitments
- notifications
- study plans
- chat sessions
- next actions
- today’s tasks
- mission-control data

`getMissionControlData()` queries:

```text
user_recruitment_state
```

It returns empty data if the view is missing or query fails.

### Good

This protects dashboard rendering during rollout.

### Risk

Silent fallback can hide database or migration errors.

### Required improvement

Keep user-facing fallback, but log server-side errors in development/admin diagnostics.

---

## 9. Telemetry findings

### Completed

`POST /api/events` exists and validates:

- `entity_type`
- `entity_id`
- `event_type`
- `metadata`

It writes to:

```text
user_events
```

### Gap

`entity_id` only checks non-empty string. It does not validate UUID.

### Required improvement

For recruitment, alert, and marketplace events, validate UUID format where applicable.

---

## 10. Domain model findings

The domain model is clear and correct:

```text
Database = recruitment
Frontend language = exam
Foreign key = recruitment_id
Avoid = public.exams
```

Current docs correctly say:

- `public.recruitments` is canonical.
- `exam` is allowed in UI language.
- `public.exams` should not be created unless a future decision explicitly introduces it.

No active app/action/lib usage of `from("exams")` or `public.exams` was found in the reviewed search results.

### Verdict

Domain direction is good. Keep enforcing this through CI grep checks.

---

## 11. Completed vs future actions

### Completed / mostly completed

| Item | Status |
|---|---|
| Next.js + Supabase foundation | Done |
| Package scripts | Done |
| CI lint/typecheck/test/db lint | Mostly done |
| Domain model docs | Done |
| Operational runbook | Done |
| RBAC helper | Done |
| Source actions permission guard | Done |
| Audit logging helper | Done |
| Notification preferences API | Done |
| Notification preferences UI | Done |
| Notification governance page | Done |
| Mission-control fetcher | Done |
| Dashboard mission-control wiring | Done |
| Telemetry API | Done |
| Eligibility runner | Done |

### Partially completed

| Item | Gap |
|---|---|
| Full RBAC enforcement | Some broad `requireAdmin()` checks remain |
| Organization RBAC | `orgs` vs `organizations` mismatch |
| Audit coverage | Not all admin mutations are logged |
| CI release gate | Missing `npm run build` |
| Notification kill switch | Dispatcher enforcement needs verification |
| Alert state updates | Needs test for eligibility changes |
| Root README | Stale doc paths |
| Implementation checklist | Duplicate/stale sections |

### Future work

| Item | Status |
|---|---|
| Source URL verification console | Future |
| Domain verification tool | Future |
| Redirect/content-type inspection | Future |
| Recruitment publish gate validation | Future |
| Recruitment version history | Future |
| Change diff viewer | Future |
| Dead-letter eligibility queue | Future |
| Rule version tracking | Future |
| Eligibility explanation inspector | Future |
| AI runtime policy enforcement | Future |
| Marketplace trust filters | Future |
| Community/mentorship module | Future |
| Topic proficiency and spaced repetition | Future |

---

## 12. Priority action plan

### P0 — release truth cleanup

1. Fix root README doc links.
2. Clean duplicate/stale checklist sections.
3. Add `npm run build` to CI.
4. Fix `orgs` vs `organizations` permission mismatch.
5. Replace remaining broad `requireAdmin()` checks.
6. Verify notification kill switch is enforced in dispatcher.
7. Verify alert state update behavior.

### P1 — governance hardening

1. Add audit logging to all admin mutations.
2. Add UUID validation to telemetry where required.
3. Add publish gate validation.
4. Add eligibility dead-letter view.
5. Add source verification tools.

### P2 — product expansion

1. Add eligibility explanation layer.
2. Add semantic search sync job.
3. Expand marketplace trust model.
4. Build community/mentorship MVP.
5. Add deeper study analytics.

---

## 13. Final verdict

Career Copilot has strong architecture direction and meaningful implementation already present.

The main risk is not missing code alone. The bigger risk is **documentation drift**: agents may trust checklist claims that are only partially true.

Best next PR:

```text
docs+governance: align implementation checklist with actual codebase
```

Recommended contents of that PR:

- README path fixes
- checklist cleanup
- CI build check
- RBAC permission-name fix
- broad admin guard replacement
- dispatcher kill-switch verification
- audit coverage improvements
