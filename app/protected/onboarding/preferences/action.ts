"use server"

import { getCurrentUser } from "@/utils/supabase/getUser"
import { insertPreferences } from "@/lib/db/preferences"
import { redirect } from "next/navigation"
import { JobType, StudyMode } from "@/types/aspirant.types"

export async function savePreferences(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const jobTypes = formData.getAll("job_types") as JobType[]
  const states = formData.getAll("states") as string[]

  const studyMode = formData.get("study_mode") as StudyMode
  const hours = Number(formData.get("hours"))

  await insertPreferences({
    user_id: user.id,
    job_types: jobTypes,
    preferred_states: states,
    study_mode: studyMode,
    study_hours_per_day: hours || null,
  })

  // ⭐ Onboarding COMPLETE
  redirect("/onboarding/complete")
}