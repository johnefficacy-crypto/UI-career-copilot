/**
 * app/admin/recruitments/page.tsx
 *
 * FIX: Replaced <button onClick={confirm}> inside Server Component with
 * <DeleteConfirmButton> — a small "use client" component.
 * Server Components cannot have event handlers; onClick causes
 * "Event handlers cannot be passed to Client Component props".
 */

import Link from "next/link"
import { getAllRecruitmentsAdmin } from "@/lib/db/admin"
import { formatDate, daysUntil } from "@/lib/utils/dates"
import { adminDeleteRecruitment } from "@/actions/admin"
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton"

const STATUS_STYLES: Record<string, string> = {
  open:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  closed:   "bg-white/5 text-white/30 border-white/10",
  draft:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

type Recruitment = Awaited<ReturnType<typeof getAllRecruitmentsAdmin>>[number]

export default async function AdminRecruitmentsPage() {
  let recruitments: Awaited<ReturnType<typeof getAllRecruitmentsAdmin>> = []
  let fetchError: string | null = null

  try {
    recruitments = await getAllRecruitmentsAdmin()
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load recruitments"
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-medium" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Recruitments
          </h1>
          <p className="text-white/40 text-sm mt-0.5">{recruitments.length} total</p>
        </div>
        <Link
          href="/admin/recruitments/new"
          className="px-4 py-2 rounded-lg bg-[#e8d5a3] text-[#0a0a0a] text-sm font-medium hover:bg-[#f0dfa8] transition-colors"
        >
          + Add recruitment
        </Link>
      </div>

      {fetchError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      {recruitments.length === 0 && !fetchError ? (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-white/40 text-sm">No recruitments yet.</p>
          <Link href="/admin/recruitments/new" className="text-[#e8d5a3]/60 text-sm hover:text-[#e8d5a3] mt-2 inline-block">
            Add the first one →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recruitments.map((rec: Recruitment) => {
            const daysLeft = rec.apply_end_date ? daysUntil(rec.apply_end_date) : null
            const postCount = rec.posts?.length ?? 0
            return (
              <div key={rec.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/30 text-xs">{rec.organizations?.type}</span>
                    <span className="text-white/20 text-xs">·</span>
                    <span className="text-white/30 text-xs">{rec.year}</span>
                    <span className="text-white/20 text-xs">·</span>
                    <span className="text-white/30 text-xs">{postCount} post{postCount !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{rec.name}</p>
                  <p className="text-white/35 text-xs">{rec.organizations?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white/40 text-xs">Deadline</p>
                  <p className={`text-xs font-mono tabular-nums ${
                    daysLeft !== null && daysLeft <= 7 ? "text-red-400" :
                    daysLeft !== null && daysLeft <= 21 ? "text-amber-300" : "text-white/50"
                  }`}>
                    {daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d left` : rec.apply_end_date ? formatDate(rec.apply_end_date) : "—"}
                  </p>
                </div>
                <span className={`shrink-0 border text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[rec.status ?? "upcoming"]}`}>
                  {rec.status}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/recruitments/${rec.id}`}
                    className="text-white/40 text-xs hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/[0.05]">
                    Edit
                  </Link>
                  <DeleteConfirmButton
                    action={adminDeleteRecruitment}
                    message={`Delete "${rec.name}"? This will also delete all posts and criteria.`}
                    fields={{ id: rec.id }}
                    label="✕"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}