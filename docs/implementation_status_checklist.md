# Career Copilot implementation status checklist
_Last updated: 2026-04-29_

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
    - `supabase/migrations/022_drop_legacy_recruitment_open_trigger.sql` ✓

- [x] Tighten service-role RLS policies for notification preferences, alerts, and audit log
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/migrations/023_fix_service_role_policies.sql` ✓ (table name: `admin_audit_logs` not `admin_audit_log`)

- [x] Fix email dispatcher to read from feed view and derive subject/body
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/functions/email-dispatcher/index.ts` ✓ FeedRow type + buildSubject/buildBody; query switched to v_notification_feed

- [x] Make eligibility queue claiming atomic and add retry metadata
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/024_claim_eligibility_queue_rpc.sql` ✓
    - `supabase/functions/eligibility-consumer/index.ts` ✓ uses claim_eligibility_queue RPC + exponential backoff

- [x] Make recruitment promotion transactional
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/025_admin_promote_recruitment_payload.sql` ✓
  - Notes: `admin_promote_recruitment_payload` RPC wiring into approveScrapeItem is P1 follow-up

- [x] Update notification upsert behavior so alert state stays current
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/026_notification_alert_state_uniqueness.sql` ✓
    - `lib/db/notifications.ts` ✓ upsertNotificationAlerts() added

- [x] Replace boolean admin checks in source actions with permission-based RBAC
  - Effort: S
  - Owner: backend
  - Paths:
    - `actions/sources.ts` ✓ all guards replaced with requireAdminRole("sources")

- [x] Add telemetry tables and event ingestion endpoint
  - Effort: M
  - Owner: backend + frontend
  - Paths:
    - `supabase/migrations/027_user_events_and_form_submissions.sql` ✓ (must run BEFORE 028)
    - `app/api/events/route.ts` ✓

- [x] Ship mission-control dashboard v1 on top of a unified user_recruitment_state view
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `supabase/migrations/028_user_recruitment_state.sql` ✓ materialized view
    - `lib/db/mission-control.ts` ✓ queries user_exam_summary (migration 029 view)
    - `app/api/dashboard/mission-control/route.ts` ✓ REST API
    - `components/dashboard/MissionControlPanel.tsx` ✓ summary cards + tabs + opportunity feed
    - `app/dashboard/page.tsx` ✓ getMissionControlData in parallel fetch
    - `components/dashboard/DashboardShell.tsx` ✓ EligibleRecruitmentsWidget replaced
  - Notes:
    - `getMissionControlData` queries `user_exam_summary` (not `user_recruitment_state` directly)
      because the join view has both eligibility signals and recruitment metadata.
    - Run `REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;` after each eligibility recompute.

- [x] Launch notification preferences page before broad email rollout
  - Effort: M
  - Owner: frontend
  - Paths:
    - `app/api/notifications/preferences/route.ts` ✓ GET + POST
    - `app/dashboard/notifications/preferences/page.tsx` ✓ UI page built

- [x] Add minimum CI gate for lint, typecheck, tests, and Supabase DB lint
  - Effort: S
  - Owner: infra + QA
  - Paths:
    - `.github/workflows/ci.yml` ✓

## P1 next sprint

- [x] Redesign recruitment detail page around actionability and explanation
  - Effort: L
  - Owner: frontend
  - Paths:
    - `app/dashboard/recruitments/[id]/page.tsx` ✓ full redesign (Phase 4)
    - `components/recruitments/StatusPanel.tsx` ✓ created
    - `components/recruitments/Timeline.tsx` ✓ created (visual milestones: notification → apply opens → apply closes)
    - `components/recruitments/ApplyButton.tsx` ✓ created (client component, fires apply_click telemetry)
  - Notes: Full redesign ships: Timeline, salary details table, vacancies breakdown by category/state, ApplyButton with telemetry, initialClicked from user_exam_summary.clicked_apply. Syllabus is Phase 5 (no schema yet).

- [x] Wire admin_promote_recruitment_payload RPC into approveScrapeItem
  - Effort: S
  - Owner: backend
  - Paths:
    - `lib/db/notifications.ts` ✓ approveScrapeItem() calls admin_promote_recruitment_payload RPC; falls back to promoteToRecruitments() on RPC error
  - Notes: Migration 025 RPC is now the primary promotion path. TypeScript fallback preserved for schema mismatch safety.

- [x] Wire upsertNotificationAlerts into runEligibilityForUser
  - Effort: S
  - Owner: backend
  - Paths:
    - `lib/eligibility/runner.ts` ✓ step 6 replaced — calls upsertNotificationAlerts() with ignoreDuplicates:false; priority 3=eligible, 2=conditional

- [x] Upgrade exams page to show personalized eligibility badges
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `app/dashboard/exams/page.tsx` ✓ overlays eligibility from user_exam_summary in parallel fetch
    - `app/api/exams/summary/route.ts` ✓ fixed to use user_exam_summary (correct view name + columns)
    - `supabase/migrations/029_exam_summary_support.sql` ✓ exam_summary + user_exam_summary views
    - `lib/exams/form-status.ts` ✓
  - Notes:
    - "exam" is a UI/product term. Database queries use `public.recruitments` and `recruitment_id`.
    - See `docs/database-domain-model.md`.

- [ ] Add profile impact module to show fields that unlock more opportunities
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `app/api/dashboard/profile-impact/route.ts` (new)
    - `components/dashboard/ProfileImpactCard.tsx` (new)

- [ ] Add admin tools: source registry UI, queue monitor, scraper monitor, audit viewer, RBAC manager
  - Effort: L
  - Owner: frontend + backend + ops
  - Paths:
    - `app/admin/sources/page.tsx`
    - `app/admin/scraper/page.tsx`
    - `app/admin/eligibility-queue/page.tsx`
    - `app/admin/audit/page.tsx`
    - `app/admin/rbac/page.tsx`
    - `app/api/admin/*`

- [x] Refresh docs to match real product and release criteria
  - Effort: S
  - Owner: ops
  - Paths:
    - `docs/implementation_status_checklist.md` ✓ this file
    - `docs/database-domain-model.md` ✓ created (recruitment vs exam canonical rule)
    - `docs/runbook.md` ✓ created

## P2 strategic follow-up

- [~] Add semantic search and embeddings for recruitments and exams
  - Effort: L
  - Owner: AI + backend
  - Paths:
    - `supabase/migrations/030_embeddings.sql` ✓ pgvector table + ivfflat index
    - `jobs/embeddings-sync.ts` (pending — ETL sync job)

- [ ] Add ranking v1 using eligibility, urgency, and behavioral telemetry
  - Effort: L
  - Owner: AI + backend
  - Paths:
    - `lib/ranking/*` (new)
    - `app/api/dashboard/mission-control/route.ts`
  - Notes: user_events (migration 027) and user_recruitment_state (028) provide the signal tables.

- [ ] Add deterministic-to-LLM explanation layer with provenance
  - Effort: M
  - Owner: AI + backend
  - Paths:
    - `lib/explanations/*` (new)
    - `app/api/explanations/route.ts` (new)

- [ ] Add apply tracker and saved/apply lifecycle
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `supabase/migrations/031_apply_tracker.sql` (new)
    - `app/dashboard/tracker/page.tsx` (new)

- [ ] Expand marketplace filters and trust models
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `[UNSPECIFIED] marketplace routes and schema`

## Migration apply order (027–030)

Run in this exact order — dependency chain is strict:

```
027_user_events_and_form_submissions.sql   ← telemetry tables (no dependencies)
028_user_recruitment_state.sql             ← mat view; depends on user_events (027)
029_exam_summary_support.sql               ← views; depends on user_recruitment_state (028)
030_embeddings.sql                         ← independent; requires pgvector extension
```

After applying 027–028, run:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;
```
