import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getDashboardData } from "@/lib/db/dashboard"
import { getEligibleRecruitments } from "@/lib/eligibility/runner"
import { getUserPlans, getPlanStats } from "@/lib/db/study-planner"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export const metadata = { title: "Dashboard — Career Copilot" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [data, eligibleRecruitments, userPlans] = await Promise.all([
    getDashboardData(user.id),
    getEligibleRecruitments(user.id),
    getUserPlans(user.id),
  ])

  if (!data.profile?.onboarding_completed) redirect("/onboarding")

  // Get stats for the primary active plan
  const primaryPlan = userPlans[0] ?? null
  const planStats = primaryPlan
    ? await getPlanStats(primaryPlan.id, user.id)
    : null

  return (
    <DashboardShell
      data={data}
      userId={user.id}
      eligibleRecruitments={eligibleRecruitments}
      primaryPlan={primaryPlan}
      planStats={planStats}
    />
  )
}