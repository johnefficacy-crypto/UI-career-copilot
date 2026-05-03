import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getUserPlans, getPlanStats } from "@/lib/db/study-planner"
import { getUserMockTests } from "@/lib/db/mock-tests"
import { StudyPrototypePage } from "@/components/dashboard/StudyPrototypePage"

export const metadata = { title: "Study — Career Copilot" }

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const plans = await getUserPlans(user.id)
  const primaryPlan = plans[0] ?? null
  const planStats = primaryPlan ? await getPlanStats(primaryPlan.id, user.id).catch(() => null) : null
  const mockTests = await getUserMockTests(user.id, primaryPlan?.id).catch(() => [])

  return <StudyPrototypePage primaryPlan={primaryPlan} planStats={planStats} mockTests={mockTests.slice(0, 4)} />
}
