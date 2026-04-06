-- =============================================================================
-- Career Copilot — Notification Engine v2
-- Migration: 001_notification_engine_v2.sql
--
-- Run AFTER existing schema + seed_refined.sql + scraping_setup.sql
-- Idempotent — safe to re-run.
--
-- What this adds:
--   1. source_observations        — raw extracted items per scrape run
--   2. recruitment_versions       — field-level versioned snapshots
--   3. recruitment_field_diffs    — precise field-level change log
--   4. alert_events               — typed domain events driving delivery
--   5. alert_deliveries           — per-channel delivery tracking
--   6. user_notification_prefs    — per-user channel/frequency preferences
--   7. tracked_recruitments       — user-pinned recruitments
--   8. source_health_metrics      — hourly source health roll-ups
--   9. Upgrades to scrape_sources — adds tier, trust_score, adapter_type
--  10. Upgrades to notification_alerts — adds event_id, explanation JSONB
--  11. Upgraded DB functions: fn_detect_recruitment_changes
--                             fn_generate_alert_events
--                             fn_fanout_alert_event
--  12. Full index set
--  13. Views: v_notification_feed, v_admin_queue_review
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- STEP 1: Upgrade scrape_sources
-- =============================================================================

ALTER TABLE public.scrape_sources
  ADD COLUMN IF NOT EXISTS tier             smallint DEFAULT 2 CHECK (tier IN (1,2,3)),
  ADD COLUMN IF NOT EXISTS trust_score      numeric(3,2) DEFAULT 0.70 CHECK (trust_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS adapter_type     text DEFAULT 'html'
                                            CHECK (adapter_type IN ('html','rss','json','pdf','playwright')),
  ADD COLUMN IF NOT EXISTS consecutive_fails int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_success_at  timestamptz,
  ADD COLUMN IF NOT EXISTS is_healthy       boolean GENERATED ALWAYS AS (consecutive_fails < 5) STORED,
  ADD COLUMN IF NOT EXISTS metadata         jsonb DEFAULT '{}';

-- Back-fill tier + trust based on existing org_type
UPDATE public.scrape_sources SET
  tier        = 1,
  trust_score = 0.95,
  adapter_type = CASE
    WHEN name ILIKE '%RSS%' OR name ILIKE '%Employment News%' THEN 'rss'
    WHEN selector_config->>'type' = 'json' THEN 'json'
    ELSE 'html'
  END
WHERE org_type IN ('Banking','Regulatory','Central Govt')
  AND name ILIKE '%Official%';

UPDATE public.scrape_sources SET tier = 2, trust_score = 0.70
WHERE tier IS NULL OR tier = 2;

UPDATE public.scrape_sources SET tier = 3, trust_score = 0.45
WHERE name ILIKE '%Sarkari%' OR name ILIKE '%Free Job%';

-- =============================================================================
-- STEP 2: source_observations
-- The raw extraction log — one row per (source, scrape_run, candidate title).
-- This is the immutable audit trail before any dedup/canonicalization.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_observations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_run_id     uuid REFERENCES public.scrape_runs(id) ON DELETE SET NULL,
  source_id         uuid REFERENCES public.scrape_sources(id) ON DELETE SET NULL,
  source_url        text NOT NULL,
  raw_title         text,
  raw_org_name      text,
  raw_org_type      text,
  raw_dates         jsonb DEFAULT '{}',   -- {notification_date,apply_start,apply_end}
  raw_vacancies     int,
  raw_pdf_url       text,
  raw_official_url  text,
  extracted_data    jsonb NOT NULL DEFAULT '{}',
  confidence_score  numeric(3,2) NOT NULL DEFAULT 0,
  fingerprint       text,                 -- normalized dedup key
  observation_year  int NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::int,
  -- Resolution
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','matched','new','duplicate','low_confidence','error')),
  canonical_id      uuid,                 -- FK set when matched to a recruitment
  queue_item_id     uuid,                 -- FK to scrape_queue if routed there
  conflict_notes    text,
  -- Audit
  observed_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  CONSTRAINT uq_observation_fingerprint_run UNIQUE NULLS NOT DISTINCT (fingerprint, scrape_run_id)
);

CREATE INDEX IF NOT EXISTS idx_obs_run       ON public.source_observations (scrape_run_id);
CREATE INDEX IF NOT EXISTS idx_obs_canonical ON public.source_observations (canonical_id);
CREATE INDEX IF NOT EXISTS idx_obs_status    ON public.source_observations (status, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_fp        ON public.source_observations (fingerprint);
-- GIN trigram index for fuzzy title matching
CREATE INDEX IF NOT EXISTS idx_obs_title_trgm
  ON public.source_observations USING gin (raw_title gin_trgm_ops)
  WHERE raw_title IS NOT NULL;

-- =============================================================================
-- STEP 3: recruitment_versions
-- Point-in-time snapshot of every canonical recruitment state change.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recruitment_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruitment_id  uuid NOT NULL REFERENCES public.recruitments(id) ON DELETE CASCADE,
  version_number  int NOT NULL,
  snapshot        jsonb NOT NULL,          -- full row snapshot at this version
  changed_fields  text[] DEFAULT '{}',     -- which top-level fields changed
  change_source   text,                    -- 'scraper'|'admin'|'system'|'manual'
  source_obs_id   uuid REFERENCES public.source_observations(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recruitment_version UNIQUE (recruitment_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_rv_recruitment
  ON public.recruitment_versions (recruitment_id, version_number DESC);

-- =============================================================================
-- STEP 4: recruitment_field_diffs
-- Granular field-level diff log between consecutive versions.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recruitment_field_diffs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruitment_id   uuid NOT NULL REFERENCES public.recruitments(id) ON DELETE CASCADE,
  from_version     int NOT NULL,
  to_version       int NOT NULL,
  field_name       text NOT NULL,
  old_value        text,
  new_value        text,
  is_meaningful    boolean NOT NULL DEFAULT true,  -- cosmetic vs actionable
  change_class     text CHECK (change_class IN (
                     'date_change','vacancy_change','status_change',
                     'deadline_set','deadline_extended','deadline_shortened',
                     'result_released','admit_card_released','cutoff_released',
                     'corrigendum','title_correction','cosmetic')),
  detected_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfd_recruitment
  ON public.recruitment_field_diffs (recruitment_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfd_meaningful
  ON public.recruitment_field_diffs (is_meaningful, detected_at DESC)
  WHERE is_meaningful = true;

-- =============================================================================
-- STEP 5: alert_events
-- Domain events produced by change detection.
-- Decoupled from delivery — one event fans out to N deliveries.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.alert_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        text NOT NULL CHECK (event_type IN (
                      'new_recruitment',
                      'application_open',
                      'deadline_approaching',
                      'deadline_changed',
                      'vacancy_changed',
                      'status_changed',
                      'admit_card_released',
                      'result_released',
                      'cutoff_released',
                      'corrigendum',
                      'recruitment_withdrawn',
                      'eligibility_unlocked'
                    )),
  recruitment_id    uuid NOT NULL REFERENCES public.recruitments(id) ON DELETE CASCADE,
  diff_id           uuid REFERENCES public.recruitment_field_diffs(id) ON DELETE SET NULL,
  payload           jsonb NOT NULL DEFAULT '{}',
  priority          smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
                    -- 1=critical 2=high 3=medium 4=low 5=digest
  fanout_status     text NOT NULL DEFAULT 'pending'
                    CHECK (fanout_status IN ('pending','processing','completed','failed')),
  fanout_started_at  timestamptz,
  fanout_completed_at timestamptz,
  users_notified    int DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ae_fanout    ON public.alert_events (fanout_status, created_at)
  WHERE fanout_status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_ae_recruit   ON public.alert_events (recruitment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_type      ON public.alert_events (event_type, created_at DESC);

-- =============================================================================
-- STEP 6: alert_deliveries
-- Per-user, per-channel delivery record.
-- notification_alerts remains the in-app read/unread model.
-- alert_deliveries adds multi-channel tracking on top.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.alert_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_event_id  uuid NOT NULL REFERENCES public.alert_events(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'in_app'
                  CHECK (channel IN ('in_app','email','whatsapp','telegram','sms')),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sent','delivered','failed','suppressed')),
  notification_alert_id uuid REFERENCES public.notification_alerts(id) ON DELETE SET NULL,
  explanation     jsonb DEFAULT '{}',   -- why this user got this
  suppressed_reason text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  failed_reason   text,
  retry_count     int DEFAULT 0,
  CONSTRAINT uq_delivery_event_user_channel UNIQUE (alert_event_id, user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_ad_user      ON public.alert_deliveries (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_status    ON public.alert_deliveries (status, sent_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ad_event     ON public.alert_deliveries (alert_event_id);

-- =============================================================================
-- STEP 7: user_notification_prefs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
  user_id               uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_enabled        boolean NOT NULL DEFAULT true,
  email_enabled         boolean NOT NULL DEFAULT false,
  email_digest_frequency text DEFAULT 'daily'
                         CHECK (email_digest_frequency IN ('instant','daily','weekly','off')),
  whatsapp_enabled      boolean NOT NULL DEFAULT false,
  whatsapp_number       text,
  min_priority_in_app   smallint DEFAULT 4,
  min_priority_email    smallint DEFAULT 2,
  event_types_muted     text[] DEFAULT '{}',
  org_types_muted       text[] DEFAULT '{}',
  quiet_hours_start     time,
  quiet_hours_end       time,
  updated_at            timestamptz DEFAULT now()
);

-- Default rows for existing users
INSERT INTO public.user_notification_prefs (user_id)
  SELECT id FROM public.profiles
  WHERE id NOT IN (SELECT user_id FROM public.user_notification_prefs)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 8: tracked_recruitments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tracked_recruitments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recruitment_id   uuid NOT NULL REFERENCES public.recruitments(id) ON DELETE CASCADE,
  tracked_at       timestamptz NOT NULL DEFAULT now(),
  notes            text,
  CONSTRAINT uq_tracked UNIQUE (user_id, recruitment_id)
);

CREATE INDEX IF NOT EXISTS idx_tracked_user ON public.tracked_recruitments (user_id);

-- =============================================================================
-- STEP 9: source_health_metrics
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_health_metrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES public.scrape_sources(id) ON DELETE CASCADE,
  measured_at     timestamptz NOT NULL DEFAULT now(),
  fetch_duration_ms int,
  http_status     int,
  parse_success   boolean,
  items_extracted int DEFAULT 0,
  items_new       int DEFAULT 0,
  confidence_avg  numeric(3,2),
  error_message   text
);

CREATE INDEX IF NOT EXISTS idx_shm_source
  ON public.source_health_metrics (source_id, measured_at DESC);

-- =============================================================================
-- STEP 10: Upgrade notification_alerts — add event linkage + explanation
-- =============================================================================

ALTER TABLE public.notification_alerts
  ADD COLUMN IF NOT EXISTS alert_event_id  uuid REFERENCES public.alert_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS explanation     jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority        smallint DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_na_event
  ON public.notification_alerts (alert_event_id)
  WHERE alert_event_id IS NOT NULL;

-- =============================================================================
-- STEP 11: Core DB functions
-- =============================================================================

-- ── Helper: normalize text for fingerprinting ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_normalize_for_fingerprint(input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
BEGIN
  RETURN regexp_replace(
    unaccent(lower(trim(input))),
    '[^a-z0-9]', '', 'g'
  );
END;
$$;

-- ── Helper: compute observation fingerprint ───────────────────────────────────
-- Strategy: org_slug + year + first 4 words of title slug
-- This is more robust than the old string concat dedup key.

CREATE OR REPLACE FUNCTION public.fn_compute_fingerprint(
  org_name  text,
  title     text,
  obs_year  int
) RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  org_slug   text;
  title_slug text;
  words      text[];
BEGIN
  org_slug   := public.fn_normalize_for_fingerprint(COALESCE(org_name, ''));
  words      := string_to_array(
                  regexp_replace(lower(trim(COALESCE(title,''))), '[^a-z0-9 ]', '', 'g'),
                  ' '
                );
  title_slug := array_to_string(words[1:5], '');
  RETURN org_slug || '-' || COALESCE(obs_year::text, '') || '-' || title_slug;
END;
$$;

-- ── fn_detect_recruitment_changes ─────────────────────────────────────────────
-- Called after a canonical recruitment row is updated.
-- Produces: recruitment_versions + recruitment_field_diffs + alert_events.

CREATE OR REPLACE FUNCTION public.fn_detect_recruitment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num       int;
  v_snapshot  jsonb;
  v_diff_id   uuid;
  v_evt_type  text;
  v_priority  smallint;
  v_meaningful boolean := false;
BEGIN
  -- ── Get next version number ──
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_num
  FROM public.recruitment_versions
  WHERE recruitment_id = NEW.id;

  v_snapshot := to_jsonb(NEW);

  INSERT INTO public.recruitment_versions
    (recruitment_id, version_number, snapshot, changed_fields, change_source)
  VALUES (
    NEW.id, v_num, v_snapshot,
    ARRAY(
      SELECT key FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
    ),
    'scraper'
  );

  -- ── Detect individual field changes ──

  -- Status change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_meaningful := true;
    v_evt_type   := CASE
      WHEN NEW.status = 'open'      THEN 'application_open'
      WHEN NEW.status = 'closed'    THEN 'status_changed'
      WHEN NEW.status = 'withdrawn' THEN 'recruitment_withdrawn'
      ELSE 'status_changed'
    END;
    v_priority   := CASE NEW.status WHEN 'open' THEN 1 ELSE 2 END;

    INSERT INTO public.recruitment_field_diffs
      (recruitment_id, from_version, to_version, field_name,
       old_value, new_value, change_class, is_meaningful)
    VALUES
      (NEW.id, v_num-1, v_num, 'status',
       OLD.status, NEW.status, 'status_change', true)
    RETURNING id INTO v_diff_id;

    INSERT INTO public.alert_events
      (event_type, recruitment_id, diff_id, priority,
       payload)
    VALUES (
      v_evt_type, NEW.id, v_diff_id, v_priority,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'name', NEW.name,
        'apply_end_date', NEW.apply_end_date
      )
    );
  END IF;

  -- Deadline change
  IF NEW.apply_end_date IS DISTINCT FROM OLD.apply_end_date
     AND NEW.apply_end_date IS NOT NULL
  THEN
    v_meaningful := true;
    DECLARE
      days_diff int := (NEW.apply_end_date - COALESCE(OLD.apply_end_date, NEW.apply_end_date))::int;
      cc        text := CASE
        WHEN OLD.apply_end_date IS NULL THEN 'deadline_set'
        WHEN days_diff > 0              THEN 'deadline_extended'
        ELSE                                 'deadline_shortened'
      END;
    BEGIN
      INSERT INTO public.recruitment_field_diffs
        (recruitment_id, from_version, to_version, field_name,
         old_value, new_value, change_class, is_meaningful)
      VALUES
        (NEW.id, v_num-1, v_num, 'apply_end_date',
         OLD.apply_end_date::text, NEW.apply_end_date::text, cc, true)
      RETURNING id INTO v_diff_id;

      INSERT INTO public.alert_events
        (event_type, recruitment_id, diff_id, priority, payload)
      VALUES (
        'deadline_changed', NEW.id, v_diff_id, 2,
        jsonb_build_object(
          'old_deadline', OLD.apply_end_date,
          'new_deadline', NEW.apply_end_date,
          'change_class', cc
        )
      );
    END;
  END IF;

  -- Vacancy change
  IF NEW.total_vacancies IS DISTINCT FROM OLD.total_vacancies
     AND NEW.total_vacancies IS NOT NULL
  THEN
    INSERT INTO public.recruitment_field_diffs
      (recruitment_id, from_version, to_version, field_name,
       old_value, new_value, change_class, is_meaningful)
    VALUES
      (NEW.id, v_num-1, v_num, 'total_vacancies',
       OLD.total_vacancies::text, NEW.total_vacancies::text, 'vacancy_change', true)
    RETURNING id INTO v_diff_id;

    INSERT INTO public.alert_events
      (event_type, recruitment_id, diff_id, priority, payload)
    VALUES (
      'vacancy_changed', NEW.id, v_diff_id, 3,
      jsonb_build_object(
        'old_vacancies', OLD.total_vacancies,
        'new_vacancies', NEW.total_vacancies
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_recruitment_changes ON public.recruitments;
CREATE TRIGGER trg_detect_recruitment_changes
  AFTER UPDATE OF status, apply_end_date, apply_start_date, total_vacancies, name
  ON public.recruitments
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.fn_detect_recruitment_changes();

-- ── fn_fanout_alert_event ─────────────────────────────────────────────────────
-- Given an alert_event, fan out notification_alerts to matching users.
-- Uses eligibility_results cache + aspirant_preferences for targeting.
-- Stores explanation JSON per delivery.

CREATE OR REPLACE FUNCTION public.fn_fanout_alert_event(p_event_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evt        RECORD;
  rec        RECORD;
  org_type   text;
  org_state  text;
  notif_id   uuid;
  inserted   int := 0;
  reason     jsonb;
BEGIN
  SELECT ae.*, r.name AS rec_name, r.status AS rec_status,
         r.apply_end_date, r.organization_id
  INTO evt
  FROM public.alert_events ae
  JOIN public.recruitments r ON r.id = ae.recruitment_id
  WHERE ae.id = p_event_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT o.type, o.state INTO org_type, org_state
  FROM public.organizations o
  WHERE o.id = evt.organization_id;

  UPDATE public.alert_events
  SET fanout_status = 'processing', fanout_started_at = now()
  WHERE id = p_event_id;

  FOR rec IN
    SELECT DISTINCT
      p.id AS user_id,
      p.plan_id,
      p.target_type,
      ap.target_exams,
      ap.preferred_sectors,
      er.is_eligible,
      tr.id IS NOT NULL AS is_tracked
    FROM public.profiles p
    LEFT JOIN public.aspirant_preferences ap ON ap.user_id = p.id
    LEFT JOIN public.eligibility_results   er ON er.user_id = p.id
                                              AND er.recruitment_id = evt.recruitment_id
    LEFT JOIN public.tracked_recruitments  tr ON tr.user_id = p.id
                                              AND tr.recruitment_id = evt.recruitment_id
    LEFT JOIN public.user_notification_prefs np ON np.user_id = p.id
    WHERE p.onboarding_completed = true
      -- Not muted
      AND (np.event_types_muted IS NULL OR evt.event_type != ALL(np.event_types_muted))
      AND (np.org_types_muted IS NULL   OR org_type != ALL(np.org_types_muted))
      -- Priority filter
      AND (np.min_priority_in_app IS NULL OR evt.priority <= np.min_priority_in_app)
      AND (
        -- Tracked = always notify
        tr.id IS NOT NULL
        -- Eligible = always notify
        OR er.is_eligible = true
        -- Name match
        OR (ap.target_exams IS NOT NULL AND
            EXISTS (SELECT 1 FROM unnest(ap.target_exams) t
                    WHERE evt.rec_name ILIKE '%' || t || '%'))
        -- Sector match
        OR (ap.preferred_sectors IS NOT NULL AND
            EXISTS (SELECT 1 FROM unnest(ap.preferred_sectors) s
                    WHERE LOWER(org_type) ILIKE '%' || LOWER(s) || '%'))
        -- Target type match
        OR (p.target_type IS NOT NULL AND (
             (p.target_type = 'banking'       AND org_type IN ('Banking','PSU'))
          OR (p.target_type = 'regulatory'    AND org_type = 'Regulatory')
          OR (p.target_type = 'central_govt'  AND org_type = 'Central Govt')
          OR (p.target_type = 'railways'      AND evt.rec_name ILIKE '%railway%')
        ))
      )
  LOOP
    -- Build explanation
    reason := jsonb_build_object(
      'is_tracked',      rec.is_tracked,
      'is_eligible',     COALESCE(rec.is_eligible, false),
      'matched_exam',    (rec.target_exams IS NOT NULL AND
                          EXISTS (SELECT 1 FROM unnest(rec.target_exams) t
                                  WHERE evt.rec_name ILIKE '%' || t || '%')),
      'matched_sector',  (rec.preferred_sectors IS NOT NULL AND
                          EXISTS (SELECT 1 FROM unnest(rec.preferred_sectors) s
                                  WHERE LOWER(org_type) ILIKE '%' || LOWER(s) || '%')),
      'matched_type',    (rec.target_type IS NOT NULL)
    );

    -- Insert notification_alert (in-app delivery)
    INSERT INTO public.notification_alerts
      (user_id, recruitment_id, alert_type, is_read, alert_event_id, explanation, priority)
    VALUES (
      rec.user_id,
      evt.recruitment_id,
      CASE evt.event_type
        WHEN 'application_open'     THEN 'new_match'
        WHEN 'deadline_approaching' THEN 'deadline_3day'
        WHEN 'deadline_changed'     THEN 'status_change'
        ELSE 'status_change'
      END,
      false,
      p_event_id,
      reason,
      evt.priority
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO notif_id;

    -- Track delivery
    IF notif_id IS NOT NULL THEN
      INSERT INTO public.alert_deliveries
        (alert_event_id, user_id, channel, status, notification_alert_id, explanation, sent_at)
      VALUES
        (p_event_id, rec.user_id, 'in_app', 'sent', notif_id, reason, now())
      ON CONFLICT DO NOTHING;

      inserted := inserted + 1;
    END IF;
  END LOOP;

  UPDATE public.alert_events
  SET fanout_status = 'completed',
      fanout_completed_at = now(),
      users_notified = inserted
  WHERE id = p_event_id;

  RETURN inserted;
END;
$$;

-- ── fn_deadline_approaching_sweep ─────────────────────────────────────────────
-- Called daily by Edge Function cron. Generates deadline_approaching events.

CREATE OR REPLACE FUNCTION public.fn_deadline_approaching_sweep()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec    RECORD;
  total  int := 0;
BEGIN
  FOR rec IN
    SELECT r.id, r.apply_end_date,
           (r.apply_end_date - CURRENT_DATE) AS days_left
    FROM public.recruitments r
    WHERE r.status = 'open'
      AND r.apply_end_date IS NOT NULL
      AND (r.apply_end_date - CURRENT_DATE) IN (7, 3, 1)
      -- Don't re-generate if we already made one today
      AND NOT EXISTS (
        SELECT 1 FROM public.alert_events ae
        WHERE ae.recruitment_id = r.id
          AND ae.event_type = 'deadline_approaching'
          AND ae.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO public.alert_events
      (event_type, recruitment_id, priority, payload)
    VALUES (
      'deadline_approaching',
      rec.id,
      CASE rec.days_left WHEN 1 THEN 1 WHEN 3 THEN 2 ELSE 3 END,
      jsonb_build_object('days_left', rec.days_left, 'deadline', rec.apply_end_date)
    );
    total := total + 1;
  END LOOP;
  RETURN total;
END;
$$;

-- ── fn_promote_approved_scrape (upgraded) ─────────────────────────────────────
-- Now uses fingerprint-based dedup and populates source_observations.

CREATE OR REPLACE FUNCTION public.fn_promote_approved_scrape()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id   uuid;
  ext      jsonb := NEW.extracted_data;
  rec_id   uuid;
  y        int;
  fp       text;
  existing uuid;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;

  y  := COALESCE((ext->>'year')::int, EXTRACT(YEAR FROM NOW())::int);
  fp := public.fn_compute_fingerprint(
    COALESCE(ext->>'organization_name',''),
    COALESCE(ext->>'title',''),
    y
  );

  -- Check for existing recruitment by fingerprint via source_observations
  SELECT canonical_id INTO existing
  FROM public.source_observations
  WHERE fingerprint = fp AND canonical_id IS NOT NULL
  LIMIT 1;

  -- Find or create organization
  SELECT id INTO org_id FROM public.organizations
  WHERE public.fn_normalize_for_fingerprint(name) =
        public.fn_normalize_for_fingerprint(COALESCE(ext->>'organization_name',''))
  LIMIT 1;

  IF org_id IS NULL AND (ext->>'organization_name') IS NOT NULL THEN
    INSERT INTO public.organizations (name, type)
    VALUES (ext->>'organization_name', COALESCE(ext->>'org_type','Central Govt'))
    RETURNING id INTO org_id;
  END IF;

  IF existing IS NOT NULL THEN
    -- Update existing recruitment if dates changed
    UPDATE public.recruitments SET
      apply_end_date   = COALESCE(NULLIF(ext->>'apply_end_date','')::date,   apply_end_date),
      apply_start_date = COALESCE(NULLIF(ext->>'apply_start_date','')::date, apply_start_date),
      total_vacancies  = COALESCE((ext->>'total_vacancies')::int,            total_vacancies),
      status = CASE
        WHEN NULLIF(ext->>'apply_end_date','')::date < CURRENT_DATE THEN 'closed'
        WHEN NULLIF(ext->>'apply_start_date','')::date > CURRENT_DATE THEN 'upcoming'
        ELSE status
      END
    WHERE id = existing
    RETURNING id INTO rec_id;
  ELSE
    -- New recruitment
    INSERT INTO public.recruitments
      (organization_id, name, year, notification_date,
       apply_start_date, apply_end_date, total_vacancies, status)
    VALUES (
      org_id,
      COALESCE(ext->>'title','Unknown'),
      y,
      NULLIF(ext->>'notification_date','')::date,
      NULLIF(ext->>'apply_start_date','')::date,
      NULLIF(ext->>'apply_end_date','')::date,
      (ext->>'total_vacancies')::int,
      CASE
        WHEN NULLIF(ext->>'apply_end_date','')::date < CURRENT_DATE THEN 'closed'
        WHEN NULLIF(ext->>'apply_start_date','')::date > CURRENT_DATE THEN 'upcoming'
        ELSE 'open'
      END
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO rec_id;
  END IF;

  -- Upsert source_observation record
  INSERT INTO public.source_observations
    (scrape_run_id, source_url, raw_title, raw_org_name, raw_org_type,
     raw_dates, raw_vacancies, raw_pdf_url, raw_official_url,
     extracted_data, confidence_score, fingerprint, observation_year,
     status, canonical_id, queue_item_id, resolved_at)
  VALUES (
    NEW.scrape_run_id,
    NEW.source_url,
    ext->>'title',
    ext->>'organization_name',
    ext->>'org_type',
    jsonb_build_object(
      'notification_date', ext->>'notification_date',
      'apply_start_date',  ext->>'apply_start_date',
      'apply_end_date',    ext->>'apply_end_date'
    ),
    (ext->>'total_vacancies')::int,
    ext->>'source_pdf_url',
    ext->>'official_notification_url',
    ext,
    NEW.confidence_score,
    fp,
    y,
    CASE WHEN rec_id IS NOT NULL THEN
      CASE WHEN existing IS NOT NULL THEN 'matched' ELSE 'new' END
    ELSE 'duplicate' END,
    COALESCE(rec_id, existing),
    NEW.id,
    now()
  )
  ON CONFLICT (fingerprint, scrape_run_id) DO UPDATE SET
    status       = EXCLUDED.status,
    canonical_id = EXCLUDED.canonical_id,
    resolved_at  = EXCLUDED.resolved_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_approved_scrape ON public.scrape_queue;
CREATE TRIGGER trg_promote_approved_scrape
  AFTER INSERT OR UPDATE OF status
  ON public.scrape_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_promote_approved_scrape();

-- =============================================================================
-- STEP 12: RLS
-- =============================================================================

ALTER TABLE public.source_observations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_field_diffs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_deliveries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_prefs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_recruitments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_health_metrics     ENABLE ROW LEVEL SECURITY;

-- Admins see everything
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'source_observations','recruitment_versions','recruitment_field_diffs',
    'alert_events','alert_deliveries','source_health_metrics'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_admin" ON public.%1$s', tbl);
    EXECUTE format(
      'CREATE POLICY "%1$s_admin" ON public.%1$s FOR ALL
       USING (public.is_admin(auth.uid()))
       WITH CHECK (public.is_admin(auth.uid()))', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_service" ON public.%1$s', tbl);
    EXECUTE format(
      'CREATE POLICY "%1$s_service" ON public.%1$s FOR ALL
       USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

CREATE POLICY "user_notif_prefs_own" ON public.user_notification_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracked_own" ON public.tracked_recruitments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_deliveries_own_read" ON public.alert_deliveries
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 13: Views
-- =============================================================================

-- Notification feed view (supersedes user_notifications_feed)
CREATE OR REPLACE VIEW public.v_notification_feed AS
SELECT
  na.id,
  na.user_id,
  na.alert_type,
  na.is_read,
  na.sent_at,
  na.read_at,
  na.priority,
  na.explanation,
  na.alert_event_id,
  ae.event_type,
  r.id              AS recruitment_id,
  r.name            AS recruitment_name,
  r.status          AS recruitment_status,
  r.apply_end_date,
  r.apply_start_date,
  r.notification_date,
  r.year,
  r.total_vacancies,
  o.id              AS org_id,
  o.name            AS org_name,
  o.type            AS org_type,
  o.state           AS org_state,
  CASE
    WHEN r.apply_end_date IS NULL THEN NULL
    ELSE (r.apply_end_date::date - CURRENT_DATE)
  END               AS days_to_deadline,
  tr.id IS NOT NULL AS is_tracked
FROM  public.notification_alerts na
JOIN  public.recruitments        r  ON r.id = na.recruitment_id
LEFT JOIN public.organizations   o  ON o.id = r.organization_id
LEFT JOIN public.alert_events    ae ON ae.id = na.alert_event_id
LEFT JOIN public.tracked_recruitments tr
  ON tr.user_id = na.user_id AND tr.recruitment_id = na.recruitment_id;

GRANT SELECT ON public.v_notification_feed TO authenticated;

-- Admin queue review view
CREATE OR REPLACE VIEW public.v_admin_queue_review AS
SELECT
  sq.id,
  sq.source_url,
  sq.source_name,
  sq.confidence_score,
  sq.status,
  sq.scraped_at,
  sq.reviewed_at,
  sq.reviewer_notes,
  sq.extracted_data->>'title'             AS title,
  sq.extracted_data->>'organization_name' AS org_name,
  sq.extracted_data->>'apply_end_date'    AS apply_end_date,
  sq.extracted_data->>'total_vacancies'   AS total_vacancies,
  so.fingerprint,
  so.status                               AS obs_status,
  r.id                                    AS canonical_id,
  r.name                                  AS canonical_name,
  sr.started_at                           AS run_started_at
FROM public.scrape_queue sq
LEFT JOIN public.source_observations so ON so.queue_item_id = sq.id
LEFT JOIN public.recruitments r ON r.id = so.canonical_id
LEFT JOIN public.scrape_runs  sr ON sr.id = sq.scrape_run_id;

GRANT SELECT ON public.v_admin_queue_review TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================