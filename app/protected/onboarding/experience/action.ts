"use server"

// FIX: Removed `cookies()` + `createClient(cookieStore)` — old broken pattern.
// The canonical server client is `await createClient()` with no arguments.
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

interface ExperienceInsert {
  sector: string
  role: string
  organization: string
  start_date: string
  end_date: string | null
  years_experience: number
}

export async function saveExperience(rows: ExperienceInsert[]) {
  // ← FIX: canonical no-arg createClient (was: createClient(cookieStore))
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    // Surface auth errors cleanly rather than throwing
    redirect("/auth/login?error=Session+expired.+Please+sign+in+again.")
  }

  // Attach user_id server-side — never trust the client to send this
  const rowsWithUser = rows.map((r) => ({
    ...r,
    user_id: user.id,
  }))

  const { error } = await supabase
    .from("aspirant_experience")
    .insert(rowsWithUser)

  if (error) {
    redirect(`/onboarding/experience?error=${encodeURIComponent(error.message)}`)
  }

  // FIX: was redirecting to /onboarding/attempts — correct next step is exam attempts
  redirect("/onboarding/attempts")
}