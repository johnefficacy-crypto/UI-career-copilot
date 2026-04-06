// app/admin/scraping/queue/page.tsx
// Career Copilot — Phase 10: Human verification review queue

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getQueueItems, getQueueStats } from "@/lib/db/delete-scraping"
import { bulkReviewAction } from "@/actions/delete-scraping"
import { ScrapeQueueItem } from "@/types/delete-scraping"
import { formatDistanceToNow } from "date-fns"

export const metadata = { title: "Review Queue — Admin — Career Copilot" }

const STATUS_TABS = ["pending", "reviewing", "approved", "rejected", "duplicate"] as const

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/dashboard")

  const params = await searchParams
  const activeStatus = params.status ?? "pending"

  const [items, stats] = await Promise.all([
    getQueueItems(activeStatus, 30),
    getQueueStats(),
  ])

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/admin/scraping" className="text-white/30 text-sm hover:text-white/60 transition-colors">← Scraping</Link>
          <span className="text-white/10">/</span>
          <span className="text-white/60 text-sm font-medium">Review Queue</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Status tabs */}
        <div className="flex gap-1 mb-8 border border-white/[0.07] rounded-xl p-1 w-fit">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab}
              href={`/admin/scraping/queue?status=${tab}`}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors flex items-center gap-1.5 ${
                activeStatus === tab
                  ? "bg-white/[0.07] text-white/80"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {tab}
              <span className={`font-mono text-[10px] ${
                tab === "pending" && stats.pending > 0 ? "text-amber-400" : "text-white/20"
              }`}>
                {stats[tab] ?? 0}
              </span>
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
            <p className="text-white/30 text-sm">
              {activeStatus === "pending"
                ? "No items pending review. Run a scrape to populate the queue."
                : `No ${activeStatus} items.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map(item => (
              <QueueItemCard key={item.id} item={item} showActions={activeStatus === "pending" || activeStatus === "reviewing"} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const colour = pct >= 85 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400"
  return (
    <span className={`text-xs font-mono font-medium ${colour}`}>{pct}%</span>
  )
}

function QueueItemCard({ item, showActions }: { item: ScrapeQueueItem; showActions: boolean }) {
  const d = item.extracted_data

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono uppercase">
              {d.org_type}
            </span>
            <span className="text-[10px] text-white/25">{item.source_name}</span>
            <span className="text-[10px] text-white/15">·</span>
            <span className="text-[10px] text-white/25">
              {formatDistanceToNow(new Date(item.scraped_at), { addSuffix: true })}
            </span>
          </div>
          <h3 className="text-white/80 text-sm font-medium leading-snug">{d.title || "Untitled"}</h3>
          <p className="text-white/35 text-xs mt-0.5">{d.organization_name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white/25 text-xs">confidence</span>
            <ConfidenceBadge score={item.confidence_score} />
          </div>
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-[#e8d5a3]/40 text-xs hover:text-[#e8d5a3] transition-colors">
            View source ↗
          </a>
        </div>
      </div>

      {/* Extracted data */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-white/[0.05]">
        {[
          { label: "Apply opens",  value: d.apply_start_date ?? "—" },
          { label: "Apply closes", value: d.apply_end_date   ?? "—" },
          { label: "Vacancies",    value: d.total_vacancies != null ? String(d.total_vacancies) : "—" },
          { label: "Posts",        value: String(d.posts?.length ?? 0) },
        ].map(f => (
          <div key={f.label}>
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-0.5">{f.label}</p>
            <p className="text-white/60 text-sm font-mono">{f.value}</p>
          </div>
        ))}
      </div>

      {/* Posts list */}
      {d.posts?.length > 0 && (
        <div className="px-6 py-3 border-b border-white/[0.05]">
          <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Posts extracted</p>
          <div className="flex flex-wrap gap-2">
            {d.posts.map((p, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-lg border border-white/[0.07] text-white/40">
                {p.post_name}
                {p.vacancies != null && <span className="text-white/20 ml-1">({p.vacancies})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="px-6 py-4 flex flex-wrap items-center gap-3">
          {/* Approve */}
          <form action={bulkReviewAction} className="flex items-center gap-2">
            <input type="hidden" name="item_id" value={item.id} />
            <input type="hidden" name="action"  value="approve" />
            <input
              name="notes"
              type="text"
              placeholder="Reviewer note (optional)"
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 w-48"
            />
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
              ✓ Approve
            </button>
          </form>

          {/* Reject */}
          <form action={bulkReviewAction} className="flex items-center gap-2">
            <input type="hidden" name="item_id" value={item.id} />
            <input type="hidden" name="action"  value="reject" />
            <button type="submit" className="px-4 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 text-xs hover:border-red-500/40 hover:text-red-400 transition-colors">
              ✕ Reject
            </button>
          </form>

          {/* Mark duplicate */}
          <form action={bulkReviewAction} className="flex items-center gap-2">
            <input type="hidden" name="item_id" value={item.id} />
            <input type="hidden" name="action"  value="mark_duplicate" />
            <button type="submit" className="px-4 py-1.5 rounded-lg border border-white/[0.08] text-white/30 text-xs hover:text-white/50 transition-colors">
              ⊘ Duplicate
            </button>
          </form>
        </div>
      )}

      {/* Reviewed state */}
      {!showActions && item.reviewer_notes && (
        <div className="px-6 py-3">
          <p className="text-white/25 text-xs">Note: {item.reviewer_notes}</p>
        </div>
      )}
    </div>
  )
}