"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireAdminRole, logAdminAction, createOrganization, updateOrganization, createRecruitment, updateRecruitment, deleteRecruitment, createPost, updatePost, deletePost, upsertEducationCriteria, upsertAgeCriteria, replaceAttemptLimits, replaceVacancies, upsertSalaryDetails, replaceExamStages } from "@/lib/db/admin"
import type { AdminRole } from "@/lib/db/admin"
import { runEligibilityForUser } from "@/lib/eligibility/runner"
import { createClient } from "@/utils/supabase/server"

// ─── Helper ───────────────────────────────────────────────────────────────────

function adminRedirectOnError(path: string, err: unknown): never {
  const msg = err instanceof Error ? err.message : "Unknown error"
  if (msg === "UNAUTHENTICATED") redirect("/login")
  if (msg === "UNAUTHORIZED") redirect("/dashboard")
  redirect(`${path}?error=${encodeURIComponent(msg)}`)
}

// ─── Organization actions ─────────────────────────────────────────────────────

export async function adminCreateOrganization(formData: FormData) {
  try {
    await requireAdmin()
    await createOrganization({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      state: (formData.get("state") as string) || null,
    })
    revalidatePath("/admin/organizations")
  } catch (err) {
    adminRedirectOnError("/admin/organizations/new", err)
  }
  redirect("/admin/organizations")
}

export async function adminUpdateOrganization(formData: FormData) {
  const id = formData.get("id") as string
  try {
    await requireAdmin()
    await updateOrganization(id, {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      state: (formData.get("state") as string) || null,
    })
    revalidatePath("/admin/organizations")
  } catch (err) {
    adminRedirectOnError(`/admin/organizations/${id}/edit`, err)
  }
  redirect("/admin/organizations")
}

// ─── Recruitment actions ──────────────────────────────────────────────────────

export async function adminCreateRecruitment(formData: FormData) {
  try {
    const ctx = await requireAdminRole("recruitments")
    const input = {
      organization_id: formData.get("organization_id") as string,
      name: formData.get("name") as string,
      year: Number(formData.get("year")),
      notification_date: (formData.get("notification_date") as string) || null,
      apply_start_date: (formData.get("apply_start_date") as string) || null,
      apply_end_date: (formData.get("apply_end_date") as string) || null,
      status: (formData.get("status") as string) || "upcoming",
    }
    const rec = await createRecruitment(input)

    // Add exam stages if provided
    const stagesJson = formData.get("stages_json") as string
    if (stagesJson) {
      await replaceExamStages(rec.id, JSON.parse(stagesJson))
    }

    void logAdminAction({
      actorId:    ctx.userId,
      actorEmail: ctx.userEmail,
      action:     "create_recruitment",
      entityType: "recruitment",
      entityId:   rec.id,
      newValue:   input,
    })

    revalidatePath("/admin/recruitments")
    redirect(`/admin/recruitments/${rec.id}`)
  } catch (err) {
    adminRedirectOnError("/admin/recruitments/new", err)
  }
}

export async function adminUpdateRecruitment(formData: FormData) {
  const id = formData.get("id") as string
  try {
    const ctx = await requireAdminRole("recruitments")
    const input = {
      name: formData.get("name") as string,
      year: Number(formData.get("year")),
      notification_date: (formData.get("notification_date") as string) || null,
      apply_start_date: (formData.get("apply_start_date") as string) || null,
      apply_end_date: (formData.get("apply_end_date") as string) || null,
      status: formData.get("status") as string,
    }
    await updateRecruitment(id, input)

    const stagesJson = formData.get("stages_json") as string
    if (stagesJson) {
      await replaceExamStages(id, JSON.parse(stagesJson))
    }

    void logAdminAction({
      actorId:    ctx.userId,
      actorEmail: ctx.userEmail,
      action:     "update_recruitment",
      entityType: "recruitment",
      entityId:   id,
      newValue:   input,
    })

    revalidatePath("/admin/recruitments")
    revalidatePath(`/admin/recruitments/${id}`)
  } catch (err) {
    adminRedirectOnError(`/admin/recruitments/${id}/edit`, err)
  }
  redirect(`/admin/recruitments/${id}`)
}

export async function adminDeleteRecruitment(formData: FormData) {
  const id = formData.get("id") as string
  try {
    const ctx = await requireAdminRole("recruitments")
    await deleteRecruitment(id)
    void logAdminAction({
      actorId:    ctx.userId,
      actorEmail: ctx.userEmail,
      action:     "delete_recruitment",
      entityType: "recruitment",
      entityId:   id,
    })
    revalidatePath("/admin/recruitments")
  } catch (err) {
    adminRedirectOnError("/admin/recruitments", err)
  }
  redirect("/admin/recruitments")
}

// ─── Post actions ─────────────────────────────────────────────────────────────

export async function adminSavePost(formData: FormData) {
  const recruitmentId = formData.get("recruitment_id") as string
  const postId = formData.get("post_id") as string | null

  try {
    await requireAdmin()

    let targetPostId = postId

    if (postId) {
      await updatePost(postId, {
        post_name: formData.get("post_name") as string,
        group_type: (formData.get("group_type") as string) || null,
        pay_level: (formData.get("pay_level") as string) || null,
        job_type: (formData.get("job_type") as string) || null,
      })
    } else {
      const post = await createPost({
        recruitment_id: recruitmentId,
        post_name: formData.get("post_name") as string,
        group_type: (formData.get("group_type") as string) || null,
        pay_level: (formData.get("pay_level") as string) || null,
        job_type: (formData.get("job_type") as string) || null,
      })
      targetPostId = post.id
    }

    // Save all related criteria
    await upsertAgeCriteria(targetPostId!, {
      min_age: formData.get("min_age") ? Number(formData.get("min_age")) : null,
      max_age: formData.get("max_age") ? Number(formData.get("max_age")) : null,
      cutoff_date: (formData.get("cutoff_date") as string) || null,
    })

    await upsertEducationCriteria(targetPostId!, {
      min_qualification_level: (formData.get("min_qualification_level") as string) || null,
      min_percentage: formData.get("min_percentage") ? Number(formData.get("min_percentage")) : null,
      allowed_disciplines: formData.get("allowed_disciplines_json")
        ? JSON.parse(formData.get("allowed_disciplines_json") as string)
        : null,
    })

    const attemptLimitsJson = formData.get("attempt_limits_json") as string
    if (attemptLimitsJson) {
      await replaceAttemptLimits(targetPostId!, JSON.parse(attemptLimitsJson))
    }

    const vacanciesJson = formData.get("vacancies_json") as string
    if (vacanciesJson) {
      await replaceVacancies(targetPostId!, JSON.parse(vacanciesJson))
    }

    await upsertSalaryDetails(targetPostId!, {
      pay_level: (formData.get("salary_pay_level") as string) || null,
      basic_pay_min: formData.get("basic_pay_min") ? Number(formData.get("basic_pay_min")) : null,
      basic_pay_max: formData.get("basic_pay_max") ? Number(formData.get("basic_pay_max")) : null,
      grade_pay: formData.get("grade_pay") ? Number(formData.get("grade_pay")) : null,
      allowances: (formData.get("allowances") as string) || null,
      in_hand_estimate: (formData.get("in_hand_estimate") as string) || null,
    })

    revalidatePath(`/admin/recruitments/${recruitmentId}`)
  } catch (err) {
    adminRedirectOnError(`/admin/recruitments/${recruitmentId}`, err)
  }
  redirect(`/admin/recruitments/${recruitmentId}`)
}

export async function adminDeletePost(formData: FormData) {
  const postId = formData.get("post_id") as string
  const recruitmentId = formData.get("recruitment_id") as string
  try {
    await requireAdmin()
    await deletePost(postId)
    revalidatePath(`/admin/recruitments/${recruitmentId}`)
  } catch (err) {
    adminRedirectOnError(`/admin/recruitments/${recruitmentId}`, err)
  }
  redirect(`/admin/recruitments/${recruitmentId}`)
}

// ─── Eligibility trigger ──────────────────────────────────────────────────────

/**
 * Admin triggers re-computation of eligibility for ALL users.
 * Called after adding a new recruitment / updating criteria.
 * This is a sequential implementation — for large user bases,
 * replace with a Supabase Edge Function or background job.
 */
// ─── RBAC actions ─────────────────────────────────────────────────────────────

const VALID_ROLES: (AdminRole | "remove")[] = [
  "super_admin", "ops_admin", "content_admin", "scraper_admin", "support_admin", "remove",
]

export async function adminUpdateAdminRole(formData: FormData) {
  const targetUserId = formData.get("user_id") as string
  const newRole      = formData.get("role") as string

  if (!targetUserId || !VALID_ROLES.includes(newRole as AdminRole | "remove")) {
    redirect("/admin/rbac?error=Invalid+role+or+user")
  }

  try {
    const ctx = await requireAdminRole("*")
    // Only super_admin can change roles
    if (ctx.role !== "super_admin") {
      redirect("/admin/rbac?error=Only+super_admin+can+change+roles")
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        admin_role: newRole === "remove" ? null : newRole,
        is_admin:   newRole !== "remove",
      })
      .eq("id", targetUserId)

    if (error) throw new Error(error.message)

    await logAdminAction({
      actorId:    ctx.userId,
      actorEmail: ctx.userEmail,
      action:     "update_admin_role",
      entityType: "profiles",
      entityId:   targetUserId,
      newValue:   { admin_role: newRole },
    })

    revalidatePath("/admin/rbac")
  } catch (err) {
    adminRedirectOnError("/admin/rbac", err)
  }
  redirect("/admin/rbac?success=Role+updated")
}

export async function adminTriggerEligibilityRecompute(formData: FormData) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // Get all user IDs with completed onboarding
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .eq("onboarding_completed", true)

    if (!users || users.length === 0) {
      revalidatePath("/admin")
      redirect("/admin?info=No+eligible+users+found")
    }

    // Run for each user
    const results = await Promise.allSettled(
      users.map((u) => runEligibilityForUser(u.id))
    )

    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    revalidatePath("/admin")
    redirect(`/admin?success=Eligibility+recomputed+for+${succeeded}+users.+${failed > 0 ? failed + "+failed." : ""}`)
  } catch (err) {
    adminRedirectOnError("/admin", err)
  }
}