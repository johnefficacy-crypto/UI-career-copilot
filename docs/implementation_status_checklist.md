# Career Copilot implementation status checklist
_Last updated: 2026-04-29 — Sprint 1 complete_

This file is the single source of truth for implementation status and next build decisions.
Legend:
- Priority: P0 = block release / trust / correctness, P1 = next sprint, P2 = strategic follow-up
- Effort: S = <=1 day, M = 2-4 days, L = 1+ weeks
- Owner: frontend / backend / infra / ops / AI / QA
- Status: [ ] not started, [~] in progress, [x] done

## P0 release blockers

- [x] Drop legacy blind-notification trigger and enforce engine-only alert creation
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/migrations/022_drop_legacy_recruitment_open_trigger.sql` ✓ created
    - `supabase/migrations/scraping_setup.sql` (reference only; do not edit historical migration)
    - `lib/db/notifications.ts`
  - Suggested PR title: `fix(db): remove legacy recruitment-open trigger and enforce engine-only alerts`

- [x] Tighten service-role RLS policies for notification preferences, alerts, and audit log
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/migrations/023_fix_service_role_policies.sql` ✓ created
    - `supabase/migrations/014_notification_preferences.sql` (reference only)
    - `supabase/migrations/019_admin_rbac_audit.sql` (reference only)
  - Suggested PR title: `fix(rls): restrict service policies to service_role and narrow admin access`

- [x] Fix email dispatcher to read from feed view and derive subject/body
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/functions/email-dispatcher/index.ts` ✓ FeedRow type + buildSubject/buildBody added; query switched to v_notification_feed
    - `types/notifications.ts`
  - Suggested PR title: `fix(email): read notification feed view and derive email copy safely`

- [x] Make eligibility queue claiming atomic and add retry metadata
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/024_claim_eligibility_queue_rpc.sql` ✓ created
    - `supabase/functions/eligibility-consumer/index.ts` ✓ uses claim_eligibility_queue RPC + exponential backoff
  - Suggested PR title: `fix(queue): atomically claim eligibility jobs with retry fields`

- [x] Make recruitment promotion transactional
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/025_admin_promote_recruitment_payload.sql` ✓ created
    - Wire `admin_promote_recruitment_payload` RPC into `approveScrapeItem` / `promoteToRecruitments` callers
  - Suggested PR title: `fix(scraper): promote approved scrape payloads transactionally`

- [x] Update notification upsert behavior so alert state stays current
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/026_notification_alert_state_uniqueness.sql` ✓ created
    - `lib/db/notifications.ts` ✓ upsertNotificationAlerts() added
    - Wire `upsertNotificationAlerts` into `runEligibilityForUser` callers
  - Suggested PR title: `fix(alerts): upsert current alert state instead of ignoring duplicates`

- [x] Replace boolean admin checks in source actions with permission-based RBAC
  - Effort: S
  - Owner: backend
  - Paths:
    - `actions/sources.ts` ✓ all guards replaced with requireAdminRole("sources")
    - `lib/db/admin.ts`
  - Suggested PR title: `fix(admin): use requireAdminRole for source actions`

- [x] Full RBAC enforcement — replace is_admin checks across all admin routes and actions
  - Effort: M
  - Owner: backend
  - Paths:
    - `app/admin/eligibility/page.tsx` ✓ requireAdminRole("eligibility")
    - `app/admin/organizations/page.tsx` ✓ requireAdminRole("organizations")
    - `app/admin/recruitments/page.tsx` ✓ requireAdminRole("recruitments")
    - `app/admin/scrape/page.tsx` ✓ requireAdminRole("scraper")
    - `app/admin/sources/page.tsx` ✓ requireAdminRole("sources")
    - `app/admin/sources/guide/page.tsx` ✓ requireAdminRole("sources")
    - `actions/inspect-source.ts` ✓ local requireAdmin() replaced with imported requireAdminRole("sources")
  - Suggested PR title: `fix(rbac): enforce requireAdminRole across all admin routes and actions`

- [x] Add telemetry tables and event ingestion endpoint
  - Effort: M
  - Owner: backend + frontend
  - Paths:
    - `supabase/migrations/027_user_events_and_form_submissions.sql` ✓ created
    - `app/api/events/route.ts` ✓ created
  - Notes:
    - Telemetry must run before `user_recruitment_state` because the materialized view depends on `public.user_events`.
  - Suggested PR title: `feat(telemetry): add user event pipeline for ranking and UX signals`

- [x] Ship mission-control dashboard v1 on top of a unified user_recruitment_state view
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `supabase/migrations/028_user_recruitment_state.sql` ✓ created
    - `lib/db/mission-control.ts` ✓ server-side data fetcher
    - `app/api/dashboard/mission-control/route.ts` ✓ REST API
    - `components/dashboard/MissionControlPanel.tsx` ✓ summary cards + tabs + opportunity feed
    - `app/dashboard/page.tsx` ✓ wired — getMissionControlData in parallel fetch
    - `components/dashboard/DashboardShell.tsx` ✓ EligibleRecruitmentsWidget replaced
  - Notes:
    - Depends on `public.user_events`; keep this after telemetry migrations.
  - Suggested PR title: `feat(dashboard): launch mission-control dashboard powered by user state view`

- [x] Launch notification preferences page before broad email rollout
  - Effort: M
  - Owner: frontend
  - Paths:
    - `app/api/notifications/preferences/route.ts` ✓ GET + POST created
    - `app/dashboard/notifications/preferences/page.tsx` ✓ UI page created (Sprint 1)
  - Suggested PR title: `feat(notifications): add user preferences page and save API`

- [x] Add minimum CI gate for lint, typecheck, tests, and Supabase DB lint
  - Effort: S
  - Owner: infra + QA
  - Paths:
    - `.github/workflows/ci.yml` ✓ created
  - Suggested PR title: `ci: add app and database verification gates`

## P1 next sprint

- [x] Redesign recruitment detail page around actionability and explanation
  - Effort: L
  - Owner: frontend
  - Paths:
    - `app/dashboard/recruitments/[id]/page.tsx` ✓ Timeline wired
    - `components/recruitments/StatusPanel.tsx` ✓ created
    - `components/recruitments/Timeline.tsx` ✓ created — 5-stage visual timeline with live/done/upcoming states
  - Suggested PR title: `feat(recruitments): redesign detail page with status, evidence, and timeline`

- [x] Add profile impact module to show fields that unlock more opportunities
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `app/api/dashboard/profile-impact/route.ts` ✓ created — returns missing fields + estimated impact count
    - `components/dashboard/ProfileImpactCard.tsx` ✓ created — progress ring + impact rows wired into DashboardShell
  - Suggested PR title: `feat(profile): show missing fields and unlock impact`

- [x] Upgrade exams page from official-URL-only view to summary cards
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `app/dashboard/exams/page.tsx` ✓ wired to user_exam_summary view with eligibility badges; falls back to exam_summary if view has no rows
    - `app/api/exams/summary/route.ts` ✓ created
    - `supabase/migrations/029_exam_summary_support.sql` ✓ created
    - `lib/exams/form-status.ts` ✓ created
  - Notes:
    - `exam` is a UI/product term. Database queries must use `public.recruitments` and `recruitment_id`; do not assume `public.exams` exists.
    - See `docs/database-domain-model.md`.
  - Suggested PR title: `feat(exams): add personalized exam summary cards and fit states`

- [x] Launch notification preferences page before broad email rollout
  - Effort: M
  - Owner: frontend
  - Paths:
    - `app/api/notifications/preferences/route.ts` ✓ GET + POST created
    - `app/dashboard/notifications/preferences/page.tsx` ✓ created — email/in-app toggles, digest frequency, quiet hours, DPDP compliance note
  - Suggested PR title: `feat(notifications): add user preferences page and save API`

- [x] Add admin tools: source registry UI, queue monitor, scraper monitor, audit viewer, RBAC manager, notification governance
  - Effort: L
  - Owner: frontend + backend + ops
  - Paths:
    - `app/admin/sources/page.tsx` ✓ existing
    - `app/admin/scrape/page.tsx` ✓ existing
    - `app/admin/eligibility-queue/page.tsx` ✓ created (Sprint 2) — status tabs, paginated table, retry/error columns
    - `app/admin/audit/page.tsx` ✓ created (Sprint 2) — entity-type tabs, action color coding
    - `app/admin/rbac/page.tsx` ✓ created (Sprint 2) — super_admin role management
    - `app/admin/notifications/page.tsx` ✓ created (Sprint 3) — send logs, emergency kill switch, stat counts
    - `supabase/migrations/032_admin_settings.sql` ✓ created — key-value store for operational flags
    - `actions/admin.ts` ✓ adminUpdateAdminRole + toggleKillSwitch
    - `app/admin/layout.tsx` ✓ all pages in sidebar nav
    - `app/admin/page.tsx` ✓ quick links for all new pages
  - Suggested PR title: `feat(admin): add operational control surfaces for sources, queues, audit, and notifications`

- [ ] Refresh README and docs to match real product and release criteria
  - Effort: S
  - Owner: ops
  - Paths:
    - `README.md`
    - `docs/implementation_status_checklist.md`
    - `docs/database-domain-model.md` ✓ created
    - `docs/runbook.md` (new)
  - Suggested PR title: `docs: align repo documentation with current implementation and ops`

## P2 strategic follow-up

- [~] Add semantic search and embeddings for recruitments and exams
  - Effort: L
  - Owner: AI + backend
  - Paths:
    - `supabase/migrations/030_embeddings.sql` ✓ created (pgvector table + ivfflat index)
    - `jobs/embeddings-sync.ts` (pending — ETL sync job)
  - Notes:
    - Embeddings should use `recruitments` as the canonical entity. `exam` remains acceptable as a UI label.
  - Suggested PR title: `feat(ai): add vector embeddings for semantic retrieval`

- [ ] Add ranking v1 using eligibility, urgency, and behavioral telemetry
  - Effort: L
  - Owner: AI + backend
  - Paths:
    - `lib/ranking/*` (new)
    - `app/api/dashboard/mission-control/route.ts`
  - Suggested PR title: `feat(ranking): prioritize opportunities by fit, urgency, and behavior`

- [ ] Add deterministic-to-LLM explanation layer with provenance
  - Effort: M
  - Owner: AI + backend
  - Paths:
    - `lib/explanations/*` (new)
    - `app/api/explanations/route.ts` (new)
  - Suggested PR title: `feat(ai): generate human-friendly eligibility explanations with provenance`

- [x] Add apply tracker and saved/apply lifecycle
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `supabase/migrations/031_apply_tracker.sql` ✓ created — user_recruitment_applications table, RLS, enum
    - `lib/db/apply-tracker.ts` ✓ created — getUserApplications, getApplication, upsertApplication helpers
    - `actions/apply-tracker.ts` ✓ created — updateApplicationStatus, updateApplicationDetails server actions
    - `app/dashboard/tracker/page.tsx` ✓ created — filter tabs, status cards with inline status selector
    - `app/dashboard/recruitments/[id]/page.tsx` ✓ apply tracker CTA + status selector added
    - `components/dashboard/DashboardNav.tsx` ✓ Tracker nav link added
    - `components/nav/UserNav.tsx` ✓ Application Tracker mobile nav item added
  - Notes:
    - clicked_apply in user_events is telemetry only; this table is durable product state.
  - Suggested PR title: `feat(tracker): add durable application tracker with status lifecycle`

- [ ] Expand marketplace filters and trust models
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `[UNSPECIFIED] marketplace routes and schema`
  - Suggested PR title: `feat(marketplace): add trust-aware filters and personalized recommendations`
# Career Copilot — Implementation Status Checklist

_Last updated: 2026-04-29_

This checklist reflects the audited implementation state. It separates:

- route exists
- API exists
- UI exists
- permission enforced
- audit visible
- operationally hardened

Priority legend:

- P0 = blocks trust, release, or automation safety
- P1 = next sprint / operational hardening
- P2 = strategic product expansion

Status legend:

- [x] done
- [~] partial / exists but not hardened
- [ ] not implemented

## Governing rule

Career Copilot is an eligibility-first, recruitment-canonical system with human-supervised automation.

Automation expansion is blocked until these are complete:

1. Full RBAC enforcement
2. Admin audit viewer
3. Eligibility queue monitor

See `docs/admin_automation_strategy.md`.

---

## 1. Admin governance layer

### 1.1 RBAC

- [x] Roles defined: `super_admin`, `ops_admin`, `content_admin`, `scraper_admin`, `support_admin`
- [x] Permission buckets defined
- [x] `admin_audit_logs` table exists
- [x] `logAdminAction` utility exists
- [~] Some server actions use permission-based guards
- [ ] Full permission enforcement across all admin routes
- [ ] Full permission enforcement across all admin server actions
- [ ] Remove legacy `is_admin` checks from admin authorization paths
- [ ] Permission-based UI hiding for all admin actions
- [ ] Super-admin role management UI

Status: partial. The RBAC model exists, but enforcement is incomplete.

P0 next tasks:

- Search `app`, `actions`, `lib`, and `components` for `is_admin` authorization checks.
- Replace admin route checks with `requireAdminRole(permission)`.
- Replace admin mutation checks with `requireAdminRole(permission)`.
- Hide UI actions based on permissions.

### 1.2 Audit viewer

- [x] Audit table exists
- [x] Logging utility exists
- [ ] `/admin/audit` page
- [ ] Filter by admin/action/entity/time range
- [ ] Payload JSON inspector
- [ ] Pagination
- [ ] Export capability

Status: not operational. Audit data can be written but is not reviewable from the admin UI.

P0 next tasks:

- Build `app/admin/audit/page.tsx`.
- Build audit DB helper and table/filter/inspector components.
- Protect route with `requireAdminRole("audit")`.

---

## 2. Scraper and source operations

### 2.1 Source registry

- [x] Structured source metadata
- [x] Source health metadata
- [x] Trust score
- [x] Anti-bot risk tracking
- [x] Source registry page exists
- [~] Source actions partially permission guarded
- [ ] URL verification console
- [ ] Domain verification tool
- [ ] Redirect inspection
- [ ] Content-type detection
- [ ] Suspicious change detection
- [ ] Source testing sandbox

Status: operational but missing verification tooling.

### 2.2 Scrape dashboard

- [x] Queue pagination
- [x] Runs pagination
- [x] Source health snapshots
- [x] Stats overview
- [~] Evidence review exists for scrape queue items
- [ ] Anomaly detection
- [ ] Auto-throttle rules
- [ ] Policy-gated auto-approval

Status: operational, not automated-intelligent yet.

---

## 3. Recruitment management

- [x] Admin recruitment list
- [x] Scraper-origin visibility
- [x] Confidence indicators
- [x] Transactional promotion RPC exists
- [~] `admin_promote_recruitment_payload` wiring has been reported as implemented; verify on `master`
- [ ] Formal workflow states: `draft`, `needs_review`, `verified`, `published`, `archived`, `withdrawn`
- [ ] Publish gate validation
- [ ] Version history
- [ ] Change diff viewer

Status: functional, not workflow-governed.

P1 next tasks:

- Add publishing workflow separate from recruitment lifecycle status.
- Require organization verification, provenance, field completeness, and reviewer permission before publish.

---

## 4. Organization admin

- [x] Admin route exists
- [ ] Official domain verification
- [ ] Duplicate merge tool
- [ ] Trust classification
- [ ] Official domain whitelist
- [ ] Source count by organization

Status: basic only.

---

## 5. Eligibility system

- [x] Deterministic eligibility engine exists
- [x] Eligibility recompute action exists
- [x] Admin route exists
- [x] Atomic eligibility queue claim RPC exists
- [ ] `/admin/eligibility-queue` monitor
- [ ] Retry control UI
- [ ] Dead-letter view
- [ ] Rule version tracking
- [ ] Explanation inspector
- [ ] Failure diagnostics

Status: critical tooling missing.

P0 next tasks:

- Build eligibility queue monitor.
- Add retry and manual recompute actions.
- Audit-log all queue mutations.

---

## 6. Notifications

- [x] Notification preferences API exists
- [x] Notification preferences UI has been reported as implemented; verify on `master`
- [x] Email dispatcher exists
- [x] `upsertNotificationAlerts` helper exists
- [~] `upsertNotificationAlerts` wiring into `runEligibilityForUser` has been reported as implemented; verify on `master`
- [ ] Notification template editor
- [ ] Audience preview
- [ ] Send logs
- [ ] Emergency kill switch
- [ ] Role-restricted send

Status: user preferences are in progress; governance console not implemented.

---

## 7. AI governance layer

- [x] Base `ai_jobs` / `ai_review_queue` infrastructure exists from previous AI infrastructure migration
- [ ] AI action policy table
- [ ] Confidence thresholds per action
- [ ] Auto-action gating
- [ ] AI audit classification
- [ ] Human-review-required flag
- [ ] Admin UI for AI job/policy review

Status: not implemented as a governance layer.

P1 next tasks:

- Add `ai_action_policies`.
- Require every operational AI action to declare confidence, permission, review, and audit policy.

---

## 8. User-facing product surface

### 8.1 Dashboard and exams

- [x] Mission-control dashboard exists
- [~] Mission-control data-contract fix has been reported as implemented; verify on `master`
- [x] Exam/recruitment browse page exists
- [~] Eligibility badges on `/dashboard/exams` have been reported as implemented; verify on `master`
- [x] Recruitment detail route exists
- [~] Timeline/apply/salary/vacancy redesign has been reported as implemented; verify on `master`

Status: core surface exists; latest pushed state must be verified.

### 8.2 Application/Form tracker

- [ ] Durable application tracker table
- [ ] User-facing form status controls
- [ ] Application number storage
- [ ] Fee/payment fields
- [ ] Form submitted state distinct from telemetry click
- [ ] Dashboard summary for pending/submitted forms
- [ ] Next-actions integration

Status: not implemented.

Important rule:

```text
clicked_apply != form submitted
```

`clicked_apply` is telemetry only. Application status must be durable product state.

### 8.3 Study OS and performance analytics

- [x] Study planner foundation exists
- [x] Daily tasks foundation exists
- [x] Study sessions table exists
- [ ] Focus timer UI
- [ ] Mock-test tracking
- [ ] Subject/topic breakdown
- [ ] Topic proficiency
- [ ] Flashcards and spaced repetition
- [ ] Weekly review dashboard

Status: partial product foundation exists; analytics layer pending.

### 8.4 Community and mentorship

- [ ] Exam/recruitment community spaces
- [ ] Official updates channel separated from discussion
- [ ] Form-help channel
- [ ] Preparation/PYQ/mock discussion channels
- [ ] Mentorship/Q&A model
- [ ] Moderation/reporting

Status: not implemented.

---

## 9. Documentation integrity

- [x] `docs/database-domain-model.md`
- [x] `docs/admin_automation_strategy.md`
- [x] `docs/ai_automation_implementation_plan.md`
- [x] `docs/implementation_status_checklist.md` updated to distinguish route existence from operational hardening
- [ ] `docs/runbook.md`
- [ ] Architecture diagram refresh
- [ ] Admin operational playbooks
- [ ] AI policy playbook

Status: documentation improved; operational playbooks still needed.

---

## Mandatory priority order

### P0 — governance hardening

1. Verify latest Claude implementation is actually pushed to `master`.
2. Run lint/typecheck/test/build.
3. Full RBAC enforcement.
4. Admin audit viewer.
5. Eligibility queue monitor.

### P1 — operational hardening

6. Source verification console.
7. Recruitment workflow gating.
8. Organization verification console.
9. Notification governance.
10. AI action policy layer.

### P2 — product expansion

11. Application/Form tracker.
12. Post-application preparation workflow.
13. Exam-fit ranking.
14. Exam intelligence schema.
15. Study performance analytics.
16. Community/mentorship MVP.

---

## Migration/domain rules

Correct dependency order for the current mission-control/exam-summary stack:

```text
027_user_events_and_form_submissions.sql
028_user_recruitment_state.sql
029_exam_summary_support.sql
```

Canonical model rule:

```text
Database = recruitment
Frontend language = exam
Foreign key = recruitment_id
Avoid = public.exams
```

---

## Strategic rule

Automation expansion is blocked until RBAC enforcement, audit visibility, and eligibility queue monitoring are operational.

```text
Trust > Speed
Control > Automation
Determinism > Heuristics
```
