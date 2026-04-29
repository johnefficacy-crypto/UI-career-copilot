# Career Copilot

Career Copilot is an eligibility-first government recruitment and exam-preparation operating system for Indian aspirants.

It is designed to help users discover official opportunities, verify eligibility, track deadlines, plan preparation, and eventually receive AI-assisted study, career, and application guidance.

## Current product principle

Career Copilot is not just a notification tracker. The product loop is:

```text
official recruitment discovery
→ deterministic eligibility check
→ personalized alerts and deadline tracking
→ application/form tracking
→ exam-specific preparation workflow
→ study execution and performance analytics
→ AI-assisted next actions
```

## Non-negotiable architecture rules

- `public.recruitments` is the canonical database entity for exam/recruitment notifications.
- `exam` is user-facing language only unless a future ADR introduces a separate exam-master model.
- Use `recruitment_id`, `organization_id`, and `post_id` for joins and automation.
- Do not create or reference `public.exams` to satisfy old migrations or UI language.
- Eligibility verdicts must come from deterministic logic.
- AI may propose, summarize, explain, classify, and triage. AI must not publish official records, verify organizations, override eligibility, or become the source of truth.
- Governance comes before automation: RBAC, audit visibility, and eligibility queue monitoring are P0.

## Start here

Read these files before making product, schema, admin, or AI changes:

1. [`docs/00-ai-context.md`](docs/00-ai-context.md) — compact context for ChatGPT, Claude, and other coding agents.
2. [`docs/implementation_status_checklist.md`](docs/implementation_status_checklist.md) — current implementation truth and P0/P1/P2 order.
3. [`docs/database-domain-model.md`](docs/database-domain-model.md) — canonical recruitment-vs-exam decision.
4. [`docs/runbook.md`](docs/runbook.md) — operations, migrations, scraper, eligibility, notification, and release checks.
5. [`docs/admin_automation_strategy.md`](docs/admin_automation_strategy.md) — governance-first admin and AI automation policy.
6. [`docs/feature-registry.md`](docs/feature-registry.md) — feature-to-code map for AI handoff and progress tracking.

Historical phase reports live under `docs/archive/` or are retained as redirect stubs. Do not treat old phase reports or chat summaries as current implementation truth.

## Development commands

Run these before considering a change complete:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

If local Next.js or TypeScript types behave strangely, check `docs/runbook.md` before applying workaround declarations.

## Migration order warning

The mission-control and exam-summary stack depends on telemetry first:

```text
027_user_events_and_form_submissions.sql
028_user_recruitment_state.sql
029_exam_summary_support.sql
```

Do not create `public.exams` as a workaround. Fix old code or migrations to use `public.recruitments`.

## Documentation model

This repo uses docs-as-code with an AI context layer:

```text
README.md                         project entry point
AGENTS.md                         coding-agent rules
CLAUDE.md                         Claude context manifest
docs/00-ai-context.md             compact current AI context
docs/implementation_status_checklist.md  current truth and priority order
docs/feature-registry.md          feature-to-code tracking map
docs/runbook.md                   operational procedures
docs/decisions/                   architecture decision records
docs/modules/                     module-level specs and playbooks
docs/archive/                     historical reports and chat summaries
```

When a feature changes, update the smallest relevant truth source: checklist, feature registry, runbook, ADR, or module doc. Avoid turning chat summaries into permanent source-of-truth documents.

## Local setup

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Environment variables depend on the active Supabase, AI, email, and billing integrations. Keep secrets out of committed docs and code.
