# AppRadar Design System V2: Light, Dark and System Appearance

Status: **COMPLETE. Design System V2 approved by the owner and validated with the full quality gate (§15).**
Updated 27 November 2026.
Statuses used: `APPROVED` (owner decision recorded) · `PROPOSED` · `PENDING OWNER APPROVAL` · `DEFERRED` · `SUPERSEDED`.

## 1. Purpose and design direction

**Owner clarification (27 Nov 2026, `APPROVED`):** Dashboard 3 ([21st.dev listing](https://21st.dev/@shaban/templates/dashboard-3), [live preview](https://efferd.com/view/dashboard-3)) was shared for its **dark visual appearance only**. This is a **visual restyle, not a product redesign**.

**Direction:**
- **Light, Dark and System appearance** (owner, 27 Nov 2026, `APPROVED`). Dark is the default for new users. The earlier "dark-only, no switcher" rule is `SUPERSEDED` (see §3).
- Dark: near-black neutral surfaces, subtle surface separation, restrained borders and shadows.
- Neutral (light grey) primary actions.
- High-contrast type in Inter.
- Compact analytics-SaaS feel.
- **Restrained colour accents** (owner refinement, 27 Nov 2026, `APPROVED` as direction):
  - semantic colour for positive, negative and warning states
  - tinted dark badges
  - per-app monogram tones
  - store indicators
  - a categorical chart palette
  - a blue focus and active accent

  No gradients, glows or rainbow interfaces. The earlier grayscale-only palette is `SUPERSEDED`.

**Unchanged:**
- screen contents, information architecture, navigation structure and workflows
- metrics, Dashboard sections and order, filters and sorting
- ranking calculations, market indicators, coverage and provenance display
- authentication, database, providers and APIs

**Superseded:** the earlier version of this document (option B "layout patterns" with the light Modern Minimal palette, a "no dark mode" rule, and a structural Phase 1). Those structural proposals are kept in §12 as `DEFERRED`.

## 2. Sources and licensing

| Source | Use | Status |
|---|---|---|
| Dashboard 3 (Efferd / 21st.dev) | Visual reference only: near-black neutrals, quiet borders, light-grey primary | **No template code installed or copied.** Efferd lists it as a free block; its [licence](https://efferd.com/license) allows commercial use but bans redistribution as a kit. Template source and 21st.dev template terms **not verified**. Not needed while nothing is copied |
| Modern Minimal theme (21st.dev) | Light tokens still used by landing and auth pages | Theme-licence confirmation unresolved (see `LANDING_PAGE.md` §12) |
| shadcn/ui (MIT); 21st.dev `stat-card`, `bar-chart`, `partition-bar` (MIT per listing) | Existing components, unchanged | Recorded in source headers |
| lucide-react (ISC) | Icons | Existing dependency |

## 3. Appearance modes and scope

### 3.1 Behaviour

| Item | Behaviour |
|---|---|
| Modes | **Light**, **Dark**, **System** (follows the OS `prefers-color-scheme`, including live changes) |
| Default | Dark: no stored preference, an invalid stored value, or unavailable storage |
| Persistence | `localStorage["appradar-theme"]` in this browser only. No cookie, account field, database or API |
| Controls | Header: compact icon group (Sun / Moon / Monitor, each with an accessible name and `aria-pressed`). Account › **Appearance** card: the same control with labels. Both read one store, so they always agree; other tabs update through the `storage` event |
| Pre-paint | `ThemeScript` (`src/components/theme-script.tsx`) emits `THEME_INIT_SCRIPT` into `<head>` via `useServerInsertedHTML`. It sets `<html data-app-theme="light|dark">` before first paint on every hard load or refresh. The attribute persists across client navigations |
| Hydration | `<html>` renders `data-app-theme="dark"` (the default) and carries `suppressHydrationWarning`. Per the Next.js guide *Preventing flash before hydration*, that attribute is the one value the pre-paint script deliberately changes. It covers only `<html>`'s own attributes; all children are still checked. The controls use `useSyncExternalStore` with a server snapshot, so they never mismatch. Only their pressed state can update right after hydration |
| No JavaScript | The page renders with the server default (Dark) |
| CSP | Existing `script-src 'self' 'unsafe-inline'` permits the inline script; no header change |

**Code:**
- `src/lib/ui/theme.ts`: types, constants, parse/resolve, the init script.
- `src/lib/ui/use-theme.ts`: client store; `setThemePreference`, `useThemePreference`.
- `src/components/theme-selector.tsx`, `appearance-card.tsx`, `theme-script.tsx`.
- `layout.tsx`, `shell.tsx` (header placement; scrim now `bg-black/40` for both themes) and `account/page.tsx` (Appearance card in both the signed-in and demo branches).

### 3.2 Scope (landing and auth stay light)

| Selector in `globals.css` | Purpose |
|---|---|
| `:root` | Modern Minimal light tokens (landing, auth, and the base for the light app) |
| `:root:has(.product-shell)` | Light **application** refinements (§4.1) |
| `:root[data-app-theme="dark"]:has(.product-shell)` | Dark application palette (§4.2) |
| `:root:has(.product-shell) …` in `@layer components` | Theme-aware component rules that read tokens only (buttons, badges, monograms, store icons, nav, tables, controls) |

`.product-shell` is rendered only by `Shell` for product routes; `Shell` returns early for landing and chromeless auth paths. So a stored Dark preference never changes `/en`, `/tr` or `/login`. Verified: white body, `--primary #2563eb`, `color-scheme: light`.

## 4. Semantic colour palettes

### 4.1 Light application palette

The Modern Minimal tokens, plus these application-scoped refinements. Landing keeps the originals.

| Token | Light app value | Note |
|---|---|---|
| `--muted-foreground` | `#5b6472` | Deeper than landing `#6b7280`, so secondary text on tinted banners stays ≥4.5:1 |
| `--success` / `--warning` / `--destructive` | `#065f46` / `#92400e` / `#b91c1c` | Text on their own 8–14% tints ≥4.5:1 (previously 4.35–4.49:1) |
| `--info` | `#2563eb` | Active nav edge, selected tab, link hover |
| `--input` / `--input-hover` | `#d1d5db` / `#9ca3af` | Control borders |
| `--table-head` / `--table-head-foreground` | `#f9fafb` / `#4b5563` | Table header |
| `--tone-*` | 800-step: blue `#1e40af`, indigo `#3730a3`, violet `#5b21b6`, teal `#115e59`, emerald `#065f46`, amber `#92400e`, orange `#9a3412`, pink `#9d174d`, coral `#9f1239`, slate `#334155` | Monogram letters on 18% tints ≥4.5:1 |
| `--chart-1…5` | `#2563eb` blue · `#7c3aed` violet · `#0d9488` teal · `#db2777` pink · `#64748b` slate | Same roles as dark (App Store = 1, Google Play = 3); each ≥3:1 on white |
| `--ring` | `#3b82f6` (unchanged) | 3.7:1 on white |

### 4.2 Dark application palette

Contrast ratios are measured against `--card` `#111113` unless noted.

| Token | Value | Role / contrast |
|---|---|---|
| `--background` | `#09090b` | Page |
| `--sidebar` | `#0c0c0e` | Sidebar surface |
| `--card`, `--popover` | `#111113` | Cards, KPI groups, panels |
| `--muted` | `#18181b` | Subtle fills, table header rows |
| `--secondary`, `--sidebar-accent` | `#1c1c1f` | Secondary surfaces, sidebar hover/active |
| `--accent` | `#232326` | Selected/hover, monogram fallback |
| `--border` | `#27272a` | Card and divider lines |
| `--input` | `#3f3f46` | Input, select and search borders (stronger than card borders) |
| `--sidebar-border` | `#1f1f23` | Quieter sidebar edge |
| `--foreground` / `--card-foreground` | `#fafafa` | Text, 17.9:1 |
| `--muted-foreground` | `#a1a1aa` | Secondary text, 7.3:1 |
| `--sidebar-foreground` | `#e4e4e7` | Sidebar text |
| `--primary` / `--primary-foreground` | `#e4e4e7` / `#09090b` | Neutral primary action, ~15:1 label |
| `--ring`, `--sidebar-ring`, `--info` | `#60a5fa` | Focus ring, active nav indicator, link hover, selected tab; 7.7:1 against `--background` |
| `--success` | `#34d399` | Free, positive, success; 9.6:1 |
| `--warning`, `--rating` | `#fbbf24` | Warning, stale, demo, rating stars; 10.4:1 |
| `--destructive` | `#f87171` | Negative and destructive; 6.6:1 |
| `--chart-1` | `#60a5fa` blue | Primary series, solid bars, App Store |
| `--chart-2` | `#a78bfa` violet | Further series |
| `--chart-3` | `#2dd4bf` teal | Second partition, Google Play |
| `--chart-4` | `#f472b6` pink | Further series |
| `--chart-5` | `#94a3b8` slate | Third overlay series / other |
| `--chart-track` | `#27272a` | Bar and partition tracks |
| `--tone-*` | blue `#60a5fa`, indigo `#818cf8`, violet `#a78bfa`, teal `#2dd4bf`, emerald `#34d399`, amber `#fbbf24`, orange `#fb923c`, pink `#f472b6`, coral `#fb7185`, slate `#94a3b8` | Non-semantic accents: monogram fallbacks and categories; all 6–10:1 on `--card` |

Every chart colour is at least 3:1 on cards. Series used together (1/3 partitions; 1/3/5 overlays) differ in hue **and** lightness.

**Tinted badge rule:** background `color-mix(tone 14%, transparent)`, 1 px tone outline at 30%, tone-coloured text. Never pale light-mode backgrounds.

Starting values from the owner brief were kept except:
- `--accent` and `--input` are raised for visible hover and borders.
- `--warning` (`#fbbf24`) is added.
- The focus ring moved from grey to blue for clearer focus.

The light tokens in `:root` are unchanged.

## 5. Typography, spacing and layout

All unchanged:
- **Type:** Inter (`--font-sans`) with `tabular-nums` for numbers. Existing sizes and weights.
- **Spacing:** existing shell padding (16/24/32 px), card radius, grid and breakpoints (`lg` 1024 px sidebar switch).
- **Layout:** no density changes in this phase.

## 6. Shell, sidebar and header

Visual changes come from tokens only:
- **Sidebar:** `--sidebar` surface with a quiet border.
- **Header:** translucent `--background` with blur.
- **Brand mark:** light square with a dark icon.
- **Demo badge:** amber.
- **Mobile navigation scrim:** `bg-foreground/20` → `bg-background/70`, so the overlay dims rather than lightens in the dark theme (`shell.tsx`). The navigation structure is unchanged.

## 7. Buttons, badges and app icons

- **`ui/button`:** still uses the legacy `button-*` classes. Inside the dark shell only, `globals.css` `@layer components` overrides them:
  - `button-primary`: light grey with dark label; hover at 88%.
  - `button-outline`: card surface, foreground text; hover on `--accent`.
  - `button-ghost`: muted text; hover on `--accent`.

  Light pages keep the existing button styles.
- **Skip link:** text uses `--background` in the dark shell, because white on the `--foreground` background would be invisible.
- **Status, change and freshness badges:** unchanged components; they now read the dark tokens (warning amber, success green, destructive red, muted greys).
- **App monogram fallbacks** (synthetic data, or store media withheld by flags):
  - Tinted dark tiles: 18% tone over `--card`, tone letter, 32% tone outline.
  - The tone is chosen deterministically per app (`monogramTone(store:storeAppId)` in `catalog-mapping.ts`), so a list varies while each app keeps its colour. Previously every app on one store shared a colour.
  - Real store icons (`<img>`) and media eligibility/authorization flags are unchanged.
- **Free badge** (`.ed-badge-free`): it mixed emerald into `white`, giving a pale background with light-green text. Now tinted emerald on dark (fixed at source; Explorer only renders in the dark shell).
- **Bordered `<button>`s:** the base `button{border:0}` reset made `<button class="border">` borders use `currentColor` (near-white on dark; dark grey on light pages before). The dark shell restores `--border`; explicit utility border colours still win.
- **Store indicators:** Apple icon `--chart-1` (blue), Play icon `--chart-3` (teal). The store name text is always shown.
- **Hierarchy:**
  - Active nav: `--sidebar-accent` background, 2 px blue inset edge, blue icon.
  - Table headers: `#141416` with `#b4b4bd` text.
  - Row hover: 3.5% foreground tint.
  - Selected segmented controls: `--accent` with `--input` outline.
  - Selected detail tab: blue underline.
  - Filters, selects and search: `--input` border, `#52525b` on hover.
  - Link and app-name hover: blue.
  - Disabled controls keep their existing opacity rule.
- **App Details separator dot:** `--border` (1.3:1) changed to `--muted-foreground`.

### 7.1 Select dropdowns (presentation rule)

- **Root cause:** product selects used the native arrow (`appearance:auto`), which the browser draws at a fixed inset inside an 8–10px padding. The chevron sat about 4–8px from the border. The Columns control (a `<summary>` with a 14px lucide chevron) sits about 11px in.
- **Rule:** every bordered product select uses `appearance:none`, a 14px chevron drawn **12px from the right edge**, and **30px right padding** so text never meets the chevron. Height, typography, radius and native keyboard/screen-reader behaviour are unchanged.
- **Chevron colour:** the token `--select-chevron` (an SVG of the lucide chevron-down path), stroked `#5b6472` in light and `#a1a1aa` in dark.
- **Where it is set:**
  - `globals.css` (scoped to `.product-shell`): `.ed-filters`, `.ed-sort`, `.product-filter-row`, `.product-sort`, `.product-chart-toolbar`, `.product-research-toolbar`, `.product-series-select` selects, plus any `select.border` (Tailwind-styled selects).
  - Padding in the sources that sit outside the layer: `explorer-details.css` (unlayered) and the shared `selectClass` / Dashboard series select (`pr-[30px]`).
- **Excluded:** borderless country and context pickers keep their own icon.
- **Explorer toolbar:** the search field's flex basis changed from 240 to 200px. Before, it had only 3px of slack at 1440px, and the 18px the fix added would have wrapped the toolbar. The arrangement is unchanged and search still grows to fill the space.

### 7.2 Metric freshness in data tables (presentation rule)

- **Tables** use `FieldValue … compact`:
  - Explorer: rating, rating count, price, installs.
  - Markets: leading apps.
  - Watchlist.
  - Compare.
  - Opportunities: supporting fact.
- **Compact cell anatomy:** the value plus a fixed **24px indicator slot**:
  - amber **clock** = stale
  - muted **help** icon = freshness unknown, or no field provenance
  - empty slot = current, with the observation time still in the `title`

  The slot is always reserved, so values align identically across rows (verified: equal right edges in every row) and equivalent rows share one height. The repeated "Stale · date" and "Freshness unknown" second lines are gone.
- **Indicator** (`FreshnessHint`, `src/components/core/freshness-hint.tsx`): a real `<button>` whose accessible name is the status, e.g. "Stale · observed Nov 22, 2026" or "Freshness unknown". It is not colour-only: different icon shapes and the accessible name carry the meaning.
  - **Tooltip:** `role="tooltip"`, linked by `aria-describedby`. Shows the exact UTC field observation time and "Listing checks do not refresh retained metrics".
  - **Opens on:** hover, keyboard focus, tap.
  - **Closes on:** Escape, blur, outside tap, scroll, resize. Stays open while hovered (WCAG 1.4.13).
  - **Positioning:** fixed, so the table's scroll container never clips it.
- **Unchanged:** per-field freshness semantics (no row-level merge), thresholds, timestamps, listing-level freshness beneath the app name, and unavailable values shown as text.
- **App Details and Dashboard cards** keep the existing inline labels (default `FieldValue`), as requested.
- No tooltip existed in the codebase (the sidebar's shadcn Tooltip had been removed), so this small focused component was added. No dependency.

## 8. Charts

- Components are unchanged: `bar-chart`, `PartitionBar`, `HistoryChart`, `OverlayChart`, `RankSparkline`, `Sparkline`.
- They take the neutral grey scale from tokens.
- Animation stays off. Gaps, series separation and data-table disclosures are unchanged.

## 9. Empty, loading and error states

Existing `ui/empty`, `ui/skeleton`, `CatalogState` and `ReadNotice` inherit the dark tokens. No copy or behaviour changes.

## 10. Accessibility requirements (retained)

- WCAG 2.2 AA text contrast; non-text UI and chart marks at least 3:1.
- A visible focus indicator on every control. Native outline uses `--ring`; shadcn sidebar items use `ring-sidebar-ring`.
- Status is never colour-only. Existing badge text is retained.
- `prefers-reduced-motion` global rule retained; charts are not animated.
- No horizontal page overflow at 320 px and up.

## 11. Data presentation rules (retained, unchanged)

Visual restyling must not remove or obscure any of:
- sample sizes and denominators
- source and observation context
- coverage and stale warnings
- missing and withheld values ("unavailable", "insufficient data"; never 0)
- historical series boundaries

Change badges appear only for eligible comparable observations, under the existing rules in `ranking.ts` and spec §6.2.

## 12. Structural proposals (`DEFERRED`, separate approval needed)

**Not implemented.** Carried over from the superseded plan and not part of Design System V2:
- H2 section headings
- breadcrumb parent level for App Details
- card-header action slot
- provenance summarisation on Markets and Opportunities
- shared table container or `DataTable` wrapper
- sticky mobile table columns
- 12 px minimum text cleanup of legacy CSS
- retiring legacy violet values on light pages
- removing unused legacy screens (`src/components/explorer.tsx`, `app-detail.tsx`)

## 13. Reference implementation and validation (27 Nov 2026)

**Changed files:**
- `src/app/globals.css`: dark token block plus the scoped component overrides (buttons, skip link, monogram fallback).
- `src/components/shell.tsx`: one class change on the mobile scrim.
- This document.

**How it was checked:**
- **Environment:** development demo mode with synthetic data only. Demo mode was enabled by a process-only environment variable; `.env.local` was not changed, and normal mode was restored afterwards.
- **Dashboard at 1440, 768, 390 and 320 px:**
  - no horizontal overflow
  - mobile navigation sheet opens dark and closes with Escape
  - sidebar keyboard focus ring visible
  - content, section order, metrics, filters and badges unchanged
- **Contrast:** automated audit of every visible text node passed AA. Five flags were parser artefacts for `oklab()` alpha colours; recomputed by hand they are about 7.7:1 and 8:1.
- **Chart readability:** neutral bars and partitions readable; ratings in amber; stale warnings in amber.
- **Isolation:** `/en` landing and `/login` remain light.
- **Other product screens** (Explorer, Markets, Opportunities, App Details): a quick scan found no leftover light surfaces. **Not visually reviewed in detail.**
- **Tests:** focused suites (UI demo, read integration, auth, hardening, production readiness, landing) passed: 57, 0 failed, 1 skipped. Typecheck passed. The full quality gate was not run at this stage.

**Not verified:**
- real-data (non-demo) Dashboard
- signed-in Account
- screen-reader pass
- other browsers
- detailed review of non-Dashboard screens

### 13.1 Colour refinement validation (27 Nov 2026)

**Changed files:**
- `src/app/globals.css`: accent tokens, chart palette, scoped component rules.
- `src/components/core/explorer-details.css`: Free badge.
- `src/components/core/catalog-mapping.ts`: deterministic monogram tone.

**Checks:**
- **Contrast:** a canvas-resolved audit (handles `oklab` and alpha) of every visible text node on all ten product screens in demo mode. 1,738 text nodes checked, 0 AA failures after fixing the App Details separator dot.
- **Focus and controls:** focus ring blue, 2 px. Select and search borders use `--input`.
- **Layout:** no horizontal overflow on Dashboard and Explorer at 390 and 320 px.
- **Isolation:** `/en` and `/login` remain light (`--primary #2563eb`, `--chart-1 #3b82f6`).
- **Tests:** focused suites (UI demo, read integration, hardening, media content, auth, production readiness, landing) 63 passed, 0 failed, 1 skipped. Typecheck passed.

**Next.js "1 Issue" indicator:** a React hydration-mismatch warning on `<body>`. The browser carried a `cz-shortcut-listen="true"` attribute that the server HTML lacks. That attribute is injected by the ColorZilla browser extension, not by AppRadar (recorded in `.next/dev/logs`). It is not a theme regression; no code change was made. Optional and separate: `suppressHydrationWarning` on `<body>` in `app/layout.tsx` would silence extension-injected attributes.

**Not verified:**
- real-data screens (the browser pane has no signed-in session; demo data was used)
- non-text contrast of every chart mark
- screen reader
- other browsers

### 13.2 Appearance modes validation (27 Nov 2026, demo mode, in-app browser)

**Modes and persistence:**
- **Default:** with no stored value the app is Dark, and the header shows Dark pressed.
- **Light:** applies instantly from the header, survives a reload, and persists across navigation (Dashboard → Account). The header and Account controls show the same pressed state.
- **System (selected in Account):**
  - Follows the emulated OS scheme. A live switch to dark and back to light flips `data-app-theme` within about 40 ms each time, with no reload.
  - After a reload it resolves from the OS again.
- **Pre-paint:** the init script is emitted in `<head>` before `<body>`. No new hydration errors. React's "script tag while rendering" warning was removed by moving from an inline `<script>` element to `useServerInsertedHTML`.

**Contrast:** canvas-resolved audit of every visible text node on all ten product screens, in each palette. 1,743 text nodes per palette.
- **Dark:** 0 failures.
- **Light:** 0 failures, after deepening the light-app semantic, muted and tone colours. The first pass found 4.0–4.49:1 on:
  - demo badge and banner
  - Free badge
  - red change badges
  - emerald and orange monograms

**Focus, inputs and layout:**
- The focus outline uses `--ring` in both themes.
- Input borders use `--input`.
- No horizontal overflow at 390 and 320 px.
- The header stays one row at 320 px; the page title truncates ("Dash…") to make room for the selector.

**Isolation:** with Dark stored, `/en` and `/login` remain light.

**Dropdown and table polish (same task, §7.1–7.2):**
- **Selects:** All categories, All prices and Rating count now have the chevron 12px from the border (Columns: 11px), with 30px reserved and a 36px height, in light and dark.
- **Same rule elsewhere:** Trending (Category, Chart, Series), Markets, New Releases, Watchlist, the Dashboard chart series (32px) and the App Details history/metric selects.
- **Explorer toolbar:** stays on one row at 1440px.
- **Explorer table:** current and stale rows have identical value right edges, with row heights of 81–82px (previously stale rows carried an extra text line under four columns).
- **Tooltip:** hover opens and leave closes; focus opens and Escape closes while focus is kept; tap opens and outside tap closes. On mobile (375px, touch emulation, light) the tooltip stays inside the viewport.
- **Contrast:** Explorer, Markets, Trending, Opportunities and Dashboard re-audited in both themes, 0 failures.
- **Tests:** new `tests/field-freshness-compact.test.ts` covers current/stale/unknown/no-provenance/unavailable states, per-field isolation, and the unchanged inline presentation. The demo data has no unknown-freshness fields, so that state is verified by render test, not visually.
- **Totals:** focused suites 69 passed, 0 failed, 1 skipped. Typecheck passed and ESLint is clean on the changed files.

**Tests:**
- New `tests/theme.test.ts`: default, parsing, System resolution, executing the real init script in a VM (including storage and `matchMedia` failures), and a CSS scope guard that no app `--background` override exists without the dark attribute.
- Focused suites: 67 passed, 0 failed, 1 skipped.
- Typecheck passed. ESLint is clean on the changed files.
- The full quality gate is deferred until design approval.

**Not verified:**
- real-data screens
- another browser engine
- screen reader
- an actual OS-level theme switch (emulated via the browser pane)
- whether a flash is perceptible on very slow devices (the script runs in `<head>`, so none is expected)

## 14. Landing page

Landing Page V2 (`405cdf0`) stays light and unchanged. Any dark alignment of the landing page is `DEFERRED` until the owner approves the app direction.

## 15. Final validation, decision log and checkpoint

### 15.1 Final quality gate (checkpoint)

| Check | Result |
|---|---|
| Full test suite | 221 tests: 219 passed, 0 failed, 2 skipped |
| Typecheck | Passed |
| Lint | 0 errors; 3 existing `@next/next/no-img-element` warnings (`app-icon.tsx`, `screenshot-gallery.tsx`), not part of this package |
| Production build | Passed |

**Production theme initialization and CSP** (`next start`, loopback only, built with the readiness tests' fake fixture project and keys set for those processes only; rebuilt with the normal configuration afterwards):
- With this machine's development configuration, production answers **503** because `APPRADAR_SUPABASE_PROJECT_REF` and `NEXT_PUBLIC_SITE_URL` are unset. This is the existing readiness gate; it was not relaxed.
- The init script is in `<head>` on landing, auth, legal and not-found pages. The CSP `script-src 'self' 'unsafe-inline'` header is unchanged; the script applied the stored theme and no console or CSP errors appeared.
- Default is Dark; stored Light survives reload; the header selector switches Dark, Light and System (System followed the emulated OS scheme).
- `/en` and `/login` stay light with a Dark preference stored. Protected routes still redirect to `/login`.
- The only signed-out production page that renders the product shell is not-found; protected product screens were not exercised in production mode.
- Observed, existing and not part of this package: on that page the sidebar links prefetch protected routes once on load (18 requests, no loop).

**Not performed:** real-data smoke check of Dashboard and App Explorer. The validation browser had no signed-in session, and authentication was not bypassed. All screen-level visual and contrast checks used synthetic demo data.

### 15.2 Decision log

| ID | Decision | Status |
|---|---|---|
| DS1 | Dashboard 3 used as a visual reference only; product unchanged | `APPROVED` (owner) |
| DS2 | Dark-only product theme, no switcher | `SUPERSEDED` by DS9 |
| DS3 | Palettes in §4 (grayscale version superseded by restrained accents) | `APPROVED` (owner, final design approval) |
| DS4 | No template code, Recharts, new Radix packages or new fonts | `APPROVED` |
| DS5 | Earlier light option B plan and structural Phase 1 | `SUPERSEDED`; structural items `DEFERRED` (§12) |
| DS6 | Review remaining screens | `APPROVED` and completed (§13) |
| DS7 | Landing and auth dark alignment | `DEFERRED` |
| DS8 | Deterministic per-app monogram tone | `APPROVED` |
| DS9 | Light / Dark / System, default Dark, localStorage, header and Account controls, product-shell scope | `APPROVED` |
| DS10 | Light-app semantic, muted and tone colours one step deeper than landing tokens | `APPROVED` |
| DS11 | Select chevron spacing (§7.1) | `APPROVED` |
| DS12 | Compact per-metric freshness indicator and tooltip in data tables (§7.2) | `APPROVED` |

### 15.3 Known limitations
- No real-data visual validation in either theme; no signed-in Account check.
- No screen-reader audit, other browser engines or physical devices. OS theme changes were emulated.
- The "unknown freshness" indicator is covered by a render test only (demo data has none).
- At 320px the header title truncates to make room for the theme selector.
- Right after load the selector can briefly show Dark pressed before the stored choice; the page theme itself is already correct. A click before hydration finishes has no effect.
- Non-text contrast of every chart mark was not audited individually.
- Dashboard 3 template source and 21st.dev template terms remain unverified (no code copied). Historical Modern Minimal theme-licence confirmation is still open.
- A browser extension can trigger a hydration warning on `<body>` (`cz-shortcut-listen`); not caused by AppRadar.
- Legacy violet values and sub-12px text remain in old CSS used by light pages (deferred, §12).
