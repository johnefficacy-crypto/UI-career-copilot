import { redirect } from "next/navigation"
import { requireAdminRole } from "@/lib/db/admin"
import { getCommunityModerationQueue } from "@/lib/db/community-admin"
import { updateCommunityReportStatusAction } from "@/actions/community-admin"

export default async function AdminCommunityPage() {
  try {
    await requireAdminRole("community")
  } catch {
    redirect("/dashboard")
  }

  const reports = await getCommunityModerationQueue(100)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Community Moderation Queue</h1>
      <p className="text-sm text-white/60">Governance-first moderation. `official_updates` remains admin-write only at DB policy level.</p>

      <div className="space-y-3">
        {reports.map((r) => (
          <form key={r.id} action={updateCommunityReportStatusAction} className="rounded border border-white/10 p-4 bg-white/[0.02]">
            <input type="hidden" name="reportId" value={r.id} />
            <div className="text-xs text-white/50">{r.created_at}</div>
            <div className="text-sm text-white mt-1">Reason: {r.reason}</div>
            <div className="text-sm text-white/70">Details: {r.details || "—"}</div>
            <div className="mt-3 flex gap-2 items-center">
              <select name="status" defaultValue={r.status} className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white">
                <option value="pending" disabled>pending</option>
                <option value="reviewing">reviewing</option>
                <option value="resolved">resolved</option>
                <option value="dismissed">dismissed</option>
              </select>
              <input name="moderationNotes" placeholder="moderation notes" className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white flex-1" />
              <button type="submit" className="px-3 py-1.5 text-sm rounded bg-[#e8d5a3] text-black">Update</button>
            </div>
          </form>
        ))}

        {reports.length === 0 && <div className="text-sm text-white/60">No community reports in queue.</div>}
      </div>
    </div>
  )
}
