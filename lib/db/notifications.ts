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
import type { ExtractedRecruitment } from "@/types/scraping"

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

/**
 * Seed initial notification_alerts for a newly onboarded user.
 * Called once after finishOnboarding() so the user sees alerts immediately
 * instead of waiting for the next fan-out cycle.
 *
 * Inserts `new_match` alerts for every open recruitment (apply_end_date >= today
 * OR apply_end_date IS NULL) where an eligibility_results row marks them eligible.
 * If no eligibility_results exist yet, inserts for ALL open recruitments so the
 * feed is not empty (the user can always dismiss irrelevant ones).
 */
export async function seedNotificationsForNewUser(userId: string): Promise<number> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // Get open recruitments
  const { data: recruitments } = await supabase
    .from("recruitments")
    .select("id, name, status, apply_end_date, apply_start_date, notification_date, year, total_vacancies, org_id")
    .or(`apply_end_date.gte.${today},apply_end_date.is.null`)
    .in("status", ["open", "upcoming", "published"])
    .order("apply_end_date", { ascending: true })
    .limit(30)

  if (!recruitments || recruitments.length === 0) return 0

  // Check if user has eligibility results already
  const { data: eligibilityResults } = await supabase
    .from("eligibility_results")
    .select("recruitment_id, is_eligible, is_conditional")
    .eq("user_id", userId)

  const eligibleIds = new Set(
    (eligibilityResults ?? [])
      .filter(r => r.is_eligible || r.is_conditional)
      .map(r => r.recruitment_id)
  )
  const hasEligibilityData = (eligibilityResults?.length ?? 0) > 0

  // Decide which recruitments to notify about
  const toNotify = hasEligibilityData
    ? recruitments.filter(r => eligibleIds.has(r.id))
    : recruitments // No eligibility data yet — show all open ones

  if (toNotify.length === 0) return 0

  // Fetch org info for the recruitments in one query
  const orgIds = [...new Set(toNotify.map(r => r.org_id).filter(Boolean))]
  const { data: orgs } = orgIds.length > 0
    ? await supabase.from("organizations").select("id, name, type, state").in("id", orgIds as string[])
    : { data: [] }
  const orgMap = new Map((orgs ?? []).map(o => [o.id, o]))

  // Build inserts — skip any that already exist (use upsert with ON CONFLICT DO NOTHING)
  const now = new Date().toISOString()
  const inserts = toNotify.map(r => {
    const org = orgMap.get(r.org_id as string)
    return {
      user_id:             userId,
      alert_type:          "new_match" as const,
      is_read:             false,
      sent_at:             now,
      priority:            3 as const,
      recruitment_id:      r.id,
      alert_event_id:      null,
      event_type:          "new_recruitment" as const,
    }
  })

  const { data: inserted, error } = await supabase
    .from("notification_alerts")
    .upsert(inserts, {
      onConflict: "user_id,recruitment_id,alert_type",
      ignoreDuplicates: true,
    })
    .select("id")

  if (error) {
    console.error("[seedNotificationsForNewUser]", error.message)
    return 0
  }

  return inserted?.length ?? 0
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

  // ── Try the enriched view first (v_admin_queue_review from migration 009) ──
  // If the view doesn't exist yet (pre-migration DB), fall back to a direct
  // scrape_queue query that extracts title/org from the extracted_data JSONB.
  // Supabase returns code "42P01" (PGRST116/42P01) when relation does not exist.
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewQuery = (supabase as any)
      .from("v_admin_queue_review")
      .select("*")
      .order("scraped_at", { ascending: false })
      .limit(limit)
    if (status) viewQuery = viewQuery.eq("status", status)
    const { data: viewData, error: viewErr } = await viewQuery
    if (!viewErr) {
      return (viewData ?? []) as QueueReviewItem[]
    }
    // If error.code is not a missing-relation error, rethrow so real errors surface
    const code: string = viewErr?.code ?? ""
    if (code !== "42P01" && code !== "PGRST116" && !viewErr.message?.includes("does not exist")) {
      throw new Error(`getScrapeQueue (view): ${viewErr.message}`)
    }
    // Fall through to direct table query
  }

  // ── Fallback: query scrape_queue directly ────────────────────────────────
  // Extracts title + org_name from the extracted_data JSONB.
  // The view fields fingerprint / obs_status / canonical_id / canonical_name
  // (from source_observations JOIN) are null in the fallback — UI handles nulls.
  let query = supabase
    .from("scrape_queue")
    .select("id,source_url,source_name,confidence_score,data_quality_score,status,scraped_at,reviewed_at,reviewer_notes,extracted_data")
    .order("scraped_at", { ascending: false })
    .limit(limit)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) throw new Error(`getScrapeQueue: ${error.message}`)

  return (data ?? []).map((row) => {
    const ext = (row.extracted_data ?? {}) as Record<string, unknown>
    return {
      id:                 row.id,
      source_url:         row.source_url,
      source_name:        row.source_name ?? "",
      confidence_score:   row.confidence_score ?? 0,
      data_quality_score: (row.data_quality_score as number | null) ?? null,
      status:             row.status as ScrapeQueueItem["status"],
      scraped_at:         row.scraped_at,
      reviewed_at:        row.reviewed_at ?? null,
      reviewer_notes:     row.reviewer_notes ?? null,
      // Extracted from JSONB
      title:              (ext.title as string | null)               ?? null,
      org_name:           (ext.organization_name as string | null)   ?? null,
      apply_end_date:     (ext.apply_end_date as string | null)      ?? null,
      total_vacancies:    ext.total_vacancies != null ? String(ext.total_vacancies) : null,
      // Fields from source_observations JOIN — not available in direct fallback
      fingerprint:        null,
      obs_status:         null,
      canonical_id:       null,
      canonical_name:     null,
      run_started_at:     null,
    } satisfies QueueReviewItem
  })
}

export async function approveScrapeItem(
  itemId: string, reviewerId: string, notes?: string
): Promise<void> {
  const supabase = await createClient()
 
  // ── 1. Load queue row ──────────────────────────────────────────────────────
  const { data: item, error: fetchErr } = await supabase
    .from("scrape_queue")
    .select("*")
    .eq("id", itemId)
    .single()
 
  if (fetchErr || !item) throw new Error(`approveScrapeItem: row not found ${itemId}`)
 
  // ── 2. Idempotency: already promoted? ──────────────────────────────────────
  // duplicate_of stores the promoted recruitment_id after first approval
  if (item.status === "approved" && item.duplicate_of) return
 
  // ── 3. Validate ────────────────────────────────────────────────────────────
  if (!["pending", "reviewing"].includes(item.status)) {
    throw new Error(`approveScrapeItem: cannot approve item in status '${item.status}'`)
  }
 
  // ── 4. Promote to canonical recruitments ──────────────────────────────────
  // promoteToRecruitments now THROWS on real errors. We let those bubble to the
  // admin UI so the reviewer sees the actual database error (e.g. missing
  // unique constraint, CHECK violation, RLS denial) instead of a ghost approval.
  const { promoteToRecruitments } = await import("@/lib/scraping/runner")
  if (!item.extracted_data) throw new Error(`approveScrapeItem: no extracted_data on item ${itemId}`)

  let recruitmentId: string | null = null
  try {
    recruitmentId = await promoteToRecruitments(
      item.extracted_data as unknown as ExtractedRecruitment,
      supabase
    )
  } catch (err) {
    // Mark the row 'reviewing' with the error note, then re-throw so the admin
    // UI shows the real error. DO NOT mark 'approved'.
    await supabase
      .from("scrape_queue")
      .update({
        status:         "reviewing",
        reviewer_id:    reviewerId,
        reviewer_notes: (notes ?? "") + ` [promotion failed: ${err instanceof Error ? err.message : String(err)}]`,
        reviewed_at:    new Date().toISOString(),
      })
      .eq("id", itemId)
    throw err
  }

  if (!recruitmentId) {
    throw new Error(`approveScrapeItem: promotion returned no recruitment_id for item ${itemId}`)
  }

  // ── 5. Mark approved (+ store recruited_id in duplicate_of for idempotency)
  const { error: updateErr } = await supabase
    .from("scrape_queue")
    .update({
      status:         "approved",
      reviewer_id:    reviewerId,
      reviewer_notes: notes ?? null,
      reviewed_at:    new Date().toISOString(),
      duplicate_of:   recruitmentId,
    })
    .eq("id", itemId)

  if (updateErr) throw new Error(`approveScrapeItem update: ${updateErr.message}`)

  // ── 6. Broadcast admin-reviewed notification to all onboarded users ──────────
  //
  // WHY we do this in TypeScript rather than via fn_fanout_alert_event RPC:
  //   • fn_fanout_alert_event does not exist in any migration — was documented
  //     in Phase 3A but never created. Every previous call silently failed.
  //   • fn_notify_recruitment_opened trigger only fires for status='open'.
  //     Scraped items with past deadlines get status='closed' → trigger skips them.
  //   • The trigger's org_type matching table is incomplete (no Courts/Judiciary).
  //
  // A human admin has verified this item. That makes it trustworthy enough to
  // notify ALL users who have completed onboarding, regardless of org_type or
  // recruitment status. Users can filter/ignore in their notification feed.
  //
  // alert_type = 'new_match' (the only valid type for a new opening per the
  // notification_alerts_alert_type_check constraint).
  //
  // recruitmentId is guaranteed non-null here because promoteToRecruitments()
  // throws on any failure (see runner.ts), and approveScrapeItem re-throws
  // above before reaching this point.

  try {
    // Record the alert_event for audit trail
    const { data: evt } = await supabase
      .from("alert_events")
      .insert({
        event_type:     "new_recruitment",
        recruitment_id: recruitmentId,
        priority:       2,
        payload: {
          source_url:      item.source_url,
          source_name:     item.source_name,
          queue_item_id:   itemId,
          reviewer_id:     reviewerId,
          confidence_score: item.confidence_score,
        },
        fanout_status: "pending",
      })
      .select("id")
      .single()

    // Fetch all onboarded users
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .eq("onboarding_completed", true)

    if (users && users.length > 0) {
      const now = new Date().toISOString()
      const { error: notifErr } = await supabase
        .from("notification_alerts")
        .upsert(
          users.map((u) => ({
            user_id:        u.id,
            recruitment_id: recruitmentId,
            alert_type:     "new_match" as const,
            is_read:        false,
            priority:       3 as const,
            sent_at:        now,
            alert_event_id: evt?.id ?? null,
            explanation: {
              is_tracked:     false,
              is_eligible:    false,
              matched_exam:   false,
              matched_sector: false,
              matched_type:   false,
            },
          })),
          { onConflict: "user_id,recruitment_id,alert_type", ignoreDuplicates: true }
        )

      if (notifErr) {
        console.error("[approveScrapeItem] notification broadcast:", notifErr.message)
      } else {
        console.log(`[approveScrapeItem] broadcast to ${users.length} users for recruitment ${recruitmentId}`)
        // Mark alert_event as completed
        if (evt) {
          await supabase
            .from("alert_events")
            .update({ fanout_status: "completed", users_notified: users.length })
            .eq("id", evt.id)
        }
      }
    }
  } catch (e) {
    console.error("[approveScrapeItem] notification broadcast non-fatal:", e)
  }

  // ── 7. Queue eligibility recompute for all users ───────────────────────────
  // Each user who has completed onboarding needs to be re-evaluated against
  // the new recruitment. We insert into eligibility_recompute_queue; the
  // eligibility-consumer Edge Function drains this every 5 minutes.
  // Non-fatal — a failure here doesn't affect the approval itself.
  try {
    const { data: userIds } = await supabase
      .from("profiles")
      .select("id")
      .eq("onboarding_completed", true)

    if (userIds && userIds.length > 0) {
      await supabase
        .from("eligibility_recompute_queue")
        .upsert(
          userIds.map((u) => ({
            user_id:        u.id,
            recruitment_id: recruitmentId,
            status:         "pending",
            reason:         "new_recruitment_approved",
            queued_at:      new Date().toISOString(),
          })),
          // uq_recompute_queue is on (user_id, recruitment_id, status) — must include all 3
          { onConflict: "user_id,recruitment_id,status", ignoreDuplicates: true }
        )
      console.log(`[approveScrapeItem] queued eligibility recompute for ${userIds.length} users`)
    }
  } catch (e) {
    console.error("[approveScrapeItem] eligibility queue non-fatal:", e)
  }
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