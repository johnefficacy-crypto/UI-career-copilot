import { redirect }         from "next/navigation"
import Link                  from "next/link"
import { createClient }      from "@/utils/supabase/server"
import { getUserNotifications, getUnreadCount } from "@/lib/db/notifications"
import { NotificationsFeed } from "@/components/notifications/NotificationsFeed"

export const metadata = { title: "Notifications — Career Copilot" }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, full_name")
    .eq("id", user.id)
    .single()

  const planId = profile?.plan_id ?? "free"

  // Pro/Elite get all 200; Free gets 50 (the feed limits to 5 anyway)
  const limit   = planId === "free" ? 50 : 200
  const [alerts, unreadCount] = await Promise.all([
    getUserNotifications(user.id, { limit }),
    getUnreadCount(user.id),
  ])

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-root)" }}>
      {/* Simple inline nav */}
      <nav
        className="border-b h-14 flex items-center px-6 gap-4"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/dashboard"
          className="text-lg font-medium"
          style={{ fontFamily: "var(--font-serif)", color: "var(--gold)" }}
        >
          Career Copilot
        </Link>
        <span style={{ color: "var(--border-md)" }}>/</span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Notifications</span>
        <Link
          href="/dashboard"
          className="ml-auto text-sm"
          style={{ color: "var(--text-ghost)" }}
        >
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1
            className="text-2xl font-medium text-white mb-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Your notifications
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>

        <NotificationsFeed
          alerts={alerts}
          unreadCount={unreadCount}
          planId={planId}
        />
      </main>
    </div>
  )
}