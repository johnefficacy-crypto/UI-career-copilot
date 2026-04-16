/**
 * supabase/functions/scheduled-scraper/index.ts
 * Career Copilot — Scraper v4
 *
 * Changes vs v3 (Phase 2):
 *  TASK 2  — Explicit Playwright guard: skips instead of silently falling through to HTML
 *  TASK 4  — Anti-bot jitter: per-risk ranges (none=100-500ms, low=300-900ms, medium=2-5s, high=5-15s)
 *  TASK 5  — Exponential backoff on consecutive_fails: 2^n * interval, capped at 168h
 *  TASK 6  — Time-budget loop (42s) instead of hard MAX_SOURCES=20 constant
 *  TASK 9  — RSS auto-discovery: HTML adapter upgrades source when RSS link found in page
 *  TASK 10 — Webhook notification on run completion (SCRAPER_WEBHOOK_URL env var)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Env ──────────────────────────────────────────────────────────────────────
// SUPABASE_URL is a reserved Supabase system var — auto-injected at runtime.
// SB_PROJECT_URL is a user-settable fallback for projects where auto-injection
// is absent (e.g. CLI not linked). Set via: supabase secrets set SB_PROJECT_URL=...
const ANTHROPIC_KEY    = Deno.env.get("ANTHROPIC_API_KEY")        ?? ""
const GEMINI_KEY       = Deno.env.get("GEMINI_API_KEY")           ?? ""
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")              ||
                         Deno.env.get("SB_PROJECT_URL")            || ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

// ── Model config ──────────────────────────────────────────────────────────────
// Architecture: Gemini 2.0 Flash (free, 1500/day) PRIMARY for LLM extraction.
// Anthropic claude-3-5-haiku (paid, cheap) is FALLBACK only.
// RSS sources bypass LLM entirely — direct structured extraction, zero cost.
const CLAUDE_MODEL    = "claude-haiku-4-5-20251001"    // Tier-1 universal access, ~$0.00025/source
const GEMINI_MODEL    = "gemini-2.0-flash"
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const SYSTEM_PROMPT   = "You are a specialist data extraction agent for Indian government recruitment notifications. Return ONLY valid JSON with a top-level 'recruitments' array. Never return markdown or explanation."
const REQUEST_TIMEOUT = 18_000
const CLAUDE_TIMEOUT  = 32_000

// ── Gemini rate limiter ───────────────────────────────────────────────────────
// Free tier limit: 15 RPM. We enforce 5 s minimum gap between calls (~12 RPM)
// to absorb bursts caused by sources with multiple linked PDFs.
// Module-level state — shared across ALL callGemini* invocations in one run.
const GEMINI_MIN_GAP_MS   = 5_000   // 60s / 5s = 12 RPM (safe under 15 RPM cap)
const GEMINI_RETRY_WAIT   = 5_000   // after a 429, wait 5s then retry once; keep budget for other sources
let   _geminiLastCallMs           = 0
let   _geminiDailyQuotaExhausted  = false  // set true on confirmed daily quota; skip all subsequent calls this run

async function geminiRateLimit(): Promise<void> {
  const elapsed = Date.now() - _geminiLastCallMs
  if (elapsed < GEMINI_MIN_GAP_MS) await sleep(GEMINI_MIN_GAP_MS - elapsed)
  _geminiLastCallMs = Date.now()
}
// TASK 6: time budget — 42s of the ~50s Edge Function wall-clock limit
const RUN_BUDGET_MS     = 42_000

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
  requires_playwright:   boolean
  is_active:             boolean
  last_scraped_at:       string | null
  last_success_at:       string | null
  consecutive_fails:     number
}

interface ETagRecord {
  source_id:     string
  etag:          string | null
  last_modified: string | null
  content_hash:  string | null
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
  posts:                     Record<string, unknown>[]
  confidence:                number
}

interface RunError {
  source: string
  error:  string
  at:     string
}

interface AcquireResult {
  text:       string
  url:        string
  skipped:    boolean          // true = ETag matched or Playwright pending
  headers:    Record<string, string>
  pdfBytes?:  Uint8Array       // set by pdf adapter; triggers PDF extraction
  linkedPdfs?: Uint8Array[]    // PDFs discovered in HTML pages
  rssItems?:  ExtractedRecruitment[]  // set when RSS direct extraction succeeds — bypasses LLM
}

// ─── Supabase client ──────────────────────────────────────────────────────────

function db() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// ─── Startup env validation ───────────────────────────────────────────────────
// Called once at handler start — logs clearly instead of failing mid-run.

function validateEnv(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = []
  if (!SUPABASE_URL)     warnings.push("SUPABASE_URL / SB_PROJECT_URL not set — all DB ops will fail")
  if (!SERVICE_ROLE_KEY) warnings.push("SUPABASE_SERVICE_ROLE_KEY not set — all DB ops will fail")
  if (!ANTHROPIC_KEY && !GEMINI_KEY) {
    warnings.push("Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is set — ALL extractions will return empty (items_found=0). Set at least one.")
  } else {
    const primary  = ANTHROPIC_KEY ? "Claude 3 Haiku (Anthropic — paid)" : "—"
    const fallback = GEMINI_KEY    ? "Gemini 2.0 Flash (free tier)"    : "none"
    console.log(`[env] LLM: primary=${primary}  fallback=${fallback}`)
  }
  warnings.forEach(w => console.error(`[env] ⚠ ${w}`))
  const ok = !!(SUPABASE_URL && SERVICE_ROLE_KEY && (GEMINI_KEY || ANTHROPIC_KEY))
  if (ok) console.log("[env] ✓ All required env vars present")
  return { ok, warnings }
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

// ─── TASK 5: Exponential backoff isDue ────────────────────────────────────────

function isDue(src: SourceRecord, now: Date): boolean {
  if (!src.last_scraped_at) return true

  // Exponential backoff: 2^fails × base_interval, capped at 7 days (168h)
  // 1 fail → 2×, 2 fails → 4×, 3 fails → 8×, 5 fails → 32× (still retries)
  const backoffMultiplier = src.consecutive_fails > 0
    ? Math.min(Math.pow(2, src.consecutive_fails), 168)
    : 1

  const last     = new Date(src.last_scraped_at).getTime()
  const interval = src.scrape_interval_hours * 3_600_000 * backoffMultiplier
  const grace    = src.tier === 1 ? 0.75 : 1.0

  return now.getTime() - last >= interval * grace
}

// ─── TASK 4: Anti-bot jitter ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function jitter(src: SourceRecord): number {
  const ranges: Record<string, [number, number]> = {
    none:    [100,    500],
    low:     [300,    900],
    medium:  [2000,  5000],
    high:    [5000, 15000],
    blocked: [0,       0],
  }
  const [min, max] = ranges[src.anti_bot_risk] ?? [300, 900]
  if (min === 0) return 0
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveStatus(start: string | null, end: string | null): string {
  const now = new Date()
  const e   = end   ? new Date(end)   : null
  const s   = start ? new Date(start) : null
  if (e && e < now) return "closed"
  if (s && s > now) return "upcoming"
  if (s && s <= now) return "open"
  return "upcoming"
}

async function sha256hex(data: string): Promise<string> {
  const buf  = new TextEncoder().encode(data)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
}

// ─── RSS parsing ──────────────────────────────────────────────────────────────

function parseRssItems(xml: string): string {
  const items: string[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block   = match[1]
    const title   = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() ?? ""
    const link    = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? ""
    const desc    = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? ""
    if (title) items.push(`Title: ${title}\nLink: ${link}\nDesc: ${desc.slice(0, 300)}`)
    if (items.length >= 20) break
  }
  return items.join("\n\n")
}

// ─── RSS direct extraction (LLM-free) ────────────────────────────────────────
// Converts RSS <item> elements directly to ExtractedRecruitment objects without
// any LLM call. Works for well-structured feeds (Employment News, UPSC, SSC,
// most banking RSS). Saves ~1,500 Gemini calls/day at 66+ RSS sources.
// confidence=0.55: we have title+org+date but rarely post-level age/education.

function extractRssDirect(
  xml:        string,
  sourceUrl:  string,
  sourceName: string,
  orgType:    string,
  year:       number
): ExtractedRecruitment[] {
  const results: ExtractedRecruitment[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi

  // Recruitment-signal keywords — skip items that are clearly not job notifications
  const RECRUITMENT_SIGNALS = [
    "recruit", "vacancy", "vacancies", "advt", "advertisement", "notification",
    "exam", "post", "posts", "appointment", "hiring", "career", "job", "opening",
    "result", "admit card", "merit list", "cutoff", "shortlist", "interview",
  ]

  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block   = match[1]
    const title   = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? ""
    const link    = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? sourceUrl
    const desc    = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim() ?? ""
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ?? null

    if (!title) continue

    // Only include items with at least one recruitment signal
    const combined = (title + " " + desc).toLowerCase()
    const hasSignal = RECRUITMENT_SIGNALS.some(s => combined.includes(s))
    if (!hasSignal) continue

    // Parse publication date
    let notificationDate: string | null = null
    if (pubDate) {
      const d = new Date(pubDate)
      if (!isNaN(d.getTime())) notificationDate = d.toISOString().slice(0, 10)
    }

    // Best-effort vacancy extraction from title + description
    const vacancyMatch = combined.match(/(\d[\d,]+)\s*(?:posts?|vacancies|positions?|seats?)/i)
    const totalVacancies = vacancyMatch ? parseInt(vacancyMatch[1].replace(/,/g, ""), 10) : null

    // Best-effort apply end date from description
    let applyEndDate: string | null = null
    const datePatterns = [
      /last\s*date[^:]*:\s*(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{4})/i,
      /apply\s*(?:before|by|till|upto)[^:]*:\s*(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{4})/i,
      /(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{4})/,  // fallback: first date found in desc
    ]
    for (const pat of datePatterns) {
      const m = desc.match(pat)
      if (m) {
        const d = new Date(m[1])
        if (!isNaN(d.getTime())) {
          applyEndDate = d.toISOString().slice(0, 10)
          break
        }
      }
    }

    results.push({
      title,
      organization_name: sourceName,
      org_type:          orgType,
      notification_date: notificationDate,
      apply_start_date:  null,
      apply_end_date:    applyEndDate,
      total_vacancies:   totalVacancies,
      year,
      official_notification_url: link || sourceUrl,
      source_pdf_url:    null,
      posts:             [],
      confidence:        0.55,  // structural extraction: title+org+date but no post-level detail
    })

    if (results.length >= 20) break
  }

  return results
}

// ─── JSON adapter ─────────────────────────────────────────────────────────────

function flattenJson(json: unknown, src: SourceRecord): string {
  const cfg        = src.parser_config
  const itemsField = (cfg?.items_field as string) ?? "results"
  const titleField = (cfg?.title_field as string) ?? "title"
  const linkField  = (cfg?.link_field  as string) ?? "link"

  try {
    const root  = json as Record<string, unknown>
    const items = (Array.isArray(json) ? json : (root[itemsField] ?? [])) as Record<string, unknown>[]
    return items.slice(0, 20).map(obj => {
      const getVal = (field: string): string => {
        const parts = field.split(".")
        let val: unknown = obj
        for (const p of parts) val = (val as Record<string, unknown>)?.[p]
        return String(val ?? "")
      }
      return `Title: ${getVal(titleField)}\nLink: ${getVal(linkField)}`
    }).join("\n\n")
  } catch {
    return JSON.stringify(json).slice(0, 8000)
  }
}

// ─── Base64 helper (chunked — avoids stack overflow for large PDFs) ───────────

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// ─── Shared extraction prompt ─────────────────────────────────────────────────

function makeExtractionPrompt(sourceUrl: string, sourceName: string, year: number): string {
  return `Extract ALL recruitment notifications from this content from ${sourceName} (${sourceUrl}).

There may be multiple separate notifications. Extract EACH one separately.

Return a JSON object with a "recruitments" array:
{
  "recruitments": [
    {
      "title": "full recruitment name",
      "organization_name": "string",
      "org_type": "UPSC|SSC|Banking|Railway|State|Insurance|Defence|Other",
      "notification_date": "YYYY-MM-DD or null",
      "apply_start_date": "YYYY-MM-DD or null",
      "apply_end_date": "YYYY-MM-DD or null",
      "total_vacancies": number or null,
      "year": ${year},
      "source_pdf_url": "string or null",
      "official_notification_url": "direct URL or ${sourceUrl}",
      "confidence": 0.0-1.0,
      "posts": [{"post_name":"","group_type":"A|B|C|D or null","vacancies":null,"min_age":null,"max_age":null,"education_required":null,"disciplines":null}]
    }
  ]
}

Rules:
- confidence=1.0 only when title, org, dates, vacancies AND post-level age/education are all present.
- If no recruitments found, return {"recruitments": []}.
- Return ONLY valid JSON, never markdown or explanation.`
}

// ─── Parse Claude's recruitment JSON response ─────────────────────────────────

function parseClaudeRecruitmentResponse(raw: string): ExtractedRecruitment[] {
  const clean = raw.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim()
  const jsonStart = clean.indexOf("{")
  const jsonEnd   = clean.lastIndexOf("}")
  if (jsonStart === -1 || jsonEnd === -1) return []
  const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1)) as { recruitments?: unknown[] }
  const list   = Array.isArray(parsed.recruitments) ? parsed.recruitments : []
  return list.filter((r): r is ExtractedRecruitment =>
    typeof r === "object" && r !== null &&
    typeof (r as Record<string, unknown>).title === "string" &&
    (r as Record<string, unknown>).title !== ""
  )
}

// ─── Claude extraction on PDF bytes (Anthropic PDF beta API) ─────────────────
// Sends the raw PDF directly to Claude — handles compressed streams, CIDFont,
// and scanned pages that naive BT/ET regex completely misses.

// Returns null on API error (caller should try Gemini fallback).
// Returns [] if the model ran OK but found no recruitments.
async function callClaudeOnPdf(
  pdfBytes:   Uint8Array,
  sourceUrl:  string,
  sourceName: string,
  year:       number
): Promise<ExtractedRecruitment[] | null> {
  if (!ANTHROPIC_KEY) return null
  if (pdfBytes.length > 20_000_000) {
    console.log(`[${sourceName}] PDF too large (${(pdfBytes.length / 1e6).toFixed(1)} MB) — skipping`)
    return []
  }

  const base64 = toBase64(pdfBytes)

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 4000,
        system:     SYSTEM_PROMPT,
        messages: [{
          role:    "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text",     text: makeExtractionPrompt(sourceUrl, sourceName, year) },
          ],
        }],
      }),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      const hint = res.status === 400 && body.includes("credit")
        ? " (insufficient credits — top up at console.anthropic.com/settings/billing)"
        : res.status === 404
          ? " (model not found or API key revoked — rotate key at console.anthropic.com/settings/api-keys)"
          : res.status === 401
            ? " (invalid API key — check ANTHROPIC_API_KEY secret)"
            : ""
      console.error(`[${sourceName}] Anthropic PDF ${res.status}${hint} body=${body.slice(0, 300)}`)
      return null
    }

    const data    = await res.json() as { content?: Array<{ type: string; text: string }> }
    const raw     = data.content?.find(b => b.type === "text")?.text ?? ""
    const results = parseClaudeRecruitmentResponse(raw)
    console.log(`[${sourceName}] Anthropic PDF: ${results.length} recruitment(s)`)
    return results
  } catch (err) {
    console.error(`[${sourceName}] callClaudeOnPdf error:`, err)
    return null
  }
}

// ─── Find RECRUITMENT PDF links in HTML ──────────────────────────────────────
// Scores each PDF link by how likely it is to be a recruitment notification.
// Only returns PDFs with positive recruitment signals — avoids annual reports,
// citizen charters, product brochures, and other irrelevant govt documents.

function findPdfLinksInHtml(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)

  // Words in a URL/filename that signal a recruitment PDF
  const URL_POSITIVE = [
    "notification", "recruitment", "advt", "advertisement", "vacancy",
    "circular", "career", "employment", "job", "exam", "result",
    "admit", "cutoff", "merit", "selection", "application", "opening",
    "notice", "hiring", "post", "joining", "interview", "shortlist",
  ]
  // Words in anchor link text that signal a recruitment PDF
  const TEXT_POSITIVE = [
    "notification", "recruitment", "vacancy", "advertisement", "advt",
    "career", "employment", "job", "exam", "result", "admit card",
    "apply", "application", "opening", "post", "hiring", "notice",
    "circular", "shortlist", "interview", "joining",
  ]
  // URL substrings that definitively mark a non-recruitment PDF — skip always
  const URL_NEGATIVE = [
    "annual_report", "best_practice", "citizen_charter", "citizen_char",
    "product", "tender", "vendor", "price_list", "rate_contract",
    "manual", "guideline", "policy", "brochure", "ar_", "_ar_",
    "dar.pdf", "rti", "award", "grievance", "press_release", "tariff",
    "schedule_of_charges", "form_", "_form", "proforma", "norms",
  ]

  interface ScoredLink { url: string; score: number }
  const candidates = new Map<string, ScoredLink>()

  // Match <a href="...pdf...">anchor text</a> to capture both URL and link text
  const anchorRe = /<a[^>]*href=["']([^"']*\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi
  let m
  while ((m = anchorRe.exec(html)) !== null) {
    const rawHref  = m[1]
    const linkText = m[2].replace(/<[^>]+>/g, " ").trim().toLowerCase()

    try {
      const url      = new URL(rawHref.startsWith("http") ? rawHref : rawHref, base.href).href
      const urlLower = url.toLowerCase()

      // Hard exclude: non-recruitment document types
      if (URL_NEGATIVE.some(kw => urlLower.includes(kw))) continue

      let score = 0
      for (const kw of URL_POSITIVE)  if (urlLower.includes(kw))  score += 2
      for (const kw of TEXT_POSITIVE) if (linkText.includes(kw)) score += 3

      // Must have at least one positive signal to be considered
      if (score === 0) continue

      const existing = candidates.get(url)
      if (!existing || score > existing.score) candidates.set(url, { url, score })
    } catch { /* invalid URL — skip */ }
  }

  // Return top 3 by relevance score (highest first)
  return [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.url)
}

// ─── Data quality scoring ─────────────────────────────────────────────────────
// Scores extracted data 0–100 based on field completeness.
// High score = admin can approve with confidence; low = needs manual review.

function computeDataQualityScore(item: ExtractedRecruitment): number {
  let score = 0
  if ((item.title?.trim().length ?? 0) > 5)                           score += 15
  if ((item.organization_name?.trim().length ?? 0) > 2)               score += 15
  if (item.apply_end_date)                                             score += 20
  if (item.apply_start_date)                                           score += 10
  if (item.total_vacancies != null && item.total_vacancies > 0)        score += 10
  if (Array.isArray(item.posts) && item.posts.length > 0)              score += 10
  if (item.posts?.some(p => (p as Record<string,unknown>).min_age || (p as Record<string,unknown>).max_age)) score += 10
  if (item.posts?.some(p => (p as Record<string,unknown>).education_required))                               score += 10
  return score   // 0–100
}

// ─── Content acquisition ──────────────────────────────────────────────────────

async function acquireContent(
  supabase: ReturnType<typeof db>,
  src:      SourceRecord
): Promise<AcquireResult> {
  const targetUrl = src.notification_url ?? src.rss_url ?? src.api_url ?? src.official_url

  // ── TASK 2: Playwright guard ───────────────────────────────────────────────
  // Playwright adapter is not yet implemented in Deno Edge Functions.
  // Log and skip explicitly rather than silently falling through to HTML.
  if (src.adapter_type === "playwright" || src.requires_playwright) {
    await supabase
      .from("source_registry")
      .update({
        last_scraped_at: new Date().toISOString(),
        last_error:      "Playwright adapter pending implementation — skipped",
      })
      .eq("id", src.id)
    console.log(`[${src.source_name}] SKIP — Playwright adapter not yet implemented`)
    return { text: "", url: targetUrl, skipped: true, headers: {} }
  }

  // ── RSS adapter ────────────────────────────────────────────────────────────
  if (src.adapter_type === "rss" || src.rss_url) {
    const rssUrl = src.rss_url ?? targetUrl
    const { data: cached } = await supabase
      .from("scrape_source_etags")
      .select("etag,last_modified,content_hash")
      .eq("source_id", src.id)
      .single()

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; CareerCopilot/1.0)",
    }
    if ((cached as ETagRecord | null)?.etag) headers["If-None-Match"] = (cached as ETagRecord).etag!
    if ((cached as ETagRecord | null)?.last_modified) headers["If-Modified-Since"] = (cached as ETagRecord).last_modified!

    const res = await fetch(rssUrl, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
    if (res.status === 304) return { text: "", url: rssUrl, skipped: true, headers: {} }

    const xml  = await res.text()
    const hash = await sha256hex(xml)
    if ((cached as ETagRecord | null)?.content_hash === hash) return { text: "", url: rssUrl, skipped: true, headers: {} }

    const etag = res.headers.get("etag")
    const lm   = res.headers.get("last-modified")
    await supabase.from("scrape_source_etags").upsert({
      source_id:     src.id,
      etag:          etag ?? null,
      last_modified: lm   ?? null,
      content_hash:  hash,
      checked_at:    new Date().toISOString(),
    })

    // Try direct LLM-free extraction first.
    // If it yields results, return them in rssItems — main loop skips LLM entirely.
    // Fall back to text-for-LLM only when direct extraction finds nothing.
    const direct = extractRssDirect(xml, rssUrl, src.source_name, src.source_type ?? "Other", year)
    if (direct.length > 0) {
      console.log(`[${src.source_name}] RSS direct: ${direct.length} item(s) (no LLM used)`)
      return { text: "", url: rssUrl, skipped: false, headers: {}, rssItems: direct }
    }

    // Direct extraction found nothing — fall through to LLM with formatted text
    return { text: parseRssItems(xml), url: rssUrl, skipped: false, headers: {} }
  }

  // ── JSON adapter ───────────────────────────────────────────────────────────
  if (src.adapter_type === "json" && src.api_url) {
    const res  = await fetch(src.api_url, {
      headers:{ "User-Agent": "CareerCopilot/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    if (!res.ok) throw new Error(`JSON fetch ${res.status}`)
    const json = await res.json()
    return { text: flattenJson(json, src), url: src.api_url, skipped: false, headers: {} }
  }

  // ── PDF adapter ────────────────────────────────────────────────────────────
  // Stage 2: replaced naive BT/ET regex with Anthropic PDF API.
  // Returns raw bytes so the main loop can call callClaudeOnPdf().
  if (src.adapter_type === "pdf" && src.pdf_bulletin_url) {
    const res  = await fetch(src.pdf_bulletin_url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
    if (!res.ok) throw new Error(`PDF fetch ${res.status}`)
    const buf  = await res.arrayBuffer()
    return { text: "", url: src.pdf_bulletin_url, skipped: false, headers: {}, pdfBytes: new Uint8Array(buf) }
  }

  // ── HTML adapter ───────────────────────────────────────────────────────────
  {
    const { data: cached } = await supabase
      .from("scrape_source_etags")
      .select("etag,last_modified,content_hash")
      .eq("source_id", src.id)
      .single()

    const reqHeaders: Record<string, string> = {
      "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
    }
    if ((cached as ETagRecord | null)?.etag) reqHeaders["If-None-Match"] = (cached as ETagRecord).etag!
    if ((cached as ETagRecord | null)?.last_modified) reqHeaders["If-Modified-Since"] = (cached as ETagRecord).last_modified!

    const res = await fetch(targetUrl, { headers: reqHeaders, signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
    if (res.status === 304) return { text: "", url: targetUrl, skipped: true, headers: {} }
    if (!res.ok) throw new Error(`HTML fetch ${res.status}`)

    const rawHtml = await res.text()
    const hash    = await sha256hex(rawHtml)
    if ((cached as ETagRecord | null)?.content_hash === hash) return { text: "", url: targetUrl, skipped: true, headers: {} }

    const etag = res.headers.get("etag")
    const lm   = res.headers.get("last-modified")
    await supabase.from("scrape_source_etags").upsert({
      source_id:     src.id,
      etag:          etag ?? null,
      last_modified: lm   ?? null,
      content_hash:  hash,
      checked_at:    new Date().toISOString(),
    })

    // ── TASK 9: RSS auto-discovery ─────────────────────────────────────────
    // If this HTML source has an RSS link declared in the page <head>,
    // auto-upgrade it to the rss adapter to save Claude API costs in future.
    if (src.adapter_type === "html" && !src.rss_url) {
      const rssMatch =
        rawHtml.match(/application\/(?:rss|atom)\+xml[^>]*href="([^"]+)"/i) ||
        rawHtml.match(/href="([^"]+)"[^>]*type="application\/(?:rss|atom)\+xml"/i)

      if (rssMatch?.[1]) {
        const discovered = rssMatch[1].startsWith("http")
          ? rssMatch[1]
          : `${new URL(targetUrl).origin}${rssMatch[1]}`

        await supabase
          .from("source_registry")
          .update({
            rss_url:      discovered,
            adapter_type: "rss",
            notes:        `RSS auto-discovered ${new Date().toISOString().slice(0, 10)}. Was: html.`,
            updated_at:   new Date().toISOString(),
          })
          .eq("id", src.id)

        console.log(`[${src.source_name}] RSS auto-upgraded → ${discovered}`)
      }
    }

    // Strip HTML to plain text for Claude
    const stripped = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ").trim()

    // ── Stage 2: PDF link detection ───────────────────────────────────────────
    // Many govt pages (UPSC, SSC, IBPS) show only a summary in HTML and put the
    // full eligibility matrix in a linked PDF. Fetch up to 3 linked PDFs so
    // Claude gets complete post-level data (age limits, education, vacancies).
    const linkedPdfs: Uint8Array[] = []
    if (src.adapter_type !== "pdf") {
      const pdfLinks = findPdfLinksInHtml(rawHtml, targetUrl)
      for (const pdfUrl of pdfLinks) {
        try {
          const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
          if (pdfRes.ok) {
            const buf = await pdfRes.arrayBuffer()
            if (buf.byteLength < 20_000_000) {  // skip PDFs > 20 MB
              linkedPdfs.push(new Uint8Array(buf))
              console.log(`[${src.source_name}] Fetched linked PDF: ${pdfUrl} (${(buf.byteLength / 1024).toFixed(0)} KB)`)
            }
          }
        } catch { /* non-fatal — HTML text still goes to Claude */ }
      }
    }

    return { text: stripped, url: targetUrl, skipped: false, headers: {}, linkedPdfs }
  }
}

// ─── Claude extraction ────────────────────────────────────────────────────────
// Returns ALL recruitments found on a page (Employment News / UPSC Current
// Openings can have 10–30 separate notifications — the old single-object
// approach silently dropped all but the first).

// ─── Gemini low-level fetch (with rate limiter + one retry on 429) ────────────

async function geminiFetch(body: object, sourceName: string, label: string): Promise<Response | null> {
  // Short-circuit: if we already confirmed daily quota is gone this run, don't waste time
  if (_geminiDailyQuotaExhausted) {
    console.warn(`[${sourceName}] Gemini ${label} — daily quota exhausted this run, skipping`)
    return null
  }

  await geminiRateLimit()

  let res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(CLAUDE_TIMEOUT),
  })

  if (res.status === 429) {
    // Per-minute rate limit — wait briefly and retry once before giving up on Gemini.
    console.warn(`[${sourceName}] Gemini ${label} rate limited (429) — retrying in ${GEMINI_RETRY_WAIT / 1000}s`)
    await sleep(GEMINI_RETRY_WAIT)
    _geminiLastCallMs = 0  // force rate limiter to allow immediate retry
    await geminiRateLimit()
    res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(CLAUDE_TIMEOUT),
    })
  }

  if (res.status === 429) {
    // Check whether it's a daily quota exhaustion or just persistent per-minute throttle.
    // Gemini returns {"error":{"status":"RESOURCE_EXHAUSTED","message":"..."}} for daily quota.
    const errBody = await res.clone().text().catch(() => "")
    const isDaily = errBody.includes("RESOURCE_EXHAUSTED") || errBody.includes("quota")
    if (isDaily) {
      _geminiDailyQuotaExhausted = true
      console.warn(`[${sourceName}] Gemini ${label} DAILY quota exhausted — disabling Gemini for this run. Wait until midnight Pacific for reset.`)
    } else {
      console.warn(`[${sourceName}] Gemini ${label} persistent rate limit — skipping source`)
    }
    return null
  }
  if (!res.ok) {
    console.error(`[${sourceName}] Gemini ${label} API ${res.status} — skipping`)
    return null
  }
  return res
}

// ─── Gemini extraction — text ─────────────────────────────────────────────────
// Returns null ONLY on genuine failure (exhausted retries, not a transient 429).
// Returns [] when the model ran OK but found no recruitments.

async function callGemini(
  text:       string,
  sourceUrl:  string,
  sourceName: string,
  year:       number
): Promise<ExtractedRecruitment[] | null> {
  if (!GEMINI_KEY) return null

  const prompt    = makeExtractionPrompt(sourceUrl, sourceName, year)
  const truncated = text.slice(0, 12000)

  try {
    const res = await geminiFetch({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nTEXT:\n${truncated}` }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
    }, sourceName, "text")

    if (!res) return null

    const data    = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const raw     = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const results = parseClaudeRecruitmentResponse(raw)
    console.log(`[${sourceName}] Gemini text: ${results.length} recruitment(s)`)
    return results
  } catch (err) {
    console.error(`[${sourceName}] callGemini error:`, err)
    return null
  }
}

// ─── Gemini extraction — PDF ──────────────────────────────────────────────────

async function callGeminiOnPdf(
  pdfBytes:   Uint8Array,
  sourceUrl:  string,
  sourceName: string,
  year:       number
): Promise<ExtractedRecruitment[] | null> {
  if (!GEMINI_KEY) return null
  if (pdfBytes.length > 20_000_000) return null  // >20 MB — skip

  const base64 = toBase64(pdfBytes)
  const prompt  = makeExtractionPrompt(sourceUrl, sourceName, year)

  try {
    const res = await geminiFetch({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
    }, sourceName, "PDF")

    if (!res) return null

    const data    = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const raw     = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const results = parseClaudeRecruitmentResponse(raw)
    console.log(`[${sourceName}] Gemini PDF: ${results.length} recruitment(s)`)
    return results
  } catch (err) {
    console.error(`[${sourceName}] callGeminiOnPdf error:`, err)
    return null
  }
}

// ─── Unified extraction wrappers ──────────────────────────────────────────────
// Anthropic is PRIMARY (paid, reliable, no rate limit at typical scraping volume).
// Gemini is FALLBACK — activates only when Anthropic key is absent or API errors.
// null from either function = "I can't handle this call, try the other one".
// [] from either function = "I ran fine, there's simply nothing to extract".

async function extractFromText(
  text:       string,
  sourceUrl:  string,
  sourceName: string,
  year:       number
): Promise<ExtractedRecruitment[]> {
  if (ANTHROPIC_KEY) {
    const result = await callClaude(text, sourceUrl, sourceName, year)
    if (result !== null) return result   // null = API error → try Gemini
  }
  // Gemini fallback (free tier, rate-limited)
  return await callGemini(text, sourceUrl, sourceName, year) ?? []
}

async function extractFromPdf(
  pdfBytes:   Uint8Array,
  sourceUrl:  string,
  sourceName: string,
  year:       number
): Promise<ExtractedRecruitment[]> {
  if (ANTHROPIC_KEY) {
    const result = await callClaudeOnPdf(pdfBytes, sourceUrl, sourceName, year)
    if (result !== null) return result
  }
  // Gemini PDF fallback
  return await callGeminiOnPdf(pdfBytes, sourceUrl, sourceName, year) ?? []
}

// ─── Anthropic extraction — text (primary) ────────────────────────────────────
// Returns null on API error so extractFromText() can try Gemini fallback.
// Returns [] when the model ran OK but found no recruitments on the page.

async function callClaude(
  text:       string,
  sourceUrl:  string,
  sourceName: string,
  year:       number
): Promise<ExtractedRecruitment[] | null> {
  if (!ANTHROPIC_KEY) return null  // no key → caller will try Gemini

  const prompt    = makeExtractionPrompt(sourceUrl, sourceName, year)
  const truncated = text.slice(0, 12000)

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
        max_tokens: 4000,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: `${prompt}\n\nTEXT:\n${truncated}` }],
      }),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      const hint = res.status === 400 && body.includes("credit")
        ? " (insufficient credits)"
        : res.status === 404
          ? " (model not found or API key revoked — rotate at console.anthropic.com/settings/api-keys)"
          : res.status === 401
            ? " (invalid API key — check ANTHROPIC_API_KEY secret)"
            : ""
      console.error(`[${sourceName}] Anthropic text ${res.status}${hint} body=${body.slice(0, 300)} — trying Gemini fallback`)
      return null
    }

    const data    = await res.json() as { content?: Array<{ type: string; text: string }> }
    const raw     = data.content?.find(b => b.type === "text")?.text ?? ""
    const results = parseClaudeRecruitmentResponse(raw)
    console.log(`[${sourceName}] Anthropic text: ${results.length} recruitment(s)`)
    return results
  } catch (err) {
    console.error(`[${sourceName}] callClaude error:`, err)
    return null
  }
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

function fingerprintKey(orgName: string, year: number, title: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${norm(orgName)}-${year}-${norm(title).slice(0, 30)}`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const body        = req.method === "POST"
    ? await req.json().catch(() => ({})) as Record<string, unknown>
    : {}
  // ── Startup env validation ────────────────────────────────────────────────
  const { warnings: envWarnings } = validateEnv()

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
  const runStart   = Date.now()

  // ── Create run record ──────────────────────────────────────────────────────
  const { data: run } = await supabase
    .from("scrape_runs")
    .insert({ status: "running", triggered_by: triggeredBy })
    .select("id")
    .single()
  const runId = run?.id as string | null

  // ── TASK 6: Load sources without hard limit — time budget controls instead ──
  const { data: allSources } = await supabase
    .from("source_registry")
    .select("*")
    .eq("is_active", true)
    .lt("consecutive_fails", 10)
    .order("tier",            { ascending: true })
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .limit(100)  // safety cap: never load the entire table, but not an artificial limit

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
    existingFps.set(fingerprintKey(orgName, r.year, r.name), r.id)
  }

  // ── Process each source ────────────────────────────────────────────────────
  for (const src of dueSources) {
    // TASK 6: time budget check before each source
    if (Date.now() - runStart > RUN_BUDGET_MS) {
      console.log(`[scraper] Time budget (${RUN_BUDGET_MS}ms) reached after processing ${dueSources.indexOf(src)} sources`)
      break
    }

    const startMs = Date.now()

    try {
      // TASK 4: source-aware jitter
      await sleep(jitter(src))

      const { text, url, skipped, pdfBytes, linkedPdfs, rssItems } = await acquireContent(supabase, src)

      if (skipped) {
        totalSkipped++
        await supabase.from("source_registry").update({ last_scraped_at: now.toISOString() }).eq("id", src.id)
        await supabase.from("source_health_metrics").insert({
          source_registry_id: src.id,
          source_id:          src.id,
          fetch_duration_ms:  Date.now() - startMs,
          http_status:        304,
          parse_success:      true,
          items_extracted:    0,
          confidence_avg:     null,
        })
        continue
      }

      if (!text.trim() && !pdfBytes && !rssItems && (!linkedPdfs || linkedPdfs.length === 0)) {
        totalSkipped++
        continue
      }

      // ── Stage 2: Route to extractor ──────────────────────────────────────────
      // RSS direct: no LLM, zero cost — structured data already parsed.
      // PDF: Gemini (primary) or Anthropic (fallback) PDF extraction.
      // HTML/RSS-text: Gemini (primary) or Anthropic (fallback) text extraction.
      let extractedList: ExtractedRecruitment[] = []

      if (rssItems) {
        // RSS direct extraction — LLM completely bypassed
        extractedList = rssItems
      } else if (pdfBytes) {
        // Dedicated PDF source — send bytes directly (Gemini → Anthropic fallback)
        extractedList = await extractFromPdf(pdfBytes, url, src.source_name, year)
      } else {
        // HTML/RSS — extract from text first
        if (text.trim()) {
          extractedList = await extractFromText(text, url, src.source_name, year)
        }
        // Also extract from any linked PDFs and merge (dedup by title fingerprint)
        for (const pdf of (linkedPdfs ?? [])) {
          const pdfResults = await extractFromPdf(pdf, url, src.source_name, year)
          for (const r of pdfResults) {
            const fp = fingerprintKey(r.organization_name, r.year, r.title)
            if (!extractedList.some(e => fingerprintKey(e.organization_name, e.year, e.title) === fp)) {
              extractedList.push(r)
            }
          }
        }
      }

      // Health metric: now includes actual item count and avg confidence
      const validItems = extractedList.filter(r => r.title && (r.confidence ?? 0) >= 0.30)
      await supabase.from("source_health_metrics").insert({
        source_registry_id: src.id,
        source_id:          src.id,  // legacy FK — kept until migration fully applied
        fetch_duration_ms:  Date.now() - startMs,
        http_status:        200,
        parse_success:      validItems.length > 0,
        items_extracted:    validItems.length,
        confidence_avg:     validItems.length > 0
          ? validItems.reduce((s, r) => s + (r.confidence ?? 0), 0) / validItems.length
          : null,
      })

      if (validItems.length === 0) {
        totalSkipped++
        await supabase.from("source_registry").update({
          last_scraped_at:   now.toISOString(),
          consecutive_fails: src.consecutive_fails + 1,
          last_error:        `No recruitments extracted (total=${extractedList.length}, all below confidence threshold)`,
        }).eq("id", src.id)
        continue
      }

      // Process each recruitment extracted from this source
      let sourceHadNew = false

      for (const extracted of validItems) {
        totalFound++

        // ── Stage 3: Data quality score ─────────────────────────────────────
        const qualityScore = computeDataQualityScore(extracted)

        const fp          = fingerprintKey(extracted.organization_name, extracted.year, extracted.title)
        const dupId       = existingFps.get(fp) ?? null
        const isDup       = Boolean(dupId)
        const queueStatus = isDup ? "duplicate"
          : extracted.confidence >= 0.90 ? "approved"
          : "pending"

        console.log(`[${src.source_name}] "${extracted.title.slice(0, 50)}" conf=${(extracted.confidence ?? 0).toFixed(2)} quality=${qualityScore} status=${queueStatus}`)

        if (isDup) {
          totalDup++
        } else {
          totalNew++
          sourceHadNew = true
          existingFps.set(fp, "queued")
        }

        const { confidence: _conf, ...dataWithoutConf } = extracted
        void _conf

        await supabase.from("scrape_queue").insert({
          source_url:        url,
          source_name:       src.source_name,
          extracted_data:    dataWithoutConf as unknown as Record<string, unknown>,
          confidence_score:  extracted.confidence,
          data_quality_score: qualityScore,
          status:            queueStatus,
          scrape_run_id:     runId,
          duplicate_of:      dupId,
        })

        if (queueStatus === "approved") {
          await supabase.rpc("fn_auto_recompute_eligibility", {
            p_source_name: src.source_name,
          }).then(() => { /* non-fatal */ }).catch(() => { /* non-fatal */ })
        }
      }

      // Update source health once — after all its recruitments are processed
      await supabase.from("source_registry").update({
        last_scraped_at:   now.toISOString(),
        ...(sourceHadNew ? { last_success_at: now.toISOString() } : {}),
        consecutive_fails: 0,
        last_error:        null,
      }).eq("id", src.id)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ source: src.source_name, error: msg, at: now.toISOString() })

      await supabase.from("source_registry").update({
        last_scraped_at:   now.toISOString(),
        consecutive_fails: src.consecutive_fails + 1,
        last_error:        msg.slice(0, 500),
      }).eq("id", src.id)

      await supabase.from("source_health_metrics").insert({
        source_registry_id: src.id,
        source_id:          src.id,
        fetch_duration_ms:  Date.now() - startMs,
        parse_success:      false,
        items_extracted:    0,
        error_message:      msg.slice(0, 500),
      })
    }
  }

  // ── Fan-out pending alert events ───────────────────────────────────────────
  const { data: pendingEvents } = await supabase
    .from("alert_events")
    .select("id")
    .eq("fanout_status", "pending")
    .order("priority",   { ascending: true })
    .order("created_at", { ascending: true })
    .limit(30)

  for (const event of pendingEvents ?? []) {
    const { data: fanned } = await supabase
      .rpc("fn_fanout_alert_event", { p_event_id: event.id })
      .then(r => r)
      .catch(() => ({ data: 0 }))
    totalFanout += (fanned as number) ?? 0
  }

  // ── Finalise run ───────────────────────────────────────────────────────────
  const runStatus = errors.length >= dueSources.length && dueSources.length > 0
    ? "failed"
    : errors.length > 0 ? "partial"
    : "completed"

  await supabase.from("scrape_runs").update({
    finished_at:     now.toISOString(),
    status:          runStatus,
    sources_checked: dueSources.length,
    items_found:     totalFound,
    items_new:       totalNew,
    items_duplicate: totalDup,
    error_log:       errors,
  }).eq("id", runId)

  // ── TASK 10: Webhook notification ─────────────────────────────────────────
  const webhookUrl = Deno.env.get("SCRAPER_WEBHOOK_URL")
  if (webhookUrl && (totalNew > 0 || errors.length > 0)) {
    const icon    = runStatus === "failed" ? "🔴" : runStatus === "partial" ? "🟡" : "🟢"
    const message = [
      `${icon} Career Copilot scraper run complete`,
      `Sources: ${dueSources.length} checked | New: ${totalNew} | Dupes: ${totalDup} | Skipped: ${totalSkipped}`,
      errors.length > 0
        ? `Errors (${errors.length}): ${errors.slice(0, 3).map(e => e.source).join(", ")}${errors.length > 3 ? " ..." : ""}`
        : "No errors",
    ].join("\n")

    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: message }),
    }).catch(() => { /* webhook failure is non-fatal */ })
  }

  return new Response(
    JSON.stringify({
      runId,
      sourcesChecked:  dueSources.length,
      totalFound,
      totalNew,
      envWarnings,
      totalDuplicate:  totalDup,
      totalSkipped,
      usersNotified:   totalFanout,
      errors:          errors.length,
      status:          runStatus,
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})