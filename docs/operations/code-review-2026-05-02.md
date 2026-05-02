# Code Review — Implementation vs Documentation

_Date: 2026-05-02_

## Scope

This review compares current implementation behavior against the documented operating requirements in:

- `docs/00-ai-context.md`
- `docs/operations/implementation-checklist.md`
- `docs/engineering/domain-model.md`
- `docs/operations/runbook.md`

## Executive summary

The codebase has strong directionally-correct governance intent, but there are high-confidence execution gaps between docs and runtime health:

1. **Release verification gate is currently failing** (lint/typecheck/build), so current state is not releasable under runbook criteria.
2. **Admin authorization still uses legacy `is_admin` gating in layout/UI paths**, which conflicts with the docs' stronger role-based enforcement objective.
3. **Notifications page has unresolved compile defects** (`ALERT_ICONS`, `timeAgo`) that directly contradict checklist claims around completed notification UX hardening.

## Findings

### 1) Verification gate mismatch (P0)

Docs require lint/typecheck/test/build to pass before completion. Current implementation fails lint, typecheck, and build.

- **Lint** fails with 8 errors (notably `no-explicit-any`) in admin/community paths.
- **Typecheck** fails in `app/dashboard/notifications/page.tsx`.
- **Build** fails due to Google Font fetch errors in `app/layout.tsx` import chain (environment/network-sensitive, but still a failing gate).
- **Tests** pass.

Impact:

- The checklist and runbook define these commands as mandatory verification; failing these indicates doc/process divergence and CI risk.

### 2) RBAC documentation intent vs layout-level legacy guard (P1)

Implementation checklist notes legacy `is_admin` remains in admin layout as acceptable route-level compatibility. The code confirms admin layout currently blocks by `profile?.is_admin`.

- `app/admin/layout.tsx` enforces `if (!profile?.is_admin) redirect("/dashboard")`.

Impact:

- This is weaker than permission-bucket semantics (`requireAdminRole`) and can diverge from server-action level policy granularity.
- Documentation already flags this as partial; code review confirms the gap is real and still active.

### 3) Notification UX claims vs compile-time regressions (P0/P1)

Checklist claims completed updates to notification cards and explanation features. However, notifications page cannot typecheck because referenced symbols are missing.

- `app/dashboard/notifications/page.tsx` references `ALERT_ICONS` and `timeAgo` with unresolved identifiers.

Impact:

- User-facing notification page stability is currently broken at compile time, blocking confidence in Sprint 8 notification claims.

### 4) Domain model adherence check (Good)

Regression grep confirms there are no active runtime queries to an `exams` table in application code paths; only a cautionary migration comment references `public.exams`.

Impact:

- Canonical rule (`Database = recruitment`, avoid `public.exams`) appears preserved in active code paths.

### 5) Governance regression signal: scattered `is_admin` references remain (Expected but should reduce)

Search results show multiple `is_admin` references in admin RBAC/profile-related files and dashboard props.

Impact:

- Not all references are authorization violations, but the surface area increases risk of accidentally re-introducing boolean-based auth patterns.

## Priority recommendations

1. **Restore green verification pipeline first**: fix `no-explicit-any` errors and notification page type errors; then re-run full gate.
2. **Harden admin layout gate**: prefer permission-aware role checks (or at minimum role-or-legacy fallback encapsulated in shared utility) over direct `profile?.is_admin` checks.
3. **Add checklist truth discipline**: when features are marked done in checklist, require successful typecheck/build snapshot in the same PR.
4. **Keep domain guardrails in CI**: retain/expand grep checks to prevent `public.exams` regressions and direct admin boolean auth regressions.

## Evidence commands run

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
grep -R "public.exams\|from(\"exams\"\|from('exams'" app actions lib supabase --exclude-dir=node_modules || true
grep -R "is_admin\|profile?.is_admin" app actions lib components --exclude-dir=node_modules || true
```
