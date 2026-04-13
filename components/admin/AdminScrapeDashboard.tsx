"use client"

/**
 * components/admin/AdminScrapeDashboard.tsx
 * Career Copilot — Admin Scrape Dashboard (Phase 2, cleaned)
 *
 * FIXES:
 *  - Removed ~550 lines of dead commented-out v1 code
 *  - Added Link to /admin/sources for full CRUD on the registry tab
 *  - StatTile sub-text for sources registered shows active count
 *  - handleToggleRegistry optimistically updates state before server call
 *  - confBar helper complete and correct
 *  - All imports are live (no unused or missing imports)
 */

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  adminTriggerScraper,
  adminTriggerDeadlineSweep,
  adminApproveQueueItem,
  adminRejectQueueItem,
  adminToggleScrapeSource,
  adminResetSourceFails,
} from "@/actions/notifications"
import type {
  ScrapeRun,
  ScraperStats,
  QueueReviewItem,
  SourceHealthSnapshot,
} from "@/types/notifications"
import type { SourceRegistryEntry } from "@/lib/db/source-registry"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
  1: "T1 Official", 2: "T2 Important", 3: "T3 Secondary", 4: "T4 Aggregator"
}
const TIER_COLORS: Record<number, string> = {
  1: "var(--gold)", 2: "rgba(255,255,255,0.65)", 3: "rgba(255,255,255,0.40)", 4: "rgba(255,255,255,0.25)"
}
const CAT_LABELS: Record<string, string> = {
  central_govt: "Central Govt", banking: "Banking", regulatory: "Regulatory",
  insurance: "Insurance", psu: "PSU", state_psc: "State PSC",
  state_subordinate: "State Boards", university: "University", cet: "CET",
  defence: "Defence", courts: "Courts", municipal: "Municipal",
  boards: "Boards", commissions: "Commissions",
}

function badge(text: string, color: string, bg: string) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color, background: bg, border: `1px solid ${color}30` }}>
      {text}
    </span>
  )
}

function statusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    completed: ["var(--success)",    "rgba(34,197,94,0.10)"],
    partial:   ["var(--warning)",    "rgba(245,158,11,0.10)"],
    failed:    ["var(--danger)",     "rgba(239,68,68,0.10)"],
    running:   ["var(--gold)",       "rgba(232,213,163,0.10)"],
    pending:   ["var(--text-muted)", "rgba(255,255,255,0.04)"],
    approved:  ["var(--success)",    "rgba(34,197,94,0.10)"],
    rejected:  ["var(--danger)",     "rgba(239,68,68,0.10)"],
    duplicate: ["var(--text-ghost)", "rgba(255,255,255,0.04)"],
  }
  const [color, bg] = map[status] ?? map.pending
  return badge(status, color, bg)
}

function confBar(score: number) {
  const pct   = Math.round((score ?? 0) * 100)
  const color = score >= 0.90
    ? "var(--success)"
    : score >= 0.70
      ? "var(--warning)"
      : "var(--danger)"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full flex-1" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color, minWidth: "32px" }}>{pct}%</span>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: color ?? "rgba(255,255,255,0.85)" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>{sub}</p>}
    </div>
  )
}

function Tab({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
      style={{
        background:  active ? "var(--bg-surface-md)" : "transparent",
        color:       active ? "rgba(255,255,255,0.85)" : "var(--text-ghost)",
        border:      "1px solid",
        borderColor: active ? "var(--border-md)" : "transparent",
      }}>
      {label}
      {count !== undefined && count > 0 && (
        <span className="text-xs px-1.5 py-px rounded-full"
          style={{ background: "var(--gold-faint)", color: "var(--gold)" }}>
          {count}
        </span>
      )}
    </button>
  )
}

function QueueRow({ item, onApprove, onReject, disabled }: {
  item: QueueReviewItem; onApprove: (id: string) => void
  onReject: (id: string) => void; disabled: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.80)" }}>
          {item.title ?? "Unknown title"}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-dim)" }}>
          {item.org_name ?? "—"} · {item.source_name}
          {item.apply_end_date ? ` · Apply by ${item.apply_end_date}` : ""}
        </p>
        {item.canonical_name && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>
            Matched: {item.canonical_name}
          </p>
        )}
      </div>
      <div className="w-24 shrink-0">{confBar(item.confidence_score ?? 0)}</div>
      <div className="shrink-0">{statusBadge(item.status)}</div>
      {item.status === "pending" ? (
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => onApprove(item.id)} disabled={disabled}
            className="text-xs px-3 py-1 rounded-lg font-medium"
            style={{ background: "rgba(34,197,94,0.12)", color: "var(--success)", border: "1px solid rgba(34,197,94,0.25)" }}>
            Approve
          </button>
          <button type="button" onClick={() => onReject(item.id)} disabled={disabled}
            className="text-xs px-3 py-1 rounded-lg font-medium"
            style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.20)" }}>
            Reject
          </button>
        </div>
      ) : <div className="w-32 shrink-0" />}
    </div>
  )
}

function SourceHealthRow({ snap, onToggle, onReset, disabled }: {
  snap: SourceHealthSnapshot; onToggle: (id: string, active: boolean) => void
  onReset: (id: string) => void; disabled: boolean
}) {
  const healthy    = snap.consecutive_fails < 5
  const lastScrape = snap.last_scraped_at
    ? new Date(snap.last_scraped_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
    : "Never"

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        border:     `1px solid ${snap.is_active && healthy ? "var(--border)" : "rgba(239,68,68,0.25)"}`,
        opacity:    snap.is_active ? 1 : 0.5,
      }}>
      <span className="w-2 h-2 rounded-full shrink-0"
        style={{ background: !snap.is_active ? "var(--text-ghost)" : healthy ? "var(--success)" : "var(--danger)" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.80)" }}>
            {snap.name}
          </p>
          <span className="text-xs px-1.5 py-px rounded font-medium"
            style={{
              color:      TIER_COLORS[snap.tier ?? 2],
              background: `${TIER_COLORS[snap.tier ?? 2]}15`,
              border:     `1px solid ${TIER_COLORS[snap.tier ?? 2]}25`,
            }}>
            {TIER_LABELS[snap.tier ?? 2]}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>
          Last: {lastScrape}
          {snap.consecutive_fails > 0 ? ` · ${snap.consecutive_fails} fails` : ""}
          {snap.avg_confidence != null ? ` · Avg: ${Math.round((snap.avg_confidence) * 100)}%` : ""}
          {` · ${snap.items_7d} items/7d`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {snap.consecutive_fails > 0 && (
          <button type="button" onClick={() => onReset(snap.source_id)} disabled={disabled}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: "rgba(232,213,163,0.08)", color: "var(--gold)", border: "1px solid var(--gold-border)" }}>
            Reset
          </button>
        )}
        <button type="button" onClick={() => onToggle(snap.source_id, snap.is_active)} disabled={disabled}
          className="text-xs px-3 py-1 rounded-lg"
          style={{
            background: snap.is_active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
            color:      snap.is_active ? "var(--danger)" : "var(--success)",
            border:     `1px solid ${snap.is_active ? "rgba(239,68,68,0.20)" : "rgba(34,197,94,0.20)"}`,
          }}>
          {snap.is_active ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  )
}

function RegistryRow({ src, onToggle, disabled }: {
  src: SourceRegistryEntry; onToggle: (id: string, active: boolean) => void; disabled: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        opacity:    src.is_active ? 1 : 0.5,
      }}>
      <span className="w-2 h-2 rounded-full shrink-0"
        style={{ background: src.is_active ? (src.consecutive_fails < 5 ? "var(--success)" : "var(--danger)") : "var(--text-ghost)" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.80)" }}>
            {src.source_name}
            {src.short_code && (
              <span className="ml-1 text-xs" style={{ color: "var(--text-ghost)" }}>
                ({src.short_code})
              </span>
            )}
          </p>
          <span className="text-xs px-1.5 py-px rounded font-medium"
            style={{ color: TIER_COLORS[src.tier], background: `${TIER_COLORS[src.tier]}15` }}>
            {TIER_LABELS[src.tier]}
          </span>
          <span className="text-xs px-1.5 py-px rounded"
            style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" }}>
            {CAT_LABELS[src.category] ?? src.category}
          </span>
          <span className="text-xs px-1.5 py-px rounded"
            style={{ color: "var(--text-ghost)", background: "rgba(255,255,255,0.03)" }}>
            {src.adapter_type}
          </span>
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-ghost)" }}>
          {src.notification_url ?? src.official_url}
          {src.consecutive_fails > 0 ? ` · ⚠ ${src.consecutive_fails} fails` : ""}
          {src.last_error ? ` · ${src.last_error.slice(0, 60)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {src.is_verified && (
          <span className="text-xs mr-1" style={{ color: "var(--success)" }}>✓</span>
        )}
        <button type="button" onClick={() => onToggle(src.id, src.is_active)} disabled={disabled}
          className="text-xs px-3 py-1 rounded-lg"
          style={{
            background: src.is_active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
            color:      src.is_active ? "var(--danger)" : "var(--success)",
            border:     `1px solid ${src.is_active ? "rgba(239,68,68,0.20)" : "rgba(34,197,94,0.20)"}`,
          }}>
          {src.is_active ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  stats:          ScraperStats
  recentRuns:     ScrapeRun[]
  pendingQueue:   QueueReviewItem[]
  sourceHealth:   SourceHealthSnapshot[]
  sourceRegistry: SourceRegistryEntry[]
  errorMessage?:  string
  activeTab:      string
}

export function AdminScrapeDashboard({
  stats,
  recentRuns: initialRuns,
  pendingQueue: initialQueue,
  sourceHealth,
  sourceRegistry: initialRegistry,
  errorMessage,
  activeTab: initialTab,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [tab, setTab]                = useState(initialTab)
  const [queue, setQueue]            = useState(initialQueue)
  const [registry, setRegistry]      = useState(initialRegistry)
  const [catFilter, setCatFilter]    = useState<string>("all")
  const [runMsg, setRunMsg]          = useState<string | null>(null)
  const [runErr, setRunErr]          = useState<string | null>(errorMessage ?? null)

  const pendingCount    = queue.filter(q => q.status === "pending").length
  const categories      = [...new Set(registry.map(s => s.category))].sort()
  const filteredRegistry = catFilter === "all"
    ? registry
    : registry.filter(s => s.category === catFilter)

  function handleTrigger() {
    setRunMsg(null); setRunErr(null)
    startTransition(async () => {
      const r = await adminTriggerScraper()
      if (r.success) setRunMsg(r.message)
      else setRunErr(r.message)
    })
  }

  function handleDeadlines() {
    setRunMsg(null)
    startTransition(async () => {
      const r = await adminTriggerDeadlineSweep()
      setRunMsg(r.message)
    })
  }

  function handleApprove(id: string) {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: "approved" as const } : q))
    const fd = new FormData(); fd.set("item_id", id)
    startTransition(() => adminApproveQueueItem(fd))
  }

  function handleReject(id: string) {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: "rejected" as const } : q))
    const fd = new FormData(); fd.set("item_id", id)
    startTransition(() => adminRejectQueueItem(fd))
  }

  function handleToggleRegistry(id: string, isActive: boolean) {
    // Optimistic update
    setRegistry(prev => prev.map(s => s.id === id ? { ...s, is_active: !isActive } : s))
    const fd = new FormData()
    fd.set("source_id", id)
    fd.set("active", String(!isActive))
    startTransition(() => adminToggleScrapeSource(fd))
  }

  function handleToggleHealth(id: string, isActive: boolean) {
    const fd = new FormData()
    fd.set("source_id", id)
    fd.set("active", String(!isActive))
    startTransition(() => adminToggleScrapeSource(fd))
  }

  function handleReset(id: string) {
    startTransition(async () => {
      await adminResetSourceFails(id)
    })
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
            Phase 2 — {registry.length} sources registered · {registry.filter(s => s.is_active).length} active
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleDeadlines} disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid var(--border)" }}>
            Deadline Sweep
          </button>
          <button type="button" onClick={handleTrigger} disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl font-medium transition-colors"
            style={{
              background: isPending ? "rgba(232,213,163,0.08)" : "rgba(232,213,163,0.15)",
              color: "var(--gold)",
              border: "1px solid var(--gold-border)",
              opacity: isPending ? 0.7 : 1,
            }}>
            {isPending ? "Running…" : "▶ Run Scraper"}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {runMsg && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "var(--success)" }}>
          ✓ {runMsg}
        </div>
      )}
      {runErr && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)" }}>
          ✗ {runErr}
        </div>
      )}

      {/* Stats row */}
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
          label="Registered Sources"
          value={registry.length}
          sub={`${registry.filter(s => s.is_active).length} active · ${registry.filter(s => s.is_verified).length} verified`}
        />
        <StatTile
          label="Last Run"
          value={lastRun?.status ?? "—"}
          color={lastRun?.status === "completed" ? "var(--success)" : "var(--warning)"}
          sub={lastRun ? `${lastRun.items_new} new · ${lastRun.items_duplicate} dup` : "No runs yet"}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tab label="Queue Review"   active={tab === "queue"}    count={pendingCount} onClick={() => setTab("queue")} />
        <Tab label="Source Registry" active={tab === "registry"} count={registry.length} onClick={() => setTab("registry")} />
        <Tab label="Source Health"  active={tab === "health"}   onClick={() => setTab("health")} />
        <Tab label="Run History"    active={tab === "runs"}     onClick={() => setTab("runs")} />
      </div>

      {/* ── Queue Tab ──────────────────────────────────────────────────────────── */}
      {tab === "queue" && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {pendingCount} items awaiting review
          </p>
          {queue.length === 0 ? (
            <div className="rounded-xl px-4 py-8 text-center"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>Queue is empty</p>
            </div>
          ) : queue.map(item => (
            <QueueRow
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={isPending}
            />
          ))}
        </div>
      )}

      {/* ── Source Registry Tab ────────────────────────────────────────────────── */}
      {tab === "registry" && (
        <div className="space-y-3">
          {/* Header with link to full CRUD page */}
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {filteredRegistry.length} of {registry.length} sources
            </p>
            <Link href="/admin/sources"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "rgba(201,153,42,0.12)", color: "var(--gold)", border: "1px solid rgba(201,153,42,0.25)" }}>
              Full CRUD Editor →
            </Link>
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[{ value: "all", label: `All (${registry.length})` },
              ...categories.map(cat => ({
                value: cat,
                label: `${CAT_LABELS[cat] ?? cat} (${registry.filter(s => s.category === cat).length})`
              }))
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => setCatFilter(opt.value)}
                className="text-xs px-3 py-1 rounded-lg transition-colors"
                style={{
                  background:  catFilter === opt.value ? "var(--bg-surface-md)" : "transparent",
                  color:       catFilter === opt.value ? "rgba(255,255,255,0.80)" : "var(--text-ghost)",
                  border:      "1px solid var(--border)",
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredRegistry.length === 0 ? (
              <div className="rounded-xl px-4 py-8 text-center"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--text-dim)" }}>No sources in this category</p>
              </div>
            ) : filteredRegistry.map(src => (
              <RegistryRow
                key={src.id}
                src={src}
                onToggle={handleToggleRegistry}
                disabled={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Source Health Tab ──────────────────────────────────────────────────── */}
      {tab === "health" && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {sourceHealth.length} sources monitored
          </p>
          {sourceHealth.length === 0 ? (
            <div className="rounded-xl px-4 py-8 text-center"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>No health data yet</p>
            </div>
          ) : sourceHealth.map(snap => (
            <SourceHealthRow
              key={snap.source_id}
              snap={snap}
              onToggle={handleToggleHealth}
              onReset={handleReset}
              disabled={isPending}
            />
          ))}
        </div>
      )}

      {/* ── Run History Tab ────────────────────────────────────────────────────── */}
      {tab === "runs" && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {initialRuns.length} recent runs
          </p>
          {initialRuns.length === 0 ? (
            <div className="rounded-xl px-4 py-8 text-center"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>No runs yet — trigger the scraper above</p>
            </div>
          ) : initialRuns.map(run => (
            <div key={run.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {statusBadge(run.status)}
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
                    {new Date(run.started_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-ghost)" }}>
                    by {run.triggered_by}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-ghost)" }}>
                  {run.sources_checked} sources · {run.items_found} found · {run.items_new} new · {run.items_duplicate} dup
                </p>
              </div>
              {run.finished_at && (
                <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--text-ghost)" }}>
                  {Math.round(
                    (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000
                  )}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}