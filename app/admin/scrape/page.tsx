// /**
//  * app/admin/scrape/page.tsx
//  * Career Copilot — Admin Scrape Dashboard
//  *
//  * Implements all fixes from technical reports:
//  *  1. Dynamic import with ssr:false — prevents AdminScrapeDashboard from
//  *     being bundled into dashboard/notifications chunk (Phase 2 Error 11)
//  *  2. Promise.all for all data fetches — eliminates sequential await latency
//  *     (Technical Report 3.1 — was causing 13s load time)
//  *  3. dbGetActiveSources() from data layer — no raw Supabase in page files
//  *  4. force-dynamic kept here (admin data must always be fresh)
//  */

// //import nextDynamic      from "next/dynamic"
// import { AdminScrapeDashboardClient } from '@/components/admin/AdminScrapeDashboardClient'
// import { redirect } from "next/navigation"
// import { createClient } from "@/utils/supabase/server"
// import { dbGetActiveSources } from "@/lib/db/source-registry"
// import {
//   getScrapeRuns,
//   getScrapeQueue,
//   getScraperStats,
//   getSourceHealthSnapshots,
// } from "@/lib/db/notifications"

// // Dynamic import with ssr:false — keeps this component OUT of the
// // dashboard/notifications bundle (fixes runtime Error 11 from Phase 2 report)
// // const AdminScrapeDashboard = nextDynamic(
// //   () => import("@/components/admin/AdminScrapeDashboard")
// //     .then(m => m.AdminScrapeDashboard),
// //   { ssr: false }
// // )
// /* ## Error Type
// Build Error

// ## Error Message
// `ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component.

// ## Build Output
// ./app/admin/scrape/page.tsx:27:30
// `ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component.
//   25 | // Dynamic import with ssr:false — keeps th...
//   26 | // dashboard/notifications bundle (fixes ru...
// > 27 | const AdminScrapeDashboard = nextDynamic(
//      |                              ^^^^^^^^^^^
// > 28 |   () => import("@/components/admin/AdminScr...
//      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// > 29 |     .then(m => m.AdminScrapeDashboard),
//      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// > 30 |   { ssr: false }
//      | ^^^^^^^^^^^^^^^^
// > 31 | )
//      | ^
//   32 |
//   33 | export const dynamic = "force-dynamic"
//   34 | export const metadata = { title: "Scrape Da...

// Ecmascript file had an error

// Next.js version: 16.2.1 (Turbopack)
//  */

// export const dynamic = "force-dynamic"
// export const metadata = { title: "Scrape Dashboard — Admin" }

// export default async function AdminScrapePage({
//   searchParams,
// }: {
//   searchParams: Promise<{ error?: string; tab?: string }>
// }) {
//   const supabase = await createClient()

//   // Auth — must run sequentially before any data fetch
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) redirect("/auth/login")

//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("is_admin")
//     .eq("id", user.id)
//     .single()
//   if (!profile?.is_admin) redirect("/dashboard")

//   // All data + searchParams resolved in parallel
//   // Was sequential before — caused 13s load (each 1.3s Supabase RTT adds up)
//   const [
//     params,
//     stats,
//     recentRuns,
//     pendingQueue,
//     sourceHealth,
//     sourceRegistry,
//   ] = await Promise.all([
//     searchParams,
//     getScraperStats(),
//     getScrapeRuns(10),
//     getScrapeQueue("pending", 30),
//     getSourceHealthSnapshots(),
//     dbGetActiveSources(),
//   ])

//   return (
//     <AdminScrapeDashboard
//       stats={stats}
//       recentRuns={recentRuns}
//       pendingQueue={pendingQueue}
//       sourceHealth={sourceHealth}
//       sourceRegistry={sourceRegistry}
//       errorMessage={params.error}
//       activeTab={params.tab ?? "queue"}
//     />
//   )
// }


/**
 * app/admin/scrape/page.tsx
 * Career Copilot — Admin Scrape Dashboard
 *
 * Implements all fixes from technical reports:
 *  1. AdminScrapeDashboardClient wrapper handles dynamic import with ssr:false
 *     in a Client Component — fixes Next.js 16 Server Component restriction
 *     (Phase 2 Error 11 — prevents bundling into notifications chunk)
 *  2. Promise.all for all data fetches — eliminates sequential await latency
 *     (Technical Report 3.1 — was causing 13s load time)
 *  3. dbGetActiveSources() from data layer — no raw Supabase in page files
 *  4. force-dynamic kept here (admin data must always be fresh)
 */

import { AdminScrapeDashboardClient } from "@/components/admin/AdminScrapeDashboardClient"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { dbGetActiveSources } from "@/lib/db/source-registry"
import {
  getScrapeRuns,
  getScrapeQueue,
  getScraperStats,
  getSourceHealthSnapshots,
} from "@/lib/db/notifications"

export const dynamic = "force-dynamic"
export const metadata = { title: "Scrape Dashboard — Admin" }

export default async function AdminScrapePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>
}) {
  const supabase = await createClient()

  // Auth — must run sequentially before any data fetch
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) redirect("/dashboard")

  // All data + searchParams resolved in parallel.
  // Promise.allSettled — a single failed fetch does NOT crash the whole page.
  // Was sequential before — caused 13s load (each 1.3s Supabase RTT adds up).
  const [
    params,
    statsResult,
    runsResult,
    queueResult,
    healthResult,
    registryResult,
  ] = await Promise.allSettled([
    searchParams,
    getScraperStats(),
    getScrapeRuns(10),
    getScrapeQueue("pending", 30),
    getSourceHealthSnapshots(),
    dbGetActiveSources(),
  ])

  const stats         = statsResult.status === "fulfilled"    ? statsResult.value    : { lastRun: null, pendingReview: 0, approvedTotal: 0, failedSources: 0, healthySources: 0 }
  const recentRuns    = runsResult.status === "fulfilled"     ? runsResult.value     : []
  const pendingQueue  = queueResult.status === "fulfilled"    ? queueResult.value    : []
  const sourceHealth  = healthResult.status === "fulfilled"   ? healthResult.value   : []
  const sourceRegistry = registryResult.status === "fulfilled" ? registryResult.value : []

  // Surface a data-fetch error in the dashboard's error banner
  const fetchError =
    queueResult.status === "rejected"
      ? `Queue load failed: ${queueResult.reason instanceof Error ? queueResult.reason.message : String(queueResult.reason)}`
      : statsResult.status === "rejected"
        ? `Stats load failed: ${statsResult.reason instanceof Error ? statsResult.reason.message : String(statsResult.reason)}`
        : undefined

  const resolvedParams = params.status === "fulfilled" ? params.value : {}

  return (
    <AdminScrapeDashboardClient
      stats={stats}
      recentRuns={recentRuns}
      pendingQueue={pendingQueue}
      sourceHealth={sourceHealth}
      sourceRegistry={sourceRegistry}
      errorMessage={fetchError ?? resolvedParams.error}
      activeTab={resolvedParams.tab ?? "queue"}
    />
  )
}