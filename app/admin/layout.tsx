import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { hasAdminPermission, requireAdminRole } from "@/lib/db/admin"

export const metadata = { title: "Admin — Career Copilot" }

type AdminNavItem = { href: string; label: string; permission?: string }

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/recruitments", label: "Recruitments", permission: "recruitments" },
  { href: "/admin/organizations", label: "Organizations", permission: "organizations" },
  { href: "/admin/eligibility", label: "Eligibility", permission: "eligibility" },
  { href: "/admin/scrape", label: "Scrape Dashboard", permission: "scrape" },
  { href: "/admin/sources", label: "Source Registry", permission: "sources" },
  { href: "/admin/notifications", label: "Notifications", permission: "notifications" },
  { href: "/admin/recruitment-feedback", label: "Recruitment Feedback", permission: "community" },
  { href: "/admin/eligibility-queue", label: "Eligibility Queue", permission: "queue" },
  { href: "/admin/audit", label: "Audit Log", permission: "audit" },
  { href: "/admin/rbac", label: "RBAC", permission: "rbac" },
  { href: "/admin/ai-policy", label: "AI Policy", permission: "ai_policy" },
  { href: "/admin/community", label: "Community Mod", permission: "community" },
  { href: "/admin/control-support", label: "Control Support" },
] as const


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let userId: string
  let adminContext: Awaited<ReturnType<typeof requireAdminRole>>
  try {
    adminContext = await requireAdminRole()
    userId = adminContext.userId
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") redirect("/auth/login")
    redirect("/access-denied?scope=admin")
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.permission || hasAdminPermission(adminContext, item.permission))

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single()

  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-4 sticky top-0 h-screen">
        <div className="border-b border-slate-200 pb-3">
          <p className="text-sm font-semibold text-indigo-700">Career Copilot</p>
          <p className="text-xs text-slate-500">Admin Panel</p>
        </div>

        <nav className="flex-1 overflow-auto flex flex-col gap-1" aria-label="Admin sections">
          {visibleNavItems.map((item) => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
          <p className="truncate mb-2">{profile?.full_name ?? "Admin user"}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
            ← Back to dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
