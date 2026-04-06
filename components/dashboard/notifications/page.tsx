// app/dashboard/notifications/page.tsx
// Career Copilot — Phase 10: All notifications page

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getUserAlerts } from "@/lib/scraping/alerts"
import { markMyAlertsRead } from "@/actions/delete-scraping"
import { NotificationAlert } from "@/types/delete-scraping"
import { format, formatDistanceToNow } from "date-fns"

export const metadata = { title: "Notifications — Career Copilot" }

const ALERT_ICONS: Record<string, string> = {
  new_match:     "🎯",
  deadline_3day: "⏰",
  deadline_1day: "🔴",
  status_change: "📋",
}

const ALERT_LABELS: Record<string, string> = {
  new_match:     "New exam match",
  deadline_3day: "Deadline in 3 days",
  deadline_1day: "Last day to apply",
  status_change: "Status changed",
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const alerts = await getUserAlerts(user.id, false, 50)
  const unread = alerts.filter(a => !a.is_read)

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/30 text-sm hover:text-white/60 transition-colors">← Dashboard</Link>
            <span className="text-white/10">/</span>
            <span className="text-white/60 text-sm font-medium">Notifications</span>
          </div>
          {unread.length > 0 && (
            <form action={markMyAlertsRead}>
              <button type="submit" className="text-white/30 text-xs hover:text-white/60 transition-colors">
                Mark all read
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-white font-medium mb-1">Notifications</h1>
            <p className="text-white/35 text-sm">
              {unread.length > 0
                ? `${unread.length} unread · ${alerts.length} total`
                : `${alerts.length} notifications · all read`}
            </p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-white/40 text-sm mb-2">No notifications yet</p>
            <p className="text-white/25 text-xs leading-relaxed max-w-xs mx-auto">
              When new exams matching your profile appear, or deadlines approach, you'll see alerts here.
            </p>
            <Link href="/dashboard/study-plan/new" className="inline-block mt-5 text-[#e8d5a3]/60 text-sm hover:text-[#e8d5a3] transition-colors">
              Set up your profile to get matched →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
            {alerts.map(alert => {
              const rec = alert.recruitment as any
              const deadline = rec?.apply_end_date
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 px-6 py-4 ${!alert.is_read ? "bg-[#e8d5a3]/[0.025]" : ""}`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{ALERT_ICONS[alert.alert_type] ?? "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white/60 text-sm font-medium">{ALERT_LABELS[alert.alert_type]}</p>
                      {!alert.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e8d5a3] shrink-0" />
                      )}
                    </div>
                    <p className="text-white/50 text-sm mb-1">
                      <span className="font-medium text-white/65">{rec?.name}</span>
                      {rec?.organization?.name && (
                        <span className="text-white/30"> — {rec.organization.name}</span>
                      )}
                    </p>
                    {deadline && (
                      <p className={`text-xs mb-2 ${
                        alert.alert_type === "deadline_1day" ? "text-red-400/70"
                        : alert.alert_type === "deadline_3day" ? "text-amber-400/70"
                        : "text-white/25"
                      }`}>
                        Apply by: {format(new Date(deadline), "dd MMM yyyy")}
                      </p>
                    )}
                    <p className="text-white/20 text-xs">
                      {formatDistanceToNow(new Date(alert.sent_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href="/dashboard"
                      className="text-[#e8d5a3]/40 text-xs hover:text-[#e8d5a3] transition-colors"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}