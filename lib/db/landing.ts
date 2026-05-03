import { createClient } from "@/utils/supabase/server"

export type LandingRecruitment = {
  id: string
  name: string
  notification_date: string | null
  apply_end_date: string | null
  status: string | null
  organizations: { name: string | null } | null
}

export async function getLandingRecruitments(limit = 6): Promise<LandingRecruitment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("recruitments")
    .select(`
      id,
      name,
      notification_date,
      apply_end_date,
      status,
      organizations(name)
    `)
    .in("status", ["published", "open", "upcoming", "closed"])
    .order("notification_date", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[landing] failed to fetch recruitments", error)
    return []
  }

  return data ?? []
}
