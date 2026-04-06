// types/scraping.ts
// Career Copilot — Phase 10: Notification Scraping types

export type ScrapeStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'duplicate'
export type ScrapeRunStatus = 'running' | 'completed' | 'failed' | 'partial'
export type AlertType = 'new_match' | 'deadline_3day' | 'deadline_1day' | 'status_change'

// ── Scrape Source ─────────────────────────────────────────────
export type ScrapeSource = {
  id: string
  name: string
  base_url: string
  notification_path: string | null
  org_type: string
  state: string | null
  is_active: boolean
  last_scraped_at: string | null
  scrape_interval_hours: number
  selector_config: Record<string, string>
  created_at: string
}

// ── Extracted recruitment data (AI-parsed from raw HTML/PDF) ──
export type ExtractedRecruitment = {
  title: string                    // e.g. "SEBI Officer Grade A 2025"
  organization_name: string
  org_type: string
  notification_date: string | null // ISO date
  apply_start_date: string | null
  apply_end_date: string | null
  total_vacancies: number | null
  posts: ExtractedPost[]
  source_pdf_url: string | null
  official_notification_url: string
  year: number
}

export type ExtractedPost = {
  post_name: string
  group_type: string | null
  pay_level: string | null
  vacancies: number | null
  min_age: number | null
  max_age: number | null
  education_required: string | null
  disciplines: string[] | null
}

// ── Scrape Queue item ─────────────────────────────────────────
export type ScrapeQueueItem = {
  id: string
  source_url: string
  source_name: string
  raw_html: string | null
  extracted_data: ExtractedRecruitment
  confidence_score: number
  status: ScrapeStatus
  scrape_run_id: string | null
  duplicate_of: string | null
  reviewer_id: string | null
  reviewer_notes: string | null
  scraped_at: string
  reviewed_at: string | null
  // Joined
  reviewer?: { full_name: string | null } | null
}

// ── Scrape Run ────────────────────────────────────────────────
export type ScrapeRun = {
  id: string
  started_at: string
  finished_at: string | null
  status: ScrapeRunStatus
  sources_checked: number
  items_found: number
  items_new: number
  items_duplicate: number
  error_log: { source: string; error: string; at: string }[]
  triggered_by: 'scheduled' | 'manual' | 'admin'
  triggered_by_user: string | null
}

// ── Notification Alert ────────────────────────────────────────
export type NotificationAlert = {
  id: string
  user_id: string
  recruitment_id: string
  alert_type: AlertType
  is_read: boolean
  sent_at: string
  read_at: string | null
  // Joined
  recruitment?: {
    name: string
    apply_end_date: string | null
    status: string
    organization?: { name: string }
  }
}

// ── Admin review decision ─────────────────────────────────────
export type ReviewDecision = {
  queueItemId: string
  action: 'approve' | 'reject' | 'mark_duplicate'
  notes?: string
  duplicateOfId?: string      // recruitment_id if marking duplicate
}

// ── Scraper result (returned from edge function / scraper util) ─
export type ScrapeResult = {
  source: string
  url: string
  itemsFound: number
  itemsQueued: number
  itemsDuplicate: number
  errors: string[]
  durationMs: number
}