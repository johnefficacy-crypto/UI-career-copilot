/**
 * lib/db/notifications.ts
 * Career Copilot — Notification Engine v2
 *
 * REPLACES: lib/db/notifications.ts + lib/db/scraping.ts (merged, de-duped)
 *
 * Single module owns all DB operations for:
 *   - user notifications (read/unread)
 *   - alert events
 *   - scrape queue + runs
 *   - scrape sources
 *   - source health
 *   - user notification preferences
 *   - tracked recruitments
 *
 * All types are imported from @/types/notifications.
 * No business logic here — pure data access.
 */

import { createClient } from "@/utils/supabase/server"
import type {
  NotificationAlert,
  ScrapeRun,
  ScrapeQueueItem,
  ScrapeSource,
  AlertEvent,
  QueueReviewItem,
  ScraperStats,
  SourceHealthSnapshot,
  UserNotificationPrefs,
  SourceTier,
} from "@/types/notifications"
import type { Database, Json } from "@/types/supabase"

// ─── Re-export for components that imported from here before ──────────────────
export type { NotificationAlert, ScrapeRun, ScrapeQueueItem, ScrapeSource }

type ScrapeSourceInsert =
  Database["public"]["Tables"]["scrape_sources"]["Insert"]
// =============================================================================
// USER NOTIFICATIONS
// =============================================================================

/**
 * Get paginated notifications for a user via the v_notification_feed view.
 */
export async function getUserNotifications(
  userId: string,
  opts: { limit?: number; unreadOnly?: boolean; offset?: number } = {}
): Promise<NotificationAlert[]> {
  const supabase = await createClient()

  let query = supabase
    .from("v_notification_feed")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(opts.limit ?? 50)

  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
  if (opts.unreadOnly) query = query.eq("is_read", false)

  const { data, error } = await query
  if (error) throw new Error(`getUserNotifications: ${error.message}`)
  return (data ?? []) as NotificationAlert[]
}

/** Fast unread count for nav badge. */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("notification_alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
  if (error) return 0
  return count ?? 0
}

/** Mark a single notification as read. Enforces ownership via user_id. */
export async function markAlertRead(alertId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notification_alerts")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("user_id", userId)
  if (error) throw new Error(`markAlertRead: ${error.message}`)
}

/** Mark all unread as read. */
export async function markAllAlertsRead(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notification_alerts")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false)
  if (error) throw new Error(`markAllAlertsRead: ${error.message}`)
}

// =============================================================================
// USER NOTIFICATION PREFERENCES
// =============================================================================

export async function getUserNotifPrefs(userId: string): Promise<UserNotificationPrefs | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .single()
  return data as UserNotificationPrefs | null
}

export async function upsertUserNotifPrefs(
  userId: string,
  prefs: Partial<Omit<UserNotificationPrefs, "user_id">>
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("user_notification_prefs")
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw new Error(`upsertUserNotifPrefs: ${error.message}`)
}

// =============================================================================
// TRACKED RECRUITMENTS
// =============================================================================

export async function trackRecruitment(userId: string, recruitmentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tracked_recruitments")
    .upsert({ user_id: userId, recruitment_id: recruitmentId })
  if (error) throw new Error(`trackRecruitment: ${error.message}`)
}

export async function untrackRecruitment(userId: string, recruitmentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tracked_recruitments")
    .delete()
    .eq("user_id", userId)
    .eq("recruitment_id", recruitmentId)
  if (error) throw new Error(`untrackRecruitment: ${error.message}`)
}

// =============================================================================
// SCRAPE QUEUE
// =============================================================================

/** Get queue items filtered by status, enriched from v_admin_queue_review. */
export async function getScrapeQueue(
  status?: ScrapeQueueItem["status"],
  limit = 50
): Promise<QueueReviewItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from("v_admin_queue_review")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(limit)
  if (status) query = query.eq("status", status)
  const { data, error } = await query
  if (error) throw new Error(`getScrapeQueue: ${error.message}`)
  return (data ?? []) as QueueReviewItem[]
}

/** Approve — triggers fn_promote_approved_scrape → recruitment + alert_events. */
export async function approveScrapeItem(
  itemId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("scrape_queue")
    .update({
      status:         "approved",
      reviewer_id:    reviewerId,
      reviewer_notes: notes ?? null,
      reviewed_at:    new Date().toISOString(),
    })
    .eq("id", itemId)
  if (error) throw new Error(`approveScrapeItem: ${error.message}`)
}

/** Reject a queue item. */
export async function rejectScrapeItem(
  itemId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("scrape_queue")
    .update({
      status:         "rejected",
      reviewer_id:    reviewerId,
      reviewer_notes: notes ?? null,
      reviewed_at:    new Date().toISOString(),
    })
    .eq("id", itemId)
  if (error) throw new Error(`rejectScrapeItem: ${error.message}`)
}

// =============================================================================
// SCRAPE RUNS
// =============================================================================

export async function getScrapeRuns(limit = 20): Promise<ScrapeRun[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scrape_runs")
    .select("id,started_at,finished_at,status,sources_checked,items_found,items_new,items_duplicate,error_log,triggered_by")
    .order("started_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getScrapeRuns: ${error.message}`)
  return (data ?? []) as ScrapeRun[]
}

// =============================================================================
// SCRAPE SOURCES
// =============================================================================

export async function getScrapeSources(activeOnly = false): Promise<ScrapeSource[]> {
  const supabase = await createClient()
  let query = supabase
    .from("scrape_sources")
    .select("id,name,base_url,notification_path,org_type,state,is_active,is_healthy,last_scraped_at,last_success_at,scrape_interval_hours,tier,trust_score,adapter_type,consecutive_fails,selector_config,metadata")
    .order("tier", { ascending: true })
    .order("name")
  if (activeOnly) query = query.eq("is_active", true)
  const { data, error } = await query
  if (error) throw new Error(`getScrapeSources: ${error.message}`)
  return (data ?? []) as ScrapeSource[]
}

export async function toggleScrapeSource(id: string, active: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("scrape_sources")
    .update({ is_active: active })
    .eq("id", id)
  if (error) throw new Error(`toggleScrapeSource: ${error.message}`)
}

export async function upsertScrapeSource(
  data: Partial<ScrapeSource> & { name: string; base_url: string }
): Promise<void> {
  const supabase = await createClient()

  const payload: ScrapeSourceInsert = {
    id: data.id,
    name: data.name,
    base_url: data.base_url,
    notification_path: data.notification_path ?? null,
    org_type: data.org_type ?? "other", // previously : null
    state: data.state ?? null,
    is_active: data.is_active ?? true,
    is_healthy: data.is_healthy ?? true,
    last_scraped_at: data.last_scraped_at ?? null,
    last_success_at: data.last_success_at ?? null,
    scrape_interval_hours: data.scrape_interval_hours ?? 24,
    tier: data.tier ?? 2,
    trust_score: data.trust_score ?? 0.7,
    adapter_type: data.adapter_type ?? null,
    consecutive_fails: data.consecutive_fails ?? 0,
    selector_config: (data.selector_config ?? null) as Json,
    metadata: (data.metadata ?? null) as Json,
  }

  const { error } = await supabase
    .from("scrape_sources")
    .upsert(payload)

  if (error) throw new Error(`upsertScrapeSource: ${error.message}`)
}
// =============================================================================
// ALERT EVENTS (admin / worker operations)
// =============================================================================

/** Get pending alert events awaiting fan-out. Service role only. */
export async function getPendingAlertEvents(limit = 50): Promise<AlertEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("alert_events")
    .select("*")
    .eq("fanout_status", "pending")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(`getPendingAlertEvents: ${error.message}`)
  return (data ?? []) as AlertEvent[]
}

/**
 * Fan out a single alert event using the DB function.
 * Returns users notified count.
 */
export async function fanOutAlertEvent(eventId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_fanout_alert_event", {
    p_event_id: eventId,
  })
  if (error) throw new Error(`fanOutAlertEvent: ${error.message}`)
  return (data as number) ?? 0
}

/**
 * Manually fan-out notifications for a recruitment (admin action).
 * Creates a synthetic application_open event and fans it out.
 */
export async function fanOutNotificationAlerts(recruitmentId: string): Promise<number> {
  const supabase = await createClient()

  // Create a synthetic event
  const { data: evt, error: evtErr } = await supabase
    .from("alert_events")
    .insert({
      event_type:      "application_open",
      recruitment_id:  recruitmentId,
      priority:        1,
      payload:         { manual: true },
      fanout_status:   "pending",
    })
    .select("id")
    .single()

  if (evtErr || !evt) throw new Error(`fanOutNotificationAlerts create event: ${evtErr?.message}`)

  return fanOutAlertEvent(evt.id)
}

// =============================================================================
// ADMIN STATS
// =============================================================================

export async function getScraperStats(): Promise<ScraperStats> {
  const supabase = await createClient()
  const [runsRes, pendingRes, failedRes, healthyRes] = await Promise.all([
    supabase
      .from("scrape_runs")
      .select("id,status,items_new,items_found,started_at,finished_at,sources_checked,items_duplicate,triggered_by,error_log")
      .order("started_at", { ascending: false })
      .limit(1),
    supabase
      .from("scrape_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("scrape_sources")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("consecutive_fails", 5),
    supabase
      .from("scrape_sources")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lt("consecutive_fails", 5),
  ])

  return {
    lastRun:        (runsRes.data?.[0] as ScrapeRun) ?? null,
    pendingReview:  pendingRes.count  ?? 0,
    approvedTotal:  0,
    failedSources:  failedRes.count   ?? 0,
    healthySources: healthyRes.count  ?? 0,
  }
}

export async function getSourceHealthSnapshots(): Promise<SourceHealthSnapshot[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("scrape_sources")
    .select(`
      id,
      name,
      tier,
      is_active,
      is_healthy,
      last_scraped_at,
      last_success_at,
      consecutive_fails,
      source_health_metrics (
        confidence_avg,
        items_extracted,
        measured_at
      )
    `)
    .order("tier", { ascending: true })
    .order("name")

  if (error) {
    throw new Error(`getSourceHealthSnapshots: ${error.message}`)
  }

  type SourceHealthMetricRow = {
    confidence_avg: number | null
    items_extracted: number
    measured_at: string
  }

  type SourceHealthSourceRow = {
    id: string
    name: string
    tier: number | null
    is_active: boolean
    is_healthy: boolean
    last_scraped_at: string | null
    last_success_at: string | null
    consecutive_fails: number | null
    source_health_metrics: SourceHealthMetricRow[] | null
  }

  const rows = (data ?? []) as SourceHealthSourceRow[]
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return rows.map((s): SourceHealthSnapshot => {
    const metrics = s.source_health_metrics ?? []

    const recent = metrics.filter((m) => {
      const measuredAt = new Date(m.measured_at)
      return measuredAt >= cutoff
    })

    const avgConf =
      recent.length > 0
        ? recent.reduce((sum, m) => sum + (m.confidence_avg ?? 0), 0) / recent.length
        : null

    const items7d = recent.reduce((sum, m) => sum + m.items_extracted, 0)

    return {
      source_id: s.id,
      name: s.name,
      tier: (s.tier ?? 2) as SourceTier,
      is_active: s.is_active,
      is_healthy: s.is_healthy,
      last_scraped_at: s.last_scraped_at,
      last_success_at: s.last_success_at,
      consecutive_fails: s.consecutive_fails ?? 0,
      avg_confidence: avgConf,
      items_7d: items7d,
    }
  })
}

// =============================================================================
// OPEN RECRUITMENTS (fallback for free users with no alerts yet)
// =============================================================================

export async function getOpenRecruitments(limit = 30) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recruitments")
    .select(`
      id, name, status, apply_end_date, apply_start_date,
      notification_date, year, total_vacancies,
      organizations ( name, type, state )
    `)
    .in("status", ["open", "upcoming"])
    .order("apply_end_date", { ascending: true, nullsFirst: false })
    .limit(limit)
  if (error) throw new Error(`getOpenRecruitments: ${error.message}`)
  return data ?? []
}