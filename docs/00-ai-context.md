# Career Copilot — AI Context

_Last updated: 2026-04-29_

This is the compact context file for ChatGPT, Claude, Codex, and any other AI coding assistant working on Career Copilot.

Career Copilot is an India-focused government exam and recruitment operating system for aspirants. It helps users discover official opportunities, verify profile-based eligibility, track deadlines, prepare strategically, and eventually receive personalized study, application, and career guidance.

## Read order for AI agents

Before editing code or producing implementation plans, read:

1. `AGENTS.md`
2. `docs/00-ai-context.md`
3. `docs/01-current-status.md`
4. `docs/feature-registry.md`
5. `docs/database-domain-model.md`
6. `docs/implementation_status_checklist.md`
7. `docs/runbook.md`
8. The relevant module document under `docs/modules/`

Historical phase reports and chat summaries are archived context only. Do not treat them as current implementation truth.

## Product loop

```text
official recruitment discovery
→ deterministic eligibility check
→ personalized alerts
→ application/deadline tracking
→ exam-specific preparation plan
→ study execution and performance analytics
→ community/mentorship support
→ adaptive next actions
```

## Non-negotiable domain rule

```text
Database = recruitment
Frontend language = exam
Foreign key = recruitment_id
Avoid = public.exams
```

- `public.recruitments` is canonical.
- `exam` is allowed as UI/product language only.
- Joins and foreign keys should use `recruitment_id`, `organization_id`, and `post_id`.
- Do not create `public.exams` to satisfy old code or migrations.
- See `docs/database-domain-model.md` and `docs/decisions/ADR-001-recruitments-are-canonical.md`.

## Governance rule

Career Copilot is an eligibility-first, recruitment-canonical system with human-supervised automation.

Current P0 engineering sequence:

```text
RBAC enforcement
→ admin audit viewer
→ eligibility queue monitor
→ source/recruitment/organization verification
→ notification governance
→ AI action policy layer
```

Automation expansion is blocked until RBAC enforcement, audit visibility, and eligibility queue monitoring are operational.

## AI boundary

AI may:

- propose changes,
- summarize source evidence,
- classify or extract candidate data,
- explain deterministic eligibility results,
- generate study or strategy suggestions from verified context.

AI must not independently:

- publish recruitments,
- verify organizations or official sources,
- override deterministic eligibility results,
- calculate final eligibility verdicts,
- bypass RBAC, audit, or human review,
- invent official dates, vacancies, cutoffs, PYQs, or source links.

See `docs/decisions/ADR-002-ai-is-assistant-not-authority.md`.

## Source trust rule

Official sources are canonical. Aggregators are discovery inputs only.

User-facing recruitment data should resolve to official notification/apply URLs wherever possible. Aggregator URLs may be used internally for discovery, missed-notification detection, and source expansion, but should not be presented as canonical truth to aspirants.

See `docs/source-intelligence-strategy.md` and `docs/decisions/ADR-003-official-sources-first.md`.

## Documentation maintenance rule

After meaningful code changes, update the smallest relevant truth document:

- progress/status: `docs/implementation_status_checklist.md`
- feature-to-code mapping: `docs/feature-registry.md`
- operational procedures: `docs/runbook.md`
- permanent architecture decisions: `docs/decisions/ADR-*.md`
- module-specific behavior: `docs/modules/*.md`

## Verification before marking work complete

Run or explicitly report inability to run:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Also check domain and governance regressions:

```bash
grep -R "public.exams\|from(\"exams\"\|from('exams'" app actions lib supabase --exclude-dir=node_modules || true
grep -R "is_admin\|profile?.is_admin" app actions lib components --exclude-dir=node_modules || true
```

## Strategic rule

```text
Trust > Speed
Control > Automation
Determinism > Heuristics
```
