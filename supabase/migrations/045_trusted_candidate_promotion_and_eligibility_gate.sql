-- Migration 045: Trusted candidate promotion + eligibility trust gating fields

begin;

alter table public.recruitments
  add column if not exists source_candidate_id uuid null references public.recruitment_candidates(id) on delete set null,
  add column if not exists ingestion_trust_status text not null default 'legacy'
    check (ingestion_trust_status in ('legacy','unverified','verified','manual_override','rejected'));

create index if not exists idx_recruitments_ingestion_trust_status
  on public.recruitments(ingestion_trust_status, status, apply_end_date);

create index if not exists idx_recruitments_source_candidate
  on public.recruitments(source_candidate_id);

commit;
