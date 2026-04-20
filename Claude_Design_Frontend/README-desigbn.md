# Career Copilot — Design System

**Career Copilot** is an India-focused platform for government, PSU, banking, regulatory, and related exam aspirants (UPSC, SEBI, RBI, SSC, IBPS, NABARD, IRDAI, Railways, State PSCs).

Its core value is NOT content abundance. Its value is **recruitment intelligence and decision support**:

- personalized **eligibility matching** ("which exams am I eligible for, right now?")
- intelligent, relevant **notifications** from 500+ official bodies
- **official-source tracking** (no Telegram-forwarded PDFs)
- clear **explanation** of *why* a user is eligible or ineligible
- **study-plan continuity** with daily streaks
- **trustworthy recruitment intelligence** — auditable, deduplicated, traceable

The brand feel: **serious, credible, exam-focused, operationally reliable, information-dense where needed, premium but not flashy.** Think "mission-critical aspirant platform" — not a generic SaaS template, not a coaching-first product.

---

## Products represented

This design system covers two surfaces of the same codebase:

1. **Aspirant product** — the marketing site, auth flow, multi-step onboarding, dashboard (command center), eligibility + notifications, study plan, AI career chat, and marketplace.
2. **Admin operating system** — control surfaces for Super Admin, Operations Admin, Domain Admins (Content, Scraper/QA, Marketplace, Finance, Support). Dense workflow-first tables, review queues, scraper diagnostics, source registry, audit/event timelines.

The system is deliberately scaled to support both: a premium, trustworthy aspirant experience AND an information-dense operator console that must never feel like "edit a few fields and hope."

---

## Sources I was given

- **Codebase** — `career-copilot/` (local mount, Next.js 16 App Router + React 19 + Tailwind v4 + Supabase). Design tokens live in `career-copilot/app/globals.css`. Components live in `career-copilot/components/{dashboard, chat, marketplace, auth, onboarding, study-plan, nav, admin}`.
- **GitHub repo** — `johnefficacy-crypto/career-copilot` (mirror; default branch `master`). Same codebase.
- **No Figma file was provided.** Visual foundations are reverse-engineered from the codebase — which is fortunate because the CSS already defines a complete token system (`--gold`, `--bg-root`, `--border-md`, `--radius-xl`, etc.), type scale, component classes (`.cc-btn-primary`, `.cc-card`, `.cc-radio-pill`), and a clear voice in copy.

No logo asset was found in `public/` beyond the default Next.js placeholders — the wordmark is currently **typeset in Playfair Display, gold `#e8d5a3`**. Logo substitution is flagged in ICONOGRAPHY below.

---

## Index — what's in this folder

```
README.md                   ← you are here
SKILL.md                    ← Agent Skill wrapper (makes this portable to Claude Code)
colors_and_type.css         ← CSS variables for colors + type; import this first
fonts/                      ← Playfair Display, DM Sans, DM Mono (Google Fonts)
assets/                     ← logos, iconography, illustrations, backgrounds
preview/                    ← Design System tab cards (one HTML per concept)
ui_kits/
  aspirant/                 ← marketing + dashboard + onboarding + chat components
  admin/                    ← operator console, tables, queues, timelines, diagnostics
```

---

## CONTENT FUNDAMENTALS

### Voice & tone

The copy is **direct, calm, and operationally confident**. It respects the aspirant as a serious person making a serious decision. It does not perform hype, it does not patronise, it does not cheerlead.

Key rules (extracted from `app/page.tsx`, onboarding, dashboard, chat):

- **Address: second person, "you".** Not "users", not "aspirants" inside the UI (that word is reserved for external-facing marketing phrases like "50,000+ aspirants"). Example: *"Your age, category, education, and attempts matched against each post's exact criteria."*
- **Frame in terms of jobs to be done**, not features. Marketing copy leads with the problem ("Everything scattered across Telegram groups, in one place"), never "AI-powered platform."
- **Concrete over abstract.** Numbers are specific: "500+ bodies", "490 more", "2-minute setup", "50,000+ aspirants", "every 6 hours". Avoid "thousands", "fast", "seamless".
- **Sentence case everywhere**, including buttons, nav, table headers. ALL-CAPS is reserved for tracking-widest eyebrow labels like `EXAM TARGETS`, `MATCHED FOR YOU`, `NOTIFICATIONS`.
- **No em-dashes-for-drama.** The codebase uses the dash to set off a clarifying aside, usually once per paragraph, never decoratively.
- **Contractions are fine** ("we'll", "you're", "won't") — they keep the product from sounding like a government portal it exists to replace.
- **Deadline language is blunt.** *"Last day!"*, *"Closed"*, *"Urgent"*, *"Closing soon"*. Never *"time is running out 🏃‍♂️"*.
- **Microcopy carries the trust.** *"No credit card · Free plan forever · 2-minute setup"* under the primary CTA. *"The system runs every 6 hours"* under an empty notification feed. This is not throwaway — it's the core credibility signal.
- **Error messages are concrete and actionable.** Not *"Something went wrong."* → *"Connection lost. Please check your network and try again."*
- **Upgrade prompts name the gate explicitly.** *"AI career chat requires a Pro or Elite plan."* Never *"Unlock more →"*.

### Casing & punctuation

| Context | Style | Example |
|---|---|---|
| Page title | Sentence case | `Admin overview` |
| Section eyebrow | `UPPERCASE + letter-spacing: 0.1em` | `EXAM TARGETS` |
| Button label | Sentence case | `Create free account →` |
| Status pill | Sentence case | `Closing soon`, `Urgent`, `Done` |
| Empty state | Full sentence + period | `All caught up!` |
| Metric label | Sentence case | `Apply by 14 Oct 2026` |
| Numeric formatting | `en-IN` locale | `5,23,400 vacancies` |

### Emoji usage

Emoji **are used sparingly** in the current codebase — only in three places, always functional, never decorative:

1. **Feature grid icons** on the landing page (🔔 ✓ 📅 📚 💬 📊) — these should be replaced with proper icons in production, but the codebase uses them as placeholders.
2. **Starter prompt chips** in the AI chat (🎯 📅 📚 ⚖️ 🏛️ 📊) — functional way to visually distinguish 6 prompt suggestions.
3. **Empty-state accents** (🔔 for "no notifications") — one character, desaturated via `opacity: 0.3`.

**Emoji are NOT used**: in body copy, in admin screens, in status pills, in form labels, in nav. The design system treats emoji as a tactical fallback for missing iconography — see `ICONOGRAPHY` below for the substitution strategy. **Do not add decorative emoji.**

### The vibe

Imagine an aspirant at 11 PM checking whether SEBI Grade A just dropped. They've been burned before — the PDF was already 3 weeks old when the Telegram channel forwarded it. Career Copilot is the tab they check *first* now, because it's the one they trust. Every pixel of copy should earn that trust.

---

## VISUAL FOUNDATIONS

### The color vibe

**Dark navy-black root (`#0c0c0c` / `#0f0f0f`) with a single warm gold accent (`#e8d5a3`).** The gold is dimmed, old-paper, almost wheat — NOT the saturated yellow-gold of a fintech brand. It reads as *archival*, *trust*, *something that's been curated* — which matches the product's recruitment-intelligence thesis.

- Backgrounds are near-black but warm: `--bg-root: #0c0c0c` (landing, auth), `--bg-app: #0f0f0f` (app chrome). Two shades, deliberately close.
- Surfaces are **transparency on top of black**, never solid grey fills: `rgba(255,255,255,0.03)` for cards, `0.05` on hover. This gives the dark UI a sense of depth without needing drop shadows.
- Borders are hairlines at three strengths: `0.07` (resting), `0.12` (hover/focus), `0.20` (assertive).
- **Gold is load-bearing**, not decorative. It flags: the logo, the primary CTA, an active/tracked state, a deadline countdown that's >7 days safe, headings in Playfair. Free-plan limit walls are lit by `var(--gold-faint)` backgrounds.
- Semantic colors (`success` `#10b981`, `warning` `#f59e0b`, `danger` `#ef4444`) are used **only at 10-25% opacity on dark backgrounds** — never fully saturated. A "danger" state is red-tinted, not loud.

### Typography

Three families, **all set via `next/font`** in production, fall back to `Georgia` / `system-ui` / `monospace`:

- **Playfair Display** (serif, 400/500/600) — display/headline type. The signature of the brand. Reserved for h1/h2, metric values in cards, the wordmark. Never body text. Weight 500 is the default.
- **DM Sans** (sans, 300/400/500) — all body UI, labels, buttons, table cells. Tight letter-spacing on display sizes (`tracking-tight`). Weight 400 default; 500 for buttons/links.
- **DM Mono** (mono, 400/500) — tabular numbers (countdown timers, vacancy counts, percentages, week numbers "01/24"), exam code chips ("UPSC", "SEBI"), and step numbers in how-it-works blocks.

The contrast between Playfair's formal seriffed headings and DM Sans' clean body is the entire typographic system.

### Spacing

Tailwind's default 4px scale (`gap-1`=4px, `gap-3`=12px, `gap-5`=20px, `gap-6`=24px). Observed rhythm:

- Card internal padding: `1.25rem` (20px) for compact, `1.5rem` (24px) for standard, `2rem` (32px) for hero/auth panels.
- Vertical section rhythm on marketing pages: `py-28` (112px top/bottom between sections).
- Dashboard grid gap: `gap-5` (20px) between widgets, `gap-3` (12px) between stat cards.
- Form field vertical gap: `gap-6` (24px) between fields, `gap-1.5` (6px) between label and input.

### Radii

Rounding is **generous and consistent** — nothing sharp except inline pill borders.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `0.5rem` / 8px | small chips, inline pills |
| `--radius-md` | `0.75rem` / 12px | radio pills, inline badges |
| `--radius-lg` | `1rem` / 16px | stat cards, inline buttons |
| `--radius-xl` | `1.25rem` / 20px | **inputs, primary buttons, alerts** — the default |
| `--radius-2xl` | `1.5rem` / 24px | cards, widgets, testimonials |
| `9999px` | pills | status badges, count pills, nav links |

### Shadows & elevation

**There are effectively no drop shadows in this system.** Elevation is expressed through:

1. **Transparency layering** — `rgba(255,255,255,0.03)` surfaces on a `#0c0c0c` background already read as "floating."
2. **Border intensity** — a hover state brightens the border from `0.07` to `0.14`, which *reads* as elevation without a shadow.
3. **Backdrop blur** — the only dramatic effect, used on sticky navs: `backdrop-filter: blur(12px)` behind `rgba(15,15,15,0.85)`. This is the system's equivalent of a header shadow.

The one exception: tooltips use `box-shadow: 0 4px 20px rgba(0,0,0,0.4)` to detach from their trigger. Chat message dropdowns use the same. Admin data tables are flat.

### Borders

Always `1px solid`. Never 2px. Never dashed (except one dashed rule: progress-bar "protection pattern" on the study-plan empty state at 3% opacity, 45°, 12px period — barely visible, adds texture without noise).

### Backgrounds & texture

- **Grain.** A fine SVG noise overlay at `opacity: 0.025` is applied via `.grain::after` on marketing pages. Subtle enough that users perceive it as "film grain on a poster" rather than a pattern. This is the single distinctive texture in the brand.
- **Grid lines.** 80×80px subtle white grid at `opacity: 0.03` behind the hero. Evokes blueprint / exam-sheet precision.
- **Radial glow.** A single `600×600px` gold radial blur at `opacity: 0.04, blur(120px)` centered on the hero. One per page, never stacked.
- **No full-bleed photography, no gradient heroes, no illustrations-of-humans-pointing-at-laptops.** The background is negative space with texture. That IS the aesthetic.

### Animation & motion

Minimal, functional, never decorative.

- `fadeUp` (0.5s ease, translateY 16px→0) — runs once on auth panels and the landing hero. Respects `stagger` delays of 60ms per child for feature grids.
- `fadeIn` (0.4s ease) — used for modal/drawer appearance.
- `cc-pulse` (1.4s ease-in-out infinite) — the small dot on "Thinking…" during AI chat.
- `cc-bounce` (1.2s, staggered 180ms) — three dots for pre-first-token chat shimmer.
- Hover transitions are `0.15s` (fast, crisp). Press states use `transform: scale(0.99)` on the primary CTA.
- **No bounces. No spring physics. No page transitions. No parallax. No confetti.** The product does not celebrate itself.

### Hover, focus, press states

| State | Treatment |
|---|---|
| Hover on link | Text brightens one tier (`text-muted` → `white`) |
| Hover on card | Border `0.07 → 0.14`; sometimes background tints `gold-faint` |
| Hover on primary btn | `gold → gold-hover` (`#e8d5a3 → #f0dfa8`) |
| Focus on input | Border becomes `gold-border-md` (40% gold), background lifts to `0.05` |
| Press on primary btn | `transform: scale(0.99)` — tiny, not a bounce |
| Active nav link | Subtle background `rgba(255,255,255,0.06)` + weight 500 |
| Tracked/selected pill | `gold-faint` background + `gold-border-md` border + gold text |

### Use of transparency and blur

- **Sticky navs**: `rgba(12,12,12,0.80)` + `backdrop-filter: blur(12px)`.
- **Card surfaces**: `rgba(255,255,255,0.03)` — transparent so the grain texture bleeds through.
- **Modal overlays** (future pattern): `rgba(0,0,0,0.60)` + blur.
- Blur is ONLY used on chrome and modal overlays, never on content containers.

### Protection gradients vs capsules

The system uses **capsules (pills)** rather than protection gradients for status chips. Every status indicator is `rounded-full` (9999px) with a `1px` matching-tone border and a `10% opacity` background fill of the same hue.

### Layout rules

- Max-width containers: `max-w-6xl` (72rem / 1152px) for marketing, `max-w-7xl` (80rem / 1280px) for app dashboards, `max-w-4xl` (56rem / 896px) for focused content (how-it-works, long-form), `max-w-sm` (24rem / 384px) for auth forms.
- Dashboard is a **3-column grid with 2+1 split** on `lg:` breakpoint (`lg:col-span-2` main + 1-col sidebar); collapses to single column on mobile.
- Admin is a **fixed 224px sidebar + fluid main**, sidebar sticky to viewport height.
- Mobile breakpoint: `sm:` at 640px, primary nav collapses, stats grid becomes 2×2.

### Color vibe of imagery

No photography in the product today. If introduced, it must be: **warm-toned, archival, desaturated, grainy.** Think 1970s IIT textbook photograph, not stock-photo smiling student. Scanned newspaper clippings of old UPSC results would be perfectly on-brand.

### What a card looks like

```
┌─────────────────────────────────────────────────┐
│  EXAM TARGETS                                   │  ← uppercase eyebrow, --text-muted
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Central · 2025                            │  │  ← meta row, text-dim
│  │ RBI Grade B — Officer         [Closing    │  │  ← title (Playfair), badge right
│  │ Reserve Bank of India          soon]      │  │
│  │                                           │  │
│  │ Notified: 12 Aug  Deadline: 14 Oct        │  │
│  │ ━━━━━━━━━━━━━░░░░░░░  amber  14d left     │  │  ← progress bar + tabular countdown
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
   border: 1px solid rgba(255,255,255,0.07)
   background: rgba(255,255,255,0.03)
   border-radius: 1.5rem
   padding: 1.5rem
```

Nesting: a card contains rows. A row has its own `1px border, 0.75rem radius, 1rem padding` — but NO background (it sits on the card's tint). Two levels of nesting max.

---

## ICONOGRAPHY

The current codebase has **no icon system** — it uses emoji as placeholders. The design system standardises on **[Lucide](https://lucide.dev) via CDN** as the substitution, with the following rules:

### Primary icon system — Lucide (substituted)

**Why Lucide**: consistent 2px stroke weight, outline-style, open-source, maps one-to-one with the serious/operational feel the brand wants. It reads as a "utility" icon set, which matches Career Copilot's "mission-critical tool" positioning more than filled/colorful sets do.

**Flagged substitution** — no icon choice was made in the codebase. The founder should confirm Lucide (currently substituted) or nominate Tabler / Phosphor / Heroicons-outline. All of these would work with the design system; I've locked stroke-weight to `1.75` to match the "thin, considered, archival" feel.

Usage rules:

- Stroke: `1.75px`, never filled.
- Size: `16px` (inline), `20px` (nav), `24px` (standalone / empty-state).
- Color: **inherit from text** — an icon is never more vivid than the label next to it. An icon in a `text-muted` element is `rgba(255,255,255,0.40)`.
- A CSS helper class `.cc-icon` is provided in `colors_and_type.css`.

### Mapping — replace the current emoji placeholders

| Current emoji | Lucide replacement | Context |
|---|---|---|
| 🔔 | `bell` | Notifications widget |
| ✓ | `check-circle` | Eligibility engine, "Tracking" pill |
| 📅 | `calendar` | Study plan, deadlines |
| 📚 | `book-open` | Marketplace courses |
| 💬 | `message-square` | Forum, chat |
| 📊 | `bar-chart-3` | Progress, stats |
| 🎯 | `target` | Profile target exam, chat starter |
| ⚖️ | `scale` | "Compare exams" in chat |
| 🏛️ | `landmark` | State/Central agencies |
| ★ / ☆ | `star` (filled / outline) | Track/untrack recruitment |
| ■ | `square` | "Stop" streaming in chat |
| 🔄 | `refresh-cw` | Scraper runs |
| ⌘ | `layout-dashboard` | Admin overview |

### Unicode chars used as icons

The codebase intentionally uses a few unicode glyphs in contexts where Lucide would feel heavy:

- `→` and `←` for inline link directionality (e.g., `Sign in →`, `← Back`).
- `·` (middle-dot, U+00B7) as an inline separator between meta items (*"Central · 2025 · OBC"*). This IS the system's pattern for separating metadata — use it consistently.
- `↑` on the chat "Send ↑" button (matches the convention users know from ChatGPT).
- `▾` for collapsible chevrons on week-cards (will be swapped for Lucide `chevron-down` when icons ship).

**Do not introduce new unicode-as-icon patterns.** If you need a new glyph, use Lucide.

### Logos & brand marks

**No logo file exists in the repository.** The wordmark is currently pure type: `Career Copilot` in Playfair Display 500, gold `#e8d5a3`, next to an `Admin` micro-badge in admin shells.

I've created two assets under `assets/`:

- `assets/logo-wordmark.svg` — the type-set wordmark, standalone SVG.
- `assets/logo-mark.svg` — a CC monogram in a rounded square (a minimal mark for favicon / mobile app icon / compact nav). **Flagged**: this is a reasonable placeholder, not a designed logo — founder should confirm or commission.

### Full-bleed imagery

Not used today. If introduced, apply the "warm-toned archival grain" rule above.

### Icons to avoid

- 3D/glyph-bubble icons (Fluent UI, Microsoft Office).
- Duotone/filled pairs that require color.
- Anything with embedded color (flat-design colored SVGs).
- Emoji in any non-placeholder context.
