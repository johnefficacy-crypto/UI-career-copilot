/**
 * app/dashboard/page.tsx
 *
 * FIX: Removed `children` from <DashboardShell> — DashboardShell does not
 * accept children in its Props interface, so passing <AiChatWidget> as a
 * child caused:
 *   "Property 'children' does not exist on type 'IntrinsicAttributes & Props'"
 *
 * Correct approach: pass the chat widget data as a dedicated prop
 * `chatWidget` on DashboardShell, then render <AiChatWidget> inside
 * DashboardShell's own JSX where it belongs in the grid.
 *
 * TWO CHANGES required (both shown here):
 *  1. This file (dashboard/page.tsx)  — pass chatWidget prop, no children
 *  2. DashboardShell.tsx              — add chatWidget to Props, render it
 */

import { redirect }               from "next/navigation"
import { createClient }           from "@/utils/supabase/server"
import { getDashboardData }       from "@/lib/db/dashboard"
import { getEligibleRecruitments } from "@/lib/eligibility/runner"
import { getUserPlans }           from "@/lib/db/study-planner"
import { getUserChatSessions }    from "@/lib/db/chat"
import { DashboardShell }         from "@/components/dashboard/DashboardShell"
export const dynamic  = "force-dynamic"
export const metadata = { title: "Dashboard — Career Copilot" }

export default async function DashboardPage() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // ── Parallel fetch ─────────────────────────────────────────────────────────
  const [data, eligibleRecruitments, userPlans, chatSessions] = await Promise.all([
    getDashboardData(user.id),
    getEligibleRecruitments(user.id),
    getUserPlans(user.id),
    getUserChatSessions(user.id, 5),
  ])

  if (!data.profile?.onboarding_completed) redirect("/onboarding")

  // ── Derived values ─────────────────────────────────────────────────────────
  const isPaid      = data.profile?.plan_id === "pro" || data.profile?.plan_id === "elite"
  const lastSession = chatSessions[0] ?? null
  const primaryPlan = userPlans.find((p) => p.status === "active") ?? userPlans[0] ?? null

  return (
    <DashboardShell
      data={data}
      userId={user.id}
      eligibleRecruitments={eligibleRecruitments}
      primaryPlan={primaryPlan}
      planStats={null}
      lastChatSessionId={lastSession?.id ?? null}
      // Pass the three values AiChatWidget needs as a single prop object.
      // DashboardShell renders <AiChatWidget> internally using these values.
      chatWidget={{
        isPaid,
        sessionCount:  chatSessions.length,
        lastSessionId: lastSession?.id ?? null,
      }}
    />
  )
}