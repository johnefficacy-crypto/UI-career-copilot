/**
 * supabase/functions/eligibility-consumer/index.ts
 *
 * Deno Edge Function — consumes eligibility_recompute_queue
 * Deploy: supabase functions deploy eligibility-consumer
 * Trigger: pg_cron every 5 minutes (add via Supabase Dashboard → Cron Jobs)
 *   schedule: "*5 * * * *"
 *   command:  select net.http_post(url := 'https://<project>.supabase.co/functions/v1/eligibility-consumer', headers := '{"Authorization":"Bearer <service_role_key>"}', body := '{}');
 *
 * Or call it manually after each admin approval via:
 *   supabase.functions.invoke('eligibility-consumer')
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BATCH_SIZE = 20
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // ── 1. Claim a batch (set to 'processing' atomically) ─────────────────────
  const { data: batch, error: fetchErr } = await supabase
    .from("eligibility_recompute_queue")
    .select("id, user_id, recruitment_id, reason")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchErr) {
    return Response.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!batch?.length) {
    return Response.json({ processed: 0, message: "queue empty" })
  }

  const ids = batch.map((r: { id: string }) => r.id)

  await supabase
    .from("eligibility_recompute_queue")
    .update({ status: "processing" })
    .in("id", ids)

  // ── 2. Process each item ───────────────────────────────────────────────────
  let succeeded = 0
  let failed    = 0

  for (const item of batch) {
    try {
      // Load user profile + education
      const [profileRes, eduRes, attemptsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", item.user_id).single(),
        supabase.from("aspirant_education").select("*").eq("user_id", item.user_id),
        supabase.from("user_exam_attempts").select("*").eq("user_id", item.user_id),
      ])

      if (!profileRes.data) throw new Error("profile not found")

      // Load posts for this recruitment with criteria
      const { data: posts } = await supabase
        .from("posts")
        .select(`
          id,
          recruitment_id,
          age_criteria ( min_age, max_age, cutoff_date ),
          education_criteria ( min_qualification_level, allowed_disciplines ),
          attempt_limits ( category, max_attempts )
        `)
        .eq("recruitment_id", item.recruitment_id)

      if (!posts?.length) {
        // No posts = no criteria to check; mark eligible by default
        await supabase
          .from("eligibility_recompute_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", item.id)
        succeeded++
        continue
      }

      const profile  = profileRes.data
      const education = eduRes.data ?? []
      const attempts  = attemptsRes.data ?? []

      // Run eligibility for each post
      const upsertRows = []
      for (const post of posts) {
        const result = checkPostEligibility(profile, education, attempts, post as PostWithCriteria)
        upsertRows.push({
          user_id:        item.user_id,
          post_id:        post.id,
          recruitment_id: item.recruitment_id,
          is_eligible:    result.is_eligible,
          fail_reasons:   result.fail_reasons,
          computed_at:    new Date().toISOString(),
        })
      }

      if (upsertRows.length) {
        const { error: upsertErr } = await supabase
          .from("eligibility_results")
          .upsert(upsertRows, { onConflict: "user_id,post_id" })
        if (upsertErr) throw new Error(upsertErr.message)
      }

      await supabase
        .from("eligibility_recompute_queue")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", item.id)

      succeeded++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[eligibility-consumer] item ${item.id} failed: ${msg}`)
      await supabase
        .from("eligibility_recompute_queue")
        .update({ status: "failed" })
        .eq("id", item.id)
      failed++
    }
  }

  return Response.json({ processed: batch.length, succeeded, failed })
})

// ── Minimal eligibility check (mirrors engine.ts logic) ──────────────────────
// Keep this in sync with lib/eligibility/engine.ts
// If engine.ts logic changes, update here too.

interface PostWithCriteria {
  id: string
  age_criteria:       { min_age: number | null; max_age: number | null; cutoff_date: string | null }[]
  education_criteria: { min_qualification_level: string | null }[]
  attempt_limits:     { category: string; max_attempts: number }[]
}

interface Profile {
  date_of_birth: string | null
  dob:           string | null
  category:      string | null
  nationality:   string | null
}

interface Education {
  level:         string
  is_completed:  boolean
}

interface ExamAttempt {
  recruitment_id: string
  attempts_used:  number
}

interface EligibilityResult {
  is_eligible:  boolean
  fail_reasons: string[]
}

const EDU_RANK: Record<string, number> = {
  "10th": 1, "12th": 2, "diploma": 3, "iti": 3,
  "graduation": 4, "postgraduate": 5, "phd": 6, "professional": 4,
}

function checkPostEligibility(
  profile: Profile,
  education: Education[],
  attempts: ExamAttempt[],
  post: PostWithCriteria,
): EligibilityResult {
  const fail: string[] = []

  // Age check
  const ageCrit = post.age_criteria?.[0]
  if (ageCrit && (ageCrit.min_age || ageCrit.max_age)) {
    const dob = profile.date_of_birth ?? profile.dob
    if (dob) {
      const cutoff = ageCrit.cutoff_date ? new Date(ageCrit.cutoff_date) : new Date()
      const age    = Math.floor((cutoff.getTime() - new Date(dob).getTime()) / (365.25 * 86400000))
      if (ageCrit.min_age && age < ageCrit.min_age) fail.push(`age_too_young`)
      if (ageCrit.max_age && age > ageCrit.max_age) fail.push(`age_too_old`)
    }
  }

  // Education check
  const eduCrit = post.education_criteria?.[0]
  if (eduCrit?.min_qualification_level) {
    const required = EDU_RANK[eduCrit.min_qualification_level] ?? 4
    const highest  = Math.max(0, ...education
      .filter((e) => e.is_completed)
      .map((e) => EDU_RANK[e.level] ?? 0))
    if (highest < required) fail.push(`education_below_required`)
  }

  return { is_eligible: fail.length === 0, fail_reasons: fail }
}