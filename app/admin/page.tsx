import { getAdminStats } from "@/lib/db/admin"
import { getScrapeRuns, getScraperStats } from "@/lib/db/notifications"
import { adminTriggerEligibilityRecompute } from "@/actions/admin"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; info?: string }>
}) {
  const { success, error, info } = await searchParams

  const [stats, scraperStats, recentRuns] = await Promise.allSettled([
    getAdminStats(),
    getScraperStats(),
    getScrapeRuns(3),
  ])

  const s = stats.status === "fulfilled" ? stats.value : {
    organizations: 0, recruitments: 0, openRecruitments: 0, upcomingRecruitments: 0,
    posts: 0, totalUsers: 0, eligibleMatches: 0,
  }
  const ss = scraperStats.status === "fulfilled" ? scraperStats.value : null
  const runs = recentRuns.status === "fulfilled" ? recentRuns.value : []

  const statCards = [
    { label: "Organizations", value: s.organizations },
    { label: "Recruitments", value: s.recruitments },
    { label: "Open now", value: s.openRecruitments },
    { label: "Upcoming", value: s.upcomingRecruitments },
    { label: "Posts", value: s.posts },
    { label: "Users", value: s.totalUsers },
    { label: "Eligible matches", value: s.eligibleMatches },
    { label: "Pending review", value: ss?.pendingReview ?? 0 },
  ]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin overview</h1>
        <p className="text-sm text-slate-600">Simple control panel for governance and operations.</p>
      </div>

      {success && <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">{decodeURIComponent(success)}</div>}
      {info && <div className="p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-sm">{decodeURIComponent(info)}</div>}
      {error && <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">{decodeURIComponent(error)}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-md p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="text-xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            ["/admin/recruitments/new", "Add recruitment"],
            ["/admin/scrape", "Scrape dashboard"],
            ["/admin/sources", "Source registry"],
            ["/admin/notifications", "Notifications"],
            ["/admin/recruitment-feedback", "Recruitment feedback"],
            ["/admin/eligibility-queue", "Eligibility queue"],
            ["/admin/audit", "Audit log"],
            ["/admin/rbac", "RBAC manager"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="px-3 py-2 rounded border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent scraper runs</h2>
          <Link href="/admin/scrape" className="text-xs text-indigo-600">View all</Link>
        </div>
        {runs.length === 0 ? <p className="text-sm text-slate-500">No runs available.</p> : (
          <ul className="space-y-2">
            {runs.map((run) => (
              <li key={run.id} className="text-sm text-slate-700 border border-slate-200 rounded px-3 py-2 flex items-center gap-3">
                <span className="font-medium">{run.status}</span>
                <span className="text-slate-500">{run.sources_checked ?? 0} sources</span>
                <span className="text-slate-500">{run.items_new ?? 0} new</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-indigo-900 mb-1">Eligibility engine</h2>
        <p className="text-sm text-indigo-800 mb-3">Recompute deterministic eligibility after recruitment or criteria updates.</p>
        <form action={adminTriggerEligibilityRecompute}>
          <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700">Recompute all eligibility</button>
        </form>
      </div>
    </div>
  )
}
