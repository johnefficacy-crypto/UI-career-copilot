"use server"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "../actions"

export async function saveIdentity(formData: FormData) {
  const { user, supabase } = await getAuthenticatedUser()

  const payload = {
    id: user.id,
    dob: formData.get("dob") as string,
    gender: formData.get("gender") as string,
    category: formData.get("category") as string,
    pwbd: formData.get("pwbd") === "true",
    domicile_state: formData.get("domicile_state") as string,
    core_identity_completed: true,
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })

  if (error) {
    throw new Error(error.message)
  }

  redirect("/onboarding/education")
}