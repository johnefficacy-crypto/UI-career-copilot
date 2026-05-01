/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/utils/supabase/server"
import { requireAdminRole } from "@/lib/db/admin"

export type ForumReportStatus = "open" | "in_review" | "resolved" | "dismissed" | "escalated"
export type ForumReportSeverity = "p0_harmful" | "p1_misleading" | "p2_spam_noise"

export async function listForumReports(filters?: {
  status?: ForumReportStatus | "all"
  severity?: ForumReportSeverity | "all"
  limit?: number
}) {
  await requireAdminRole("community")
  const supabase = await createClient() as unknown as { from: (table: string) => any }

  let q = supabase
    .from("forum_reports")
    .select(`
      id, target_type, post_id, comment_id, reason, details,
      severity, status, assigned_admin_id, action_notes,
      reporter_user_id, resolved_at, resolved_by,
      created_at, updated_at,
      reporter:profiles!forum_reports_reporter_user_id_fkey(full_name),
      assigned_admin:profiles!forum_reports_assigned_admin_id_fkey(full_name),
      post:forum_posts!forum_reports_post_id_fkey(id,title),
      comment:forum_comments!forum_reports_comment_id_fkey(id,body,post_id)
    `)
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 200)

  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status)
  if (filters?.severity && filters.severity !== "all") q = q.eq("severity", filters.severity)

  const { data, error } = await q as { data: unknown[] | null; error: { message: string } | null }
  if (error) throw new Error(error.message)
  return data ?? []
}
