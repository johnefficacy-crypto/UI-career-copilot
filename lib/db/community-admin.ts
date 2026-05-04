import { createClient } from "@/utils/supabase/server"

export type CommunityReportRow = {
  id: string
  created_at: string
  reason: string
  details: string | null
  status: "pending" | "reviewing" | "resolved" | "dismissed"
}

type CommunityReportUpdateRow = {
  id: string
  status: CommunityReportRow["status"]
  moderation_notes: string | null
  moderated_by: string | null
  moderated_at: string | null
}

type DynamicQuery = {
  select: (fields: string) => DynamicQuery
  order: (column: string, opts: { ascending: boolean }) => DynamicQuery
  limit: (limit: number) => Promise<{ data: unknown; error: { message: string } | null }>
  update: (patch: Record<string, unknown>) => DynamicQuery
  eq: (column: string, value: unknown) => DynamicQuery
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
}

function fromUnknownTable(supabase: unknown, table: string): DynamicQuery {
  const fromFn = (supabase as { from: (name: string) => DynamicQuery }).from
  return fromFn(table)
}

export async function getCommunityModerationQueue(limit = 100): Promise<CommunityReportRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("community_reports" as never)
    .select("id, created_at, reason, details, status")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown) as CommunityReportRow[]
}

export async function moderateCommunityReport(input: {
  reportId: string
  status: "reviewing" | "resolved" | "dismissed"
  moderationNotes?: string
  moderatedBy: string
}): Promise<CommunityReportUpdateRow> {
  const supabase = await createClient()
  const patch = {
    status: input.status,
    moderation_notes: input.moderationNotes ?? null,
    moderated_by: input.moderatedBy,
    moderated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("community_reports" as never)
    .update(patch as never)
    .eq("id", input.reportId)
    .select("id, status, moderation_notes, moderated_by, moderated_at")
    .single()

  if (error) throw new Error(error.message)
  return (data as unknown) as CommunityReportUpdateRow
}
