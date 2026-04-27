# AI-Driven PYQ, Syllabus Microtopic, and Exam Pattern Analysis Architecture

_Last updated: 2026-04-27_

## 1. Purpose

This document defines the architecture for a strong AI-driven previous year questions (PYQ), syllabus microtopic, and exam-pattern analysis layer for Career Copilot.

This module should become one of the core differentiators of the product. It should help aspirants understand:

- What topics actually appear in the exam.
- Which syllabus microtopics matter most.
- Which topics are high-frequency, low-frequency, rising, or declining.
- How difficulty changes over years.
- How the exam pattern evolves.
- What to study first based on time, ability, and target score.
- Which resources are best for each weak/high-yield area.

The goal is not just to store PYQ PDFs. The goal is to convert PYQs into a decision-support system for exam strategy.

---

## 2. Strategic positioning

Career Copilot should not simply show:

> Previous year paper PDF download

It should show:

> Here is what the exam repeatedly tests, how the pattern is changing, where your weak areas are, and what exact microtopics you should prioritize this week.

This layer supports the larger Career Copilot vision:

```text
Discover official exams → Check eligibility → Understand exam intelligence → Build AI strategy → Study using targeted resources → Track progress → Apply confidently
```

---

## 3. Core product outcomes

The PYQ and microtopic module should answer the following user questions:

1. Which subjects have the highest weightage?
2. Which topics repeat most often?
3. Which microtopics are rising in importance?
4. Which topics are rarely asked and can be deprioritized?
5. What is the difficulty trend year by year?
6. What changed after the latest exam pattern update?
7. What should I study first if I have 30, 60, or 90 days?
8. What should I revise before the exam?
9. Which PYQs should I solve first?
10. Which resources should I use for my weak/high-yield topics?
11. How does this exam overlap with other exams?
12. Is this exam suitable for my aptitude and goals?

---

## 4. Deterministic vs AI responsibilities

### 4.1 Deterministic/statistical layer

Use deterministic logic for:

- Counting questions by subject/topic/microtopic.
- Calculating year-wise frequency.
- Calculating average weightage.
- Tracking difficulty distribution.
- Calculating trend direction.
- Mapping syllabus to known taxonomy.
- Showing charts/tables.
- Storing source PDF and official references.

### 4.2 AI layer

Use AI for:

- Classifying question intent.
- Mapping questions to syllabus microtopics.
- Generating concise explanations.
- Detecting pattern shifts.
- Summarizing topic trends.
- Recommending study priority.
- Creating personalized strategy.
- Connecting weak areas to resources.
- Explaining why a topic matters.
- Comparing exams by overlap and suitability.

### 4.3 Human/admin review layer

Use admin review for:

- Verifying extracted questions.
- Correcting wrong subject/topic classification.
- Validating microtopic taxonomy.
- Approving AI-generated trend summaries.
- Verifying official PYQ source links.

AI output should not be treated as authoritative until classified confidence is high or reviewed.

---

## 5. Data model architecture

### 5.1 `exam_master`

Represents a reusable exam entity.

```text
id
slug
name
category
conducting_body_id
description
official_exam_url
is_active
created_at
updated_at
```

Example:

```text
SEBI Grade A
RBI Grade B
SSC CGL
IBPS PO
MPSC Rajyaseva
UPSC CSE
```

### 5.2 `exam_syllabus_subjects`

Top-level subjects for an exam.

```text
id
exam_id
subject_name
subject_order
stage
paper_name
is_scoring
is_qualifying
created_at
updated_at
```

Examples:

```text
Quantitative Aptitude
Reasoning
English
General Awareness
Finance
Management
Economics
Law
Current Affairs
CSAT
Essay
```

### 5.3 `exam_syllabus_topics`

Mid-level topics under a subject.

```text
id
exam_id
subject_id
topic_name
topic_order
stage
paper_name
created_at
updated_at
```

Example:

```text
Subject: Quantitative Aptitude
Topic: Percentages
Topic: Profit and Loss
Topic: Time and Work
Topic: Data Interpretation
```

### 5.4 `exam_syllabus_microtopics`

Granular microtopics used for AI mapping and personalized strategy.

```text
id
exam_id
subject_id
topic_id
microtopic_name
microtopic_order
importance_baseline
concept_difficulty
prerequisite_microtopic_ids jsonb
created_at
updated_at
```

Examples:

```text
Topic: Percentages
- Percentage change
- Successive percentage change
- Percentage to fraction conversion
- Percentage comparison

Topic: Data Interpretation
- Table DI
- Bar graph DI
- Line graph DI
- Pie chart DI
- Caselet DI
- Missing DI

Topic: Finance
- Time value of money
- Primary market
- Secondary market
- Mutual funds
- Derivatives
- Risk management
- Corporate governance
```

### 5.5 `exam_pyq_papers`

Stores paper metadata.

```text
id
exam_id
year
cycle_label
stage
paper_name
shift
language
official_pdf_url
local_pdf_path
source_type: official | user_uploaded | admin_uploaded | third_party_reference
source_verified
verified_by
verified_at
created_at
updated_at
```

Only official or admin-verified PYQs should power user-facing analytics.

### 5.6 `exam_pyq_questions`

Stores individual question records.

```text
id
paper_id
exam_id
year
stage
paper_name
question_number
question_text
options_json
correct_answer
solution_text
source_page_number
question_type: mcq | descriptive | numerical | caselet | comprehension | essay | precis | interview
marks
negative_marks
difficulty_level: easy | medium | hard | very_hard
created_at
updated_at
```

### 5.7 `exam_pyq_question_classifications`

Stores AI/human classification of each question.

```text
id
question_id
exam_id
subject_id
topic_id
microtopic_id
secondary_microtopic_ids jsonb
cognitive_skill: recall | conceptual | application | analytical | calculation | interpretation | writing
question_intent
classification_confidence
classified_by: ai | admin | hybrid
model_name
prompt_version
review_status: pending | verified | corrected | rejected
reviewed_by
reviewed_at
created_at
updated_at
```

### 5.8 `exam_microtopic_stats`

Precomputed stats for fast rendering.

```text
id
exam_id
subject_id
topic_id
microtopic_id
year_from
year_to
total_questions
total_marks
average_questions_per_year
average_marks_per_year
frequency_score
trend_direction: rising | stable | declining | volatile | insufficient_data
trend_strength
average_difficulty
last_asked_year
years_asked_count
importance_score
updated_at
```

### 5.9 `exam_pattern_snapshots`

Stores year-wise pattern metadata.

```text
id
exam_id
year
stage
paper_name
total_questions
total_marks
duration_minutes
negative_marking
sectional_cutoff
qualifying_sections_json
pattern_notes
source_url
verified_at
created_at
updated_at
```

### 5.10 `exam_pattern_change_events`

Tracks pattern changes over time.

```text
id
exam_id
effective_year
change_type: syllabus | marks | duration | stages | negative_marking | qualifying_rule | descriptive | sectional
before_json
after_json
change_summary
impact_analysis
source_url
verified_by
verified_at
created_at
updated_at
```

### 5.11 `user_exam_topic_proficiency`

Stores user-level ability per subject/topic/microtopic.

```text
id
user_id
exam_id
subject_id
topic_id
microtopic_id
proficiency_score
confidence_score
last_practiced_at
questions_attempted
accuracy_percent
average_time_seconds
weakness_reason
updated_at
```

### 5.12 `ai_exam_strategy_snapshots`

Stores generated strategy outputs for consistency and auditability.

```text
id
user_id
exam_id
strategy_type: 30_day | 60_day | 90_day | revision | beginner | crash_course | custom
input_context_json
recommendation_json
summary
model_name
prompt_version
created_at
expires_at
```

---

## 6. AI extraction and classification pipeline

### 6.1 Pipeline overview

```text
PYQ PDF upload / official PDF found
        ↓
Text extraction / OCR only if necessary
        ↓
Question segmentation
        ↓
Answer/option extraction
        ↓
AI classification to subject/topic/microtopic
        ↓
Confidence scoring
        ↓
Admin review for low-confidence records
        ↓
Stats aggregation
        ↓
User-facing charts and strategy layer
```

### 6.2 Question segmentation

Question segmentation should extract:

- Question number.
- Question text.
- Options.
- Correct answer, if available.
- Passage/caselet association.
- Source page number.
- Stage/paper/shift.

### 6.3 AI classification prompt objectives

The AI classifier should return structured JSON:

```json
{
  "subject": "Quantitative Aptitude",
  "topic": "Data Interpretation",
  "microtopic": "Table DI",
  "secondary_microtopics": ["Percentage calculation"],
  "difficulty_level": "medium",
  "cognitive_skill": "interpretation",
  "question_intent": "Tests ability to interpret tabular data and calculate percentage change",
  "confidence": 0.86
}
```

### 6.4 Confidence thresholds

Recommended rules:

| Confidence | Action |
|---:|---|
| `>= 0.85` | Auto-accept but mark AI-classified |
| `0.65–0.84` | Use in internal stats, send to admin review |
| `< 0.65` | Do not use in user-facing analytics until reviewed |

### 6.5 Admin correction loop

When an admin corrects a classification, store:

- Original AI classification.
- Corrected classification.
- Reviewer ID.
- Reason/note.
- Model version.

This creates training/evaluation data for future prompt improvement.

---

## 7. Pattern evaluation engine

### 7.1 Pattern dimensions

Evaluate exam patterns across:

- Question count.
- Marks distribution.
- Duration.
- Negative marking.
- Sectional cutoff.
- Descriptive vs objective weight.
- Subject weightage.
- Topic frequency.
- Microtopic frequency.
- Difficulty distribution.
- Question-type mix.
- Caselet/comprehension frequency.
- Current-affairs recency window.

### 7.2 Pattern change detection

AI/statistics should detect:

- New section added.
- Section removed.
- Descriptive paper added/removed.
- Subject weightage changed.
- Difficulty increased/decreased.
- Current affairs horizon changed.
- More analytical/application-based questions.
- Fewer direct factual questions.
- More caselet-style questions.

### 7.3 Output examples

```text
Pattern insight:
Finance questions have shifted from direct definitions to application-based questions over the last three cycles.

Strategy impact:
Do not rely only on notes. Practice case-based finance MCQs and current market examples.
```

```text
Pattern insight:
Data Interpretation appears every year, but the format is volatile. Table DI and mixed chart DI dominate.

Strategy impact:
Practice 3 DI sets weekly from the beginning, not only near mock-test phase.
```

---

## 8. Visual analytics requirements

The exam analysis page should include visually appealing and decision-supportive components.

### 8.1 Required charts

| Chart | Purpose |
|---|---|
| Subject-wise donut chart | Show broad question distribution |
| Topic-wise bar chart | Show most important topics |
| Microtopic heatmap | Show year-wise repetition |
| Difficulty stacked bar | Show easy/medium/hard trend by year |
| Weightage line chart | Show rising/declining subject weight |
| Pattern timeline | Show structural exam changes |
| Cutoff vs difficulty chart | Compare difficulty and cutoff trend |
| Vacancy vs cutoff chart | Show competition pressure |
| Preparation priority matrix | High weight/low difficulty vs high weight/high difficulty |

### 8.2 Tables

| Table | Purpose |
|---|---|
| Microtopic ranking table | Rank microtopics by priority |
| Year-wise PYQ table | Link to questions by year |
| Topic frequency table | Show count and percentage |
| Cutoff table | Category/stage/year cutoffs |
| Vacancy table | Category/post/year vacancies |
| Resource mapping table | Microtopic → resources |

### 8.3 Priority matrix

Create a 2x2 study priority matrix:

```text
High Frequency + Low Difficulty     → Score boosters
High Frequency + High Difficulty    → Core focus area
Low Frequency + Low Difficulty      → Quick revision
Low Frequency + High Difficulty     → Deprioritize unless time permits
```

This should be central to AI strategy.

---

## 9. AI strategy layer

### 9.1 Inputs

AI strategy should use:

- User profile.
- Exam eligibility.
- Exam date/time available.
- Available study hours.
- Topic/microtopic frequency.
- Difficulty trends.
- User proficiency.
- Mock scores.
- PYQ pattern.
- Cutoff margin.
- Vacancy/competition trend.
- Resource availability.

### 9.2 Strategy outputs

AI should generate:

- 30-day strategy.
- 60-day strategy.
- 90-day strategy.
- Beginner strategy.
- Revision strategy.
- Weak-area strategy.
- Crash-course strategy.
- Full preparation roadmap.

### 9.3 Example output

```text
Your 60-day SEBI Grade A strategy

Priority 1: Finance and Management fundamentals
Reason: 48–55% of Paper 2 weightage historically comes from these areas.

Priority 2: Current affairs linked to financial regulation
Reason: Recent questions increasingly connect static concepts with current developments.

Priority 3: Quant and reasoning speed maintenance
Reason: Paper 1 is qualifying pressure; you need safe clearance, not overinvestment.

Deprioritize:
Low-frequency static topics that have not appeared in the last five cycles.
```

---

## 10. Personalization rules

### 10.1 User-level personalization

The same exam should produce different strategies for different users.

Example:

#### User A: strong quant, weak finance

```text
Focus more on finance/management concept-building and regulatory current affairs.
Keep quant to speed maintenance.
```

#### User B: weak quant, strong finance

```text
Maintain Paper 2 advantage but allocate daily quant/reasoning practice to avoid Paper 1 failure.
```

#### User C: only 2 hours/day

```text
Use high-yield microtopics only. Avoid low-frequency and high-complexity areas until core coverage is complete.
```

#### User D: exam in 20 days

```text
Switch to revision, PYQ, and mock-analysis mode. Do not start large new topics unless they are high-frequency and low-difficulty.
```

### 10.2 AI recommendation types

Store recommendations as structured records:

```text
microtopic_priority
resource_recommendation
mock_test_recommendation
revision_recommendation
exam_fit_recommendation
apply_now_recommendation
avoid_or_deprioritize_recommendation
```

---

## 11. AI resource mapping

### 11.1 Resource mapping by microtopic

Each microtopic should connect to:

- Free videos.
- Official material.
- PYQ sets.
- Practice questions.
- Books.
- Paid courses.
- Test series.
- Marketplace resources.

### 11.2 Recommendation logic

Resource recommendations should consider:

- User budget.
- Free vs paid preference.
- Language preference.
- Time available.
- Current proficiency.
- Resource trust score.
- Course completion length.
- Exam relevance.
- Topic match.

### 11.3 Example

```text
Weak microtopic: Table DI

Recommended free path:
1. Basic table DI concept video
2. 30 PYQ-based DI questions
3. One timed sectional set every Sunday

Paid option:
Banking/Regulatory Paper 1 DI sectional test series

Why:
Table DI appears frequently and is a scoring area if speed improves.
```

---

## 12. User-facing experience

### 12.1 Exam analysis page sections

Each exam analysis page should include:

1. Pattern overview.
2. Subject-wise distribution.
3. Topic-wise distribution.
4. Microtopic heatmap.
5. Difficulty trend.
6. Year-wise PYQ explorer.
7. High-yield microtopics.
8. Low-yield/deprioritized topics.
9. Pattern change summary.
10. Cutoff/vacancy context.
11. AI strategy recommendation.
12. Personalized weak-area plan.
13. Free and paid resource recommendations.

### 12.2 PYQ explorer

Filters:

- Year.
- Stage.
- Paper.
- Subject.
- Topic.
- Microtopic.
- Difficulty.
- Question type.
- Cognitive skill.

Actions:

- View question.
- View solution.
- Add to practice set.
- Mark as weak.
- Ask AI to explain.
- Generate similar practice questions.

### 12.3 Microtopic profile page

For each microtopic:

- Definition.
- Prerequisites.
- Years asked.
- Question count.
- Average marks.
- Difficulty trend.
- Sample PYQs.
- Common mistakes.
- Resource recommendations.
- Practice plan.

---

## 13. Admin experience

### 13.1 Admin PYQ dashboard

Admin should be able to:

- Upload PYQ PDF.
- Link official PYQ URL.
- View extracted questions.
- Review AI classification.
- Correct subject/topic/microtopic.
- Approve/reject low-confidence classifications.
- Recompute stats.
- Publish analysis.

### 13.2 Admin quality indicators

Show:

- Total questions extracted.
- Classification confidence average.
- Low-confidence count.
- Pending review count.
- Verified questions count.
- Topics unmapped.
- Duplicate questions.
- Extraction errors.

---

## 14. Paywall strategy

### 14.1 Public/free preview

Public/free users can see:

- Limited subject-wise overview.
- One-year PYQ preview.
- Limited top topics.
- Demo AI strategy summary.

### 14.2 Paid features

Paywalled:

- Full microtopic heatmap.
- Full PYQ explorer.
- Personalized topic priority.
- AI strategy generator.
- Weakness-based resource mapping.
- Pattern-change explanation.
- Cutoff/vacancy integrated strategy.
- Downloadable analysis report.

### 14.3 Elite features

Elite:

- Adaptive weekly strategy.
- Mock-score-based plan correction.
- AI-generated revision sheets.
- Custom practice set generation.
- Exam comparison by syllabus overlap.
- Long-term career/exam portfolio strategy.

---

## 15. LLM safety and factuality rules

1. AI must not invent PYQ questions.
2. AI must not invent official cutoffs, vacancies, or exam rules.
3. AI-generated analysis must cite the underlying structured data/source where possible.
4. AI must distinguish verified data from inferred strategy.
5. Low-confidence classifications must not power user-facing claims unless reviewed.
6. Official PDFs and verified admin entries should be preferred.
7. Aggregator data should never be shown as authoritative to users.

---

## 16. Implementation phases

### Phase PYQ-1: Data model and admin ingestion

- Add syllabus subject/topic/microtopic tables.
- Add PYQ paper and question tables.
- Add question classification table.
- Add admin upload/review dashboard.

### Phase PYQ-2: AI classification pipeline

- Implement PDF text extraction.
- Segment questions.
- Classify questions into subject/topic/microtopic.
- Store confidence scores.
- Add admin review workflow.

### Phase PYQ-3: Statistics aggregation

- Build microtopic stats aggregation.
- Build pattern snapshot table.
- Build trend detection service.
- Add recompute action.

### Phase PYQ-4: User-facing visual analytics

- Build exam analysis page.
- Add charts, heatmaps, tables, timelines.
- Add PYQ explorer.
- Add microtopic profile page.

### Phase PYQ-5: AI strategy and personalization

- Connect user profile and proficiency.
- Generate personalized study strategy.
- Generate resource recommendations.
- Add dashboard next-best-actions.

### Phase PYQ-6: Paywall and reports

- Add public preview limits.
- Gate full analysis behind Pro/Elite.
- Add downloadable reports.
- Add adaptive strategy for Elite.

---

## 17. Success metrics

### Product metrics

- Number of verified PYQs uploaded.
- Percentage of questions classified.
- Percentage of classifications verified.
- Number of microtopics mapped.
- Exam analysis page engagement.
- PYQ explorer usage.
- Strategy generation count.
- Resource click-through rate.
- Free-to-paid conversion from analytics preview.

### Quality metrics

- Classification accuracy.
- Low-confidence classification rate.
- Admin correction rate.
- Topic coverage completeness.
- Source verification rate.
- User satisfaction with strategy.

### Learning metrics

- Practice completion rate.
- Weak-topic improvement.
- Mock score improvement.
- Study plan adherence.
- Revision completion rate.

---

## 18. Final direction

This module should transform PYQs from static PDFs into a high-value intelligence layer.

The final user value should be:

> Career Copilot tells me exactly what the exam actually asks, which microtopics matter, how the pattern is changing, what I personally should prioritize, and which resources will help me improve fastest.

This is one of the strongest AI-driven product layers for Career Copilot and should be treated as a core Pro/Elite feature.
