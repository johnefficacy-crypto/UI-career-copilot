"use client"

/**
 * app/dashboard/notifications/preferences/page.tsx
 *
 * Notification preferences page — lets users control which channels
 * they receive alerts on, at what priority threshold, and at what cadence.
 *
 * DPDP Act compliance: email defaults to OFF; user must explicitly opt in.
 *
 * API: GET/POST /api/notifications/preferences
 */

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"

type Prefs = {
  in_app_enabled:         boolean
  email_enabled:          boolean
  email_digest_frequency: "instant" | "daily" | "weekly" | "off"
  min_priority_email:     "low" | "medium" | "high" | "critical"
  min_priority_in_app:    "low" | "medium" | "high" | "critical"
}

const DEFAULT_PREFS: Prefs = {
  in_app_enabled:         true,
  email_enabled:          false,
  email_digest_frequency: "daily",
  min_priority_email:     "medium",
  min_priority_in_app:    "low",
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40"
      style={{
        background: checked ? "#e8d5a3" : "rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg transition duration-200"
        style={{
          background: checked ? "#0f0f0f" : "rgba(255,255,255,0.35)",
          transform: checked ? "translateX(20px)" : "translateX(0px)",
        }}
      />
    </button>
  )
}

function Select({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-1.5 text-sm"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "var(--text-primary, #e5e7eb)",
        outline: "none",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#1a1a1a" }}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-start justify-between gap-6 py-5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-muted, #6b7280)" }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center">{children}</div>
    </div>
  )
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs]   = useState<Prefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch current preferences on mount
  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((json) => {
        if (json.preferences) {
          setPrefs((prev) => ({ ...prev, ...json.preferences }))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setError(null)
  }

  function handleSave() {
    startTransition(async () => {
      setSaved(false)
      setError(null)
      try {
        const res = await fetch("/api/notifications/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Failed to save")
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      }
    })
  }

  const FREQUENCY_OPTIONS = [
    { value: "instant", label: "Instantly" },
    { value: "daily",   label: "Daily digest" },
    { value: "weekly",  label: "Weekly digest" },
    { value: "off",     label: "Off" },
  ]

  const PRIORITY_OPTIONS = [
    { value: "low",      label: "All (low and above)" },
    { value: "medium",   label: "Medium and above" },
    { value: "high",     label: "High and above only" },
    { value: "critical", label: "Critical only" },
  ]

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app, #0f0f0f)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ background: "rgba(15,15,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/dashboard/notifications"
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ← Notifications
          </Link>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            Preferences
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold text-white mb-1"
            style={{ fontFamily: "var(--font-serif, serif)" }}
          >
            Notification preferences
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Control how and when Career Copilot alerts you about new opportunities.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* In-app */}
            <div className="px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest pt-5 pb-3"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                In-app alerts
              </p>
              <Row
                label="In-app notifications"
                description="Show alerts inside the app as a notification feed on your dashboard."
              >
                <Toggle
                  checked={prefs.in_app_enabled}
                  onChange={(v) => update("in_app_enabled", v)}
                />
              </Row>
              <Row
                label="Minimum priority"
                description="Only show alerts at or above this priority level."
              >
                <Select
                  value={prefs.min_priority_in_app}
                  options={PRIORITY_OPTIONS}
                  onChange={(v) => update("min_priority_in_app", v as Prefs["min_priority_in_app"])}
                  disabled={!prefs.in_app_enabled}
                />
              </Row>
            </div>

            {/* Email */}
            <div className="px-6 pb-4">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest pt-5 pb-3"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Email alerts
              </p>

              <Row
                label="Email notifications"
                description={
                  "Receive alerts by email. Off by default — you must opt in. " +
                  "Unsubscribe any time. (DPDP Act compliant)"
                }
              >
                <Toggle
                  checked={prefs.email_enabled}
                  onChange={(v) => update("email_enabled", v)}
                />
              </Row>

              <Row
                label="Email frequency"
                description="How often we batch and send email digests."
              >
                <Select
                  value={prefs.email_digest_frequency}
                  options={FREQUENCY_OPTIONS}
                  onChange={(v) => update("email_digest_frequency", v as Prefs["email_digest_frequency"])}
                  disabled={!prefs.email_enabled}
                />
              </Row>

              <Row
                label="Minimum priority for email"
                description="Skip low-signal alerts — only email when priority meets this bar."
              >
                <Select
                  value={prefs.min_priority_email}
                  options={PRIORITY_OPTIONS}
                  onChange={(v) => update("min_priority_email", v as Prefs["min_priority_email"])}
                  disabled={!prefs.email_enabled}
                />
              </Row>
            </div>
          </div>
        )}

        {/* Save bar */}
        {!loading && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm h-5">
              {error && <span style={{ color: "#ef4444" }}>{error}</span>}
              {saved && !error && (
                <span style={{ color: "#34d399" }}>Preferences saved.</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: "#e8d5a3", color: "#0f0f0f" }}
            >
              {isPending ? "Saving…" : "Save preferences"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
