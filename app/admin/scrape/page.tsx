/**
 * app/admin/scrape/page.tsx
 * Career Copilot — Admin Scrape Dashboard v2
 *
 * Displays:
 *  - Live run stats + trigger controls
 *  - Source health grid (Tier 1/2/3 with health indicators)
 *  - Queue review table (pending items needing admin approval)
 *  - Recent runs log
 */

import { redirect }       from "next/navigation"
import { createClient }   from "@/utils/supabase/server"
import {
  getScrapeRuns,
  getScrapeQueue,
  getScrapeSources,
  getScraperStats,
  getSourceHealthSnapshots,
} from "@/lib/db/notifications"
import { AdminScrapeDashboard } from "@/components/admin/AdminScrapeDashboard"

export const dynamic  = "force-dynamic"
export const metadata = { title: "Scrape Dashboard — Admin" }

export default async function AdminScrapePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) redirect("/dashboard")

  const params = await searchParams

  const [stats, runs, pendingQueue, sources, sourceHealth] = await Promise.all([
    getScraperStats(),
    getScrapeRuns(10),
    getScrapeQueue("pending", 30),
    getScrapeSources(false),
    getSourceHealthSnapshots(),
  ])

  return (
    <AdminScrapeDashboard
      stats={stats}
      recentRuns={runs}
      pendingQueue={pendingQueue}
      sources={sources}
      sourceHealth={sourceHealth}
      errorMessage={params.error}
      activeTab={params.tab ?? "queue"}
    />
  )
}