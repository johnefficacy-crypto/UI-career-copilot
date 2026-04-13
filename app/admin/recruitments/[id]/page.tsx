/**
 * app/admin/recruitments/[id]/page.tsx
 *
 * FIX: Delete post button used to have onClick in a Server Component.
 * Replaced with DeleteConfirmButton client component.
 * Also wrapped data fetching in try/catch to prevent 500 on timeout.
 */

import { notFound } from "next/navigation"
import { getRecruitmentById, getAllOrganizations } from "@/lib/db/admin"
import { adminUpdateRecruitment, adminSavePost, adminDeletePost } from "@/actions/admin"
import { RecruitmentForm } from "@/components/admin/RecruitmentForm"
import { PostForm } from "@/components/admin/PostForm"
import { DeleteConfirmButton } from "@/components/admin/Deleteconfirmbutton"
import Link from "next/link"

export default async function RecruitmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; post?: string }>
}) {
  const { id } = await params
  const { error: pageError, post: postParam } = await searchParams

  let rec: Awaited<ReturnType<typeof getRecruitmentById>> = null
  let organizations: Awaited<ReturnType<typeof getAllOrganizations>> = []
  let fetchError: string | null = null

  try {
    ;[rec, organizations] = await Promise.all([
      getRecruitmentById(id),
      getAllOrganizations(),
    ])
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load data"
  }

  if (!rec && !fetchError) notFound()

  const posts = rec?.posts ?? []
  const editingPostId = postParam ?? null
  const editingPost = editingPostId ? posts.find((p) => p.id === editingPostId) : undefined

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/recruitments" className="text-white/30 text-sm hover:text-white/60 transition-colors">
          Back
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60 text-sm truncate">{rec?.name ?? id}</span>
      </div>

      {(pageError || fetchError) && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {pageError ? decodeURIComponent(pageError) : fetchError}
        </div>
      )}

      {rec && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Edit recruitment */}
          <div>
            <h2 className="text-white text-lg font-medium mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Recruitment details
            </h2>
            <RecruitmentForm
              organizations={organizations}
              action={adminUpdateRecruitment}
              defaultValues={rec}
              isEdit
            />
          </div>

          {/* Right: Posts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-medium" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Posts & criteria
              </h2>
              <span className="text-white/30 text-xs">{posts.length} post{posts.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Existing posts */}
            {posts.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                {posts.map((post) => (
                  <div key={post.id}
                    className={`border rounded-xl px-4 py-3 transition-colors ${
                      editingPostId === post.id
                        ? "border-[#e8d5a3]/30 bg-[#e8d5a3]/[0.04]"
                        : "border-white/[0.07] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{post.post_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/35">
                          {post.group_type && <span>{post.group_type}</span>}
                          {post.pay_level && <span>{post.pay_level}</span>}
                          {post.job_type && <span>{post.job_type}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/admin/recruitments/${rec.id}?post=${post.id}`}
                          className="text-white/40 text-xs hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/[0.05]">
                          Edit
                        </a>
                        {/* FIX: onClick removed from Server Component — using client component */}
                        <DeleteConfirmButton
                          action={adminDeletePost}
                          message={`Delete post "${post.post_name}"? All criteria will be lost.`}
                          fields={{ post_id: post.id, recruitment_id: rec.id }}
                          label="✕"
                        />
                      </div>
                    </div>

                    {/* Criteria chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {post.age_criteria?.[0] && (
                        <span className="text-[10px] bg-white/[0.05] border border-white/[0.08] text-white/40 px-1.5 py-0.5 rounded">
                          Age {post.age_criteria[0].min_age}–{post.age_criteria[0].max_age}
                        </span>
                      )}
                      {post.education_criteria?.[0] && (
                        <span className="text-[10px] bg-white/[0.05] border border-white/[0.08] text-white/40 px-1.5 py-0.5 rounded">
                          {post.education_criteria[0].min_qualification_level ?? "Any edu"}
                          {post.education_criteria[0].min_percentage ? ` · ${post.education_criteria[0].min_percentage}%` : ""}
                        </span>
                      )}
                      {post.attempt_limits && post.attempt_limits.length > 0 && (
                        <span className="text-[10px] bg-white/[0.05] border border-white/[0.08] text-white/40 px-1.5 py-0.5 rounded">
                          {post.attempt_limits.length} attempt limit{post.attempt_limits.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {post.vacancies && post.vacancies.length > 0 && (
                        <span className="text-[10px] bg-white/[0.05] border border-white/[0.08] text-white/40 px-1.5 py-0.5 rounded">
                          {post.vacancies.reduce((s: number, v) => s + (v.vacancy_count ?? 0), 0)} vacancies
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add / edit post form */}
            <div className="border border-white/[0.07] rounded-xl p-5 bg-white/[0.01]">
              <h3 className="text-white/70 text-sm font-medium mb-4">
                {editingPost ? `Editing: ${editingPost.post_name}` : "Add new post"}
              </h3>
              <PostForm
                recruitmentId={rec.id}
                action={adminSavePost}
                defaultValues={editingPost}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}