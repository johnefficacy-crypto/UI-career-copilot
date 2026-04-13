/**
 * lib/db/notifications.ts
 * Career Copilot — Notification & Scraper DB layer
 *
 * ARCHITECTURE RULES (enforced here):
 *  1. source_registry CRUD → lib/db/source-registry.ts  (never here)
 *  2. SourceRegistryEntry type → re-exported from source-registry (never duplicated)
 *  3. All types → @/types/notifications (never hand-typed DB shapes here)
 *  4. No `as any` — use explicit casts with comments when necessary
 *  5. Auth guards belong in actions/, not here
 *
 * What this file owns:
 *  - notification_alerts / v_notification_feed queries
 *  - scrape_queue queries
 *  - scrape_runs queries
 *  - source_health_metrics queries (two-query merge until FK migration runs)
 *  - alert_events fan-out
 *  - user notification preferences
 *  - tracked_recruitments
 *  - Legacy scrape_sources helpers (to be removed in Phase 3)
 */

import { createClient } from "@/utils/supabase/server"
import type { Database } from "@/types/supabase"
import type {
  NotificationAlert,
  ScrapeRun,
  ScrapeQueueItem,
  ScrapeSource,
  QueueReviewItem,
  ScraperStats,
  SourceHealthSnapshot,
  SourceTier,
  UserNotificationPrefs,
} from "@/types/notifications"

// ─── Re-export SourceRegistryEntry from the authoritative file ─────────────────
// NEVER duplicate this type here — lib/db/source-registry.ts is the single source.
export type { SourceRegistryEntry } from "@/lib/db/source-registry"

// ─── Generated DB insert types ────────────────────────────────────────────────
type ScrapeSourceInsert = Database["public"]["Tables"]["scrape_sources"]["Insert"]

// =============================================================================
// USER NOTIFICATIONS
// =============================================================================

export async function getUserNotifications(
  userId: string,
  opts: { limit?: number; unreadOnly?: boolean; offset?: number } = {}
): Promise<NotificationAlert[]> {
  const supabase = await createClient()

  // v_notification_feed is created by supabase/migrations/notification_feed_view.sql
  // If the view doesn't exist yet, this query will throw a helpful error.
  let query = supabase
    .from("v_notification_feed")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(opts.limit ?? 50)

  if (opts.unreadOnly) query = query.eq("is_read", false)
  if (opts.offset)     query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data, error } = await query
  if (error) throw new Error(`getUserNotifications: ${error.message}`)
  return (data ?? []) as unknown as NotificationAlert[]
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("notification_alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
  if (error) throw new Error(`getUnreadCount: ${error.message}`)
  return count ?? 0
}

export async function markAlertRead(alertId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notification_alerts")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("user_id", userId)
  if (error) throw new Error(`markAlertRead: ${error.message}`)
}

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

export async function getUserNotifPrefs(_userId: string): Promise<UserNotificationPrefs | null> {
  // notification_preferences table not yet in DB schema.
  // After running its migration + supabase gen types, restore to a real query.
  return null
}

export async function upsertUserNotifPrefs(
  _userId: string,
  _prefs: Partial<Omit<UserNotificationPrefs, "user_id">>
): Promise<void> {
  // notification_preferences table not yet in DB schema. No-op until migration runs.
}

// =============================================================================
// TRACKED RECRUITMENTS
// =============================================================================

export async function trackRecruitment(userId: string, recruitmentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tracked_recruitments")
    .upsert({ user_id: userId, recruitment_id: recruitmentId }, { ignoreDuplicates: true })
  if (error) throw new Error(`trackRecruitment: ${error.message}`)
}

export async function untrackRecruitment(userId: string, recruitmentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tracked_recruitments")
    .delete()
    .eq("user_id",        userId)
    .eq("recruitment_id", recruitmentId)
  if (error) throw new Error(`untrackRecruitment: ${error.message}`)
}

// =============================================================================
// ALERT EVENTS FAN-OUT
// =============================================================================

export async function fanOutNotificationAlerts(recruitmentId: string): Promise<number> {
  const supabase = await createClient()
  // fn_fanout_for_recruitment does not exist in the DB schema.
  // The available RPC is fn_fanout_alert_event(p_event_id).
  // Fan out all pending alert_events for this recruitment one by one.
  const { data: events, error: evErr } = await supabase
    .from("alert_events")
    .select("id")
    .eq("recruitment_id", recruitmentId)
    .eq("fanout_status",  "pending")
    .limit(50)
  if (evErr) throw new Error(`fanOutNotificationAlerts: ${evErr.message}`)

  let total = 0
  for (const event of events ?? []) {
    const { data } = await supabase
      .rpc("fn_fanout_alert_event", { p_event_id: event.id })
    total += (data as number) ?? 0
  }
  return total
}

// =============================================================================
// SCRAPE QUEUE
// =============================================================================

export async function getScrapeQueue(
  status?: ScrapeQueueItem["status"],
  limit = 50
): Promise<QueueReviewItem[]> {
  const supabase = await createClient()
  // v_admin_queue_review is defined in sql/002_helper_functions.sql
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

export async function approveScrapeItem(
  itemId: string, reviewerId: string, notes?: string
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

export async function rejectScrapeItem(
  itemId: string, reviewerId: string, notes?: string
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
  return (data ?? []) as unknown as ScrapeRun[]
}

// =============================================================================
// SCRAPER STATS
// =============================================================================

export async function getScraperStats(): Promise<ScraperStats> {
  const supabase = await createClient()

  const [lastRunRes, pendingRes, failedRes, healthyRes] = await Promise.all([
    supabase
      .from("scrape_runs")
      .select("id,started_at,finished_at,status,sources_checked,items_found,items_new,items_duplicate,error_log,triggered_by")
      .order("started_at", { ascending: false })
      .limit(1),
    supabase
      .from("scrape_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("source_registry")
      .select("id", { count: "exact", head: true })
      .gte("consecutive_fails", 5),
    supabase
      .from("source_registry")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("consecutive_fails", 0),
  ])

  return {
    lastRun:        (lastRunRes.data?.[0] ?? null) as unknown as ScrapeRun | null,
    pendingReview:  pendingRes.count  ?? 0,
    approvedTotal:  0,
    failedSources:  failedRes.count   ?? 0,
    healthySources: healthyRes.count  ?? 0,
  }
}

// =============================================================================
// SOURCE HEALTH SNAPSHOTS
// =============================================================================

export async function getSourceHealthSnapshots(): Promise<SourceHealthSnapshot[]> {
  const supabase = await createClient()

  // Two separate queries — source_health_metrics.source_id FK still points to
  // scrape_sources (legacy). Until the FK migration (TASK 8) runs and
  // source_registry_id is backfilled, we merge in-memory.
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [sourcesRes, metricsRes] = await Promise.all([
    supabase
      .from("source_registry")
      .select("id,source_name,tier,is_active,consecutive_fails,last_scraped_at,last_success_at")
      .order("tier",        { ascending: true })
      .order("source_name"),
    supabase
      .from("source_health_metrics")
      .select("source_id,source_registry_id,confidence_avg,items_extracted,measured_at")
      .gte("measured_at", cutoff)
      .order("measured_at", { ascending: false }),
  ])

  if (sourcesRes.error) throw new Error(`getSourceHealthSnapshots: ${sourcesRes.error.message}`)

  type SourceRow = {
    id:                string
    source_name:       string
    tier:              number
    is_active:         boolean
    consecutive_fails: number
    last_scraped_at:   string | null
    last_success_at:   string | null
  }

  type MetricRow = {
    source_id:           string | null
    source_registry_id:  string | null
    confidence_avg:      number | null
    items_extracted:     number
    measured_at:         string
  }

  const sources = (sourcesRes.data ?? []) as unknown as SourceRow[]
  const metrics = (metricsRes.data ?? []) as unknown as MetricRow[]

  // Group metrics by source_registry_id first, fall back to source_id
  const metricsBySource = new Map<string, MetricRow[]>()
  for (const m of metrics) {
    const key = m.source_registry_id ?? m.source_id ?? ""
    if (!key) continue
    const existing = metricsBySource.get(key) ?? []
    existing.push(m)
    metricsBySource.set(key, existing)
  }

  return sources.map((s: SourceRow): SourceHealthSnapshot => {
    const recent = metricsBySource.get(s.id) ?? []

    const avgConf = recent.length
      ? recent.reduce((sum, m) => sum + (m.confidence_avg ?? 0), 0) / recent.length
      : null

    const items7d = recent.reduce((sum, m) => sum + (m.items_extracted ?? 0), 0)

    return {
      source_id:         s.id,
      name:              s.source_name,
      tier:              s.tier as SourceTier,
      is_active:         s.is_active,
      is_healthy:        s.consecutive_fails === 0,
      last_scraped_at:   s.last_scraped_at,
      last_success_at:   s.last_success_at,
      consecutive_fails: s.consecutive_fails,
      avg_confidence:    avgConf,
      items_7d:          items7d,
    }
  })
}

// =============================================================================
// LEGACY: SOURCE REGISTRY PASS-THROUGH
// These delegate to lib/db/source-registry.ts — kept here for actions/notifications.ts
// backward compatibility. Remove in Phase 3 once all callers are migrated.
// =============================================================================

export { dbToggleSourceActive as toggleSourceRegistry } from "@/lib/db/source-registry"
export { dbResetSourceFails   as resetSourceFails }     from "@/lib/db/source-registry"

/**
 * upsertSourceRegistry — delegates to dbCreateSource / dbUpdateSource.
 * Kept for adminSaveSourceRegistry in actions/notifications.ts.
 * @deprecated Use createSource / updateSource server actions instead.
 */
export async function upsertSourceRegistry(
  data: Parameters<typeof import("@/lib/db/source-registry").dbCreateSource>[0] & { id?: string }
): Promise<void> {
  const { dbCreateSource, dbUpdateSource } = await import("@/lib/db/source-registry")
  if (data.id) {
    const { id, ...rest } = data
    await dbUpdateSource(id, rest)
  } else {
    await dbCreateSource(data)
  }
}

// =============================================================================
// LEGACY: SCRAPE SOURCES (reads from scrape_sources — phase out in Phase 3)
// =============================================================================

export async function getScrapeSources(activeOnly = false): Promise<ScrapeSource[]> {
  const supabase = await createClient()
  let query = supabase
    .from("scrape_sources")
    .select("id,name,base_url,notification_path,org_type,state,is_active,is_healthy,last_scraped_at,last_success_at,scrape_interval_hours,tier,trust_score,adapter_type,consecutive_fails,selector_config,metadata")
    .order("name")
  if (activeOnly) query = query.eq("is_active", true)
  const { data, error } = await query
  if (error) throw new Error(`getScrapeSources: ${error.message}`)
  // Coerce nullables — is_healthy and others may be null in older rows
  return (data ?? []).map(row => ({
    ...row,
    is_healthy:        row.is_healthy        ?? false,
    consecutive_fails: row.consecutive_fails ?? 0,
    trust_score:       row.trust_score       ?? 0.7,
  })) as ScrapeSource[]
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
    id:                    data.id,
    name:                  data.name,
    base_url:              data.base_url,
    notification_path:     data.notification_path     ?? null,
    org_type:              data.org_type              ?? "Central Govt",
    state:                 data.state                 ?? null,
    is_active:             data.is_active             ?? true,
    last_scraped_at:       data.last_scraped_at       ?? null,
    scrape_interval_hours: data.scrape_interval_hours ?? 24,
    selector_config: (data.selector_config ?? {}) as ScrapeSourceInsert["selector_config"],
    ...(data.tier              !== undefined ? { tier:              data.tier }              : {}),
    ...(data.trust_score       !== undefined ? { trust_score:       data.trust_score }       : {}),
    ...(data.adapter_type      !== undefined ? { adapter_type:      data.adapter_type }      : {}),
    ...(data.consecutive_fails !== undefined ? { consecutive_fails: data.consecutive_fails } : {}),
    ...(data.metadata          !== undefined
      ? { metadata: data.metadata as ScrapeSourceInsert["metadata"] } : {}),
  }

  const { error } = await supabase.from("scrape_sources").upsert(payload)
  if (error) throw new Error(`upsertScrapeSource: ${error.message}`)
}