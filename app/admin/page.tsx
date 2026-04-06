import { getAdminStats } from "@/lib/db/admin"
import { adminTriggerEligibilityRecompute } from "@/actions/admin"

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; info?: string }>
}) {
  const { success, error } = await searchParams
  const stats = await getAdminStats()

  const statCards = [
    { label: "Organizations",        value: stats.organizations },
    { label: "Total recruitments",   value: stats.recruitments },
    { label: "Open now",             value: stats.openRecruitments,    accent: true },
    { label: "Upcoming",             value: stats.upcomingRecruitments },
    { label: "Posts defined",        value: stats.posts },
    { label: "Registered users",     value: stats.totalUsers },
    { label: "Eligible matches",     value: stats.eligibleMatches,     accent: true },
  ]

  return (
    <div className="p-8">
      <h1 className="text-white text-2xl font-medium mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Admin overview
      </h1>
      <p className="text-white/40 text-sm mb-8">Manage notifications, posts, and eligibility.</p>

      {/* Alerts */}
      {success && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border px-4 py-3 ${
              s.accent
                ? "bg-[#e8d5a3]/[0.04] border-[#e8d5a3]/20"
                : "bg-white/[0.03] border-white/[0.07]"
            }`}
          >
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{s.label}</p>
            <p
              className={`text-2xl font-semibold leading-none ${s.accent ? "text-[#e8d5a3]" : "text-white"}`}
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <a
          href="/admin/recruitments/new"
          className="flex flex-col gap-1 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors cursor-pointer"
        >
          <span className="text-white font-medium text-sm">Add recruitment</span>
          <span className="text-white/40 text-xs">Create a new notification with posts, criteria, and deadlines.</span>
        </a>
        <a
          href="/admin/organizations/new"
          className="flex flex-col gap-1 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors cursor-pointer"
        >
          <span className="text-white font-medium text-sm">Add organization</span>
          <span className="text-white/40 text-xs">Register a new recruiting body (SEBI, IBPS, SSC, etc.)</span>
        </a>
      </div>

      {/* Eligibility engine */}
      <div className="rounded-xl border border-[#e8d5a3]/20 bg-[#e8d5a3]/[0.03] px-6 py-5">
        <h2 className="text-white text-base font-medium mb-1">Eligibility engine</h2>
        <p className="text-white/40 text-sm mb-4">
          Re-run eligibility checks for all users. Run this after adding or updating any recruitment, post, or criteria.
          For {stats.totalUsers} users × {stats.posts} posts this may take a moment.
        </p>
        <form action={adminTriggerEligibilityRecompute}>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#e8d5a3] text-[#0a0a0a] text-sm font-medium hover:bg-[#f0dfa8] transition-colors"
          >
            Recompute all eligibility
          </button>
        </form>
      </div>
    </div>
  )
}