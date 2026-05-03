/**
 * GET /api/exams/summary
 *
 * Returns personalized exam summary cards for the authenticated user.
 * Backed by the user_exam_summary view (migration 029).
 *
 * Each card includes:
 *   examId, slug, title, currentCycleLabel, vacancyTrend,
 *   eligibleCount, conditionalCount, blockedCount, formStatus, detailHref
 */

import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { computeFormStatus } from "@/lib/exams/form-status"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("user_exam_summary")
    .select("*")
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const cards = (data ?? []).map((row) => ({
    examId:             row.recruitment_id,
    slug:               String(row.recruitment_id),
    title:              row.exam_name,
    currentCycleLabel:  row.year ? String(row.year) : null,
    vacancyTrend:       "insufficient" as const,
    eligibleCount:      row.has_any_eligible_post ? 1 : 0,
    conditionalCount:   row.has_conditional_result ? 1 : 0,
    blockedCount:       row.has_any_eligible_post || row.has_conditional_result ? 0 : 1,
    formStatus:         computeFormStatus({
                          filledAt:    null,
                          declinedAt:  null,
                          firstShownAt: null,
                        }),
    detailHref:         `/dashboard/recruitments/${row.recruitment_id}`,
  }))

  return NextResponse.json({ cards })
}
