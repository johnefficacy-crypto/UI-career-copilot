-- =============================================================================
-- notification_engine_setup.sql
-- Career Copilot — Phase 10: Notification Engine
--
-- Run in Supabase SQL Editor AFTER seed_refined.sql.
-- Idempotent — safe to re-run.
-- =============================================================================

-- ── 1. notification_alerts RLS (table already exists in schema) ───────────────

ALTER TABLE public.notification_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own alerts"   ON public.notification_alerts;
DROP POLICY IF EXISTS "Users update own alerts" ON public.notification_alerts;
DROP POLICY IF EXISTS "Service role insert"     ON public.notification_alerts;

CREATE POLICY "Users read own alerts"
  ON public.notification_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own alerts"
  ON public.notification_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins and service role can insert alerts
CREATE POLICY "Service role insert alerts"
  ON public.notification_alerts FOR INSERT
  WITH CHECK (true);   -- guarded at app layer; DB trigger uses service role

-- ── 2. scrape_runs, scrape_queue, scrape_sources RLS ─────────────────────────

ALTER TABLE public.scrape_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;

-- Admins manage scraping infrastructure
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['scrape_runs','scrape_queue','scrape_sources'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_admin_all" ON public.%1$s', t);
    EXECUTE format(
      'CREATE POLICY "%1$s_admin_all" ON public.%1$s FOR ALL
       USING      (public.is_admin(auth.uid()))
       WITH CHECK (public.is_admin(auth.uid()))',
      t
    );
    -- Service role (Edge Function) can write without user session
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_service_all" ON public.%1$s', t);
    EXECUTE format(
      'CREATE POLICY "%1$s_service_all" ON public.%1$s FOR ALL
       USING      (true)
       WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ── 3. Useful indexes ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notification_alerts_user_unread
  ON public.notification_alerts (user_id, is_read, sent_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notification_alerts_recruitment
  ON public.notification_alerts (recruitment_id);

CREATE INDEX IF NOT EXISTS idx_scrape_queue_status
  ON public.scrape_queue (status, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_queue_run
  ON public.scrape_queue (scrape_run_id);

CREATE INDEX IF NOT EXISTS idx_recruitments_status_apply
  ON public.recruitments (status, apply_end_date);

-- ── 4. DB function: fan-out alerts when a recruitment opens ──────────────────
-- Fires whenever recruitments.status changes to 'open'.
-- Inserts notification_alerts rows for every user whose preferences match.
-- Runs as SECURITY DEFINER so it can write across user RLS boundaries.

CREATE OR REPLACE FUNCTION public.fn_notify_recruitment_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec          RECORD;
  org_type_val TEXT;
  alert_type   TEXT := 'new_match';
BEGIN
  -- Only fire when status transitions to 'open'
  IF NEW.status = 'open' AND (OLD.status IS DISTINCT FROM 'open') THEN

    -- Look up org type once
    SELECT type INTO org_type_val
    FROM public.organizations
    WHERE id = NEW.organization_id;

    -- Fan out to matching users
    FOR rec IN
      SELECT DISTINCT p.id AS user_id
      FROM public.profiles p
      LEFT JOIN public.aspirant_preferences ap ON ap.user_id = p.id
      WHERE
        p.onboarding_completed = true
        AND (
          -- user listed this exact exam in target_exams
          NEW.name ILIKE ANY (COALESCE(ap.target_exams, '{}'))

          -- or org type matches a preferred sector
          OR LOWER(org_type_val) ILIKE ANY (
               SELECT LOWER(s) FROM UNNEST(COALESCE(ap.preferred_sectors, '{}')) s
             )

          -- or user's generic target_type matches
          OR (
            p.target_type IS NOT NULL
            AND (
              (p.target_type = 'banking'      AND org_type_val IN ('Banking','PSU'))
              OR (p.target_type = 'regulatory' AND org_type_val = 'Regulatory')
              OR (p.target_type = 'central_govt' AND org_type_val = 'Central Govt')
              OR (p.target_type = 'railways'   AND org_type_val = 'Central Govt'
                  AND NEW.name ILIKE '%railway%')
            )
          )
        )
    LOOP
      -- Upsert: one alert per user per recruitment (no spam on re-triggers)
      INSERT INTO public.notification_alerts
        (user_id, recruitment_id, alert_type, is_read)
      VALUES
        (rec.user_id, NEW.id, alert_type, false)
      ON CONFLICT DO NOTHING;
    END LOOP;

  END IF;

  -- Deadline alerts — 3 days out
  IF NEW.apply_end_date IS NOT NULL
     AND NEW.apply_end_date = CURRENT_DATE + INTERVAL '3 days'
     AND NEW.status = 'open'
  THEN
    UPDATE public.notification_alerts
    SET    alert_type = 'deadline_3day'
    WHERE  recruitment_id = NEW.id
      AND  alert_type = 'new_match'
      AND  is_read = false;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_notify_recruitment_opened ON public.recruitments;
CREATE TRIGGER trg_notify_recruitment_opened
  AFTER INSERT OR UPDATE OF status, apply_end_date
  ON public.recruitments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_recruitment_opened();

-- ── 5. DB function: auto-promote high-confidence scrape_queue items ───────────
-- When a scrape_queue row is inserted with status='approved' AND
-- confidence_score >= 0.92, automatically promote to recruitments.

CREATE OR REPLACE FUNCTION public.fn_promote_approved_scrape()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id  UUID;
  ext     JSONB := NEW.extracted_data;
  rec_id  UUID;
  y       INT;
BEGIN
  IF NEW.status = 'approved' AND NEW.confidence_score >= 0.92 THEN

    y := COALESCE((ext->>'year')::INT, EXTRACT(YEAR FROM NOW())::INT);

    -- Find or create organisation
    SELECT id INTO org_id
    FROM public.organizations
    WHERE LOWER(name) = LOWER(COALESCE(ext->>'organization_name', ''))
    LIMIT 1;

    IF org_id IS NULL AND (ext->>'organization_name') IS NOT NULL THEN
      INSERT INTO public.organizations (name, type)
      VALUES (
        ext->>'organization_name',
        COALESCE(ext->>'org_type', 'Central Govt')
      )
      RETURNING id INTO org_id;
    END IF;

    -- Upsert recruitment (dedup on name + year)
    INSERT INTO public.recruitments
      (organization_id, name, year,
       notification_date, apply_start_date, apply_end_date, status)
    VALUES (
      org_id,
      COALESCE(ext->>'title', 'Unknown'),
      y,
      NULLIF(ext->>'notification_date', '')::DATE,
      NULLIF(ext->>'apply_start_date',  '')::DATE,
      NULLIF(ext->>'apply_end_date',    '')::DATE,
      CASE
        WHEN NULLIF(ext->>'apply_end_date','')::DATE < CURRENT_DATE THEN 'closed'
        WHEN NULLIF(ext->>'apply_start_date','')::DATE > CURRENT_DATE THEN 'upcoming'
        ELSE 'open'
      END
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO rec_id;

    -- Link queue item to promoted recruitment
    IF rec_id IS NOT NULL THEN
      UPDATE public.scrape_queue
      SET duplicate_of = rec_id
      WHERE id = NEW.id;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_approved_scrape ON public.scrape_queue;
CREATE TRIGGER trg_promote_approved_scrape
  AFTER INSERT OR UPDATE OF status
  ON public.scrape_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_promote_approved_scrape();

-- ── 6. Backfill: generate open-recruitment alerts for existing users ───────────
-- Run once after setup to seed notification_alerts for currently open exams.

DO $$
DECLARE
  rec       RECORD;
  usr       RECORD;
  org_type  TEXT;
BEGIN
  FOR rec IN
    SELECT r.*, o.type AS org_type
    FROM   public.recruitments r
    LEFT JOIN public.organizations o ON o.id = r.organization_id
    WHERE  r.status = 'open'
  LOOP
    FOR usr IN
      SELECT DISTINCT p.id AS user_id
      FROM   public.profiles p
      LEFT JOIN public.aspirant_preferences ap ON ap.user_id = p.id
      WHERE  p.onboarding_completed = true
    LOOP
      INSERT INTO public.notification_alerts
        (user_id, recruitment_id, alert_type, is_read)
      VALUES
        (usr.user_id, rec.id, 'new_match', false)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── 7. Helper view: user_notifications_feed ──────────────────────────────────
-- Used by NotificationsFeed component to get enriched notification data.

CREATE OR REPLACE VIEW public.user_notifications_feed AS
SELECT
  na.id,
  na.user_id,
  na.alert_type,
  na.is_read,
  na.sent_at,
  na.read_at,
  r.id            AS recruitment_id,
  r.name          AS recruitment_name,
  r.status        AS recruitment_status,
  r.apply_end_date,
  r.apply_start_date,
  r.notification_date,
  r.year,
  o.name          AS org_name,
  o.type          AS org_type,
  o.state         AS org_state,
  CASE
    WHEN r.apply_end_date IS NULL THEN NULL
    ELSE (r.apply_end_date::DATE - CURRENT_DATE)
  END             AS days_to_deadline
FROM  public.notification_alerts na
JOIN  public.recruitments        r  ON r.id = na.recruitment_id
LEFT JOIN public.organizations   o  ON o.id = r.organization_id;

-- RLS on the view is enforced via the underlying tables.
-- Grant select to authenticated role so it works via supabase-js.
GRANT SELECT ON public.user_notifications_feed TO authenticated;