# Career Copilot — AI Automation Implementation Plan

_Last updated: 2026-04-28_

## 1. Purpose

This document converts the product vision spread across the existing roadmap, source strategy, PYQ architecture, aspirant-personalization strategy, and Phase 3 implementation reports into a concrete AI automation implementation plan.

The goal is not to add AI everywhere. The goal is to use AI where it increases user value, admin productivity, personalization, and monetization while protecting the official-first trust model of Career Copilot.

Career Copilot should evolve into a complete government-exam preparation operating system:

```text
Discover official opportunities
→ verify eligibility
→ understand exam intelligence
→ create preparation strategy
→ execute daily study tasks
→ track progress
→ adapt plan from mock/study data
→ apply before deadline
```

AI should power this loop, but official facts, eligibility verdicts, paywall enforcement, and final publishing must remain rule-based, auditable, and reviewable.

---

## 2. Source documents studied

This plan consolidates the functional intent from:

- `docs/product_strategy_architecture_roadmap.md`
- `docs/source-intelligence-strategy.md`
- `docs/ai_pyq_microtopic_analysis_architecture.md`
- `docs/ai_aspirant_personalization_strategy.md`
- `docs/phase3_report.md`
- `docs/phase3a_report.md`
- `docs/phase3b_report.md`
- Existing implementation around:
  - `lib/ai/study-planner.ts`
  - `lib/db/study-planner.ts`
  - `actions/study-planner.ts`
  - `lib/billing/plans.ts`
  - `components/dashboard/DashboardShell.tsx`
  - scraper, notification, source registry, and eligibility reports

---

## 3. AI automation policy

### 3.1 Fully automatable with normal validation

These features can be driven mostly by AI because wrong output is low-risk and can be corrected by the user:

- AI study plan generation.
- Daily study task generation.
- Study-plan regeneration after missed sessions.
- Notes summarization.
- Flashcard generation.
- Mistake-book summarization.
- Mock-test analysis and weak-topic diagnosis.
- Weekly review reports.
- Personalized next-best-action recommendations.
- Resource recommendation from verified internal resources.
- Career/exam strategy guidance with disclaimers and realistic caveats.

### 3.2 AI-assisted but admin-reviewed

These features should use AI to reduce workload, but they must not go directly to users without confidence thresholds and/or admin review:

- Recruitment notification extraction from PDF/HTML.
- Age, education, category, PwBD, domicile, and attempt-rule extraction.
- Official-source resolution from aggregator discoveries.
- PYQ question segmentation.
- PYQ subject/topic/microtopic classification.
- Cutoff, vacancy, applicant-count, and competition metric extraction.
- Marketplace course/institute classification.
- Admin data-quality diagnosis.

### 3.3 Deterministic automation, not AI automation

These should be automated with code, SQL, queues, schedules, and deterministic rules:

- Eligibility verdict calculation.
- Notification/deadline trigger timing.
- Paywall and plan access.
- Streaks, hours studied, completion percentage.
- Flashcard due dates.
- Mock score calculations.
- Duplicate detection keys where exact identifiers exist.
- User privacy and access checks.

AI may explain these results, but AI should not be the source of truth.

### 3.4 Never fully automate without review

Do not fully automate:

- Final recruitment publishing from unverified extracted data.
- Final eligibility rule approval.
- Official verification badge assignment.
- Aggregator-to-official canonical promotion.
- Course/institute trust badge assignment.
- Legal/compliance claims.
- Paid plan entitlement decisions.
- Any claim that an applicant is definitely selected, guaranteed, or assured success.

---

## 4. Core AI product loop

The monetizable AI loop should be:

```text
User profile
+ eligibility results
+ target exam
+ official deadlines
+ PYQ intelligence
+ study logs
+ mock scores
+ notes/mistake book
        ↓
AI strategy engine
        ↓
Next best actions
+ daily study tasks
+ adaptive study plan
+ weak-topic focus
+ revision reminders
+ resource suggestions
        ↓
User action
        ↓
Updated logs, mocks, notes, reminders
        ↓
AI recalibration
```

This loop is the difference between a simple job-alert site and a paid preparation operating system.

---

## 5. Automation map by product area

### 5.1 Source discovery and scraper pipeline

#### Current base

The scraper/source strategy already supports official-first source tracking, RSS/JSON preference, source registry operations, scraper queues, source health, ETag/PDF cache, and admin review concepts.

#### AI automation

AI can automate:

- Classifying a source as official, aggregator, coaching, media, research, or opportunity-only.
- Extracting likely organization, post name, dates, vacancies, and qualification from discovered pages.
- Summarizing scrape queue evidence for admin review.
- Flagging suspicious or low-confidence extracted fields.
- Suggesting official source candidates when an aggregator item is discovered.
- Grouping duplicate or near-duplicate discoveries.

#### Implementation plan

1. Add or confirm `scrape_discoveries` for aggregator/research discoveries.
2. Add `official_verification_evidence` to store field-level evidence.
3. Add an AI extraction worker that processes raw scraped content into structured candidate rows.
4. Add confidence scoring per extracted field, not only per item.
5. Route low-confidence or aggregator-sourced discoveries into admin review.
6. Promote only official-verified items into user-facing recruitment records.

#### Acceptance criteria

- Aggregator discoveries never become user-facing canonical records without official verification.
- Every AI-extracted field has evidence URL/snippet and confidence.
- Admin can accept, correct, or reject extracted data.
- Users see only official/canonical links.

---

### 5.2 Recruitment extraction

#### AI automation

AI can extract from official PDF/HTML:

- Recruitment title.
- Organization.
- Posts.
- Vacancies.
- Apply start/end dates.
- Exam date, admit-card date, result date when available.
- Fees.
- Documents required.
- Age limits.
- Relaxations.
- Education requirements.
- Domicile/reservation rules.
- Experience rules.
- Selection stages.
- Salary, training, probation, bond, and benefits.

#### Required guardrail

AI extraction must write into a draft or review table first. It must not directly publish into canonical tables unless the item is already verified and confidence policy explicitly allows it.

#### Suggested data flow

```text
Raw PDF/HTML
→ text extraction
→ AI structured extraction
→ field-level confidence and evidence
→ admin review queue
→ verified canonical recruitment/post/rule tables
→ eligibility recompute queue
→ user notifications
```

#### Acceptance criteria

- Admin can see source snippet for each important field.
- Eligibility-critical fields cannot be auto-published below confidence threshold.
- All changes are auditable.

---

### 5.3 Eligibility engine and explanations

#### Current base

Phase 3B marks the core eligibility engine as completed for the current rule set, with one canonical path and engine-generated trusted match notifications.

#### Correct automation split

- Deterministic engine calculates verdict.
- AI explains the verdict in user-friendly language.
- AI suggests missing profile fields and likely impact.
- AI must not override deterministic verdict.

#### AI automation

AI can generate:

- “Why am I eligible?” explanation.
- “Why am I not eligible?” explanation.
- Conditional eligibility explanation.
- Missing data suggestions.
- Age-window risk explanation.
- Recommended exams based on eligibility + aptitude + life context.

#### Implementation plan

1. Store deterministic verdict details in `eligibility_results.explanation`.
2. Add `ai_eligibility_explanations` or cache explanation text inside a structured JSON field.
3. Generate explanation after eligibility recompute for paid users or on-demand.
4. Keep raw rules and deterministic pass/fail reasons visible to admins.

#### Acceptance criteria

- AI explanation always cites deterministic verdict fields.
- No AI-only eligibility result is shown as official truth.
- User sees specific blockers, not generic “complete profile” messages.

---

### 5.4 Notifications and reminders

#### Current base

Phase 3A/3B connected the scraper-to-user loop and restored trust by ensuring `new_match` alerts come from eligibility verdicts, not blind broadcast.

#### AI automation

AI can personalize:

- Notification title/body.
- Deadline urgency text.
- Document checklist summary.
- “What to do next” after receiving an alert.
- Weekly notification digest.
- Explain why a notification is relevant.

#### Deterministic automation

Rules/code should trigger:

- Application opened.
- Deadline in 7 days.
- Deadline in 3 days.
- Deadline in 1 day.
- Admit card released.
- Result released.
- Eligibility changed.
- Saved recruitment changed.

#### Implementation plan

1. Implement `notification_preferences` migration.
2. Implement email dispatcher.
3. Implement WhatsApp later.
4. Add notification readiness diagnostic.
5. Add AI digest generator for paid users.
6. Add AI generated document/action checklist per recruitment.

#### Acceptance criteria

- Alert trigger is deterministic.
- AI only personalizes/summarizes content.
- User can control channels and preferences.
- Empty states explain exact reason for no alerts.

---

### 5.5 Dashboard mission control and next best action

#### AI automation

AI should generate a prioritized next-best-action list based on:

- Eligible recruitments.
- Deadlines.
- Missing profile fields.
- Active study plan.
- Study logs.
- Mock performance.
- PYQ topic priority.
- Saved recruitments.
- User plan tier.

#### Example output

```text
1. Apply for RBI Assistant before 30 April.
2. Complete graduation percentage to unlock 6 more eligibility checks.
3. Study Data Interpretation today because it is weak and high frequency.
4. Revise Finance notes before Sunday mock.
```

#### Implementation plan

1. Create `user_next_actions` table.
2. Generate next actions after:
   - onboarding completion,
   - eligibility recompute,
   - study session logging,
   - mock score entry,
   - recruitment deadline sweep,
   - profile update.
3. Store action type, source, priority, due date, and completion state.
4. Render on dashboard above generic widgets.

#### Acceptance criteria

- Dashboard always answers “what should I do next?”
- Actions are traceable to concrete signals.
- User can mark actions done/snooze/dismiss.

---

### 5.6 Study planner and daily execution

#### Current base

The repo already contains an AI study planner, plan persistence, week rows, study logs, and plan stats.

#### AI automation

AI can automate:

- Initial plan generation.
- Daily task generation from weekly plan.
- Missed-task recovery.
- Plan regeneration.
- Revision schedule.
- Mock schedule.
- Topic prioritization.
- Low-time crash plan.
- Working-professional plan.

#### Implementation plan

1. Keep existing `study_plans`, `study_weeks`, `study_logs`.
2. Add `study_tasks` for daily task-level execution.
3. Add `study_sessions` for timer-linked work sessions.
4. Add `ai_plan_adjustments` for plan changes and reasons.
5. Add background regeneration rules:
   - user falls behind by N hours,
   - exam date changes,
   - mock score drops,
   - weak topic persists,
   - user changes daily hours.

#### Acceptance criteria

- Study plan becomes daily executable work, not just week cards.
- Missed sessions produce a recovery plan.
- User can see planned vs completed study time.

---

### 5.7 Timer, focus mode, and study logs

#### AI automation

Timer itself does not need AI. AI can use timer logs to produce insight:

- Consistency diagnosis.
- Best study time detection.
- Subject time allocation feedback.
- Burnout/risk warning from repeated missed sessions.
- Weekly productivity report.

#### Implementation plan

1. Add a focus timer UI.
2. Link each timer session to plan/task/exam/subject/topic.
3. Auto-create study log when session completes.
4. Generate weekly AI interpretation from logs.

#### Acceptance criteria

- Every meaningful study hour can be attached to exam/subject/topic/task.
- Stats dashboard can show where time is spent.
- AI recommendations use actual logs.

---

### 5.8 Notes, flashcards, and revision

#### AI automation

AI can automate:

- Notes summarization.
- Flashcard creation.
- MCQ generation from notes.
- Mistake-book entry cleanup.
- Revision sheet generation.
- Topic tagging.
- Linking notes to exam/topic/microtopic.

#### Implementation plan

1. Add `user_notes`.
2. Add `user_flashcards`.
3. Add `flashcard_reviews` for spaced repetition.
4. Add `mistake_entries`.
5. Add AI actions:
   - summarize note,
   - generate flashcards,
   - generate revision sheet,
   - tag topic/microtopic.

#### Acceptance criteria

- User can build exam-wise notes.
- AI can create review material from notes.
- Revision reminders are connected to actual weak/missed topics.

---

### 5.9 Mock-test analysis and proficiency tracking

#### AI automation

AI can analyze mock results and produce:

- Weak subject diagnosis.
- Mistake patterns.
- Time-management feedback.
- Next 7-day recovery plan.
- Topic practice recommendations.
- Cutoff margin interpretation.

#### Deterministic calculations

Code should calculate:

- Score.
- Accuracy.
- Attempt rate.
- Time per question.
- Subject-wise score.
- Trend over time.

#### Implementation plan

1. Add `mock_tests`.
2. Add `mock_subject_breakdowns`.
3. Add `mock_topic_breakdowns` when topic data exists.
4. Add `user_topic_proficiency`.
5. Generate AI analysis after each mock.
6. Feed weak areas back into study tasks and next-best-actions.

#### Acceptance criteria

- User sees why score is low, not only the score.
- Weak topics drive future tasks.
- Elite users receive adaptive plan recalibration.

---

### 5.10 PYQ and microtopic intelligence

#### AI automation

AI can automate:

- Question segmentation.
- Subject/topic/microtopic classification.
- Difficulty classification.
- Cognitive skill classification.
- Pattern-change summary.
- Topic priority recommendation.
- Personalized strategy based on PYQ + user proficiency.

#### Review policy

- `>= 0.85` confidence: can be auto-accepted but marked AI-classified.
- `0.65–0.84`: admin review required before strong user-facing claims.
- `< 0.65`: do not use in user-facing analytics until reviewed.

#### Implementation plan

1. Add exam syllabus taxonomy tables.
2. Add PYQ paper/question tables.
3. Add question classification table.
4. Add classification worker.
5. Add admin review dashboard.
6. Add stats aggregation table.
7. Add exam analysis pages.
8. Add AI strategy layer using PYQ trends.

#### Acceptance criteria

- User can see topic frequency and difficulty trends.
- Low-confidence AI classifications do not power authoritative claims.
- PYQ analytics becomes a Pro/Elite feature.

---

### 5.11 Marketplace and resource recommendations

#### AI automation

AI can personalize resources by:

- Exam target.
- Eligibility.
- Weak subjects.
- Budget.
- Preferred language.
- City/location.
- Online/offline preference.
- Time availability.
- User level.

#### Guardrail

AI should recommend from verified internal marketplace/resource records, not invent providers or pricing.

#### Implementation plan

1. Expand marketplace filters.
2. Add provider/course verification fields.
3. Add resource-to-exam/subject/topic mapping.
4. Add AI recommender using user profile + weak topics.
5. Add free-first recommendations for financially constrained users.

#### Acceptance criteria

- Recommendations are grounded in stored resources.
- Paid courses are not pushed blindly.
- User can compare courses/institutes.

---

### 5.12 AI career and aspirant personalization

#### AI automation

AI can generate:

- Exam-fit ranking.
- Primary/backup exam portfolio.
- Government vs private vs hybrid strategy.
- Five-year career path.
- Financial-pressure-aware preparation strategy.
- Low-cost resource path.
- Job-first or preparation-first recommendation.

#### Implementation plan

1. Add progressive assessment modules after onboarding.
2. Add aspirant context/profile tables.
3. Derive scores for urgency, financial pressure, family responsibility, risk tolerance, study feasibility, government fit, and private-job openness.
4. Generate strategy snapshots.
5. Use snapshots in dashboard and AI chat.

#### Acceptance criteria

- AI advice is supportive, not discriminatory.
- Sensitive attributes are used only for eligibility, accessibility, affordability, and supportive personalization.
- AI does not guarantee selection.

---

## 6. Cross-cutting AI infrastructure

### 6.1 Suggested tables

```text
ai_prompt_versions
- id
- prompt_key
- version
- model_name
- prompt_template
- json_schema
- is_active
- created_at

ai_jobs
- id
- user_id nullable
- entity_type
- entity_id
- job_type
- status
- priority
- input_json
- output_json
- confidence_score
- error_message
- created_at
- started_at
- finished_at

ai_review_queue
- id
- ai_job_id
- entity_type
- entity_id
- field_name nullable
- proposed_value_json
- evidence_json
- confidence_score
- review_status
- reviewed_by
- reviewed_at
- admin_notes

ai_strategy_snapshots
- id
- user_id
- strategy_type
- input_context_json
- output_json
- model_name
- prompt_version
- created_at
- expires_at

user_next_actions
- id
- user_id
- action_type
- title
- description
- source_type
- source_id
- priority
- due_at
- status
- created_at
- completed_at
```

### 6.2 Prompt versioning

Every production AI workflow must have:

- prompt key,
- prompt version,
- model name,
- expected JSON schema,
- confidence policy,
- fallback behavior,
- logging.

### 6.3 JSON-first outputs

AI should return structured JSON for all product-critical workflows. Markdown/prose should be generated only after structured output exists.

### 6.4 Confidence and review policy

Each AI job should declare:

- whether output can be auto-used,
- whether output requires admin review,
- minimum confidence threshold,
- which fields are eligibility-critical,
- how to handle missing evidence.

### 6.5 Observability

Track:

- AI job success/failure rate.
- Average latency.
- Token/cost estimate.
- Parse failure rate.
- Admin correction rate.
- Low-confidence output rate.
- User usefulness rating.
- Conversion impact.

---

## 7. Paywall mapping

### Free

- One limited AI study plan.
- Basic timer/logging.
- Limited notes.
- Generic dashboard suggestions.
- Limited exam browse.

### Pro

- Full eligibility explanations.
- Personalized next-best-actions.
- AI study plans and regenerations within plan limits.
- Notes summarization.
- Flashcard generation.
- Mock analysis.
- Personalized deadline/action checklist.
- Basic PYQ analytics.

### Elite

- Advanced PYQ microtopic heatmap.
- Adaptive weekly strategy.
- AI plan recalibration from mocks.
- Five-year career planner.
- Downloadable reports.
- Deep resource/course recommendations.
- Priority support and advanced AI coach.

---

## 8. Implementation phases

### Phase AI-0: Guardrails and infrastructure

Tasks:

- Create prompt versioning system.
- Create `ai_jobs` table.
- Create `ai_review_queue` table.
- Define JSON schemas for each AI workflow.
- Add confidence thresholds.
- Add logs and admin visibility.

Definition of done:

- No production AI workflow runs without prompt version, status, and trace.
- Admin can inspect AI outputs and failures.

---

### Phase AI-1: Next-best-action engine

Tasks:

- Create `user_next_actions` table.
- Generate actions from eligibility, deadlines, study plan, profile gaps, and notifications.
- Render top actions on dashboard.
- Add mark-done/snooze/dismiss.

Definition of done:

- Dashboard gives at least three concrete actions for an active user.
- Actions are tied to source signals.

---

### Phase AI-2: Daily study execution

Tasks:

- Add `study_tasks`.
- Convert weekly plan into daily tasks.
- Add missed-task recovery.
- Add study-plan adjustment records.
- Connect task completion to stats.

Definition of done:

- User sees today’s tasks and can complete/log them.
- Missed tasks produce a recovery suggestion.

---

### Phase AI-3: Timer, notes, flashcards, revision

Tasks:

- Add focus timer and `study_sessions`.
- Add `user_notes`.
- Add `user_flashcards`.
- Add `flashcard_reviews`.
- Add `mistake_entries`.
- Add AI actions for summary/flashcards/revision sheets.

Definition of done:

- User can study, log, write notes, generate flashcards, and receive revision reminders.

---

### Phase AI-4: Mock-test analyst

Tasks:

- Add mock-test entry flow.
- Add subject/topic breakdown tables.
- Add deterministic stats.
- Generate AI mock analysis.
- Feed weak topics into next actions/study tasks.

Definition of done:

- Mock result produces weak-area diagnosis and next-week plan.

---

### Phase AI-5: Notification intelligence

Tasks:

- Implement notification preferences.
- Add notification readiness diagnostic.
- Add AI official-notification summary.
- Add document checklist generator.
- Add weekly digest.

Definition of done:

- Empty notifications show exact diagnosis.
- Paid user receives personalized action checklist for relevant recruitment alerts.

---

### Phase AI-6: Recruitment extraction assistant

Tasks:

- Add field-level extraction jobs.
- Add official verification evidence.
- Add admin review UI.
- Add confidence thresholds.
- Add audit history.

Definition of done:

- Admin can review AI-extracted recruitment/post/rule data before publishing.

---

### Phase AI-7: PYQ intelligence

Tasks:

- Add syllabus taxonomy.
- Add PYQ ingestion.
- Add question segmentation/classification.
- Add admin review.
- Add stats aggregation.
- Add user-facing PYQ charts.

Definition of done:

- One target exam has verified PYQ analytics and personalized strategy.

---

### Phase AI-8: Marketplace/resource personalization

Tasks:

- Expand course/resource schema.
- Map resources to exam/subject/topic/microtopic.
- Add AI recommender.
- Add free-first budget-aware logic.

Definition of done:

- User receives grounded, profile-aware free/paid resource recommendations.

---

### Phase AI-9: Career and life-context personalization

Tasks:

- Add progressive assessment.
- Add derived scoring model.
- Add exam-fit ranking.
- Add five-year strategy snapshots.
- Add downloadable Pro/Elite reports.

Definition of done:

- User receives primary/backup/avoid-for-now exam strategy with reasoning.

---

## 9. Engineering guardrails

1. Do not expose aggregator URLs to normal users.
2. Do not publish unverified AI-extracted recruitment data as official.
3. Do not use AI to calculate final eligibility verdicts.
4. Do not let AI override paywall or access controls.
5. Do not fabricate cutoffs, vacancies, PYQs, official dates, or official links.
6. Do not recommend paid courses without free/low-cost alternatives when budget is constrained.
7. Do not store sensitive personalization data without clear purpose.
8. Do not use sensitive attributes for unfair exclusion.
9. Always distinguish verified facts from AI-generated strategy.
10. Keep every AI workflow traceable and auditable.

---

## 10. Near-term recommended build order

The fastest user-value path is:

```text
1. Next-best-action dashboard
2. Daily study tasks
3. Timer + study sessions
4. Notes + flashcards
5. Mock-test analysis
6. Notification readiness and action checklist
7. Recruitment extraction admin assistant
8. PYQ intelligence
9. Marketplace personalization
10. Career personalization reports
```

This order gives users a daily reason to return before investing heavily in advanced PYQ and marketplace infrastructure.

---

## 11. Final product principle

Career Copilot should use AI to answer the aspirant’s practical daily question:

> “What should I do next to improve my chance of getting a suitable government job?”

Every AI automation should point back to that answer.
