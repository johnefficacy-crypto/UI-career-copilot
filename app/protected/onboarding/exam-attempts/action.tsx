"use server"

/**
 * /onboarding/attempts/action.ts
 *
 * FIXES:
 * 1. Original action.tsx received `rows` as a typed argument from the client —
 *    this bypasses CSRF protection and lets the client fabricate the user_id.
 *    Now uses FormData and resolves the user server-side.
 * 2. Uses canonical `await createClient()` (no cookieStore argument).
 * 3. Redirects on error instead of throwing — keeps UX consistent.
 * 4. File extension changed to .ts (no JSX used).
 */

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

interface ExamAttemptRow {
  user_id: string
  recruitment_id?: string   // link to recruitments table if available
  exam_name: string         // display name fallback
  attempts_used: number
}

export async function saveExamAttempts(formData: FormData) {
  const supabase = await createClient()  // ← canonical no-arg pattern

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login?error=Session+expired.+Please+sign+in+again.")
  }

  // Parse indexed FormData rows: exam_0_name, exam_0_attempts, exam_1_name …
  const rows: ExamAttemptRow[] = []
  let i = 0
  while (formData.get(`exam_${i}_name`)) {
    const examName     = formData.get(`exam_${i}_name`)     as string
    const attemptsUsed = Number(formData.get(`exam_${i}_attempts`) ?? 0)

    if (examName.trim()) {
      rows.push({
        user_id:       user.id,
        exam_name:     examName.trim(),
        attempts_used: attemptsUsed,
      })
    }
    i++
  }

  if (rows.length > 0) {
    // user_exam_attempts maps to the schema defined in the handover doc.
    // If your table uses a different name, update here — not in the client.
    const { error } = await supabase
      .from("user_exam_attempts")
      .upsert(rows, { onConflict: "user_id,exam_name" })

    if (error) {
      redirect(`/onboarding/attempts?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Advance to next onboarding step
  redirect("/onboarding/preferences")
}