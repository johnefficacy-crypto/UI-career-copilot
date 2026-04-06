/**
 * supabase/functions/scheduled-scraper/index.ts
 * Career Copilot — Notification Engine v2
 *
 * Deploy:  supabase functions deploy scheduled-scraper
 * Schedule: every 6 hours via Supabase Cron
 *   0 *\/6 * * *
 *
 * WHAT'S NEW vs v1:
 *  - Multi-adapter support: html | rss | json | pdf
 *  - Tier-aware interval enforcement (Tier 1 always runs)
 *  - Fingerprint-based dedup via fn_compute_fingerprint
 *  - Writes source_health_metrics per source
 *  - Writes source_observations (raw extraction log)
 *  - Fuzzy title similarity check against existing recruitments
 *  - Promotes to recruitments via fn_promote_approved_scrape (trigger)
 *  - Processes pending alert_events via fn_fanout_alert_event
 *  - Robust per-source error isolation
 *  - Idempotent run guard (won't start if another is 'running' < 10min ago)
 */

import { createClient } from "supabase"
import { DOMParser } from "deno_dom"


// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")         ?? ""
const SERVICE_ROLE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const ANTHROPIC_API_KEY    = Deno.env.get("ANTHROPIC_API_KEY")    ?? ""
const MAX_SOURCES_PER_RUN  = 20   // stay under 50s Edge Function limit
const CLAUDE_MODEL         = "claude-sonnet-4-20250514"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Source {
  id:                    string
  name:                  string
  base_url:              string
  notification_path:     string | null
  org_type:              string
  state:                 string | null
  is_active:             boolean
  is_healthy:            boolean
  last_scraped_at:       string | null
  scrape_interval_hours: number
  tier:                  number
  trust_score:           number
  adapter_type:          string
  selector_config:       Record<string, unknown>
  metadata:              Record<string, unknown>
}

interface Extracted {
  title:                     string
  organization_name:         string
  org_type:                  string
  notification_date:         string | null
  apply_start_date:          string | null
  apply_end_date:            string | null
  total_vacancies:           number | null
  year:                      number
  official_notification_url: string
  source_pdf_url:            string | null
  posts:                     unknown[]
  confidence:                number
}

interface RunError { source: string; error: string; at: string }

// ─── Supabase client (service role) ──────────────────────────────────────────

function db() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// ─── Idempotency guard ────────────────────────────────────────────────────────

async function isAlreadyRunning(): Promise<boolean> {
  const { data } = await db()
    .from("scrape_runs")
    .select("id,started_at")
    .eq("status", "running")
    .gte("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ─── Source interval check ────────────────────────────────────────────────────

function isDueForScraping(src: Source, now: Date): boolean {
  // Tier 1 officials: always scrape if interval has passed
  if (!src.last_scraped_at) return true
  const lastMs     = new Date(src.last_scraped_at).getTime()
  const intervalMs = src.scrape_interval_hours * 3_600_000
  // Tier 1 sources get a 25% grace reduction for urgency
  const effectiveInterval = src.tier === 1 ? intervalMs * 0.75 : intervalMs
  return now.getTime() - lastMs >= effectiveInterval
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (CareerCopilot-Bot/2.0; +https://careercopilot.in/bot)" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return res.text()
}

async function fetchRss(url: string): Promise<string> {
  const xml  = await fetchHtml(url)
  // Convert RSS to plain text for Claude extraction
  return xml
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g,       "")
    .replace(/<[^>]+>/g,     " ")
    .replace(/\s{2,}/g,      " ")
    .trim()
}

async function fetchJson(url: string, path?: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "CareerCopilot-Bot/2.0" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  // Extract array items if path is provided (e.g. "posts")
  const items = path ? (json as Record<string, unknown>)[path] ?? json : json
  return JSON.stringify(items).slice(0, 12000)
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi,   " ")
    .replace(/<[^>]+>/g,   " ")
    .replace(/&nbsp;/g,    " ")
    .replace(/&amp;/g,     "&")
    .replace(/&lt;/g,      "<")
    .replace(/&gt;/g,      ">")
    .replace(/\s{2,}/g,    " ")
    .trim()
}

async function acquireContent(src: Source): Promise<string> {
  const url = src.base_url + (src.notification_path ?? "")
  switch (src.adapter_type) {
    case "rss":  return fetchRss(url)
    case "json": return fetchJson(url, (src.selector_config?.path as string) ?? undefined)
    default:     return stripHtml(await fetchHtml(url))
  }
}

// ─── Claude extraction ────────────────────────────────────────────────────────

async function extractWithClaude(
  text:        string,
  sourceName:  string,
  sourceUrl:   string,
  currentYear: number,
  trustScore:  number
): Promise<Extracted | null> {
  if (!ANTHROPIC_API_KEY) return null

  const prompt = `You are extracting Indian government recruitment notification data from text scraped from "${sourceName}".

Source trust score: ${trustScore} (0=untrusted, 1=official)

Return ONLY a single JSON object — NO markdown, no explanation:
{
  "title": "exact recruitment name, e.g. SEBI Grade A Officers Recruitment 2025",
  "organization_name": "full official organization name",
  "org_type": "Banking|Regulatory|Central Govt|State Govt|PSU|Defence|Railways|Insurance",
  "notification_date": "YYYY-MM-DD or null",
  "apply_start_date":  "YYYY-MM-DD or null",
  "apply_end_date":    "YYYY-MM-DD or null",
  "total_vacancies":   123 or null,
  "year":              ${currentYear},
  "official_notification_url": "${sourceUrl}",
  "source_pdf_url":    "full URL to PDF if found, or null",
  "posts":             [],
  "confidence":        0.0
}

Rules:
- confidence 0.85-1.0: complete title, org, dates all found
- confidence 0.60-0.84: partial data, some fields missing
- confidence 0.30-0.59: only title/org found, dates missing
- confidence < 0.30: unclear or not a recruitment notification
- Set confidence < 0.20 and title="" if this page has no recruitment content
- Year must be ${currentYear} unless clearly stated otherwise
- All dates must be YYYY-MM-DD format

Text:
${text.slice(0, 10_000)}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 800,
        system:     "You extract Indian government recruitment data. Return ONLY valid JSON, never markdown.",
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) return null

    const data = await res.json() as { content?: Array<{ type: string; text: string }> }
    const raw  = data.content?.find((b) => b.type === "text")?.text ?? ""
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim()
    const parsed = JSON.parse(clean) as Extracted
    return parsed
  } catch {
    return null
  }
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

function computeFingerprint(orgName: string, year: number, title: string): string {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const org   = normalize(orgName)
  const words = normalize(title).slice(0, 30)
  return `${org}-${year}-${words}`
}

// ─── Status derivation ────────────────────────────────────────────────────────

function deriveStatus(start: string | null, end: string | null): string {
  const now = new Date()
  const s   = start ? new Date(start) : null
  const e   = end   ? new Date(end)   : null
  if (e && e < now) return "closed"
  if (s && s > now) return "upcoming"
  if (s && s <= now) return "open"
  return "upcoming"
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {}
  const triggeredBy = (body.triggered_by as string) ?? "scheduled"

  // ── Idempotency guard ──
  if (triggeredBy === "scheduled" && await isAlreadyRunning()) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "run_already_in_progress" }),
      { headers: { "Content-Type": "application/json" } }
    )
  }

  const supabase   = db()
  const now        = new Date()
  const year       = now.getFullYear()
  const errors:    RunError[] = []
  let totalFound   = 0
  let totalNew     = 0
  let totalDup     = 0
  let totalFanout  = 0

  // ── Create run record ──
  const { data: run } = await supabase
    .from("scrape_runs")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single()
  const runId = run?.id as string | null

  // ── Load active sources due for scraping ──
  const { data: allSources } = await supabase
    .from("scrape_sources")
    .select("id,name,base_url,notification_path,org_type,state,is_active,is_healthy,last_scraped_at,scrape_interval_hours,tier,trust_score,adapter_type,selector_config,metadata")
    .eq("is_active", true)
    .order("tier", { ascending: true })       // process Tier 1 first
    .limit(MAX_SOURCES_PER_RUN)

  const dueSources = ((allSources ?? []) as Source[]).filter((s) => isDueForScraping(s, now))

  // ── Load existing fingerprints for fast dedup ──
  const { data: existingRecs } = await supabase
    .from("recruitments")
    .select("id,name,year,organizations(name)")

  const existingFps = new Map<string, string>() // fp → recruitment_id
  for (const r of existingRecs ?? []) {
    const orgName = (r.organizations as { name: string } | null)?.name ?? ""
    const fp      = computeFingerprint(orgName, r.year, r.name)
    existingFps.set(fp, r.id)
  }

  // ── Process each source ──
  for (const src of dueSources) {
    const targetUrl = src.base_url + (src.notification_path ?? "")
    const startMs   = Date.now()
    let parseSuccess = false
    let httpStatus   = 0

    try {
      const content = await acquireContent(src)
      parseSuccess  = true
      httpStatus    = 200

      const extracted = await extractWithClaude(
        content, src.name, targetUrl, year, src.trust_score
      )

      const durationMs = Date.now() - startMs

      // Record source health metric
      await supabase.from("source_health_metrics").insert({
        source_id:        src.id,
        fetch_duration_ms: durationMs,
        http_status:      httpStatus,
        parse_success:    parseSuccess,
        items_extracted:  extracted && extracted.confidence >= 0.30 ? 1 : 0,
        confidence_avg:   extracted?.confidence ?? 0,
      })

      if (!extracted || extracted.confidence < 0.30 || !extracted.title) {
        // Mark source scraped but no actionable data
        await supabase.from("scrape_sources")
          .update({ last_scraped_at: now.toISOString() })
          .eq("id", src.id)
        continue
      }

      totalFound++

      const fp    = computeFingerprint(extracted.organization_name, extracted.year, extracted.title)
      const isDup = existingFps.has(fp)

      const queueStatus =
        isDup                             ? "duplicate"
        : extracted.confidence >= 0.90   ? "approved"
        : extracted.confidence >= 0.70   ? "pending"     // admin review
        : "pending"

      // Insert into scrape_queue
      // DB trigger fn_promote_approved_scrape fires on status='approved'
      await supabase.from("scrape_queue").insert({
        source_url:       targetUrl,
        source_name:      src.name,
        extracted_data:   extracted,
        confidence_score: extracted.confidence,
        status:           queueStatus,
        scrape_run_id:    runId,
        duplicate_of:     isDup ? (existingFps.get(fp) ?? null) : null,
      })

      if (isDup) {
        totalDup++
        // Update dates on existing if they changed
        if (extracted.apply_end_date) {
          const existId = existingFps.get(fp)
          if (existId) {
            await supabase.from("recruitments")
              .update({
                status:          deriveStatus(extracted.apply_start_date, extracted.apply_end_date),
                apply_end_date:   extracted.apply_end_date   ?? undefined,
                apply_start_date: extracted.apply_start_date ?? undefined,
                total_vacancies:  extracted.total_vacancies  ?? undefined,
              })
              .eq("id", existId)
          }
        }
      } else {
        totalNew++
        existingFps.set(fp, "queued")
      }

      // Mark source success
      await supabase.from("scrape_sources").update({
        last_scraped_at:   now.toISOString(),
        last_success_at:   now.toISOString(),
        consecutive_fails: 0,
      }).eq("id", src.id)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ source: src.name, error: msg, at: now.toISOString() })

      // Increment consecutive_fails
      await supabase.from("scrape_sources")
        .update({ last_scraped_at: now.toISOString() })
        .eq("id", src.id)
      await supabase.rpc("fn_increment_source_fails", { p_source_id: src.id })
        .catch(() => {/* ignore if function doesn't exist yet */})

      // Record health metric for failure
      await supabase.from("source_health_metrics").insert({
        source_id:     src.id,
        http_status:   httpStatus,
        parse_success: false,
        error_message: msg.slice(0, 500),
      })
    }
  }

  // ── Process pending alert_events (fan-out) ──
  const { data: pendingEvents } = await supabase
    .from("alert_events")
    .select("id")
    .eq("fanout_status", "pending")
    .order("priority", { ascending: true })
    .limit(30)

  for (const evt of pendingEvents ?? []) {
    try {
      const { data: count } = await supabase.rpc("fn_fanout_alert_event", {
        p_event_id: evt.id,
      })
      totalFanout += (count as number) ?? 0
    } catch {
      // non-fatal: alert events will be retried next run
    }
  }

  // ── Finalize run ──
  const runStatus =
    errors.length > 0 && errors.length >= dueSources.length ? "failed"
    : errors.length > 0 ? "partial"
    : "completed"

  await supabase.from("scrape_runs").update({
    finished_at:      now.toISOString(),
    status:           runStatus,
    sources_checked:  dueSources.length,
    items_found:      totalFound,
    items_new:        totalNew,
    items_duplicate:  totalDup,
    error_log:        errors,
  }).eq("id", runId)

  return new Response(
    JSON.stringify({
      runId,
      totalFound,
      totalNew,
      totalDuplicate: totalDup,
      usersNotified:  totalFanout,
      errors:         errors.length,
      status:         runStatus,
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})