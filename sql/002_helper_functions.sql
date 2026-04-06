-- =============================================================================
-- Career Copilot — Notification Engine v2
-- Migration: 002_helper_functions.sql
--
-- Run after 001_notification_engine_v2.sql
-- Adds helper functions referenced by the scraper Edge Function.
-- =============================================================================

-- ── Increment consecutive_fails (called by scraper on source error) ───────────

CREATE OR REPLACE FUNCTION public.fn_increment_source_fails(p_source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scrape_sources
  SET consecutive_fails = consecutive_fails + 1
  WHERE id = p_source_id;
END;
$$;

-- ── Auto-create notification_prefs row for new profiles ──────────────────────

CREATE OR REPLACE FUNCTION public.fn_init_user_notification_prefs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notification_prefs (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_notif_prefs ON public.profiles;
CREATE TRIGGER trg_init_notif_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_init_user_notification_prefs();

-- ── Grant execute on helper RPCs to service role ─────────────────────────────

GRANT EXECUTE ON FUNCTION public.fn_fanout_alert_event(uuid)         TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_deadline_approaching_sweep()     TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_increment_source_fails(uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_compute_fingerprint(text,text,int) TO service_role;

-- ── Ensure existing profiles all have notification_prefs rows ─────────────────

INSERT INTO public.user_notification_prefs (user_id)
  SELECT id FROM public.profiles
  WHERE id NOT IN (SELECT user_id FROM public.user_notification_prefs)
ON CONFLICT DO NOTHING;

-- ── Add total_vacancies column to recruitments if missing ─────────────────────

ALTER TABLE public.recruitments
  ADD COLUMN IF NOT EXISTS total_vacancies int;

-- ── Index for notification realtime channel ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_na_user_sent
  ON public.notification_alerts (user_id, sent_at DESC);

-- ── Enable Realtime on notification_alerts ────────────────────────────────────
-- Run this in Supabase Dashboard → Database → Replication
-- or uncomment and run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_alerts;

-- =============================================================================
-- CRON SCHEDULE REFERENCE
-- Set these up in Supabase Dashboard → Edge Functions → Cron
--
-- scheduled-scraper:  0 */6 * * *     (every 6 hours)
-- deadline-sweep:     30 2 * * *       (8:00 AM IST / 2:30 AM UTC daily)
-- =============================================================================