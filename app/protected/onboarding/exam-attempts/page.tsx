/**
 * /onboarding/attempts/page.tsx
 *
 * FIXES:
 * 1. Was calling server action via `onClick` — now uses a <form action={…}>
 *    so Next.js handles serialisation, CSRF, and progressive enhancement.
 * 2. Completely unstyled — now uses the Career Copilot design system.
 * 3. updateRow used a generic that caused TypeScript `never` inference in
 *    some TS versions — simplified to explicit field checks.
 */

"use client"

import { useState } from "react"
import { saveExamAttempts } from "./action"

const EXAM_OPTIONS = [
  "SEBI Grade A",
  "RBI Grade B",
  "NABARD Grade A",
  "IRDAI",
  "LIC AAO",
  "UPSC CSE",
  "SSC CGL",
  "IBPS PO",
  "IBPS SO",
  "Bank PO (SBI)",
  "State PSC",
]

interface AttemptRow {
  exam_name: string
  attempts_used: number
}

const emptyRow: AttemptRow = { exam_name: "", attempts_used: 0 }

export default function ExamAttemptsPage() {
  const [rows, setRows] = useState<AttemptRow[]>([{ ...emptyRow }])

  const addRow = () => setRows((r) => [...r, { ...emptyRow }])

  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i))

  const updateExam = (i: number, value: string) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, exam_name: value } : row))

  const updateAttempts = (i: number, value: number) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, attempts_used: value } : row))

  return (
    <div className="animate-fadeUp flex flex-col gap-6">

      <div>
        <h1 className="cc-page-title">Previous exam attempts</h1>
        <p className="cc-page-subtitle">
          We use this to check your remaining attempts for each exam.
          Skip if you haven&apos;t appeared in any exam yet.
        </p>
      </div>

      {/* Use a real form so the server action gets FormData with CSRF protection */}
      <form action={saveExamAttempts} className="flex flex-col gap-4">

        {/* Hidden serialised rows — one pair of inputs per attempt row */}
        {rows.map((row, i) => (
          <div key={i} className="cc-exp-row">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/30 text-xs font-mono">Attempt {i + 1}</span>
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
              <div className="cc-field">
                <label className="cc-label">Exam</label>
                {/* Hidden input carries the value into FormData */}
                <input type="hidden" name={`exam_${i}_name`} value={row.exam_name} />
                <select
                  className="cc-select"
                  value={row.exam_name}
                  onChange={(e) => updateExam(i, e.target.value)}
                >
                  <option value="">Select exam</option>
                  {EXAM_OPTIONS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className="cc-field">
                <label className="cc-label">Attempts used so far</label>
                {/* Hidden input carries the value into FormData */}
                <input type="hidden" name={`exam_${i}_attempts`} value={row.attempts_used} />
                <input
                  type="number"
                  min={0}
                  max={20}
                  className="cc-input"
                  placeholder="0"
                  value={row.attempts_used}
                  onChange={(e) => updateAttempts(i, Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="self-start text-sm transition-colors"
          style={{ color: "var(--gold-dim)" }}
        >
          + Add exam
        </button>

        <div className="cc-form-nav">
          <a href="/onboarding/experience" className="cc-btn-link">← Back</a>
          <button type="submit" className="cc-btn-primary px-8 w-auto">
            Continue →
          </button>
        </div>
      </form>
    </div>
  )
}