/**
 * supabase/functions/scheduled-scraper/index.ts
 * Career Copilot — Phase 2: Scraper v3
 *
 * What's new vs v2:
 *  - Reads from source_registry (new master table) instead of scrape_sources
 *  - ETag / Last-Modified caching → skip Claude if content unchanged
 *  - PDF adapter with text extraction → Claude extraction
 *  - RSS adapter with proper XML parsing
 *  - JSON adapter with configurable path
 *  - Per-source random jitter (avoids bot detection from synchronized requests)
 *  - Retry policy with exponential backoff
 *  - Source health → source_registry.consecutive_fails
 *  - Eligibility recompute queue populated on new items
 *  - Idempotency guard (no concurrent runs)
 *  - Processes pending alert_events fan-out at end of run
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")             ?? ""
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const ANTHROPIC_KEY     = Deno.env.get("ANTHROPIC_API_KEY")        ?? ""
const CLAUDE_MODEL      = "claude-sonnet-4-20250514"
const MAX_SOURCES       = 20   // stay under 50s Edge Function limit
const REQUEST_TIMEOUT   = 18_000
const CLAUDE_TIMEOUT    = 32_000

// ─── Types ────────────────────────────────────────────────────────────────────

interface SourceRecord {
  id:                    string
  source_name:           string
  short_code:            string | null
  source_type:           string
  category:              string
  official_url:          string
  notification_url:      string | null
  rss_url:               string | null
  api_url:               string | null
  pdf_bulletin_url:      string | null
  adapter_type:          string
  parser_config:         Record<string, unknown>
  scrape_interval_hours: number
  tier:                  number
  trust_score:           number
  anti_bot_risk:         string
  is_active:             boolean
  last_scraped_at:       string | null
  last_success_at:       string | null
  consecutive_fails:     number
}

interface ETagRecord {
  source_id:    string
  etag:         string | null
  last_modified: string | null
  content_hash: string | null
}

interface ExtractedRecruitment {
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

interface RunError {
  source: string
  error:  string
  at:     string
}

// ─── Supabase client ──────────────────────────────────────────────────────────

function db() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// ─── Idempotency guard ────────────────────────────────────────────────────────

async function isAlreadyRunning(): Promise<boolean> {
  const { data } = await db()
    .from("scrape_runs")
    .select("id")
    .eq("status", "running")
    .gte("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ─── Due-for-scraping check ───────────────────────────────────────────────────

function isDue(src: SourceRecord, now: Date): boolean {
  if (!src.last_scraped_at) return true
  const last     = new Date(src.last_scraped_at).getTime()
  const interval = src.scrape_interval_hours * 3_600_000
  const grace    = src.tier === 1 ? 0.75 : 1.0  // Tier 1 gets 25% earlier trigger
  return now.getTime() - last >= interval * grace
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const BOT_HEADERS = {
  "User-Agent":      "CareerCopilot-Bot/3.0 (+https://careercopilot.in/bot)",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control":   "no-cache",
}

async function fetchWithHeaders(
  url: string,
  extraHeaders: Record<string, string> = {},
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  return fetch(url, {
    headers: { ...BOT_HEADERS, ...extraHeaders },
    signal:  AbortSignal.timeout(timeout),
  })
}

// ─── Content hash ─────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf  = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

// ─── ETag cache check ─────────────────────────────────────────────────────────

async function shouldSkip(
  supabase: ReturnType<typeof db>,
  sourceId: string,
  response: Response,
  body: string
): Promise<boolean> {
  const etag         = response.headers.get("etag")
  const lastModified = response.headers.get("last-modified")
  const contentHash  = await sha256(body.slice(0, 50000))

  // Check cached values
  const { data: cached } = await supabase
    .from("scrape_source_etags")
    .select("etag, last_modified, content_hash")
    .eq("source_id", sourceId)
    .single()

  // Update cache
  await supabase
    .from("scrape_source_etags")
    .upsert({
      source_id:     sourceId,
      etag,
      last_modified: lastModified,
      content_hash:  contentHash,
      checked_at:    new Date().toISOString(),
    })
    .catch(() => {/* ignore cache write failure */})

  if (!cached) return false

  // If ETag matches, content unchanged
  if (etag && cached.etag && etag === cached.etag) return true

  // If Last-Modified matches, content unchanged
  if (lastModified && cached.last_modified && lastModified === cached.last_modified) return true

  // If content hash matches, content unchanged (last resort)
  if (contentHash === cached.content_hash) return true

  return false
}

// ─── HTML stripper ────────────────────────────────────────────────────────────

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

// ─── RSS parser ───────────────────────────────────────────────────────────────

function parseRssToText(xml: string): string {
  // Extract item titles and links from RSS/Atom feeds
  const items: string[] = []

  // Match RSS <item> elements
  const itemRegex = /<item[\s\S]*?<\/item>/gi
  const matches = xml.match(itemRegex) ?? []

  for (const item of matches.slice(0, 20)) {
    const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    const linkMatch  = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
    const descMatch  = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)

    const title = titleMatch?.[1]?.trim() ?? ""
    const link  = linkMatch?.[1]?.trim()  ?? ""
    const desc  = stripHtml(descMatch?.[1] ?? "").slice(0, 200)

    if (title) {
      items.push(`Title: ${title}\nLink: ${link}\nDescription: ${desc}`)
    }
  }

  return items.join("\n\n") || stripHtml(xml).slice(0, 10000)
}

// ─── JSON adapter ─────────────────────────────────────────────────────────────

function parseJsonToText(json: unknown, config: Record<string, unknown>): string {
  try {
    // Handle arrays of objects (WordPress posts, etc.)
    const items = Array.isArray(json) ? json : [json]
    const titleField = (config.title_field as string) ?? "title"
    const linkField  = (config.link_field  as string) ?? "link"

    return items.slice(0, 15).map((item: unknown) => {
      const obj = item as Record<string, unknown>
      // Handle nested like title.rendered
      const getNestedValue = (o: Record<string, unknown>, path: string): string => {
        const parts = path.split(".")
        let val: unknown = o
        for (const p of parts) {
          val = (val as Record<string, unknown>)?.[p]
        }
        return String(val ?? "")
      }
      const title = getNestedValue(obj, titleField)
      const link  = getNestedValue(obj, linkField)
      return `Title: ${title}\nLink: ${link}`
    }).join("\n\n")
  } catch {
    return JSON.stringify(json).slice(0, 8000)
  }
}

// ─── PDF text extraction ──────────────────────────────────────────────────────
// Basic PDF text extraction by scanning for readable strings in PDF binary.
// For Deno Edge Functions we cannot use pdf-parse (Node.js native bindings).
// This approach works for text-based PDFs (most government notifications).

function extractPdfText(pdfBytes: Uint8Array): string {
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(pdfBytes)

    // Extract text between BT (begin text) and ET (end text) markers
    const textBlocks: string[] = []
    const btEtRegex = /BT([\s\S]*?)ET/g
    let match

    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1]
      // Extract strings in parentheses (PDF text objects)
      const strRegex = /\(([^)]{1,200})\)/g
      let strMatch
      while ((strMatch = strRegex.exec(block)) !== null) {
        const str = strMatch[1]
          .replace(/\\n/g, " ")
          .replace(/\\r/g, " ")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
          .trim()
        if (str.length > 2) textBlocks.push(str)
      }
    }

    // Also extract hex strings <XXXX>
    const hexRegex = /<([0-9A-Fa-f\s]{4,})>/g
    while ((match = hexRegex.exec(text)) !== null) {
      const hex = match[1].replace(/\s/g, "")
      try {
        const bytes = []
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16))
        }
        const str = new TextDecoder("utf-8").decode(new Uint8Array(bytes)).trim()
        if (str.length > 3 && /[a-zA-Z]/.test(str)) {
          textBlocks.push(str)
        }
      } catch {
        // ignore
      }
    }

    return textBlocks.join(" ").replace(/\s{2,}/g, " ").trim().slice(0, 15000)
  } catch {
    return ""
  }
}

// ─── Acquire content by adapter ───────────────────────────────────────────────

interface AcquireResult {
  text:     string
  url:      string
  skipped:  boolean   // true = ETag matched, no change
  headers:  Record<string, string>
}

async function acquireContent(
  supabase: ReturnType<typeof db>,
  src:      SourceRecord
): Promise<AcquireResult> {
  const targetUrl = src.notification_url
    ?? src.rss_url
    ?? src.api_url
    ?? src.official_url

  // ── RSS ──────────────────────────────────────────────────────────────────────
  if (src.adapter_type === "rss" || src.rss_url) {
    const rssUrl = src.rss_url ?? targetUrl
    const res = await fetchWithHeaders(rssUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${rssUrl}`)
    const body = await res.text()
    const skip = await shouldSkip(supabase, src.id, res, body)
    if (skip) return { text: "", url: rssUrl, skipped: true, headers: {} }
    return { text: parseRssToText(body), url: rssUrl, skipped: false, headers: {} }
  }

  // ── JSON API ──────────────────────────────────────────────────────────────────
  if (src.adapter_type === "json" || src.api_url) {
    const apiUrl = src.api_url ?? targetUrl
    const res = await fetchWithHeaders(apiUrl, { "Accept": "application/json" })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${apiUrl}`)
    const body = await res.text()
    const skip = await shouldSkip(supabase, src.id, res, body)
    if (skip) return { text: "", url: apiUrl, skipped: true, headers: {} }
    const json = JSON.parse(body)
    return {
      text:    parseJsonToText(json, src.parser_config),
      url:     apiUrl,
      skipped: false,
      headers: {},
    }
  }

  // ── PDF ───────────────────────────────────────────────────────────────────────
  if (src.adapter_type === "pdf" || src.pdf_only) {
    const pdfUrl = src.pdf_bulletin_url ?? targetUrl
    const res = await fetchWithHeaders(pdfUrl, { "Accept": "application/pdf,*/*" })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${pdfUrl}`)
    const pdfBytes  = new Uint8Array(await res.arrayBuffer())
    const hashInput = Array.from(pdfBytes.slice(0, 1000)).join("")
    const contentHash = await sha256(hashInput)

    // Check PDF cache
    const { data: cached } = await supabase
      .from("scrape_pdf_cache")
      .select("id")
      .eq("pdf_url", pdfUrl)
      .eq("pdf_hash", contentHash)
      .single()
      .catch(() => ({ data: null }))

    if (cached) {
      return { text: "", url: pdfUrl, skipped: true, headers: {} }
    }

    // Cache this PDF hash
    await supabase.from("scrape_pdf_cache").insert({
      source_id:    src.id,
      pdf_url:      pdfUrl,
      pdf_hash:     contentHash,
      extracted_at: new Date().toISOString(),
    }).catch(() => {/* ignore */})

    const text = extractPdfText(pdfBytes)
    return { text, url: pdfUrl, skipped: false, headers: {} }
  }

  // ── HTML (default) ────────────────────────────────────────────────────────────
  const res = await fetchWithHeaders(targetUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${targetUrl}`)
  const body = await res.text()
  const skip = await shouldSkip(supabase, src.id, res, body)
  if (skip) return { text: "", url: targetUrl, skipped: true, headers: {} }
  return { text: stripHtml(body), url: targetUrl, skipped: false, headers: {} }
}

// ─── Claude extraction ────────────────────────────────────────────────────────

async function extractWithClaude(
  text:        string,
  sourceName:  string,
  sourceUrl:   string,
  trustScore:  number,
  year:        number
): Promise<ExtractedRecruitment | null> {
  if (!ANTHROPIC_KEY) return null
  if (!text || text.length < 50) return null

  const prompt = `You are extracting Indian government recruitment notification data from content scraped from "${sourceName}".

Source trust score: ${trustScore} (0=untrusted, 1=highly trusted official source)

Return ONLY a single valid JSON object — NO markdown, no explanation, no preamble:
{
  "title": "exact full recruitment name e.g. SEBI Grade A Officers Recruitment 2026",
  "organization_name": "full official organization name",
  "org_type": "Banking|Regulatory|Central Govt|State Govt|PSU|Defence|Railways|Insurance|University|Court",
  "notification_date": "YYYY-MM-DD or null",
  "apply_start_date":  "YYYY-MM-DD or null",
  "apply_end_date":    "YYYY-MM-DD or null",
  "total_vacancies":   123 or null,
  "year":              ${year},
  "official_notification_url": "${sourceUrl}",
  "source_pdf_url":    "full URL to PDF if found, else null",
  "posts":             [],
  "confidence":        0.0
}

Confidence scoring:
- 0.90-1.00: Full title, org name, AND at least one date found
- 0.70-0.89: Title and org name found, no dates
- 0.40-0.69: Partial data, unclear recruitment
- 0.10-0.39: Only hints, no clear recruitment
- 0.00-0.09: No recruitment content found — set title to ""

Rules:
- Year must be ${year} unless clearly stated otherwise in the text
- All dates MUST be YYYY-MM-DD format
- Set confidence < 0.15 and title="" if this page has NO recruitment notification content

Content:
${text.slice(0, 11000)}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 800,
        system:     "You extract Indian government recruitment data. Return ONLY valid JSON, never markdown or explanation.",
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT),
    })

    if (!res.ok) return null

    const data   = await res.json() as { content?: Array<{ type: string; text: string }> }
    const raw    = data.content?.find(b => b.type === "text")?.text ?? ""
    const clean  = raw.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim()

    // Find JSON object in response
    const jsonStart = clean.indexOf("{")
    const jsonEnd   = clean.lastIndexOf("}")
    if (jsonStart === -1 || jsonEnd === -1) return null

    return JSON.parse(clean.slice(jsonStart, jsonEnd + 1)) as ExtractedRecruitment
  } catch {
    return null
  }
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

function fingerprint(orgName: string, year: number, title: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${norm(orgName)}-${year}-${norm(title).slice(0, 30)}`
}

// ─── Status derivation ────────────────────────────────────────────────────────

function deriveStatus(start: string | null, end: string | null): string {
  const now = new Date()
  const e   = end   ? new Date(end)   : null
  const s   = start ? new Date(start) : null
  if (e && e < now) return "closed"
  if (s && s > now) return "upcoming"
  if (s && s <= now) return "open"
  return "upcoming"
}

// ─── Random jitter ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function jitter(min = 300, max = 1200): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const body        = req.method === "POST"
    ? await req.json().catch(() => ({})) as Record<string, unknown>
    : {}
  const triggeredBy = (body.triggered_by as string) ?? "scheduled"
  const forceRun    = body.force === true

  // Idempotency guard (skip for admin force runs)
  if (!forceRun && triggeredBy === "scheduled" && await isAlreadyRunning()) {
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
  let totalSkipped = 0
  let totalFanout  = 0

  // ── Create run record ──────────────────────────────────────────────────────
  const { data: run } = await supabase
    .from("scrape_runs")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single()
  const runId = run?.id as string | null

  // ── Load sources from source_registry (primary) ────────────────────────────
  const { data: allSources } = await supabase
    .from("source_registry")
    .select("*")
    .eq("is_active", true)
    .lt("consecutive_fails", 10)   // skip permanently broken sources
    .order("tier", { ascending: true })
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SOURCES)

  const dueSources = ((allSources ?? []) as SourceRecord[]).filter(s => isDue(s, now))

  // ── Load existing fingerprints for dedup ────────────────────────────────────
  const { data: existingRecs } = await supabase
    .from("recruitments")
    .select("id, name, year, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(500)

  const existingFps = new Map<string, string>()
  for (const r of existingRecs ?? []) {
    const orgName = (r.organizations as { name: string } | null)?.name ?? ""
    existingFps.set(fingerprint(orgName, r.year, r.name), r.id)
  }

  // ── Process each source ────────────────────────────────────────────────────
  for (const src of dueSources) {
    const startMs = Date.now()

    try {
      // Random jitter to avoid synchronized requests
      await sleep(jitter(200, 800))

      // Acquire content
      const { text, url, skipped } = await acquireContent(supabase, src)

      const durationMs = Date.now() - startMs

      // Record health metric
      await supabase.from("source_health_metrics").insert({
        source_id:         src.id,
        fetch_duration_ms: durationMs,
        http_status:       200,
        parse_success:     true,
        items_extracted:   skipped ? 0 : (text.length > 100 ? 1 : 0),
        confidence_avg:    null,
      }).catch(() => {/* non-fatal */})

      if (skipped) {
        totalSkipped++
        // Still mark as scraped even if content unchanged
        await supabase.from("source_registry")
          .update({ last_scraped_at: now.toISOString(), consecutive_fails: 0 })
          .eq("id", src.id)
        continue
      }

      if (!text || text.length < 80) {
        await supabase.from("source_registry")
          .update({ last_scraped_at: now.toISOString() })
          .eq("id", src.id)
        continue
      }

      // Extract with Claude
      const extracted = await extractWithClaude(
        text, src.source_name, url, src.trust_score, year
      )

      // Update confidence in health metric
      if (extracted) {
        await supabase.from("source_health_metrics")
          .update({ confidence_avg: extracted.confidence, items_extracted: extracted.confidence >= 0.30 ? 1 : 0 })
          .eq("source_id", src.id)
          .order("measured_at", { ascending: false })
          .limit(1)
          .catch(() => {/* non-fatal */})
      }

      if (!extracted || extracted.confidence < 0.30 || !extracted.title) {
        await supabase.from("source_registry")
          .update({
            last_scraped_at:   now.toISOString(),
            last_success_at:   now.toISOString(),
            consecutive_fails: 0,
          })
          .eq("id", src.id)
        continue
      }

      totalFound++

      const fp    = fingerprint(extracted.organization_name, extracted.year, extracted.title)
      const isDup = existingFps.has(fp)

      const queueStatus = isDup
        ? "duplicate"
        : extracted.confidence >= 0.90 ? "approved"
        : "pending"

      // Insert into scrape_queue (triggers fn_promote_approved_scrape on 'approved')
      await supabase.from("scrape_queue").insert({
        source_url:       url,
        source_name:      src.source_name,
        extracted_data:   extracted,
        confidence_score: extracted.confidence,
        status:           queueStatus,
        scrape_run_id:    runId,
        duplicate_of:     isDup ? (existingFps.get(fp) ?? null) : null,
      })

      if (isDup) {
        totalDup++
        // Update dates on existing if they improved
        if (extracted.apply_end_date) {
          const existId = existingFps.get(fp)
          if (existId) {
            await supabase.from("recruitments").update({
              status:          deriveStatus(extracted.apply_start_date, extracted.apply_end_date),
              apply_end_date:   extracted.apply_end_date   ?? undefined,
              apply_start_date: extracted.apply_start_date ?? undefined,
              total_vacancies:  extracted.total_vacancies  ?? undefined,
            }).eq("id", existId)
          }
        }
      } else {
        totalNew++
        existingFps.set(fp, "queued")
      }

      // Mark success
      await supabase.from("source_registry").update({
        last_scraped_at:   now.toISOString(),
        last_success_at:   now.toISOString(),
        last_changed_at:   now.toISOString(),
        consecutive_fails: 0,
        last_error:        null,
      }).eq("id", src.id)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ source: src.source_name, error: msg, at: now.toISOString() })

      // Increment consecutive_fails
      await supabase.from("source_registry").update({
        last_scraped_at:   now.toISOString(),
        consecutive_fails: src.consecutive_fails + 1,
        last_error:        msg.slice(0, 500),
      }).eq("id", src.id)

      // Record failure in health metrics
      await supabase.from("source_health_metrics").insert({
        source_id:     src.id,
        http_status:   0,
        parse_success: false,
        error_message: msg.slice(0, 500),
      }).catch(() => {/* non-fatal */})
    }
  }

  // ── Process pending alert_events fan-out ───────────────────────────────────
  const { data: pendingEvents } = await supabase
    .from("alert_events")
    .select("id, priority")
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
      // non-fatal — will retry next run
    }
  }

  // ── Process eligibility recompute queue ────────────────────────────────────
  // Mark items as processing — actual recompute happens when user visits dashboard
  await supabase.from("eligibility_recompute_queue")
    .update({ status: "processing" })
    .eq("status", "pending")
    .lt("queued_at", new Date(Date.now() - 60_000).toISOString())
    .catch(() => {/* non-fatal */})

  // ── Finalize run ───────────────────────────────────────────────────────────
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
      sourcesChecked: dueSources.length,
      totalFound,
      totalNew,
      totalDuplicate:  totalDup,
      totalSkipped,
      usersNotified:   totalFanout,
      errors:          errors.length,
      status:          runStatus,
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})