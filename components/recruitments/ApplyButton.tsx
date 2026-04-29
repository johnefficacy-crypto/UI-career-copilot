"use client"

/**
 * components/recruitments/ApplyButton.tsx
 *
 * Client component — handles the "Apply now" CTA on the recruitment detail page.
 *
 * On click:
 *  1. POSTs an `apply_click` event to /api/events (telemetry, non-fatal)
 *  2. Opens the official notification URL in a new tab
 *  3. Flips local state to show "Opened application" confirmation
 *
 * `initialClicked` is derived server-side from user_exam_summary.clicked_apply
 * so the button reflects the user's known state on first render.
 */

import { useState } from "react"

type Props = {
  recruitmentId:  string
  officialUrl:    string | null
  applyStartDate: string | null
  applyEndDate:   string | null
  initialClicked: boolean
}

export function ApplyButton({
  recruitmentId,
  officialUrl,
  applyStartDate,
  applyEndDate,
  initialClicked,
}: Props) {
  const [clicked, setClicked] = useState(initialClicked)

  const now       = new Date()
  const startDate = applyStartDate ? new Date(applyStartDate) : null
  const endDate   = applyEndDate   ? new Date(applyEndDate)   : null

  const isClosed     = endDate   !== null && endDate   < now
  const notOpenYet   = startDate !== null && startDate > now
  const hasOfficialLink = !!officialUrl

  async function handleClick() {
    if (!officialUrl) return

    // Fire telemetry — non-fatal; don't block navigation on failure
    fetch("/api/events", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "recruitment",
        entity_id:   recruitmentId,
        event_type:  "apply_click",
        metadata:    { source: "detail_page" },
      }),
    }).catch(() => { /* telemetry is best-effort */ })

    setClicked(true)
    window.open(officialUrl, "_blank", "noopener,noreferrer")
  }

  // --- Closed state
  if (isClosed) {
    return (
      <span
        className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm"
        style={{
          background: "rgba(255,255,255,0.03)",
          color:      "rgba(255,255,255,0.30)",
          border:     "1px solid rgba(255,255,255,0.07)",
        }}
      >
        Application closed
      </span>
    )
  }

  // --- No official link yet
  if (!hasOfficialLink) {
    return (
      <span
        className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm"
        style={{
          background: "rgba(255,255,255,0.03)",
          color:      "rgba(255,255,255,0.30)",
          border:     "1px solid rgba(255,255,255,0.07)",
        }}
      >
        Official link not yet available
      </span>
    )
  }

  // --- Upcoming (not open yet)
  if (notOpenYet) {
    return (
      <div className="flex items-center gap-3">
        <button
          disabled
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.04)",
            color:      "rgba(255,255,255,0.35)",
            border:     "1px solid rgba(255,255,255,0.08)",
          }}
        >
          Applications not open yet
        </button>
        {startDate && (
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
            Opens{" "}
            {startDate.toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        )}
      </div>
    )
  }

  // --- Open / clicked
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
        style={{
          background: clicked
            ? "rgba(52,211,153,0.10)"
            : "rgba(232,213,163,0.14)",
          color: clicked ? "#34d399" : "#e8d5a3",
          border: `1px solid ${clicked
            ? "rgba(52,211,153,0.28)"
            : "rgba(232,213,163,0.28)"}`,
        }}
      >
        {clicked ? (
          <>
            <span aria-hidden>✓</span>
            Opened application
          </>
        ) : (
          <>
            Apply now
            <span aria-hidden>↗</span>
          </>
        )}
      </button>

      {clicked && (
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Opens on the official site
        </span>
      )}
    </div>
  )
}
