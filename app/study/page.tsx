import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function RoutePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signup?intent=study")
  }

  redirect("/dashboard/study")
}
