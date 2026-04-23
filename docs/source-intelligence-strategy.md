# Source Intelligence Strategy Notes

_Last updated: 2026-04-23_

## Purpose
This note captures source-intelligence decisions that should guide the scraper, eligibility engine, and notification pipeline.

It is intended to be updated whenever we learn something important about:
- source discovery and source quality,
- aggregator behavior,
- RSS / JSON / WordPress endpoints,
- official datasets useful for product strategy,
- qualification-demand patterns,
- changes to trust scoring or promotion rules.

---

## 1. Source Taxonomy

### A. Canonical / Source-of-Truth sources
These are the sources that should be treated as authoritative for user-facing eligibility and alerts.

Examples:
- official recruitment pages
- official vacancy pages
- official career pages
- official PDF notifications / bulletins
- official RSS feeds published by the issuing body
- official JSON APIs published by the issuing body

Rules:
- use these as primary inputs for `source_registry`
- use these for promotion into canonical `recruitments`
- use these for eligibility-triggering and user notifications whenever possible
- preserve manual verification before large bulk registry updates

### B. Secondary discovery / aggregator sources
These sources are useful for finding that a new notification may exist, but are not the preferred source of truth.

Examples:
- GovtJobsBlog
- Sarkari Result
- Free Job Alert
- similar job aggregation blogs / portals / newspaper mirrors

Rules:
- use for discovery, cross-checking, source discovery, and missed-notification detection
- do NOT treat as canonical if an official source is available
- for user-facing alerts, always try to resolve the item to the official URL / official PDF / official notice page first
- lower trust score than official sources
- acceptable to keep as `aggregator` / secondary sources in the registry

### C. Research / enrichment sources
These are official or semi-official data resources useful for strategy, segmentation, analytics, source discovery, or market understanding, but not direct recruitment-notification sources.

Examples:
- OGD India / data.gov.in dataset catalogs and APIs
- service directories
- historical vacancy datasets
- employment statistics snapshots

Rules:
- do not feed directly into the recruitment promotion pipeline
- use for dashboards, TAM estimates, qualification segmentation, and strategy
- can inform prioritization of onboarding, eligibility coverage, and marketplace cohorts

---

## 2. RSS / JSON Strategy

### Why RSS matters for Career Copilot
RSS is highly useful when available because it usually provides:
- faster polling,
- cheaper change detection,
- lower anti-bot risk,
- smaller payloads,
- better fit for ETag / Last-Modified caching,
- lower LLM cost than full HTML scraping.

### Practical use
If a site exposes:
- RSS / Atom feed,
- JSON API,
- WordPress REST API,
then prefer those over raw HTML where feasible.

But note:
- RSS is best for discovery and incremental updates
- RSS usually does NOT contain full post-wise eligibility detail
- full HTML / PDF follow-up is often still required

### Product rule
Use RSS / JSON to detect and shortlist likely new items, then enrich via official detail page / PDF before promotion when richer data is needed.

---

## 3. GovtJobsBlog — Working Interpretation

### Observed technical signals
From the page head of `https://www.govtjobsblog.in/govt-jobs/`, the site exposes:
- main RSS feed: `/feed/`
- category RSS feed: `/govt-jobs/feed/`
- WordPress API root: `/wp-json/`
- WordPress category JSON metadata

### Strategic interpretation
GovtJobsBlog appears to be a WordPress-based aggregator / publisher, not an official issuing authority.

### How to use it
Use GovtJobsBlog as:
- a secondary discovery source,
- a missed-notification detector,
- a source-discovery aid,
- a cross-checking input for coverage gaps.

Do NOT use it as the preferred canonical source when the official page / official PDF exists.

### Registry guidance
Suggested posture:
- `source_type`: aggregator / secondary
- `adapter_type`: prefer `rss` or `json` where stable
- trust score: low-to-medium relative to official sources
- promotion policy: resolve to official source before canonical promotion when possible

### Notification / eligibility implication
Items discovered from GovtJobsBlog should bias toward:
- `pending` or review-first workflows if official source is not yet resolved,
- lower confidence promotion,
- explicit official-link validation before auto-alerting users.

---

## 4. Sarkari Result (sarkariresult.com.cm) — Working Interpretation

### Observed technical signals
From the page head of `https://sarkariresult.com.cm/latest-jobs/`, the site exposes:
- main RSS feed: `/feed/`
- comments feed: `/comments/feed/`
- WordPress API root: `/wp-json/`
- page JSON endpoint via WordPress REST metadata
- Yoast/WordPress publishing structure

### Strategic interpretation
Sarkari Result appears to be a WordPress-based aggregator / publisher, not an official issuing authority.

### How to use it
Use Sarkari Result as:
- a secondary discovery source,
- a coverage-gap detector,
- a missed-notification detector,
- a source-discovery aid.

Do NOT use it as canonical truth when an official source is available.

### Registry guidance
Suggested posture:
- `source_type`: aggregator / secondary
- `adapter_type`: prefer `rss` first, `json` second, `html` fallback
- trust score: low-to-medium relative to official sources
- promotion policy: resolve to official source before canonical promotion whenever possible

### Notification / eligibility implication
Items discovered from Sarkari Result should bias toward:
- review-first or pending workflows,
- lower-confidence promotion,
- official-link resolution before auto-alert fanout,
- use as discovery, not final truth.

---

## 5. OGD India / data.gov.in — Working Interpretation

### What it is
OGD India and `data.gov.in` are official data access/catalog platforms.

### Why it is relevant
Useful for:
- official public datasets,
- public APIs,
- labor / vacancy / qualification / employment related snapshots,
- strategic analysis and product planning.

### Why it is NOT a direct recruitment source by default
Most OGD pages describe datasets, APIs, or service catalogs — not live vacancy notices.

### Product posture
Treat OGD India as:
- research / enrichment source,
- strategy input,
- dataset discovery surface,
- not a normal recruitment `source_registry` item unless a specific dataset/API clearly maps to live openings.

---

## 6. Official Qualification Distribution Snapshot (Strategic Reference)

### Official snapshot captured
Data source: official API-derived qualification summary
Data upto: `2023-09-30`
Grand total vacancies: `1,73,42,279`

| Minimum Qualification | Total Vacancies |
|---|---:|
| 10th Pass | 18,87,511 |
| 11th | 2,182 |
| 12th Pass | 69,64,797 |
| Diploma After 10th | 4,06,920 |
| Diploma After 12th | 6,09,719 |
| Graduate | 48,75,923 |
| ITI | 2,22,396 |
| No Schooling | 7,44,803 |
| NotSpecified | 1,96,856 |
| PG Diploma | 5,641 |
| PHD / Super Specialist | 34,736 |
| Post Graduate | 5,46,575 |
| Upto 8th | 1,46,991 |
| Upto 9th | 6,97,229 |

### Key strategic takeaways
- `12th Pass` is the largest single bucket.
- `Graduate` is also a very large bucket.
- The opportunity pool is NOT only graduate/regulatory/banking aspirants.
- At-or-below-12th cohorts represent a very large share of the vacancy universe.
- Diploma / ITI / technical vocational routes are important enough to deserve first-class modeling.

### Product implications
Career Copilot should support qualification-first filtering and strong cohort segmentation across:
- no schooling / upto 8th / upto 9th,
- 10th pass,
- 12th pass,
- ITI,
- diploma after 10th,
- diploma after 12th,
- graduate,
- post-graduate,
- advanced / specialist qualifications.

### Eligibility implications
The eligibility engine should not assume a graduate-first world.
It must model qualification ladders explicitly and consistently.

### Marketplace / coaching implications
The platform should consider separate growth tracks for:
- school-level and clerical job aspirants,
- 12th-pass candidates,
- ITI / diploma technical candidates,
- graduate / banking / regulator / UPSC aspirants.

---

## 7. Strategy Update for Scraper + Eligibility + Notification Engine

### Scraper strategy
- keep official sources canonical,
- use aggregators for discovery and gap-detection,
- prefer RSS / JSON over generic HTML when available,
- use HTML / PDF enrichment to fill missing eligibility details,
- retain manual review for low-confidence or aggregator-sourced discoveries.

### Eligibility strategy
- expand onboarding and profile fields around qualification ladders,
- model non-graduate cohorts explicitly,
- treat qualification as a primary routing dimension,
- use strategic datasets to decide which cohorts deserve earliest depth.

### Notification strategy
- alert users from canonical official sources whenever possible,
- avoid high-confidence user alerts based only on aggregator text,
- allow aggregator-discovered notices to enter review / pending states,
- resolve official URL / PDF before fanout when feasible.

---

## 8. Operating Rule for Future Updates

Whenever a new source-learning is found, capture:
1. what the source technically exposes (HTML / RSS / JSON / PDF / WordPress / API),
2. whether it is official, secondary, or research-only,
3. whether it can be canonical,
4. how it should affect trust score / adapter choice / promotion policy,
5. whether it changes eligibility or notification strategy.

This file should evolve as the source strategy evolves.
