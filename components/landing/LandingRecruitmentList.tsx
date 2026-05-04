import type { LandingRecruitment } from "@/lib/db/landing"

function formatDate(value: string | null): string {
  if (!value) return "TBA"
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const statusClass: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  published: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

export function LandingRecruitmentList({ items }: { items: LandingRecruitment[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No verified recruitments are available right now. Please check again shortly.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border border-slate-200 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500 mt-1">{item.organizations?.name ?? "Official organization"}</p>
            </div>
            <span className={`text-xs border rounded-full px-2 py-1 capitalize ${(item.status ? statusClass[item.status] : undefined) ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
              {item.status ?? "unknown"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>Notified: {formatDate(item.notification_date)}</span>
            <span>Apply by: {formatDate(item.apply_end_date)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
