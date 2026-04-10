"use client"

/**
 * app/admin/sources/inspect/page.tsx
 * Career Copilot — Source Inspector
 *
 * Interactive tool that runs live HTTP probes against any URL and:
 *  - Shows each check (SSL, RSS, JSON, HTML, anti-bot, CAPTCHA) with pass/fail
 *  - Displays raw response excerpts as evidence
 *  - Auto-suggests all source_registry fields based on results
 *  - Links directly to /admin/sources with pre-filled query params to add the source
 *
 * This is a client component — all probing happens via the
 * inspectSource server action (actions/inspect-source.ts).
 */

import { useState, useTransition } from "react"
import Link from "next/link"
import { inspectSource } from "@/actions/inspect-source"
import type { InspectionResult, ProbeResult, ProbeStatus } from "@/actions/inspect-source"

// ─── Design tokens ────────────────────────────────────────────────────────────

const c = {
  bg:        "#0c0c0e",
  surface:   "#111114",
  surfaceMd: "#18181d",
  border:    "rgba(255,255,255,0.07)",
  borderMd:  "rgba(255,255,255,0.13)",
  text:      "rgba(255,255,255,0.88)",
  muted:     "rgba(255,255,255,0.48)",
  ghost:     "rgba(255,255,255,0.25)",
  gold:      "#e8d5a3",
  goldFaint: "rgba(232,213,163,0.08)",
  goldBorder:"rgba(232,213,163,0.25)",
  green:     "#4ade80",
  amber:     "#fbbf24",
  red:       "#f87171",
  blue:      "#7dd3fc",
  cyan:      "#67e8f9",
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusColor(s: ProbeStatus) {
  return s === "pass" ? c.green : s === "fail" ? c.red : s === "warn" ? c.amber : c.ghost
}
function statusBg(s: ProbeStatus) {
  return s === "pass" ? "rgba(74,222,128,0.10)" : s === "fail" ? "rgba(248,113,113,0.10)" :
         s === "warn" ? "rgba(251,191,36,0.10)"  : "rgba(255,255,255,0.04)"
}
function statusIcon(s: ProbeStatus) {
  return s === "pass" ? "✓" : s === "fail" ? "✗" : s === "warn" ? "!" : s === "running" ? "…" : "–"
}
function statusLabel(s: ProbeStatus) {
  return s === "pass" ? "PASS" : s === "fail" ? "FAIL" : s === "warn" ? "WARN" : s === "running" ? "RUNNING" : "SKIP"
}

// ─── Adapter badge colors ─────────────────────────────────────────────────────

const ADAPTER_COLORS: Record<string, [string, string]> = {
  json:       ["#4ade80", "rgba(74,222,128,0.12)"],
  rss:        ["#7dd3fc", "rgba(125,211,252,0.12)"],
  html:       ["#fbbf24", "rgba(251,191,36,0.12)"],
  pdf:        ["#c4b5fd", "rgba(196,181,253,0.12)"],
  playwright: ["#f87171", "rgba(248,113,113,0.12)"],
  manual:     ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.05)"],
}

const RISK_COLORS: Record<string, [string, string]> = {
  none:    ["#4ade80", "rgba(74,222,128,0.12)"],
  low:     ["#4ade80", "rgba(74,222,128,0.10)"],
  medium:  ["#fbbf24", "rgba(251,191,36,0.12)"],
  high:    ["#f87171", "rgba(248,113,113,0.12)"],
  blocked: ["#f87171", "rgba(248,113,113,0.15)"],
}

function Chip({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xs" style={{ color: c.ghost, letterSpacing: "0.06em" }}>{label}</span>
      <span className="font-mono text-sm font-medium px-2.5 py-1 rounded-lg text-center"
        style={{ color, background: bg, border: `1px solid ${color}30` }}>
        {value}
      </span>
    </div>
  )
}

// ─── Probe row ────────────────────────────────────────────────────────────────

function ProbeRow({ probe }: { probe: ProbeResult }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: c.surface, border: `1px solid ${probe.status === "fail" ? "rgba(248,113,113,0.22)" : probe.status === "warn" ? "rgba(251,191,36,0.18)" : c.border}` }}>
      <button
        type="button"
        className="w-full flex items-center gap-4 px-4 py-3 text-left"
        onClick={() => probe.raw && setExpanded(e => !e)}
        style={{ cursor: probe.raw ? "pointer" : "default" }}
      >
        {/* Status badge */}
        <span className="shrink-0 w-14 text-center font-mono text-xs font-bold rounded-md py-1"
          style={{ color: statusColor(probe.status), background: statusBg(probe.status) }}>
          {statusIcon(probe.status)} {statusLabel(probe.status)}
        </span>

        {/* Label + detail */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: c.text }}>{probe.label}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: c.muted }}>{probe.detail}</p>
        </div>

        {/* Duration */}
        {probe.durationMs !== undefined && (
          <span className="shrink-0 font-mono text-xs" style={{ color: c.ghost }}>
            {probe.durationMs}ms
          </span>
        )}

        {/* Expand toggle */}
        {probe.raw && (
          <span className="shrink-0 text-xs ml-1" style={{ color: c.ghost }}>
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </button>

      {/* Raw output */}
      {expanded && probe.raw && (
        <div className="px-4 pb-4">
          <pre className="rounded-lg px-4 py-3 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all"
            style={{ background: "#0d1117", border: `1px solid ${c.borderMd}`, color: "#a8c0d0", fontFamily: "'DM Mono', monospace" }}>
            {probe.raw}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Suggested fields panel ───────────────────────────────────────────────────

function SuggestedFields({ data }: { data: InspectionResult }) {
  const s = data.suggested
  const [adapterColor, adapterBg] = ADAPTER_COLORS[s.adapter_type] ?? ADAPTER_COLORS.manual
  const [riskColor, riskBg]       = RISK_COLORS[s.anti_bot_risk]   ?? RISK_COLORS.none

  // Build URL for "Add to Registry" — pre-fill query params
  const addParams = new URLSearchParams({
    prefill_url:         data.url,
    prefill_adapter:     s.adapter_type,
    prefill_rss:         s.rss_url ?? "",
    prefill_api:         s.api_url ?? "",
    prefill_risk:        s.anti_bot_risk,
    prefill_trust:       String(s.trust_score),
    prefill_playwright:  String(s.requires_playwright),
    prefill_captcha:     String(s.has_captcha),
    prefill_pdfonly:     String(s.pdf_only),
    prefill_interval:    String(s.scrape_interval_hours),
    prefill_active:      String(s.is_active),
  })

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: c.surface, border: `1px solid ${c.goldBorder}` }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${c.border}`, background: c.goldFaint }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: c.gold }}>Suggested Field Values</p>
          <p className="text-xs mt-0.5" style={{ color: c.muted }}>Based on probe results — review before saving</p>
        </div>
        <Link
          href={`/admin/sources?${addParams.toString()}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "rgba(232,213,163,0.18)", color: c.gold, border: `1px solid ${c.goldBorder}` }}>
          + Add to Registry →
        </Link>
      </div>

      {/* Fields grid */}
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Chip label="adapter_type"    value={s.adapter_type}    color={adapterColor} bg={adapterBg} />
        <Chip label="anti_bot_risk"   value={s.anti_bot_risk}   color={riskColor}    bg={riskBg} />
        <Chip label="trust_score"     value={s.trust_score.toFixed(2)}
          color={s.trust_score >= 0.85 ? c.green : s.trust_score >= 0.60 ? c.amber : c.red}
          bg={s.trust_score >= 0.85 ? "rgba(74,222,128,0.10)" : s.trust_score >= 0.60 ? "rgba(251,191,36,0.10)" : "rgba(248,113,113,0.10)"} />
        <Chip label="scrape_interval" value={`${s.scrape_interval_hours}h`}
          color={c.muted} bg="rgba(255,255,255,0.04)" />

        <Chip label="requires_playwright" value={s.requires_playwright ? "YES" : "no"}
          color={s.requires_playwright ? c.red : c.green}
          bg={s.requires_playwright ? "rgba(248,113,113,0.10)" : "rgba(74,222,128,0.08)"} />
        <Chip label="has_captcha" value={s.has_captcha ? "YES" : "no"}
          color={s.has_captcha ? c.red : c.green}
          bg={s.has_captcha ? "rgba(248,113,113,0.10)" : "rgba(74,222,128,0.08)"} />
        <Chip label="pdf_only" value={s.pdf_only ? "YES" : "no"}
          color={s.pdf_only ? c.amber : c.muted}
          bg={s.pdf_only ? "rgba(251,191,36,0.10)" : "rgba(255,255,255,0.04)"} />
        <Chip label="is_active" value={s.is_active ? "YES" : "NO"}
          color={s.is_active ? c.green : c.red}
          bg={s.is_active ? "rgba(74,222,128,0.10)" : "rgba(248,113,113,0.10)"} />
      </div>

      {/* Discovered URLs */}
      {(s.rss_url || s.api_url) && (
        <div className="px-5 pb-5 space-y-2" style={{ borderTop: `1px solid ${c.border}`, paddingTop: "16px" }}>
          {s.rss_url && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs shrink-0" style={{ color: c.muted }}>rss_url</span>
              <a href={s.rss_url} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs truncate hover:underline" style={{ color: c.cyan }}>
                {s.rss_url}
              </a>
            </div>
          )}
          {s.api_url && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs shrink-0" style={{ color: c.muted }}>api_url</span>
              <a href={s.api_url} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs truncate hover:underline" style={{ color: c.cyan }}>
                {s.api_url}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="px-5 pb-4">
        <p className="font-mono text-xs" style={{ color: c.ghost }}>{data.summary}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SourceInspectorPage() {
  const [url, setUrl]               = useState("")
  const [result, setResult]         = useState<InspectionResult | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [history, setHistory]       = useState<string[]>([])

  function handleInspect() {
    if (!url.trim()) return
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await inspectSource(url.trim())
      if (res.success && res.data) {
        setResult(res.data)
        setHistory(prev => [url.trim(), ...prev.filter(u => u !== url.trim())].slice(0, 8))
      } else {
        setError(res.error ?? "Unknown error")
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleInspect()
  }

  const passCount = result?.probes.filter(p => p.status === "pass").length ?? 0
  const warnCount = result?.probes.filter(p => p.status === "warn").length ?? 0
  const failCount = result?.probes.filter(p => p.status === "fail").length ?? 0

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 text-sm mb-6" style={{ color: "rgba(255,255,255,0.30)" }}>
          <Link href="/admin/sources" className="hover:text-white transition-colors">← Source Registry</Link>
          <span>/</span>
          <span style={{ color: "rgba(255,255,255,0.60)" }}>Source Inspector</span>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: c.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Source Inspector
            </h1>
            <p className="text-sm mt-1" style={{ color: c.muted }}>
              Paste any recruitment website URL — runs all field detection checks and suggests source_registry values.
            </p>
          </div>
          <Link href="/admin/sources/guide"
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: c.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${c.border}` }}>
            📖 Field Guide
          </Link>
        </div>
      </div>

      {/* URL input */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <label className="block text-xs font-medium uppercase tracking-widest" style={{ color: c.muted }}>
          URL to inspect
        </label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://upsc.gov.in/examinations/active-examinations"
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none font-mono"
            style={{
              background: c.surfaceMd,
              border:     `1px solid ${c.borderMd}`,
              color:      c.text,
            }}
          />
          <button
            type="button"
            onClick={handleInspect}
            disabled={isPending || !url.trim()}
            className="shrink-0 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: isPending ? c.goldFaint : "rgba(232,213,163,0.18)",
              color:      c.gold,
              border:     `1px solid ${c.goldBorder}`,
              opacity:    isPending || !url.trim() ? 0.6 : 1,
              cursor:     isPending || !url.trim() ? "not-allowed" : "pointer",
            }}>
            {isPending ? "Inspecting…" : "▶ Inspect"}
          </button>
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs" style={{ color: c.ghost }}>Recent:</span>
            {history.map(h => (
              <button key={h} type="button"
                onClick={() => { setUrl(h); setResult(null); setError(null) }}
                className="font-mono text-xs px-2 py-0.5 rounded truncate max-w-xs hover:text-white transition-colors"
                style={{ color: c.ghost, background: "rgba(255,255,255,0.04)", border: `1px solid ${c.border}` }}>
                {h.replace(/^https?:\/\//, "")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="space-y-2">
          {["SSL / Reachability", "robots.txt", "JSON API", "RSS / Atom Feed", "HTML Content Check", "Anti-Bot Risk Assessment", "CAPTCHA Detection"].map(label => (
            <div key={label} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: c.surface, border: `1px solid ${c.border}` }}>
              <span className="w-14 text-center font-mono text-xs rounded-md py-1"
                style={{ color: c.ghost, background: "rgba(255,255,255,0.04)" }}>… RUN</span>
              <div className="flex-1">
                <div className="h-3 w-40 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="h-2 w-64 rounded mt-2 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", color: c.red }}>
          ✗ {error}
        </div>
      )}

      {/* Results */}
      {result && !isPending && (
        <div className="space-y-6">

          {/* Result header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs" style={{ color: c.ghost }}>
                Inspected: <span style={{ color: c.cyan }}>{result.url}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: c.ghost }}>
                {new Date(result.inspectedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-1 rounded-lg" style={{ color: c.green, background: "rgba(74,222,128,0.10)" }}>✓ {passCount} pass</span>
              {warnCount > 0 && <span className="px-2 py-1 rounded-lg" style={{ color: c.amber, background: "rgba(251,191,36,0.10)" }}>! {warnCount} warn</span>}
              {failCount > 0 && <span className="px-2 py-1 rounded-lg" style={{ color: c.red, background: "rgba(248,113,113,0.10)" }}>✗ {failCount} fail</span>}
            </div>
          </div>

          {/* Suggested fields — shown at top for easy action */}
          <SuggestedFields data={result} />

          {/* Probe results */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: c.muted }}>
              Probe Details — click any row to expand raw output
            </p>
            <div className="space-y-2">
              {result.probes.map(probe => (
                <ProbeRow key={probe.id} probe={probe} />
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!result && !isPending && !error && (
        <div className="rounded-2xl px-6 py-14 text-center"
          style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <p className="text-3xl mb-3" style={{ opacity: 0.2 }}>🔍</p>
          <p className="text-sm font-medium mb-1" style={{ color: c.muted }}>Enter a URL above to start</p>
          <p className="text-xs" style={{ color: c.ghost }}>
            Runs 7 automated checks: SSL, robots.txt, JSON API, RSS, HTML content, anti-bot risk, CAPTCHA detection.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {[
              "https://upsc.gov.in/examinations/active-examinations",
              "https://ibps.in/category/crp-clerks/",
              "https://sbi.co.in/web/careers/current-openings",
              "https://employmentnews.gov.in",
            ].map(example => (
              <button key={example} type="button"
                onClick={() => setUrl(example)}
                className="font-mono text-xs px-3 py-1.5 rounded-lg hover:text-white transition-colors"
                style={{ color: c.ghost, background: "rgba(255,255,255,0.03)", border: `1px solid ${c.border}` }}>
                {example.replace("https://", "")}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}