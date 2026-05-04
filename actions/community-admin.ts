"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { logAdminAction, requireAdminRole } from "@/lib/db/admin"

type DynamicQuery = {
  select: (fields: string) => DynamicQuery
  eq: (column: string, value: unknown) => DynamicQuery
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  update: (patch: Record<string, string | null>) => DynamicQuery
}

function fromUnknownTable(supabase: unknown, table: string): DynamicQuery {
  const fromFn = (supabase as { from: (name: string) => DynamicQuery }).from
  return fromFn(table)
}

export async function updateForumReportAction(formData: FormData) {
  const ctx = await requireAdminRole("community")
  const supabase = await createClient()

  const reportId = String(formData.get("report_id") ?? "")
  const status = String(formData.get("status") ?? "open")
  const severity = String(formData.get("severity") ?? "p2_spam_noise")
  const notes = String(formData.get("action_notes") ?? "").trim() || null

  if (!reportId) return

  const { data: before } = await supabase
    .from("forum_reports" as never)
    .select("id,status,severity,assigned_admin_id,action_notes,resolved_at,resolved_by")
    .eq("id", reportId)
    .maybeSingle()

  const patch: Record<string, string | null> = {
    status,
    severity,
    action_notes: notes,
    assigned_admin_id: ctx.userId,
  }

  if (status === "resolved" || status === "dismissed") {
    patch.resolved_at = new Date().toISOString()
    patch.resolved_by = ctx.userId
  }

  const { error } = await supabase
    .from("forum_reports" as never)
    .update(patch as never)
    .eq("id", reportId)
    .maybeSingle()
  if (error) throw new Error(error.message)

  await logAdminAction({
    actorId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "update_forum_report",
    entityType: "forum_report",
    entityId: reportId,
    oldValue: before,
    newValue: patch,
    notes: notes ?? undefined,
  })

  revalidatePath("/admin/community")
}
