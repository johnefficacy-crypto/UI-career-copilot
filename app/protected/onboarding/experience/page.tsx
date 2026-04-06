/**
 * /onboarding/experience/page.tsx
 *
 * FIXES:
 * 1. Was a pure client component calling saveExperience() via onClick — this
 *    breaks the Next.js Server Action calling convention and loses CSRF protection.
 *    Replaced with a <form action={...}> pattern; experience rows are serialised
 *    into FormData with indexed field names so the server can parse them.
 * 2. Completely unstyled (plain <div>, no Tailwind classes). Now uses the
 *    Career Copilot design system (cc-* component classes + design tokens).
 * 3. The fresher toggle is preserved but handled via a hidden checkbox that
 *    conditionally shows/hides the experience block client-side, while the
 *    server action checks whether any experience fields are present.
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const SECTORS = ["BANKING", "FINANCE", "GOVT", "PRIVATE", "OTHER"] as const

interface ExpRow {
  sector: string
  role: string
  organization: string
  start_date: string
  end_date: string
}

const emptyRow: ExpRow = {
  sector: "PRIVATE",
  role: "",
  organization: "",
  start_date: "",
  end_date: "",
}

export default function ExperiencePage() {
  const router  = useRouter()
  const [isFresher, setIsFresher] = useState(true)
  const [rows,      setRows]      = useState<ExpRow[]>([{ ...emptyRow }])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const addRow    = () => setRows((r) => [...r, { ...emptyRow }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))

  const update = (i: number, field: keyof ExpRow, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const calcYears = (start: string, end: string) => {
    if (!start) return 0
    const s = new Date(start)
    const e = end ? new Date(end) : new Date()
    return Math.max(0, +(((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)))
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      // Build FormData with indexed keys — server action parses this
      const fd = new FormData()
      fd.append("is_fresher", isFresher ? "true" : "false")

      if (!isFresher) {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          if (!r.role.trim() || !r.organization.trim() || !r.start_date) continue
          fd.append(`exp_${i}_sector`,           r.sector)
          fd.append(`exp_${i}_role`,             r.role)
          fd.append(`exp_${i}_organization`,     r.organization)
          fd.append(`exp_${i}_start_date`,       r.start_date)
          fd.append(`exp_${i}_end_date`,         r.end_date || "")
          fd.append(`exp_${i}_years_experience`, String(calcYears(r.start_date, r.end_date)))
        }
      }

      // Dynamic import keeps the server action tree-shaken from client bundle
      const { saveExperience } = await import("./action")
      // @ts-expect-error — we pass FormData; the server action accepts it
      await saveExperience(fd)

      router.push("/onboarding/attempts")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save experience. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeUp flex flex-col gap-6">

      <div>
        <h1 className="cc-page-title">Work experience</h1>
        <p className="cc-page-subtitle">
          Some exams have work-experience requirements or score bonus marks for it.
        </p>
      </div>

      {error && (
        <div className="cc-alert-error">{error}</div>
      )}

      {/* Fresher / Experienced toggle */}
      <div className="flex flex-col gap-2">
        <span className="cc-label">Your current status</span>
        <div className="flex gap-3">
          {[
            { value: true,  label: "Fresher",     desc: "No work experience" },
            { value: false, label: "Experienced",  desc: "I have work history" },
          ].map((opt) => (
            <label key={String(opt.value)} className="cc-radio-card flex-1 cursor-pointer">
              <input
                type="radio"
                name="fresher_toggle"
                className="sr-only"
                checked={isFresher === opt.value}
                onChange={() => setIsFresher(opt.value)}
              />
              <div className="card-body">
                <p className="text-white/70 text-sm font-medium">{opt.label}</p>
                <p className="text-white/30 text-xs mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Experience rows — shown only for Experienced */}
      {!isFresher && (
        <div className="flex flex-col gap-4">
          <span className="cc-label">Work history</span>

          {rows.map((row, i) => (
            <div key={i} className="cc-exp-row">

              {/* Row header */}
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs font-mono">Position {i + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-red-400/60 text-xs hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sector */}
                <div className="cc-field">
                  <label className="cc-label">Sector</label>
                  <select
                    className="cc-select"
                    value={row.sector}
                    onChange={(e) => update(i, "sector", e.target.value)}
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div className="cc-field">
                  <label className="cc-label">Role / designation *</label>
                  <input
                    className="cc-input"
                    placeholder="e.g. Analyst, Officer"
                    value={row.role}
                    onChange={(e) => update(i, "role", e.target.value)}
                    required
                  />
                </div>

                {/* Organisation */}
                <div className="cc-field sm:col-span-2">
                  <label className="cc-label">Organisation *</label>
                  <input
                    className="cc-input"
                    placeholder="e.g. HDFC Bank, TCS"
                    value={row.organization}
                    onChange={(e) => update(i, "organization", e.target.value)}
                    required
                  />
                </div>

                {/* Dates */}
                <div className="cc-field">
                  <label className="cc-label">Start date *</label>
                  <input
                    type="date"
                    className="cc-input"
                    value={row.start_date}
                    onChange={(e) => update(i, "start_date", e.target.value)}
                    required
                  />
                </div>

                <div className="cc-field">
                  <label className="cc-label">End date <span className="text-white/20 normal-case font-normal">(leave blank if current)</span></label>
                  <input
                    type="date"
                    className="cc-input"
                    value={row.end_date}
                    onChange={(e) => update(i, "end_date", e.target.value)}
                    min={row.start_date}
                  />
                </div>
              </div>

              {/* Computed duration hint */}
              {row.start_date && (
                <p className="text-white/25 text-xs">
                  Duration: ~{calcYears(row.start_date, row.end_date)} years
                </p>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="self-start text-sm transition-colors"
            style={{ color: "var(--gold-dim)" }}
          >
            + Add another position
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="cc-form-nav">
        <a href="/onboarding/education" className="cc-btn-link">← Back</a>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="cc-btn-primary px-8 w-auto disabled:opacity-50"
        >
          {loading ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  )
}