import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

export const metadata = { title: "Admin — Career Copilot" }

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/recruitments", label: "Recruitments" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/eligibility", label: "Eligibility" },
  { href: "/admin/scrape", label: "Scrape Dashboard" },
  { href: "/admin/sources", label: "Source Registry" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/recruitment-feedback", label: "Recruitment Feedback" },
  { href: "/admin/eligibility-queue", label: "Eligibility Queue" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/rbac", label: "RBAC" },
  { href: "/admin/ai-policy", label: "AI Policy" },
  { href: "/admin/community", label: "Community Mod" },
  { href: "/admin/control-support", label: "Control Support" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) redirect("/dashboard")

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
          {NAV_ITEMS.map((item) => {
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
          <p className="truncate mb-2">{profile.full_name}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
            ← Back to dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
