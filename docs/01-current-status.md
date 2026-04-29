# Career Copilot — Current Status

_Last updated: 2026-04-29_

This file is a short human-readable status snapshot. The detailed source of truth remains `docs/implementation_status_checklist.md`.

## Product state

Career Copilot is moving from a notification and eligibility platform into a broader aspirant operating system covering official recruitment discovery, eligibility, alerts, applications, study execution, exam intelligence, marketplace/resources, and community.

## Stable or mostly built

- Next.js App Router project foundation.
- Supabase-backed application architecture.
- Source registry model and admin surfaces.
- Scheduled scraper foundation.
- Recruitment/post/organization canonical model.
- Deterministic eligibility engine foundation.
- Notification alerts foundation.
- Study planner foundation.
- Design system direction and Claude frontend UI kit.

## Partial / needs hardening

- RBAC model exists, but enforcement is not complete across all admin routes and server actions.
- Admin audit logging exists, but admin audit viewer is missing.
- Eligibility recompute queue exists, but admin monitor/retry/dead-letter tooling is missing.
- Notifications have preferences/email-dispatcher foundations, but governance tooling is missing.
- Source registry is operational, but URL/domain/source verification console is missing.
- Recruitment management works, but formal workflow states and publish gates are missing.
- AI/product strategy docs exist, but AI governance/action policy is not fully implemented.

## Current P0 sequence

1. Verify latest changes are pushed and buildable.
2. Run lint/typecheck/test/build.
3. Complete full RBAC enforcement.
4. Build `/admin/audit` viewer.
5. Build `/admin/eligibility-queue` monitor.
6. Only then expand automation.

## P1 sequence after governance

1. Source verification console.
2. Recruitment workflow gating.
3. Organization verification console.
4. Notification governance console.
5. AI action policy layer.

## P2 product expansion

1. Application/form tracker.
2. Post-application preparation workflow.
3. Exam-fit ranking.
4. Exam intelligence schema and pages.
5. Study performance analytics.
6. Community and mentorship MVP.

## Known high-risk regressions to avoid

- Reintroducing `public.exams` as a canonical table.
- Treating `clicked_apply` telemetry as proof of submitted application.
- Broadcasting `new_match` alerts without deterministic eligibility verdicts.
- Publishing AI-extracted recruitment data without official evidence and review.
- Letting UI-only admin visibility substitute for server-action permission enforcement.
- Treating aggregator sources as recruiting organizations or user-facing canonical URLs.

## Current truth hierarchy

When docs disagree, use this order:

1. Current code and migrations.
2. `docs/implementation_status_checklist.md`.
3. `docs/runbook.md`.
4. `docs/database-domain-model.md`.
5. ADRs under `docs/decisions/`.
6. Module docs under `docs/modules/`.
7. Product strategy docs.
8. Archived phase reports and chat summaries.

Historical reports preserve context, but they should not override current code, the checklist, runbook, domain model, or ADRs.
