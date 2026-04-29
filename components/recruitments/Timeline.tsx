/**
 * components/recruitments/Timeline.tsx
 *
 * Server component — renders a horizontal recruitment timeline showing
 * key milestones: notification release → application opens → application closes.
 *
 * Visual language:
 *   • Green  (◉) — milestone is in the past
 *   • Gold   (◉) — the active window (today falls inside this period)
 *   • Ghost  (○) — upcoming milestone
 *
 * Used by app/dashboard/recruitments/[id]/page.tsx
 */

import { Fragment } from "react"

export type TimelineStep = {
  label: string        // e.g. "Notification"
  date:  string | null // ISO date string or null
  isPast:   boolean
  isActive: boolean    // today falls on or after this milestone
}

function fmt(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div
      role="list"
      aria-label="Application timeline"
      className="flex items-start w-full overflow-x-auto pb-1"
    >
      {steps.map((step, i) => {
        const dotColor   = step.isPast   ? "#34d399"
                         : step.isActive ? "#e8d5a3"
                         :                 "rgba(255,255,255,0.18)"
        const dotBorder  = step.isPast   ? "#34d399"
                         : step.isActive ? "#e8d5a3"
                         :                 "rgba(255,255,255,0.18)"
        const labelColor = step.isActive ? "#e8d5a3"
                         : step.isPast   ? "rgba(52,211,153,0.75)"
                         :                 "rgba(255,255,255,0.30)"
        const dateColor  = step.isActive ? "rgba(255,255,255,0.85)"
                         : step.isPast   ? "rgba(255,255,255,0.50)"
                         :                 "rgba(255,255,255,0.40)"
        // Line to the left of this step is colored green if the previous step is past
        const leftLineColor =
          i > 0 && steps[i - 1].isPast
            ? "rgba(52,211,153,0.45)"
            : "rgba(255,255,255,0.08)"

        return (
          <Fragment key={step.label}>
            {/* Connector line before each step (except the first) */}
            {i > 0 && (
              <div
                aria-hidden
                className="flex-1 min-w-[24px] h-px mt-[6px] shrink"
                style={{ background: leftLineColor }}
              />
            )}

            {/* Milestone dot + text */}
            <div
              role="listitem"
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              {/* Dot */}
              <div
                aria-hidden
                className="w-[12px] h-[12px] rounded-full"
                style={{
                  background:  dotColor,
                  border:      `2px solid ${dotBorder}`,
                  boxShadow:   step.isActive
                    ? "0 0 0 4px rgba(232,213,163,0.12)"
                    : "none",
                }}
              />

              {/* Labels */}
              <div className="text-center" style={{ maxWidth: 88 }}>
                <div
                  className="text-[10px] uppercase tracking-widest font-medium leading-tight"
                  style={{ color: labelColor }}
                >
                  {step.label}
                </div>
                <div
                  className="text-[11px] mt-0.5 leading-tight"
                  style={{ color: dateColor }}
                >
                  {fmt(step.date)}
                </div>
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

/**
 * buildTimelineSteps — derives TimelineStep[] from raw recruitment dates.
 * Called from the page (server component) so the logic lives server-side.
 */
export function buildTimelineSteps(opts: {
  notification_date:  string | null
  apply_start_date:   string | null
  apply_end_date:     string | null
}): TimelineStep[] {
  const now = Date.now()

  function isPast(d: string | null): boolean {
    if (!d) return false
    return new Date(d).getTime() < now
  }

  const notifPast  = isPast(opts.notification_date)
  const startPast  = isPast(opts.apply_start_date)
  const endPast    = isPast(opts.apply_end_date)

  // "Apply open" is the active window when apply has started but not yet closed
  const applyActive = startPast && !endPast

  return [
    {
      label:    "Notification",
      date:     opts.notification_date,
      isPast:   notifPast,
      isActive: notifPast && !startPast,  // between notification and apply open
    },
    {
      label:    "Apply opens",
      date:     opts.apply_start_date,
      isPast:   startPast,
      isActive: applyActive,
    },
    {
      label:    "Apply closes",
      date:     opts.apply_end_date,
      isPast:   endPast,
      isActive: false,  // "closing" is not an active state — it's just upcoming or past
    },
  ]
}
