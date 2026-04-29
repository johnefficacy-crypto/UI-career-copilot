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
  feed:    MissionControlFeedItem[]
}

const EMPTY: MissionControlData = {
  summary: { eligibleNow: 0, closingThisWeek: 0, conditional: 0, profileBlockers: 0 },
  feed:    [],
}

/**
 * getMissionControlData — queries user_exam_summary (migration 029).
 *
 * user_exam_summary joins user_recruitment_state (028) with exam_summary (029)
 * so we get both eligibility signals and recruitment metadata in one query.
 *
 * Columns used (actual view schema — do not assume old column names):
 *   recruitment_id, exam_name, apply_end_date
 *   has_any_eligible_post, has_conditional_result, fail_reasons
 *   is_tracked, clicked_apply
 *
 * Returns EMPTY rather than throwing when the view has no rows yet, so the
 * dashboard still renders during initial rollout.
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
        apply_end_date,
        has_any_eligible_post,
        has_conditional_result,
        fail_reasons,
        is_tracked,
        clicked_apply
      `)
      .eq("user_id", userId)
      .limit(limit)

    if (error || !rows) return EMPTY

    const now = Date.now()

    const feed: MissionControlFeedItem[] = rows
      .map((r) => {
        const eligibilityStatus = r.has_any_eligible_post
          ? "eligible"
          : r.has_conditional_result
          ? "conditional"
          : "not_eligible"

        const deadline = r.apply_end_date ? new Date(r.apply_end_date).getTime() : null
        const daysToDeadline = deadline != null
          ? Math.max(0, Math.floor((deadline - now) / 86_400_000))
          : null

        // priority: eligible=3, conditional=2, not_eligible=1; bump by 1 if closing ≤7d
        const basePriority = eligibilityStatus === "eligible" ? 3
          : eligibilityStatus === "conditional" ? 2
          : 1
        const urgencyBoost = daysToDeadline != null && daysToDeadline <= 7 ? 1 : 0
        const priority = basePriority + urgencyBoost

        return {
          recruitmentId:     r.recruitment_id,
          recruitmentName:   (r.exam_name as string | null) ?? null,
          eligibilityStatus,
          daysToDeadline,
          priority,
          reasonCodes:       (r.fail_reasons as string[] | null) ?? null,
          explanation:       null,
          saved:             r.is_tracked  ?? false,
          applied:           r.clicked_apply ?? false,
          detailHref:        `/dashboard/recruitments/${r.recruitment_id}`,
        }
      })
      // Sort: higher priority first; within same priority, urgent deadlines first
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority
        if (a.daysToDeadline != null && b.daysToDeadline != null)
          return a.daysToDeadline - b.daysToDeadline
        if (a.daysToDeadline != null) return -1
        if (b.daysToDeadline != null) return 1
        return 0
      })

    const summary: MissionControlSummary = {
      eligibleNow:     feed.filter((x) => x.eligibilityStatus === "eligible").length,
      closingThisWeek: feed.filter((x) => x.daysToDeadline != null && x.daysToDeadline <= 7).length,
      conditional:     feed.filter((x) => x.eligibilityStatus === "conditional").length,
      profileBlockers: feed.filter((x) => x.eligibilityStatus === "not_eligible").length,
    }

    return { summary, feed }
  } catch {
    return EMPTY
  }
}
