# Career Copilot — Implementation Status Checklist

_Last updated: 2026-05-01 — Sprint 8 trust-redesign spec merged; implementation pending_

This file is the current implementation status and build-decision checklist. Historical sprint reports and older implementation notes live under `docs/history/`. For detailed Sprint 8 design, read [`docs/operations/dashboard-notification-trust-redesign.md`](dashboard-notification-trust-redesign.md).

---

## Legend

| Marker | Meaning |
|---|---|
| `[x]` | Done and merged |
| `[~]` | Partial / exists but not hardened |
| `[ ]` | Not started |

| Priority | Meaning |
|---|---|
| P0 | Blocks trust, release correctness, or automation safety |
| P1 | Next sprint / product hardening |
| P2 | Strategic follow-up |

---

## Governing rules

Career Copilot is an **eligibility-first, recruitment-canonical exam preparation operating system**.

Non-negotiables:

```text
Trust > Speed
Control > Automation
Determinism > Heuristics
```

Domain rules:

```text
Database entity  = recruitment        (public.recruitments)
Frontend label   = exam               (UI/product language only)
Foreign key      = recruitment_id
Avoid            = public.exams
```

Eligibility verdicts must come from deterministic rules. AI may extract, summarize, explain, or recommend, but it must not publish official facts, verify organizations, assign canonical URLs, or override eligibility.

---

## Current high-level state

### Done and operational

- [x] Eligibility engine foundation: age, category, education, domicile, PwBD, ex-serviceman, attempts, appearing-candidate.
- [x] Engine-only notification creation: legacy blind-broadcast path removed.
- [x] Mission-control dashboard v1 using `user_recruitment_state`.
- [x] `/dashboard/exams` summary cards with eligibility badges.
- [x] Recruitment detail page with timeline/status/apply surface.
- [x] Apply tracker with durable application state.
- [x] Study OS foundation: focus timer, daily tasks, mock-test log, subject breakdowns, weekly review.
- [x] Ranking v1: eligibility × urgency × organization trust × behavior signals.
- [x] Notification preferences, templates, email dispatcher, and governance console.
- [x] Admin governance: RBAC, audit viewer, eligibility queue monitor, RBAC manager, AI policy UI.
- [x] Scraper/source governance: source registry, queue review, source health, evidence approval.
- [x] CI gate exists for lint, typecheck, tests, build, and database lint.
- [x] Docs restructured into `product/`, `engineering/`, `operations/`, and `history/`.

### Important known gaps

- [ ] Score-gated and credential-gated recruitments are not yet fully represented in eligibility logic.
- [ ] `GATE`/`NET`/`CTET`/`TET`/certificate requirements are not yet first-class eligibility dimensions.
- [ ] Deadline-derived status and DB lifecycle status are not yet fully separated in all user-facing surfaces.
- [ ] Notification grouping by `(user_id, recruitment_id)` is not yet implemented.
- [ ] Notification cards do not yet show full match breakdown, missing criteria, and feedback/report actions.
- [ ] StatsBar still needs replacement with a collapsible low-distraction command strip.
- [ ] Profile-impact routing must point to exact onboarding steps, not generic `/onboarding`.
- [ ] Education Authority & Grading Registry is planned but not implemented.
- [ ] Rule versioning/corrigendum pipeline is planned but not implemented.
- [ ] Community, study groups, accountability partners, mentor marketplace, PYQ intelligence, WhatsApp, and mobile wellbeing are not implemented.

---

## Sprint 8 — Dashboard, Notification & Eligibility Trust Redesign

Status: **spec merged; implementation not started**.

Reference: [`docs/operations/dashboard-notification-trust-redesign.md`](dashboard-notification-trust-redesign.md)

### Sprint 8 planning

- [x] Create and merge Sprint 8 trust-redesign PRD/spec.
- [x] Align spec with product vision: action-oriented dashboard, deterministic eligibility, official-source-first trust, low-distraction UX.
- [x] Confirm college/institute name is optional; degree-awarding university/board/authority is the eligibility-relevant field.
- [x] Define Education Authority, Program, Credential & Grading Registry concept.
- [x] Define stream-wise pathway registry as advisory only, not final eligibility.
- [x] Define rule-versioning pipeline for corrigenda and changing criteria.

### P0 — Trust and correctness implementation

- [ ] Add credential-aware eligibility support while keeping `lib/eligibility/engine.ts` pure and testable.
  - Fetch DB records in `lib/eligibility/runner.ts` or data loaders.
  - Pass structured `required_exam_credentials` and user credentials into the engine.
  - Do not add Supabase calls to `engine.ts`.
- [ ] Add post-aware credential requirement model.
  - Requirements may apply to a whole recruitment or a specific post/discipline.
  - Use `recruitment_id` and nullable `post_id`.
- [ ] Add aspirant exam/credential storage for GATE, NET, SET, CTET, TET, professional registrations, and certificates.
- [ ] Add `needs_profile_data` verdict or equivalent status without breaking existing `is_eligible` / `is_conditional` consumers.
- [ ] Keep `deadline_status` separate from eligibility verdict.
  - `closed` must be derived from `apply_end_date`, not blindly from DB lifecycle status.
- [ ] Replace misleading user-facing “New exam match” copy with typed labels:
  - Confirmed match
  - Potential match — required data missing
  - Conditionally eligible
  - Not eligible
  - Closed — track next cycle
- [ ] Replace static StatsBar with collapsible LiveStatsBar.
  - Collapsed default: eligible now, potential matches, closing soon, study today.
  - Expanded: missing fields, opportunity list, study/focus details.
  - Mobile default must be collapsed.
- [ ] Remove `ProfileCard` from main dashboard surface.
  - Profile identity belongs in nav/profile page, not prime mission-control space.
- [ ] Fold profile readiness/impact into LiveStatsBar or expandable profile-readiness drawer.
- [ ] Route missing-field CTAs to exact onboarding sections.
  - GATE/NET/CTET/etc. → exam credentials.
  - Certificates → certifications.
  - DOB/category/domicile/PwBD → identity.
  - Education/stream/marks → education.
- [ ] Group notifications by `(user_id, recruitment_id)`.
  - Prefer a grouped view/materialized view first unless mutable state is proven necessary.
- [ ] Add user feedback capture for wrong match, stale deadline, broken official link, duplicate notification, and “already applied.”

### P1 — Decision layer and registry implementation

- [ ] Build notification decision cards.
  - Recruitment type badge.
  - Match status.
  - Match percentage with transparent criteria breakdown.
  - Matched / missing / failed criteria.
  - Deadline status.
  - Official notification/apply links.
  - Primary action and report issue controls.
- [ ] Add basic admin queue for recruitment feedback.
  - Resolution should call `logAdminAction` where available.
- [ ] Add Education Authority & Grading Registry.
  - Normalize universities, boards, open universities, ITI/NCVT/SCVT, technical/medical/law/teaching authorities, and professional councils.
  - Do not make college/institute name mandatory.
- [ ] Add safe CGPA/percentage handling.
  - Do not convert CGPA unless verified authority-specific grading rules exist.
  - Store scale, grading system, conversion rule, and conversion confidence.
- [ ] Add stream-wise pathway registry as advisory prompts only.
  - Engineering → GATE/ESE/AE/JE prompts.
  - Commerce/Finance → CA/CMA/CS/NISM/banking prompts.
  - Medical/Nursing/Pharmacy/Law/Teaching/ITI → relevant council/certificate prompts.
  - Pathway registry must not produce final eligibility verdicts.
- [ ] Fix `matched_exam` / `matched_sector` explanation flags so they are not hardcoded false.
- [ ] Fix profile-blocker summary logic so it counts resolvable missing fields, not merely conditional matches.

### P2 — Rule versioning and long-term trust pipeline

- [ ] Add eligibility rule versioning.
  - Official notification/corrigendum → extraction → evidence → admin verification → rule version → eligibility recompute → notification update.
- [ ] Add field-level rule evidence.
  - Source URL, page/snippet, extracted value, confidence, reviewer status.
- [ ] Add admin rule-verification UI for recruitment/post rules.
- [ ] Recompute eligibility when verified rules, deadline, credential requirement, or corrigendum data changes.
- [ ] Add source-quality / stale-deadline audits based on user reports.

---

## Release blockers before broad user rollout

- [ ] No expired recruitment should display as open in user-facing UI.
- [ ] No score-gated recruitment should show as confirmed match without required exam credential.
- [ ] No certificate-gated recruitment should show as confirmed match without required certificate/registration evidence.
- [ ] Notification cards must distinguish confirmed, potential, conditional, blocked, and closed states.
- [ ] Users must be able to report wrong match or stale deadline.
- [ ] Free vs paid eligibility visibility must match the product vision: free users get preview/limited visibility; paid users get exact post-wise reasons, deadlines, and official links.
- [ ] Official links must remain canonical; aggregator URLs must not be primary user-facing links.

---

## Completed implementation areas by module

### Admin governance

- [x] RBAC roles and permission buckets.
- [x] `requireAdminRole(permission)` enforcement across admin routes/actions.
- [x] Audit log utility and `/admin/audit` viewer.
- [x] RBAC manager at `/admin/rbac`.
- [x] AI policy table and `/admin/ai-policy` UI.
- [ ] Runtime AI policy enforcement across all AI actions.
- [ ] Audit export capability.

### Scraper and source operations

- [x] Source registry UI.
- [x] Queue review and scrape dashboard.
- [x] Source health/trust metadata.
- [x] Evidence review foundation.
- [ ] Source verification console.
- [ ] Domain/redirect/content-type verification tooling.
- [ ] Suspicious change detection and auto-throttle rules.

### Recruitment management

- [x] Admin recruitment list and detail workflow.
- [x] Transactional promotion RPC exists.
- [x] Publish workflow states: `draft`, `needs_review`, `verified`, `published`, `archived`, `withdrawn`.
- [x] Organization trust fields and verification action.
- [ ] Publish gate validation for official URL, organization verification, field completeness, and evidence coverage.
- [ ] Version history and diff viewer.

### Eligibility system

- [x] Deterministic engine foundation.
- [x] Recompute action and eligibility queue consumer.
- [x] Atomic queue claim RPC and retry metadata.
- [x] Eligibility queue admin monitor.
- [ ] External exam credential dimension.
- [ ] Certificate/registration credential dimension.
- [ ] Rule version tracking.
- [ ] Explanation inspector with provenance.
- [ ] Dead-letter view and failure diagnostics.

### Notifications

- [x] In-app notification feed and preferences.
- [x] Email dispatcher and templates.
- [x] Emergency kill switch.
- [x] Alert upsert state uniqueness.
- [ ] Grouped notification feed.
- [ ] Decision-card notification UI.
- [ ] Wrong-match/stale-deadline feedback loop.
- [ ] Audience preview and role-restricted send.

### User dashboard and exams

- [x] Mission-control dashboard v1.
- [x] `/dashboard/exams` summary page.
- [x] Recruitment detail page with timeline/status/apply CTA.
- [x] Apply tracker.
- [x] Profile impact card foundation.
- [ ] Collapsible LiveStatsBar.
- [ ] Dashboard recommendation/decision/action segmentation.
- [ ] Exact missing-field routing.
- [ ] ProfileCard removal from main dashboard.

### Study OS

- [x] Study planner foundation.
- [x] Daily tasks.
- [x] Focus timer.
- [x] Mock-test tracking with subject breakdowns.
- [x] Weekly review dashboard.
- [ ] Topic proficiency.
- [ ] Flashcards / spaced repetition.
- [ ] Mobile digital discipline / screen-time governance.

### Community and marketplace

- [ ] Exam/recruitment community spaces.
- [ ] Official updates channel separated from user discussion.
- [ ] Study groups and accountability partners.
- [ ] Mentor session marketplace.
- [ ] Resource library.
- [ ] Marketplace trust-aware filters and recommendations.

---

## Documentation status

- [x] `docs/00-ai-context.md`
- [x] `docs/product/vision.md`
- [x] `docs/product/roadmap.md`
- [x] `docs/product/community-platform.md`
- [x] `docs/engineering/domain-model.md`
- [x] `docs/engineering/ai-strategy.md`
- [x] `docs/engineering/source-intelligence.md`
- [x] `docs/operations/runbook.md`
- [x] `docs/operations/dashboard-notification-trust-redesign.md`
- [~] `docs/operations/implementation-checklist.md` — current file; keep updated at sprint boundaries and when architecture decisions change.
- [ ] Architecture diagram refresh.
- [ ] Admin operational playbooks.
- [ ] AI policy runtime playbook.

---

## Verification commands before marking implementation work complete

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Domain regression checks:

```bash
grep -R "public.exams\|from(\"exams\"\|from('exams'" app actions lib supabase --exclude-dir=node_modules || true
grep -R "is_admin\|profile?.is_admin" app actions lib components --exclude-dir=node_modules || true
```

Sprint 8 trust-specific checks:

```bash
grep -R "New exam match" components app --exclude-dir=node_modules || true
grep -R "from(\"exams\"\|from('exams'" app actions lib supabase --exclude-dir=node_modules || true
```

---

## Next build recommendation

Start Sprint 8 implementation with **P0 schema + engine + deadline-status groundwork**, not UI polish:

1. Preserve pure-engine architecture.
2. Add post-aware credential requirements.
3. Add aspirant exam credentials.
4. Add backward-compatible verdict/status migration.
5. Add deadline-status derivation.
6. Then wire dashboard/notification UI on top.
