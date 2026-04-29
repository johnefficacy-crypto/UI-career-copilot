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
