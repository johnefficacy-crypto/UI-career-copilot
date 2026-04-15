-- Migration 008: Add top Indian govt-job aggregator sources
-- These 5 sites collectively cover 90%+ of central + state government job
-- notifications. Scraping them with RSS/HTML + direct extraction gives better
-- coverage than scraping 200+ individual official sites and costs far less.
--
-- Strategy:
--   Tier 1 aggregators (RSS) → direct extraction, zero LLM cost
--   Tier 1 aggregators (HTML) → 1 LLM call/day per site (ETag cached)
--   Official sources continue to be scraped for primary verification
--
-- At 5 aggregators × 1 LLM call/day = ~5 Claude calls/day total
-- vs 500 official sites × 1 call/day = 500 calls/day
-- Cost reduction: ~99% for equivalent coverage.

INSERT INTO public.source_registry (
  source_name, source_type, category, official_url,
  notification_url, rss_url, adapter_type,
  scrape_interval_hours, tier, trust_score, anti_bot_risk,
  is_active, requires_playwright,
  parser_config, notes
) VALUES

-- Employment News (official GOI — published weekly, covers all central govt vacancies)
(
  'Employment News (GOI)',
  'aggregator', 'central_aggregator',
  'https://www.employmentnews.gov.in',
  'https://www.employmentnews.gov.in/Main/Rss.aspx',
  'https://www.employmentnews.gov.in/Main/Rss.aspx',
  'rss', 6, 1, 0.95, 'none', true, false,
  '{}',
  'Official GOI weekly. RSS feed. Covers all central govt notifications. Zero LLM needed with direct extraction.'
),

-- FreeJobAlert (largest Indian govt job aggregator — 1M+ daily users)
(
  'FreeJobAlert',
  'aggregator', 'central_aggregator',
  'https://www.freejobalert.com',
  'https://www.freejobalert.com/latest-notifications/',
  'https://www.freejobalert.com/feed/',
  'rss', 4, 1, 0.85, 'low', true, false,
  '{}',
  'Largest govt job aggregator India. RSS feed available. Covers central + state. ~500 new notifications/month.'
),

-- Sarkari Result (high-traffic aggregator, strong central govt coverage)
(
  'Sarkari Result',
  'aggregator', 'central_aggregator',
  'https://www.sarkariresult.com',
  'https://www.sarkariresult.com/latestjob/',
  NULL,
  'html', 6, 1, 0.80, 'medium', true, false,
  '{"items_selector": ".TableRow", "title_selector": "a", "link_selector": "a"}',
  'High-traffic aggregator. No RSS — HTML scrape. ETag cached. 1 LLM call per changed page.'
),

-- Rojgar Samachar (state-level aggregator, strong Hindi belt + state PSC coverage)
(
  'Rojgar Samachar',
  'aggregator', 'state_aggregator',
  'https://rojgarsamachar.gov.in',
  'https://rojgarsamachar.gov.in/rss.xml',
  'https://rojgarsamachar.gov.in/rss.xml',
  'rss', 12, 2, 0.80, 'none', true, false,
  '{}',
  'Official state-level employment newspaper. Good Hindi-belt + state PSC coverage.'
),

-- IBPS CRP Notifications (centralised banking recruitment — covers all PSBs)
(
  'IBPS Official Notifications',
  'banking', 'central_banking',
  'https://www.ibps.in',
  'https://www.ibps.in/crp-notifications/',
  NULL,
  'html', 12, 1, 0.90, 'low', true, false,
  '{}',
  'All PSB recruitment via CRP. HTML scrape. Tier-1 authoritative source.'
)

ON CONFLICT (source_name) DO NOTHING;

COMMENT ON TABLE public.source_registry IS
  'Master source registry. Tier-1 aggregators (Employment News, FreeJobAlert) provide
   90%+ coverage at minimal API cost. Official sources provide authoritative verification.';
