// // /**
// //  * lib/db/notifications.ts — Phase 2
// //  *
// //  * Single module for all notification + scraping DB operations.
// //  * source_registry is the new master table; scrape_sources is legacy.
// //  */

// // import { createClient } from "@/utils/supabase/server"
// // import type { Database } from "@/types/supabase"
// // import type {
// //   NotificationAlert,
// //   ScrapeRun,
// //   ScrapeQueueItem,
// //   ScrapeSource,
// //   AlertEvent,
// //   QueueReviewItem,
// //   ScraperStats,
// //   SourceHealthSnapshot,
// //   SourceTier,
// //   UserNotificationPrefs,
// // } from "@/types/notifications"

// // // Re-exports for backward compatibility
// // export type { NotificationAlert, ScrapeRun, ScrapeQueueItem, ScrapeSource }

// // // Strongly-typed insert shape from generated types — used in upsertScrapeSource
// // type ScrapeSourceInsert = Database["public"]["Tables"]["scrape_sources"]["Insert"]

// // // ─── SourceRegistryEntry ─────────────────────────────────────────────────────

// // export type SourceRegistryEntry = {
// //   id:                    string
// //   source_name:           string
// //   short_code:            string | null
// //   source_type:           string
// //   category:              string
// //   jurisdiction:          string | null
// //   state:                 string | null
// //   official_url:          string
// //   notification_url:      string | null
// //   rss_url:               string | null
// //   api_url:               string | null
// //   pdf_bulletin_url:      string | null
// //   adapter_type:          string
// //   parser_config:         Record<string, unknown>
// //   scrape_interval_hours: number
// //   tier:                  number
// //   trust_score:           number
// //   anti_bot_risk:         string
// //   requires_playwright:   boolean
// //   has_captcha:           boolean
// //   pdf_only:              boolean
// //   is_active:             boolean
// //   is_verified:           boolean
// //   consecutive_fails:     number
// //   last_scraped_at:       string | null
// //   last_success_at:       string | null
// //   last_error:            string | null
// //   notes:                 string | null
// // }

// // // =============================================================================
// // // USER NOTIFICATIONS
// // // =============================================================================

// // export async function getUserNotifications(
// //   userId: string,
// //   opts: { limit?: number; unreadOnly?: boolean; offset?: number } = {}
// // ): Promise<NotificationAlert[]> {
// //   const supabase = await createClient()
// //   let query = supabase
// //     .from("v_notification_feed")
// //     .select("*")
// //     .eq("user_id", userId)
// //     .order("sent_at", { ascending: false })
// //     .limit(opts.limit ?? 50)

// //   if (opts.offset)    query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
// //   if (opts.unreadOnly) query = query.eq("is_read", false)

// //   const { data, error } = await query
// //   if (error) throw new Error(`getUserNotifications: ${error.message}`)
// //   return (data ?? []) as NotificationAlert[]
// // }

// // export async function getUnreadCount(userId: string): Promise<number> {
// //   const supabase = await createClient()
// //   const { count, error } = await supabase
// //     .from("notification_alerts")
// //     .select("id", { count: "exact", head: true })
// //     .eq("user_id", userId)
// //     .eq("is_read", false)
// //   if (error) return 0
// //   return count ?? 0
// // }

// // export async function markAlertRead(alertId: string, userId: string): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("notification_alerts")
// //     .update({ is_read: true, read_at: new Date().toISOString() })
// //     .eq("id", alertId)
// //     .eq("user_id", userId)
// //   if (error) throw new Error(`markAlertRead: ${error.message}`)
// // }

// // export async function markAllAlertsRead(userId: string): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("notification_alerts")
// //     .update({ is_read: true, read_at: new Date().toISOString() })
// //     .eq("user_id", userId)
// //     .eq("is_read", false)
// //   if (error) throw new Error(`markAllAlertsRead: ${error.message}`)
// // }

// // // =============================================================================
// // // USER NOTIFICATION PREFERENCES
// // // =============================================================================

// // export async function getUserNotifPrefs(userId: string): Promise<UserNotificationPrefs | null> {
// //   const supabase = await createClient()
// //   const { data } = await supabase
// //     .from("user_notification_prefs")
// //     .select("*")
// //     .eq("user_id", userId)
// //     .single()
// //   return data as UserNotificationPrefs | null
// // }

// // export async function upsertUserNotifPrefs(
// //   userId: string,
// //   prefs: Partial<Omit<UserNotificationPrefs, "user_id">>
// // ): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("user_notification_prefs")
// //     .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
// //   if (error) throw new Error(`upsertUserNotifPrefs: ${error.message}`)
// // }

// // // =============================================================================
// // // TRACKED RECRUITMENTS
// // // =============================================================================

// // export async function trackRecruitment(userId: string, recruitmentId: string): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("tracked_recruitments")
// //     .upsert({ user_id: userId, recruitment_id: recruitmentId })
// //   if (error) throw new Error(`trackRecruitment: ${error.message}`)
// // }

// // export async function untrackRecruitment(userId: string, recruitmentId: string): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("tracked_recruitments")
// //     .delete()
// //     .eq("user_id", userId)
// //     .eq("recruitment_id", recruitmentId)
// //   if (error) throw new Error(`untrackRecruitment: ${error.message}`)
// // }

// // // =============================================================================
// // // SOURCE REGISTRY  (Phase 2 — master table)
// // // =============================================================================

// // export async function getSourceRegistry(
// //   opts: { activeOnly?: boolean; tier?: number; category?: string } = {}
// // ): Promise<SourceRegistryEntry[]> {
// //   const supabase = await createClient()
// //   let query = supabase
// //     .from("source_registry")
// //     .select("*")
// //     .order("tier", { ascending: true })
// //     .order("source_name")

// //   if (opts.activeOnly) query = query.eq("is_active", true)
// //   if (opts.tier)       query = query.eq("tier", opts.tier)
// //   if (opts.category)   query = query.eq("category", opts.category)

// //   const { data, error } = await query
// //   if (error) throw new Error(`getSourceRegistry: ${error.message}`)
// //   return (data ?? []) as SourceRegistryEntry[]
// // }

// // export async function toggleSourceRegistry(id: string, active: boolean): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("source_registry")
// //     .update({ is_active: active })
// //     .eq("id", id)
// //   if (error) throw new Error(`toggleSourceRegistry: ${error.message}`)
// // }

// // /**
// //  * Upsert a source_registry row.
// //  *
// //  * Why the explicit payload shape instead of `{ ...data }`:
// //  * Supabase's generated Insert type marks `category` as required (NOT NULL,
// //  * no DB default). Spreading Partial<SourceRegistryEntry> makes it
// //  * `string | undefined`, which conflicts. Building the payload field-by-field
// //  * keeps every required column non-optional while still allowing partial updates.
// //  */
// // export async function upsertSourceRegistry(
// //   data: Partial<SourceRegistryEntry> & {
// //     source_name:  string
// //     official_url: string
// //     category:     string
// //   }
// // ): Promise<void> {
// //   const supabase = await createClient()

// //   const payload = {
// //     ...(data.id               !== undefined ? { id:                data.id }               : {}),
// //     source_name:               data.source_name,
// //     official_url:              data.official_url,
// //     category:                  data.category,
// //     ...(data.short_code        !== undefined ? { short_code:        data.short_code }        : {}),
// //     ...(data.source_type       !== undefined ? { source_type:       data.source_type }       : {}),
// //     ...(data.jurisdiction      !== undefined ? { jurisdiction:      data.jurisdiction }      : {}),
// //     ...(data.state             !== undefined ? { state:             data.state }             : {}),
// //     ...(data.notification_url  !== undefined ? { notification_url:  data.notification_url }  : {}),
// //     ...(data.rss_url           !== undefined ? { rss_url:           data.rss_url }           : {}),
// //     ...(data.api_url           !== undefined ? { api_url:           data.api_url }           : {}),
// //     ...(data.pdf_bulletin_url  !== undefined ? { pdf_bulletin_url:  data.pdf_bulletin_url }  : {}),
// //     ...(data.adapter_type      !== undefined ? { adapter_type:      data.adapter_type }      : {}),
// //     ...(data.scrape_interval_hours !== undefined
// //       ? { scrape_interval_hours: data.scrape_interval_hours } : {}),
// //     ...(data.tier              !== undefined ? { tier:              data.tier }              : {}),
// //     ...(data.trust_score       !== undefined ? { trust_score:       data.trust_score }       : {}),
// //     ...(data.anti_bot_risk     !== undefined ? { anti_bot_risk:     data.anti_bot_risk }     : {}),
// //     ...(data.requires_playwright !== undefined
// //       ? { requires_playwright: data.requires_playwright } : {}),
// //     ...(data.has_captcha       !== undefined ? { has_captcha:       data.has_captcha }       : {}),
// //     ...(data.pdf_only          !== undefined ? { pdf_only:          data.pdf_only }          : {}),
// //     ...(data.is_active         !== undefined ? { is_active:         data.is_active }         : {}),
// //     ...(data.is_verified       !== undefined ? { is_verified:       data.is_verified }       : {}),
// //     ...(data.notes             !== undefined ? { notes:             data.notes }             : {}),
// //     updated_at: new Date().toISOString(),
// //   }

// //   const { error } = await supabase.from("source_registry").upsert(payload)
// //   if (error) throw new Error(`upsertSourceRegistry: ${error.message}`)
// // }

// // export async function resetSourceFails(id: string): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("source_registry")
// //     .update({ consecutive_fails: 0, last_error: null, is_active: true })
// //     .eq("id", id)
// //   if (error) throw new Error(`resetSourceFails: ${error.message}`)
// // }

// // // =============================================================================
// // // LEGACY: SCRAPE SOURCES  (kept for backward compat — phase out after Phase 3)
// // // =============================================================================

// // export async function getScrapeSources(activeOnly = false): Promise<ScrapeSource[]> {
// //   const supabase = await createClient()
// //   let query = supabase
// //     .from("scrape_sources")
// //     .select("id,name,base_url,notification_path,org_type,state,is_active,is_healthy,last_scraped_at,last_success_at,scrape_interval_hours,tier,trust_score,adapter_type,consecutive_fails,selector_config,metadata")
// //     .order("name")
// //   if (activeOnly) query = query.eq("is_active", true)
// //   const { data, error } = await query
// //   if (error) throw new Error(`getScrapeSources: ${error.message}`)
// //   return (data ?? []) as ScrapeSource[]
// // }

// // export async function toggleScrapeSource(id: string, active: boolean): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("scrape_sources")
// //     .update({ is_active: active })
// //     .eq("id", id)
// //   if (error) throw new Error(`toggleScrapeSource: ${error.message}`)
// // }

// // /**
// //  * Upsert a scrape_sources row.
// //  *
// //  * Why ScrapeSourceInsert instead of spreading Partial<ScrapeSource>:
// //  * ScrapeSource.metadata is typed as Record<string,unknown> in our domain type,
// //  * but the generated DB Insert type expects Json (a recursive type). Spreading
// //  * Partial<ScrapeSource> directly causes an overload mismatch. Using the
// //  * generated ScrapeSourceInsert type and casting the two jsonb columns resolves
// //  * this without needing `as any`.
// //  */
// // export async function upsertScrapeSource(
// //   data: Partial<ScrapeSource> & { name: string; base_url: string }
// // ): Promise<void> {
// //   const supabase = await createClient()

// //   const payload: ScrapeSourceInsert = {
// //     id:                    data.id,
// //     name:                  data.name,
// //     base_url:              data.base_url,
// //     notification_path:     data.notification_path     ?? null,
// //     org_type:              data.org_type              ?? "Central Govt",
// //     state:                 data.state                 ?? null,
// //     is_active:             data.is_active             ?? true,
// //     last_scraped_at:       data.last_scraped_at       ?? null,
// //     scrape_interval_hours: data.scrape_interval_hours ?? 24,
// //     // Cast jsonb fields — Record<string,unknown> satisfies Json at runtime;
// //     // the explicit cast is required to satisfy the generated type.
// //     selector_config: (data.selector_config ?? {}) as ScrapeSourceInsert["selector_config"],
// //     // Legacy columns added in v2 migration — may be undefined on older rows
// //     ...(data.tier              !== undefined ? { tier:              data.tier }              : {}),
// //     ...(data.trust_score       !== undefined ? { trust_score:       data.trust_score }       : {}),
// //     ...(data.adapter_type      !== undefined ? { adapter_type:      data.adapter_type }      : {}),
// //     ...(data.consecutive_fails !== undefined ? { consecutive_fails: data.consecutive_fails } : {}),
// //     ...(data.metadata          !== undefined
// //       ? { metadata: data.metadata as ScrapeSourceInsert["metadata"] } : {}),
// //   }

// //   const { error } = await supabase.from("scrape_sources").upsert(payload)
// //   if (error) throw new Error(`upsertScrapeSource: ${error.message}`)
// // }

// // // =============================================================================
// // // SCRAPE QUEUE
// // // =============================================================================

// // export async function getScrapeQueue(
// //   status?: ScrapeQueueItem["status"],
// //   limit = 50
// // ): Promise<QueueReviewItem[]> {
// //   const supabase = await createClient()
// //   let query = supabase
// //     .from("v_admin_queue_review")
// //     .select("*")
// //     .order("scraped_at", { ascending: false })
// //     .limit(limit)
// //   if (status) query = query.eq("status", status)
// //   const { data, error } = await query
// //   if (error) throw new Error(`getScrapeQueue: ${error.message}`)
// //   return (data ?? []) as QueueReviewItem[]
// // }

// // export async function approveScrapeItem(
// //   itemId: string, reviewerId: string, notes?: string
// // ): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("scrape_queue")
// //     .update({
// //       status:         "approved",
// //       reviewer_id:    reviewerId,
// //       reviewer_notes: notes ?? null,
// //       reviewed_at:    new Date().toISOString(),
// //     })
// //     .eq("id", itemId)
// //   if (error) throw new Error(`approveScrapeItem: ${error.message}`)
// // }

// // export async function rejectScrapeItem(
// //   itemId: string, reviewerId: string, notes?: string
// // ): Promise<void> {
// //   const supabase = await createClient()
// //   const { error } = await supabase
// //     .from("scrape_queue")
// //     .update({
// //       status:         "rejected",
// //       reviewer_id:    reviewerId,
// //       reviewer_notes: notes ?? null,
// //       reviewed_at:    new Date().toISOString(),
// //     })
// //     .eq("id", itemId)
// //   if (error) throw new Error(`rejectScrapeItem: ${error.message}`)
// // }

// // // =============================================================================
// // // SCRAPE RUNS
// // // =============================================================================

// // export async function getScrapeRuns(limit = 20): Promise<ScrapeRun[]> {
// //   const supabase = await createClient()
// //   const { data, error } = await supabase
// //     .from("scrape_runs")
// //     .select("id,started_at,finished_at,status,sources_checked,items_found,items_new,items_duplicate,error_log,triggered_by")
// //     .order("started_at", { ascending: false })
// //     .limit(limit)
// //   if (error) throw new Error(`getScrapeRuns: ${error.message}`)
// //   return (data ?? []) as ScrapeRun[]
// // }

// // // =============================================================================
// // // ALERT EVENTS
// // // =============================================================================

// // export async function getPendingAlertEvents(limit = 50): Promise<AlertEvent[]> {
// //   const supabase = await createClient()
// //   const { data, error } = await supabase
// //     .from("alert_events")
// //     .select("*")
// //     .eq("fanout_status", "pending")
// //     .order("priority",   { ascending: true })
// //     .order("created_at", { ascending: true })
// //     .limit(limit)
// //   if (error) throw new Error(`getPendingAlertEvents: ${error.message}`)
// //   return (data ?? []) as AlertEvent[]
// // }

// // export async function fanOutAlertEvent(eventId: string): Promise<number> {
// //   const supabase = await createClient()
// //   const { data, error } = await supabase.rpc("fn_fanout_alert_event", {
// //     p_event_id: eventId,
// //   })
// //   if (error) throw new Error(`fanOutAlertEvent: ${error.message}`)
// //   return (data as number) ?? 0
// // }

// // export async function fanOutNotificationAlerts(recruitmentId: string): Promise<number> {
// //   const supabase = await createClient()
// //   const { data: evt, error: evtErr } = await supabase
// //     .from("alert_events")
// //     .insert({
// //       event_type:     "application_open",
// //       recruitment_id: recruitmentId,
// //       priority:       1,
// //       payload:        { manual: true },
// //       fanout_status:  "pending",
// //     })
// //     .select("id")
// //     .single()

// //   if (evtErr || !evt) {
// //     throw new Error(`fanOutNotificationAlerts create event: ${evtErr?.message}`)
// //   }
// //   return fanOutAlertEvent(evt.id)
// // }

// // // =============================================================================
// // // ADMIN STATS
// // // =============================================================================

// // export async function getScraperStats(): Promise<ScraperStats> {
// //   const supabase = await createClient()
// //   const [runsRes, pendingRes, failedRes, healthyRes] = await Promise.all([
// //     supabase
// //       .from("scrape_runs")
// //       .select("id,status,items_new,items_found,started_at,finished_at,sources_checked,items_duplicate,triggered_by,error_log")
// //       .order("started_at", { ascending: false })
// //       .limit(1),
// //     supabase
// //       .from("scrape_queue")
// //       .select("id", { count: "exact", head: true })
// //       .eq("status", "pending"),
// //     supabase
// //       .from("source_registry")
// //       .select("id", { count: "exact", head: true })
// //       .eq("is_active", true)
// //       .gte("consecutive_fails", 5),
// //     supabase
// //       .from("source_registry")
// //       .select("id", { count: "exact", head: true })
// //       .eq("is_active", true)
// //       .lt("consecutive_fails", 5),
// //   ])

// //   return {
// //     lastRun:        (runsRes.data?.[0] as unknown as ScrapeRun) ?? null,
// //     pendingReview:  pendingRes.count ?? 0,
// //     approvedTotal:  0,
// //     failedSources:  failedRes.count  ?? 0,
// //     healthySources: healthyRes.count ?? 0,
// //   }
// // }

// // export async function getSourceHealthSnapshots(): Promise<SourceHealthSnapshot[]> {
// //   const supabase = await createClient()

// //   const { data, error } = await supabase
// //     .from("source_registry")
// //     .select("id, source_name, tier, is_active, consecutive_fails, last_scraped_at, last_success_at, source_health_metrics (confidence_avg, items_extracted, measured_at)")
// //     .order("tier",        { ascending: true })
// //     .order("source_name")

// //   if (error) throw new Error(`getSourceHealthSnapshots: ${error.message}`)

// //   // Explicit row type so TypeScript can narrow the nested relation
// //   // without resorting to `any`.
// //   type HealthMetric = {
// //     confidence_avg:  number | null
// //     items_extracted: number
// //     measured_at:     string
// //   }
// //   type HealthRow = {
// //     id:                string
// //     source_name:       string
// //     tier:              number
// //     is_active:         boolean
// //     consecutive_fails: number
// //     last_scraped_at:   string | null
// //     last_success_at:   string | null
// //     source_health_metrics: HealthMetric[]
// //   }

// //   const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

// //   return ((data ?? []) as unknown as HealthRow[]).map((s: HealthRow): SourceHealthSnapshot => {
// //     const metrics = s.source_health_metrics ?? []
// //     const recent  = metrics.filter(m => new Date(m.measured_at) >= cutoff)

// //     const avgConf = recent.length
// //       ? recent.reduce((sum, m) => sum + (m.confidence_avg ?? 0), 0) / recent.length
// //       : null

// //     const items7d = recent.reduce((sum, m) => sum + m.items_extracted, 0)

// //     return {
// //       source_id:         s.id,
// //       name:              s.source_name,
// //       tier:              s.tier as SourceTier,
// //       is_active:         s.is_active,
// //       is_healthy:        s.consecutive_fails < 5,
// //       last_scraped_at:   s.last_scraped_at,
// //       last_success_at:   s.last_success_at,
// //       consecutive_fails: s.consecutive_fails,
// //       avg_confidence:    avgConf,
// //       items_7d:          items7d,
// //     }
// //   })
// // }

// // // =============================================================================
// // // OPEN RECRUITMENTS  (fallback for free users with no alerts yet)
// // // =============================================================================

// // export async function getOpenRecruitments(limit = 30) {
// //   const supabase = await createClient()
// //   const { data, error } = await supabase
// //     .from("recruitments")
// //     .select("id, name, status, apply_end_date, apply_start_date, notification_date, year, total_vacancies, organizations ( name, type, state )")
// //     .in("status", ["open", "upcoming"])
// //     .order("apply_end_date", { ascending: true, nullsFirst: false })
// //     .limit(limit)
// //   if (error) throw new Error(`getOpenRecruitments: ${error.message}`)
// //   return data ?? []
// // }

// // // =============================================================================
// // // ELIGIBILITY RECOMPUTE QUEUE
// // // =============================================================================

// // export async function getPendingRecomputeQueue(limit = 50) {
// //   const supabase = await createClient()
// //   const { data, error } = await supabase
// //     .from("eligibility_recompute_queue")
// //     .select("user_id, recruitment_id, reason, queued_at")
// //     .eq("status", "pending")
// //     .order("queued_at", { ascending: true })
// //     .limit(limit)
// //   if (error) throw new Error(`getPendingRecomputeQueue: ${error.message}`)
// //   return data ?? []
// // }

// // export async function markRecomputeCompleted(
// //   userId: string,
// //   recruitmentId: string
// // ): Promise<void> {
// //   const supabase = await createClient()
// //   await supabase
// //     .from("eligibility_recompute_queue")
// //     .update({ status: "completed", processed_at: new Date().toISOString() })
// //     .eq("user_id",        userId)
// //     .eq("recruitment_id", recruitmentId)
// //     .eq("status",         "pending")
// // }

// /**
//  * lib/db/notifications.ts — Phase 2
//  *
//  * Single module for all notification + scraping DB operations.
//  * source_registry is the new master table; scrape_sources is legacy.
//  */

// import { createClient } from "@/utils/supabase/server"
// import type { Database } from "@/types/supabase"
// import type {
//   NotificationAlert,
//   ScrapeRun,
//   ScrapeQueueItem,
//   ScrapeSource,
//   AlertEvent,
//   QueueReviewItem,
//   ScraperStats,
//   SourceHealthSnapshot,
//   SourceTier,
//   UserNotificationPrefs,
// } from "@/types/notifications"

// // Re-exports for backward compatibility
// export type { NotificationAlert, ScrapeRun, ScrapeQueueItem, ScrapeSource }

// // Strongly-typed insert shape from generated types — used in upsertScrapeSource
// type ScrapeSourceInsert = Database["public"]["Tables"]["scrape_sources"]["Insert"]

// // ─── SourceRegistryEntry ─────────────────────────────────────────────────────

// export type SourceRegistryEntry = {
//   id:                    string
//   source_name:           string
//   short_code:            string | null
//   source_type:           string
//   category:              string
//   jurisdiction:          string | null
//   state:                 string | null
//   official_url:          string
//   notification_url:      string | null
//   rss_url:               string | null
//   api_url:               string | null
//   pdf_bulletin_url:      string | null
//   adapter_type:          string
//   parser_config:         Record<string, unknown>
//   scrape_interval_hours: number
//   tier:                  number
//   trust_score:           number
//   anti_bot_risk:         string
//   requires_playwright:   boolean
//   has_captcha:           boolean
//   pdf_only:              boolean
//   is_active:             boolean
//   is_verified:           boolean
//   consecutive_fails:     number
//   last_scraped_at:       string | null
//   last_success_at:       string | null
//   last_error:            string | null
//   notes:                 string | null
// }

// // =============================================================================
// // USER NOTIFICATIONS
// // =============================================================================

// export async function getUserNotifications(
//   userId: string,
//   opts: { limit?: number; unreadOnly?: boolean; offset?: number } = {}
// ): Promise<NotificationAlert[]> {
//   const supabase = await createClient()
//   let query = supabase
//     .from("v_notification_feed")
//     .select("*")
//     .eq("user_id", userId)
//     .order("sent_at", { ascending: false })
//     .limit(opts.limit ?? 50)

//   if (opts.offset)    query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
//   if (opts.unreadOnly) query = query.eq("is_read", false)

//   const { data, error } = await query
//   if (error) throw new Error(`getUserNotifications: ${error.message}`)
//   return (data ?? []) as NotificationAlert[]
// }

// export async function getUnreadCount(userId: string): Promise<number> {
//   const supabase = await createClient()
//   const { count, error } = await supabase
//     .from("notification_alerts")
//     .select("id", { count: "exact", head: true })
//     .eq("user_id", userId)
//     .eq("is_read", false)
//   if (error) return 0
//   return count ?? 0
// }

// export async function markAlertRead(alertId: string, userId: string): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("notification_alerts")
//     .update({ is_read: true, read_at: new Date().toISOString() })
//     .eq("id", alertId)
//     .eq("user_id", userId)
//   if (error) throw new Error(`markAlertRead: ${error.message}`)
// }

// export async function markAllAlertsRead(userId: string): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("notification_alerts")
//     .update({ is_read: true, read_at: new Date().toISOString() })
//     .eq("user_id", userId)
//     .eq("is_read", false)
//   if (error) throw new Error(`markAllAlertsRead: ${error.message}`)
// }

// // =============================================================================
// // USER NOTIFICATION PREFERENCES
// // =============================================================================

// export async function getUserNotifPrefs(userId: string): Promise<UserNotificationPrefs | null> {
//   const supabase = await createClient()
//   const { data } = await supabase
//     .from("user_notification_prefs")
//     .select("*")
//     .eq("user_id", userId)
//     .single()
//   return data as UserNotificationPrefs | null
// }

// export async function upsertUserNotifPrefs(
//   userId: string,
//   prefs: Partial<Omit<UserNotificationPrefs, "user_id">>
// ): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("user_notification_prefs")
//     .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
//   if (error) throw new Error(`upsertUserNotifPrefs: ${error.message}`)
// }

// // =============================================================================
// // TRACKED RECRUITMENTS
// // =============================================================================

// export async function trackRecruitment(userId: string, recruitmentId: string): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("tracked_recruitments")
//     .upsert({ user_id: userId, recruitment_id: recruitmentId })
//   if (error) throw new Error(`trackRecruitment: ${error.message}`)
// }

// export async function untrackRecruitment(userId: string, recruitmentId: string): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("tracked_recruitments")
//     .delete()
//     .eq("user_id", userId)
//     .eq("recruitment_id", recruitmentId)
//   if (error) throw new Error(`untrackRecruitment: ${error.message}`)
// }

// // =============================================================================
// // SOURCE REGISTRY  (Phase 2 — master table)
// // =============================================================================

// export async function getSourceRegistry(
//   opts: { activeOnly?: boolean; tier?: number; category?: string } = {}
// ): Promise<SourceRegistryEntry[]> {
//   const supabase = await createClient()
//   let query = supabase
//     .from("source_registry")
//     .select("*")
//     .order("tier", { ascending: true })
//     .order("source_name")

//   if (opts.activeOnly) query = query.eq("is_active", true)
//   if (opts.tier)       query = query.eq("tier", opts.tier)
//   if (opts.category)   query = query.eq("category", opts.category)

//   const { data, error } = await query
//   if (error) throw new Error(`getSourceRegistry: ${error.message}`)
//   return (data ?? []) as SourceRegistryEntry[]
// }

// export async function toggleSourceRegistry(id: string, active: boolean): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("source_registry")
//     .update({ is_active: active })
//     .eq("id", id)
//   if (error) throw new Error(`toggleSourceRegistry: ${error.message}`)
// }

// /**
//  * Upsert a source_registry row.
//  *
//  * Why the explicit payload shape instead of `{ ...data }`:
//  * Supabase's generated Insert type marks `category` as required (NOT NULL,
//  * no DB default). Spreading Partial<SourceRegistryEntry> makes it
//  * `string | undefined`, which conflicts. Building the payload field-by-field
//  * keeps every required column non-optional while still allowing partial updates.
//  */
// export async function upsertSourceRegistry(
//   data: Partial<SourceRegistryEntry> & {
//     source_name:  string
//     official_url: string
//     category:     string
//   }
// ): Promise<void> {
//   const supabase = await createClient()

//   const payload = {
//     ...(data.id               !== undefined ? { id:                data.id }               : {}),
//     source_name:               data.source_name,
//     official_url:              data.official_url,
//     category:                  data.category,
//     ...(data.short_code        !== undefined ? { short_code:        data.short_code }        : {}),
//     ...(data.source_type       !== undefined ? { source_type:       data.source_type }       : {}),
//     ...(data.jurisdiction      !== undefined ? { jurisdiction:      data.jurisdiction }      : {}),
//     ...(data.state             !== undefined ? { state:             data.state }             : {}),
//     ...(data.notification_url  !== undefined ? { notification_url:  data.notification_url }  : {}),
//     ...(data.rss_url           !== undefined ? { rss_url:           data.rss_url }           : {}),
//     ...(data.api_url           !== undefined ? { api_url:           data.api_url }           : {}),
//     ...(data.pdf_bulletin_url  !== undefined ? { pdf_bulletin_url:  data.pdf_bulletin_url }  : {}),
//     ...(data.adapter_type      !== undefined ? { adapter_type:      data.adapter_type }      : {}),
//     ...(data.scrape_interval_hours !== undefined
//       ? { scrape_interval_hours: data.scrape_interval_hours } : {}),
//     ...(data.tier              !== undefined ? { tier:              data.tier }              : {}),
//     ...(data.trust_score       !== undefined ? { trust_score:       data.trust_score }       : {}),
//     ...(data.anti_bot_risk     !== undefined ? { anti_bot_risk:     data.anti_bot_risk }     : {}),
//     ...(data.requires_playwright !== undefined
//       ? { requires_playwright: data.requires_playwright } : {}),
//     ...(data.has_captcha       !== undefined ? { has_captcha:       data.has_captcha }       : {}),
//     ...(data.pdf_only          !== undefined ? { pdf_only:          data.pdf_only }          : {}),
//     ...(data.is_active         !== undefined ? { is_active:         data.is_active }         : {}),
//     ...(data.is_verified       !== undefined ? { is_verified:       data.is_verified }       : {}),
//     ...(data.notes             !== undefined ? { notes:             data.notes }             : {}),
//     updated_at: new Date().toISOString(),
//   }

//   const { error } = await supabase.from("source_registry").upsert(payload)
//   if (error) throw new Error(`upsertSourceRegistry: ${error.message}`)
// }

// export async function resetSourceFails(id: string): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("source_registry")
//     .update({ consecutive_fails: 0, last_error: null, is_active: true })
//     .eq("id", id)
//   if (error) throw new Error(`resetSourceFails: ${error.message}`)
// }

// // =============================================================================
// // LEGACY: SCRAPE SOURCES  (kept for backward compat — phase out after Phase 3)
// // =============================================================================

// export async function getScrapeSources(activeOnly = false): Promise<ScrapeSource[]> {
//   const supabase = await createClient()
//   let query = supabase
//     .from("scrape_sources")
//     .select("id,name,base_url,notification_path,org_type,state,is_active,is_healthy,last_scraped_at,last_success_at,scrape_interval_hours,tier,trust_score,adapter_type,consecutive_fails,selector_config,metadata")
//     .order("name")
//   if (activeOnly) query = query.eq("is_active", true)
//   const { data, error } = await query
//   if (error) throw new Error(`getScrapeSources: ${error.message}`)
//   return (data ?? []) as ScrapeSource[]
// }

// export async function toggleScrapeSource(id: string, active: boolean): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("scrape_sources")
//     .update({ is_active: active })
//     .eq("id", id)
//   if (error) throw new Error(`toggleScrapeSource: ${error.message}`)
// }

// /**
//  * Upsert a scrape_sources row.
//  *
//  * Why ScrapeSourceInsert instead of spreading Partial<ScrapeSource>:
//  * ScrapeSource.metadata is typed as Record<string,unknown> in our domain type,
//  * but the generated DB Insert type expects Json (a recursive type). Spreading
//  * Partial<ScrapeSource> directly causes an overload mismatch. Using the
//  * generated ScrapeSourceInsert type and casting the two jsonb columns resolves
//  * this without needing `as any`.
//  */
// export async function upsertScrapeSource(
//   data: Partial<ScrapeSource> & { name: string; base_url: string }
// ): Promise<void> {
//   const supabase = await createClient()

//   const payload: ScrapeSourceInsert = {
//     id:                    data.id,
//     name:                  data.name,
//     base_url:              data.base_url,
//     notification_path:     data.notification_path     ?? null,
//     org_type:              data.org_type              ?? "Central Govt",
//     state:                 data.state                 ?? null,
//     is_active:             data.is_active             ?? true,
//     last_scraped_at:       data.last_scraped_at       ?? null,
//     scrape_interval_hours: data.scrape_interval_hours ?? 24,
//     // Cast jsonb fields — Record<string,unknown> satisfies Json at runtime;
//     // the explicit cast is required to satisfy the generated type.
//     selector_config: (data.selector_config ?? {}) as ScrapeSourceInsert["selector_config"],
//     // Legacy columns added in v2 migration — may be undefined on older rows
//     ...(data.tier              !== undefined ? { tier:              data.tier }              : {}),
//     ...(data.trust_score       !== undefined ? { trust_score:       data.trust_score }       : {}),
//     ...(data.adapter_type      !== undefined ? { adapter_type:      data.adapter_type }      : {}),
//     ...(data.consecutive_fails !== undefined ? { consecutive_fails: data.consecutive_fails } : {}),
//     ...(data.metadata          !== undefined
//       ? { metadata: data.metadata as ScrapeSourceInsert["metadata"] } : {}),
//   }

//   const { error } = await supabase.from("scrape_sources").upsert(payload)
//   if (error) throw new Error(`upsertScrapeSource: ${error.message}`)
// }

// // =============================================================================
// // SCRAPE QUEUE
// // =============================================================================

// export async function getScrapeQueue(
//   status?: ScrapeQueueItem["status"],
//   limit = 50
// ): Promise<QueueReviewItem[]> {
//   const supabase = await createClient()
//   let query = supabase
//     .from("v_admin_queue_review")
//     .select("*")
//     .order("scraped_at", { ascending: false })
//     .limit(limit)
//   if (status) query = query.eq("status", status)
//   const { data, error } = await query
//   if (error) throw new Error(`getScrapeQueue: ${error.message}`)
//   return (data ?? []) as QueueReviewItem[]
// }

// export async function approveScrapeItem(
//   itemId: string, reviewerId: string, notes?: string
// ): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("scrape_queue")
//     .update({
//       status:         "approved",
//       reviewer_id:    reviewerId,
//       reviewer_notes: notes ?? null,
//       reviewed_at:    new Date().toISOString(),
//     })
//     .eq("id", itemId)
//   if (error) throw new Error(`approveScrapeItem: ${error.message}`)
// }

// export async function rejectScrapeItem(
//   itemId: string, reviewerId: string, notes?: string
// ): Promise<void> {
//   const supabase = await createClient()
//   const { error } = await supabase
//     .from("scrape_queue")
//     .update({
//       status:         "rejected",
//       reviewer_id:    reviewerId,
//       reviewer_notes: notes ?? null,
//       reviewed_at:    new Date().toISOString(),
//     })
//     .eq("id", itemId)
//   if (error) throw new Error(`rejectScrapeItem: ${error.message}`)
// }

// // =============================================================================
// // SCRAPE RUNS
// // =============================================================================

// export async function getScrapeRuns(limit = 20): Promise<ScrapeRun[]> {
//   const supabase = await createClient()
//   const { data, error } = await supabase
//     .from("scrape_runs")
//     .select("id,started_at,finished_at,status,sources_checked,items_found,items_new,items_duplicate,error_log,triggered_by")
//     .order("started_at", { ascending: false })
//     .limit(limit)
//   if (error) throw new Error(`getScrapeRuns: ${error.message}`)
//   return (data ?? []) as ScrapeRun[]
// }

// // =============================================================================
// // ALERT EVENTS
// // =============================================================================

// export async function getPendingAlertEvents(limit = 50): Promise<AlertEvent[]> {
//   const supabase = await createClient()
//   const { data, error } = await supabase
//     .from("alert_events")
//     .select("*")
//     .eq("fanout_status", "pending")
//     .order("priority",   { ascending: true })
//     .order("created_at", { ascending: true })
//     .limit(limit)
//   if (error) throw new Error(`getPendingAlertEvents: ${error.message}`)
//   return (data ?? []) as AlertEvent[]
// }

// export async function fanOutAlertEvent(eventId: string): Promise<number> {
//   const supabase = await createClient()
//   const { data, error } = await supabase.rpc("fn_fanout_alert_event", {
//     p_event_id: eventId,
//   })
//   if (error) throw new Error(`fanOutAlertEvent: ${error.message}`)
//   return (data as number) ?? 0
// }

// export async function fanOutNotificationAlerts(recruitmentId: string): Promise<number> {
//   const supabase = await createClient()
//   const { data: evt, error: evtErr } = await supabase
//     .from("alert_events")
//     .insert({
//       event_type:     "application_open",
//       recruitment_id: recruitmentId,
//       priority:       1,
//       payload:        { manual: true },
//       fanout_status:  "pending",
//     })
//     .select("id")
//     .single()

//   if (evtErr || !evt) {
//     throw new Error(`fanOutNotificationAlerts create event: ${evtErr?.message}`)
//   }
//   return fanOutAlertEvent(evt.id)
// }

// // =============================================================================
// // ADMIN STATS
// // =============================================================================

// export async function getScraperStats(): Promise<ScraperStats> {
//   const supabase = await createClient()
//   const [runsRes, pendingRes, failedRes, healthyRes] = await Promise.all([
//     supabase
//       .from("scrape_runs")
//       .select("id,status,items_new,items_found,started_at,finished_at,sources_checked,items_duplicate,triggered_by,error_log")
//       .order("started_at", { ascending: false })
//       .limit(1),
//     supabase
//       .from("scrape_queue")
//       .select("id", { count: "exact", head: true })
//       .eq("status", "pending"),
//     supabase
//       .from("source_registry")
//       .select("id", { count: "exact", head: true })
//       .eq("is_active", true)
//       .gte("consecutive_fails", 5),
//     supabase
//       .from("source_registry")
//       .select("id", { count: "exact", head: true })
//       .eq("is_active", true)
//       .lt("consecutive_fails", 5),
//   ])

//   return {
//     lastRun:        (runsRes.data?.[0] as unknown as ScrapeRun) ?? null,
//     pendingReview:  pendingRes.count ?? 0,
//     approvedTotal:  0,
//     failedSources:  failedRes.count  ?? 0,
//     healthySources: healthyRes.count ?? 0,
//   }
// }

// export async function getSourceHealthSnapshots(): Promise<SourceHealthSnapshot[]> {
//   const supabase = await createClient()

//   // Two separate queries — source_health_metrics FK points to scrape_sources,
//   // not source_registry, so a direct join is not possible until the FK is
//   // migrated. Fetching separately and merging in-memory is equivalent.
//   const [sourcesRes, metricsRes] = await Promise.all([
//     supabase
//       .from("source_registry")
//       .select("id, source_name, tier, is_active, consecutive_fails, last_scraped_at, last_success_at")
//       .order("tier",        { ascending: true })
//       .order("source_name"),
//     supabase
//       .from("source_health_metrics")
//       .select("source_id, confidence_avg, items_extracted, measured_at")
//       .gte("measured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
//       .order("measured_at", { ascending: false }),
//   ])

//   if (sourcesRes.error) throw new Error(`getSourceHealthSnapshots: ${sourcesRes.error.message}`)

//   type SourceRow = {
//     id:                string
//     source_name:       string
//     tier:              number
//     is_active:         boolean
//     consecutive_fails: number
//     last_scraped_at:   string | null
//     last_success_at:   string | null
//   }

//   type MetricRow = {
//     source_id:       string
//     confidence_avg:  number | null
//     items_extracted: number
//     measured_at:     string
//   }

//   const sources = (sourcesRes.data ?? []) as unknown as SourceRow[]
//   const metrics = (metricsRes.data ?? []) as unknown as MetricRow[]

//   // Group metrics by source_id for O(1) lookup
//   const metricsBySource = new Map<string, MetricRow[]>()
//   for (const m of metrics) {
//     const existing = metricsBySource.get(m.source_id) ?? []
//     existing.push(m)
//     metricsBySource.set(m.source_id, existing)
//   }

//   return sources.map((s: SourceRow): SourceHealthSnapshot => {
//     const recent = metricsBySource.get(s.id) ?? []

//     const avgConf = recent.length
//       ? recent.reduce((sum, m) => sum + (m.confidence_avg ?? 0), 0) / recent.length
//       : null

//     const items7d = recent.reduce((sum, m) => sum + m.items_extracted, 0)

//     return {
//       source_id:         s.id,
//       name:              s.source_name,
//       tier:              s.tier as SourceTier,
//       is_active:         s.is_active,
//       is_healthy:        s.consecutive_fails < 5,
//       last_scraped_at:   s.last_scraped_at,
//       last_success_at:   s.last_success_at,
//       consecutive_fails: s.consecutive_fails,
//       avg_confidence:    avgConf,
//       items_7d:          items7d,
//     }
//   })
// }

// // =============================================================================
// // OPEN RECRUITMENTS  (fallback for free users with no alerts yet)
// // =============================================================================

// export async function getOpenRecruitments(limit = 30) {
//   const supabase = await createClient()
//   const { data, error } = await supabase
//     .from("recruitments")
//     .select("id, name, status, apply_end_date, apply_start_date, notification_date, year, total_vacancies, organizations ( name, type, state )")
//     .in("status", ["open", "upcoming"])
//     .order("apply_end_date", { ascending: true, nullsFirst: false })
//     .limit(limit)
//   if (error) throw new Error(`getOpenRecruitments: ${error.message}`)
//   return data ?? []
// }

// // =============================================================================
// // ELIGIBILITY RECOMPUTE QUEUE
// // =============================================================================

// export async function getPendingRecomputeQueue(limit = 50) {
//   const supabase = await createClient()
//   const { data, error } = await supabase
//     .from("eligibility_recompute_queue")
//     .select("user_id, recruitment_id, reason, queued_at")
//     .eq("status", "pending")
//     .order("queued_at", { ascending: true })
//     .limit(limit)
//   if (error) throw new Error(`getPendingRecomputeQueue: ${error.message}`)
//   return data ?? []
// }

// export async function markRecomputeCompleted(
//   userId: string,
//   recruitmentId: string
// ): Promise<void> {
//   const supabase = await createClient()
//   await supabase
//     .from("eligibility_recompute_queue")
//     .update({ status: "completed", processed_at: new Date().toISOString() })
//     .eq("user_id",        userId)
//     .eq("recruitment_id", recruitmentId)
//     .eq("status",         "pending")
// }

//==========================


/**
 * lib/db/notifications.ts — Phase 2
 *
 * Single module for all notification + scraping DB operations.
 * source_registry is the new master table; scrape_sources is legacy.
 */

import { createClient } from "@/utils/supabase/server"
import type { Database } from "@/types/supabase"
import type {
  NotificationAlert,
  ScrapeRun,
  ScrapeQueueItem,
  ScrapeSource,
  AlertEvent,
  QueueReviewItem,
  ScraperStats,
  SourceHealthSnapshot,
  SourceTier,
  UserNotificationPrefs,
} from "@/types/notifications"

// Re-exports for backward compatibility
export type { NotificationAlert, ScrapeRun, ScrapeQueueItem, ScrapeSource }

// Strongly-typed insert shape from generated types — used in upsertScrapeSource
type ScrapeSourceInsert = Database["public"]["Tables"]["scrape_sources"]["Insert"]

// ─── SourceRegistryEntry ─────────────────────────────────────────────────────

export type SourceRegistryEntry = {
  id:                    string
  source_name:           string
  short_code:            string | null
  source_type:           string
  category:              string
  jurisdiction:          string | null
  state:                 string | null
  official_url:          string
  notification_url:      string | null
  rss_url:               string | null
  api_url:               string | null
  pdf_bulletin_url:      string | null
  adapter_type:          string
  parser_config:         Record<string, unknown>
  scrape_interval_hours: number
  tier:                  number
  trust_score:           number
  anti_bot_risk:         string
  requires_playwright:   boolean
  has_captcha:           boolean
  pdf_only:              boolean
  is_active:             boolean
  is_verified:           boolean
  consecutive_fails:     number
  last_scraped_at:       string | null
  last_success_at:       string | null
  last_error:            string | null
  notes:                 string | null
}

// =============================================================================
// USER NOTIFICATIONS
// =============================================================================

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

  if (opts.offset)    query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
  if (opts.unreadOnly) query = query.eq("is_read", false)

  const { data, error } = await query
  if (error) throw new Error(`getUserNotifications: ${error.message}`)
  return (data ?? []) as NotificationAlert[]
}

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
// SOURCE REGISTRY  (Phase 2 — master table)
// =============================================================================

export async function getSourceRegistry(
  opts: { activeOnly?: boolean; tier?: number; category?: string } = {}
): Promise<SourceRegistryEntry[]> {
  const supabase = await createClient()
  let query = supabase
    .from("source_registry")
    .select("*")
    .order("tier", { ascending: true })
    .order("source_name")

  if (opts.activeOnly) query = query.eq("is_active", true)
  if (opts.tier)       query = query.eq("tier", opts.tier)
  if (opts.category)   query = query.eq("category", opts.category)

  const { data, error } = await query
  if (error) throw new Error(`getSourceRegistry: ${error.message}`)
  return (data ?? []) as SourceRegistryEntry[]
}

export async function toggleSourceRegistry(id: string, active: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("source_registry")
    .update({ is_active: active })
    .eq("id", id)
  if (error) throw new Error(`toggleSourceRegistry: ${error.message}`)
}

/**
 * Upsert a source_registry row.
 *
 * Why the explicit payload shape instead of `{ ...data }`:
 * Supabase's generated Insert type marks `category` as required (NOT NULL,
 * no DB default). Spreading Partial<SourceRegistryEntry> makes it
 * `string | undefined`, which conflicts. Building the payload field-by-field
 * keeps every required column non-optional while still allowing partial updates.
 */
export async function upsertSourceRegistry(
  data: Partial<SourceRegistryEntry> & {
    source_name:  string
    official_url: string
    category:     string
  }
): Promise<void> {
  const supabase = await createClient()

  const payload = {
    ...(data.id               !== undefined ? { id:                data.id }               : {}),
    source_name:               data.source_name,
    official_url:              data.official_url,
    category:                  data.category,
    ...(data.short_code        !== undefined ? { short_code:        data.short_code }        : {}),
    ...(data.source_type       !== undefined ? { source_type:       data.source_type }       : {}),
    ...(data.jurisdiction      !== undefined ? { jurisdiction:      data.jurisdiction }      : {}),
    ...(data.state             !== undefined ? { state:             data.state }             : {}),
    ...(data.notification_url  !== undefined ? { notification_url:  data.notification_url }  : {}),
    ...(data.rss_url           !== undefined ? { rss_url:           data.rss_url }           : {}),
    ...(data.api_url           !== undefined ? { api_url:           data.api_url }           : {}),
    ...(data.pdf_bulletin_url  !== undefined ? { pdf_bulletin_url:  data.pdf_bulletin_url }  : {}),
    ...(data.adapter_type      !== undefined ? { adapter_type:      data.adapter_type }      : {}),
    ...(data.scrape_interval_hours !== undefined
      ? { scrape_interval_hours: data.scrape_interval_hours } : {}),
    ...(data.tier              !== undefined ? { tier:              data.tier }              : {}),
    ...(data.trust_score       !== undefined ? { trust_score:       data.trust_score }       : {}),
    ...(data.anti_bot_risk     !== undefined ? { anti_bot_risk:     data.anti_bot_risk }     : {}),
    ...(data.requires_playwright !== undefined
      ? { requires_playwright: data.requires_playwright } : {}),
    ...(data.has_captcha       !== undefined ? { has_captcha:       data.has_captcha }       : {}),
    ...(data.pdf_only          !== undefined ? { pdf_only:          data.pdf_only }          : {}),
    ...(data.is_active         !== undefined ? { is_active:         data.is_active }         : {}),
    ...(data.is_verified       !== undefined ? { is_verified:       data.is_verified }       : {}),
    ...(data.notes             !== undefined ? { notes:             data.notes }             : {}),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("source_registry").upsert(payload)
  if (error) throw new Error(`upsertSourceRegistry: ${error.message}`)
}

export async function resetSourceFails(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("source_registry")
    .update({ consecutive_fails: 0, last_error: null, is_active: true })
    .eq("id", id)
  if (error) throw new Error(`resetSourceFails: ${error.message}`)
}

// =============================================================================
// LEGACY: SCRAPE SOURCES  (kept for backward compat — phase out after Phase 3)
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

/**
 * Upsert a scrape_sources row.
 *
 * Why ScrapeSourceInsert instead of spreading Partial<ScrapeSource>:
 * ScrapeSource.metadata is typed as Record<string,unknown> in our domain type,
 * but the generated DB Insert type expects Json (a recursive type). Spreading
 * Partial<ScrapeSource> directly causes an overload mismatch. Using the
 * generated ScrapeSourceInsert type and casting the two jsonb columns resolves
 * this without needing `as any`.
 */
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
    // Cast jsonb fields — Record<string,unknown> satisfies Json at runtime;
    // the explicit cast is required to satisfy the generated type.
    selector_config: (data.selector_config ?? {}) as ScrapeSourceInsert["selector_config"],
    // Legacy columns added in v2 migration — may be undefined on older rows
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

// =============================================================================
// SCRAPE QUEUE
// =============================================================================

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
  return (data ?? []) as ScrapeRun[]
}

// =============================================================================
// ALERT EVENTS
// =============================================================================

export async function getPendingAlertEvents(limit = 50): Promise<AlertEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("alert_events")
    .select("*")
    .eq("fanout_status", "pending")
    .order("priority",   { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(`getPendingAlertEvents: ${error.message}`)
  return (data ?? []) as AlertEvent[]
}

export async function fanOutAlertEvent(eventId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_fanout_alert_event", {
    p_event_id: eventId,
  })
  if (error) throw new Error(`fanOutAlertEvent: ${error.message}`)
  return (data as number) ?? 0
}

export async function fanOutNotificationAlerts(recruitmentId: string): Promise<number> {
  const supabase = await createClient()
  const { data: evt, error: evtErr } = await supabase
    .from("alert_events")
    .insert({
      event_type:     "application_open",
      recruitment_id: recruitmentId,
      priority:       1,
      payload:        { manual: true },
      fanout_status:  "pending",
    })
    .select("id")
    .single()

  if (evtErr || !evt) {
    throw new Error(`fanOutNotificationAlerts create event: ${evtErr?.message}`)
  }
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
      .from("source_registry")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("consecutive_fails", 5),
    supabase
      .from("source_registry")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lt("consecutive_fails", 5),
  ])

  return {
    lastRun:        (runsRes.data?.[0] as unknown as ScrapeRun) ?? null,
    pendingReview:  pendingRes.count ?? 0,
    approvedTotal:  0,
    failedSources:  failedRes.count  ?? 0,
    healthySources: healthyRes.count ?? 0,
  }
}

export async function getSourceHealthSnapshots(): Promise<SourceHealthSnapshot[]> {
  const supabase = await createClient()

  // Two separate queries — source_health_metrics FK points to scrape_sources,
  // not source_registry, so a direct join is not possible until the FK is
  // migrated. Fetching separately and merging in-memory is equivalent.
  const [sourcesRes, metricsRes] = await Promise.all([
    supabase
      .from("source_registry")
      .select("id, source_name, tier, is_active, consecutive_fails, last_scraped_at, last_success_at")
      .order("tier",        { ascending: true })
      .order("source_name"),
    supabase
      .from("source_health_metrics")
      .select("source_id, confidence_avg, items_extracted, measured_at")
      .gte("measured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
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
    source_id:       string
    confidence_avg:  number | null
    items_extracted: number
    measured_at:     string
  }

  const sources = (sourcesRes.data ?? []) as unknown as SourceRow[]
  const metrics = (metricsRes.data ?? []) as unknown as MetricRow[]

  // Group metrics by source_id for O(1) lookup
  const metricsBySource = new Map<string, MetricRow[]>()
  for (const m of metrics) {
    const existing = metricsBySource.get(m.source_id) ?? []
    existing.push(m)
    metricsBySource.set(m.source_id, existing)
  }

  return sources.map((s: SourceRow): SourceHealthSnapshot => {
    const recent = metricsBySource.get(s.id) ?? []

    const avgConf = recent.length
      ? recent.reduce((sum, m) => sum + (m.confidence_avg ?? 0), 0) / recent.length
      : null

    const items7d = recent.reduce((sum, m) => sum + m.items_extracted, 0)

    return {
      source_id:         s.id,
      name:              s.source_name,
      tier:              s.tier as SourceTier,
      is_active:         s.is_active,
      is_healthy:        s.consecutive_fails < 5,
      last_scraped_at:   s.last_scraped_at,
      last_success_at:   s.last_success_at,
      consecutive_fails: s.consecutive_fails,
      avg_confidence:    avgConf,
      items_7d:          items7d,
    }
  })
}

// =============================================================================
// OPEN RECRUITMENTS  (fallback for free users with no alerts yet)
// =============================================================================

export async function getOpenRecruitments(limit = 30) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recruitments")
    .select("id, name, status, apply_end_date, apply_start_date, notification_date, year, total_vacancies, organizations ( name, type, state )")
    .in("status", ["open", "upcoming"])
    .order("apply_end_date", { ascending: true, nullsFirst: false })
    .limit(limit)
  if (error) throw new Error(`getOpenRecruitments: ${error.message}`)
  return data ?? []
}

// =============================================================================
// ELIGIBILITY RECOMPUTE QUEUE
// =============================================================================

export async function getPendingRecomputeQueue(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("eligibility_recompute_queue")
    .select("user_id, recruitment_id, reason, queued_at")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(`getPendingRecomputeQueue: ${error.message}`)
  return data ?? []
}

export async function markRecomputeCompleted(
  userId: string,
  recruitmentId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("eligibility_recompute_queue")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("user_id",        userId)
    .eq("recruitment_id", recruitmentId)
    .eq("status",         "pending")
}