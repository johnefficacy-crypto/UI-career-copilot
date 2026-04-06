// lib/scraping/runner.ts
// Career Copilot — Phase 10
// Orchestrates scraping runs: fetch → extract → dedup → queue

import { createClient } from "@/utils/supabase/server"
import { fetchPageText, extractRecruitmentData, computeSimilarityKey } from "./extractor"
import { ScrapeSource, ScrapeResult } from "@/types/delete-scraping"

// ── Run a full scrape pass for all active sources ─────────────────────────────

export async function runScrapingPass(
  triggeredBy: "scheduled" | "manual" | "admin" = "scheduled",
  triggeredByUserId?: string,
  sourceIds?: string[]           // optional: scrape specific sources only
): Promise<string> {
  const supabase = await createClient()

  // Create scrape run record
  const { data: run, error: runErr } = await supabase
    .from("scrape_runs")
    .insert({
      status: "running",
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUserId ?? null,
    })
    .select("id")
    .single()

  if (runErr || !run) throw new Error("Failed to create scrape run")
  const runId = run.id

  // Fetch active sources
  let sourceQuery = supabase
    .from("scrape_sources")
    .select("*")
    .eq("is_active", true)
    .order("last_scraped_at", { ascending: true, nullsFirst: true })

  if (sourceIds?.length) {
    sourceQuery = sourceQuery.in("id", sourceIds)
  }

  const { data: sources } = await sourceQuery
  const activeSources: ScrapeSource[] = sources ?? []

  let totalFound = 0
  let totalNew = 0
  let totalDuplicate = 0
  const errorLog: { source: string; error: string; at: string }[] = []

  // Get existing recruitment similarity keys for dedup
  const { data: existingRecruitments } = await supabase
    .from("recruitments")
    .select("id, name, year, organizations(name)")
  const existingKeys = new Set<string>()
  const existingMap = new Map<string, string>() // key → recruitment_id
  for (const r of existingRecruitments ?? []) {
    const key = buildRecruitmentKey((r.organizations as any)?.name ?? "", r.year, r.name)
    existingKeys.add(key)
    existingMap.set(key, r.id)
  }

  // Also check existing queue items for dedup
  const { data: queuedItems } = await supabase
    .from("scrape_queue")
    .select("extracted_data, status")
    .not("status", "in", '("rejected","duplicate")')
  const queuedKeys = new Set<string>()
  for (const item of queuedItems ?? []) {
    const d = item.extracted_data
    if (d?.organization_name && d?.year && d?.title) {
      queuedKeys.add(computeSimilarityKey(d))
    }
  }

  // Process each source
  for (const source of activeSources) {
    const targetUrl = source.base_url + (source.notification_path ?? "")
    try {
      // Fetch raw text
      const rawText = await fetchPageText(targetUrl)
      if (!rawText) {
        errorLog.push({ source: source.name, error: "Failed to fetch page", at: new Date().toISOString() })
        continue
      }

      // Extract structured data with Claude
      const result = await extractRecruitmentData(rawText, targetUrl, source.name)
      if (!result) {
        errorLog.push({ source: source.name, error: "Extraction failed", at: new Date().toISOString() })
        continue
      }

      const { data, confidence } = result
      totalFound++

      // Deduplication check
      const simKey = computeSimilarityKey(data)
      const isDuplicateOfExisting = existingKeys.has(simKey)
      const isDuplicateOfQueued   = queuedKeys.has(simKey)

      if (isDuplicateOfExisting || isDuplicateOfQueued) {
        totalDuplicate++
        // Still log it but mark as duplicate
        await supabase.from("scrape_queue").insert({
          source_url:      targetUrl,
          source_name:     source.name,
          extracted_data:  data,
          confidence_score: confidence,
          status:          "duplicate",
          scrape_run_id:   runId,
          duplicate_of:    isDuplicateOfExisting ? existingMap.get(simKey) ?? null : null,
        })
      } else {
        // New item — add to review queue
        totalNew++
        queuedKeys.add(simKey) // prevent same-run duplicate

        // Auto-approve high-confidence items from known trustworthy sources
        const autoApprove = confidence >= 0.92 && isHighTrustSource(source.name)

        await supabase.from("scrape_queue").insert({
          source_url:      targetUrl,
          source_name:     source.name,
          extracted_data:  data,
          confidence_score: confidence,
          status:          autoApprove ? "approved" : "pending",
          scrape_run_id:   runId,
        })

        // If auto-approved, immediately promote to recruitments table
        if (autoApprove) {
          await promoteToRecruitments(data, supabase)
        }
      }

      // Update source last_scraped_at
      await supabase
        .from("scrape_sources")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", source.id)

    } catch (err: any) {
      errorLog.push({
        source: source.name,
        error: err?.message ?? String(err),
        at: new Date().toISOString(),
      })
    }
  }

  // Finalise run record
  const finalStatus = errorLog.length === activeSources.length ? "failed"
    : errorLog.length > 0 ? "partial"
    : "completed"

  await supabase.from("scrape_runs").update({
    finished_at:     new Date().toISOString(),
    status:          finalStatus,
    sources_checked: activeSources.length,
    items_found:     totalFound,
    items_new:       totalNew,
    items_duplicate: totalDuplicate,
    error_log:       errorLog,
  }).eq("id", runId)

  return runId
}

// ── Promote an approved scrape item into recruitments ─────────────────────────

export async function promoteToRecruitments(
  data: any,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  try {
    // Upsert organization
    const { data: org } = await supabase
      .from("organizations")
      .upsert(
        { name: data.organization_name, type: data.org_type },
        { onConflict: "name", ignoreDuplicates: false }
      )
      .select("id")
      .single()

    if (!org) return null

    // Insert recruitment
    const { data: recruitment } = await supabase
      .from("recruitments")
      .insert({
        organization_id:    org.id,
        name:               data.title,
        year:               data.year,
        notification_date:  data.notification_date ?? null,
        apply_start_date:   data.apply_start_date ?? null,
        apply_end_date:     data.apply_end_date ?? null,
        status:             deriveStatus(data.apply_start_date, data.apply_end_date),
      })
      .select("id")
      .single()

    if (!recruitment) return null

    // Insert posts
    for (const post of data.posts ?? []) {
      const { data: postRow } = await supabase
        .from("posts")
        .insert({
          recruitment_id: recruitment.id,
          post_name:      post.post_name,
          group_type:     post.group_type ?? null,
          pay_level:      post.pay_level ?? null,
          job_type:       "direct",
        })
        .select("id")
        .single()

      if (!postRow) continue

      // Age criteria
      if (post.min_age || post.max_age) {
        await supabase.from("age_criteria").insert({
          post_id:     postRow.id,
          min_age:     post.min_age ?? null,
          max_age:     post.max_age ?? null,
          cutoff_date: data.apply_end_date ?? null,
        })
      }

      // Education criteria
      if (post.education_required) {
        await supabase.from("education_criteria").insert({
          post_id:                postRow.id,
          min_qualification_level: mapEducationLevel(post.education_required),
          allowed_disciplines:     post.disciplines ? { disciplines: post.disciplines } : null,
        })
      }

      // Vacancies
      if (post.vacancies) {
        await supabase.from("vacancies").insert({
          post_id:       postRow.id,
          category:      "UR",
          vacancy_count: post.vacancies,
        })
      }
    }

    return recruitment.id
  } catch (err) {
    console.error("[runner] promoteToRecruitments failed:", err)
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRecruitmentKey(orgName: string, year: number, title: string): string {
  const org = orgName.toLowerCase().replace(/[^a-z0-9]/g, "")
  const titleWords = title.toLowerCase().split(/\s+/).slice(0, 4).join("")
  return `${org}-${year}-${titleWords}`
}

function isHighTrustSource(sourceName: string): boolean {
  const trusted = ["UPSC", "SSC", "IBPS", "RBI", "SEBI", "NABARD"]
  return trusted.some(t => sourceName.toUpperCase().includes(t))
}

function deriveStatus(startDate: string | null, endDate: string | null): string {
  const now = new Date()
  if (!startDate && !endDate) return "upcoming"
  const start = startDate ? new Date(startDate) : null
  const end   = endDate   ? new Date(endDate)   : null
  if (end && end < now)   return "closed"
  if (start && start > now) return "upcoming"
  return "open"
}

function mapEducationLevel(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("phd") || lower.includes("doctoral")) return "phd"
  if (lower.includes("post") && lower.includes("grad")) return "postgraduate"
  if (lower.includes("ca") || lower.includes("chartered")) return "professional"
  if (lower.includes("master") || lower.includes("mba") || lower.includes("m.sc")) return "postgraduate"
  if (lower.includes("bachelor") || lower.includes("b.sc") || lower.includes("b.e") || lower.includes("b.tech") || lower.includes("graduation")) return "graduation"
  if (lower.includes("diploma")) return "diploma"
  if (lower.includes("12") || lower.includes("hsc") || lower.includes("inter")) return "12th"
  if (lower.includes("10") || lower.includes("ssc") || lower.includes("matric")) return "10th"
  return "graduation"
}