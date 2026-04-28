# Career Copilot — Implementation Status Checklist

_Last updated: 2026-04-28 (session 2 — pagination, next-actions, daily tasks, career goal)_

## 1. Purpose

This is the living checklist for Career Copilot. It consolidates implementation status across the product roadmap, source strategy, AI automation plan, PYQ architecture, aspirant-personalization strategy, scraper reports, eligibility reports, notification reports, dashboard work, marketplace direction, and billing/paywall work.

Use this file as the project control document whenever planning, reviewing, or assigning work.

---

## 2. Status legend

| Status | Meaning |
|---|---|
| ✅ Done | Implemented and usable at the current product level |
| 🟡 Partial | Some foundation exists, but feature is incomplete or shallow |
| 🔵 Planned | Documented and intended, but not yet implemented |
| 🔴 Blocked | Cannot proceed cleanly until prerequisite is fixed |
| ⚪ Backlog | Useful idea, but not yet prioritized |
| 🟣 Review Needed | Exists or may exist, but needs verification before relying on it |
| ⚫ Deprecated | Should not be continued |

---

## 3. Update rules

Whenever a feature is built or changed:

1. Update this checklist in the same PR/commit.
2. Link the relevant implementation file, migration, or report in the notes column.
3. Change status only when acceptance criteria are satisfied.
4. Do not mark AI-generated or scraper-extracted data as Done unless admin-review/trust rules are satisfied.
5. Keep strategic docs separate from implementation status. Strategy may describe desired features; this file tracks what is actually done.

---

## 4. Current high-level product status

| Area | Status | Notes |
|---|---|---|
| Product positioning | ✅ Done | Roadmap positions Career Copilot as exam discovery, eligibility, intelligence, preparation, and action platform |
| Official-first trust principle | ✅ Done | Documented in product roadmap and source strategy |
| Source registry foundation | ✅ Done | Source registry table/admin work exists from Phase 2/3 reports |
| Scheduled scraper | ✅ Done | Phase report says scheduled-scraper runs every 6h |
| Scraper → user loop | ✅ Done | Phase 3A report marks loop closed |
| Eligibility engine core | ✅ Done | Phase 3B report marks eligibility engine completed for current rules |
| In-app notifications | 🟡 Partial | Notification feed exists, but email/WhatsApp/preferences are incomplete |
| Email notifications | 🔴 Blocked | `notification_preferences` migration and dispatcher still needed |
| WhatsApp notifications | 🔵 Planned | Phase 4/growth feature |
| Billing/paywall foundation | ✅ Done | Plan definitions and gating exist |
| AI study planner foundation | ✅ Done | AI planner, save plan, weeks, logs, stats exist |
| Daily task execution | ✅ Done | `study_tasks` table + `DailyTasksWidget` + server actions wired into dashboard |
| Timer/focus mode | 🟡 Partial | `study_sessions` table exists; timer UI component not yet built |
| Personal notes | 🔵 Planned | Not found in implementation search |
| Flashcards/revision | 🔵 Planned | Not found in implementation search |
| Mock-test analytics | 🔵 Planned | Not found in implementation search |
| PYQ/microtopic intelligence | 🔵 Planned | Architecture documented, implementation pending |
| Aspirant personalization | 🟡 Partial | Career goal field added; full context profile pending |
| Marketplace expansion | 🟡 Partial | Marketplace access exists in plan flags; filters/personalization need build |
| Admin source tools | ✅ Done | Source Registry manager and admin source docs exist |
| Admin full lifecycle dashboard | 🟡 Partial | Several admin flows exist; operational dashboard still needs deeper workflows |
| Production hardening | 🟡 Partial | Known dev latency/proxy/performance items remain |

---

## 5. Infrastructure and project foundation

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Next.js + Supabase base app | ✅ Done | Project is running on Next.js/Supabase stack | Continue stabilization |
| Supabase SSR auth pattern | 🟡 Partial | Existing auth/onboarding flows work but should be audited | Standardize redirects and server actions |
| Onboarding flow | ✅ Done | Phase report says 5-step onboarding is working | Expand later through progressive profiling |
| User profiles | ✅ Done | Used by dashboard, eligibility, and study planner | Add personalization extension tables later |
| Admin route structure | 🟡 Partial | Admin pages exist | Consolidate admin UX primitives |
| Billing plan definitions | ✅ Done | `lib/billing/plans.ts` defines free/pro/elite and features | Update feature flags as modules mature |
| Gate checks | ✅ Done | Study planner uses billing gate | Extend to notes, mocks, PYQ, reports |
| Performance pagination | ✅ Done | `PaginatedResult<T>` generic; queue/runs/recruitments admin all paginated via `?page=N`; `getScrapeQueuePaginated`, `getScrapeRunsPaginated`, `getRecruitmentsAdminPaginated` | Extend to dashboard exams list |
| Dev-server latency cleanup | 🔴 Blocked | Phase report notes proxy/dev latency issues | Remove/replace proxy and reduce watcher pressure |
| Error boundaries/observability | 🔵 Planned | Production hardening item | Add Sentry/LogSnag or equivalent |

---

## 6. Source registry and scraper system

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| `source_registry` table | ✅ Done | Phase report lists table with 50 rows | Continue curation |
| Source registry admin CRUD | ✅ Done | SourceRegistryManager exists | Improve UI consistency |
| Source taxonomy | 🟡 Partial | Strategy defines official/aggregator/research/opportunity taxonomy | Ensure DB enums/fields reflect taxonomy |
| RSS/JSON preference strategy | ✅ Done | Documented in source strategy | Enforce in adapters |
| ETag/Last-Modified cache | ✅ Done | Phase report lists `scrape_source_etags` | Monitor cache hit rate |
| PDF cache/dedup | ✅ Done | Phase report lists `scrape_pdf_cache` | Add OCR later |
| Scheduled scraper Edge Function | ✅ Done | Phase report says deployed and runs every 6h | Verify deployed model/version after changes |
| Manual scraper trigger | ✅ Done | Phase report says admin can trigger manually | Keep admin audit trail |
| Source health metrics | ✅ Done | Phase report lists `source_health_metrics` | Add dashboard summary |
| Queue review | ✅ Done | Phase report lists admin queue review | Add pagination and review filters |
| Evidence review | 🟡 Partial | Evidence concept exists in reports/docs | Build full evidence review UI |
| Aggregator discovery lane | 🔵 Planned | Strategy says aggregators should be discovery-only | Add `scrape_discoveries` workflow |
| Official verification evidence | 🔵 Planned | Proposed in roadmap | Add field-level evidence table |
| Playwright adapter | 🔵 Planned | Phase 4 item | Add browser worker / external service |
| PDF OCR | 🔵 Planned | Phase 4 item | Add OCR only for required PDFs |
| AI recruitment extraction assistant | 🔵 Planned | Added in AI plan | Build after AI job/review infra |
| Anti-bot risk handling | 🟡 Partial | Source fields exist conceptually | Add run-level risk handling and fallbacks |

---

## 7. Recruitment, post, and eligibility data model

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Recruitments table foundation | ✅ Done | Used by promotion and dashboard | Continue schema refinement |
| Posts table foundation | ✅ Done | Eligibility and recruitment details use posts | Improve admin workflow |
| Basic recruitment promotion | ✅ Done | Phase 3A closed scrape → recruitments loop | Keep idempotency checks |
| Minimal recruitment detail page | ✅ Done | Phase 3B added `/dashboard/recruitments/[id]` | Expand page details |
| Full recruitment detail page | 🟡 Partial | Minimal exists only | Add salary, vacancies, syllabus, fee, documents, apply tracker |
| Post criteria data capture | 🟡 Partial | Existing forms/rules exist but workflow needs redesign | Build multi-section post workflow |
| Transactional post criteria save | 🔵 Planned | Roadmap suggests RPC | Add `admin_upsert_post_with_criteria(payload jsonb)` |
| Audit logs for criteria changes | 🔵 Planned | Roadmap/admin need | Add audit table and UI |
| Official evidence on post fields | 🔵 Planned | Proposed in roadmap | Connect to verification evidence |

---

## 8. Eligibility engine

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Canonical rule engine | ✅ Done | Phase 3B collapsed split engines into one path | Keep all future logic in canonical engine |
| Age rules | ✅ Done | Phase 3 report says age handled | Add more edge cases as discovered |
| Education rules | ✅ Done | Phase 3 report says education handled | Expand qualification ladder |
| Attempts | ✅ Done | Phase 3 report says attempts handled | Validate exam-specific attempt formats |
| Nationality | ✅ Done | Phase report says nationality handled | Maintain official rules |
| Domicile | ✅ Done | Phase 3B added domicile logic | Expand state-specific rules |
| PwBD relaxation caps | ✅ Done | Phase 3B added caps | Verify per recruitment when exceptions exist |
| Ex-serviceman handling | ✅ Done | Phase 3B added service-year formula | Add validation in profile UI |
| Appearing-candidate conditional | ✅ Done | Phase 3B marks conditional verdict | Improve explanation UI |
| `is_conditional` eligibility result | ✅ Done | Phase 3B migration added column | Surface in dashboard consistently |
| Eligibility recompute queue | ✅ Done | Phase reports list queue and consumer | Monitor drain failures |
| Edge consumer unified with engine | ✅ Done | Phase 3B reports consumer posts to API route | Keep service-role route secured |
| Eligibility explanation flags | 🟡 Partial | Some explanation flags pending | Wire matched_exam/sector/type |
| AI eligibility explanation | 🔵 Planned | Proposed in AI plan | Generate from deterministic verdict only |
| Missing profile impact analysis | 🔵 Planned | Product roadmap calls for it | Add readiness/impact function |
| Eligibility paywall refinement | 🟡 Partial | Plan flags allow eligibility checks | Decide free preview vs full paid behavior |

---

## 9. Notifications and lifecycle alerts

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| `alert_events` | ✅ Done | Phase report lists table | Keep as audit/event source |
| `notification_alerts` | ✅ Done | Phase report lists table | Continue using engine-trusted alerts |
| `v_notification_feed` | ✅ Done | Phase 3A created view | Keep grants/RLS verified |
| In-app notification feed | ✅ Done | Dashboard feed exists | Improve empty states |
| Trusted `new_match` fanout | ✅ Done | Phase 3B says engine emits alerts only for matched users | Preserve trust rule |
| Deadline sweep | ✅ Done | Phase report says deployed daily 8am IST | Add more lifecycle event types |
| Notification preferences table | 🔴 Blocked | Phase report says missing/stubbed | Add migration and UI |
| Email notifications | 🔴 Blocked | Needs preferences + dispatcher | Build Phase 3C |
| WhatsApp notifications | 🔵 Planned | Phase 4 item | Build after email foundation |
| Notification readiness diagnostic | ✅ Done | `getNotificationReadiness(userId)` in `lib/db/notifications.ts` — queries profile, education, preferences, eligibility, alerts; returns `blockers[]` + `recommendedActions[]` | |
| Empty-state diagnosis | ✅ Done | `NotificationsEmptyState` component on `/dashboard/notifications` shows red blocker cards + gold action cards from readiness diagnostic | |
| AI notification summary | 🔵 Planned | AI plan | Summarize official PDF/alert context |
| AI document/action checklist | 🔵 Planned | AI plan | Generate after recruitment verification |
| Weekly digest | 🔵 Planned | AI plan | Add Pro/Elite digest |

---

## 10. Dashboard and user mission control

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Dashboard shell | ✅ Done | `DashboardShell.tsx` exists | Reorder into mission-control priority |
| Dashboard navigation | ✅ Done | DashboardNav exists | Add mobile bottom nav later |
| Profile card | ✅ Done | Dashboard uses ProfileCard | Add readiness details |
| Stats bar | ✅ Done | Dashboard uses StatsBar | Expand to preparation stats |
| Eligible recruitments widget | ✅ Done | Dashboard uses EligibleRecruitmentsWidget | Improve sorting and urgency |
| Notifications feed widget | ✅ Done | Dashboard uses NotificationsFeed | Add readiness/empty states |
| Study plan widget | ✅ Done | Dashboard uses StudyPlanWidget | Connect to daily tasks |
| Skill test widget | 🟡 Partial | Widget exists | Connect to mock/proficiency model |
| AI chat widget | ✅ Done | Dashboard uses AiChatWidget | Improve context ingestion |
| Mission-control summary | 🟡 Partial | Next-actions + daily tasks now surface on dashboard; eligibility summary and urgent deadlines still need dedicated widget | Add deadline urgency card |
| Next-best-action panel | ✅ Done | `NextBestActionPanel` component; `lib/db/next-actions.ts` generates from 7 parallel DB signals (profile gaps, deadlines, study plan, alerts); 30-min cache via `getOrGenerateNextActions`; server actions for mark-done/snooze/dismiss | |
| Profile readiness card | 🟡 Partial | Basic profile card exists | Add eligibility-critical readiness |
| Mobile dashboard order | 🔵 Planned | Roadmap specifies order | Implement responsive layout/bottom nav |
| Advanced analytics widgets | 🔵 Planned | Roadmap | Add after notes/mocks/PYQ data |

---

## 11. Study planner and preparation execution

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| AI study planner | ✅ Done | `lib/ai/study-planner.ts` exists | Improve model/version handling |
| Study plan generation action | ✅ Done | `actions/study-planner.ts` exists | Add better fallback/errors |
| Plan persistence | ✅ Done | `lib/db/study-planner.ts` saves plans/weeks | Add transactions if needed |
| Study weeks | ✅ Done | Study weeks are saved and displayed | Convert weekly plan into daily tasks |
| Study logs | ✅ Done | `logStudySession` exists | Connect to timer UI |
| Plan stats | ✅ Done | `getPlanStats` calculates completion/streak/hours | Expand analytics |
| Plan limits/paywall | ✅ Done | Study planner action checks gates | Tune free/pro/elite limits |
| Daily tasks | ✅ Done | `study_tasks` table (migration 020); `lib/db/study-tasks.ts`; `DailyTasksWidget` with optimistic status updates, progress bar, resource links; `generateTasksFromWeek` idempotently materialises JSONB daily_tasks → rows | |
| Missed-task recovery | 🔵 Planned | AI plan | Add adaptive plan logic |
| AI plan adjustment history | 🔵 Planned | AI plan | Add `ai_plan_adjustments` |
| Revision calendar | 🔵 Planned | Product direction | Add revision schedules |
| Mock schedule | 🔵 Planned | Product direction | Connect to mock-test module |
| Download plan PDF | 🟡 Partial | Plan feature flag exists | Implement PDF export if not already |

---

## 12. Timer, notes, flashcards, and revision

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Pomodoro/focus timer | 🔵 Planned | Table exists, UI component not yet built | Add timer component |
| Study sessions table | ✅ Done | `study_sessions` table in migration 020; `startStudySession` / `endStudySession` / `getRecentSessions` in `lib/db/study-tasks.ts`; `beginFocusSession` / `finishFocusSession` server actions | |
| Auto-log timer sessions | 🔵 Planned | Server actions exist; UI trigger not built | Wire to timer component |
| Personal notes | 🔵 Planned | Not found in implementation search | Add `user_notes` |
| Exam/topic-linked notes | 🔵 Planned | Product direction | Link notes to exam/subject/topic |
| AI note summarizer | 🔵 Planned | AI plan | Add note AI action |
| Flashcards | 🔵 Planned | Not found in implementation search | Add `user_flashcards` |
| Spaced repetition | 🔵 Planned | AI plan | Add `flashcard_reviews` and due logic |
| Mistake book | 🔵 Planned | Product direction | Add `mistake_entries` |
| AI revision sheet | 🔵 Planned | AI plan | Generate from notes + mistakes + weak topics |
| Revision reminders | 🔵 Planned | Product direction | Connect to reminders/notifications |

---

## 13. Mock tests and proficiency analytics

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Mock-test entry | 🔵 Planned | Not found in implementation search | Add mock-test module |
| Subject-wise mock breakdown | 🔵 Planned | AI plan | Add breakdown table |
| Topic-wise mock breakdown | 🔵 Planned | AI plan | Add after taxonomy exists |
| Accuracy/time calculations | 🔵 Planned | Deterministic stats needed | Implement calculations |
| User topic proficiency | 🔵 Planned | PYQ and AI docs propose it | Add `user_topic_proficiency` |
| AI mock analysis | 🔵 Planned | AI plan | Generate after mock entry |
| Weak-topic dashboard | 🔵 Planned | Depends on mocks/PYQ taxonomy | Build after data model |
| Adaptive plan from mocks | 🔵 Planned | Elite feature | Connect to study plan adjustment |

---

## 14. Exam intelligence and PYQ analytics

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Exam/recruitment distinction | ✅ Done in strategy | Roadmap defines exam vs recruitment | Implement exam master if not present |
| Exam master architecture | 🔵 Planned | Roadmap/PYQ docs propose tables | Add `exam_master` and taxonomy tables |
| Exam detail page | 🔵 Planned | Roadmap route planned | Build `/dashboard/exams/[examSlug]` |
| Recruitment detail intelligence | 🟡 Partial | Minimal detail page exists | Add full sections |
| Syllabus taxonomy | 🔵 Planned | PYQ doc proposes subject/topic/microtopic | Add schema and admin UI |
| PYQ papers table | 🔵 Planned | PYQ doc proposes it | Add ingestion schema |
| PYQ questions table | 🔵 Planned | PYQ doc proposes it | Build extraction/segmentation |
| AI PYQ classification | 🔵 Planned | PYQ doc proposes it | Build classifier + confidence |
| Admin PYQ review | 🔵 Planned | PYQ doc proposes it | Add review dashboard |
| Microtopic stats | 🔵 Planned | PYQ doc proposes it | Add aggregation jobs |
| Subject/topic charts | 🔵 Planned | Roadmap/PYQ docs | Build visual analytics |
| Cutoff trends | 🔵 Planned | Roadmap | Add cutoff tables and charts |
| Vacancy trends | 🔵 Planned | Roadmap | Add vacancy history tables/charts |
| Competition metrics | 🔵 Planned | Roadmap | Add metrics tables/charts |
| AI exam strategy | 🔵 Planned | PYQ and AI docs | Generate from PYQ + user data |
| Public preview of analytics | 🔵 Planned | Paywall strategy | Build limited preview |

---

## 15. Aspirant personalization and AI career guidance

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Basic profile personalization | 🟡 Partial | Profile/onboarding exists | Add progressive assessment |
| Career Chat | ✅ Done | Phase report says AI Career Chat Pro/Elite exists; system prompt now includes career_goal as named context block | |
| Career goal (aspirant's ambition narrative) | ✅ Done | `profiles.career_goal TEXT` (migration 021); onboarding final step textarea with multilingual placeholder examples (English/Hindi/Tamil/Bengali); `saveCareerGoalAndFinish` action; injected into AI chat system prompt as `ASPIRANT'S CAREER GOAL` section | |
| Aspirant context profile | 🔵 Planned | Personalization doc proposes table | Add after core prep modules |
| Financial/job urgency assessment | 🔵 Planned | Personalization doc | Add progressive assessment |
| Aptitude profile | 🔵 Planned | Personalization doc | Connect to mocks/skill tests |
| Values/work preference profile | 🔵 Planned | Personalization doc | Add optional assessment |
| Derived scoring model | 🔵 Planned | Personalization doc | Build deterministic scoring first |
| Exam-fit ranking | 🔵 Planned | Personalization doc | Combine eligibility + aptitude + goals |
| AI strategy snapshots | 🔵 Planned | Personalization doc | Add snapshot table |
| Downloadable career report | 🔵 Planned | Elite feature | Add after snapshots |

---

## 16. Marketplace and resource layer

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Marketplace access flag | ✅ Done | Plan features include marketplace_access | Build feature surface deeper |
| Marketplace browse | 🟡 Partial | Roadmap says filters too narrow | Verify current implementation |
| Filters by mode/city/institution/exam/subject/price | 🔵 Planned | Roadmap specifies filters | Expand schema and UI |
| Institute/course verification | 🔵 Planned | Roadmap | Add provider trust fields |
| Course comparison | 🔵 Planned | Paywall feature | Add compare flow |
| Personalized resource recommendations | 🔵 Planned | AI plan | Ground recommendations in DB |
| Free/paid resource distinction | 🔵 Planned | Roadmap | Add resource type/pricing fields |
| Marketplace moderation | 🔵 Planned | Admin roadmap | Build moderation queue |
| Coaching SaaS/aggregator model | ⚪ Backlog | Business direction discussed | Add after marketplace basics |

---

## 17. Admin operations

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Admin overview | 🟡 Partial | Admin page exists | Add operational KPIs |
| Source registry admin | ✅ Done | SourceRegistryManager exists | Improve forms and pagination |
| Scrape dashboard | ✅ Done | Queue and run history paginated (`?tab=queue&page=N`); `Paginator` component with Prev/Next links; evidence review tab present | Deepen evidence review coverage |
| Evidence review | 🟡 Partial | Evidence review tab exists in `AdminScrapeDashboard`; field-level verify/reject actions wired | Improve coverage per migration 017 fields |
| Organizations admin | 🟡 Partial | Admin forms exist in project context | Verify consistency |
| Recruitments admin | 🟡 Partial | Paginated (`?page=N`, 30/page); `getRecruitmentsAdminPaginated`; Prev/Next links | Redesign workflow for full post criteria |
| Posts and criteria admin | 🟡 Partial | Needs structured workflow | Build multi-section UI |
| Eligibility monitor | 🔵 Planned | Admin roadmap | Add queue/results monitor |
| Notification monitor | 🔵 Planned | Admin roadmap | Add feed/event status UI |
| Exam analytics data manager | 🔵 Planned | Needed for PYQ/cutoff/vacancy | Add after exam schema |
| Marketplace moderation | 🔵 Planned | Roadmap | Build moderation dashboard |
| Forum moderation | 🔵 Planned | Roadmap | Build if forum exists |
| Audit logs | 🟡 Partial | Admin RBAC/audit migration exists in search results | Verify coverage and add UI |
| Shared admin UI primitives | ✅ Done | `components/admin/ui/index.tsx` — `AdminInput`, `AdminSelect`, `AdminTextarea`, `AdminSection`, `AdminArrayField`, `AdminFormFooter`, `AdminStatusPill`, `AdminConfirmModal` | Migrate existing admin forms to use primitives |

---

## 18. AI automation infrastructure

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| AI study planner prompt | ✅ Done | Existing AI study planner | Add prompt versioning |
| AI career chat | ✅ Done | Pro/Elite; system prompt now includes career_goal as named section; `getChatUserContext` fetches goal | Improve context richness |
| Prompt versioning table | ✅ Done | `ai_prompt_versions` table in migration 020 — prompt_key, version, model_name, prompt_template, json_schema, confidence_policy, is_active | Wire to job runner when AI jobs are built |
| AI jobs table | ✅ Done | `ai_jobs` table in migration 020 — status, input/output JSON, confidence_score, model, token_count, timing; indexed on user_id/status/job_type | Build job runner |
| AI review queue | ✅ Done | `ai_review_queue` table in migration 020 — FK to ai_jobs, proposed_value, evidence, confidence, review_status, reviewed_by/at | Build admin review UI |
| JSON schema validation | 🔵 Planned | Needed for stable AI output | Add zod/schema validation |
| Confidence thresholds | 🔵 Planned | `confidence_policy` column exists on `ai_prompt_versions` | Implement threshold checks in job runner |
| AI job observability | 🔵 Planned | Table columns exist (token_count, timing) | Build monitoring dashboard |
| Field-level AI evidence | 🔵 Planned | AI plan | Connect ai_review_queue to admin review |
| AI output auditability | 🟡 Partial | `ai_jobs` stores model + prompt_key/version + input/output | Build job runner to populate |

---

## 19. Paywall and monetization

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Free/Pro/Elite plan definitions | ✅ Done | `lib/billing/plans.ts` | Refine based on product modules |
| Study plan limits | ✅ Done | Plan features and action checks | Tune limits |
| Regeneration limits | ✅ Done | Plan features and action checks | Tune limits |
| Notification limits | ✅ Done in plan model | Actual lifecycle limits need verification | Connect to alert channels |
| Eligibility access flag | ✅ Done in plan model | Product strategy may move full eligibility behind paywall | Decide final entitlement |
| AI chat flag | ✅ Done | Pro/Elite | Track usage |
| Marketplace access flag | ✅ Done | Pro/Elite | Expand marketplace product |
| Download plan PDF flag | 🟡 Partial | Flag exists | Implement/verify export |
| Priority support flag | ✅ Done in plan model | Operational process needed | Define support workflow |
| PYQ analytics paywall | 🔵 Planned | Strategy | Add Pro/Elite gates |
| Advanced reports paywall | 🔵 Planned | Strategy | Add Elite reports |
| Contextual upgrade prompts | 🟡 Partial | Plan helper exists | Add product-specific upgrade prompts |

---

## 20. Public/SEO/product surfaces

| Feature | Status | Evidence / Notes | Next action |
|---|---|---|---|
| Landing page | 🟡 Partial | Design files exist; actual state should be verified | Align with six product pillars |
| Pricing page | ✅ Done | Pricing route appears in search | Update copy based on final tiers |
| Public exam browse preview | 🔵 Planned | Roadmap | Build limited preview |
| Demo eligibility checker | 🔵 Planned | Roadmap | Build sample/limited checker |
| Public marketplace preview | 🔵 Planned | Roadmap | Build browse preview |
| Public forum preview | ⚪ Backlog | Roadmap says if allowed | Decide later |
| SEO exam pages | 🔵 Planned | Roadmap future routes | Build after exam master data |

---

## 21. Recommended immediate execution queue

### P0 — Stabilize and unblock

| Task | Status |
|---|---|
| Add `notification_preferences` migration | 🔴 Blocked / Needed |
| Build email dispatcher | 🔴 Blocked until preferences |
| Fix/replace misleading notification empty state | ✅ Done — `getNotificationReadiness` + `NotificationsEmptyState` |
| Add pagination to heavy admin/dashboard routes | ✅ Done — scrape queue, run history, recruitments all paginated |
| Remove or resolve dev proxy latency | 🔴 Blocked / Needed (do not remove proxy.ts without explicit instruction) |
| Create shared admin UI primitives | ✅ Done — `components/admin/ui/index.tsx` |

### P1 — Build user-retention loop

| Task | Status |
|---|---|
| Add next-best-action panel | ✅ Done — `NextBestActionPanel` + `lib/db/next-actions.ts` + server actions |
| Add daily study tasks | ✅ Done — `DailyTasksWidget` + `lib/db/study-tasks.ts` + server actions |
| Add career goal / aspirant ambition | ✅ Done — `profiles.career_goal` + onboarding question + AI chat injection |
| Add timer/focus sessions | 🟡 Partial — DB tables exist (`study_sessions`); timer UI component pending |
| Add notes | 🔵 Planned |
| Add flashcards | 🔵 Planned |
| Add mock-test entry and analysis | 🔵 Planned |

### P2 — Build intelligence moat

| Task | Status |
|---|---|
| Add exam master/taxonomy | 🔵 Planned |
| Add PYQ ingestion | 🔵 Planned |
| Add AI PYQ classification | 🔵 Planned |
| Add cutoff/vacancy history | 🔵 Planned |
| Add exam analysis charts | 🔵 Planned |
| Add AI strategy from PYQ + user weakness | 🔵 Planned |

### P3 — Scale operations and monetization

| Task | Status |
|---|---|
| Add AI recruitment extraction assistant | 🔵 Planned |
| Add admin evidence review | 🔵 Planned |
| Add marketplace filters and personalization | 🔵 Planned |
| Add career personalization snapshots | 🔵 Planned |
| Add downloadable reports | 🔵 Planned |
| Add WhatsApp notifications | 🔵 Planned |

---

## 22. Definition of Done for this checklist system

This checklist is useful only if it stays current.

A feature is `✅ Done` only when:

1. UI exists or backend job exists.
2. Required database schema exists.
3. Main happy path works.
4. Paywall/RLS/security behavior is correct where applicable.
5. Admin review/trust rule is satisfied where official data is involved.
6. It is linked from this checklist with notes.

A feature is `🟡 Partial` when:

1. Some foundation exists, but user value is incomplete.
2. There is no complete UI.
3. It works only for a narrow path.
4. It lacks review, paywall, analytics, or production robustness.

A feature is `🔴 Blocked` when:

1. A missing table/migration prevents implementation.
2. A known architectural conflict must be resolved first.
3. A dependency like email provider, WhatsApp provider, OCR, or Playwright is not yet configured.

---

## 23. Next checklist review

Recommended review cadence:

- Update after every major feature PR.
- Review weekly while building Phase AI-1 to AI-4.
- Review before starting PYQ intelligence work.
- Review before any production launch or paid-user onboarding.
