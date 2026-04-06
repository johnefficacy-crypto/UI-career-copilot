// ─────────────────────────────────────────────────────────────────────
// Phase 9 Integration Snippets
// Add these to your existing files as described below
// ─────────────────────────────────────────────────────────────────────

// ── 1. app/dashboard/page.tsx ─────────────────────────────────────────
//
// Add this import at the top:
//   import { ForumWidget } from "@/components/dashboard/ForumWidget"
//   import { listPosts } from "@/lib/db/forum"
//
// Add to the getDashboardData() parallel fetches (or a separate call):
//   const forumPosts = await listPosts({ sort: "newest" }, user.id, 4)
//
// Add inside your dashboard grid (after StudyPlanWidget or similar):
//   <ForumWidget recentPosts={forumPosts} />


// ── 2. components/dashboard/DashboardShell.tsx ────────────────────────
//
// Add "Forum" link to the sidebar nav:
//   <Link href="/forum" className={navLinkCls}>
//     <span>💬</span> Forum
//   </Link>


// ── 3. app/forum folder structure ─────────────────────────────────────
//
// app/
//   forum/
//     page.tsx                  ← forum-page.tsx
//     new/
//       page.tsx                ← forum-new-page.tsx
//     post/
//       [id]/
//         page.tsx              ← forum-post-page.tsx
//     leaderboard/
//       page.tsx                ← forum-leaderboard-page.tsx
//
// actions/
//   forum.ts                   ← forum-actions.ts
//
// lib/db/
//   forum.ts                   ← forum-db.ts
//
// types/
//   forum.ts                   ← forum.ts
//
// components/dashboard/
//   ForumWidget.tsx             ← ForumWidget.tsx
//
// supabase/migrations/
//   forum_setup.sql             ← forum_setup.sql


// ── 4. middleware.ts public routes ────────────────────────────────────
//
// Forum index and post pages are public (read-only for guests).
// Add these to your public routes list:
//
//   /forum
//   /forum/post/*
//
// Only /forum/new and /forum/leaderboard require auth (already handled
// by redirect() calls in those page.tsx files).


// ── 5. Package dependency ─────────────────────────────────────────────
//
// The pages use date-fns for relative timestamps. Add if not present:
//   pnpm add date-fns


// ── 6. Nav link in landing page / main nav ────────────────────────────
//
// In app/page.tsx (landing), add Forum to the nav links:
//   <Link href="/forum" className="text-white/40 text-sm hover:text-white transition-colors hidden sm:block">
//     Forum
//   </Link>