# Admin UI Kit

Recreates the operator console (`app/admin/`): Super Admin, Operations, Scraper QA, Source Registry, Review queues.

Open `index.html` for an interactive click-through.

## Components
- `AdminShell.jsx`       — sticky sidebar + content area (copies `app/admin/layout.tsx` exactly)
- `AdminOverview.jsx`    — stats grid, quick-nav cards, scraper-status strip
- `RecruitmentsTable.jsx`— dense data table with inline filters and status pills
- `ScrapeDashboard.jsx`  — scrape-runs list + pending review queue with approve/reject
- `SourceRegistry.jsx`   — source list + inspector panel (fetch, parse, diagnose)

All components use tokens from `../../colors_and_type.css` via `../../ui_kits/admin/kit.css`.
