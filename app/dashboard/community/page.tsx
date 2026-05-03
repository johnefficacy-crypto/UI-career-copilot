import Link from "next/link"
import { redirect } from "next/navigation"

import { listForumPosts, getForumCategories } from "@/lib/db/forum"
import { createClient } from "@/utils/supabase/server"

export const metadata = { title: "Community — Career Copilot" }

export default async function CommunityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const [categories, postResult] = await Promise.all([
    getForumCategories(),
    listForumPosts({ page: 1, sort: "latest" }, user.id),
  ])

  const posts = postResult.posts.slice(0, 6)

  return (
    <div className="page space-y-4">
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1>Community</h1>
          <p>Exam-specific forums, preparation support, and trusted peer discussion.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/forum/new" className="btn btn-primary">+ New Post</Link>
          <Link href="/forum" className="btn btn-outline">Open forum</Link>
        </div>
      </div>

      <div className="official-lock-banner">🔒 Official updates remain admin-only. Use discussion channels for questions.</div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="card">
          <h2 className="mb-2 text-sm font-semibold">Exam spaces</h2>
          <ul className="space-y-2 text-sm">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between gap-2">
                <Link href={`/forum?category=${cat.slug}`} className="text-blue-700 hover:underline">
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </Link>
                <span className="text-xs text-gray-500">{cat.post_count}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-3">
          <div className="card">
            <h2 className="mb-2 text-sm font-semibold">Resource sharing</h2>
            <p className="text-sm text-gray-600">
              Share high-signal notes and links in forum posts using the <strong>Resource</strong> flair.
              Copyright-sensitive files remain moderation-gated.
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="card text-sm text-gray-600">No threads yet. Start the first discussion.</div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="card space-y-1">
                <p className="text-xs text-gray-500">{post.category.name} • {post.reply_count} replies • {post.upvote_count} upvotes</p>
                <Link href={`/forum/post/${post.id}`} className="font-semibold text-gray-900 hover:underline">
                  {post.title}
                </Link>
                <p className="line-clamp-2 text-sm text-gray-600">{post.body}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
