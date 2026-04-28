-- Migration 027: user_recruitment_state materialized view
--
-- Powers the mission-control dashboard. Joins eligibility results with
-- recruitment data, latest alert, and user behavioral signals (save/apply)
-- into a single row per (user, recruitment).
--
-- Depends on:
--   public.eligibility_results  — must exist (Phase 3B)
--   public.recruitments         — must exist
--   public.notification_alerts  — must exist (Phase 3A)
--   public.user_events          — created by migration 029
--
-- The materialized view is refreshed by the eligibility consumer after each
-- recompute run. For now, refresh manually or via pg_cron:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_recruitment_state;

begin;

create materialized view if not exists public.user_recruitment_state as
with latest_alert as (
  select distinct on (user_id, recruitment_id)
    user_id,
    recruitment_id,
    alert_type,
    priority,
    sent_at
  from public.notification_alerts
  order by user_id, recruitment_id, sent_at desc nulls last
),
event_rollup as (
  select
    user_id,
    entity_id                                                     as recruitment_id,
    bool_or(event_type = 'save')                                  as saved,
    bool_or(event_type = 'mark_applied')                          as applied,
    max(created_at) filter (where event_type = 'apply_click')     as last_apply_click_at
  from public.user_events
  where entity_type = 'recruitment'
  group by user_id, entity_id
)
select
  er.user_id,
  er.recruitment_id,
  er.status                                                       as eligibility_status,
  er.reason_codes,
  er.explanation,
  r.title                                                         as recruitment_name,
  r.organization_id,
  r.apply_start_date,
  r.apply_end_date,
  case
    when r.apply_end_date is not null
    then greatest(
           (extract(epoch from (r.apply_end_date - now())) / 86400)::int,
           0
         )
    else null
  end                                                             as days_to_deadline,
  la.alert_type                                                   as latest_alert_type,
  la.priority                                                     as latest_alert_priority,
  coalesce(ev.saved,   false)                                     as saved,
  coalesce(ev.applied, false)                                     as applied,
  ev.last_apply_click_at,
  now()                                                           as refreshed_at
from public.eligibility_results er
join public.recruitments r
  on r.id = er.recruitment_id
left join latest_alert la
  on la.user_id        = er.user_id
 and la.recruitment_id = er.recruitment_id
left join event_rollup ev
  on ev.user_id        = er.user_id
 and ev.recruitment_id = er.recruitment_id;

create unique index if not exists ix_user_recruitment_state_user_recruitment
  on public.user_recruitment_state (user_id, recruitment_id);

comment on materialized view public.user_recruitment_state is
  'Per-user, per-recruitment state snapshot. Refresh after eligibility recompute. '
  'Powers the mission-control dashboard API.';

commit;
