import { createClient } from "@/utils/supabase/server"
import type { Json } from "@/types/supabase"

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * Verify the current user is an admin. Throws if not.
 * Call at the top of every admin server action.
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("UNAUTHENTICATED")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) throw new Error("UNAUTHORIZED")
  return user.id
}

// ─── Organizations ────────────────────────────────────────────────────────────

export async function getAllOrganizations() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .order("name")
  return data ?? []
}

export async function createOrganization(input: {
  name: string
  type: string
  state?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("organizations")
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateOrganization(id: string, input: {
  name?: string
  type?: string
  state?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("organizations")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

// ─── Recruitments ─────────────────────────────────────────────────────────────

export async function getAllRecruitmentsAdmin() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("recruitments")
    .select(`
      *,
      organizations ( name, type ),
      posts ( id, post_name, group_type )
    `)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getRecruitmentById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("recruitments")
    .select(`
      *,
      organizations ( id, name, type ),
      exam_stages ( id, stage_name, stage_order ),
      posts (
        id, post_name, group_type, pay_level, job_type,
        education_criteria ( * ),
        age_criteria ( * ),
        attempt_limits ( * ),
        vacancies ( * ),
        salary_details ( * ),
        training_details ( * )
      )
    `)
    .eq("id", id)
    .single()
  return data
}

export async function createRecruitment(input: {
  organization_id: string
  name: string
  year: number
  notification_date?: string | null
  apply_start_date?: string | null
  apply_end_date?: string | null
  status?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recruitments")
    .insert({ ...input, status: input.status ?? "upcoming" })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateRecruitment(id: string, input: Partial<{
  name: string
  year: number
  notification_date: string | null
  apply_start_date: string | null
  apply_end_date: string | null
  status: string
}>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("recruitments")
    .update(input)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteRecruitment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("recruitments")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(input: {
  recruitment_id: string
  post_name: string
  group_type?: string | null
  pay_level?: string | null
  job_type?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updatePost(id: string, input: Partial<{
  post_name: string
  group_type: string | null
  pay_level: string | null
  job_type: string | null
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from("posts").update(input).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deletePost(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("posts").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

// ─── Education criteria ───────────────────────────────────────────────────────

export async function upsertEducationCriteria(postId: string, input: {
  min_qualification_level?: string | null
  min_percentage?: number | null
  allowed_disciplines?: Json | null }) {
  const supabase = await createClient()

  // Delete existing then re-insert (simpler than true upsert here)
  await supabase.from("education_criteria").delete().eq("post_id", postId)

  const { error } = await supabase.from("education_criteria").insert({
    post_id: postId,
    ...input,
  })
  if (error) throw new Error(error.message)
}

// ─── Age criteria ─────────────────────────────────────────────────────────────

export async function upsertAgeCriteria(postId: string, input: {
  min_age?: number | null
  max_age?: number | null
  cutoff_date?: string | null
}) {
  const supabase = await createClient()
  await supabase.from("age_criteria").delete().eq("post_id", postId)
  const { error } = await supabase.from("age_criteria").insert({ post_id: postId, ...input })
  if (error) throw new Error(error.message)
}

// ─── Attempt limits ───────────────────────────────────────────────────────────

export async function replaceAttemptLimits(postId: string, limits: Array<{
  category: string | null
  max_attempts: number
}>) {
  const supabase = await createClient()
  await supabase.from("attempt_limits").delete().eq("post_id", postId)
  if (limits.length > 0) {
    const { error } = await supabase.from("attempt_limits").insert(
      limits.map((l) => ({ post_id: postId, ...l }))
    )
    if (error) throw new Error(error.message)
  }
}

// ─── Vacancies ────────────────────────────────────────────────────────────────

export async function replaceVacancies(postId: string, vacancies: Array<{
  category: string | null
  vacancy_count: number
  state?: string | null
}>) {
  const supabase = await createClient()
  await supabase.from("vacancies").delete().eq("post_id", postId)
  if (vacancies.length > 0) {
    const { error } = await supabase.from("vacancies").insert(
      vacancies.map((v) => ({ post_id: postId, ...v }))
    )
    if (error) throw new Error(error.message)
  }
}

// ─── Salary details ───────────────────────────────────────────────────────────

export async function upsertSalaryDetails(postId: string, input: {
  pay_level?: string | null
  basic_pay_min?: number | null
  basic_pay_max?: number | null
  grade_pay?: number | null
  allowances?: string | null
  in_hand_estimate?: string | null
}) {
  const supabase = await createClient()
  await supabase.from("salary_details").delete().eq("post_id", postId)
  const { error } = await supabase.from("salary_details").insert({ post_id: postId, ...input })
  if (error) throw new Error(error.message)
}

// ─── Exam stages ──────────────────────────────────────────────────────────────

export async function replaceExamStages(recruitmentId: string, stages: Array<{
  stage_name: string
  stage_order: number
}>) {
  const supabase = await createClient()
  await supabase.from("exam_stages").delete().eq("recruitment_id", recruitmentId)
  if (stages.length > 0) {
    const { error } = await supabase.from("exam_stages").insert(
      stages.map((s) => ({ recruitment_id: recruitmentId, ...s }))
    )
    if (error) throw new Error(error.message)
  }
}

// ─── Stats for admin dashboard ────────────────────────────────────────────────

export async function getAdminStats() {
  const supabase = await createClient()

  const [orgsRes, recRes, postsRes, usersRes, eligRes] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("recruitments").select("id, status", { count: "exact" }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("eligibility_results")
      .select("is_eligible", { count: "exact" })
      .eq("is_eligible", true),
  ])

  const openCount = recRes.data?.filter((r) => r.status === "open").length ?? 0
  const upcomingCount = recRes.data?.filter((r) => r.status === "upcoming").length ?? 0

  return {
    organizations: orgsRes.count ?? 0,
    recruitments: recRes.count ?? 0,
    openRecruitments: openCount,
    upcomingRecruitments: upcomingCount,
    posts: postsRes.count ?? 0,
    totalUsers: usersRes.count ?? 0,
    eligibleMatches: eligRes.count ?? 0,
  }
}