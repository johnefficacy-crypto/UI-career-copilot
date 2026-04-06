"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type DB = Database // you can replace later with generated types

// Shared helper for all onboarding steps
export async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  return { user, supabase }
}

// Ensures profile row exists (fixes dashboard bypass + deletion bug)
export async function ensureProfileRow(
  userId: string,
  supabase: SupabaseClient<DB>
) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single()

  if (!data) {
    await supabase.from("profiles").insert({ id: userId })
  }
}

// STEP 0 → Save basic profile
export async function saveProfile(formData: FormData) {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    if (!user) throw new Error("User not found")

    // Ensure blank row exists first
    await ensureProfileRow(user.id, supabase)

    const profileData = {
      id: user.id,
      full_name: formData.get("full_name") as string,
      career_stage: formData.get("career_stage") as string,
      target_type: formData.get("target_type") as string,
      target_exam: formData.get("target_exam") as string,
      graduation_year: formData.get("graduation_year")
        ? Number(formData.get("graduation_year"))
        : null,
      onboarding_step: 1,
      onboarding_completed: false,
    }

    const { error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", user.id)

    if (error) throw error
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save profile"
    redirect(`/onboarding?error=${encodeURIComponent(message)}`)
  }

  // Move to next step
  redirect("/onboarding/identity")
}