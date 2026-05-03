import { createClient } from "@/utils/supabase/server"

export type MissionControlFeedItem = {
  recruitmentId:    string
  recruitmentName:  string | null
  eligibilityStatus: string
  daysToDeadline:   number | null
  priority:         number
  reasonCodes:      string[] | null
  explanation:      string | null
  saved:            boolean
  applied:          boolean
  detailHref:       string
}

export type MissionControlSummary = {
  eligibleNow:     number
  closingThisWeek: number
  conditional:     number
  profileBlockers: number
}

export type MissionControlData = {
  summary: MissionControlSummary
  feed: MissionControlFeedItem[]
  degraded: boolean
  errorCode: "query_failed" | "unexpected" | null
}

const EMPTY: MissionControlData = {
  summary: { eligibleNow: 0, closingThisWeek: 0, conditional: 0, profileBlockers: 0 },
  feed: [],
  degraded: false,
  errorCode: null,
}

/**
 * getMissionControlData — queries user_recruitment_state (migration 027).
 *
 * Returns EMPTY rather than throwing when the view doesn't exist yet or has
 * no rows, so the dashboard still renders during initial rollout.
 */
export async function getMissionControlData(
  userId: string,
  limit = 30,
): Promise<MissionControlData> {
  try {
    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .from("user_exam_summary")
      .select(`
        recruitment_id,
        exam_name,
        has_any_eligible_post,
        has_conditional_result,
        fail_reasons,
        apply_end_date,
        is_tracked,
        clicked_apply
      `)
      .eq("user_id", userId)
      .order("apply_end_date", { ascending: true, nullsFirst: false })
      .limit(limit)

    if (error || !rows) {
      console.error("[lib/db/mission-control/getMissionControlData] query_failed", { userId, error })
      return { ...EMPTY, degraded: true, errorCode: "query_failed" }
    }

    const feed: MissionControlFeedItem[] = rows
      .filter((r) => r.recruitment_id != null)
      .map((r) => {
        const daysToDeadline = getDaysToDeadline(r.apply_end_date)
        const eligibilityStatus = deriveEligibilityStatus(
          r.has_any_eligible_post ?? false,
          r.has_conditional_result ?? false,
        )

        return {
          recruitmentId: r.recruitment_id!,
          recruitmentName: r.exam_name ?? null,
          eligibilityStatus,
          daysToDeadline,
          priority: derivePriority(eligibilityStatus, daysToDeadline),
          reasonCodes: (r.fail_reasons as string[] | null) ?? null,
          explanation: null,
          saved: r.is_tracked ?? false,
          applied: r.clicked_apply ?? false,
          detailHref: `/dashboard/recruitments/${r.recruitment_id}`,
        }
      })
      .sort((a, b) => b.priority - a.priority)

    const summary: MissionControlSummary = {
      eligibleNow:     feed.filter((x) => x.eligibilityStatus === "eligible").length,
      closingThisWeek: feed.filter((x) => x.daysToDeadline != null && x.daysToDeadline <= 7).length,
      conditional:     feed.filter((x) => x.eligibilityStatus === "conditional").length,
      profileBlockers: feed.filter((x) => x.eligibilityStatus === "needs_profile_data").length,
    }

    return { summary, feed, degraded: false, errorCode: null }
  } catch (error) {
    console.error("[lib/db/mission-control/getMissionControlData] unexpected", { userId, error })
    return { ...EMPTY, degraded: true, errorCode: "unexpected" }
  }
}

function deriveEligibilityStatus(hasAnyEligiblePost: boolean, hasConditionalResult: boolean): string {
  if (hasAnyEligiblePost) return "eligible"
  if (hasConditionalResult) return "conditional"
  return "needs_profile_data"
}

function getDaysToDeadline(applyEndDate: string | null): number | null {
  if (!applyEndDate) return null
  const end = new Date(applyEndDate)
  if (Number.isNaN(end.getTime())) return null
  const now = new Date()
  const millis = end.getTime() - now.getTime()
  if (millis < 0) return null
  return Math.ceil(millis / (24 * 60 * 60 * 1000))
}

function derivePriority(eligibilityStatus: string, daysToDeadline: number | null): number {
  const base = eligibilityStatus === "eligible" ? 60 : eligibilityStatus === "conditional" ? 35 : 15
  const urgency = daysToDeadline == null ? 0 : Math.max(0, 30 - Math.min(daysToDeadline, 30))
  return base + urgency
}
