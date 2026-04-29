/**
 * app/admin/rbac/page.tsx
 * Admin — RBAC Manager
 *
 * Lists all admin users (is_admin=true OR admin_role IS NOT NULL).
 * Super admins can change roles. Audit log is written on each change.
 * Uses migration 019 schema: profiles.admin_role + profiles.is_admin.
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { adminUpdateAdminRole } from "@/actions/admin"
import { AdminStatusPill } from "@/components/admin/ui"

export const dynamic = "force-dynamic"
export const metadata = { title: "RBAC Manager — Admin" }

type AdminRole = "super_admin" | "ops_admin" | "content_admin" | "scraper_admin" | "support_admin"

type AdminUser = {
  id: string
  full_name: string | null
  admin_role: AdminRole | null
  is_admin: boolean | null
  created_at: string | null
}

const ROLE_OPTIONS: { value: AdminRole | "remove"; label: string }[] = [
  { value: "super_admin",   label: "Super Admin — full access" },
  { value: "ops_admin",     label: "Ops Admin — scrape + recruitments + orgs + audit" },
  { value: "content_admin", label: "Content Admin — recruitments + orgs + posts" },
  { value: "scraper_admin", label: "Scraper Admin — scrape + sources + queue" },
  { value: "support_admin", label: "Support Admin — users + notifications" },
  { value: "remove",        label: "Remove admin access" },
]

const ROLE_PERMISSIONS: Record<AdminRole, string> = {
  super_admin:   "Full access · all modules",
  ops_admin:     "Scrape · queue · sources · recruitments · orgs · audit",
  content_admin: "Recruitments · orgs · posts only",
  scraper_admin: "Scrape · sources · queue only",
  support_admin: "Users · notifications only",
}

type RoleVariant = "success" | "warning" | "info" | "neutral"

function roleVariant(role: AdminRole | null): RoleVariant {
  if (!role) return "neutral"
  if (role === "super_admin")   return "success"
  if (role === "ops_admin")     return "warning"
  if (role === "content_admin") return "info"
  return "neutral"
}

export default async function RbacPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myProfile } = await supabase
    .from("profiles").select("is_admin, admin_role").eq("id", user.id).single()
  if (!myProfile?.is_admin) redirect("/dashboard")

  const isSuperAdmin = myProfile.admin_role === "super_admin" || myProfile.is_admin

  const params = await searchParams.catch(() => ({}))

  const { data: admins, error: listError } = await supabase
    .from("profiles")
    .select("id, full_name, admin_role, is_admin, created_at")
    .or("is_admin.eq.true,admin_role.not.is.null")
    .order("created_at", { ascending: true })

  const adminUsers = (admins ?? []) as AdminUser[]

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-medium" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            RBAC Manager
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {adminUsers.length} admin user{adminUsers.length !== 1 ? "s" : ""} · role changes logged to audit trail
          </p>
        </div>
      </div>

      {params.success && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {decodeURIComponent(params.success)}
        </div>
      )}
      {params.error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {decodeURIComponent(params.error)}
        </div>
      )}
      {listError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to load admins: {listError.message}
        </div>
      )}

      {/* Role reference */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Role permissions reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.entries(ROLE_PERMISSIONS) as [AdminRole, string][]).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <AdminStatusPill label={role.replace("_", " ")} variant={roleVariant(role)} />
              <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin list */}
      {adminUsers.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-white/40 text-sm">No admin users found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["User", "Current role", "Legacy is_admin", isSuperAdmin ? "Change role" : ""].filter(Boolean).map(h => (
                  <th key={h} className="text-left text-xs font-medium text-white/30 uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {adminUsers.map(admin => (
                <tr key={admin.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-white/85">{admin.full_name ?? "Unnamed"}</p>
                    <p className="text-xs font-mono text-white/25 mt-0.5">{admin.id.slice(0, 16)}…</p>
                    {admin.id === user.id && (
                      <span className="text-[10px] text-[#e8d5a3]/50 mt-0.5 block">You</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {admin.admin_role ? (
                      <div>
                        <AdminStatusPill label={admin.admin_role.replace("_", " ")} variant={roleVariant(admin.admin_role)} />
                        <p className="text-xs text-white/25 mt-1">{ROLE_PERMISSIONS[admin.admin_role]}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-white/30">No granular role</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <AdminStatusPill
                      label={admin.is_admin ? "yes" : "no"}
                      variant={admin.is_admin ? "warning" : "neutral"}
                    />
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-4">
                      {admin.id === user.id ? (
                        <span className="text-xs text-white/20">Cannot change own role</span>
                      ) : (
                        <form action={adminUpdateAdminRole} className="flex items-center gap-2">
                          <input type="hidden" name="user_id" value={admin.id} />
                          <select
                            name="role"
                            defaultValue={admin.admin_role ?? ""}
                            className="text-xs rounded-lg px-2 py-1.5 text-white/70 focus:outline-none"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              colorScheme: "dark",
                              minWidth: 220,
                            }}
                          >
                            <option value="">— select role —</option>
                            {ROLE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(232,213,163,0.10)", color: "#e8d5a3", border: "1px solid rgba(232,213,163,0.20)" }}
                          >
                            Save
                          </button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Link href="/admin/audit?entity_type=profiles"
          className="text-xs text-[#e8d5a3]/40 hover:text-[#e8d5a3]/70 transition-colors">
          View role change history in Audit Log →
        </Link>
      </div>
    </div>
  )
}
