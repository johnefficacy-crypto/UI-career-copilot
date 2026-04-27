# Career Copilot Product Strategy, Architecture, and Implementation Roadmap

_Last updated: 2026-04-27_

## 1. Purpose of this document

This document consolidates the product, UI/UX, data architecture, scraper, admin, dashboard, marketplace, notification, exam-intelligence, and monetization strategy discussed during the product review.

The goal is to move Career Copilot from a narrow **notification tracker + eligibility engine** into a complete **exam preparation intelligence operating system for Indian aspirants**.

This document is intentionally strategic. It should guide implementation in phases. It is not a component-level coding specification.

---

## 2. Product positioning

Career Copilot should not be positioned only as an eligibility engine or a replacement for Telegram channels.

The stronger positioning is:

> Career Copilot is a complete exam discovery, eligibility, intelligence, preparation, and action platform for Indian aspirants.

The platform should help aspirants:

1. Discover available and open examinations.
2. See eligibility-matched opportunities based on their profile.
3. Understand exams through statistics, PYQ trends, competition metrics, vacancy trends, cutoffs, and difficulty analysis.
4. Prepare using AI strategy, study plans, free resources, paid courses, marketplace content, and community discussions.
5. Track official deadlines, application windows, admit cards, results, and changes.
6. Make decisions from one trusted, authoritative location.

---

## 3. Core product principles

### 3.1 Official-first trust model

Users should see only official, authoritative recruitment links wherever possible.

Aggregator links must not be exposed to normal users.

Aggregator sources may be used internally for discovery, but only authorized admins should see them in admin tools.

### 3.2 Eligibility is premium intelligence

Eligibility matching is one of the core monetizable features. It should sit behind the paywall, except for limited public/demo experiences.

Public/demo eligibility may show how matching works using sample data or a small preview. Full profile-based eligibility, detailed explanations, and ongoing alerts should be paid.

### 3.3 Dashboard must be action-oriented

The dashboard must not be a generic SaaS dashboard. It should function as an aspirant mission control center.

The first question it should answer is:

> What am I eligible for, what is urgent, what is missing, and what should I do next?

### 3.4 Statistics must be visual and decision-supportive

Exam statistics should be visually appealing and useful. Use graphs, pie charts, tables, trend lines, bar charts, heatmaps, timelines, and comparison cards.

Examples:

- PYQ subject-weight trend line.
- Subject-wise question distribution pie chart.
- Vacancy trend bar chart.
- Category-wise cutoff table.
- Difficulty trend by year.
- Exam-cycle timeline.
- Competition ratio chart.
- State/category/post-wise vacancy matrix.

### 3.5 Admin must be operational, not decorative

Admin tools should support the full lifecycle:

- Source discovery.
- Official verification.
- Scraper run review.
- Evidence review.
- Recruitment publishing.
- Post criteria editing.
- Eligibility recomputation.
- Notification seeding.
- Data quality tracking.
- Marketplace moderation.
- Forum moderation.

---

## 4. Current gaps identified

### 4.1 Performance and dev-server issues

Observed development logs show extremely slow routes, including 30 seconds to 22 minutes for some requests. This indicates a mix of Turbopack/file-system cache pressure, slow route compilation, expensive application queries, proxy delays, and heavy admin/dashboard data loading.

Required actions:

1. Clear `.next` and reinstall dependencies when type or cache corruption appears.
2. Ensure `next-env.d.ts` exists and Next type declarations are healthy.
3. Align `eslint-config-next` version with the installed Next.js version.
4. Move `.claude/worktrees` outside the app root if it increases file watching pressure.
5. Exclude `.next`, `node_modules`, and `.git` from Windows Defender scanning during local development.
6. Test `next dev --webpack` to isolate Turbopack-specific slowdowns.
7. Add pagination and reduce full-table joins on heavy routes.

### 4.2 TypeScript issue: `next/server`

The error:

```text
Could not find a declaration file for module 'next/server'.
```

should be treated as a broken Next type setup, missing `next-env.d.ts`, or dependency/cache issue.

Do not solve this by blindly adding:

```ts
declare module "next/server";
```

That hides real type information. First verify:

- `next-env.d.ts` exists.
- `node_modules/next/server.d.ts` exists.
- `.next/types` and `.next/dev/types` are generated.
- `eslint-config-next` matches the Next version.

### 4.3 Scrape dashboard lacks pagination

Scrape dashboard requires server-side pagination for:

- Queue Review.
- Evidence Review.
- Source Registry.
- Source Health.
- Run History.

Do not fetch all rows and paginate in React.

Use URL params:

```text
/admin/scrape?tab=queue&page=1&pageSize=25
/admin/scrape?tab=evidence&page=1&pageSize=20
/admin/scrape?tab=runs&page=1&pageSize=20
```

Return shape:

```ts
{
  rows,
  total,
  page,
  pageSize,
  totalPages
}
```

Recommended page sizes:

| Area | Page size |
|---|---:|
| Queue Review | 25 |
| Evidence Review | 20 |
| Source Registry | 50 |
| Source Health | 50 |
| Run History | 20 |

### 4.4 Admin recruitment UI inconsistency

Admin recruitment and post forms need consistent dropdown/input styling.

Create shared admin UI primitives:

- `AdminInput`
- `AdminSelect`
- `AdminTextarea`
- `AdminSection`
- `AdminArrayField`
- `AdminFormFooter`
- `AdminStatusPill`
- `AdminConfirmModal`

Apply them across:

- Organization forms.
- Recruitment forms.
- Post forms.
- Source registry forms.
- Scrape review forms.
- Eligibility admin forms.

### 4.5 Add post logic must be revisited

The add/edit post logic should not remain a flat form with many loosely related fields.

It should become a structured multi-section workflow:

1. Basic post details.
2. Vacancies.
3. Age criteria.
4. Education criteria.
5. Category, attempt, relaxation, domicile, and PwBD rules.
6. Salary, training, probation, bond, application fee, and benefits.
7. Official evidence and source references.
8. Validate and publish.

The current save pattern uses multiple sequential delete/insert operations. This should evolve into a transactional RPC or service-layer operation such as:

```sql
admin_upsert_post_with_criteria(payload jsonb)
```

The save operation should be atomic, validated, and auditable.

### 4.6 Aggregators are being treated as organizations

Aggregators must not be treated as recruitment organizations.

Aggregator websites are discovery sources, not authoritative recruiting bodies.

Correct approach:

- Use aggregators only to discover potential opportunities.
- Extract possible organization and recruitment title from aggregator pages.
- Search and verify the official organization website.
- Scrape official notification from the official website.
- Store official URL as canonical.
- Store aggregator URL only as internal discovery/reference metadata.
- Do not expose aggregator URL to normal users.
- Only authorized admins should see aggregator discovery trails.

### 4.7 Notifications empty state is misleading

`/dashboard/notifications` must not blindly say:

> Complete your profile to start receiving exam match notifications.

A user can reach the dashboard after onboarding. If there are no notifications, the system should explain why.

Better empty-state logic should diagnose:

- Profile incomplete.
- Missing eligibility-critical fields.
- No target exams selected.
- Eligibility not run.
- No matching recruitments.
- Notifications not seeded.
- Scraper has no fresh official items.
- User preferences too narrow.

### 4.8 Marketplace filters are too narrow

Marketplace must support Indian exam-prep buying behavior:

- Online/offline/hybrid.
- City/state/location.
- Institution/brand.
- Exam.
- Subject.
- Content type.
- Pricing.
- Trust and verification.

### 4.9 `/dashboard/exams` is too shallow

The current open exams page should evolve into an exam/recruitment intelligence hub.

Users should get every useful detail for the exam in one place:

- Official links.
- Eligibility.
- Posts.
- Vacancies.
- Dates.
- Strategy.
- Competition metrics.
- PYQ analysis.
- Cutoff trends.
- Vacancy trends.
- Past exam analysis.
- Subject difficulty.
- Free resources.
- Paid resources.
- Forum links.
- AI strategy prompts.

---

## 5. Target information architecture

### 5.1 Public surfaces

Public pages should include:

- Landing page.
- Pricing page.
- Public exam discovery preview.
- Demo eligibility checker using sample/limited data.
- Marketplace public browse.
- Public forum read-only preview, if allowed.

Public surfaces must sell the promise but not reveal full premium intelligence.

### 5.2 User app surfaces

Authenticated user surfaces:

- Dashboard / mission control.
- Profile and onboarding.
- Notifications.
- Exams and recruitments.
- Exam intelligence pages.
- Eligibility results.
- Study planner.
- AI career chat.
- Marketplace and purchased courses.
- Forum/community.
- Billing and plan.

### 5.3 Admin surfaces

Admin surfaces:

- Admin overview.
- Source registry.
- Scrape dashboard.
- Evidence review.
- Organizations.
- Recruitments.
- Posts and criteria.
- Eligibility engine monitor.
- Notifications monitor.
- Exam analytics data manager.
- Marketplace moderation.
- Forum moderation.
- Audit logs.

### 5.4 Hidden internal surfaces

Internal-only data and tools:

- Aggregator discovery trails.
- Raw scraped HTML/PDF snippets.
- LLM extraction evidence.
- Confidence scores.
- Duplicate-detection metadata.
- Anti-bot risk logs.
- Failed scraper traces.

These should be hidden from normal users.

---

## 6. Official-source and aggregator architecture

### 6.1 Source types

`source_registry` should distinguish source purpose:

```text
official
aggregator
coaching
media
govt_portal
university
board
commission
manual
```

### 6.2 Canonical source rules

For user-facing recruitment listings:

1. `official_notification_url` is primary.
2. `apply_url` is secondary.
3. `organization.official_url` is fallback.
4. Aggregator URL must never be primary user-facing URL.
5. Aggregator URL can be visible only to authorized admins.

### 6.3 Discovery pipeline

Recommended flow:

```text
Aggregator/source discovery
        ↓
Potential recruitment extracted
        ↓
Candidate official organization detected
        ↓
Official website/careers page found
        ↓
Official notification scraped
        ↓
Evidence compared against aggregator discovery
        ↓
Admin verifies or rejects
        ↓
Canonical recruitment published
        ↓
User sees official/authentic URL only
```

### 6.4 Suggested tables

#### `scrape_discoveries`

Purpose: store opportunities discovered from aggregator/coaching/media sources before official verification.

Fields:

```text
id
source_id
discovered_title
discovered_url
raw_org_name
raw_apply_deadline
possible_official_org_id
possible_official_url
confidence_score
discovery_status: discovered | official_found | verified | rejected | duplicate
admin_notes
created_at
updated_at
```

#### `official_verification_evidence`

Purpose: evidence trail proving the recruitment came from an official source.

Fields:

```text
id
discovery_id
recruitment_id
field_name
extracted_value
evidence_url
evidence_snippet
source_type: official | aggregator | manual | pdf
confidence_score
reviewer_status: pending | verified | rejected
reviewed_by
reviewed_at
```

#### `recruitments`

Should contain:

```text
official_notification_url
apply_url
canonical_source_url
discovery_source_id nullable
aggregator_reference_url internal nullable
source_trust_level
official_verified_at
official_verified_by
```

Normal users see only official/canonical URLs.

---

## 7. Dashboard architecture: Aspirant Mission Control

The dashboard should be rebuilt around eligibility, urgency, missing data, and next best action.

### 7.1 Dashboard priority order

1. Eligibility summary.
2. Urgent deadlines.
3. Matched recruitments.
4. Next best actions.
5. Notifications feed.
6. Study plan today.
7. AI Copilot prompts.
8. Profile readiness.
9. Marketplace/forum secondary links.

### 7.2 Top summary section

Example:

```text
Good evening, Rahul

You are eligible for 12 open recruitments.
3 are closing within 7 days.
Your profile is 82% eligibility-ready.
```

Cards:

| Card | Meaning |
|---|---|
| Eligible now | Fully eligible recruitments |
| Closing soon | Deadlines within urgent window |
| Conditional matches | Possibly eligible but missing data/evidence |
| Missing fields | Profile gaps affecting matching |

### 7.3 Matched recruitments widget

Each card should show:

- Recruitment name.
- Official organization.
- Eligible posts.
- Matching posts count.
- Vacancies.
- Deadline.
- Eligibility status.
- Official notification link.
- Apply link.
- Save/follow button.

Statuses:

```text
Eligible
Conditional
Not eligible
Missing data
Closing soon
Official verified
```

### 7.4 Why am I eligible?

Each recruitment should provide an explanation:

```text
Age: 27 years — allowed up to 30
Category: OBC — +3 years relaxation applied
Education: Graduate — requirement satisfied
Domicile: Maharashtra — accepted
Attempts: 1 used — within limit
```

For blocked/conditional cases:

```text
You may not be eligible because:
- Graduation percentage is missing
- Domicile state is not confirmed
- Attempt history for this exam is missing
```

### 7.5 Next Best Action panel

Example:

```text
1. Complete graduation percentage
   This unlocks eligibility checks for 8 posts.

2. Apply for RBI Assistant before 3 May
   5 days left.

3. Generate study plan for SEBI Grade A
   Based on your target exam.
```

### 7.6 Mobile dashboard

Mobile order:

1. Greeting and urgent alert.
2. Eligible matches count.
3. Closing soon cards.
4. Next best action.
5. Matched recruitments.
6. Notifications.
7. Study plan.
8. Profile readiness.

Add bottom nav:

```text
Home | Exams | Alerts | Plan | Profile
```

---

## 8. Notifications architecture

### 8.1 Notification types

Notifications should include:

```text
new_recruitment
new_match
application_open
deadline_approaching
deadline_1day
deadline_3day
deadline_changed
vacancy_changed
status_changed
admit_card_released
result_released
eligibility_changed
profile_blocker
official_url_verified
```

### 8.2 Notification readiness diagnostics

Create a backend readiness function:

```ts
getNotificationReadiness(userId)
```

Return:

```ts
{
  onboardingCompleted: boolean,
  hasDob: boolean,
  hasCategory: boolean,
  hasDomicile: boolean,
  hasEducation: boolean,
  hasPreferences: boolean,
  hasTargetExams: boolean,
  eligibilityRowsCount: number,
  notificationRowsCount: number,
  matchingOpenRecruitmentsCount: number,
  blockers: string[],
  recommendedActions: string[]
}
```

### 8.3 Empty state rules

Do not show a generic complete-profile prompt.

Show one of:

- `Profile data is missing.`
- `Eligibility has not run yet.`
- `No current recruitments match your profile.`
- `Your filters/preferences are too narrow.`
- `No official notifications have been verified yet.`
- `You have no notifications, but open exams are available.`

---

## 9. Exam intelligence architecture

### 9.1 Distinguish exam and recruitment

An exam is a reusable entity.
A recruitment is a specific year/cycle/notification.

Example:

```text
Exam: SEBI Grade A
Recruitment: SEBI Grade A 2026 General Stream Recruitment
```

### 9.2 Routes

Recommended routes:

```text
/dashboard/exams
/dashboard/exams/[examSlug]
/dashboard/recruitments/[recruitmentId]
```

Alternative public SEO routes later:

```text
/exams/[examSlug]
/recruitments/[recruitmentId]
```

### 9.3 Exam detail page sections

Each exam page should include:

1. Overview.
2. Current open recruitments.
3. Eligibility summary.
4. Exam cycle timeline.
5. Syllabus.
6. Selection process.
7. PYQ analysis.
8. Cutoff trends.
9. Vacancy trends.
10. Competition metrics.
11. Category-wise analysis.
12. Subject-wise analysis.
13. Difficulty trend.
14. Strategy guide.
15. Free resources.
16. Paid resources.
17. Marketplace recommendations.
18. Forum discussions.
19. AI Copilot prompts.
20. Official links.

### 9.4 Recruitment detail page sections

Each recruitment page should include:

1. Official title.
2. Official organization.
3. Official notification URL.
4. Apply URL.
5. Important dates.
6. Posts.
7. Vacancies.
8. Eligibility by post.
9. Why user is eligible/not eligible.
10. Application fee.
11. Documents required.
12. Exam stages.
13. Salary, training, probation, bond, benefits.
14. Reservation/category rules.
15. Official PDFs.
16. Source/evidence status for admins only.
17. Change history.

---

## 10. Visual analytics and statistics architecture

Statistics should be visually appealing and help aspirants make decisions.

### 10.1 Visual components

Recommended components:

- Trend line chart.
- Bar chart.
- Stacked bar chart.
- Pie/donut chart.
- Heatmap.
- Timeline.
- Matrix table.
- Comparison table.
- Stat cards.
- Difficulty meter.
- Competition ratio card.

### 10.2 PYQ analysis visuals

Examples:

| Visualization | Use |
|---|---|
| Subject-wise pie chart | Distribution of questions by subject |
| Year-wise line chart | Trend of subject weight over years |
| Difficulty heatmap | Easy/medium/hard by subject and year |
| Topic frequency table | Most repeated topics |
| PYQ source table | Links to year-wise papers |

### 10.3 Vacancy and cutoff visuals

Examples:

| Visualization | Use |
|---|---|
| Vacancy trend bar chart | Total vacancies by year |
| Category-wise vacancy stacked chart | GEN/OBC/SC/ST/EWS/PwBD distribution |
| Cutoff line chart | Year-wise cutoff movement |
| Category-wise cutoff table | Compare cutoffs by category |
| Competition ratio card | Applicants per vacancy |

### 10.4 Exam cycle visuals

Examples:

- Notification month trend.
- Application window duration.
- Admit card release timing.
- Exam date trend.
- Result declaration trend.

### 10.5 Suggested analytics tables

#### `exam_master`

```text
id
slug
name
category
conducting_body_id
description
official_exam_url
is_active
```

#### `exam_cycles`

```text
id
exam_id
year
notification_date
apply_start_date
apply_end_date
exam_date
result_date
cycle_status
```

#### `exam_pyq_papers`

```text
id
exam_id
year
stage
paper_name
pdf_url
official_url
source_type
verified_at
```

#### `exam_pyq_analysis`

```text
id
paper_id
subject
topic
question_count
difficulty_level
marks_weight
analysis_json
```

#### `exam_cutoffs`

```text
id
exam_id
year
stage
category
cutoff_score
cutoff_type
notes
```

#### `exam_vacancy_history`

```text
id
exam_id
year
post_name
category
vacancy_count
state
```

#### `exam_competition_metrics`

```text
id
exam_id
year
applicants_count
appeared_count
qualified_count
vacancies_count
selection_ratio
source_url
```

---

## 11. Marketplace architecture

### 11.1 Marketplace filters

Marketplace filters should include:

#### Delivery mode

```text
Online
Offline
Hybrid
Recorded
Live
Test-center based
```

#### Location

```text
City
State
Near me
Online-only
Offline branches
```

#### Institution

```text
Vision IAS
Drishti IAS
Adda247
Oliveboard
Testbook
Unacademy
Physics Wallah
ForumIAS
InsightsIAS
StudyIQ
Other verified institute
```

#### Exam

```text
UPSC CSE
MPSC
SSC CGL
IBPS PO
SBI PO
RBI Grade B
SEBI Grade A
NABARD
Railways
Defence
Judiciary
State PSC
```

#### Subject

```text
Quant
Reasoning
English
General Awareness
Economics
Finance
Law
Management
Current Affairs
CSAT
Essay
Ethics
Optional subject
```

#### Content type

```text
Full course
Test series only
Video course only
PDF notes
Study material only
Mentorship
Interview guidance
Doubt solving
Crash course
Previous year analysis
Current affairs module
```

#### Pricing

```text
Free
Under ₹500
₹500–₹2,000
₹2,000–₹10,000
₹10,000+
EMI available
Refund available
```

#### Trust filters

```text
Verified institute
Student reviews
Refund policy
Demo available
Past results claimed
Official website verified
```

### 11.2 Marketplace personalization

After onboarding, marketplace should show:

- Courses for the user’s target exams.
- Courses for exams the user is eligible for.
- Courses for weak subjects.
- Free resources before paid upsells.
- Verified providers first.

---

## 12. Paywall and monetization strategy

### 12.1 Principle

Eligibility intelligence is valuable enough to be paid.

The public/free layer should show the promise. The paid layer should deliver continuous personalized intelligence.

### 12.2 Public/demo features

Public users can access:

- Landing page.
- Pricing.
- Marketplace browse preview.
- Public exam information preview.
- Demo eligibility checker with sample data or limited fields.
- Limited open-exam discovery.
- Public feature explanations.

Public users should not receive full personalized eligibility results.

### 12.3 Free authenticated features

Free users can access:

- Account creation.
- Onboarding/profile setup.
- Basic dashboard shell.
- Limited exam browsing.
- Limited notifications or generic official alerts.
- Limited marketplace browsing.
- Forum read access, if allowed.
- Limited study plan preview.
- Eligibility demo/preview only.

### 12.4 Paid features behind paywall

Recommended paywalled features:

#### Eligibility and matching

- Full personalized eligibility engine.
- Post-wise eligibility matching.
- Why am I eligible/not eligible explanations.
- Conditional eligibility diagnostics.
- Missing field impact analysis.
- Eligibility change alerts.
- Saved eligible recruitments.

#### Notifications and lifecycle tracking

- Personalized match notifications.
- Deadline reminders.
- Vacancy/status change alerts.
- Admit card/result alerts.
- Application window reminders.
- Official link verification alerts.

#### Exam intelligence

- Full PYQ analytics.
- Subject-wise analysis.
- Difficulty analysis.
- Cutoff trend analysis.
- Vacancy trend analysis.
- Competition metrics.
- Category-wise analysis.
- Exam-cycle trend analysis.

#### AI and strategy

- AI Career Chat.
- AI exam strategy.
- AI study plan generation.
- AI plan regeneration.
- Weakness-based preparation suggestions.
- Personalized next-best-action recommendations.

#### Resources and marketplace enhancements

- Personalized free resource recommendations.
- Personalized paid course recommendations.
- Course comparison.
- Institute comparison.
- Saved resource library.

#### Advanced dashboard

- Aspirant mission control.
- Advanced analytics widgets.
- Downloadable reports.
- Personalized weekly action plan.

### 12.5 Suggested tiering

| Feature | Public | Free | Pro | Elite |
|---|---:|---:|---:|---:|
| Public exam browse | Limited | Yes | Yes | Yes |
| Profile setup | No | Yes | Yes | Yes |
| Eligibility demo | Yes | Yes | Yes | Yes |
| Full eligibility engine | No | No | Yes | Yes |
| Why eligible explanation | No | No | Yes | Yes |
| Personalized notifications | No | Limited | Yes | Yes |
| Deadline reminders | No | Limited | Yes | Yes |
| AI study plan | No | Preview | Yes | Yes |
| AI Career Chat | No | No | Limited/Yes | Full |
| PYQ analytics | Preview | Preview | Yes | Advanced |
| Cutoff/vacancy trends | Preview | Preview | Yes | Advanced |
| Marketplace browse | Yes | Yes | Yes | Yes |
| Course comparison | No | Limited | Yes | Yes |
| Priority support | No | No | No | Yes |
| Download reports | No | No | Limited | Yes |

### 12.6 Demo eligibility design

Demo should show value without giving full product away.

Examples:

- Public sample: “Check eligibility for sample SEBI/RBI/SSC exams.”
- Free preview: “You may have 8 possible matches. Upgrade to see exact posts and reasons.”
- Paid result: exact post-wise matching, official links, reasons, and deadlines.

---

## 13. Feature page / landing architecture

The landing/features page should explain six product pillars:

### 13.1 Discover

- Open examinations.
- Official notifications.
- Recruitment lifecycle.
- Central/state/PSU/regulatory coverage.

### 13.2 Match

- Paid full eligibility engine.
- Age/category/education/domicile/PwBD/attempt matching.
- Conditional eligibility.
- Missing profile suggestions.

### 13.3 Understand

- PYQ trends.
- Cutoff trends.
- Vacancy trends.
- Competition metrics.
- Subject-wise and category-wise analytics.

### 13.4 Prepare

- AI strategy.
- Study plans.
- Free resources.
- Paid courses.
- Test series.
- Notes and videos.

### 13.5 Discuss

- Exam-specific forums.
- Public discussions.
- Verified answers.
- Resource sharing.

### 13.6 Act

- Deadline reminders.
- Official apply links.
- Document checklists.
- Admit card/result alerts.

---

## 14. Step-by-step implementation roadmap

### Phase 0: Stabilization

Goal: make development and routing reliable.

Tasks:

1. Fix `next/server` typing issue properly.
2. Regenerate `next-env.d.ts` if missing.
3. Align Next and eslint-config-next versions.
4. Clear `.next` and reinstall dependencies if corrupted.
5. Reduce file watcher pressure.
6. Test Turbopack vs webpack.
7. Keep `/auth/login` and `/auth/signup` standardized.
8. Audit remaining auth redirects.

Acceptance criteria:

- Dev server starts reliably.
- TypeScript recognizes `next/server`.
- No route points to `/login` or `/signup`.
- Initial route loads are reasonable in local dev.

### Phase 1: Pagination and performance

Goal: stop loading large datasets at once.

Tasks:

1. Add pagination to scrape dashboard tabs.
2. Add pagination to admin recruitments.
3. Add pagination to dashboard exams.
4. Add pagination to marketplace.
5. Add pagination to admin eligibility.
6. Replace full joins with count summaries where possible.
7. Load detail data only on detail pages.

Acceptance criteria:

- Admin scrape page loads only current tab/page data.
- Admin recruitments does not fetch all posts deeply.
- Dashboard exams list is lightweight.
- Marketplace list is lightweight.

### Phase 2: Source and aggregator redesign

Goal: protect user trust by using official URLs only.

Tasks:

1. Add source kind/type distinction.
2. Add discovery table for aggregator findings.
3. Add official verification workflow.
4. Add admin-only aggregator visibility.
5. Add canonical official URL rules.
6. Hide aggregator URLs from user-facing pages.
7. Show official verification badge to users.

Acceptance criteria:

- Aggregators are not organizations.
- Users never see aggregator URLs as primary source.
- Admins can inspect aggregator discovery trails.
- Recruitments show official/authentic links.

### Phase 3: Admin recruitment and post workflow

Goal: make data entry reliable and scalable.

Tasks:

1. Standardize admin form primitives.
2. Redesign add/edit post as multi-section workflow.
3. Add validation before publish.
4. Add transactional save/RPC for post + criteria.
5. Add official evidence fields.
6. Add audit logs for post criteria changes.
7. Improve dropdown consistency.

Acceptance criteria:

- Post creation is clear and structured.
- Complex eligibility criteria are captured reliably.
- Data saves atomically.
- UI is visually consistent.

### Phase 4: Dashboard mission control

Goal: make dashboard eligibility-first and action-oriented.

Tasks:

1. Add eligibility summary cards.
2. Add urgent deadlines card.
3. Improve matched recruitment cards.
4. Add next-best-action panel.
5. Add profile readiness card.
6. Add mobile bottom navigation.
7. Add “why eligible” explanations.

Acceptance criteria:

- Dashboard immediately answers what the user can apply for.
- User sees urgent actions.
- Missing data is explained clearly.
- Dashboard is usable on mobile.

### Phase 5: Notifications readiness and lifecycle alerts

Goal: make notification empty states and alerts intelligent.

Tasks:

1. Implement notification readiness diagnostic.
2. Replace generic empty state.
3. Generate partial-profile notifications where possible.
4. Seed notifications after onboarding.
5. Add alert types for eligibility changes and profile blockers.
6. Add deadline lifecycle alerts.

Acceptance criteria:

- Empty notifications page explains exact cause.
- Users get relevant alerts even with partial profile where possible.
- Paid users receive personalized match/deadline alerts.

### Phase 6: Exam and recruitment intelligence hub

Goal: make each exam/recruitment a complete decision page.

Tasks:

1. Create exam master architecture.
2. Create exam detail route.
3. Create recruitment detail route.
4. Add official links, posts, dates, eligibility, and vacancies.
5. Add PYQ/cutoff/vacancy/competition data model.
6. Add visual analytics components.
7. Add strategy/resources/forum sections.
8. Add AI prompts per exam.

Acceptance criteria:

- User gets all exam details in one location.
- Statistics are visual and actionable.
- Recruitment pages show official data and eligibility status.

### Phase 7: Marketplace expansion

Goal: make marketplace match real exam-prep behavior.

Tasks:

1. Add filters for mode, city, institution, exam, subject, content type, price, and trust.
2. Add institute/course verification fields.
3. Add course comparison.
4. Personalize recommendations by target exam and eligibility.
5. Add free/paid resource distinction.

Acceptance criteria:

- Users can find online/offline/city/institution/exam/subject-specific resources.
- Marketplace can support Vision IAS, Drishti IAS, Adda247, Oliveboard, and similar providers.
- Recommendations connect to user profile and eligible exams.

### Phase 8: Paywall implementation

Goal: monetize core intelligence without blocking discovery.

Tasks:

1. Define public/free/Pro/Elite entitlements.
2. Put full eligibility behind paywall.
3. Keep demo eligibility public/free.
4. Gate AI chat, advanced stats, personalized alerts, and detailed explanations.
5. Add upgrade prompts in context.
6. Ensure pricing copy is centralized.

Acceptance criteria:

- Public users understand the product.
- Free users can explore but not access full intelligence.
- Paid users receive clear premium value.
- Eligibility engine is monetized while demo remains available.

---

## 15. Implementation guardrails

1. Do not expose aggregator URLs to normal users.
2. Do not treat aggregators as organizations.
3. Do not show unverified scraped data as official.
4. Do not run heavy eligibility recomputation on page load.
5. Do not fetch large admin datasets without pagination.
6. Do not show “complete profile” unless the missing fields are actually known.
7. Do not make dashboard generic; keep it eligibility-first.
8. Do not mix inconsistent admin UI primitives.
9. Do not hide type issues with fake module declarations unless all proper fixes fail.
10. Do not put every feature behind the paywall; keep enough public/free value to drive trust and conversion.

---

## 16. Success metrics

### User metrics

- Profile completion rate.
- Eligibility demo-to-signup conversion.
- Free-to-paid conversion.
- Number of eligible matches viewed.
- Deadline reminders clicked.
- Exam detail pages viewed.
- Study plans generated.
- Marketplace course clicks.

### Admin metrics

- Sources active.
- Sources verified.
- Scraper success rate.
- Queue items pending.
- Evidence verification rate.
- Official URL verification rate.
- Recruitments published.
- Eligibility recomputation duration.

### Product quality metrics

- Percentage of recruitments with official URL.
- Percentage of recruitments with complete post criteria.
- Percentage of exams with PYQ analytics.
- Percentage of exams with cutoff/vacancy history.
- Percentage of notifications personalized.
- Time to dashboard load.
- Time to admin scrape page load.

---

## 17. Final product direction

Career Copilot should become:

> A trusted, official-source-first, eligibility-aware, visually rich exam intelligence and preparation platform for Indian aspirants.

The product should not compete only with Telegram channels. It should compete with the entire fragmented preparation workflow:

- Telegram alerts.
- Coaching websites.
- Government PDFs.
- Manual eligibility reading.
- YouTube strategy search.
- PYQ spreadsheets.
- Cutoff/vacancy tracking.
- Course discovery.
- Forum/community confusion.

The winning experience is:

```text
Discover official exams → Check paid eligibility → Understand trends → Prepare with AI/resources → Track deadlines → Apply confidently
```

This strategy should guide the next implementation phases.
