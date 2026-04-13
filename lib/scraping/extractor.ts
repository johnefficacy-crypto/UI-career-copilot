// lib/scraping/extractor.ts
// Career Copilot — Phase 10
// Uses Claude to parse raw HTML/text from recruitment portal pages
// into structured ExtractedRecruitment objects.

import Anthropic from "@anthropic-ai/sdk"
import type { ExtractedRecruitment } from "@/types/scraping"
import { toJsonSafe } from "@/types/scraping"

export type { ExtractedRecruitment }
export { toJsonSafe }

const client = new Anthropic()

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a specialist data extraction agent for Indian government recruitment notifications.
You receive raw HTML or text scraped from official government job portals.
Your job is to extract structured recruitment information and return ONLY valid JSON.

Rules:
- Extract ONLY factual information present in the text. Never fabricate data.
- Dates must be in ISO 8601 format (YYYY-MM-DD). If day is unclear, use the 1st of the month.
- If a field is not mentioned, set it to null.
- Vacancies should be total across all categories.
- For posts, extract each distinct post/grade separately.
- org_type must be one of: UPSC, SSC, Banking, Railway, State, Insurance, Defence, Other
- Return ONLY JSON. No markdown, no explanation, no preamble.`

// ── Main extraction function ──────────────────────────────────────────────────

export async function extractRecruitmentData(
  rawText: string,
  sourceUrl: string,
  sourceName: string
): Promise<{ data: ExtractedRecruitment; confidence: number } | null> {

  // Truncate if very long — keep first 12000 chars which covers most notifications
  const truncated = rawText.slice(0, 12000)

  const userPrompt = `Extract all recruitment notification data from the following text scraped from ${sourceName} (${sourceUrl}).

Return a JSON object matching this exact shape:
{
  "title": "string — full recruitment name",
  "organization_name": "string",
  "org_type": "UPSC|SSC|Banking|Railway|State|Insurance|Defence|Other",
  "notification_date": "YYYY-MM-DD or null",
  "apply_start_date": "YYYY-MM-DD or null",
  "apply_end_date": "YYYY-MM-DD or null",
  "total_vacancies": number or null,
  "year": number (current year if unclear),
  "source_pdf_url": "string or null",
  "official_notification_url": "${sourceUrl}",
  "posts": [
    {
      "post_name": "string",
      "group_type": "A|B|C|D or null",
      "pay_level": "string or null",
      "vacancies": number or null,
      "min_age": number or null,
      "max_age": number or null,
      "education_required": "string or null",
      "disciplines": ["string"] or null
    }
  ]
}

Also include a "confidence" field (0.0 to 1.0) indicating how complete and clear the extracted data is.

SCRAPED TEXT:
${truncated}`

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()

    // Strip any accidental markdown fences
    const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()
    const parsed = JSON.parse(clean) as Record<string, unknown>

    const confidence = typeof parsed.confidence === "number"
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5

    // Remove confidence from the data object before returning
    const { confidence: _c, ...rest } = parsed
    void _c

    return { data: rest as ExtractedRecruitment, confidence }

  } catch (err) {
    console.error("[extractor] Failed to parse Claude response:", err)
    return null
  }
}

// ── Fetch raw text from a URL ─────────────────────────────────────────────────

export async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CareerCopilot-Scraper/1.0; +https://careercopilot.in/bot)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    return stripHtml(html)
  } catch (err) {
    console.error(`[fetcher] Failed to fetch ${url}:`, err)
    return null
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()
}

// ── Duplicate detection ───────────────────────────────────────────────────────

export function computeSimilarityKey(data: ExtractedRecruitment): string {
  const org = data.organization_name.toLowerCase().replace(/[^a-z0-9]/g, "")
  const year = String(data.year)
  const titleWords = data.title.toLowerCase().split(/\s+/).slice(0, 4).join("")
  return `${org}-${year}-${titleWords}`
}