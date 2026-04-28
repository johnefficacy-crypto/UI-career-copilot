# Career Copilot implementation status checklist
_Last updated: 2026-04-28_

This file is the single source of truth for implementation status and next build decisions.
Legend:
- Priority: P0 = block release / trust / correctness, P1 = next sprint, P2 = strategic follow-up
- Effort: S = <=1 day, M = 2-4 days, L = 1+ weeks
- Owner: frontend / backend / infra / ops / AI / QA
- Status: [ ] not started, [~] in progress, [x] done

## P0 release blockers

- [ ] Drop legacy blind-notification trigger and enforce engine-only alert creation
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/migrations/020_drop_legacy_recruitment_open_trigger.sql` (new)
    - `supabase/migrations/scraping_setup.sql` (reference only; do not edit historical migration)
    - `lib/db/notifications.ts`
  - Suggested PR title: `fix(db): remove legacy recruitment-open trigger and enforce engine-only alerts`

- [ ] Tighten service-role RLS policies for notification preferences, alerts, and audit log
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/migrations/021_fix_service_role_policies.sql` (new)
    - `supabase/migrations/014_notification_preferences.sql` (reference only)
    - `supabase/migrations/019_admin_rbac_audit.sql` (reference only)
  - Suggested PR title: `fix(rls): restrict service policies to service_role and narrow admin access`

- [ ] Fix email dispatcher to read from feed view and derive subject/body
  - Effort: S
  - Owner: backend
  - Paths:
    - `supabase/functions/email-dispatcher/index.ts`
    - `types/notifications.ts`
  - Suggested PR title: `fix(email): read notification feed view and derive email copy safely`

- [ ] Make eligibility queue claiming atomic and add retry metadata
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/022_claim_eligibility_queue_rpc.sql` (new)
    - `supabase/functions/eligibility-consumer/index.ts`
  - Suggested PR title: `fix(queue): atomically claim eligibility jobs with retry fields`

- [ ] Make recruitment promotion transactional
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/023_admin_promote_recruitment_payload.sql` (new)
    - `[UNSPECIFIED] grep for promoteToRecruitments and approveScrapeItem`
  - Suggested PR title: `fix(scraper): promote approved scrape payloads transactionally`

- [ ] Update notification upsert behavior so alert state stays current
  - Effort: M
  - Owner: backend
  - Paths:
    - `supabase/migrations/024_notification_alert_state_uniqueness.sql` (new)
    - `lib/db/notifications.ts`
    - `[UNSPECIFIED] grep for runEligibilityForUser`
  - Suggested PR title: `fix(alerts): upsert current alert state instead of ignoring duplicates`

- [ ] Replace boolean admin checks in source actions with permission-based RBAC
  - Effort: S
  - Owner: backend
  - Paths:
    - `actions/sources.ts`
    - `lib/db/admin.ts`
  - Suggested PR title: `fix(admin): use requireAdminRole for source actions`

- [ ] Ship mission-control dashboard v1 on top of a unified user_recruitment_state view
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `supabase/migrations/025_user_recruitment_state.sql` (new)
    - `app/dashboard/page.tsx` or `[UNSPECIFIED] current dashboard route`
    - `app/api/dashboard/mission-control/route.ts` (new, if App Router)
    - `components/dashboard/*` (new)
  - Suggested PR title: `feat(dashboard): launch mission-control dashboard powered by user state view`

- [ ] Launch notification preferences page before broad email rollout
  - Effort: M
  - Owner: frontend
  - Paths:
    - `app/dashboard/notifications/preferences/page.tsx` or `[UNSPECIFIED] route to create`
    - `app/api/notifications/preferences/route.ts`
  - Suggested PR title: `feat(notifications): add user preferences page and save API`

- [ ] Add minimum CI gate for lint, typecheck, tests, and Supabase DB lint
  - Effort: S
  - Owner: infra + QA
  - Paths:
    - `.github/workflows/ci.yml` (new or update)
  - Suggested PR title: `ci: add app and database verification gates`

## P1 next sprint

- [ ] Redesign recruitment detail page around actionability and explanation
  - Effort: L
  - Owner: frontend
  - Paths:
    - `[UNSPECIFIED] recruitment detail route`
    - `components/recruitments/StatusPanel.tsx` (new)
    - `components/recruitments/Timeline.tsx` (new)
  - Suggested PR title: `feat(recruitments): redesign detail page with status, evidence, and timeline`

- [ ] Add profile impact module to show fields that unlock more opportunities
  - Effort: M
  - Owner: frontend + backend
  - Paths:
    - `app/api/dashboard/profile-impact/route.ts` (new)
    - `components/dashboard/ProfileImpactCard.tsx` (new)
  - Suggested PR title: `feat(profile): show missing fields and unlock impact`

- [ ] Upgrade exams page from official-URL-only view to summary cards
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `app/dashboard/exams/page.tsx`
    - `app/api/exams/summary/route.ts` (new)
    - `supabase/migrations/026_exam_summary_support.sql` (new)
  - Suggested PR title: `feat(exams): add personalized exam summary cards and fit states`

- [ ] Add telemetry tables and event ingestion endpoint
  - Effort: M
  - Owner: backend + frontend
  - Paths:
    - `supabase/migrations/027_user_events_and_form_submissions.sql` (new)
    - `app/api/events/route.ts` (new)
  - Suggested PR title: `feat(telemetry): add user event pipeline for ranking and UX signals`

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
    - `docs/runbook.md` (new)
  - Suggested PR title: `docs: align repo documentation with current implementation and ops`

## P2 strategic follow-up

- [ ] Add semantic search and embeddings for recruitments and exams
  - Effort: L
  - Owner: AI + backend
  - Paths:
    - `supabase/migrations/028_embeddings.sql` (new)
    - `jobs/embeddings-sync.ts` (new)
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
    - `supabase/migrations/029_apply_tracker.sql` (new)
    - `app/dashboard/tracker/page.tsx` (new)
  - Suggested PR title: `feat(tracker): add saved and applied opportunity tracking`

- [ ] Expand marketplace filters and trust models
  - Effort: L
  - Owner: frontend + backend
  - Paths:
    - `[UNSPECIFIED] marketplace routes and schema`
  - Suggested PR title: `feat(marketplace): add trust-aware filters and personalized recommendations`
