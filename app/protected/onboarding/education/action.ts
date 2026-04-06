"use server"

/**
 * /onboarding/education/action.ts
 *
 * FIXES:
 * 1. Was using `getCurrentUser()` — a helper of unknown provenance that may
 *    use the old broken createClient(cookieStore) pattern internally.
 *    Replaced with the canonical `await createClient()` directly.
 * 2. Redirects cleanly on auth failure instead of throwing.
 * 3. Types are inlined so there's no dependency on external type files
 *    that may differ between environments.
 */

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

type EducationLevel = "10TH" | "12TH" | "GRADUATION" | "POST_GRADUATION" | "DOCTORATE"

interface EducationRow {
  user_id:            string
  level:              EducationLevel
  board_university?:  string
  qualification_type?: string
  specialization?:    string
  percentage?:        number
  passing_year?:      number
}

export async function saveEducation(formData: FormData) {
  // ← FIX: canonical pattern — no getCurrentUser() helper, no cookieStore arg
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login?error=Session+expired.+Please+sign+in+again.")
  }

  const rows: EducationRow[] = []

  // ── 10th ─────────────────────────────────────────────────────────────────
  rows.push({
    user_id:          user.id,
    level:            "10TH",
    board_university: formData.get("tenth_board")      as string | undefined ?? undefined,
    percentage:       Number(formData.get("tenth_percentage")) || undefined,
    passing_year:     Number(formData.get("tenth_year"))       || undefined,
  })

  // ── 12th ─────────────────────────────────────────────────────────────────
  rows.push({
    user_id:          user.id,
    level:            "12TH",
    board_university: formData.get("twelfth_board")      as string | undefined ?? undefined,
    percentage:       Number(formData.get("twelfth_percentage")) || undefined,
    passing_year:     Number(formData.get("twelfth_year"))       || undefined,
  })

  // ── Dynamic degree rows ───────────────────────────────────────────────────
  let i = 0
  while (formData.get(`degree_${i}_qualification`)) {
    rows.push({
      user_id:             user.id,
      level:               "GRADUATION",
      qualification_type:  formData.get(`degree_${i}_qualification`) as string,
      specialization:      formData.get(`degree_${i}_specialization`) as string,
      board_university:    formData.get(`degree_${i}_university`)     as string,
      percentage:          Number(formData.get(`degree_${i}_percentage`)) || undefined,
      passing_year:        Number(formData.get(`degree_${i}_year`))       || undefined,
    })
    i++
  }

  // Delete existing rows for this user first (replace pattern — idempotent)
  await supabase
    .from("aspirant_education")
    .delete()
    .eq("user_id", user.id)

  const { error } = await supabase
    .from("aspirant_education")
    .insert(rows)

  if (error) {
    redirect(`/onboarding/education?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/onboarding/certifications")
}