/**
 * app/admin/audit/page.tsx
 * Admin — Audit Log Viewer
 *
 * Reads admin_audit_logs (migration 019). Append-only — no mutations here.
 * Paginated server-side (50/page). URL params: page, entity_type, actor.
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Audit Log — Admin" }

const PAGE_SIZE = 50

type AuditRow = {
  id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  notes: string | null
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  approve:  "#86efac",
  reject:   "#f87171",
  delete:   "#f87171",
  update:   "#fde68a",
  create:   "#93c5fd",
  trigger:  "#c4b5fd",
  recompute:"#c4b5fd",
}

function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLOR).find(k => action.toLowerCase().includes(k))
  return key ? ACTION_COLOR[key] : "rgba(255,255,255,0.45)"
}

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function Paginator({ page, totalPages, entityType }: { page: number; totalPages: number; entityType: string }) {
  if (totalPages <= 1) return null
  const base = `/admin/audit?entity_type=${entityType}`
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

const ENTITY_TABS = ["all", "scrape_queue", "source_registry", "recruitments", "eligibility", "notifications"] as const

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity_type?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/dashboard")

  const params     = await searchParams.catch(() => ({}))
  const pageNum    = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const entityType = params.entity_type ?? "all"
  const from       = (pageNum - 1) * PAGE_SIZE
  const to         = from + PAGE_SIZE - 1

  let rows: AuditRow[] = []
  let total = 0
  let totalPages = 1
  let fetchError: string | null = null

  try {
    let q = supabase
      .from("admin_audit_logs")
      .select("id, actor_email, action, entity_type, entity_id, notes, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (entityType !== "all") q = q.eq("entity_type", entityType)

    const { data, count, error } = await q
    if (error) throw error
    rows = (data ?? []) as AuditRow[]
    total = count ?? 0
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load audit log"
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-medium" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Audit Log
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          {total} entries · append-only · every admin mutation recorded
        </p>
      </div>

      {/* Entity type tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl p-1 self-start" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {ENTITY_TABS.map(et => (
          <Link
            key={et}
            href={`/admin/audit?entity_type=${et}&page=1`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
            style={{
              background: entityType === et ? "rgba(232,213,163,0.10)" : "transparent",
              color:      entityType === et ? "#e8d5a3" : "rgba(255,255,255,0.35)",
              border:     entityType === et ? "1px solid rgba(232,213,163,0.25)" : "1px solid transparent",
            }}
          >
            {et.replace("_", " ")}
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
          <p className="text-3xl mb-3 opacity-20">🗒</p>
          <p className="text-white/40 text-sm">No audit entries yet.</p>
          <p className="text-white/20 text-xs mt-1">
            Admin actions (approve, reject, update) are recorded here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["When", "Actor", "Action", "Entity", "Entity ID", "Notes"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-white/30 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">
                      {fmt(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/55 truncate block max-w-[160px]" title={row.actor_email ?? ""}>
                        {row.actor_email ?? "system"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-medium" style={{ color: actionColor(row.action) }}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.40)" }}>
                        {row.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-white/30 truncate block max-w-[100px]" title={row.entity_id ?? ""}>
                        {row.entity_id ? row.entity_id.slice(0, 8) + "…" : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {row.notes ? (
                        <span className="text-xs text-white/40 truncate block" title={row.notes}>
                          {row.notes.slice(0, 80)}{row.notes.length > 80 ? "…" : ""}
                        </span>
                      ) : <span className="text-white/20 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-4 pb-4">
              <Paginator page={pageNum} totalPages={totalPages} entityType={entityType} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
