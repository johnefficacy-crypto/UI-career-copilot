/**
 * app/dashboard/recruitments/[id]/page.tsx
 *
 * Full recruitment detail page — Phase 4 redesign.
 *
 * Sections:
 *  1. Sticky header — breadcrumb, track toggle
 *  2. Hero — name, org, status pill, total vacancies
 *  3. Eligibility verdict card
 *  4. Timeline — notification → apply opens → apply closes
 *  5. Apply CTA — ApplyButton (client component, fires telemetry on click)
 *  6. Posts — per-post cards with:
 *       • Eligibility verdict + fail reasons
 *       • Salary details (pay level, pay band, in-hand estimate, grade pay)
 *       • Vacancies breakdown by category / state
 *
 * Data sources:
 *  - recruitments + organizations + posts + salary_details + vacancies
 *  - eligibility_results (engine cache)
 *  - tracked_recruitments (watchlist)
 *  - user_exam_summary (clicked_apply flag)
 */

import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { trackRecruitmentAction, untrackRecruitmentAction } from "@/actions/notifications"
import { Timeline, buildTimelineSteps } from "@/components/recruitments/Timeline"
import { ApplyButton } from "@/components/recruitments/ApplyButton"

export const revalidate = 30

// ─── Type helpers ────────────────────────────────────────────────────────────

type SalaryRow = {
  pay_level:        string | null
  basic_pay_min:    number | null
  basic_pay_max:    number | null
  in_hand_estimate: string | null
  grade_pay:        number | null
  allowances:       string | null
}

type VacancyRow = {
  category:      string | null
  vacancy_count: number | null
  state:         string | null
}

type PostRow = {
  id:                  string
  post_name:           string | null
  group_type:          string | null
  pay_level:           string | null
  salary_details:      SalaryRow | SalaryRow[] | null
  vacancies:           VacancyRow[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function formatINR(n: number | null): string {
  if (n == null) return "—"
  return "₹" + n.toLocaleString("en-IN")
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
}

function statusColor(s: string | null) {
  if (s === "open")     return { bg: "rgba(52,211,153,0.10)", color: "#34d399" }
  if (s === "upcoming") return { bg: "rgba(232,213,163,0.10)", color: "#e8d5a3" }
  if (s === "closed")   return { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }
  return { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)" }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SalaryCard({ salary }: { salary: SalaryRow }) {
  const rows: [string, string][] = [
    ["Pay level",   salary.pay_level ?? "—"],
    ["Basic pay",   salary.basic_pay_min || salary.basic_pay_max
                      ? `${formatINR(salary.basic_pay_min)} – ${formatINR(salary.basic_pay_max)}`
                      : "—"],
    ["In-hand est.", salary.in_hand_estimate ?? "—"],
    ["Grade pay",   formatINR(salary.grade_pay)],
    ["Allowances",  salary.allowances ?? "—"],
  ].filter(([, v]) => v !== "—") as [string, string][]

  if (rows.length === 0) return null

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="text-[11px] uppercase tracking-wider mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>
        Salary
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)" }}>
              {label}
            </dt>
            <dd className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function VacanciesTable({ vacancies }: { vacancies: VacancyRow[] }) {
  if (vacancies.length === 0) return null

  // Group by state (null state = national/not specified)
  const grouped = new Map<string, VacancyRow[]>()
  for (const v of vacancies) {
    const key = v.state ?? "__national__"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(v)
  }

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="text-[11px] uppercase tracking-wider mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>
        Vacancies
      </div>
      {Array.from(grouped.entries()).map(([stateKey, rows]) => (
        <div key={stateKey} className="mb-3 last:mb-0">
          {stateKey !== "__national__" && (
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {stateKey}
            </div>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pb-1 font-normal" style={{ color: "rgba(255,255,255,0.30)" }}>
                  Category
                </th>
                <th className="text-right pb-1 font-normal" style={{ color: "rgba(255,255,255,0.30)" }}>
                  Posts
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => (
                <tr key={`${stateKey}-${i}`} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="py-1" style={{ color: "rgba(255,255,255,0.70)" }}>
                    {v.category ?? "General"}
                  </td>
                  <td className="py-1 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {v.vacancy_count?.toLocaleString("en-IN") ?? "—"}
                  </td>
                </tr>
              ))}
              {/* Total row if more than one category */}
              {rows.length > 1 && (
                <tr className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <td className="pt-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>
                    Total
                  </td>
                  <td className="pt-1.5 text-right tabular-nums font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {rows
                      .reduce((sum, v) => sum + (v.vacancy_count ?? 0), 0)
                      .toLocaleString("en-IN")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RecruitmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // ── 1. Load recruitment + org + posts (with salary + vacancies) ──────────
  const { data: recruitment, error: recErr } = await supabase
    .from("recruitments")
    .select(`
      id,
      name,
      year,
      status,
      notification_date,
      apply_start_date,
      apply_end_date,
      official_notification_url,
      total_vacancies,
      organizations ( id, name, type, state ),
      posts (
        id,
        post_name,
        group_type,
        pay_level,
        salary_details ( pay_level, basic_pay_min, basic_pay_max, in_hand_estimate, grade_pay, allowances ),
        vacancies ( category, vacancy_count, state )
      )
    `)
    .eq("id", id)
    .maybeSingle()

  if (recErr || !recruitment) notFound()

  // ── 2. Load per-user data in parallel ────────────────────────────────────
  const [elRes, trackedRes, summaryRes] = await Promise.all([
    supabase
      .from("eligibility_results")
      .select("post_id, is_eligible, is_conditional, fail_reasons")
      .eq("user_id", user.id)
      .eq("recruitment_id", id),
    supabase
      .from("tracked_recruitments")
      .select("recruitment_id")
      .eq("user_id", user.id)
      .eq("recruitment_id", id)
      .maybeSingle(),
    supabase
      .from("user_exam_summary")
      .select("clicked_apply")
      .eq("user_id", user.id)
      .eq("recruitment_id", id)
      .maybeSingle(),
  ])

  const isTracked   = !!trackedRes.data
  const clickedApply = (summaryRes.data?.clicked_apply as boolean | null) ?? false

  // ── 3. Derive eligibility verdict map ────────────────────────────────────
  const verdictByPost = new Map(
    (elRes.data ?? []).map((r) => [
      r.post_id as string,
      {
        is_eligible:   r.is_eligible   as boolean,
        is_conditional: r.is_conditional as boolean,
        fail_reasons:  (r.fail_reasons  ?? []) as string[],
      },
    ]),
  )

  // Coerce nested relations (Supabase returns them as array or object depending on cardinality)
  const org = Array.isArray(recruitment.organizations)
    ? (recruitment.organizations as Record<string, unknown>[])[0]
    : recruitment.organizations as Record<string, unknown> | null

  const posts = ((recruitment.posts ?? []) as unknown[]).map((p) => {
    const row = p as Record<string, unknown>
    // salary_details is one-to-one (technically a one-to-many but always one row)
    const salaryRaw = row.salary_details
    const salary: SalaryRow | null = Array.isArray(salaryRaw)
      ? (salaryRaw[0] as SalaryRow ?? null)
      : (salaryRaw as SalaryRow | null)

    const vacanciesRaw = (row.vacancies ?? []) as VacancyRow[]

    return {
      id:             row.id   as string,
      post_name:      row.post_name  as string | null,
      group_type:     row.group_type as string | null,
      pay_level:      row.pay_level  as string | null,
      salary,
      vacancies: vacanciesRaw,
    } satisfies PostRow
  })

  // ── 4. Aggregate verdict for the hero card ────────────────────────────────
  let anyEligible    = false
  let anyConditional = false
  for (const p of posts) {
    const v = verdictByPost.get(p.id)
    if (!v) continue
    if (v.is_eligible)    anyEligible    = true
    if (v.is_conditional) anyConditional = true
  }

  // ── 5. Build timeline ─────────────────────────────────────────────────────
  const timelineSteps = buildTimelineSteps({
    notification_date: recruitment.notification_date as string | null,
    apply_start_date:  recruitment.apply_start_date  as string | null,
    apply_end_date:    recruitment.apply_end_date    as string | null,
  })

  const deadlineDays = daysUntil(recruitment.apply_end_date as string | null)
  const statusStyle  = statusColor(recruitment.status as string | null)

  return (
    <div className="min-h-screen text-white/85" style={{ background: "#0f0f0f" }}>

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background:   "rgba(15,15,15,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/exams"
              className="text-sm shrink-0 transition-colors"
              style={{ color: "rgba(255,255,255,0.30)" }}
            >
              ← Exams
            </Link>
            <span style={{ color: "rgba(255,255,255,0.10)" }}>/</span>
            <span
              className="text-sm truncate"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {recruitment.name}
            </span>
          </div>

          {/* Track toggle — server action via form */}
          <form
            action={async () => {
              "use server"
              if (isTracked) {
                await untrackRecruitmentAction(id)
              } else {
                await trackRecruitmentAction(id)
              }
            }}
          >
            <button
              type="submit"
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: isTracked
                  ? "rgba(232,213,163,0.12)"
                  : "rgba(255,255,255,0.04)",
                color: isTracked
                  ? "#e8d5a3"
                  : "rgba(255,255,255,0.50)",
                border: `1px solid ${isTracked
                  ? "rgba(232,213,163,0.25)"
                  : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {isTracked ? "★ Tracking" : "☆ Track"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── Hero ── */}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <h1
              className="text-2xl font-semibold text-white leading-tight"
              style={{ fontFamily: "var(--font-serif, serif)" }}
            >
              {recruitment.name}
            </h1>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium uppercase tracking-wide shrink-0"
              style={statusStyle}
            >
              {recruitment.status}
              {deadlineDays !== null && deadlineDays >= 0 && (
                <span className="ml-1.5 normal-case">
                  · {deadlineDays}d left
                </span>
              )}
            </span>
          </div>

          <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
            {org?.name as string ?? "Organisation"}
            {org?.type && <span> · {org.type as string}</span>}
            {org?.state && <span> · {org.state as string}</span>}
            {recruitment.year && <span> · {recruitment.year}</span>}
            {(recruitment.total_vacancies as number | null) && (
              <span> · {(recruitment.total_vacancies as number).toLocaleString("en-IN")} posts</span>
            )}
          </p>
        </div>

        {/* ── Eligibility verdict ── */}
        <div
          className="rounded-2xl border p-5"
          style={{
            background:   "rgba(255,255,255,0.02)",
            borderColor:  anyEligible
              ? "rgba(52,211,153,0.30)"
              : anyConditional
                ? "rgba(250,204,21,0.25)"
                : "rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-widest mb-1"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Your eligibility
          </div>
          <div className="text-sm leading-relaxed">
            {anyEligible ? (
              <span style={{ color: "#86efac" }}>
                You are eligible for at least one post in this recruitment.
              </span>
            ) : anyConditional ? (
              <span style={{ color: "#fde68a" }}>
                Conditionally eligible — you meet some criteria. Final determination
                depends on pending verification (e.g. education completion status).
              </span>
            ) : verdictByPost.size === 0 ? (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                Not yet evaluated. Eligibility is recomputed automatically after any
                profile update — or you can trigger it from the dashboard.
              </span>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.50)" }}>
                You are not currently eligible for any post in this recruitment.
                Review the reasons below or update your profile.
              </span>
            )}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div
          className="rounded-2xl border p-5"
          style={{
            background:   "rgba(255,255,255,0.02)",
            borderColor:  "rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-widest mb-4"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Key dates
          </div>
          <Timeline steps={timelineSteps} />

          {/* Key dates fallback summary below timeline */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {[
              { label: "Notification",  date: recruitment.notification_date },
              { label: "Apply opens",   date: recruitment.apply_start_date  },
              { label: "Apply closes",  date: recruitment.apply_end_date    },
            ].map(({ label, date }) => (
              <div key={label}>
                <div
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.30)" }}
                >
                  {label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {formatDate(date as string | null)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Apply CTA ── */}
        <div
          className="rounded-2xl border p-5"
          style={{
            background:  "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Application
          </div>
          <ApplyButton
            recruitmentId={id}
            officialUrl={recruitment.official_notification_url as string | null}
            applyStartDate={recruitment.apply_start_date as string | null}
            applyEndDate={recruitment.apply_end_date as string | null}
            initialClicked={clickedApply}
          />
          {recruitment.official_notification_url && (
            <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Official notification:{" "}
              <a
                href={recruitment.official_notification_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                {(recruitment.official_notification_url as string).replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
        </div>

        {/* ── Posts ── */}
        <div>
          <h2
            className="text-sm font-medium mb-3"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Posts{posts.length > 0 ? ` (${posts.length})` : ""}
          </h2>

          {posts.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{
                background:  "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                No posts listed for this recruitment yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => {
                const v      = verdictByPost.get(p.id)
                const tone   = !v
                  ? { label: "Pending",      fg: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.04)" }
                  : v.is_eligible
                    ? { label: "Eligible",     fg: "#86efac",               bg: "rgba(52,211,153,0.08)"  }
                    : v.is_conditional
                      ? { label: "Conditional",  fg: "#fde68a",               bg: "rgba(250,204,21,0.08)"  }
                      : { label: "Not eligible", fg: "#f87171",               bg: "rgba(248,113,113,0.06)" }

                const hasSalary    = !!p.salary
                const hasVacancies = p.vacancies.length > 0

                return (
                  <li
                    key={p.id}
                    className="rounded-2xl border"
                    style={{
                      background:  "rgba(255,255,255,0.015)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                  >
                    {/* Post header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold leading-snug"
                            style={{ color: "rgba(255,255,255,0.88)" }}
                          >
                            {p.post_name ?? "Untitled post"}
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: "rgba(255,255,255,0.38)" }}
                          >
                            {p.group_type && <span>{p.group_type}</span>}
                            {p.group_type && p.pay_level && <span> · </span>}
                            {p.pay_level  && <span>Pay {p.pay_level}</span>}
                          </div>
                        </div>
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full shrink-0 font-medium"
                          style={{ color: tone.fg, background: tone.bg }}
                        >
                          {tone.label}
                        </span>
                      </div>

                      {/* Fail reasons */}
                      {v && v.fail_reasons.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {v.fail_reasons.map((reason, i) => (
                            <li
                              key={`${p.id}-r${i}`}
                              className="text-xs"
                              style={{ color: "rgba(255,255,255,0.45)" }}
                            >
                              · {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Salary + vacancies (shown if data exists) */}
                    {(hasSalary || hasVacancies) && (
                      <div
                        className="px-5 pb-5"
                        style={{ borderTop: hasSalary || hasVacancies ? "none" : undefined }}
                      >
                        <div className={hasSalary && hasVacancies ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : ""}>
                          {hasSalary  && <SalaryCard    salary={p.salary!} />}
                          {hasVacancies && <VacanciesTable vacancies={p.vacancies} />}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
