import type { DashboardData }            from "@/lib/db/dashboard"
import { DashboardNav }                   from "./DashboardNav"
import { ProfileCard }                    from "./ProfileCard"
import { ExamTargetCard }                 from "./ExamTargetCard"
import { NotificationsFeed }              from "./NotificationsFeed"
import { StatsBar }                       from "./StatsBar"
import { StudyPlanWidget }                from "./StudyPlanWidget"
import { SkillTestWidget }                from "./SkillTestWidget"
import { AiChatWidget }                   from "@/components/chat/AiChatWidget"
import type { getUserPlans }              from "@/lib/db/study-planner"
import type { getEligibleRecruitments }   from "@/lib/eligibility/runner"

type UserPlansResult            = Awaited<ReturnType<typeof getUserPlans>>
type EligibleRecruitmentsResult = Awaited<ReturnType<typeof getEligibleRecruitments>>

interface Props {
  data:                 DashboardData
  userId:               string
  eligibleRecruitments: EligibleRecruitmentsResult
  primaryPlan:          UserPlansResult[number] | null
  planStats:            null
  lastChatSessionId:    string | null
  children?:            React.ReactNode
}

export function DashboardShell({
  data,
  userId,
  eligibleRecruitments,
  primaryPlan,
  planStats,
  lastChatSessionId,
}: Props) {
  const { profile, education, experience, preferences, targets, attempts, notifications } = data

  const firstName = profile?.full_name?.split(" ")[0] ?? "Aspirant"
  const isPaid    = profile?.plan_id === "pro" || profile?.plan_id === "elite"

  // ── Derive eligibleExamIds for SkillTestWidget ─────────────────────────────
  // eligibleRecruitments comes from the eligibility runner — it's an array of
  // recruitment objects. SkillTestWidget needs string[] of exam registry IDs.
  // We map recruitment names to registry IDs with a best-effort name match.
  const EXAM_NAME_TO_REGISTRY_ID: Record<string, string> = {
    "sebi":    "sebi-grade-a",
    "rbi":     "rbi-grade-b",
    "nabard":  "nabard-grade-a",
    "ssc cgl": "ssc-cgl",
    "ibps po": "ibps-po",
    "sbi po":  "sbi-po",
    "upsc":    "upsc-cse",
    "nda":     "nda",
    "rrb":     "rrb-ntpc",
    "ibps clerk": "ibps-clerk",
  }

  const eligibleExamIds: string[] = Array.isArray(eligibleRecruitments)
    ? eligibleRecruitments
        .filter((r) => r.is_eligible)
        .map((r) => {
          const name = ((r.posts as any)?.recruitments?.name ?? "").toLowerCase()
          const matched = Object.entries(EXAM_NAME_TO_REGISTRY_ID).find(
            ([key]) => name.includes(key)
          )
          return matched?.[1] ?? null
        })
        .filter((id): id is string => id !== null)
    : []

  // Derive targetExamId from profile target_exam field
  const targetExamName = (profile?.target_exam ?? "").toLowerCase()
  const targetExamId   = Object.entries(EXAM_NAME_TO_REGISTRY_ID).find(
    ([key]) => targetExamName.includes(key)
  )?.[1] ?? null

  const percentComplete = planStats?.percentComplete ?? 0

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <DashboardNav
        fullName={profile?.full_name ?? null}
        planId={profile?.plan_id ?? "free"}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={profile?.is_admin ?? false}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1
            className="text-3xl text-white font-semibold tracking-tight mb-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {primaryPlan
              ? `Preparing for ${primaryPlan.exam_name} · ${planStats?.streak ?? 0} day study streak`
              : "Complete your profile to get personalised exam matches."}
          </p>
        </div>

        {/* Stats bar */}
        <StatsBar
          targets={targets}
          attempts={attempts}
          education={education}
          preferences={preferences}
        />

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left + centre — 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <ExamTargetCard targets={targets} attempts={attempts} />
            <NotificationsFeed
              notifications={notifications}
              preferences={preferences}
              eligibleRecruitments={eligibleRecruitments}
            />

            {/* SkillTestWidget — correct props ───────────────────────── */}
            <SkillTestWidget
              eligibleExamIds={eligibleExamIds}   // ✅ string[]
              targetExamId={targetExamId}          // ✅ string | null
              isPaid={isPaid}                      // ✅ boolean
              userFirstName={firstName}            // ✅ string | null
            />
          </div>

          {/* Right col */}
          <div className="flex flex-col gap-5">
            <ProfileCard
              profile={profile}
              education={education}
              experience={experience}
            />
            <StudyPlanWidget
              plan={
                primaryPlan
                  ? {
                      id:          primaryPlan.id,
                      exam_name:   primaryPlan.exam_name,
                      study_weeks: primaryPlan.study_weeks,
                    }
                  : null
              }
              percentComplete={percentComplete}
              streak={planStats?.streak ?? 0}
              targetExam={profile?.target_exam ?? undefined}
            />
            <AiChatWidget
              isPaid={isPaid}
              sessionCount={lastChatSessionId ? 1 : 0}
              lastSessionId={lastChatSessionId}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}