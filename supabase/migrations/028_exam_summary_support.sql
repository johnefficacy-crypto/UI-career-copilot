-- Migration 028: Exam summary support
--
-- Adds:
--   recruitments.exam_id  — links a recruitment to a canonical exam
--   exam_cycles           — tracks cycles (notification, exam, result dates) per exam
--   exam_user_summary     — view joining exam + cycle + vacancy trend + user fit
--
-- Used by: app/api/exams/summary/route.ts → exams page summary cards.

begin;

-- Link recruitments to exams (optional FK — backfill from slug matching later)
alter table if exists public.recruitments
  add column if not exists exam_id uuid references public.exams(id);

create index if not exists ix_recruitments_exam_id
  on public.recruitments (exam_id)
  where exam_id is not null;

-- Exam cycles table
create table if not exists public.exam_cycles (
  id              uuid        primary key default gen_random_uuid(),
  exam_id         uuid        not null references public.exams(id) on delete cascade,
  cycle_label     text        not null,
  key_dates       jsonb       not null default '[]'::jsonb,
  cycle_start_at  timestamptz,
  cycle_end_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists ix_exam_cycles_exam_created
  on public.exam_cycles (exam_id, created_at desc);

comment on table public.exam_cycles is
  'Annual or periodic cycles for each exam. key_dates is [{label, date}] array.';

-- Exam user summary view
create or replace view public.exam_user_summary as
with latest_cycle as (
  select
    ec.exam_id,
    ec.cycle_label,
    ec.key_dates,
    row_number() over (
      partition by ec.exam_id
      order by coalesce(ec.cycle_start_at, ec.created_at) desc
    ) as rn
  from public.exam_cycles ec
),
vacancy_stats as (
  select
    r.exam_id,
    sum(coalesce(r.total_vacancies, 0))
      filter (where r.created_at >= now() - interval '12 months')   as vacancies_last_12m,
    sum(coalesce(r.total_vacancies, 0))
      filter (where r.created_at >= now() - interval '24 months'
                and r.created_at <  now() - interval '12 months')   as vacancies_prev_12m
  from public.recruitments r
  where r.exam_id is not null
  group by r.exam_id
),
fit as (
  select
    urs.user_id,
    r.exam_id,
    count(*) filter (where urs.eligibility_status = 'eligible')                     as eligible_count,
    count(*) filter (where urs.eligibility_status = 'conditional')                  as conditional_count,
    count(*) filter (where urs.eligibility_status not in ('eligible','conditional')) as blocked_count
  from public.user_recruitment_state urs
  join public.recruitments r on r.id = urs.recruitment_id
  where r.exam_id is not null
  group by urs.user_id, r.exam_id
),
form_status as (
  select
    fs.user_id,
    fs.exam_id,
    max(case when fs.status = 'filled'   then coalesce(fs.submitted_at, fs.created_at) end) as filled_at,
    max(case when fs.status = 'declined' then fs.created_at end)                             as declined_at
  from public.form_submissions fs
  group by fs.user_id, fs.exam_id
)
select
  e.id                     as exam_id,
  e.slug,
  e.title,
  f.user_id,
  lc.cycle_label           as current_cycle_label,
  lc.key_dates,
  case
    when vs.vacancies_last_12m is null or vs.vacancies_prev_12m is null then 'insufficient'
    when vs.vacancies_last_12m > vs.vacancies_prev_12m                  then 'up'
    when vs.vacancies_last_12m < vs.vacancies_prev_12m                  then 'down'
    else                                                                      'flat'
  end                      as vacancy_trend,
  coalesce(f.eligible_count,   0) as eligible_count,
  coalesce(f.conditional_count,0) as conditional_count,
  coalesce(f.blocked_count,    0) as blocked_count,
  fs.filled_at,
  fs.declined_at
from public.exams e
left join latest_cycle lc
  on lc.exam_id = e.id and lc.rn = 1
left join vacancy_stats vs
  on vs.exam_id = e.id
left join fit f
  on f.exam_id = e.id
left join form_status fs
  on fs.exam_id = e.id and fs.user_id = f.user_id;

comment on view public.exam_user_summary is
  'Per-user, per-exam summary for the exams page cards. '
  'Requires user_recruitment_state and form_submissions to exist.';

commit;
