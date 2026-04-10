/**
 * app/admin/scrape/page.tsx
 * Career Copilot — Admin Scrape Dashboard
 *
 * CLEAN REWRITE:
 *  - No dead commented-out code
 *  - Source registry fetched via dbGetActiveSources() from data layer
 *  - All 5 data fetches run in parallel with Promise.all
 *  - Auth guard runs first (single DB call), then parallel fetches
 *  - searchParams correctly typed and awaited (Next.js 15 async pattern)
 */

import { redirect }        from "next/navigation"
import { createClient }    from "@/utils/supabase/server"
import { dbGetActiveSources } from "@/lib/db/source-registry"
import {
  getScrapeRuns,
  getScrapeQueue,
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

  // Auth guard — must be first, runs a single DB call
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) redirect("/dashboard")

  // All data fetches in parallel — shaves off ~2-3s vs sequential awaits
  const [params, stats, recentRuns, pendingQueue, sourceHealth, sourceRegistry] =
    await Promise.all([
      searchParams,
      getScraperStats(),
      getScrapeRuns(10),
      getScrapeQueue("pending", 30),
      getSourceHealthSnapshots(),
      dbGetActiveSources(),   // ← uses data layer, not raw Supabase query
    ])

  return (
    <AdminScrapeDashboard
      stats={stats}
      recentRuns={recentRuns}
      pendingQueue={pendingQueue}
      sourceHealth={sourceHealth}
      sourceRegistry={sourceRegistry}
      errorMessage={params.error}
      activeTab={params.tab ?? "queue"}
    />
  )
}