/**
 * GET /api/exams/summary
 *
 * Returns personalized exam summary cards for the authenticated user.
 * Backed by public.user_exam_summary view (migration 029).
 *
 * NOTE: The view is named user_exam_summary (not exam_user_summary).
 * Columns come from user_recruitment_state + exam_summary JOINed together.
 * There is no public.exams table — "exam" is a UI term; the canonical
 * table is public.recruitments. See docs/database-domain-model.md.
 *
 * Each card includes:
 *   recruitmentId, examName, applyEndDate, daysToDeadline,
 *   eligibilityStatus, failReasons, isTracked, detailHref
 */

import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("user_exam_summary")
    .select(`
      recruitment_id,
      exam_name,
      year,
      status,
      apply_start_date,
      apply_end_date,
      official_notification_url,
      organization_name,
      organization_type,
      total_vacancies,
      has_any_eligible_post,
      has_conditional_result,
      fail_reasons,
      is_tracked,
      clicked_apply,
      refreshed_at
    `)
    .eq("user_id", user.id)
    .order("has_any_eligible_post", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()

  const cards = (data ?? []).map((row) => {
    const eligibilityStatus = row.has_any_eligible_post
      ? "eligible"
      : row.has_conditional_result
      ? "conditional"
      : "not_eligible"

    const deadline = row.apply_end_date ? new Date(row.apply_end_date).getTime() : null
    const daysToDeadline = deadline != null
      ? Math.max(0, Math.floor((deadline - now) / 86_400_000))
      : null

    return {
      recruitmentId:     row.recruitment_id,
      examName:          row.exam_name ?? null,
      year:              row.year ?? null,
      status:            row.status ?? null,
      applyEndDate:      row.apply_end_date ?? null,
      daysToDeadline,
      officialUrl:       row.official_notification_url ?? null,
      organizationName:  row.organization_name ?? null,
      organizationType:  row.organization_type ?? null,
      totalVacancies:    row.total_vacancies ?? null,
      eligibilityStatus,
      failReasons:       (row.fail_reasons as string[] | null) ?? [],
      isTracked:         row.is_tracked ?? false,
      appliedClick:      row.clicked_apply ?? false,
      detailHref:        `/dashboard/recruitments/${row.recruitment_id}`,
      refreshedAt:       row.refreshed_at ?? null,
    }
  })

  return NextResponse.json({ cards })
}
