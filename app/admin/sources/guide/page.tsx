/**
 * app/admin/sources/guide/page.tsx
 * Career Copilot — Source Registry Field Detection Guide
 *
 * Static internal reference page for admins populating source_registry fields.
 * Route: /admin/sources/guide
 *
 * Covers:
 *  - Adapter type decision tree (json > rss > html > pdf > playwright)
 *  - Anti-bot risk assessment
 *  - Playwright / CAPTCHA / PDF-only flags
 *  - Trust score & tier rules
 *  - Status & verified fields
 *  - 10-step full workflow
 *  - SQL update templates
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export const metadata = { title: "Field Detection Guide — Source Registry — Admin" }

// ─── Auth guard (server component) ───────────────────────────────────────────

export default async function SourceRegistryGuidePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) redirect("/dashboard")

  return <GuideContent />
}

// ─── Content (pure presentation) ─────────────────────────────────────────────

function GuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-16">

      {/* Back nav */}
      <div className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
        <Link href="/admin/sources" className="hover:text-white transition-colors">← Source Registry</Link>
        <span>/</span>
        <span style={{ color: "rgba(255,255,255,0.60)" }}>Field Detection Guide</span>
      </div>

      {/* Header */}
      <header className="pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="inline-block font-mono text-xs px-2.5 py-1 rounded mb-4"
          style={{ color: "#e8d5a3", background: "rgba(232,213,163,0.07)", border: "1px solid rgba(232,213,163,0.22)", letterSpacing: "0.08em" }}>
          CAREER COPILOT · INTERNAL GUIDE · V1.0
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "rgba(255,255,255,0.90)" }}>
          Source Registry<br />
          <span style={{ color: "#e8d5a3" }}>Field Detection Guide</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px", maxWidth: "600px" }}>
          A complete reference for determining every field in the source_registry table — Adapter Type, Flags,
          Anti-Bot Risk, Status, and Verified — for any government recruitment website.
        </p>

        {/* TOC pills */}
        <nav className="flex flex-wrap gap-2 mt-6">
          {[
            ["#adapter",    "Adapter Types"],
            ["#antibot",    "Anti-Bot Risk"],
            ["#flags",      "Flags"],
            ["#trust",      "Trust & Tier"],
            ["#status",     "Status / Verified"],
            ["#workflow",   "Full Workflow"],
            ["#sql",        "SQL Templates"],
          ].map(([href, label]) => (
            <a key={href} href={href}
              className="font-mono text-xs px-3.5 py-1.5 rounded-full transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.13)",
                background: "rgba(255,255,255,0.03)",
                color: "rgba(255,255,255,0.45)",
              }}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* ── SECTION 1 — ADAPTER TYPE ────────────────────────────────────────── */}
      <section id="adapter" className="scroll-mt-6 space-y-6">
        <SectionLabel index="01" title="Adapter Type" />
        <p style={{ color: "rgba(255,255,255,0.45)" }}>
          The adapter type tells the scraper <em>how</em> to fetch and parse the source. It is the single
          most important field — choosing the wrong adapter wastes Claude API calls or produces empty results.
        </p>

        <Callout color="gold" icon="⚡">
          <strong style={{ color: "rgba(255,255,255,0.85)" }}>Priority rule:</strong>{" "}
          Always prefer{" "}
          <Code>json</Code> &gt; <Code>rss</Code> &gt; <Code>html</Code> &gt; <Code>pdf</Code> &gt; <Code>playwright</Code>.
          {" "}Each step up the chain is faster, cheaper, and more reliable. Only use playwright as a last resort.
        </Callout>

        <h3 className="text-xs uppercase tracking-widest font-semibold mt-6 mb-3" style={{ color: "#e8d5a3" }}>
          The Decision Tree
        </h3>
        <DecisionTree />

        <h3 className="text-xs uppercase tracking-widest font-semibold mt-8 mb-4" style={{ color: "#e8d5a3" }}>
          Adapter Type Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ADAPTER_CARDS.map(card => (
            <AdapterCard key={card.value} {...card} />
          ))}
        </div>
      </section>

      {/* ── SECTION 2 — ANTI-BOT RISK ───────────────────────────────────────── */}
      <section id="antibot" className="scroll-mt-6 space-y-5">
        <SectionLabel index="02" title="Anti-Bot Risk" />
        <p style={{ color: "rgba(255,255,255,0.45)" }}>
          Determines how aggressively to throttle requests and whether to rotate headers.
          Over-estimating risk wastes interval budget; under-estimating gets the scraper blocked.
        </p>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
              {["Value", "When to assign", "Scraper behaviour"].map(h => (
                <th key={h} className="text-left py-2.5 px-3 font-mono text-xs"
                  style={{ color: "#e8d5a3", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ANTIBOT_ROWS.map(([val, when, behaviour, badge]) => (
              <tr key={val} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-3"><Badge variant={badge as never}>{val}</Badge></td>
                <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>{when}</td>
                <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{behaviour}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <CodeBlock>{`# Quick test — run twice in rapid succession
curl -s -o /dev/null -w "%{http_code}" "https://site.gov.in/recruitment"
# 200 both times → none/low
# 429 or 403 on second → medium/high

# Check for protection headers
curl -I "https://site.gov.in" | grep -i "cf-ray\\|x-akamai\\|x-cache"
# cf-ray → Cloudflare → medium
# Akamai headers → medium/high`}</CodeBlock>
      </section>

      {/* ── SECTION 3 — FLAGS ───────────────────────────────────────────────── */}
      <section id="flags" className="scroll-mt-6 space-y-5">
        <SectionLabel index="03" title="Playwright / CAPTCHA / PDF Only Flags" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FlagCard
            field="requires_playwright"
            label="Requires Playwright"
            setWhen="JS-rendered SPA — curl returns empty shell but browser shows full list"
            dontSet="HTML/NIC sites that return content in curl"
            cost="~8× more expensive per scrape. Needs external Playwright worker deployed."
            testCmd={`curl -s "https://site.gov.in/recruitment" | grep -c "recruit"
# Returns 0 → likely JS-rendered → enable Playwright
# Returns >0 → HTML adapter sufficient`}
          />
          <FlagCard
            field="has_captcha"
            label="Has CAPTCHA"
            setWhen="CAPTCHA challenge appears on the notifications listing page itself"
            dontSet="CAPTCHA only on login/contact forms, not on the public listing page"
            cost="Cannot be auto-scraped. Set is_active = false unless workaround exists."
            testCmd={`# Browse to notification_url in incognito
# If you see reCAPTCHA / hCaptcha → has_captcha = true`}
          />
          <FlagCard
            field="pdf_only"
            label="PDF Only"
            setWhen="ALL notification links go to .pdf files, no HTML detail pages exist"
            dontSet="Site has both HTML pages and PDF downloads"
            cost="Requires PDF text extraction — only works if PDFs have real text (not scanned images)."
            testCmd={`curl -s "https://site.gov.in/recruitment" | grep -i "\\.pdf" | wc -l
# Compare to total link count — if ~100% are .pdf → pdf_only = true`}
          />
        </div>
      </section>

      {/* ── SECTION 4 — TRUST SCORE & TIER ─────────────────────────────────── */}
      <section id="trust" className="scroll-mt-6 space-y-5">
        <SectionLabel index="04" title="Trust Score & Tier" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#e8d5a3" }}>
              Trust Score (0.00 – 1.00)
            </h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px" }}>
              How reliable is this source&apos;s data quality and uptime?
            </p>
            {TRUST_ROWS.map(([range, label, desc, color]) => (
              <div key={range} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="font-mono text-sm font-bold shrink-0" style={{ color: color as string }}>{range}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#e8d5a3" }}>
              Tier (T1 – T4)
            </h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px" }}>
              How important is this source relative to your user base&apos;s exam targets?
            </p>
            {TIER_ROWS.map(([tier, label, desc, interval, color]) => (
              <div key={tier} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="font-mono text-sm font-bold shrink-0 w-8" style={{ color: color as string }}>{tier}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>{label}</p>
                    <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.30)" }}>{interval}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — STATUS & VERIFIED ───────────────────────────────────── */}
      <section id="status" className="scroll-mt-6 space-y-5">
        <SectionLabel index="05" title="Status & Verified" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl space-y-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#e8d5a3" }}>
              is_active
            </h3>
            <CheckItem icon="✓" color="green">Set <strong>Active = Yes</strong> when: URL loads without SSL errors, content is accessible via curl/browser, no permanent block detected.</CheckItem>
            <CheckItem icon="✗" color="red">Set <strong>Active = No</strong> when: SSL certificate expired with no workaround, site returns 4xx/5xx consistently, domain is dead or redirects to wrong place.</CheckItem>
            <CheckItem icon="!" color="amber">Note: <code className="text-xs bg-white/10 px-1 rounded">http://</code> without HTTPS is OK for Employment News (SSL expired but content accessible).</CheckItem>
          </div>

          <div className="p-5 rounded-xl space-y-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#e8d5a3" }}>
              is_verified
            </h3>
            <CheckItem icon="✓" color="green">Set <strong>Verified = Yes</strong> only after manually completing all 10 steps in the workflow below: confirmed URL, checked SSL, determined adapter type, assessed anti-bot risk, set all flags, assigned trust/tier.</CheckItem>
            <CheckItem icon="✗" color="red"><strong>Never mark verified</strong> if: you haven&apos;t opened the URL in a browser, or you haven&apos;t confirmed the notification_url actually shows recruitment listings.</CheckItem>
            <CheckItem icon="ℹ" color="blue">Verified sources get priority in scrape scheduling. Unverified sources use fallback/conservative settings.</CheckItem>
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — FULL WORKFLOW ────────────────────────────────────────── */}
      <section id="workflow" className="scroll-mt-6 space-y-5">
        <SectionLabel index="06" title="Full Workflow for Adding or Updating a Source" />
        <p style={{ color: "rgba(255,255,255,0.45)" }}>
          When adding a new source or updating an existing one, follow all 10 steps in order.
          Only mark <Code>is_verified = true</Code> after completing all steps.
        </p>

        <div className="space-y-0">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={i} className="flex gap-5 py-5"
              style={{ borderBottom: i < WORKFLOW_STEPS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-medium"
                style={{ background: "rgba(232,213,163,0.07)", border: "1px solid rgba(232,213,163,0.22)", color: "#e8d5a3" }}>
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 7 — SQL TEMPLATES ────────────────────────────────────────── */}
      <section id="sql" className="scroll-mt-6 space-y-5">
        <SectionLabel index="07" title="SQL Update Templates" />
        <p style={{ color: "rgba(255,255,255,0.45)" }}>
          Copy-paste ready SQL for common scenarios. Run in Supabase SQL Editor or use
          {" "}<Link href="/admin/sources" className="underline underline-offset-2 hover:text-white transition-colors"
            style={{ color: "#e8d5a3" }}>/admin/sources</Link> UI for individual records.
        </p>

        <SqlBlock label="Verify and activate a source">
{`UPDATE source_registry
SET
  notification_url  = 'https://verified-url-here',
  is_verified       = true,
  is_active         = true,
  consecutive_fails = 0,
  last_error        = NULL,
  notes             = 'Covers EXAM_NAME. Verified April 2026.',
  updated_at        = now()
WHERE short_code = 'SHORT_CODE';`}
        </SqlBlock>

        <SqlBlock label="Disable a source with SSL failure">
{`UPDATE source_registry
SET
  is_active   = false,
  is_verified = false,
  last_error  = 'SSL certificate expired. Disabled April 2026. Re-check monthly.',
  updated_at  = now()
WHERE short_code = 'IRDAI';`}
        </SqlBlock>

        <SqlBlock label="Update adapter type after investigation">
{`UPDATE source_registry
SET
  adapter_type        = 'playwright',  -- or: html / json / rss / pdf / manual
  requires_playwright = true,
  anti_bot_risk       = 'medium',
  updated_at          = now()
WHERE short_code = 'KPSC';`}
        </SqlBlock>

        <SqlBlock label="View all unverified active sources (action list)">
{`SELECT
  short_code, source_name, notification_url,
  consecutive_fails, last_error, last_success_at
FROM source_registry
WHERE is_active = true
  AND (is_verified = false OR consecutive_fails > 0)
ORDER BY consecutive_fails DESC, tier ASC;`}
        </SqlBlock>

        <SqlBlock label="Full audit — counts by adapter type and status">
{`SELECT
  adapter_type,
  COUNT(*)                                         AS total,
  SUM(CASE WHEN is_active   THEN 1 ELSE 0 END)    AS active,
  SUM(CASE WHEN is_verified THEN 1 ELSE 0 END)    AS verified,
  ROUND(AVG(trust_score), 2)                       AS avg_trust,
  SUM(consecutive_fails)                           AS total_fails
FROM source_registry
GROUP BY adapter_type
ORDER BY total DESC;`}
        </SqlBlock>
      </section>

      {/* Footer */}
      <footer className="pt-8 flex items-center justify-between flex-wrap gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.20)", fontSize: "11px", fontFamily: "monospace" }}>
        <span>Career Copilot · Source Registry Field Detection Guide · April 2026</span>
        <span>Internal engineering reference · Not for distribution</span>
      </footer>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-xs mb-1" style={{ color: "rgba(232,213,163,0.55)", letterSpacing: "0.12em" }}>
        FIELD {index}
      </p>
      <h2 className="text-2xl font-semibold pb-4"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "rgba(255,255,255,0.90)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
        {title}
      </h2>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs px-1.5 py-0.5 rounded"
      style={{ background: "rgba(255,255,255,0.10)", color: "#67e8f9" }}>
      {children}
    </code>
  )
}

function Callout({ color, icon, children }: { color: "gold" | "red" | "green" | "blue"; icon: string; children: React.ReactNode }) {
  const styles = {
    gold:  { bg: "rgba(232,213,163,0.07)", border: "rgba(232,213,163,0.25)", text: "rgba(255,255,255,0.55)" },
    red:   { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", text: "rgba(255,255,255,0.55)" },
    green: { bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)",  text: "rgba(255,255,255,0.55)" },
    blue:  { bg: "rgba(125,211,252,0.08)", border: "rgba(125,211,252,0.25)", text: "rgba(255,255,255,0.55)" },
  }[color]

  return (
    <div className="flex gap-3 items-start px-4 py-3 rounded-lg text-sm"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}>
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div>{children}</div>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg px-5 py-4 text-xs leading-relaxed overflow-x-auto"
      style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.10)",
        borderLeft: "3px solid rgba(232,213,163,0.35)",
        color: "#a8c0d0",
        fontFamily: "'DM Mono', monospace",
      }}>
      {children}
    </pre>
  )
}

function SqlBlock({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: "#e8d5a3" }}>{label}</p>
      <CodeBlock>{children}</CodeBlock>
    </div>
  )
}

function Badge({ variant, children }: { variant: "green" | "amber" | "red" | "blue" | "purple" | "grey"; children: React.ReactNode }) {
  const styles = {
    green:  { color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.2)" },
    amber:  { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.2)" },
    red:    { color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.2)" },
    blue:   { color: "#7dd3fc", bg: "rgba(125,211,252,0.10)", border: "rgba(125,211,252,0.2)" },
    purple: { color: "#c4b5fd", bg: "rgba(196,181,253,0.10)", border: "rgba(196,181,253,0.2)" },
    grey:   { color: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)" },
  }[variant]

  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded"
      style={{ color: styles.color, background: styles.bg, border: `1px solid ${styles.border}` }}>
      {children}
    </span>
  )
}

function CheckItem({ icon, color, children }: { icon: string; color: "green" | "red" | "amber" | "blue"; children: React.ReactNode }) {
  const iconStyles = {
    green: { bg: "rgba(74,222,128,0.12)",   color: "#4ade80",  border: "rgba(74,222,128,0.25)" },
    red:   { bg: "rgba(248,113,113,0.10)",  color: "#f87171",  border: "rgba(248,113,113,0.25)" },
    amber: { bg: "rgba(251,191,36,0.10)",   color: "#fbbf24",  border: "rgba(251,191,36,0.25)" },
    blue:  { bg: "rgba(125,211,252,0.10)",  color: "#7dd3fc",  border: "rgba(125,211,252,0.25)" },
  }[color]

  return (
    <div className="flex items-start gap-3 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
      <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs mt-0.5"
        style={{ background: iconStyles.bg, color: iconStyles.color, border: `1px solid ${iconStyles.border}` }}>
        {icon}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function DecisionTree() {
  return (
    <div className="rounded-xl px-6 py-5 font-mono text-xs leading-loose overflow-x-auto"
      style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }}>
      <p style={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>(// Run these checks in order. Stop at the first YES.)</p>
      <br />
      {[
        { q: "Q1. Does the site have a public JSON API endpoint?", hint: "// Look for: /api/, /wp-json/, /rest/, .json in URL, or XHR calls in DevTools → Network", yes: "Set: adapter_type = 'json'", yesNote: "// BEST. Structured, cheap, no Claude needed." },
        { q: "Q2. Does the site publish an RSS or Atom feed?", hint: "// Look for: RSS icon, /rss, /feed, /atom, or <link rel='alternate' type='application/rss+xml'> in source", yes: "Set: adapter_type = 'rss'", yesNote: "// Very reliable. No Claude extraction needed." },
        { q: "Q3. Does the page load with a plain curl/fetch request?", hint: "// curl -s 'https://site.gov.in/recruitment' | grep -i 'recruit|notif|vacancy'", yes: "Set: adapter_type = 'html'", yesNote: "// Default for most NIC-hosted govt portals." },
        { q: "Q4. Are ALL notifications published only as downloadable PDFs?", hint: "// Check: Every notification link goes to a .pdf file, not an HTML page.", yes: "Set: adapter_type = 'pdf',  pdf_only = true", yesNote: "" },
        { q: "Q5. Does the page require JavaScript to render notification listings?", hint: "// curl returns empty shell but browser shows full list. React/Angular SPAs.", yes: "Set: adapter_type = 'playwright',  requires_playwright = true", yesNote: "// Expensive — external worker needed." },
        { q: "Q6. Cannot be scraped at all? (login required, CAPTCHA-protected)", hint: "", yes: "Set: adapter_type = 'manual',  has_captcha = true / is_active = false", yesNote: "" },
      ].map((item, i) => (
        <div key={i} className="mb-3">
          <p style={{ color: "#7dd3fc" }}>{item.q}</p>
          {item.hint && <p style={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>&nbsp;&nbsp;&nbsp;&nbsp;{item.hint}</p>}
          <p>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#4ade80" }}>→ YES</span>{" "}
            <span style={{ color: "#e8d5a3", fontWeight: 500 }}>{item.yes}</span>{" "}
            {item.yesNote && <span style={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>{item.yesNote}</span>}
          </p>
          {i < 5 && <p>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#f87171" }}>→ NO</span>{"  "}Continue to Q{i + 2}.</p>}
        </div>
      ))}
    </div>
  )
}

function AdapterCard({ value, badge, title, desc, signs }: { value: string; badge: string; title: string; desc: string; signs: string[] }) {
  const badgeVariants: Record<string, "green" | "blue" | "amber" | "purple" | "red" | "grey"> = {
    green: "green", blue: "blue", amber: "amber", purple: "purple", red: "red", grey: "grey"
  }
  return (
    <div className="rounded-xl p-4 space-y-2"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariants[badge] ?? "grey"}>{value}</Badge>
        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{title}</span>
      </div>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
      <ul className="space-y-1">
        {signs.map((s, i) => (
          <li key={i} className="text-xs flex gap-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span style={{ color: "rgba(232,213,163,0.50)" }}>·</span> {s}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FlagCard({ field, label, setWhen, dontSet, cost, testCmd }: {
  field: string; label: string; setWhen: string; dontSet: string; cost: string; testCmd: string
}) {
  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div>
        <p className="font-mono text-xs mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>{field}</p>
        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</p>
      </div>
      <CheckItem icon="✓" color="green"><strong style={{ color: "rgba(255,255,255,0.70)" }}>Set Yes:</strong> {setWhen}</CheckItem>
      <CheckItem icon="✗" color="red"><strong style={{ color: "rgba(255,255,255,0.70)" }}>Don&apos;t set:</strong> {dontSet}</CheckItem>
      <CheckItem icon="!" color="amber">{cost}</CheckItem>
      <div className="rounded-lg px-3 py-2 font-mono text-xs overflow-x-auto"
        style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", color: "#a8c0d0", whiteSpace: "pre" }}>
        {testCmd}
      </div>
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────

const ADAPTER_CARDS = [
  {
    value: "json", badge: "green", title: "JSON API",
    desc: "Best option. Structured data, no Claude parsing needed, cheapest to run.",
    signs: ["URL contains /api/, /wp-json/, /rest/, /v1/, /v2/", "DevTools → Network → XHR shows JSON responses", "WordPress sites: try /wp-json/wp/v2/posts"],
  },
  {
    value: "rss", badge: "blue", title: "RSS / Atom Feed",
    desc: "Second best. Self-describing XML, no Claude needed, very reliable.",
    signs: ["Page source contains <link rel='alternate' type='application/rss+xml'>", "Common paths: /rss.xml, /feed, /feed.xml, /atom.xml", "Employment News: uses http:// (SSL expired but active)"],
  },
  {
    value: "html", badge: "amber", title: "HTML (server-rendered)",
    desc: "Default for most NIC-hosted govt portals. Requires Claude to extract titles.",
    signs: ["curl returns visible text with exam names and dates", "*.nic.in, *.gov.in static portals", "Most state PSC and central govt sites"],
  },
  {
    value: "pdf", badge: "purple", title: "PDF Only",
    desc: "All notification links are .pdf files. Requires PDF text extraction.",
    signs: ["100% of notification links end in .pdf", "Common: gazette sites, court circulars, UPSC weekly", "Only works if PDFs contain real text (not scanned images)"],
  },
  {
    value: "playwright", badge: "red", title: "Playwright (JS-rendered)",
    desc: "Last resort. Expensive, slow, requires external worker. SPA sites only.",
    signs: ["curl returns empty <div id='root'> or <app-root>", "React / Angular / Vue SPA detected", "Browser shows content but curl returns nothing"],
  },
  {
    value: "manual", badge: "grey", title: "Manual",
    desc: "Cannot be automatically scraped. Requires login, has CAPTCHA, or is behind intranet.",
    signs: ["Login required to view notifications", "CAPTCHA on the listing page itself", "Intranet / IP-restricted access"],
  },
]

const ANTIBOT_ROWS = [
  ["none",    "No protection at all. Open government portals, NIC sites.", "No throttling. Standard headers.", "green"],
  ["low",     "Basic rate limits. Cloudflare in free mode. Most .gov.in sites.", "Small random delay (200–800ms). Mozilla UA.", "green"],
  ["medium",  "Cloudflare Pro/Biz, Akamai detected, or 429 on rapid curl.", "2–5s delay, header rotation, respect Retry-After.", "amber"],
  ["high",    "Aggressive blocking, CAPTCHA on non-listing pages, bot detection JS.", "5–15s delay, full header set, backoff on 429.", "red"],
  ["blocked", "Permanently blocked IP or CAPTCHA on listing page. Cannot scrape.", "is_active = false. Manual monitoring only.", "red"],
]

const TRUST_ROWS = [
  ["0.85–0.95", "Official & verified", "Confirmed .gov.in/.nic.in, URL verified manually, stable history.", "#4ade80"],
  ["0.75–0.84", "Official but unstable", "Correct official source, but portal is sometimes down or slow.", "#fbbf24"],
  ["0.60–0.74", "Semi-official",        "Official org but using third-party hosting or unclear URL path.", "#fbbf24"],
  ["0.45–0.59", "Aggregator / partial", "Aggregator site or incomplete coverage of an organisation's exams.", "#f87171"],
]

const TIER_ROWS = [
  ["T1", "Critical — top 30% user targets", "UPSC, SSC, IBPS, RBI, SEBI, SBI, NTA. Covers exams 30%+ of users target.", "T1: 4–6 hrs", "#e8d5a3"],
  ["T2", "Important — major state/banking", "State PSC major exams (MPSC, TNPSC, BPSC etc.), NABARD, LIC, NIACL.", "T2: 12–24 hrs", "rgba(255,255,255,0.70)"],
  ["T3", "Secondary — PSUs, courts, CET",   "PSUs (ONGC, BHEL, NTPC), High Courts, state CETs, defence boards.", "T3: 48–72 hrs", "rgba(255,255,255,0.45)"],
  ["T4", "Aggregator — discovery only",     "Aggregator portals (e.g. sarkariresult). Not a primary source.", "T4: 6–12 hrs", "rgba(255,255,255,0.25)"],
]

const WORKFLOW_STEPS = [
  {
    title: "Find the official website",
    desc: "Search: [Organisation name] official site. Look for .gov.in, .nic.in, or .org.in domains. Avoid aggregator sites in search results. The official_url is the homepage (e.g., upsc.gov.in).",
  },
  {
    title: "Find the specific notifications / recruitment URL",
    desc: "Navigate from the homepage to the Careers / Recruitment / Notifications section. Copy the exact URL of the page that lists current vacancies. This is the notification_url.",
  },
  {
    title: "Check SSL (Active / Inactive)",
    desc: "Does the URL load without certificate errors? Green padlock → Active. Red padlock, 'Not Secure', SSL error → Inactive. Exception: http:// is allowed for Employment News (SSL expired but still active).",
  },
  {
    title: "Determine Adapter Type — use the Decision Tree above",
    desc: "Check for JSON API first. Then RSS. Then try curl and search for notification content. If content is in curl output → HTML. If empty shell → Playwright. If only PDF links → PDF.",
  },
  {
    title: "Assess Anti-Bot Risk",
    desc: "Try curl twice in rapid succession. Check response headers for Cloudflare, Akamai. Read robots.txt. Assign: none / low / medium / high.",
  },
  {
    title: "Set Playwright / CAPTCHA / PDF Only flags",
    desc: "Playwright = Yes only for JS SPAs. CAPTCHA = Yes only if challenge appears on the listing page itself. PDF Only = Yes only if all notification links are raw .pdf downloads with no HTML metadata.",
  },
  {
    title: "Assign Trust Score",
    desc: "Official .gov.in with verified URL = 0.85–0.95. Known but sometimes unstable portal = 0.75–0.84. Aggregator or partially reliable = 0.45–0.70.",
  },
  {
    title: "Assign Tier",
    desc: "T1 = covers exams that 30%+ of your user base targets (UPSC, SSC, IBPS, RBI, SEBI, SBI). T2 = state PSC major exams, key banking/regulatory. T3 = PSUs, smaller state bodies, courts. T4 = aggregators (discovery only).",
  },
  {
    title: "Set Scrape Interval",
    desc: "T1: 4–6 hours. T2: 12–24 hours. T3: 48–72 hours. T4 aggregators: 6–12 hours. Adjust up (slower) if anti-bot risk is medium or high.",
  },
  {
    title: "Mark Verified = Yes after completing steps 1–9",
    desc: "Update via /admin/sources UI → find the source → Edit → toggle Verified → Save. Also add notes: which exams this source covers, any known issues with the URL path or content format.",
  },
]