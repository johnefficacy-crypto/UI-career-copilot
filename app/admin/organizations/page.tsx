/**
 * app/admin/organizations/page.tsx
 * Career Copilot — Admin: Organizations + Source Registry overview
 *
 * This page previously showed a static list of organizations.
 * Organizations in the DB are auto-created when recruitments are approved
 * from the scrape queue — manual creation is rarely needed.
 *
 * This page now shows:
 *  - Organizations table (read-only, sorted by name) — useful for auditing
 *  - Quick summary stats from source_registry (mirrored from /admin/sources)
 *  - Links to the live CRUD pages
 */

import { redirect }        from "next/navigation"
import { createClient }    from "@/utils/supabase/server"
import { dbGetAllSources } from "@/lib/db/source-registry"
import Link                from "next/link"

export const dynamic  = "force-dynamic"
export const metadata = { title: "Organizations — Admin" }

export default async function AdminOrganizationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/dashboard")

  // Fetch in parallel
  const [sources, { data: orgs, error: orgErr }] = await Promise.all([
    dbGetAllSources(),
    supabase
      .from("organizations")
      .select("id, name, type, created_at")
      .order("name")
      .limit(200),
  ])

  if (orgErr) console.error("[admin/organizations]", orgErr.message)

  // Source registry quick stats
  const totalSources  = sources.length
  const activeSources = sources.filter(s => s.is_active).length
  const failingSources = sources.filter(s => s.consecutive_fails >= 5).length
  const unverified    = sources.filter(s => !s.is_verified).length

  const css = {
    gold:    "var(--gold)",
    surface: "var(--bg-surface)",
    border:  "var(--border)",
    text:    "var(--text-base)",
    muted:   "var(--text-muted)",
    ghost:   "var(--text-ghost)",
    danger:  "var(--danger)",
    success: "var(--success)",
  }

  return (
    <div className="p-6 max-w-5xl space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: css.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Organizations
          </h1>
          <p className="text-sm mt-1" style={{ color: css.muted }}>
            Organizations are auto-created from scrape queue approvals. Use Source Registry to manage scraping.
          </p>
        </div>
        <Link href="/admin/sources"
          className="text-sm px-4 py-2 rounded-xl font-medium transition-colors"
          style={{ background: "rgba(201,153,42,0.12)", color: css.gold, border: "1px solid rgba(201,153,42,0.25)" }}>
          Manage Sources →
        </Link>
      </div>

      {/* Source Registry quick stats */}
      <div>
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: css.muted }}>Source Registry Summary</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Sources",   value: totalSources,   color: css.text },
            { label: "Active",          value: activeSources,  color: css.success },
            { label: "Failing (≥5)",    value: failingSources, color: failingSources > 0 ? css.danger : css.text },
            { label: "Unverified",      value: unverified,     color: unverified > 0 ? "var(--warning)" : css.text },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4"
              style={{ background: css.surface, border: `1px solid ${css.border}` }}>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: css.ghost }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Organizations table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: css.muted }}>
            {(orgs ?? []).length} organizations (auto-managed)
          </p>
          <Link href="/admin/recruitments/new"
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: css.surface, color: css.muted, border: `1px solid ${css.border}` }}>
            + Add Recruitment
          </Link>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${css.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-surface-md)", borderBottom: `1px solid ${css.border}` }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: css.ghost }}>Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: css.ghost }}>Type</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: css.ghost }}>Added</th>
              </tr>
            </thead>
            <tbody>
              {(orgs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm" style={{ color: css.ghost }}>
                    No organizations yet — approve scrape queue items to auto-create them.
                  </td>
                </tr>
              ) : (orgs ?? []).map((org, i) => (
                <tr key={org.id}
                  style={{
                    borderBottom: i < (orgs ?? []).length - 1 ? `1px solid ${css.border}` : "none",
                    background:   i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                  <td className="px-4 py-3" style={{ color: css.text }}>{org.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(255,255,255,0.05)", color: css.ghost }}>
                      {org.type ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: css.ghost }}>
                    {org.created_at ? new Date(org.created_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl px-5 py-4 text-sm"
        style={{ background: "rgba(201,153,42,0.06)", border: "1px solid rgba(201,153,42,0.20)", color: css.muted }}>
        <strong style={{ color: css.gold }}>Note:</strong>{" "}
        To add a new source for scraping, go to{" "}
        <Link href="/admin/sources" style={{ color: css.gold }}>Source Registry</Link>.{" "}
        To manually add a recruitment (bypassing scraper), use{" "}
        <Link href="/admin/recruitments/new" style={{ color: css.gold }}>Add Recruitment</Link>.
      </div>
    </div>
  )
}