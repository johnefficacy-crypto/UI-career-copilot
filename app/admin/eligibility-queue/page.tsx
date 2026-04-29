/**
 * app/admin/eligibility-queue/page.tsx
 * Admin — Eligibility Recompute Queue Monitor
 *
 * Shows the eligibility_recompute_queue table (from migration 024).
 * Columns: status, user_id, recruitment_id, attempt_count, last_error,
 *          next_attempt_at, claimed_at, queued_at.
 *
 * Paginated server-side (25 per page). URL params: page, status.
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { AdminStatusPill } from "@/components/admin/ui"

export const dynamic = "force-dynamic"
export const metadata = { title: "Eligibility Queue — Admin" }

const PAGE_SIZE = 25

type QueueRow = {
  id: string
  user_id: string | null
  recruitment_id: string | null
  status: string | null
  queued_at: string | null
  claimed_at: string | null
  attempt_count: number | null
  last_error: string | null
  next_attempt_at: string | null
}

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral"

function statusVariant(s: string | null): StatusVariant {
  switch (s) {
    case "completed":  return "success"
    case "processing": return "info"
    case "failed":     return "error"
    case "pending":    return "warning"
    default:           return "neutral"
  }
}

function fmt(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
}

function Paginator({ page, totalPages, status }: { page: number; totalPages: number; status: string }) {
  if (totalPages <= 1) return null
  const base = `/admin/eligibility-queue?status=${status}`
  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
      <span className="text-xs text-white/30">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={`${base}&page=${page - 1}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.10] text-white/50 hover:text-white/80 transition-colors">
            ← Prev
          </Link>
        )}
        {page < totalPages && (
          <Link href={`${base}&page=${page + 1}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.10] text-white/50 hover:text-white/80 transition-colors">
            Next →
          </Link>
        )}
      </div>
    </div>
  )
}

export default async function EligibilityQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/dashboard")

  const params   = await searchParams.catch(() => ({}))
  const pageNum  = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const status   = params.status ?? "pending"
  const from     = (pageNum - 1) * PAGE_SIZE
  const to       = from + PAGE_SIZE - 1

  let rows: QueueRow[] = []
  let total = 0
  let totalPages = 1
  let fetchError: string | null = null

  try {
    let q = supabase
      .from("eligibility_recompute_queue")
      .select("id, user_id, recruitment_id, status, queued_at, claimed_at, attempt_count, last_error, next_attempt_at", { count: "exact" })
      .order("queued_at", { ascending: false })
      .range(from, to)

    if (status !== "all") q = q.eq("status", status)

    const { data, count, error } = await q
    if (error) throw error
    rows = (data ?? []) as QueueRow[]
    total = count ?? 0
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load queue"
  }

  const STATUS_TABS = ["all", "pending", "processing", "completed", "failed"] as const

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-medium" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Eligibility Queue
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {total} rows · eligibility recompute jobs (migration 024 — atomic claiming)
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl p-1 self-start" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {STATUS_TABS.map(s => (
          <Link
            key={s}
            href={`/admin/eligibility-queue?status=${s}&page=1`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
            style={{
              background: status === s ? "rgba(232,213,163,0.10)" : "transparent",
              color:      status === s ? "#e8d5a3" : "rgba(255,255,255,0.35)",
              border:     status === s ? "1px solid rgba(232,213,163,0.25)" : "1px solid transparent",
            }}
          >
            {s}
          </Link>
        ))}
      </div>

      {fetchError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      {rows.length === 0 && !fetchError ? (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-white/40 text-sm">No {status === "all" ? "" : status} jobs in queue.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Status", "User ID", "Recruitment ID", "Attempts", "Queued", "Claimed", "Next retry", "Last error"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-white/30 uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <AdminStatusPill label={row.status ?? "unknown"} variant={statusVariant(row.status)} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-white/40 truncate block max-w-[120px]" title={row.user_id ?? ""}>
                      {row.user_id ? row.user_id.slice(0, 8) + "…" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.recruitment_id ? (
                      <Link href={`/admin/recruitments/${row.recruitment_id}`}
                        className="text-xs font-mono text-[#e8d5a3]/50 hover:text-[#e8d5a3] transition-colors truncate block max-w-[120px]"
                        title={row.recruitment_id}>
                        {row.recruitment_id.slice(0, 8)}…
                      </Link>
                    ) : <span className="text-white/25 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono tabular-nums ${(row.attempt_count ?? 0) >= 3 ? "text-red-400" : "text-white/50"}`}>
                      {row.attempt_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">{fmt(row.queued_at)}</td>
                  <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">{fmt(row.claimed_at)}</td>
                  <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">
                    {row.next_attempt_at
                      ? <span className={new Date(row.next_attempt_at) > new Date() ? "text-amber-400/70" : "text-white/35"}>{fmt(row.next_attempt_at)}</span>
                      : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {row.last_error ? (
                      <span className="text-xs text-red-400/70 truncate block" title={row.last_error}>
                        {row.last_error.slice(0, 60)}{row.last_error.length > 60 ? "…" : ""}
                      </span>
                    ) : <span className="text-white/20 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 pb-4">
            <Paginator page={pageNum} totalPages={totalPages} status={status} />
          </div>
        </div>
      )}
    </div>
  )
}
