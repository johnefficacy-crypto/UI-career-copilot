-- Migration 029: User events and form submissions telemetry tables
--
-- user_events:      tracks every user interaction (impression, click, save,
--                   apply_click, mark_applied, dismiss) against any entity.
--                   Used for ranking v1 (urgency + fit + behavior).
--
-- form_submissions: tracks whether a user filled or declined the exam-specific
--                   pre-application form. One row per (user, exam).
--
-- Both tables are required by user_recruitment_state (migration 027) and
-- exam_user_summary (migration 028).

begin;

create table if not exists public.user_events (
  id          uuid    primary key default gen_random_uuid(),
  user_id     uuid    not null references public.profiles(id) on delete cascade,
  entity_type text    not null check (
    entity_type in ('recruitment', 'exam', 'marketplace_item', 'alert', 'dashboard')
  ),
  entity_id   uuid    not null,
  event_type  text    not null check (
    event_type in (
      'impression',
      'click',
      'open_alert',
      'save',
      'unsave',
      'apply_click',
      'mark_applied',
      'dismiss',
      'decline_form',
      'submit_form'
    )
  ),
  metadata    jsonb   not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists ix_user_events_user_time
  on public.user_events (user_id, created_at desc);

create index if not exists ix_user_events_entity
  on public.user_events (entity_type, entity_id, created_at desc);

alter table if exists public.user_events enable row level security;

create policy "user_events_own_read"
  on public.user_events for select to authenticated
  using (user_id = auth.uid());

create policy "user_events_own_insert"
  on public.user_events for insert to authenticated
  with check (user_id = auth.uid());

create policy "service_role_user_events"
  on public.user_events for all to service_role
  using (true) with check (true);

comment on table public.user_events is
  'User interaction events for telemetry and behavioral ranking. '
  'Tracks impressions, clicks, saves, apply-clicks, dismissals.';

-- ── form_submissions ──────────────────────────────────────────────────────────

create table if not exists public.form_submissions (
  id           uuid    primary key default gen_random_uuid(),
  user_id      uuid    not null references public.profiles(id) on delete cascade,
  exam_id      uuid    not null references public.exams(id) on delete cascade,
  status       text    not null check (status in ('filled', 'declined')),
  payload      jsonb,
  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, exam_id)
);

alter table if exists public.form_submissions enable row level security;

create policy "form_submissions_own"
  on public.form_submissions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "service_role_form_submissions"
  on public.form_submissions for all to service_role
  using (true) with check (true);

comment on table public.form_submissions is
  'Tracks whether a user filled or declined the exam-specific pre-application form.';

commit;
