/**
 * app/dashboard/notifications/page.tsx
 * Career Copilot — All Notifications Page
 *
 * FIXES (from Technical Report Phase A):
 *  - Removed force-dynamic, replaced with revalidate = 30
 *    "Eliminates full Supabase round-trip on repeat loads for most users"
 *    Notifications don't change more frequently than every 30s for a given user.
 *    Real-time mark-as-read still works via server actions (mutations bypass cache).
 *  - Uses getUserNotifications() from lib/db/notifications (Phase 2 data layer)
 *    instead of legacy getUserAlerts() from lib/scraping/alerts (Phase 10 artifact)
 *  - Auth + data fetch done cleanly without legacy delete-scraping imports
 */

import Link          from "next/link"
import { redirect }  from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getUserNotifications } from "@/lib/db/notifications"
import type { NotificationAlert } from "@/types/notifications"
import { markAllNotificationsRead } from "@/actions/notifications"

// Phase 2 report recommendation: revalidate=30 instead of force-dynamic
// Saves 1 full Supabase RTT (~1.3s from India) on every repeat page load
export const revalidate = 30
export const metadata = { title: "Notifications — Career Copilot" }

const ALERT_ICONS: Record<string, string> = {
  new_recruitment:      "🆕",
  application_open:     "📋",
  deadline_approaching: "⏰",
  deadline_changed:     "📅",
  vacancy_changed:      "👥",
  status_changed:       "🔄",
  admit_card_released:  "🎫",
  result_released:      "📊",
  new_match:            "🎯",
  deadline_3day:        "⏰",
  deadline_1day:        "🔴",
  status_change:        "📋",
}

const ALERT_LABELS: Record<string, string> = {
  new_recruitment:      "New recruitment",
  application_open:     "Applications open",
  deadline_approaching: "Deadline approaching",
  deadline_changed:     "Deadline changed",
  vacancy_changed:      "Vacancies updated",
  status_changed:       "Status changed",
  admit_card_released:  "Admit card released",
  result_released:      "Result released",
  new_match:            "New exam match",
  deadline_3day:        "Deadline in 3 days",
  deadline_1day:        "Last day to apply",
  status_change:        "Status changed",
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return "Just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  // Auth — sequential (must confirm user before fetching their data)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Single data fetch — no parallel needed here (one query)
  const alerts = await getUserNotifications(user.id, { limit: 50 })
  const unread  = alerts.filter(a => !a.is_read)

  return (
    <div className="min-h-screen bg-[#0f0f0f]">

      {/* Header */}
      <div className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard"
              className="text-white/30 text-sm hover:text-white/60 transition-colors">
              ← Dashboard
            </Link>
            <span className="text-white/10">/</span>
            <span className="text-white/60 text-sm font-medium">Notifications</span>
          </div>
          {unread.length > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit"
                className="text-white/30 text-xs hover:text-white/60 transition-colors">
                Mark all read
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl text-white font-medium mb-1">Notifications</h1>
          <p className="text-white/35 text-sm">
            {unread.length > 0
              ? `${unread.length} unread · ${alerts.length} total`
              : `${alerts.length} notifications · all read`}
          </p>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
            <p className="text-3xl mb-3 opacity-20">🔔</p>
            <p className="text-white/40 text-sm mb-1">No notifications yet</p>
            <p className="text-white/20 text-xs">
              Complete your profile to start receiving exam match notifications.
            </p>
            <Link href="/onboarding"
              className="inline-block mt-4 px-4 py-2 rounded-xl text-sm"
              style={{ background: "rgba(232,213,163,0.12)", color: "#e8d5a3", border: "1px solid rgba(232,213,163,0.25)" }}>
              Complete profile →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert: NotificationAlert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 px-4 py-4 rounded-xl transition-colors"
                style={{
                  background: alert.is_read
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(232,213,163,0.04)",
                  border:     `1px solid ${alert.is_read ? "rgba(255,255,255,0.06)" : "rgba(232,213,163,0.15)"}`,
                }}>

                {/* Icon */}
                <span className="text-xl shrink-0 mt-0.5">
                  {ALERT_ICONS[alert.alert_type] ?? "🔔"}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{ color: "rgba(232,213,163,0.70)", background: "rgba(232,213,163,0.08)" }}>
                      {ALERT_LABELS[alert.alert_type] ?? alert.alert_type}
                    </span>
                    {!alert.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8d5a3] shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-white/85 truncate">
                    {alert.recruitment_name ?? "Recruitment notification"}
                  </p>
                  {alert.org_name && (
                    <p className="text-xs text-white/40 mt-0.5">
                      {alert.org_name}
                      {alert.apply_end_date && (
                        <span className="ml-2 text-white/30">
                          · Apply by {new Date(alert.apply_end_date!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Time */}
                <span className="text-xs text-white/25 shrink-0 mt-0.5">
                  {timeAgo(alert.sent_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}