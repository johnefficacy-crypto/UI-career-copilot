"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { signOut } from "@/actions/auth"

interface Props {
  fullName:   string | null
  planId:     string | null
  avatarUrl:  string | null
  isAdmin:    boolean
}

const PLAN_LABELS: Record<string, string> = {
  free:  "Free",
  pro:   "Pro",
  elite: "Elite",
}

export function UserNav({ fullName, planId, avatarUrl, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const initial = fullName?.[0]?.toUpperCase() ?? "?"
  const planLabel = PLAN_LABELS[planId ?? "free"] ?? "Free"
  const paidPlan = planId === "pro" || planId === "elite"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cc-focus-ring flex items-center gap-2.5 rounded-xl border px-2 py-1.5 transition-colors"
        style={{
          background: open ? "#f3f4f6" : "transparent",
          borderColor: open ? "#d1d5db" : "transparent",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
      >
        <div
          className="h-7 w-7 shrink-0 rounded-full border flex items-center justify-center text-xs font-semibold overflow-hidden"
          style={{
            background: avatarUrl ? "transparent" : "#f3f4f6",
            borderColor: "#e5e7eb",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName ?? "User"}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span style={{ color: "#111827", fontFamily: "var(--font-serif)" }}>
              {initial}
            </span>
          )}
        </div>

        <div className="hidden sm:flex flex-col items-start leading-none">
          <span className="text-xs font-medium" style={{ color: "#111827" }}>
            {fullName ?? "Aspirant"}
          </span>
          <span
            className="mt-0.5 text-[10px]"
            style={{ color: paidPlan ? "#4f46e5" : "#6b7280" }}
          >
            {planLabel} plan
          </span>
        </div>

        <span
          className="hidden sm:block text-xs transition-transform"
          style={{ color: "#6b7280", transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border py-1.5 shadow-xl"
          style={{
            background: "#ffffff",
            borderColor: "#e5e7eb",
            boxShadow: "0 16px 40px rgba(17,24,39,0.16)",
          }}
          role="menu"
        >
          <div className="border-b px-4 py-3" style={{ borderColor: "#e5e7eb" }}>
            <p className="text-sm font-medium" style={{ color: "#111827" }}>
              {fullName ?? "Aspirant"}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#6b7280" }}>
              {planLabel} plan
              {planId === "free" && (
                <Link
                  href="/pricing"
                  className="ml-1.5"
                  style={{ color: "#4f46e5" }}
                  onClick={() => setOpen(false)}
                >
                  Upgrade →
                </Link>
              )}
            </p>
          </div>

          <div className="py-1">
            <NavItem href="/dashboard" label="Dashboard" icon="⊞" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/exams" label="Browse Exams" icon="📋" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/tracker" label="Application Tracker" icon="✔" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/chat" label="AI Career Chat" icon="💬" onClick={() => setOpen(false)} badge={!paidPlan ? "Pro" : undefined} />
            <NavItem href="/onboarding" label="Edit profile" icon="✎" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/study-plan" label="Study plans" icon="📅" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/study-plan/focus" label="Focus timer" icon="⏱" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/study-plan/mock-tests" label="Mock test tracker" icon="📝" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/study-plan/weekly-review" label="Weekly review" icon="📊" onClick={() => setOpen(false)} />
            <NavItem href="/dashboard/billing" label="Billing & plan" icon="💳" onClick={() => setOpen(false)} />
            <NavItem href="/marketplace/my-courses" label="My courses" icon="📚" onClick={() => setOpen(false)} />

            {isAdmin && (
              <>
                <div className="mx-3 my-1 border-t" style={{ borderColor: "#e5e7eb" }} />
                <NavItem href="/admin" label="Admin panel" icon="⚙" onClick={() => setOpen(false)} />
              </>
            )}

            <div className="mx-3 my-1 border-t" style={{ borderColor: "#e5e7eb" }} />

            <Link
              href="/account/delete"
              onClick={() => setOpen(false)}
              className="mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-red-50"
              style={{ color: "#dc2626" }}
            >
              <span style={{ width: "16px", textAlign: "center", fontSize: "13px" }}>🗑</span>
              <span className="flex-1">Delete account</span>
            </Link>

            <form action={signOut} className="w-full px-1.5 pb-0.5">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <span style={{ width: "16px", textAlign: "center" }}>↩</span>
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({
  href,
  label,
  icon,
  badge,
  onClick,
}: {
  href:     string
  label:    string
  icon:     string
  badge?:   string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[#f3f4f6]"
      style={{ color: "#111827" }}
    >
      <span style={{ width: "16px", textAlign: "center", fontSize: "13px" }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className="rounded-full border px-1.5 py-0.5 text-[10px]"
          style={{
            background: "#e0e7ff",
            borderColor: "#e0e7ff",
            color: "#4f46e5",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}
