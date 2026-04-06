import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import Link from "next/link"

export const metadata = { title: "Admin — Career Copilot" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) redirect("/dashboard")

  const navItems = [
    { href: "/admin",                  label: "Overview" },
    { href: "/admin/recruitments",     label: "Recruitments" },
    { href: "/admin/organizations",    label: "Organizations" },
    { href: "/admin/eligibility",      label: "Eligibility" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/[0.06] flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-white/[0.06]">
          <span className="text-[#e8d5a3] font-semibold text-sm" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Career Copilot
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-wider bg-[#e8d5a3]/10 text-[#e8d5a3]/60 border border-[#e8d5a3]/20 px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <p className="text-white/30 text-xs">{profile.full_name}</p>
          <Link href="/dashboard" className="text-[#e8d5a3]/40 text-xs hover:text-[#e8d5a3] transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}