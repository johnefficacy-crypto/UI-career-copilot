"use server"

/**
 * /onboarding/certifications/action.ts
 *
 * FIXES:
 * 1. Removed all commented-out dead code (old version that used EducationRow).
 * 2. Was using `getCurrentUser()` helper — replaced with canonical createClient().
 * 3. File was named action.tsx (no JSX) — rename to action.ts.
 * 4. Redirects on failure rather than throwing raw errors to the client.
 */

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

interface CertificationRow {
  user_id:      string
  certification_name: string
  issuing_body: string
  year_completed: number | null
  is_active:    boolean
}

export async function saveCertifications(formData: FormData) {
  // ← FIX: canonical no-arg createClient (was: getCurrentUser() helper)
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login?error=Session+expired.+Please+sign+in+again.")
  }

  const rows: CertificationRow[] = []
  let i = 0

  while (formData.get(`cert_${i}_name`)) {
    const name = (formData.get(`cert_${i}_name`) as string).trim()
    if (name) {
      rows.push({
        user_id:            user.id,
        certification_name: name,
        issuing_body:       (formData.get(`cert_${i}_org`)  as string | null) ?? "",
        year_completed:     Number(formData.get(`cert_${i}_year`)) || null,
        is_active:          true,
      })
    }
    i++
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("aspirant_certifications")
      .insert(rows)

    if (error) {
      redirect(`/onboarding/certifications?error=${encodeURIComponent(error.message)}`)
    }
  }

  redirect("/onboarding/experience")
}