// app/admin/scraping/page.tsx
// Career Copilot — Phase 10: Admin scraping control centre

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getAllSources, getQueueStats, getRecentRuns } from "@/lib/db/delete-scraping"
import { triggerScrapeRun, toggleScrapingSource } from "@/actions/delete-scraping"
import { ScrapeSource, ScrapeRun } from "@/types/delete-scraping"
import { formatDistanceToNow, format } from "date-fns"

export const metadata = { title: "Scraping Control — Admin — Career Copilot" }

function timeAgo(d: string | null) {
  if (!d) return "Never"
  return formatDistanceToNow(new Date(d), { addSuffix: true })
}

function statusColour(status: string) {
  return status === "completed" ? "text-emerald-400"
    :    status === "running"   ? "text-[#e8d5a3]"
    :    status === "partial"   ? "text-amber-400"
    :                             "text-red-400"
}

export default async function ScrapingAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/dashboard")

  const [sources, queueStats, recentRuns] = await Promise.all([
    getAllSources(),
    getQueueStats(),
    getRecentRuns(8),
  ])

  const pendingCount = queueStats.pending ?? 0

  return (
    <div className="min-h-screen bg-[#0f0f0f]">

      {/* Header */}
      <div className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-white/30 text-sm hover:text-white/60 transition-colors">← Admin</Link>
            <span className="text-white/10">/</span>
            <span className="text-white/60 text-sm font-medium">Scraping Pipeline</span>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Link
                href="/admin/scraping/queue"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {pendingCount} pending review
              </Link>
            )}
            <Link href="/admin/scraping/sources/new" className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white transition-colors">
              + Add source
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
          {[
            { label: "Active sources", value: sources.filter(s => s.is_active).length, accent: false },
            { label: "Pending review", value: queueStats.pending,   accent: pendingCount > 0 },
            { label: "Approved",       value: queueStats.approved,  accent: false },
            { label: "Rejected",       value: queueStats.rejected,  accent: false },
            { label: "Duplicates",     value: queueStats.duplicate, accent: false },
          ].map(stat => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 ${
                stat.accent
                  ? "border-amber-400/25 bg-amber-400/[0.05]"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <p className={`text-2xl font-mono font-medium mb-0.5 ${stat.accent ? "text-amber-400" : "text-white/80"}`}>
                {stat.value}
              </p>
              <p className="text-white/30 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* ── Sources table ────────────────────────────────────────── */}
          <div>
            <h2 className="font-serif text-lg text-white/70 font-medium mb-4">Scrape sources</h2>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="divide-y divide-white/[0.04]">
                {sources.map(source => (
                  <SourceRow key={source.id} source={source} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Trigger run */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <h3 className="text-white/60 text-sm font-medium mb-4">Trigger scrape run</h3>
              <form action={triggerScrapeRun} className="flex flex-col gap-3">
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-widest block mb-1.5">
                    Sources (leave blank for all)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {sources.filter(s => s.is_active).map(s => (
                      <label key={s.id} className="cursor-pointer">
                        <input type="checkbox" name="source_ids_check" value={s.id} className="sr-only peer" />
                        <span className="text-[11px] px-2 py-1 rounded-md border border-white/[0.07] text-white/30 peer-checked:border-[#e8d5a3]/30 peer-checked:text-[#e8d5a3]/70 transition-colors cursor-pointer">
                          {s.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <input type="hidden" name="source_ids" id="source_ids_hidden" />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#e8d5a3] text-[#0c0c0c] text-sm font-medium hover:bg-[#f0dfa8] active:scale-[0.99] transition-all"
                >
                  Run now →
                </button>
              </form>
              <script dangerouslySetInnerHTML={{ __html: `
                document.addEventListener('DOMContentLoaded', () => {
                  const form = document.querySelector('form');
                  const hidden = document.getElementById('source_ids_hidden');
                  if (!form || !hidden) return;
                  form.addEventListener('submit', () => {
                    const checked = [...form.querySelectorAll('input[name="source_ids_check"]:checked')].map(el => el.value);
                    hidden.value = checked.join(',');
                  });
                });
              `}} />
            </div>

            {/* Recent runs */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <p className="text-white/40 text-xs uppercase tracking-widest">Recent runs</p>
                <Link href="/admin/scraping/runs" className="text-white/25 text-xs hover:text-white/50 transition-colors">All →</Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recentRuns.length === 0 ? (
                  <p className="text-white/25 text-xs px-5 py-4">No runs yet.</p>
                ) : recentRuns.map(run => (
                  <Link
                    key={run.id}
                    href={`/admin/scraping/runs/${run.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.025] transition-colors"
                  >
                    <div>
                      <p className={`text-xs font-medium capitalize ${statusColour(run.status)}`}>
                        {run.status}
                        {run.triggered_by === "admin" && " (manual)"}
                      </p>
                      <p className="text-white/25 text-[11px]">{timeAgo(run.started_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs font-mono">{run.items_new} new</p>
                      <p className="text-white/20 text-[11px]">{run.sources_checked} sources</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SourceRow({ source }: { source: ScrapeSource }) {
  const isOverdue = source.last_scraped_at
    ? (Date.now() - new Date(source.last_scraped_at).getTime()) > source.scrape_interval_hours * 3600 * 1000 * 1.5
    : true

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      {/* Active indicator */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${source.is_active ? "bg-emerald-400" : "bg-white/20"}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white/65 text-sm font-medium">{source.name}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 font-mono">
            {source.org_type}
          </span>
        </div>
        <p className="text-white/25 text-xs truncate">{source.base_url}</p>
      </div>

      {/* Last scraped */}
      <div className="text-right shrink-0">
        <p className={`text-xs ${isOverdue && source.is_active ? "text-amber-400/70" : "text-white/30"}`}>
          {source.last_scraped_at ? timeAgo(source.last_scraped_at) : "Never"}
        </p>
        <p className="text-white/15 text-[10px]">every {source.scrape_interval_hours}h</p>
      </div>

      {/* Toggle */}
      <form action={toggleScrapingSource.bind(null, source.id, !source.is_active)}>
        <button
          type="submit"
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            source.is_active
              ? "border-red-500/20 text-red-400/60 hover:border-red-500/40 hover:text-red-400"
              : "border-emerald-500/20 text-emerald-400/60 hover:border-emerald-500/40 hover:text-emerald-400"
          }`}
        >
          {source.is_active ? "Disable" : "Enable"}
        </button>
      </form>
    </div>
  )
}

function timeAgo(d: string | null) {
  if (!d) return "Never"
  return formatDistanceToNow(new Date(d), { addSuffix: true })
}