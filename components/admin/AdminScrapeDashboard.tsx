"use client"

/**
 * components/admin/AdminScrapeDashboard.tsx
 * Career Copilot — Admin Scrape Dashboard v2
 *
 * Full-featured admin dashboard for the notification engine:
 *  - Stats tiles
 *  - Trigger controls
 *  - Queue review with approve/reject
 *  - Source health grid
 *  - Run history
 */

import { useState, useTransition } from "react"
import {
  adminTriggerScraper,
  adminTriggerDeadlineSweep,
  adminApproveQueueItem,
  adminRejectQueueItem,
  adminToggleScrapeSource,
} from "@/actions/notifications"
import type {
  ScrapeRun,
  ScrapeSource,
  ScraperStats,
  QueueReviewItem,
  SourceHealthSnapshot,
} from "@/types/notifications"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "var(--success)",
    partial:   "var(--warning)",
    failed:    "var(--danger)",
    running:   "var(--gold)",
    pending:   "var(--text-muted)",
    approved:  "var(--success)",
    rejected:  "var(--danger)",
    duplicate: "var(--text-ghost)",
  }
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        color:      map[status] ?? "var(--text-muted)",
        background: `${map[status] ?? "var(--text-muted)"}18`,
        border:     `1px solid ${map[status] ?? "var(--text-muted)"}33`,
      }}
    >
      {status}
    </span>
  )
}

function tierBadge(tier: number) {
  const colors = ["", "var(--gold)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0.3)"]
  const labels = ["", "T1 Official", "T2 Aggregator", "T3 Supplemental"]
  return (
    <span
      className="text-xs px-1.5 py-px rounded font-medium"
      style={{
        color:      colors[tier] ?? "var(--text-ghost)",
        background: `${colors[tier]}15`,
        border:     `1px solid ${colors[tier]}30`,
      }}
    >
      {labels[tier] ?? `T${tier}`}
    </span>
  )
}

function confBar(score: number) {
  const pct   = Math.round(score * 100)
  const color = score >= 0.90 ? "var(--success)" : score >= 0.70 ? "var(--warning)" : "var(--danger)"
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 rounded-full flex-1"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color, minWidth: "32px" }}>{pct}%</span>
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: color ?? "rgba(255,255,255,0.85)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>{sub}</p>
      )}
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function Tab({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
      style={{
        background:  active ? "var(--bg-surface-md)" : "transparent",
        color:       active ? "rgba(255,255,255,0.85)" : "var(--text-ghost)",
        border:      "1px solid",
        borderColor: active ? "var(--border-md)" : "transparent",
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className="text-xs px-1.5 py-px rounded-full"
          style={{ background: "var(--gold-faint)", color: "var(--gold)" }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Queue row ────────────────────────────────────────────────────────────────

function QueueRow({ item, onApprove, onReject, disabled }: {
  item:      QueueReviewItem
  onApprove: (id: string) => void
  onReject:  (id: string) => void
  disabled:  boolean
}) {
  const conf = item.confidence_score ?? 0
  return (
    <div
      className="grid gap-3 px-4 py-3 rounded-xl"
      style={{
        background:   "var(--bg-surface)",
        border:       "1px solid var(--border)",
        gridTemplateColumns: "1fr 120px 80px 120px",
        alignItems:   "center",
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.80)" }}>
          {item.title ?? "Unknown title"}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-dim)" }}>
          {item.org_name ?? "—"} · {item.source_name}
          {item.apply_end_date ? ` · Apply by ${item.apply_end_date}` : ""}
        </p>
        {item.canonical_name && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>
            Matched: {item.canonical_name}
          </p>
        )}
      </div>

      <div>{confBar(conf)}</div>

      <div>{statusBadge(item.status)}</div>

      {item.status === "pending" ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onApprove(item.id)}
            disabled={disabled}
            className="flex-1 text-xs py-1 rounded-lg transition-colors font-medium"
            style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)", border: "1px solid rgba(34,197,94,0.30)" }}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onReject(item.id)}
            disabled={disabled}
            className="flex-1 text-xs py-1 rounded-lg transition-colors font-medium"
            style={{ background: "rgba(239,68,68,0.10)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            Reject
          </button>
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}

// ─── Source health row ────────────────────────────────────────────────────────

function SourceHealthRow({
  snap,
  onToggle,
  disabled,
}: {
  snap:     SourceHealthSnapshot
  onToggle: (id: string, active: boolean) => void
  disabled: boolean
}) {
  const lastScrape = snap.last_scraped_at
    ? new Date(snap.last_scraped_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
    : "Never"

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background:   "var(--bg-surface)",
        border:       `1px solid ${snap.is_active && snap.is_healthy ? "var(--border)" : "rgba(239,68,68,0.25)"}`,
        opacity:      snap.is_active ? 1 : 0.5,
      }}
    >
      {/* Health dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: !snap.is_active ? "var(--text-ghost)" : snap.is_healthy ? "var(--success)" : "var(--danger)" }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.80)" }}>
            {snap.name}
          </p>
          {tierBadge(snap.tier)}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>
          Last scraped: {lastScrape}
          {snap.consecutive_fails > 0 ? ` · ${snap.consecutive_fails} fails` : ""}
          {snap.avg_confidence !== null
            ? ` · Avg conf: ${Math.round((snap.avg_confidence ?? 0) * 100)}%`
            : ""}
          {` · ${snap.items_7d} items (7d)`}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(snap.source_id, snap.is_active)}
        className="text-xs px-3 py-1 rounded-lg transition-colors"
        style={{
          background:  snap.is_active ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
          color:       snap.is_active ? "var(--danger)" : "var(--success)",
          border:      `1px solid ${snap.is_active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
        }}
      >
        {snap.is_active ? "Disable" : "Enable"}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  stats:         ScraperStats
  recentRuns:    ScrapeRun[]
  pendingQueue:  QueueReviewItem[]
  sources:       ScrapeSource[]
  sourceHealth:  SourceHealthSnapshot[]
  errorMessage?: string
  activeTab:     string
}

export function AdminScrapeDashboard({
  stats,
  recentRuns: initialRuns,
  pendingQueue: initialQueue,
  sources: initialSources,
  sourceHealth,
  errorMessage,
  activeTab: initialTab,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [tab, setTab]                = useState(initialTab)
  const [queue, setQueue]            = useState(initialQueue)
  const [sources, setSources]        = useState(initialSources)
  const [runMessage, setRunMessage]  = useState<string | null>(null)
  const [runError, setRunError]      = useState<string | null>(errorMessage ?? null)

  const pendingCount = queue.filter((q) => q.status === "pending").length

  // ── Actions ──
  function handleTriggerScraper() {
    setRunMessage(null)
    setRunError(null)
    startTransition(async () => {
      const result = await adminTriggerScraper()
      if (result.success) {
        setRunMessage(result.message)
      } else {
        setRunError(result.message)
      }
    })
  }

  function handleTriggerDeadlines() {
    setRunMessage(null)
    startTransition(async () => {
      const result = await adminTriggerDeadlineSweep()
      setRunMessage(result.message)
    })
  }

  function handleApprove(itemId: string) {
    setQueue((prev) => prev.map((q) => q.id === itemId ? { ...q, status: "approved" as const } : q))
    const fd = new FormData()
    fd.set("item_id", itemId)
    startTransition(() => adminApproveQueueItem(fd))
  }

  function handleReject(itemId: string) {
    setQueue((prev) => prev.map((q) => q.id === itemId ? { ...q, status: "rejected" as const } : q))
    const fd = new FormData()
    fd.set("item_id", itemId)
    startTransition(() => adminRejectQueueItem(fd))
  }

  function handleToggleSource(sourceId: string, isActive: boolean) {
    setSources((prev) =>
      prev.map((s) => s.id === sourceId ? { ...s, is_active: !isActive } : s)
    )
    const fd = new FormData()
    fd.set("source_id", sourceId)
    fd.set("active", String(!isActive))
    startTransition(() => adminToggleScrapeSource(fd))
  }

  const lastRun = stats.lastRun

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.90)" }}>
            Scrape Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Notification engine operations & monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTriggerDeadlines}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl transition-colors font-medium"
            style={{
              background:  "rgba(255,255,255,0.06)",
              color:       "rgba(255,255,255,0.70)",
              border:      "1px solid var(--border)",
            }}
          >
            {isPending ? "Running…" : "Deadline Sweep"}
          </button>
          <button
            type="button"
            onClick={handleTriggerScraper}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl transition-colors font-medium"
            style={{
              background:  isPending ? "rgba(232,213,163,0.10)" : "rgba(232,213,163,0.15)",
              color:       "var(--gold)",
              border:      "1px solid var(--gold-border)",
            }}
          >
            {isPending ? "Running…" : "▶ Run Scraper"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {runMessage && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "var(--success)" }}
        >
          ✓ {runMessage}
        </div>
      )}
      {runError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)" }}
        >
          ✗ {runError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Pending Review"
          value={stats.pendingReview}
          sub="Need admin approval"
          color={stats.pendingReview > 0 ? "var(--gold)" : undefined}
        />
        <StatTile
          label="Healthy Sources"
          value={stats.healthySources}
          sub={`${stats.failedSources} failing`}
          color={stats.failedSources > 0 ? "var(--warning)" : "var(--success)"}
        />
        <StatTile
          label="Last Run"
          value={lastRun ? lastRun.status : "—"}
          sub={lastRun
            ? `${lastRun.items_new} new · ${lastRun.items_duplicate} dup`
            : "No runs yet"}
          color={lastRun?.status === "completed" ? "var(--success)" : "var(--warning)"}
        />
        <StatTile
          label="Last Run At"
          value={lastRun
            ? new Date(lastRun.started_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "—"}
          sub={lastRun
            ? new Date(lastRun.started_at).toLocaleDateString("en-IN")
            : ""}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tab label="Queue Review" active={tab === "queue"} count={pendingCount} onClick={() => setTab("queue")} />
        <Tab label="Source Health" active={tab === "sources"} onClick={() => setTab("sources")} />
        <Tab label="Run History" active={tab === "runs"} onClick={() => setTab("runs")} />
      </div>

      {/* Tab content */}
      {tab === "queue" && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Pending items — {pendingCount} awaiting review
          </p>
          {queue.length === 0 ? (
            <div
              className="rounded-xl px-4 py-8 text-center"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>Queue is empty</p>
            </div>
          ) : (
            queue.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
                disabled={isPending}
              />
            ))
          )}
        </div>
      )}

      {tab === "sources" && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Source health — {sourceHealth.length} total
          </p>
          {sourceHealth.map((snap) => (
            <SourceHealthRow
              key={snap.source_id}
              snap={snap}
              onToggle={handleToggleSource}
              disabled={isPending}
            />
          ))}
        </div>
      )}

      {tab === "runs" && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Recent runs
          </p>
          {initialRuns.length === 0 ? (
            <div
              className="rounded-xl px-4 py-8 text-center"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>No runs yet</p>
            </div>
          ) : (
            initialRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {statusBadge(run.status)}
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
                      {new Date(run.started_at).toLocaleString("en-IN", {
                        dateStyle: "short", timeStyle: "short",
                      })}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-ghost)" }}>
                      by {run.triggered_by}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>
                    {run.sources_checked} sources · {run.items_found} found
                    · {run.items_new} new · {run.items_duplicate} dup
                  </p>
                </div>
                {run.finished_at && (
                  <span className="text-xs tabular-nums" style={{ color: "var(--text-ghost)" }}>
                    {Math.round(
                      (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000
                    )}s
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}