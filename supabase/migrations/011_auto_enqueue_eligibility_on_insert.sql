-- Migration 011: Auto-enqueue eligibility recompute on new recruitment
--
-- WHY:
--   The TypeScript path in approveScrapeItem() (lib/db/notifications.ts) already
--   enqueues eligibility_recompute_queue rows for every onboarded user when an
--   admin approves a scrape_queue item. But that path is fragile:
--     1. Silent try/catch — failures are console.error'd only.
--     2. Dev-server staleness — if the running process is on old code the
--        enqueue block is absent entirely.
--     3. Any code path that inserts into recruitments BYPASSING approveScrapeItem
--        (seed scripts, manual SQL, future admin tools, the scheduled-scraper
--        promoting high-confidence items directly) leaves the queue empty and the
--        eligibility-consumer Edge Function has nothing to drain.
--
-- FIX:
--   Move the enqueue into a database-level AFTER INSERT trigger on recruitments.
--   This is the canonical place — any row entering the table, from any caller,
--   will fan out a recompute request for every onboarded user. The trigger is
--   idempotent: if a user already has a pending row for this (user_id,
--   recruitment_id, status), ON CONFLICT DO NOTHING skips it. The TypeScript
--   enqueue becomes a harmless no-op (its ignoreDuplicates:true upsert hits the
--   same unique index) — we keep it as belt-and-suspenders documentation of
--   intent, but the trigger is the real guarantee.
--
-- IDEMPOTENCY:
--   uq_recompute_queue is UNIQUE (user_id, recruitment_id, status). A user can
--   have at most one 'pending' request per recruitment. After the consumer
--   processes it (status → 'done' / 'failed'), a subsequent trigger fire for a
--   re-opened or re-promoted recruitment inserts a fresh 'pending' row.
--
-- PERF:
--   The onboarded-user count is O(10³–10⁴) in production. An INSERT-per-user
--   loop inside a trigger is acceptable at this scale. If it grows further,
--   switch to a single INSERT…SELECT (already done here).

BEGIN;

-- ── Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_enqueue_eligibility_for_new_recruitment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a 'pending' queue row for every onboarded user. ON CONFLICT handles
  -- the case where a row already exists (e.g. TypeScript path raced us to it).
  INSERT INTO public.eligibility_recompute_queue
    (user_id, recruitment_id, status, reason, queued_at)
  SELECT
    p.id,
    NEW.id,
    'pending',
    'new_recruitment_inserted',
    NOW()
  FROM public.profiles p
  WHERE p.onboarding_completed = true
  ON CONFLICT (user_id, recruitment_id, status) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_enqueue_eligibility_for_new_recruitment() IS
  'AFTER INSERT trigger on recruitments — fans out eligibility_recompute_queue
   rows for every onboarded user. Idempotent via uq_recompute_queue. Makes the
   TypeScript enqueue in approveScrapeItem() redundant but both can coexist.';

-- ── Attach trigger ──────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_enqueue_eligibility_on_recruitment_insert
  ON public.recruitments;

CREATE TRIGGER trg_enqueue_eligibility_on_recruitment_insert
AFTER INSERT ON public.recruitments
FOR EACH ROW
EXECUTE FUNCTION public.fn_enqueue_eligibility_for_new_recruitment();

-- ── Backfill: enqueue any existing (user, recruitment) pair that has no
--    queue row yet. Safe to re-run — NOT EXISTS guard + ON CONFLICT.
--    Only targets open/upcoming recruitments so we don't flood the queue with
--    already-closed notifications the consumer would just discard.
INSERT INTO public.eligibility_recompute_queue
  (user_id, recruitment_id, status, reason, queued_at)
SELECT
  p.id,
  r.id,
  'pending',
  'migration_011_backfill',
  NOW()
FROM public.profiles p
  CROSS JOIN public.recruitments r
WHERE p.onboarding_completed = true
  AND r.status IN ('open', 'upcoming', 'published')
  AND NOT EXISTS (
    SELECT 1 FROM public.eligibility_recompute_queue q
    WHERE q.user_id        = p.id
      AND q.recruitment_id = r.id
  )
ON CONFLICT (user_id, recruitment_id, status) DO NOTHING;

COMMIT;

-- ── Sanity check (optional) ──────────────────────────────────────────────────
--   SELECT status, COUNT(*)
--   FROM eligibility_recompute_queue
--   GROUP BY status;
