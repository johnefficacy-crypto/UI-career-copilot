import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Browse Exams — Career Copilot" }

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

function urgencyColor(days: number | null): string {
  if (days === null) return "var(--text-ghost)"
  if (days <= 3)  return "#ef4444"
  if (days <= 14) return "#f59e0b"
  return "#34d399"
}

export default async function BrowseExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const params = await searchParams
  const filter = params.filter ?? "open"
  const q = params.q ?? ""
  const today = new Date().toISOString().split("T")[0]

  let query = supabase
    .from("recruitments")
    .select(`
      id, name, status, apply_start_date, apply_end_date,
      notification_date, year, total_vacancies, official_notification_url,
      organizations ( name, type, state )
    `)
    .order("apply_end_date", { ascending: true, nullsFirst: false })
    .limit(60)

  if (filter === "open") {
    query = query.gte("apply_end_date", today).in("status", ["open", "upcoming", "published"])
  } else if (filter === "closing") {
    const in7days = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0]
    query = query.gte("apply_end_date", today).lte("apply_end_date", in7days)
  } else {
    query = query.in("status", ["open", "upcoming", "published", "closed", "result_declared"])
  }

  if (q) {
    query = query.ilike("name", `%${q}%`)
  }

  const { data: recruitments } = await query

  const filters = [
    { key: "open",    label: "Open now" },
    { key: "closing", label: "Closing soon" },
    { key: "all",     label: "All" },
  ]

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ background: "rgba(15,15,15,0.9)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm" style={{ color: "var(--text-dim)" }}>
              ← Dashboard
            </Link>
            <span style={{ color: "var(--border-md)" }}>/</span>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Browse Exams</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>
            Open Recruitments
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Browse all active government exam notifications. Use your profile to get personalised matches.
          </p>
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--bg-surface)" }}>
            {filters.map(f => (
              <Link
                key={f.key}
                href={`/dashboard/exams?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: filter === f.key ? "var(--gold-faint)" : "transparent",
                  color: filter === f.key ? "var(--gold)" : "var(--text-dim)",
                  border: filter === f.key ? "1px solid var(--gold-border)" : "1px solid transparent",
                }}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <form method="get" action="/dashboard/exams" className="flex-1 min-w-[200px] max-w-xs">
            <input type="hidden" name="filter" value={filter} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search recruitments…"
              className="w-full text-sm px-3 py-2 rounded-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </form>
        </div>

        {/* Results */}
        {!recruitments || recruitments.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-3xl mb-3 opacity-20">📋</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>No recruitments found</p>
            <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
              The scraper is running — check back soon or ask your admin to apply pending migrations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recruitments.map((r) => {
              const days = daysUntil(r.apply_end_date)
              const org = r.organizations as { name: string; type: string; state: string | null } | null
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-5 flex flex-col gap-3 transition-colors"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  {/* Title + org */}
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug mb-1">{r.name}</p>
                    {org && (
                      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                        {org.name}
                        {org.state && <span className="ml-1.5" style={{ color: "var(--text-ghost)" }}>· {org.state}</span>}
                      </p>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-ghost)" }}>
                    {r.total_vacancies && (
                      <span>👥 {r.total_vacancies.toLocaleString("en-IN")} posts</span>
                    )}
                    {r.apply_end_date && (
                      <span style={{ color: urgencyColor(days) }}>
                        {days !== null && days <= 0
                          ? "Closed"
                          : days !== null
                          ? `⏰ ${days}d left`
                          : `Apply by ${new Date(r.apply_end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                      </span>
                    )}
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                      style={{
                        background: r.status === "open" ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.05)",
                        color:      r.status === "open" ? "#34d399" : "var(--text-dim)",
                      }}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Action */}
                  {r.official_notification_url && (
                    <a
                      href={r.official_notification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs self-start"
                      style={{ color: "var(--gold)", textDecoration: "underline", textUnderlineOffset: "2px" }}
                    >
                      Official notification ↗
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
