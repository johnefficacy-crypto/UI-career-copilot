/**
 * Eligibility Runner
 *
 * Loads all necessary data from Supabase for a given user,
 * runs the eligibility engine against all active posts,
 * and writes results to the eligibility_results cache table.
 *
 * Called:
 *  - After onboarding completes (first run)
 *  - When user updates their profile
 *  - On demand from the dashboard
 *  - By an admin when new recruitments are added
 *
 * Phase 3B changes:
 *  - Fetch organizations.state via posts → recruitments → organizations join
 *  - Map org_state into PostCriteria for domicile check
 *  - Store is_conditional in eligibility_results upsert
 *  - getEligibleRecruitments also returns conditional results
 */

import { createClient } from "@/utils/supabase/server"
import {
  checkEligibilityBatch,
  type PostCriteria,
  type UserProfile,
  type UserEducation,
  type UserExamAttempts,
} from "./engine"

/**
 * Run eligibility check for a single user against all open/upcoming posts.
 * Writes results to eligibility_results table.
 */
export async function runEligibilityForUser(userId: string): Promise<{
  processed: number
  eligible: number
  conditional: number
  errors: string[]
}> {
  const supabase = await createClient()
  const errors: string[] = []

  // ── 1. Load user data ──────────────────────────────────────────────────
  const [profileRes, educationRes, attemptsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("aspirant_education")
      .select("level, degree, stream, percentage, cgpa, is_completed")
      .eq("user_id", userId),
    supabase
      .from("user_exam_attempts")
      .select("recruitment_id, attempts_used")
      .eq("user_id", userId),
  ])

  if (!profileRes.data) {
    return { processed: 0, eligible: 0, conditional: 0, errors: ["Profile not found"] }
  }

  const profile = profileRes.data as UserProfile
  const education = (educationRes.data ?? []) as UserEducation[]
  const examAttempts = (attemptsRes.data ?? []) as UserExamAttempts[]

  // ── 2. Load all active posts with their criteria + org state ──────────
  // Phase 3B: include organizations(state) so domicile check works.
  // org_state is non-null for state PSC orgs, null for central govt.
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      id,
      recruitment_id,
      recruitments!inner (
        status,
        organizations ( state )
      ),
      age_criteria ( min_age, max_age, cutoff_date ),
      education_criteria ( min_qualification_level, min_percentage, allowed_disciplines ),
      attempt_limits ( category, max_attempts )
    `)
    .in("recruitments.status", ["open", "upcoming"])

  if (postsError || !posts) {
    return {
      processed: 0, eligible: 0, conditional: 0,
      errors: ["Failed to load posts: " + postsError?.message],
    }
  }

  // ── 3. Map to PostCriteria shape ──────────────────────────────────────
  const postCriteriaList: PostCriteria[] = posts.map((p: any) => {
    // Supabase returns recruitments as array from !inner join
    const recruitment = Array.isArray(p.recruitments) ? p.recruitments[0] : p.recruitments
    const org = Array.isArray(recruitment?.organizations)
      ? recruitment.organizations[0]
      : recruitment?.organizations

    return {
      post_id: p.id,
      recruitment_id: p.recruitment_id,
      age_criteria: p.age_criteria?.[0] ?? null,
      education_criteria: p.education_criteria?.[0] ?? null,
      attempt_limits: p.attempt_limits ?? [],
      org_state: org?.state ?? null,   // Phase 3B: null = central govt, string = state PSC
    }
  })

  // ── 4. Run batch engine ───────────────────────────────────────────────
  const results = checkEligibilityBatch(profile, education, examAttempts, postCriteriaList)

  // ── 5. Write results to cache ─────────────────────────────────────────
  const upsertRows = results.map((r) => ({
    user_id: userId,
    post_id: r.post_id,
    recruitment_id: r.recruitment_id,
    is_eligible: r.result.is_eligible,
    is_conditional: r.result.is_conditional,   // Phase 3B
    fail_reasons: r.result.fail_reasons,
    computed_at: new Date().toISOString(),
  }))

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("eligibility_results")
      .upsert(upsertRows, { onConflict: "user_id,post_id" })

    if (upsertError) {
      errors.push("Cache write failed: " + upsertError.message)
    }
  }

  const eligible = results.filter((r) => r.result.is_eligible).length
  const conditional = results.filter((r) => r.result.is_conditional).length

  return { processed: results.length, eligible, conditional, errors }
}

/**
 * Get cached eligibility results for a user — for the dashboard feed.
 * Returns posts the user IS eligible for OR conditionally eligible for.
 * Ordered: eligible first, then conditional.
 */
export async function getEligibleRecruitments(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("eligibility_results")
    .select(`
      post_id,
      recruitment_id,
      is_eligible,
      is_conditional,
      fail_reasons,
      computed_at,
      posts (
        post_name,
        group_type,
        pay_level,
        salary_details ( pay_level, basic_pay_min, basic_pay_max, in_hand_estimate ),
        vacancies ( category, vacancy_count ),
        recruitments (
          name,
          year,
          notification_date,
          apply_start_date,
          apply_end_date,
          status,
          organizations ( name, type )
        )
      )
    `)
    .eq("user_id", userId)
    .or("is_eligible.eq.true,is_conditional.eq.true")   // Phase 3B: include conditional
    .order("is_eligible", { ascending: false })          // eligible first
    .order("computed_at", { ascending: false })

  if (error) return []
  return data ?? []
}

/**
 * Get ALL eligibility results for a user (eligible + conditional + ineligible).
 * Used on the "All Exams" page to show why certain exams don't match.
 */
export async function getAllEligibilityResults(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("eligibility_results")
    .select(`
      post_id,
      recruitment_id,
      is_eligible,
      is_conditional,
      fail_reasons,
      computed_at,
      posts (
        post_name,
        group_type,
        pay_level,
        recruitments (
          name,
          year,
          apply_end_date,
          status,
          organizations ( name, type )
        )
      )
    `)
    .eq("user_id", userId)
    .order("is_eligible", { ascending: false })
    .order("is_conditional", { ascending: false })

  if (error) return []
  return data ?? []
}
