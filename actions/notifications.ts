// /**
//  * actions/notifications.ts
//  * Career Copilot — Notification Engine v2
//  *
//  * REPLACES: actions/notifications.ts + actions/scraping.ts (merged)
//  *
//  * All server actions for notifications + scraping in one file.
//  * Business logic stays in lib/db/notifications.ts.
//  * Actions are thin orchestrators: auth guard → lib call → revalidate.
//  */

// "use server"

// import { redirect }      from "next/navigation"
// import { revalidatePath } from "next/cache"
// import { createClient }  from "@/utils/supabase/server"
// import {
//   markAlertRead,
//   markAllAlertsRead,
//   approveScrapeItem,
//   rejectScrapeItem,
//   toggleScrapeSource,
//   upsertScrapeSource,
//   fanOutNotificationAlerts,
//   upsertUserNotifPrefs,
//   trackRecruitment,
//   untrackRecruitment,
// } from "@/lib/db/notifications"
// import type { ScrapeSource, UserNotificationPrefs } from "@/types/notifications"

// // =============================================================================
// // AUTH GUARDS
// // =============================================================================

// async function requireUser() {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) redirect("/auth/login")
//   return user
// }

// async function requireAdmin() {
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) redirect("/auth/login")
//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("is_admin")
//     .eq("id", user.id)
//     .single()
//   if (!profile?.is_admin) redirect("/dashboard")
//   return user
// }

// // =============================================================================
// // USER ACTIONS
// // =============================================================================

// /** Mark a single notification as read. */
// export async function markNotificationRead(alertId: string): Promise<void> {
//   const user = await requireUser()
//   await markAlertRead(alertId, user.id)
//   revalidatePath("/dashboard")
//   revalidatePath("/dashboard/notifications")
// }

// /** Mark all notifications as read. */
// export async function markAllNotificationsRead(): Promise<void> {
//   const user = await requireUser()
//   await markAllAlertsRead(user.id)
//   revalidatePath("/dashboard")
//   revalidatePath("/dashboard/notifications")
// }

// /** Save user notification preferences. */
// export async function saveNotificationPrefs(
//   prefs: Partial<Omit<UserNotificationPrefs, "user_id">>
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     const user = await requireUser()
//     await upsertUserNotifPrefs(user.id, prefs)
//     revalidatePath("/dashboard/settings")
//     return { success: true }
//   } catch (err) {
//     return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
//   }
// }

// /** Track a recruitment (pin to user's watchlist). */
// export async function trackRecruitmentAction(recruitmentId: string): Promise<void> {
//   const user = await requireUser()
//   await trackRecruitment(user.id, recruitmentId)
//   revalidatePath("/dashboard")
//   revalidatePath(`/dashboard/recruitments/${recruitmentId}`)
// }

// /** Remove a tracked recruitment. */
// export async function untrackRecruitmentAction(recruitmentId: string): Promise<void> {
//   const user = await requireUser()
//   await untrackRecruitment(user.id, recruitmentId)
//   revalidatePath("/dashboard")
//   revalidatePath(`/dashboard/recruitments/${recruitmentId}`)
// }

// // =============================================================================
// // ADMIN — SCRAPE QUEUE
// // =============================================================================

// /** Approve a scrape_queue item → triggers DB promotion → alert event → fanout. */
// export async function adminApproveQueueItem(formData: FormData) {
//   const admin  = await requireAdmin()
//   const itemId = formData.get("item_id") as string
//   const notes  = (formData.get("notes") as string) || undefined

//   if (!itemId) redirect("/admin/scrape?error=Missing+item_id")

//   try {
//     await approveScrapeItem(itemId, admin.id, notes)
//     revalidatePath("/admin/scrape")
//     revalidatePath("/admin/recruitments")
//   } catch (err) {
//     const msg = err instanceof Error ? err.message : "Unknown error"
//     redirect(`/admin/scrape?error=${encodeURIComponent(msg)}`)
//   }
// }

// /** Reject a pending queue item. */
// export async function adminRejectQueueItem(formData: FormData) {
//   const admin  = await requireAdmin()
//   const itemId = formData.get("item_id") as string
//   const notes  = (formData.get("notes") as string) || undefined

//   if (!itemId) redirect("/admin/scrape?error=Missing+item_id")

//   try {
//     await rejectScrapeItem(itemId, admin.id, notes)
//     revalidatePath("/admin/scrape")
//   } catch (err) {
//     const msg = err instanceof Error ? err.message : "Unknown error"
//     redirect(`/admin/scrape?error=${encodeURIComponent(msg)}`)
//   }
// }

// /** Bulk queue review from a form. */
// export async function adminBulkReviewAction(formData: FormData) {
//   const admin  = await requireAdmin()
//   const itemId = formData.get("item_id") as string
//   const action = formData.get("action") as "approve" | "reject"
//   const notes  = (formData.get("notes") as string) || undefined

//   if (action === "approve") {
//     await approveScrapeItem(itemId, admin.id, notes)
//   } else {
//     await rejectScrapeItem(itemId, admin.id, notes)
//   }
//   revalidatePath("/admin/scrape")
// }

// // =============================================================================
// // ADMIN — SOURCES
// // =============================================================================

// /** Toggle a source active/inactive. */
// export async function adminToggleScrapeSource(formData: FormData) {
//   await requireAdmin()
//   const id     = formData.get("source_id") as string
//   const active = formData.get("active") === "true"

//   try {
//     await toggleScrapeSource(id, active)
//     revalidatePath("/admin/scrape")
//   } catch (err) {
//     const msg = err instanceof Error ? err.message : "Unknown error"
//     redirect(`/admin/scrape?error=${encodeURIComponent(msg)}`)
//   }
// }

// /** Add or edit a scrape source. */
// export async function adminSaveScrapingSource(formData: FormData) {
//   await requireAdmin()
//   const id = (formData.get("id") as string) || undefined

//   await upsertScrapeSource({
//     ...(id ? { id } : {}),
//     name:                  formData.get("name") as string,
//     base_url:              formData.get("base_url") as string,
//     notification_path:     (formData.get("notification_path") as string) || null,
//     org_type:              formData.get("org_type") as string,
//     state:                 (formData.get("state") as string) || null,
//     tier:                  Number(formData.get("tier") || 2) as 1 | 2 | 3,
//     adapter_type:          (formData.get("adapter_type") as string) || "html",
//     scrape_interval_hours: Number(formData.get("scrape_interval_hours")) || 24,
//     is_active:             formData.get("is_active") === "true",
//   } as Partial<ScrapeSource> & { name: string; base_url: string })

//   revalidatePath("/admin/scrape")
// }

// // =============================================================================
// // ADMIN — NOTIFICATIONS FAN-OUT
// // =============================================================================

// /** Manually fan-out notifications for a specific recruitment. */
// export async function adminFanOutNotifications(formData: FormData): Promise<{
//   success: boolean
//   count?: number
//   error?: string
// }> {
//   await requireAdmin()
//   const recruitmentId = formData.get("recruitment_id") as string

//   try {
//     const count = await fanOutNotificationAlerts(recruitmentId)
//     revalidatePath("/admin/recruitments")
//     revalidatePath(`/admin/recruitments/${recruitmentId}`)
//     revalidatePath("/dashboard")
//     return { success: true, count }
//   } catch (err) {
//     return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
//   }
// }

// // =============================================================================
// // ADMIN — TRIGGER SCRAPER
// // =============================================================================

// /**
//  * Trigger the scheduled scraper Edge Function manually.
//  * Returns run stats or error.
//  */
// export async function adminTriggerScraper(): Promise<{
//   success: boolean
//   message: string
//   runId?: string
//   itemsNew?: number
//   itemsFound?: number
// }> {
//   await requireAdmin()

//   const edgeFnUrl  = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scheduled-scraper`
//   const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

//   if (!serviceKey) {
//     return { success: false, message: "SUPABASE_SERVICE_ROLE_KEY not configured" }
//   }

//   try {
//     const res = await fetch(edgeFnUrl, {
//       method:  "POST",
//       headers: {
//         "Content-Type":  "application/json",
//         "Authorization": `Bearer ${serviceKey}`,
//       },
//       body:   JSON.stringify({ triggered_by: "admin" }),
//       signal: AbortSignal.timeout(90_000),
//     })

//     if (!res.ok) {
//       const body = await res.text()
//       return { success: false, message: `Edge Function ${res.status}: ${body}` }
//     }

//     const json = await res.json() as {
//       runId?: string
//       totalNew?: number
//       totalFound?: number
//     }

//     revalidatePath("/admin/scrape")
//     revalidatePath("/dashboard")

//     return {
//       success:    true,
//       message:    `Scraper completed. ${json.totalNew ?? 0} new, ${json.totalFound ?? 0} found.`,
//       runId:      json.runId,
//       itemsNew:   json.totalNew,
//       itemsFound: json.totalFound,
//     }
//   } catch (err) {
//     const msg = err instanceof Error ? err.message : "Unknown error"
//     return { success: false, message: msg }
//   }
// }

// /**
//  * Trigger the deadline sweep Edge Function manually.
//  */
// export async function adminTriggerDeadlineSweep(): Promise<{
//   success: boolean
//   message: string
//   eventsCreated?: number
// }> {
//   await requireAdmin()

//   const edgeFnUrl  = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deadline-sweep`
//   const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

//   if (!serviceKey) {
//     return { success: false, message: "SUPABASE_SERVICE_ROLE_KEY not configured" }
//   }

//   try {
//     const res = await fetch(edgeFnUrl, {
//       method:  "POST",
//       headers: {
//         "Content-Type":  "application/json",
//         "Authorization": `Bearer ${serviceKey}`,
//       },
//       signal: AbortSignal.timeout(30_000),
//     })

//     if (!res.ok) {
//       return { success: false, message: `Edge Function ${res.status}` }
//     }

//     const json = await res.json() as { eventsCreated?: number }
//     revalidatePath("/dashboard")
//     return {
//       success:       true,
//       message:       `Deadline sweep done. ${json.eventsCreated ?? 0} events created.`,
//       eventsCreated: json.eventsCreated,
//     }
//   } catch (err) {
//     return { success: false, message: err instanceof Error ? err.message : "Unknown" }
//   }
// }

//======================================================

"use server"

/**
 * actions/notifications.ts — Phase 2 update
 * Adds: adminResetSourceFails, adminToggleSourceRegistry, adminSaveSourceRegistry
 */

import { redirect }      from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient }  from "@/utils/supabase/server"
import {
  markAlertRead,
  markAllAlertsRead,
  approveScrapeItem,
  rejectScrapeItem,
  toggleScrapeSource,
  toggleSourceRegistry,
  upsertSourceRegistry,
  resetSourceFails,
  fanOutNotificationAlerts,
  upsertUserNotifPrefs,
  trackRecruitment,
  untrackRecruitment,
} from "@/lib/db/notifications"
import type { UserNotificationPrefs } from "@/types/notifications"

// ─── Auth guards ──────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return user
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/dashboard")
  return user
}

// =============================================================================
// USER ACTIONS
// =============================================================================

export async function markNotificationRead(alertId: string): Promise<void> {
  const user = await requireUser()
  await markAlertRead(alertId, user.id)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/notifications")
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser()
  await markAllAlertsRead(user.id)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/notifications")
}

export async function saveNotificationPrefs(
  prefs: Partial<Omit<UserNotificationPrefs, "user_id">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser()
    await upsertUserNotifPrefs(user.id, prefs)
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function trackRecruitmentAction(recruitmentId: string): Promise<void> {
  const user = await requireUser()
  await trackRecruitment(user.id, recruitmentId)
  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/recruitments/${recruitmentId}`)
}

export async function untrackRecruitmentAction(recruitmentId: string): Promise<void> {
  const user = await requireUser()
  await untrackRecruitment(user.id, recruitmentId)
  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/recruitments/${recruitmentId}`)
}

// =============================================================================
// ADMIN — SCRAPE QUEUE
// =============================================================================

export async function adminApproveQueueItem(formData: FormData) {
  const admin  = await requireAdmin()
  const itemId = formData.get("item_id") as string
  const notes  = (formData.get("notes") as string) || undefined
  if (!itemId) redirect("/admin/scrape?error=Missing+item_id")
  try {
    await approveScrapeItem(itemId, admin.id, notes)
    revalidatePath("/admin/scrape")
    revalidatePath("/admin/recruitments")
  } catch (err) {
    redirect(`/admin/scrape?error=${encodeURIComponent(err instanceof Error ? err.message : "Error")}`)
  }
}

export async function adminRejectQueueItem(formData: FormData) {
  const admin  = await requireAdmin()
  const itemId = formData.get("item_id") as string
  const notes  = (formData.get("notes") as string) || undefined
  if (!itemId) redirect("/admin/scrape?error=Missing+item_id")
  try {
    await rejectScrapeItem(itemId, admin.id, notes)
    revalidatePath("/admin/scrape")
  } catch (err) {
    redirect(`/admin/scrape?error=${encodeURIComponent(err instanceof Error ? err.message : "Error")}`)
  }
}

// =============================================================================
// ADMIN — LEGACY SCRAPE SOURCES
// =============================================================================

export async function adminToggleScrapeSource(formData: FormData) {
  await requireAdmin()
  const id     = formData.get("source_id") as string
  const active = formData.get("active") === "true"
  try {
    // Try source_registry first, fall back to scrape_sources
    await toggleSourceRegistry(id, active).catch(() => toggleScrapeSource(id, active))
    revalidatePath("/admin/scrape")
  } catch (err) {
    redirect(`/admin/scrape?error=${encodeURIComponent(err instanceof Error ? err.message : "Error")}`)
  }
}

// =============================================================================
// ADMIN — SOURCE REGISTRY (Phase 2)
// =============================================================================

/** Reset consecutive_fails for a source and re-enable it. */
export async function adminResetSourceFails(sourceId: string): Promise<void> {
  await requireAdmin()
  await resetSourceFails(sourceId)
  revalidatePath("/admin/scrape")
}

/** Toggle a source_registry entry active/inactive. */
export async function adminToggleSourceRegistry(sourceId: string, active: boolean): Promise<void> {
  await requireAdmin()
  await toggleSourceRegistry(sourceId, active)
  revalidatePath("/admin/scrape")
}

/** Add or update a source in source_registry. */
export async function adminSaveSourceRegistry(formData: FormData) {
  await requireAdmin()
  const id = (formData.get("id") as string) || undefined
  await upsertSourceRegistry({
    ...(id ? { id } : {}),
    source_name:           formData.get("source_name") as string,
    official_url:          formData.get("official_url") as string,
    notification_url:      (formData.get("notification_url") as string) || null,
    rss_url:               (formData.get("rss_url") as string) || null,
    api_url:               (formData.get("api_url") as string) || null,
    category:              formData.get("category") as string,
    source_type:           (formData.get("source_type") as string) || "official_central",
    adapter_type:          (formData.get("adapter_type") as string) || "html",
    tier:                  Number(formData.get("tier") || 2),
    trust_score:           Number(formData.get("trust_score") || 0.70),
    scrape_interval_hours: Number(formData.get("scrape_interval_hours") || 24),
    is_active:             formData.get("is_active") === "true",
  })
  revalidatePath("/admin/scrape")
}

// =============================================================================
// ADMIN — NOTIFICATIONS FAN-OUT
// =============================================================================

export async function adminFanOutNotifications(formData: FormData): Promise<{
  success: boolean; count?: number; error?: string
}> {
  await requireAdmin()
  const recruitmentId = formData.get("recruitment_id") as string
  try {
    const count = await fanOutNotificationAlerts(recruitmentId)
    revalidatePath("/admin/recruitments")
    revalidatePath(`/admin/recruitments/${recruitmentId}`)
    revalidatePath("/dashboard")
    return { success: true, count }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// =============================================================================
// ADMIN — TRIGGER FUNCTIONS
// =============================================================================

export async function adminTriggerScraper(): Promise<{
  success: boolean; message: string; runId?: string; itemsNew?: number; itemsFound?: number
}> {
  await requireAdmin()
  const edgeFnUrl  = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scheduled-scraper`
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { success: false, message: "SUPABASE_SERVICE_ROLE_KEY not configured" }

  try {
    const res = await fetch(edgeFnUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body:    JSON.stringify({ triggered_by: "admin" }),
      signal:  AbortSignal.timeout(90_000),
    })
    if (!res.ok) {
      const body = await res.text()
      return { success: false, message: `Edge Function ${res.status}: ${body}` }
    }
    const json = await res.json() as { runId?: string; totalNew?: number; totalFound?: number }
    revalidatePath("/admin/scrape")
    revalidatePath("/dashboard")
    return {
      success: true,
      message: `Scraper done. ${json.totalNew ?? 0} new, ${json.totalFound ?? 0} found.`,
      runId:      json.runId,
      itemsNew:   json.totalNew,
      itemsFound: json.totalFound,
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function adminTriggerDeadlineSweep(): Promise<{
  success: boolean; message: string; eventsCreated?: number
}> {
  await requireAdmin()
  const edgeFnUrl  = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deadline-sweep`
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { success: false, message: "SUPABASE_SERVICE_ROLE_KEY not configured" }

  try {
    const res = await fetch(edgeFnUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      signal:  AbortSignal.timeout(30_000),
    })
    if (!res.ok) return { success: false, message: `Edge Function ${res.status}` }
    const json = await res.json() as { eventsCreated?: number }
    revalidatePath("/dashboard")
    return { success: true, message: `Sweep done. ${json.eventsCreated ?? 0} events created.`, eventsCreated: json.eventsCreated }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Unknown" }
  }
}