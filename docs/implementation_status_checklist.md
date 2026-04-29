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
  - Suggested PR title: `feat(admin): add operational control surfaces for sources, queues, and audit`

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

- [ ] Add apply tracker and saved/apply lifecycle
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `supabase/migrations/031_apply_tracker.sql` (new)
    - `app/dashboard/tracker/page.tsx` (new)
  - Notes:
    - Avoid reusing migration number `029`; it is reserved for exam summary support.
  - Suggested PR title: `feat/tracker): add saved and applied opportunity tracking`

- [ ] Expand marketplace filters and trust models
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `[UNSPECIFIED] marketplace routes and schema`
  - Suggested PR title: `feat(marketplace): add trust-aware filters and personalized recommendations`
