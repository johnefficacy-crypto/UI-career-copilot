import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Exams — Career Copilot" }

type UserExamRow = {
  recruitment_id: string
  exam_name: string | null
  year: number | null
  status: string | null
  apply_end_date: string | null
  official_notification_url: string | null
  organization_name: string | null
  total_vacancies: number | null
  has_any_eligible_post: boolean | null
}

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const params = await searchParams
  const filter = params.filter ?? "open"
  const q = params.q ?? ""

  let query = supabase.from("user_exam_summary").select("recruitment_id,exam_name,year,status,apply_end_date,official_notification_url,organization_name,total_vacancies,has_any_eligible_post").eq("user_id", user.id).limit(60)
  if (q) query = query.ilike("exam_name", `%${q}%`)
  const { data } = await query
  const rows = (data ?? []) as UserExamRow[]

  const closingCutoffMs = new Date(new Date().setDate(new Date().getDate() + 7)).getTime()

  const filtered = rows.filter((r) => {
    if (filter === "eligible") return !!r.has_any_eligible_post
    if (filter === "closing") return !!r.apply_end_date && new Date(r.apply_end_date).getTime() < closingCutoffMs
    return true
  })

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><h1>Exams</h1><p>Track application lifecycle, eligibility and deadlines.</p></div>
        <button className="btn btn-primary">+ Add Exam</button>
      </div>

      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <div className="card stat-block"><div className="stat-value">{rows.length}</div><div className="stat-label">Tracked</div></div>
        <div className="card stat-block"><div className="stat-value">{rows.filter(r => r.has_any_eligible_post).length}</div><div className="stat-label">Eligible</div></div>
        <div className="card stat-block"><div className="stat-value">{rows.filter(r => r.status === "open").length}</div><div className="stat-label">Open now</div></div>
        <div className="card stat-block"><div className="stat-value">{rows.filter(r => r.apply_end_date && new Date(r.apply_end_date).getTime() < closingCutoffMs).length}</div><div className="stat-label">Closing soon</div></div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {['open', 'closing', 'eligible'].map((f) => <Link key={f} href={`/dashboard/exams?filter=${f}&q=${encodeURIComponent(q)}`} className="tag tag-gray">{f}</Link>)}
          <form><input name="q" defaultValue={q} placeholder="Search exams" /></form>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
            <thead><tr style={{ textAlign: "left", color: "#6b7280" }}><th style={{ padding: "0.55rem" }}>Exam</th><th>Org</th><th>Status</th><th>Deadline</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.recruitment_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.6rem" }}>{r.exam_name ?? "Untitled"}</td>
                  <td>{r.organization_name ?? "—"}</td>
                  <td><span className={`tag ${r.has_any_eligible_post ? "tag-green" : "tag-yellow"}`}>{r.status ?? "unknown"}</span></td>
                  <td>{r.apply_end_date ?? "TBA"}</td>
                  <td><a href={r.official_notification_url ?? "#"} className="btn btn-outline" style={{ padding: "0.25rem 0.55rem" }}>Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
        <h2>Eligibility notes</h2>
        <p style={{ fontSize: "0.88rem", color: "#166534" }}>Eligibility is deterministic from your profile and recruitment rules. Update profile to improve match confidence.</p>
      </div>
    </div>
  )
}
