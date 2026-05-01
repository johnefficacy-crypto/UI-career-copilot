"use server"

import { revalidatePath } from "next/cache"
import { requireAdminRole, logAdminAction } from "@/lib/db/admin"
import { moderateCommunityReport } from "@/lib/db/community-admin"

export async function updateCommunityReportStatusAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "")
  const status = String(formData.get("status") ?? "") as "reviewing" | "resolved" | "dismissed"
  const moderationNotes = String(formData.get("moderationNotes") ?? "").trim()

  if (!reportId) throw new Error("Missing report id")
  if (!["reviewing", "resolved", "dismissed"].includes(status)) {
    throw new Error("Invalid moderation status")
  }

  const ctx = await requireAdminRole("community")
  const updated = await moderateCommunityReport({
    reportId,
    status,
    moderationNotes,
    moderatedBy: ctx.userId,
  })

  await logAdminAction({
    actorId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "community_report_moderated",
    entityType: "community_reports",
    entityId: reportId,
    newValue: updated,
    notes: moderationNotes || `Set status to ${status}`,
  })

  revalidatePath("/admin/community")
}
