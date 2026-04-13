/**
 * app/admin/page.tsx — Admin Overview
 *
 * FIX: Wrapped getAdminStats() in try/catch to prevent 500 on timeout.
 * Added links to scrape dashboard and sources so the overview is useful.
 * Also added scraper status section showing last run info.
 */

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

  // Both wrapped — proxy.ts timeout should not 500 the overview page
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
    { label: "Organizations",        value: s.organizations },
    { label: "Total recruitments",   value: s.recruitments },
    { label: "Open now",             value: s.openRecruitments,    accent: true },
    { label: "Upcoming",             value: s.upcomingRecruitments },
    { label: "Posts defined",        value: s.posts },
    { label: "Registered users",     value: s.totalUsers },
    { label: "Eligible matches",     value: s.eligibleMatches,     accent: true },
    { label: "Pending review",       value: ss?.pendingReview ?? 0, accent: (ss?.pendingReview ?? 0) > 0 },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-white text-2xl font-medium mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Admin overview
        </h1>
        <p className="text-white/40 text-sm">Manage notifications, posts, and eligibility.</p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {decodeURIComponent(success)}
        </div>
      )}
      {info && (
        <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
          {decodeURIComponent(info)}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label}
            className={`rounded-xl border px-4 py-3 ${s.accent ? "bg-[#e8d5a3]/[0.04] border-[#e8d5a3]/20" : "bg-white/[0.03] border-white/[0.07]"}`}>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold leading-none ${s.accent ? "text-[#e8d5a3]" : "text-white"}`}
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/recruitments/new", title: "Add recruitment", desc: "Create a notification with posts, criteria, and deadlines" },
          { href: "/admin/scrape",           title: "Scrape Dashboard", desc: `${ss?.pendingReview ?? 0} items pending review · trigger manual run` },
          { href: "/admin/sources",          title: "Source Registry",  desc: "Manage scraping sources, inspect URLs, add new portals" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex flex-col gap-1 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors">
            <span className="text-white font-medium text-sm">{item.title}</span>
            <span className="text-white/40 text-xs">{item.desc}</span>
          </Link>
        ))}
      </div>

      {/* Scraper status */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-base font-medium">Scraper status</h2>
          <Link href="/admin/scrape" className="text-[#e8d5a3]/60 text-xs hover:text-[#e8d5a3]">
            Full dashboard →
          </Link>
        </div>
        {runs.length === 0 ? (
          <p className="text-white/30 text-sm">No scrape runs yet. Trigger one from the Scrape Dashboard.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map(run => (
              <div key={run.id} className="flex items-center gap-4 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  run.status === "completed" ? "bg-emerald-500" :
                  run.status === "partial"   ? "bg-amber-400" :
                  run.status === "failed"    ? "bg-red-500" : "bg-blue-400"
                }`} />
                <span className="text-white/60 tabular-nums text-xs">
                  {new Date(run.started_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="text-white/40 text-xs">{run.sources_checked ?? 0} sources · {run.items_new ?? 0} new</span>
                <span className={`text-xs ml-auto ${
                  run.status === "completed" ? "text-emerald-400" :
                  run.status === "partial"   ? "text-amber-300" :
                  run.status === "failed"    ? "text-red-400" : "text-blue-400"
                }`}>{run.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eligibility engine */}
      <div className="rounded-xl border border-[#e8d5a3]/20 bg-[#e8d5a3]/[0.03] px-6 py-5">
        <h2 className="text-white text-base font-medium mb-1">Eligibility engine</h2>
        <p className="text-white/40 text-sm mb-4">
          Re-run eligibility checks for all users. Run this after adding or updating any recruitment, post, or criteria.
        </p>
        <form action={adminTriggerEligibilityRecompute}>
          <button type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#e8d5a3] text-[#0a0a0a] text-sm font-medium hover:bg-[#f0dfa8] transition-colors">
            Recompute all eligibility
          </button>
        </form>
      </div>
    </div>
  )
}