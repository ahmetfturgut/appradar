# AppRadar landing page research and competitive strategy

**Research date:** 27 November 2026, Europe/Istanbul. **Status:** research proposal for owner review; no implementation approval implied. **Scope:** the AppRadar repository at `/Users/aft/appradar` and 15 current competitor products. Only this document was authored. No accounts, subscriptions, paid APIs, paid component retrieval, database operations, tests, builds, commits, or pushes were initiated.

## 1. Executive summary

### The five decisions that matter most

1. **Position AppRadar around researching a build decision:** “Research your next app before you build it.” Indie competitors already promise profitable niches, winning apps, and inexpensive intelligence. “Find app ideas” alone is crowded. AppRadar's credible emphasis is a clear path from a question, through observable store signals, to a shortlist and the next validation question. This is a positioning hypothesis to validate, not evidence of product-market fit.
2. **Replace the generic dashboard hero illustration with one explained research example.** Preserve the clean white/blue identity. Show a fictional app comparison or update-age example, the observation behind it, what remains unknown, and a sensible next question. Keep the existing synthetic-content safeguards. A visitor should understand a decision the product helps with before being asked to register.
3. **Market the capabilities that now exist, with their boundaries.** Opportunity Finder, Market Insights, Compare, and Watchlist are implemented but poorly represented on the landing page. Opportunity Finder provides provisional category indicators, not a success score. Compare supports two or three apps in the same store/country/requested-language context. Watchlist saves research; it does not send alerts. Both stores are supported by the implementation, but broad market availability is unproven.
4. **Treat launch readiness as a separate dependency from landing-page quality.** The latest documented pilot is US/en Productivity, 113 listings, partial detail coverage, mostly one chart observation per series, and unconfirmed public/commercial content rights. Production Auth/SMTP, approved legal/contact content, public data authorization, pricing, and launch scope remain decisions. A polished page cannot make these complete. A synthetic public example is feasible independently; public real-data exploration is not currently authorized.
5. **Escalate the existing name overlap for owner evaluation without renaming AppRadar.** The established App Radar at `appradar.com` overlaps in stores, competitor research, and developer audience. Its US APP RADAR registration was directly visible in USPTO TSDR. Obtain qualified territory/service-specific advice before substantial acquisition investment. A descriptive subtitle and distinct presentation may improve understanding; they do not establish legal clearance.

### Recommended direction

Use **Concept A's focused structure with one bounded interaction from Concept B**. Launch the explanatory example as static content first; add a small client-side interaction after the message is understood. Borrow Concept C's “question → observation → uncertainty → next check” narrative within that example, rather than building an elaborate scrolling story.

The proposed page answers: **What can I research? Show me an example. What can I infer? What can I use today? What happens when I sign up?** It does not compete on unverifiable scale, projected income, discount urgency, or fictional social proof.

### Evidence conventions and limits

- **Observed:** directly inspected repository code, public rendered page, DOM, or public page extraction. Competitor statements are evidence of their marketing, not independently verified accuracy, licensing, customers, or conversion performance.
- **Repository-reported:** historical verification/pilot outcomes recorded in project documents; not rerun for this research.
- **Hypothesis:** expected UX, acquisition, or conversion benefit requiring validation.
- **Proposed:** a future change, including all copy in §§11–12; not an assertion that the interaction exists today.
- **Unknown:** inaccessible, not inspected deeply enough, or lacking public evidence. Absence in a page extraction is not proof of absence in the product.

Public websites were opened, not inferred solely from search snippets. All 15 homepages were inspected in the browser, with desktop screenshots and DOM/heading observations. Public pricing, product, tools, editorial, and account-entry pages were sampled where accessible; coverage is recorded in §3 and URLs in §16. No forms were submitted. Desktop snapshots were approximately 1280×720. **No mobile-device emulation, full keyboard/screen-reader audit, performance benchmark, conversion analytics, search-volume measurement, or authenticated competitor-product evaluation was performed.** Mobile observations below are deliberately limited. Local EN/TR pages and the signed-out signup boundary were inspected on the already-running development server. Protected screens were reviewed through their current source and documented pilot evidence; the browser redirected to login. The older repository screenshot was inspected but is not treated as the current product state.

AppMagic's site explicitly reports acquisition by Sensor Tower. They count as distinct product/page experiences, not independent corporate evidence. Seasonal Black Friday offers, country-dependent pricing, and dynamic content were visible; prices are dated observations, not evergreen recommendations.

## 2. Current landing page audit

### 2.1 Product reality before marketing

The product specification's original proposed scope is superseded in several places by its dated implementation notes. Current source and the latest notes take precedence over early route sketches. For example, `/admin` is intentionally unavailable, account management is `/account`, and Compare/Watchlist/Market Insights are no longer merely planned. Sources: [R1], [R2], [R3], [R8]–[R13].

| Capability | Implementation observed | Validation / data boundary | Suitable landing claim |
|---|---|---|---|
| App Explorer | Protected `/explore`; scoped catalog search, filters, sorting, pagination; store/country/requested language | Reads collected listings, not a live search of every store app; empty context is possible | Find relevant apps in the available catalog |
| App Details | Protected `/apps/[id]`; listing, developer, rating/count, price/currency, release/update dates, source, field freshness; history and conditional sections | Discovery-only and detail observations differ; content/media can be withheld; unavailable values remain unknown | Inspect the store signals behind an app |
| Both stores | iOS and Google Play adapters, catalog, filters and views | Support is not complete worldwide coverage; initial pilot US/en Productivity | Research App Store and Google Play listings where collected |
| Market Insights | `/markets`; scoped cohort distributions and descriptive indicators | Tracked sample, not market size/share; one currency at a time; minimum sample/coverage warnings | Understand the apps collected in a category |
| Opportunity Finder | `/opportunities`; sortable category comparison, supporting apps, methodology | Provisional indicators; no combined opportunity score, revenue, demand model, or predicted winner; broad cross-category validation pending | Compare research signals and choose what to investigate |
| Trending Apps | `/trending`; compatible chart series and eligible observation comparisons | Needs comparable observations, same context/source/depth, and appropriate time windows; latest pilot mostly lacks a baseline | Inspect chart movement when comparable history exists |
| New Releases | `/new-releases`; source new-app charts and release-date browsing separated | iOS new-app chart source partial; no verified Google Play new-app chart; known release dates are not every new app | Explore collected apps with known release dates |
| Competitor Comparison | `/compare`, `/compare/add`; two–three app comparison; query URL; supported overlays | Same store, country and requested language. Histories only overlaid when compatible; no cross-store winner; protected link, not public sharing | Compare up to three apps in one market context |
| Watchlist | `/watchlist`; per-user saves, add/remove, stored context | Limit 50; saving does not collect new data; no automated alerts; live two-user isolation remains separately unverified | Save apps to revisit your research |
| Historical observations | Immutable observations, source/role separation, nulls, field-level provenance | Existence of a history UI does not establish a long historical dataset; chart history currently thin | See available observations, with their dates |
| Reviews | Reading/persistence/UI and summaries where observations exist | Current pilot reports zero reviews; public text display permission unconfirmed; no general-purpose thematic AI analysis established | Secondary, conditional explanation only; omit from hero |
| Keywords | Stored context-wide observations, ranking/metric sections; iOS provider POC reported | Not a complete ASO workspace; not app-specific keyword discovery throughout; popularity/proxy/difficulty are not monthly search volume | Do not lead with advanced ASO or search-demand claims |
| Authentication | Supabase email/password, verification, reset, session checks; Google conditional on provider configuration | Owner reported development happy-path verification, including deletion, in §6.24; production SMTP/Auth and Google/MFA not verified | Create an account only when operational access is actually available |
| Public product demo | Existing landing illustration is local synthetic content, independent of catalog and development-demo mode | It is not an anonymous live product, public API, or public catalog route | View an illustrative example |
| Billing / free plan | No subscription/payment product implementation or approved pricing found | Account creation is not proof of a free plan or approved free beta | Do not say “free forever,” “free trial,” or quote a price |
| Alerts, demand forecasts, revenue/download estimation, collaboration, CSV export | Not implemented as public product capabilities in reviewed scope | Provider POCs or comparison URLs do not supply these features | Do not advertise |

Opportunity definitions are unusually useful material for an honest demonstration: known rating below 4.0; known last update older than 365 days; release within 365 days; top-three developers' share of tracked apps; median rating count; free-download share. Minimum known sample is 5; under 20 triggers a small-sample warning; known-field coverage below 70% triggers a coverage warning. Thresholds are provisional. “Older update” does not mean abandoned, low rating does not prove an unmet need, and rating count does not measure downloads. [R10]

**Latest documented live pilot, not a new database query:** APPRADAR.md §6.28 reports 113 apps/listings (61 iOS, 52 Play), US/en Productivity; accepted top-free chart entries 50/50 per store; 95 detail observations from the new detail runs, with five Play detail IDs missing; partial iOS new-app ingestion; no real review corpus; and only one chart observation per series in most cases. The document reports approximately 93% stored release-date and 90% update-date presence, but those storage figures neither establish permission nor universal coverage. Cursor may be extending market intelligence in parallel; these are a dated baseline, not a frozen future capability promise. [R1], [R2]

### 2.2 Existing page structure and conversion path

Observed sequence in `landing-page.tsx`:

1. Sticky header: brand; Features; How it works; EN/TR; Sign in; Get started on `sm` and wider.
2. Centered hero: “Discover your next great app idea.” Store/competitor research paragraph; primary signup CTA; secondary how-it-works anchor; data-limit note.
3. Large, explicitly illustrative dashboard preview.
4. Problem/solution block with five research questions.
5. Six benefit-led feature rows and availability footnote.
6. Three-step explanation.
7. Five use-case questions.
8. Three audience cards.
9. Six native-details FAQ items.
10. Final account CTA.
11. Footer with working Privacy, Terms, Contact **draft** links.

There is no pricing, testimonial/logo strip, or real public catalog. These omissions are not all defects. No approved pricing or usable social proof was found. Legal/contact routes now exist; older “coming soon” notes should not be mistaken for current code. Their approval and missing owner facts remain unresolved. [R4]–[R7]

Signed-out header/hero CTAs use `/signup`; final copy says “Create your account.” Signed-in visitors go to `/dashboard`. The anonymous secondary action scrolls to text, not an explorable example. The signup form requests email, password, and password confirmation, with email verification in the implementation; default destination is dashboard. Google is configuration-dependent and was not displayed in the inspected local signup. `/dashboard` redirected to `/login?next=%2Fdashboard`. Auth and product screens remain English even after a Turkish landing visit. [R8], [R9]

### 2.3 What to preserve

- Original, synthetic public illustration with both a visible badge and full explanatory caption; no real store asset loading.
- Modern Minimal tokens: white background, `#333333` foreground, darker accessible blue `#2563eb` primary, Inter, `0.375rem` base radius, restrained borders and shadows. Existing chart blues and green/red state colors have semantic purposes. [R6], [R14]
- Benefit-led feature headings, source/freshness honesty, unknown rather than zero, contextual comparisons, and native FAQ disclosure.
- EN/TR dictionaries, URL-based locale, `lang`, canonical/hreflang/Open Graph support conditional on valid origin, and a distinct landing locale rather than silently changing store filters.
- Skip link, visible focus styles, chart text alternatives, meaningful labels, 44px primary controls, reduced-motion rules, and responsive grids already present in source. These are implementation strengths, not a certified accessibility result.

### 2.4 Main weaknesses and evidence level

| Finding | Evidence | Implication |
|---|---|---|
| Broad idea headline lacks a specific research mechanism | EN/TR dictionary + rendered desktop | A visitor cannot immediately distinguish AppRadar from numerous idea tools |
| Hero preview prioritizes totals/category distribution rather than a build decision | Synthetic totals of 146 apps, five categories, rank rows, sparkline | Visual polish is present; the research payoff is weakly demonstrated |
| Most differentiating implemented workflow is absent from main feature presentation | Opportunity Finder, same-context Compare, and persistent Watchlist exist in source | Page understates capabilities while spending space on overlapping generic explanations |
| Much of the page repeats “research before deciding” | Problem, how-to, use cases, audience, final CTA | Reduce repetition; use saved attention to explain one concrete example |
| Coverage is broadly qualified but not operationally specific | Copy says coverage varies; live pilot limited | A prospective user still does not know whether their intended market can be researched |
| Account CTA precedes a substantive demonstration and access terms | `/signup`, no approved plan/pricing policy | Signup intent may exceed understanding; cannot measure effect without analytics |
| TR-to-English handoff is not explained | Localized public page; English signup/product | Surprise is a plausible abandonment risk |
| Mobile CTA is intentionally absent in sticky header | `hidden ... sm:inline-flex`; hero CTA remains | Possible friction after scrolling; no proven defect or reason to add a bottom overlay by default |
| Dense preview labels use 11–12px type; chart/sidebar layout changes by breakpoint | Source inspection | Need later narrow-viewport/zoom review, especially Turkish wrapping; no current overflow failure claimed |
| Large preview remains a client component; root is dynamic and viewer-aware | Source | Performance work should be measured later; no Lighthouse/Core Web Vitals scores were gathered |
| Public SEO footprint is essentially home/legal | Routes and metadata inspected | Educational and methodology content are more realistic first acquisition steps than thousands of app pages |

## 3. Detailed competitor research

### 3.1 Reading guide and inspection coverage

Relevance means closeness to **the developer's decision before building**, not design taste or overall product quality. **D** = direct niche/idea research; **A** = adjacent workflow or enterprise benchmark. The ordered lists below record observed content sequence, compress repeated CTA/image blocks, and exclude cookie dialogs and expanded mega-menu content. Navigation is described separately. Duplicated DOM text from animation is not counted as extra sections.

The individual profiles combine the sources linked beside them; §16 provides exact URLs and access date/method. “No standalone page observed” does not mean a feature or resource does not exist.

| Product | Home + visual | Additional pages actually sampled | Account-entry inspection / limits |
|---|---|---|---|
| AppKittie | Browser; extractor 403 | Pricing; blog; terms surfaced | `/sign-in` rendered loading during sample; checkout-resume link observed, not followed |
| GetAppNiche | Browser + extracted | Niche research guide; homepage pricing, tools/content links and interactive rule preview | Registration read: name/email/password or Google; not submitted |
| AppGazers | Browser + extracted | Tools directory; alternatives directory; pricing and niche sections on home | Google entry visible; complete signup sequence not exercised |
| Appsupa | Browser + extracted | Pricing; how-it-works; Opportunities product page; terms | Signup read: name/email/password or Google, then plan selection; no submission |
| Appaloma | Browser + extracted | Pricing; research index; free idea-lookup page | Sign-in route loaded sparse content; downstream access not established |
| Peekly | Browser + extracted | Pricing; app-idea use case; tool links in footer | Signup read: email/password or Google; no submission |
| Trend Apps | Browser + extracted | Methodology; homepage pricing and comparison; public chart links | Auth read: Google/GitHub/email magic link; no submission |
| Sensor Tower | Browser + extracted | App Performance Insights; sourced-data page; demo; signup | Signup page extracted; multi-field demo form inspected, not submitted |
| AppMagic | Browser; text extraction empty | Rendered feature demos and public chart link; acquisition notice | No reliable public price captured; no full account flow |
| Appfigures | Browser + extracted | Pricing; Explorer; App Intelligence; signup | Name/email/password, optional company; not submitted |
| AppTweak | Browser + extracted | Pricing; Market Intelligence; trial entry attempted | App signup extraction unavailable; trial details are website statements |
| MobileAction | Browser + extracted | Pricing; marketing-team use case; registration URL | Registration extraction sparse; no downstream trial validation |
| App Radar | Browser + extracted | Pricing; competitor intelligence; legal notice; tool terms | App entry returned extractor 403; AI tour email gate observed, not submitted |
| AppBrain | Browser + extracted | Product overview; Intelligence pricing; public statistics links | Developer subscription entry extractor 403; no authenticated evaluation |
| FoxData | Browser + extracted | Pricing; indie use case; free tools; signup; trial help | Registration read; trial help conflicts with indie-page no-card message |

### 3.2 Direct indie and opportunity competitors

#### C01 — AppKittie · D, very high relevance

**Positioning / hero:** “Find what’s winning in mobile apps.” Supporting copy packages revenue, downloads, ads, viral videos, keywords, and onboardings with daily freshness. Practical benefit: research monetization/acquisition together. Emotional benefit: confidence from existing winners. [C01-H]

**Navigation / actual order:** Features, Pricing, FAQ, Affiliate, login/access → hero → video → founder result → app database/detail previews → growth tools (ads/spend/organic/ASO/onboarding) → AI access → customer logos/testimonials → pricing → FAQ → final CTA → footer.

**Design / conversion:** Dark green/black, oversized sans type, green pill CTAs, large product cards, autoplay video with sound control. Repeated **Get Instant Access** leads toward checkout resume; not a verified free trial. Pricing: $79 monthly or $588 annually ($49/month equivalent). Trust consists of seller-published customer claims; not independently verified. [C01-P]

**SEO / assessment:** Blog segments app ideas, monetization, onboarding, ASO, comparisons and profiles. Strong: visual depth of one workflow. Weak/hypothesis: a very long acquisition-tool story can distract a pre-build researcher; “winning” creative performance is not proven by page appearance. Adopt demonstration specificity, not its claims or assets. [C01-B]

#### C02 — GetAppNiche · D, very high relevance

**Hero:** “Find your next profitable app niche — before everyone else.” Supporting message combines estimates, keywords, ads and reviews with pre-build validation. Audience: indie founders plus growth users. [C02-H]

**Order:** Offer/nav → hero opportunity scan → store-page extension preview → four question-based paths → three dated niche examples → localization gap → alerts → interactive alert rule → research method → tool suite → pricing/testimonials → workflow/Android links → rationale → assisted pilot/founder → FAQ → guides/tools → final CTA/newsletter/footer.

**Design / conversion:** White/blue split hero, evidence table, recurring question-specific links, and dense long-form detail. The main “free niche” hero link actually targets pricing; separate workspace links lead to registration. Name/email/password or Google; public tools and no-card account are advertised. Promotional monthly/yearly/lifetime prices vary from regular prices; homepage contains inconsistent catalog counts and yearly-equivalent wording. Treat this as a coherence lesson. [C02-H], [C02-S]

**SEO / assessment:** Guides, public answers/charts and niche pages target concrete founder searches. Strong: examples explicitly identify a next validation step. Weak/hypothesis: accumulated sections dilute focus. Its estimate caveats mean transparency alone is not unique to AppRadar. [C02-G]

#### C03 — AppGazers · D, very high relevance

**Hero:** “Don't build another dead app.” Supporting language emphasizes avoiding wasted months through evidence, with highly confident opportunity claims. [C03-H]

**Order:** Promotion/nav → hero → workspace preview → young-app traction → growth/statistics/feed → niche exploration → app lookup → database/ads/keywords/rankings/watchlist/MCP → solo/studio paths → pricing → final CTA → directory footer.

**Design / conversion:** Pale teal, dark green type, large centered headline, product-rich cards, moving signal feed, strong promotional block. Free access and Google entry; Basic/Pro limits and renewal conditions described. Hero price is a first-year annual promotion, not standard monthly pricing. No actual conversion outcome observed.

**SEO / assessment:** Public no-account checker tools, reports/guides, alternatives directory and comparison checklist connect informational intent to product. Strong: product access and task-oriented routes. Weak/hypothesis: discount and fear framing dominate early attention; scale claims differ between sections. For AppRadar, use a useful ungated example without implying “undeniable” commercial evidence. [C03-T], [C03-A]

#### C04 — Appsupa · D, very high relevance

**Hero:** “Find winning mobile app ideas.” Supporting message ties estimated earnings, weaker incumbents and keyword research to the build decision. [C04-H]

**Order:** Nav → hero/CTA/price → dataset counts → feature cards → dataset-to-shortlist funnel → app examples → tabbed product screens → audiences → enterprise/manual-work comparison → pricing → FAQ → final CTA → footer.

**Design / conversion:** White/black minimal typography, subtle grid/tint, sharp primary action, compact product cards. Visible entry animation initially blurred the hero before settling. No free trial; $15/month or $99/year displayed. Signup offers Google or name/email/password and explicitly says plan choice follows. [C04-P], [C04-S]

**SEO / assessment:** Product and audience pages, research explanations and blog support founder intent. Strong: funnel explains how data narrows the task; methodology qualifies estimates. Weak/hypothesis: “easy to beat” can imply more certainty than ratings/estimates justify. Translate narrowing into transparent research filters, not a certainty score. [C04-W], [C04-O]

#### C05 — Appaloma · D, very high relevance

**Hero:** “The entire conceptual space of the App Store, from apps over $5k MRR.” Supporting message frames the product as niche/USP intelligence with curated app analysis. [C05-H]

**Order:** Nav → conceptual hero → browsable/filter preview → curation counts → niche taxonomy/cards → game-niche map → full app dossier → final acquisition/build CTA → footer. No homepage pricing table or FAQ observed in the main sequence; pricing is separate.

**Design / conversion:** Warm paper background, large serif hero, collage illustrations, nested discovery and pan/zoom controls. Access CTA leads to pricing; monthly $59, annual $499 shown with a rounded $42/month label. Dossier previews reduce abstraction, but tool access behind payment was not evaluated. [C05-P]

**SEO / assessment:** Research index includes niche deep dives; free idea-lookup tool exposes a separate question entry. Strong: conceptual grouping feels closer to an app idea than store categories. Weak/hypothesis: a taxonomy/map can demand more orientation and accessible alternatives. AppRadar cannot claim curated thousands of niches from its current catalog. [C05-R], [C05-T]

#### C06 — Peekly · D, high relevance

**Hero:** “Find the Apps Winning Right Now.” Supporting copy bundles earnings estimates, ads, rankings and paywalls with daily refresh. [C06-H]

**Order:** Offer/nav → hero/video → app discovery/database → competitor monitoring → ads → AI access → feature collection (including publisher/ranking/paywall/organic previews) → FAQ → final CTA → footer. Pricing is a separate page.

**Design / conversion:** Dark purple, cloud/glow hero, large type, animated text, screenshots and feeds. Repeated exploration CTA; signup email/password or Google. Limited free account is stated. Pricing shows $29 reference monthly and $14/month billed yearly promotional text, with animated-number extraction ambiguity; checkout not verified. [C06-P], [C06-S]

**SEO / assessment:** App-idea use-case page and tool/use-case links offer specific entrances. Strong: tangible screen-level demonstrations. Weak/hypothesis: hero claims of immediacy and later daily-refresh methodology can create mismatched expectations. Orientation restriction text and duplicated animated DOM text warrant mobile/accessibility checking; they do not prove a device failure. [C06-U]

#### C07 — Trend Apps · D, very high relevance

**Hero:** “Find your first $10k/mo app idea today.” Supporting narrative identifies existing payers as a starting point for a developer's next project. [C07-H]

**Order:** Promo/nav → hero/revenue graphic → hunch-versus-evidence story → public chart rows → three steps → revenue-per-download explainer → features → enterprise comparison → pricing → FAQ → final CTA → footer.

**Design / conversion:** Dark grid, orange/yellow emphasis, big numbers and simple tables. Public app pages/top-five rows require no account according to pricing copy. Auth offers Google/GitHub/magic link. Standard $9.99 monthly and $49.99 annual shown; browser also displayed a Türkiye regional $6.99/month message. [C07-S]

**SEO / assessment:** Public app/chart pages, comparison route, and detailed methodology. Methodology limits coverage to US and identifies estimates/low-signal suppression. Strong: teach one metric with an example. Weak: income-led promise and enterprise-price comparison should not be adopted as substantiated economics. AppRadar can teach update-age or rating coverage with comparable clarity. [C07-M]

### 3.3 Enterprise, ASO and adjacent benchmarks

#### C08 — Sensor Tower · A, medium workflow relevance

**Hero:** “One Platform. Every Metric. Total Visibility.” Supporting copy spans mobile, web, advertising and gaming. Audience is cross-functional enterprise teams; benefit is consolidated digital intelligence. [C08-H]

**Order:** Nav/extension promotion → hero → client logos → platform introduction → data sourcing → three-step methodology → customer quote → product portfolio → blog → corporate footer. No homepage pricing/FAQ table; product page has FAQ.

**Design / conversion:** Spacious white/black split hero, colorful product collage, authoritative editorial sections. Demo and free signup coexist. Demo form asks name, company, job title, email, product interest and consent; custom pricing explicitly stated. No fixed enterprise price verified. [C08-D]

**SEO / assessment:** Product pages, market reports and sourced-data education. Strong: provenance is part of sales narrative. Weak/hypothesis for AppRadar's audience: broad portfolio and sales form extend the path to one app decision. Use source education at an appropriate scale; do not imitate breadth or client logos. [C08-P], [C08-R]

#### C09 — AppMagic · A/D for games, high relevance to niche mechanics

**Hero:** Large graphical wordmark rather than a DOM H1; supporting paragraph emphasizes classification, advertising analysis and trendspotting. [C09-H]

**Order:** Nav/acquisition notice → graphic hero → trial/demo → client logos/video → ad creative examples → LiveOps → classification → success-meter table → semantic core → advanced search → ad geography → final demo/footer.

**Design / conversion:** White, colorful oversized wordmark, playful yellow CTA, dense product-native examples. Free chart entry and request-demo path observed. No reliable current price obtained; rendering required a browser. No authenticated feature validation.

**SEO / assessment:** Public charts, case-study/blog navigation, specialized classification vocabulary; sparse extracted homepage and missing semantic H1 reduce what a crawler/a11y review can infer. Strong: market segmentation is demonstrated rather than merely named. Weak/hypothesis: graphic-first entry and dense tables need accessible equivalents. Relevant inspiration for category explanation; no basis for AppRadar to promise success-rate calculations. AppMagic is now presented as a Sensor Tower product. [C09-H], [C09-C]

#### C10 — Appfigures · A, high research-workflow relevance

**Hero:** “Grow your mobile app downloads and revenue.” Supporting message joins rankings, listing optimization and competitors. [C10-H]

**Order:** Nav/promotion → hero → logos → roles/use cases → scale → lead/demo block → product toolkit → additional features → market reports → data service → educational strategies → weekly content → footer.

**Design / conversion:** Light background, blue actions/orange brand, substantial whitespace, screenshot panels and role cards. Demo and free signup; signup asks name/email/password plus optional company. Pricing distinguishes own-app Analytics/ASO from market intelligence. The inexpensive Connect plan must not be represented as unlimited competitor research. [C10-P], [C10-S]

**SEO / assessment:** Explorer product page, App Intelligence, market reports, app/keyword teardowns and newsletter connect multiple intents. Explorer demonstrates search, rich profiles, saved searches and role-specific paths. Strong: specific product jobs. Weak/hypothesis: breadth/plan complexity creates effort for a founder seeking one answer. [C10-E], [C10-I]

#### C11 — AppTweak · A, medium/high overlap

**Hero:** “Own the app stores. Win AI search.” Supporting copy connects ASO, Apple Ads and AI visibility to established mobile teams. [C11-H]

**Order:** Nav → hero/product preview → logos → ASO → campaign manager → AI visibility → additional tools → services → data/AI foundation → customer cases/awards → CTA/security marks → blog → deep footer.

**Design / conversion:** Editorial serif/sans contrast, red actions, product dashboards and substantial proof. Free trial and demo paths. ASO Essential displayed $79/month equivalent, $949 billed annually; not the whole suite price. Pricing/product pages also describe a free Market Intelligence offering. [C11-P], [C11-M]

**SEO / assessment:** Product/solution pages, ASO education, case studies and named alternatives. Strong: product outcomes paired with relevant proof. Weak/hypothesis for pre-build visitors: growth stack and AI visibility are farther from deciding what to build. Do not assume every enterprise/ASO platform requires a costly sales contract or that AppRadar is uniquely accessible.

#### C12 — MobileAction · A, medium overlap

**Hero:** Rotating completion of a headline about building app-store marketing on AI, automation and expertise. Supporting copy specifies organic, ad creative and Apple Ads optimization. [C12-H]

**Order:** Nav/promo → hero → client logos → AI → Apple Ads campaigns → organic growth → ad creative optimization → API → supporting solution/resource/footer content. No homepage pricing table observed; separate pricing page.

**Design / conversion:** White/navy, split product hero, rotating text and dashboard imagery. Dual Get Started/demo path. ASO Lite publicly shows $15/month billed monthly or $12.50 annual equivalent, seven-day trial; other products have separate plans. This contradicts a blanket “enterprise tools all cost thousands” pitch. [C12-P]

**SEO / assessment:** Industry/team solutions, reports, glossary, university and ad library navigation. Marketing-team page maps problems to relevant tools. Strong: audience segmentation and actual workflow screenshots. Weak/hypothesis: numerous product/trial choices increase selection effort. Reuse segmentation selectively, not a sprawling mega-menu. [C12-U]

#### C13 — App Radar by SplitMetrics · A, high overlap and very high naming relevance

**Hero:** “Increase organic downloads, outperform the competition.” Supporting text frames ASO/listing optimization for growing businesses. [C13-H]

**Order:** Nav → hero/product/tour → logos → benefit tabs (clarity, visibility, process, scale) → experience/proof → awards → educational content → final CTA → footer.

**Design / conversion:** White/navy/purple, split hero, product screen and review score, repeated trial CTAs. AI-guided tour asks email. Seven-day trial; annual Essentials shown as €690/year with rounded €58/month display. App entry extraction was restricted. [C13-P]

**SEO / assessment:** Competitor intelligence, keyword, automation, audience pages, academy and glossary. Strong: clear outcome plus a product view. Weak/hypothesis: broad AI language needs substantiation; free-start terminology can obscure a time-limited trial. Its competitor page also targets market opportunities: overlap with this repository is not limited to the name. [C13-I]

#### C14 — AppBrain · A, high product-led acquisition relevance

**Hero:** “Look up any app.” Supporting copy explains developer, ranking, rating and internal app information. [C14-H]

**Order:** Nav/search → hero/search → promoted listings → current rankings → public market stats → intelligence features → AI access → promotion → monetization → founder story → final multi-product CTA → footer.

**Design / conversion:** Functional white/green/blue, search-first layout, tables, screenshots, little hero decoration. Public lookup precedes registration. Free plan and $75/month Intelligence displayed; developer-account entry restricted to extractor. Intelligence emphasis is Android, despite broader listing/navigation references. [C14-P]

**SEO / assessment:** App/developer pages, charts and statistics form a large linked public utility. Strong: the visitor can start with a recognizable task. Weak/hypothesis: promotion, monetization and intelligence compete for attention. AppRadar should learn the immediate usefulness, not expose its private catalog without rights/access design. [C14-O]

#### C15 — FoxData · A, high audience/SEO relevance

**Hero:** A long category headline describing an all-in-one mobile analysis/marketing platform; support names market, ad and keyword research. [C15-H]

**Order after browser hydration:** Nav/promo → hero/search → charts → keyword analysis → ad intelligence → market intelligence → business solutions → editorial insights → CTA/footer. Text extraction initially omitted several hydrated sections.

**Design / conversion:** Purple/navy hero, large campaign promotion, white search control, charts and many navigation links. Signup requires email/password/confirmation/country, with optional contacts. Free tools distinguish no-registration utilities from gated tools. Indie page says no card; official trial help says payment details are required and billing follows seven days. This is an unresolved messaging conflict, not a verified checkout condition. Pricing page accessible; stable currency/billing selection not captured. [C15-S], [C15-T], [C15-U], [C15-F], [C15-P]

**SEO / assessment:** Indie-specific solution, free ASO tools, app pages and education. Strong: explicit audience pain/solution mapping. Weak/hypothesis: broad category copy, promotional weight and inconsistent trial messaging impede understanding. AppRadar should state access conditions once, consistently.

## 4. Competitor comparison matrix

### 4.1 Positioning, architecture and conversion

Section order is recorded in §3. This matrix compresses it for comparison. Trust claims below are competitor-published; none were verified as AppRadar assets or conversion evidence.

| Competitor | Audience / position | Hero strategy / primary action | Architecture / preview | Trust / conversion approach |
|---|---|---|---|---|
| AppKittie | Founders + growth; full acquisition research | Winner discovery / instant access | Video → features → proof → pricing/FAQ; rich product cards | Testimonials/logos; repeated paid-access action |
| GetAppNiche | Indie niche decision + ASO | Profitable niche / free niche | Questions → examples → tools → pricing/content | Dated examples/founder; free account/tools + upsell |
| AppGazers | Makers/studios; broad research | Avoid wasted build / promotional start | Public signal previews → workflows → tiers | Catalog/examples; free entry, paid depth |
| Appsupa | Solo/studios; narrow candidate set | Winning ideas / Pro | Funnel → examples/screens → audiences → price | Data explanations; clear paid access |
| Appaloma | Concept/niche-oriented builders | Curated conceptual space / access | Taxonomy → map → dossier; separate pricing | Curation/citations; access after pricing |
| Peekly | Builders/growth; monetization inspiration | Current winners / explore | Video → tools/screens → FAQ; separate price | Feature previews; limited free account |
| Trend Apps | Indie/vibe developers; small earners | Income aspiration / chart browsing | Story → public rows → metric lesson → price | Maker narrative/method; ungated sample → Pro |
| Sensor Tower | Enterprise analysts/growth | Breadth / demo | Source narrative → products → editorial | Logos/data estate; sales + limited signup |
| AppMagic | Game/market analysts | Classification / demo or charts | Deep tools and tables | Clients/classification; public entry + sales |
| Appfigures | Owners, researchers, growth | Grow app business / free signup | Roles → scale → toolkit → reports | Scale/logos; self-service + demo |
| AppTweak | ASO/UA teams | Visibility leadership / trial | Product stack → services → proof → content | Cases/security; trial + sales |
| MobileAction | ASO/UA teams | AI/automation/expertise / start | Workflow suite → solutions/resources | Brands/partner signals; product-specific trials |
| App Radar | App marketers incl. indies | Organic growth / free start | Product → benefits → proof/content | Reviews/cases; trial + gated tour |
| AppBrain | Android builders/researchers | Direct lookup / search | Public utility → intelligence → other products | Founder/history narrative; freemium utility |
| FoxData | Marketers, analysts, indies | Broad toolkit / trial | Search/charts → tools → solutions | Cases/certification; free utilities + trial |

### 4.2 Acquisition, strengths, weaknesses and relevance

“Weakest” means the most material observed UX tension for AppRadar's target job, with an inferred consequence; it is not a measured conversion ranking.

| Competitor | SEO/acquisition approach observed | Strongest transferable element | Weakest / risk for our audience | AppRadar relevance |
|---|---|---|---|---|
| AppKittie | Guides/profiles/comparisons | Tangible workflow previews | Long growth-tool emphasis | Very high demonstration benchmark |
| GetAppNiche | Niche guides/public answers/tools | Candidate → evidence → next check | CTA/count/price consistency | Very high messaging benchmark |
| AppGazers | Public checkers/reports/alternatives | Utility before payment | Promotional density/strong certainty | Very high product-led benchmark |
| Appsupa | Product/use-case/blog | Visible narrowing process | Beatable-market simplification | Very high task narrative benchmark |
| Appaloma | Concept hierarchy/research/free lookup | Idea-shaped organization | Dense map orientation/accessibility | Very high discovery inspiration |
| Peekly | Use cases/tools | Screen-level examples | Motion and real-time ambiguity | High demo, low visual-style fit |
| Trend Apps | Public app/charts/method/comparison | Teach one decision metric | Income/competitor-price framing | Very high education benchmark |
| Sensor Tower | Reports/products/source story | Explain where evidence comes from | Enterprise breadth/form effort | Medium strategic benchmark |
| AppMagic | Charts/classification/cases | Demonstrate segment differences | Graphic hero/dense data | High game-niche mechanics |
| Appfigures | Reports/teardowns/product pages | Useful role-to-tool mapping | Complex suite/plan distinctions | High workflow benchmark |
| AppTweak | ASO education/comparisons/cases | Relevant proof near outcomes | Post-launch stack complexity | Medium/high trust benchmark |
| MobileAction | Team/industry/university | Task-specific routing | Too many choices | Medium segmentation benchmark |
| App Radar | ASO guides/academy/glossary | Product beside outcome | Trial clarity + name overlap | High overlap; owner attention |
| AppBrain | Public app/developer/stat pages | Immediate task utility | Multiple businesses on one page | High public-utility benchmark |
| FoxData | Tools/solutions/app pages | Audience-specific pains | Trial inconsistency/category sprawl | High SEO/clarity benchmark |

### 4.3 Recurring patterns versus meaningful differentiation

**Common conventions:** hero/action, product preview, grouped benefits, repeated final CTA and product/resource footer; self-service entry alongside demos; source/estimate caveats; public educational pages. Pricing, FAQ and proof can be on separate pages. Neither a bento grid nor a logo wall establishes differentiation or conversion lift.

**More distinctive observed mechanisms:** Appaloma's concept hierarchy; GetAppNiche's dated candidate/next-check cards and localization scenario; Appsupa's explicit narrowing funnel; AppBrain's immediate app lookup; Trend Apps' metric explainer; Sensor Tower's data-estate narrative. “Before you build,” estimates, MCP access, daily freshness, low prices and “winning apps” recur widely. AppRadar should not present any of these alone as a unique invention.

**Strategic implication:** emphasize a compact, inspectable decision workflow that exposes incomplete evidence gracefully. The potential advantage is the combination of task clarity, honest interpretation and low cognitive load. No evidence here establishes that competitors lack those qualities throughout their authenticated products.

## 5. AppRadar gap analysis

Benefits are hypotheses. Complexity assumes the existing stack/components and excludes external legal decisions or operational provisioning. **S:** roughly half–one focused developer day; **M:** two–four; **L:** more than four or significant dependencies. Effort is refined in §15.

| ID / gap | Why it matters; relevant competitor evidence | Does AppRadar need it? / proposed response | Expected benefit | Complexity |
|---|---|---|---|---|
| G01 — Broad positioning | Most direct competitors already sell ideas; current wording explains neither mechanism nor research output. C02/C04/C05 show a specific decision | Yes. Lead with pre-build research and a shortlist workflow | Better qualified understanding and differentiation | S |
| G02 — Dashboard illustration without an interpreted decision | Totals and category bars do not answer whether to investigate a particular app. C02/C04/C07 demonstrate a decision process | Yes. One synthetic evidence example beside/after hero | Earlier understanding of practical value | M |
| G03 — Missing implemented workflow | Compare/Watchlist/Opportunity Finder are material capabilities. C02/C03/C10 connect tools into a workflow | Yes. Three compact benefits with relevant screen fragments | More accurate perceived product value | S–M |
| G04 — Use cases are questions without outcomes | Readers must infer how a question leads to action. C02 question paths/C05 concepts | Yes. Two or three scenario choices that lead to the same example | Relevance for different developer starting points | S static, M interactive |
| G05 — No concise explanation of opportunity signals | “Opportunity” is easy to read as a commercial verdict. C04 scores/C09 success meter show strong interpretive framing | Yes. Show numerator, known sample, provisional rule and next check | Better trust and less overinterpretation | S–M |
| G06 — Availability remains abstract | “Coverage varies” does not tell a user whether the product is usable for them. C07 method states US scope | Yes. Owner-approved beta scope, last-reviewed date and truthful unavailable state | Fewer disappointed signups | S for static scope |
| G07 — Signup before concrete value / generic CTA | Secondary action only scrolls to text. C03/C14 offer useful public entry | Yes. “View an example” before account creation; retain clear account action | Lower effort to understand the product; signup effect unknown | S static, M interactive |
| G08 — Access and pricing ambiguity | No pricing approval, subscription code or declared beta policy. C04 paid terms/C15 conflicting trial copy illustrate why consistency matters | Yes to access clarity; no fabricated price table. Use a dated availability/access note once terms are approved | Better expectation matching | S copy; commercial policy external |
| G09 — Repeated conceptual content | Problem/questions/audience/how-to repeat similar ideas. C02 and C06 also illustrate long-page tradeoffs | Yes. Combine problem and audiences into scenario-led workflow; keep objections in FAQ | Shorter path to evidence and action | S |
| G10 — Trust relies mainly on caveats | No approved testimonials/logos; that is appropriate. C08 explains data sourcing; C02 shows founder/method | Yes to methodological trust, current scope and real operator/contact identity after confirmation; defer social proof | Confidence without invented authority | S–M |
| G11 — SEO entry points thin | Home/legal cannot answer many research questions. C01/C03/C05/C14 build educational/utility entry points | Yes, gradually. Methodology and two substantial evergreen guides first | Relevant organic acquisition; traffic impact unmeasured | M, ongoing editorial |
| G12 — Public search/real preview absent | C03/C14 demonstrate public lookup; AppRadar private access and rights differ | No live public catalog now. Offer synthetic, non-network example; reconsider real public utility only after rights/access review | Useful preview without unbounded costs | M synthetic; L real |
| G13 — Mobile preview density / CTA persistence uncertain | Small labels and a tall preview may delay payoff; header CTA hidden on narrow widths. C06 orientation message is a research caution | Yes to responsive simplification and later device inspection; no automatic sticky bottom CTA | Readable evidence and less visual burden | M |
| G14 — Accessibility detail and motion | Semantic basics are strong, but chart tooltips alone are not enough for every user; interactive concept introduces new controls | Yes. Text/table equivalents, keyboard-operable controls, announced state, reduced motion | More people can complete the example | S–M |
| G15 — Locale expectation gap | TR landing → English auth/product. Competitors vary in localization; FoxData exposes explicit language routes | Yes. Plain notice before account CTA; preserve natural TR copy and separate market language | Less surprise and better confidence | S |
| G16 — Conversion evidence missing | Research cannot establish that competitor patterns convert or that this page fails | Yes. Minimal privacy-aware funnel and comprehension study before elaborate experimentation | Decisions based on users rather than taste | M, after consent/privacy decisions |
| G17 — Name/domain ambiguity | C13 occupies substantially the same words/category; official trademark record exists | Yes. Owner review, descriptive subtitle, confirmed canonical domain and distinct brand presentation | Lower confusion; legal outcome unknown | S research coordination; external advice |

| ID | Required product capability / dependency | Legal, data or operational dependency |
|---|---|---|
| G01 | Existing Explorer/Details + honest workflow descriptions | Claims reviewed against current release, not roadmap |
| G02 | Original hand-authored fixture; reuse existing presentation primitives | All names/icons/values original and conspicuously illustrative; no development-only media reuse |
| G03 | Existing same-store Compare, saved Watchlist, category indicators | Public claim conditional on production access; no alert/export/team promises |
| G04 | Static anchors initially; optional local scenario selector | No open-ended real-market query or collection triggered |
| G05 | Existing indicator definitions; synthetic supporting records | Thresholds provisional; do not infer profit, demand or abandonment |
| G06 | Confirmed release scope; manually maintained availability record | Do not publish pilot content/metrics without basis; static scope requires owner confirmation |
| G07 | Existing `/signup`; example section | Account CTA only when signup/access policy is ready; no “free” inference |
| G08 | Owner's beta access/billing decision | No pricing/free tier authorized by this report; approved legal terms first |
| G09 | Existing text/layout | No new provider dependency |
| G10 | Methodology summary and confirmed operator details | Approved contact/privacy/terms; testimonials later require permission and factual verification |
| G11 | Editorial routes/content in a later task | Original prose/synthetic examples now; rights needed for real app profiles or data-derived pages |
| G12 | Isolated local fixture for preview; new reviewed public read boundary for real data | Public storage/display/derived-use permissions, cache/rate limits and privacy review before real lookup |
| G13 | Responsive comparison cards, compact chart/table alternative | Device/zoom validation pending; preserve warning/context labels |
| G14 | Current semantics plus explicit state/focus behavior | WCAG target is an acceptance goal, not a compliance claim |
| G15 | EN/TR dictionaries; notice in both locales | Product/auth translations would be a separate scope |
| G16 | Event definitions and privacy-aware measurement | Choose consent/legal basis/retention; avoid app queries, email or personal data in analytics |
| G17 | Approved operator/domain/descriptor | Territory/class-specific trademark assessment; a disclaimer does not resolve infringement questions |

**Sections deliberately not recommended now:** fabricated logos/testimonials; a price table without a decision; global live-app feed; AI agent/chatbot; conversion-counter animations; enterprise security badges; founder income promises; every existing feature as a separate section; public review extracts; automatic weekly opportunity emails. None solves an essential current problem at an acceptable evidence/cost level.

## 6. Original and meaningfully differentiated opportunities

These are original proposals for AppRadar and combinations tailored to its limits, **not claims of worldwide novelty**. C02/C04/C07 already explain research and estimates. Differentiation should come from making uncertainty actionable, not merely adding a “transparent” label.

**Potential:** H/M/L are relative hypotheses, not predicted uplift or traffic. **Effort:** developer hours, excluding owner/legal review. **Cost:** incremental cost beyond existing hosting, without external price assumptions. LP = landing experience; Content = acquisition/education; Core = new authenticated product capability.

| ID / concept | User value / originality in this implementation | Conversion / SEO potential | Effort / maintenance | API and infrastructure cost | Data availability and usage constraint | Recommendation |
|---|---|---|---|---|---|---|
| I01 — Follow one build question | LP: choose “I have an idea” / “I need a starting point”; same fixture reveals appropriate research steps. A route to a next question, not an idea generator | H / L within home | 8–12h; quarterly copy review | No API; small local interaction | Original fixture only; no user query storage | P1 first interactive enhancement |
| I02 — Observation → interpretation → next check | LP: three aligned cards show a store fact, a cautious reading and an interview/market check. Makes limits productive | H / M as an indexed explainer | 4–8h; review with methodology | No API; static HTML possible | Use synthetic update/rating examples; no copied reviews | P0 static centerpiece |
| I03 — Missing-evidence switch | LP: toggle “update date unknown”; conclusion changes to insufficient evidence instead of an attractive opportunity badge | M / L | 6–10h; low | No API; local state | Hand-authored known/missing states; no probabilistic confidence score | P1; strongest trust demonstration |
| I04 — Same-context comparison lesson | LP: three fictional competitors; country/store context fixed; tap one field to see why values can/cannot be compared | H / M with companion guide | 8–16h; low | No API | Faithful to same-store 2–3 app constraint; original icons and dates | P1; scope to one context |
| I05 — Old update, open question | LP/Content: inspect an old update and see alternative explanations (stable utility, migration, neglected experience); select what to investigate | M / H for careful evergreen guide | 4–8h; semiannual review | No API | Synthetic app facts; no definitive abandoned-app label | P1 / P2 guide |
| I06 — Your research brief | LP: turn example selections into a copyable plain-text brief: question, apps, facts, unknowns, next action | M / L | 8–12h; low | Browser-only; no account/storage needed | Original fixture; clarify this is an example, not actual saved research | P1 after I01/I02 |
| I07 — Scope before signup | LP: compact, dated availability panel clarifies which beta context can be explored and what is not collected | H qualification / L | 3–6h; update at scope changes | Static; no status service | Owner-approved scope statements; avoid live customer counts/data rows | P0, useful more than flashy |
| I08 — Evidence-reading checklist | Content/free utility: selectable checklist for a user's own research; highlights which questions store data cannot answer | M / H | 6–10h; quarterly content review | No external APIs; no backend | User may enter private ideas; keep local, no analytics capture of contents | P2; strongest low-cost free tool |
| I09 — Three research paths | LP: first app / exploring a category / comparing known rivals each reveals two relevant next steps, without tripling page length | M / M via later dedicated pages | 4–8h static; 8–12h interactive; low | No API | No invented personalization or recommendation engine | P1 if comprehension evidence supports it |
| I10 — Sample-size explainer | LP/Content: change known observations in a synthetic cohort to show why a large-looking percentage can be weak evidence | M / H evergreen educational potential | 8–16h; sync thresholds | Local arithmetic; no compute service | Rules must match provisional definitions; no market-wide inference | P2, teach one concept only |
| I11 — Observation timeline with real gaps | LP: step through fictional snapshots; missing day remains blank and incomplete chart cannot produce a movement claim | M / M | 8–12h; low | No API; local timeline | Fictional dates/series explicitly labeled; no fabricated actual history | P1/P2 after core example |
| I12 — Portable validation card | LP/Content: browser-print/copy an original worksheet containing assumptions and questions; all values labeled | M / M | 6–10h; low | No PDF service or backend required | No private-app public share by default; content entirely original | P2, pair with checklist |
| I13 — Permissioned public research sample | Content/Core: one genuine cohort, with date, selection and limitations, updated manually only when useful | H / H if useful/indexable | 16–32h initially; recurring editorial/data work | Bounded reads and collection cost; budget needed | Currently blocked by public display/derived-use basis and adequate observations | P3, not beta prerequisite |
| I14 — Save this exact research context | Core: persist the actual shortlist, question and observations as a research object | H retention / L if private | 24–48h+; ongoing schema/privacy work | Database storage; no LLM inherently needed | Watchlist saves apps already, but research briefs/annotations are new; needs authorization and privacy design | P3 new product feature, not landing work |

### 6.1 Recommended original example specification

Start with **I02**, then optionally I03/I04. Working scenario: “Are existing apps in this category worth a closer look?” Use one fictional store, country and language; three fictional apps; no real publisher, icon, screenshot or store link.

| Fictional app | Known rating | Rating count | Last store update | Research use |
|---|---:|---:|---|---|
| Focus Meadow | 3.6 / 5 | 840 | Example: 14 months before fictional observation | Identify a question about maintenance/user experience |
| Daily Grove | 4.5 / 5 | 2,100 | Example: two months before fictional observation | Compare a better-rated, recently updated alternative |
| Quiet Tasks | Unavailable | Unavailable | Unavailable | Demonstrate why missing evidence cannot be scored as weakness |

Above the table: **“Illustrative example. Fictional apps and values.”** Below: **“An older update and a lower rating are reasons to investigate. They do not show demand, revenue, or a guaranteed opening.”** A pinned observation context explains that these dates are fictional; avoid relative “today” refreshing itself. This three-app illustration is **not** a category indicator calculation: it is below the product's five-known-observation minimum. Do not display a Quality Gap percentage from it. A separate sample-size lesson needs a deliberately larger fixture.

Interaction, if added later: selecting “update unknown” replaces the maintenance interpretation with “We do not know when this app was last updated.” Preserve table/text when JavaScript is unavailable; every state has visible labels. End with **“Next check: talk to people who use apps in this category. What problem remains hard to solve?”** This is a research prompt, not a performed customer study.

## 7. Positioning alternatives

### 7.1 Four credible directions

| Direction | Original positioning statement | Hero + support | CTA pair | Strength / weakness |
|---|---|---|---|---|
| A — Idea discovery | For independent mobile builders exploring possibilities, AppRadar organizes existing apps and store observations into starting points for further research | **Give your next app idea a starting point.** Explore collected apps, compare nearby products and find questions worth investigating | Explore the workspace / View an example | Familiar demand, flexible; crowded category and can imply idea recommendations absent from product |
| B — Research before building | For indie developers and small studios choosing their next project, AppRadar connects app discovery, comparison and saved research in a workspace that keeps evidence in context | **Research your next app before you build it.** Explore collected listings, compare competitors and use available store signals to decide what to investigate next | Start your research / View an example | Best implementation fit; useful outcome without predictions; needs a clear example to avoid sounding generic |
| C — Investigate overlooked gaps | For developers examining established categories, AppRadar makes rating, release and update signals easier to investigate alongside their missing context | **Look closer at the apps your idea would compete with.** Inspect ratings, update dates and available history to sharpen the problem you want to solve | Research competing apps / See the signals | Specific and product-grounded; neglected/quality signals alone cannot establish a niche or willingness to pay |
| D — Focused competitor research | For solo founders who want a practical competitor view, AppRadar brings listing research and same-market comparison into a clear workflow | **Get a clearer view of your next app's competition.** Compare the available facts, keep your shortlist and choose your next research step | Compare your starting points / View a sample comparison | Tangible functional value; narrower than opportunity discovery, and established tools already offer comparisons |

Direction D should not use “all the enterprise data for less”: AppRadar lacks their revenue/usage/ads datasets and has no approved pricing. Direction C should not become “find abandoned apps that print money.” Direction A should not become an AI idea-generator promise.

### 7.2 Hero headline alternatives

All are original proposed AppRadar copy, not competitor text:

1. **Research your next app before you build it.** Recommended: clear timing, audience activity and implementation fit.
2. **Turn an app idea into a research shortlist.** Most concrete output; still needs to show how the shortlist is assembled rather than imply automatic generation.
3. **Choose what to explore before you choose what to build.** Honest and distinctive tone; slightly more abstract.
4. **See the apps your next idea would compete with.** Strong for visitors with an idea; less motivating for blank-page discovery.
5. **Start your next app with a clearer market view.** Broad and calm; weaker mechanism.
6. **A better starting point for your next app decision.** Outcome-oriented; can sound generic without product context.
7. **Find the questions worth answering before you code.** Honest learning frame; may undersell the actual catalog and comparison features.

Do not select a variant based on personal taste. In later interviews, ask developers to explain what they expect the product to do and name the next action they would take. Compare interpretation with actual capabilities.

### 7.3 Benefit and audience messaging

| Capability | Benefit-driven description |
|---|---|
| Explorer | Build a relevant shortlist without juggling disconnected store pages |
| Details | Check the app behind the number, including what is known and when it was observed |
| Market Insights / Opportunity Finder | Compare collected category signals and see which questions deserve investigation |
| Compare | Put up to three apps from the same market context beside each other |
| Watchlist | Keep the apps you want to revisit as your research develops |
| Trending / New Releases | Investigate new arrivals and available chart movement with the dates and coverage in view |

| Audience | Proposed message | Destination / boundary |
|---|---|---|
| Indie developer choosing a first project | Make a smaller, clearer research shortlist before spending your evenings building | Example → Explorer; no income promise |
| Solo founder with an idea | Understand nearby apps and turn assumptions into questions to validate | Comparison example → scoped research |
| Small mobile studio | Compare candidate categories and competitors with the evidence in context | Opportunity Finder/Markets; no team workspaces or shared research ownership implied |
| Existing-app owner | Study neighboring apps as input to your next product decision | Details/Compare; secondary audience, not ASO growth promise |

## 8. Recommended positioning

**Primary category:** mobile app market research workspace. **Primary audience:** indie developers, solo founders and small mobile app studios deciding what to explore or build next. **Primary job:** narrow a broad idea/category into a defensible research shortlist. **Reason to believe:** connected Explorer → Details → same-context Compare → Watchlist, with explainable category indicators and visible dates/unknowns. **Emotional payoff:** less uncertainty about the next research action; commercial success remains unknown.

**Recommended positioning statement:**

> AppRadar helps independent mobile builders research what to build next. Explore collected App Store and Google Play listings, compare relevant apps and investigate store signals in context, so your next build starts with clearer questions and a useful shortlist.

**Recommended hero:** “Research your next app before you build it.” Supporting text names listings, competitors and available signals. Move detailed caveats into the visible example and methodology block, with a concise hero scope note. Keep an explicit revenue/download FAQ; do not hide a material limitation.

The reason to prefer B is **capability fit**, not exclusive ownership of “before you build.” C02/C04 already use that frame. AppRadar must demonstrate a particularly clear, honest workflow and validate whether users value it without revenue estimates. That unresolved willingness-to-use/pay question is larger than headline optimization.

## 9. Three landing page concepts

### A. Minimal, focused, conversion-first

**Sequence:** simple nav → specific hero → static worked example → three workflow benefits → data/coverage explanation → FAQ/access note → final CTA/footer.

**Experience:** one question, one fictional comparison, one interpretation. The first account action remains visible, but the example can be read without a signup. Replace overlapping existing sections, rather than append eight new ones. Reuse tokens and primitives. Approximate initial implementation: 20–32 developer hours including EN/TR/responsive/accessibility review in a future task; excludes launch gates.

**Strengths:** low cost/maintenance, fast understanding, no external data calls. **Weakness:** less exploratory; visitors with a different starting question may need an additional scenario. **Best use:** beta message validation.

### B. Product-led, bounded interaction

**Sequence:** nav → hero + question choice → synthetic interactive comparison → evidence explanation → workflow/value → scope/access → FAQ → final CTA/footer.

**Experience:** two or three choices update one local fixture. No live search box suggesting whole-store results. The user can reveal missing fields, inspect context, and copy an example brief; no account data or API key involved. Approximate implementation: 36–56 hours, or 12–24 incremental hours after A depending on scope.

**Strengths:** shows value through action; can expose the product's reasoning constraints. **Weaknesses:** more state/focus/localization work, client JavaScript, and risk of visitors confusing the illustration with a real working product. **Best use:** one measured enhancement after A works.

### C. Storytelling and opportunity-discovery walkthrough

**Sequence:** developer question → inspect one fictional category → discover an ambiguous signal → compare explanations → choose next validation action → reveal product tools → scope/FAQ/access → CTA/footer.

**Experience:** editorial panels and a short timeline; user controls progress. Show a plausible reason **not** to interpret a signal as an opportunity. No forced scroll lock, autoplay soundtrack, pinned cinematic sequence or forecast. Approximate implementation: 48–72 hours with original assets and polished mobile equivalents.

**Strengths:** memorable research philosophy and teachable reasoning. **Weaknesses:** reading/production burden, slower route to product specifics, story maintenance as features evolve. **Best use:** later editorial guide/campaign, not essential launch architecture.

### Comparison and choice

| Criterion | A | B | C |
|---|---|---|---|
| Solo-developer effort / maintenance | Lowest | Moderate | Highest |
| Demonstrates actual research mechanism | Good if example is clear | Strong | Strong, but more reading |
| Dependence on new core features | None | None if strictly synthetic/local | None if editorial; avoid research engine creep |
| Public third-party data requirement | None | None | None |
| Accessibility/state complexity | Lowest | More controls and announcements | More narrative/progress alternatives |
| SEO | Text can be rendered/indexed | Preserve readable initial HTML | Good editorial potential; home may be too long |
| Main conversion hypothesis | Clarity increases qualified starts | Trying a reasoning step increases intent | Story improves recall and relevance |

**Choose A + I02 now; add one of I03/I04 from B later.** Carry C's reasoning sequence inside the example. Treat the concept effort ranges as alternatives; do not add all three budgets together.

## 10. Recommended section architecture

The main page should contain fewer repeated arguments and more usable evidence. The detailed English/Turkish draft follows in §§11–12. All sections below are **proposed**. A signup action is launch-conditional; the public illustrative path can stand alone until operational access is approved.

### S0. Header and navigation

- **Purpose / audience / question:** orient all visitors; “What is this and where should I start?”
- **Headline/copy:** brand **AppRadar** with an optional compact descriptor, **Mobile app market research**. Navigation: **Example · Research workflow · Data & coverage**; EN/TR, Sign in, Start your research.
- **Visual/data:** existing PublicHeader, blue radar mark and typography; session-aware dashboard label. No data fetch for marketing content, no elaborate mega-menu.
- **CTA:** signed out → `/signup` only once access is ready; signed in → dashboard. Example anchor is always public.
- **Desktop/mobile:** compact single row on desktop; retain clear brand/language/account actions, allow a second row or simple accessible disclosure on narrow screens. Do not assume a hidden primary CTA must become a sticky overlay.
- **Priority / inspiration:** P0; AppBrain's task clarity, Appsupa's restrained navigation. Keep AppRadar's established presentation.

### S1. Hero: research before the build

- **Purpose / audience / question:** first-time indie builders; “Can this help me decide what to investigate?”
- **Headline:** **Research your next app before you build it.**
- **Support:** Explore collected App Store and Google Play listings, compare competitors and use available store signals to decide what to investigate next.
- **Visual/data:** short copy plus a compact beginning of S2; no customer counters. Simple store names, not an unauthorized partner/logo treatment.
- **CTA:** **Start your research**; secondary **View an example**. Note: **For indie developers and small mobile studios. Coverage depends on the selected market.**
- **Desktop/mobile:** side-by-side or compact centered composition; on mobile copy/action precedes a readable example card. No wide dashboard scaled to illegibility.
- **Priority / inspiration:** P0; C02/C04 show task specificity; exact wording/layout original.

### S2. Worked example: make a signal useful

- **Purpose / audience / question:** anyone evaluating the product; “What will I actually learn?”
- **Headline:** **See what a store signal can help you ask.**
- **Support:** Compare three fictional apps. Check ratings, update dates and missing information, then choose a question for deeper research.
- **Visual/data:** §6.1 synthetic table/cards; observation → possible interpretation → next check. If later interactive, one missing-evidence toggle with a stable text alternative. Never calculate category percentages from three apps.
- **CTA:** optional local **Inspect the example** / **See the next check**; no signup required to read it. Do not add both as redundant buttons in static version.
- **Desktop/mobile:** three-column comparison + explanation; mobile labeled stacked cards with one selected detail, preserving all values/context. No auto-advancing carousel.
- **Priority / inspiration:** P0 static; P1 bounded controls. C02 next-validation cards, C07 metric teaching; original fixture and interaction.

### S3. Connected research workflow

- **Purpose / audience / question:** builders ready to evaluate utility; “How do I get from an idea to a shortlist?”
- **Headline:** **Build a shortlist you can investigate.**
- **Support:** **Explore relevant apps. Look closer at competitors. Keep your research together.** Three step descriptions in §11.
- **Visual/data:** original cropped UI fragments reflecting Explorer/Details/Compare/Watchlist primitives. A fourth small line can introduce category indicators; avoid nine equal feature tiles.
- **CTA:** **Start your research**, if access-ready; preserve scenario context only through already allowed routes and inputs. Saving the public fixture into a real account is not implemented and must not be implied.
- **Desktop/mobile:** three compact columns; stacked sequence with short descriptions. No new sticky product sidebar on mobile.
- **Priority / inspiration:** P0; C10 role/job clarity, C04 narrowing. Existing tool integration is the proof.

### S4. Research starting points

- **Purpose / audience / question:** visitors who have not mapped themselves to the workflow; “Where do I start?”
- **Headline:** **Bring an idea, a category, or a competitor.**
- **Support:** three short paths: first app; category exploration; known rivals. Each describes a question, two tools and an output.
- **Visual/data:** simple text rows, not abstract decorative bento blocks. Can be merged into S3 in the minimal version. No personalized market recommendation/data retrieval.
- **CTA:** relevant example anchor; account links only when access policy is confirmed.
- **Desktop/mobile:** concise rows or three cards; same reading order on mobile.
- **Priority / inspiration:** P1 or merge for P0; C02 question-based paths, C05 conceptual entry.

### S5. Evidence, scope and limitations

- **Purpose / audience / question:** serious researchers; “Can I trust what I am looking at, and is my market available?”
- **Headline:** **Know what the evidence covers.**
- **Support:** show source/context, dates, known/missing fields and conditional history. Provide a dated, owner-approved launch-scope line. Link to methodology when a real public page exists; use in-page explanation initially.
- **Visual/data:** an original evidence card; known/unknown examples; context labels. Static availability maintained with each scope change, not an invented live global status map. Documented pilot numbers are internal evidence, not automatic marketing copy.
- **CTA:** **How to read the signals** as an in-page disclosure or future methodology page. Avoid dead links to unimplemented routes.
- **Desktop/mobile:** facts and caveats side-by-side desktop; stacked with limitations adjacent to each value on mobile. Never hide them in hover-only tooltips.
- **Priority / inspiration:** P0; C08 data provenance, C07 explicit scope, existing AppRadar methodology components.

### S6. Access explanation

- **Purpose / audience / question:** users considering action; “What happens when I click?”
- **Headline:** **Start with the available research workspace.**
- **Support:** email verification and initial destination; a concrete owner-approved access/pricing note. TR notice says auth/product are currently English. No invented free-plan language.
- **Visual/data:** compact plain panel, merged with FAQ/final CTA in A. No price toggles without approved billing.
- **CTA:** **Create your account** only when ready; otherwise the review-stage page should direct visitors to the illustrative example. A waitlist is a new feature and is not a default fallback.
- **Desktop/mobile:** single compact panel; full-width action on mobile, visible language/access note.
- **Priority / inspiration:** P0 decision/copy; C04 signup expectation clarity, C15 trial-conflict lesson.

### S7. FAQ / objections

- **Purpose / audience / question:** remaining uncertainty; “What can it do, what is missing, and is the access right for me?”
- **Headline:** **Before you start your research.**
- **Support:** eight short questions in §11; include estimates, worldwide/real-time limits, guaranteed opportunities, same-context compare, no alerts, English product and access terms.
- **Visual/data:** existing native details/summary; do not add an accordion dependency. Answers are normal readable text available to indexing and assistive technology.
- **CTA:** normally none; one consistent account action below.
- **Desktop/mobile:** two-column intro/FAQ desktop; one column mobile, visible focus, full question wrapping.
- **Priority / inspiration:** P0; retain current component and improve question selection, not section count.

### S8. Final action

- **Purpose / audience / question:** users persuaded by the evidence; “What should I do next?”
- **Headline:** **Give your next app a clearer starting point.**
- **Support:** Explore the available catalog, compare relevant apps and keep a shortlist for your next research step.
- **Visual/data:** typography and one action; no looping decorative background or urgency timer.
- **CTA:** **Start your research**; signed in **Open dashboard**. Access-ready version can mention email verification; interim example-only version uses **View the example**.
- **Desktop/mobile:** centered and compact; wide mobile action, no overlay obscuring footer or keyboard focus.
- **Priority / inspiration:** P0; recurring final action is a convention, not a conversion guarantee.

### S9. Footer / accountability

- **Purpose / audience / question:** everyone, especially cautious buyers; “Who operates this and where are the policies/help?”
- **Headline/copy:** **AppRadar — Mobile app market research for independent builders.** Add confirmed operator/support details only after owner input. Links: Privacy, Terms, Contact; methodology/guides only as those pages are created.
- **Visual/data:** existing PublicFooter, quiet borders/type, original brand mark. No store/competitor logos implying partnerships; no certifications absent evidence.
- **CTA:** none; contact link must reach a genuinely monitored channel once published.
- **Desktop/mobile:** wrapped navigation, readable touch areas, no tiny multi-column link farm.
- **Priority / inspiration:** P0; methodological trust and accountable identity instead of invented social proof.

### Why this order

The hero promises a research job; the example immediately demonstrates it; workflow explains repeatable utility; evidence/coverage resolves scope; access/FAQ resolves commitment; final CTA offers an informed next step. This reduces the current repetition between problem/questions/audiences. It is a reasonable information-design hypothesis, not measured conversion science. S4 and S6 can be merged to keep Concept A short.

### Design system and approved component sourcing

| Requirement | Existing AppRadar material to reuse | Relevant 21st.dev public category / constraint |
|---|---|---|
| Header/hero/action | PublicHeader, primary/secondary classes, Button, existing type/spacing | Navigation, Heroes, Buttons, CTAs; choose restrained patterns |
| Worked example | Card, StatCard, FieldValue, FreshnessLabel, IndicatorCell concepts; original fixture | Cards, Features, Dashboards; a bento arrangement only if each cell teaches something |
| Charts | BarChart with animation off, Sparkline, PartitionBar; text/table equivalents | Dashboard/data presentation patterns; no decorative performance chart |
| Workflow | Existing ordered steps and feature-row structure | Features; no paid template retrieval |
| FAQ | Native details/summary | Existing solution sufficient; no new library needed |
| Footer/forms | PublicFooter and existing auth primitives | Footers, Forms, Sign-in, only if later implementation benefits |

The public component directory and Modern Minimal theme preview were inspected through ordinary web access, **without 21st.dev paid retrieval or code-copy calls**. These are category references, not a license approval. A later component selection must record exact URL, author, license, dependencies and modifications. Preserve the current darker blue text/CTA accessibility adjustment, rather than replacing it with the original lighter theme primary. Competitors supply research observations only; no competitor code, screenshots, graphics or layouts should be copied. [D1], [D2], [R14]

Later implementation acceptance goals: body text about 16px or greater; comfortable line length; no more than one primary action per decision point; essential information visible without hover; 44px preferred controls; keyboard operation; logical headings; non-color status; table/text alternatives; reduced motion; stable dimensions for illustration; no forced autoplay. Use product-native visual density on desktop and a simplified reading order on mobile. Verify at 360/390/768/1024/1440px and zoom in the implementation task; no such checks were run here.

## 11. Complete English copy proposal

**Editorial status:** draft for a future access-ready release, subject to the verified scope and access policy in §17. This is the full recommended page copy, not a claim that a new example/interaction is already implemented. Lines marked **Owner insertion** are editorial instructions and must not appear as placeholders on a public page. Until access is approved, replace account CTAs with **View the example** and omit the signup/access invitation; do not invent a waitlist or free plan.

### Navigation

**AppRadar** · Mobile app market research

Example · Research workflow · Data & coverage

EN / TR · Sign in · **Start your research**

Signed-in action: **Open dashboard**

### Hero

For indie developers and small mobile studios

**H1: Research your next app before you build it.**

Explore collected App Store and Google Play listings, compare competitors and use available store signals to decide what to investigate next.

**Start your research** · View an example

Coverage depends on the selected market. Available observations show their dates and context.

### Worked example

**H2: See what a store signal can help you ask.**

You are considering an app in an unfamiliar category. Start by comparing the apps already there.

**Illustrative example · Fictional apps and values**

Context: one example App Store market · US · English · fictional observation

| App | Rating | Rating count | Last store update |
|---|---|---|---|
| Focus Meadow | 3.6 / 5 | 840 | 14 months before the example observation |
| Daily Grove | 4.5 / 5 | 2,100 | Two months before the example observation |
| Quiet Tasks | Unavailable | Unavailable | Unavailable |

**What you can observe**

One app has a lower rating and an older update date. Another has stronger ratings and a recent update. Some information is missing.

**What it may suggest**

The older app may be worth a closer look. Its update date alone does not tell you whether people need an alternative.

**What to check next**

Talk to people who use apps in this category. What do they struggle with, and what would make them switch?

These signals do not establish demand, revenue or a guaranteed opportunity. This example does not load live store data.

Optional interactive labels, only if implemented: **Show missing update information** · **Show known update information**. Missing state: **Without an update date, we cannot assess how recently this app was maintained.**

### Workflow

**H2: Build a shortlist you can investigate.**

### 1. Explore relevant apps

Search the available catalog and narrow by store, country and category. Find products worth opening, rather than treating a catalog total as the size of the market.

### 2. Look closer at competitors

Inspect app details and compare up to three apps in the same store and market context. Check available ratings, prices, release dates and update signals side by side.

### 3. Keep your next research step in view

Save relevant apps to your watchlist and revisit them as your questions develop. Historical views show available observations when enough comparable data exists.

**Want to start with a category?** Market Insights and Opportunity Finder organize collected category signals, with sample sizes and missing information visible. They help you investigate; they do not select a guaranteed winner.

**Start your research**

### Starting points — optional standalone section; otherwise merge into workflow

**H2: Bring an idea, a category, or a competitor.**

**Choosing your first app?** Explore existing products and make a focused list of questions before committing your evenings to a build.

**Exploring a category?** Compare available rating, release and update signals. Check which parts of the collected sample are known.

**Already have competitors in mind?** Inspect their available store details and compare relevant apps in one market context.

### Evidence and coverage

**H2: Know what the evidence covers.**

**Context stays visible.** Read each observation with its store, country, requested language and source.

**Dates matter.** A listing observation and a retained metric can have different dates. History appears only where observations exist.

**Missing stays missing.** An unknown rating is not a low rating. A missing update date does not mean an app has been abandoned.

**A sample is a starting point.** Collected apps describe part of a market. Coverage and freshness vary by field and context.

Owner insertion: add one confirmed availability sentence, with last-reviewed date, for the release that will actually be accessible. Do not turn the internal Productivity pilot into a public promise without approval and permissions. If no real-data access is approved, use: **“This public example is illustrative. Access to real market data is not available through this page.”**

**How to read the signals** — in-page methodology disclosure initially.

### Access — merge into FAQ/final CTA in the minimal concept

**H2: Start with the available research workspace.**

Create an account, verify your email and open the workspace to begin your research.

Account creation and the research workspace are currently in English.

Owner insertion: state the actual beta access conditions, any limits, approved price or access duration, and whether payment details are required. Do not publish this section until those terms are decided. Do not use “Start free” based solely on the absence of a payment form.

### FAQ

**H2: Before you start your research.**

**What is AppRadar?**

AppRadar is a mobile app market research workspace for indie developers, solo founders and small studios. It helps you explore collected listings, compare relevant apps and decide what to investigate before building.

**Can it tell me which app will succeed?**

No. Store signals can help you form research questions. They cannot prove demand or predict commercial success. Opportunity Finder uses provisional category indicators, not a guaranteed opportunity score.

**Does it show revenue or download estimates?**

No. AppRadar does not estimate revenue, downloads, active users or market share. Where available, Google Play install bands are store-published ranges, not exact or monthly downloads. App Store install counts are unavailable.

**Does it cover every country and category? Is the data real-time?**

No. The product reads collected observations. Availability and freshness depend on the store, country, requested language and field. Some contexts have no collected data. Read the current access and coverage note before you begin.

**What can I compare?**

Up to three apps in the same store, country and requested-language context. Available ratings, prices and store dates can be examined together. Historical series are compared only when their source and context are compatible.

**Can I follow competitors?**

You can save apps to your watchlist and return to the available observations. Saving does not trigger new collection. Automated alerts are not available.

**Why are some charts or fields empty?**

An observation may be missing, too old, incomplete or unsuitable for comparison. For example, chart movement needs comparable snapshots. AppRadar leaves unsupported values unavailable instead of filling them in.

**What language is the workspace in?**

The public page is available in English and Turkish. Account creation and the workspace are currently in English. Page language does not change the market being researched.

Owner insertion: add **“What does access cost?”** only with approved actual terms. If access is not open, replace the access invitation with the illustrative-example route and a truthful availability statement.

### Final CTA

**H2: Give your next app a clearer starting point.**

Explore the available catalog, compare relevant apps and keep a shortlist for your next research step.

**Start your research**

Verify your email to open your account. Check the current coverage and access terms before you begin.

### Footer

**AppRadar**

Mobile app market research for independent builders.

Privacy · Terms · Contact

Add methodology/guides only when their pages exist. Publish confirmed operator/support identity after owner review; no fabricated address, copyright owner or support email. Draft legal labels remain while documents are unapproved.

## 12. Natural Turkish localization proposal

Use a consistent, respectful **siz** voice. Translate the decision-making benefit naturally; do not force “signal” into every sentence. **Gösterge** fits an interpreted indicator; **mağaza verisi/gözlemi** fits an observed fact. “Fırsat” remains a research possibility. Product navigation names may remain English in the English workspace, with a parenthetical explanation on this page where helpful.

The same editorial/access conditions as §11 apply. Notes marked **Sahibin tamamlayacağı bilgi** are not public placeholders.

### Gezinme

**AppRadar** · Mobil uygulama pazar araştırması

Örnek · Araştırma adımları · Veri ve kapsam

EN / TR · Giriş yap · **Araştırmaya başlayın**

Oturum açıkken: **Panele git**

### Ana bölüm

Bağımsız geliştiriciler ve küçük mobil uygulama stüdyoları için

**H1: Uygulamanızı geliştirmeden önce pazarını tanıyın.**

Katalogdaki App Store ve Google Play uygulamalarını inceleyin, rakipleri karşılaştırın ve mevcut mağaza verileriyle hangi konuyu daha ayrıntılı araştıracağınıza karar verin.

**Araştırmaya başlayın** · Örneği inceleyin

Veri kapsamı seçtiğiniz pazara göre değişir. Mevcut gözlemlerin tarihini ve hangi bağlama ait olduğunu görebilirsiniz.

### Araştırma örneği

**H2: Bir mağaza verisinden hangi soruya ulaşabilirsiniz?**

Tanımadığınız bir kategoride uygulama geliştirmeyi düşünüyorsunuz. Önce oradaki uygulamaları karşılaştırarak başlayın.

**Temsili örnek · Uygulamalar ve değerler kurgusaldır**

Bağlam: örnek App Store pazarı · ABD · İngilizce · kurgusal gözlem

| Uygulama | Puan | Puan veren sayısı | Son mağaza güncellemesi |
|---|---|---|---|
| Focus Meadow | 3,6 / 5 | 840 | Örnekteki gözlemden 14 ay önce |
| Daily Grove | 4,5 / 5 | 2.100 | Örnekteki gözlemden iki ay önce |
| Quiet Tasks | Veri yok | Veri yok | Veri yok |

**Gördüğünüz bilgi**

Bir uygulamanın puanı daha düşük, güncellemesi daha eski. Diğerinin puanı daha yüksek ve yakın zamanda güncellenmiş. Bazı bilgiler ise eksik.

**Araştırmaya değer olasılık**

Eski güncellemeye sahip uygulamayı daha yakından inceleyebilirsiniz. Ancak yalnızca güncelleme tarihi, kullanıcıların yeni bir alternatife ihtiyaç duyduğunu göstermez.

**Sonraki adım**

Bu kategorideki uygulamaları kullanan kişilerle konuşun. Nerede zorlanıyorlar? Hangi sorun çözülürse başka bir uygulamaya geçerler?

Bu göstergeler talebi, geliri veya kesin bir fırsatı kanıtlamaz. Örnekte canlı mağaza verisi kullanılmaz.

İsteğe bağlı etkileşim etiketleri: **Güncelleme bilgisini bilinmiyor olarak göster** · **Bilinen güncelleme bilgisini göster**. Eksik bilgi durumunda: **Güncelleme tarihi olmadan uygulamanın ne kadar yakın zamanda bakım gördüğünü değerlendiremeyiz.**

### Araştırma adımları

**H2: Yakından inceleyeceğiniz uygulamaları belirleyin.**

### 1. İlgili uygulamaları bulun

Mevcut katalogda arayın; mağaza, ülke ve kategoriye göre daraltın. Katalogdaki uygulama sayısını tüm pazarın büyüklüğü olarak değerlendirmeden, incelemeye değer ürünleri seçin.

### 2. Rakipleri yakından tanıyın

Uygulama ayrıntılarını inceleyin. Aynı mağaza ve pazar bağlamındaki en fazla üç uygulamanın mevcut puanlarını, fiyatlarını, çıkış tarihlerini ve güncelleme bilgilerini yan yana karşılaştırın.

### 3. Araştırmanızı kaldığınız yerden sürdürün

İlgili uygulamaları takip listenize kaydedin. Sorularınız netleştikçe geri dönüp inceleyin. Geçmiş görünümleri, yeterli ve karşılaştırılabilir gözlem olduğunda mevcut verileri gösterir.

**Bir kategoriden mi başlamak istiyorsunuz?** Market Insights ve Opportunity Finder, toplanmış kategori verilerini örneklem büyüklüğü ve eksik bilgilerle birlikte sunar. Araştırmanıza yardımcı olur; başarı garantili bir uygulama seçmez.

**Araştırmaya başlayın**

### Başlangıç noktaları — kısa sürümde önceki bölümle birleştirilebilir

**H2: Bir fikirle, kategoriyle veya rakiple başlayın.**

**İlk uygulamanızı mı seçiyorsunuz?** Akşamlarınızı geliştirmeye ayırmadan önce mevcut ürünleri inceleyin ve yanıtlamak istediğiniz soruları netleştirin.

**Bir kategoriyi mi araştırıyorsunuz?** Mevcut puan, çıkış ve güncelleme bilgilerini karşılaştırın. Toplanan örneklemin hangi bölümünde yeterli bilgi olduğunu kontrol edin.

**Rakipleriniz zaten belli mi?** Mağaza bilgilerini inceleyin, ilgili uygulamaları aynı pazar bağlamında karşılaştırın.

### Veri ve kapsam

**H2: Verinin neyi kapsadığını bilin.**

**Bağlam görünür kalır.** Her gözlemi mağazası, ülkesi, istenen dili ve kaynağıyla birlikte değerlendirin.

**Tarihler önemlidir.** Bir uygulama kaydı ile o kayıtta tutulan metriğin gözlem tarihi farklı olabilir. Geçmiş yalnızca gözlem varsa gösterilir.

**Eksik bilgi, eksik kalır.** Bilinmeyen bir puan düşük puan değildir. Güncelleme tarihinin bulunmaması, uygulamanın terk edildiğini göstermez.

**Örneklem bir başlangıçtır.** Toplanan uygulamalar pazarın bir bölümünü yansıtır. Kapsam ve güncellik, alana ve bağlama göre değişir.

Sahibin tamamlayacağı bilgi: yayında gerçekten erişilebilecek kapsamı ve son kontrol tarihini belirtin. Henüz gerçek veriye erişim onaylanmadıysa: **“Bu sayfadaki örnek temsili olarak hazırlanmıştır. Sayfa üzerinden gerçek pazar verisine erişim sunulmuyor.”**

**Göstergeler nasıl yorumlanır?** — ilk aşamada sayfa içi açıklama.

### Erişim

**H2: Araştırma çalışma alanından başlayın.**

Hesabınızı oluşturun, e-postanızı doğrulayın ve araştırmaya başlamak için çalışma alanını açın.

Hesap oluşturma ve uygulama ekranları şimdilik İngilizcedir.

Sahibin tamamlayacağı bilgi: onaylı beta erişim koşulları, sınırlar, varsa fiyat ve süre, ödeme bilgisi gerekip gerekmediği. Karar verilene kadar bölüm yayımlanmamalı. Ödeme ekranının olmaması “ücretsiz plan” anlamına gelmez.

### Sık sorulan sorular

**H2: Araştırmaya başlamadan önce.**

**AppRadar nedir?**

AppRadar; bağımsız geliştiriciler, tek başına çalışan girişimciler ve küçük stüdyolar için bir mobil uygulama pazar araştırması çalışma alanıdır. Toplanmış uygulama kayıtlarını incelemenize, ilgili uygulamaları karşılaştırmanıza ve geliştirmeden önce hangi soruları araştıracağınızı belirlemenize yardımcı olur.

**Hangi uygulamanın başarılı olacağını söyler mi?**

Hayır. Mağaza verileri araştırma soruları oluşturmanıza yardımcı olabilir; talebi kanıtlamaz, ticari başarıyı öngörmez. Opportunity Finder, başarı garantili bir fırsat puanı yerine geçici tanımlara dayanan kategori göstergeleri sunar.

**Gelir veya indirme tahmini sunuyor mu?**

Hayır. AppRadar gelir, indirme, aktif kullanıcı veya pazar payı tahmini yapmaz. Varsa Google Play'in yayımladığı yükleme aralıkları gösterilir; bunlar kesin ya da aylık indirme sayıları değildir. App Store yükleme sayıları mevcut değildir.

**Her ülkeyi ve kategoriyi kapsıyor mu? Veriler anlık mı?**

Hayır. Ürün, toplanmış gözlemleri okur. Verinin bulunması ve güncelliği mağazaya, ülkeye, istenen dile ve ilgili alana bağlıdır. Bazı bağlamlarda toplanmış veri bulunmayabilir. Başlamadan önce güncel erişim ve kapsam bilgisini okuyun.

**Neleri karşılaştırabilirim?**

Aynı mağaza, ülke ve istenen dil bağlamındaki en fazla üç uygulamayı. Mevcut puanlar, fiyatlar ve mağaza tarihleri birlikte incelenebilir. Geçmiş serileri yalnızca kaynakları ve bağlamları uyumluysa karşılaştırılır.

**Rakipleri takip edebilir miyim?**

Uygulamaları takip listenize kaydedebilir ve mevcut gözlemlere geri dönebilirsiniz. Kaydetmek yeni veri toplamayı başlatmaz. Otomatik bildirim özelliği bulunmuyor.

**Bazı grafikler veya alanlar neden boş?**

Bir gözlem eksik, eski, kısmi veya karşılaştırmaya uygun olmayabilir. Örneğin sıralama değişimi için karşılaştırılabilir gözlemler gerekir. AppRadar desteklenmeyen değerlerin yerini tahminle doldurmaz.

**Çalışma alanı hangi dilde?**

Tanıtım sayfası İngilizce ve Türkçedir. Hesap oluşturma ve çalışma alanı şimdilik İngilizcedir. Sayfa dili, araştırdığınız pazarı değiştirmez.

Sahibin tamamlayacağı bilgi: **“Erişim ücretli mi?”** sorusunu yalnızca gerçek erişim koşulları onaylandıktan sonra ekleyin. Erişim açık değilse hesap davetini kaldırıp temsili örneğe yönlendirin.

### Son çağrı

**H2: Bir sonraki uygulamanıza daha net bir başlangıç yapın.**

Mevcut kataloğu inceleyin, ilgili uygulamaları karşılaştırın ve araştırmayı sürdüreceğiniz kısa bir liste oluşturun.

**Araştırmaya başlayın**

Hesabınızı açmak için e-postanızı doğrulayın. Başlamadan önce güncel kapsamı ve erişim koşullarını kontrol edin.

### Alt bilgi

**AppRadar**

Bağımsız geliştiriciler için mobil uygulama pazar araştırması.

Gizlilik · Kullanım koşulları · İletişim

Yalnızca mevcutsa yöntem ve rehber bağlantıları eklenir. İşletmeci ve destek bilgileri sahip onayından sonra yayımlanır; yasal belgeler onaylanana kadar taslak etiketleri korunur.

### Localization notes for implementation

- Keep the fictional app names consistent between languages; localize surrounding values with `tr-TR` (3,6 and 2.100) versus `en-US` (3.6 and 2,100).
- Distinguish rating count (**puan veren sayısı**) from written reviews (**yorum sayısı**). Existing terminology must not collapse these metrics.
- “Tracked apps” is **takip edilen/toplanmış uygulamalar**, not the whole market. Prefer **toplanan örneklem** in statistical explanations to avoid implying every catalog app is on a user's watchlist.
- Avoid **kazandıran**, **kesin fırsat**, **anlık**, **tüm dünyada eksiksiz** and **ücretsiz** without actual support.
- Use country names appropriate to page language, but preserve the actual research scope. A Turkish page must not imply Türkiye store coverage or Turkish product UI.
- Give longer Turkish headings natural wrapping. Keep limitations and action labels visible; do not shrink them to make desktop geometry fit.

## 13. SEO and conversion strategy

### 13.1 Competitor metadata, headings and intent

DOM title/description and heading inspection informed this table. Title/description **focus is paraphrased**, not a fresh quotation of the full tag. Exact hero headlines are recorded in §3. Homepage metadata is positioning evidence; it is not proof that a site ranks for those terms. Public internal-link patterns were observed; no backlink, traffic, ranking or keyword-volume tool was used.

| Competitor | Title / meta-description focus | H1/H2 architecture observed | Search intent / internal-link strategy |
|---|---|---|---|
| AppKittie | Winning mobile apps; intelligence and acquisition assets | Single visible H1; database/growth/AI/proof/pricing H2s | Ideas, monetization and onboarding; blog categories/profiles |
| GetAppNiche | Store intelligence/niche research; modeled evidence and competition | One H1; question/workflow/example/alert/pricing/editorial H2s | Profitable niches, estimates, localization; guide/answer/chart links |
| AppGazers | iOS/Play intelligence; free research and AI access | One H1 combining two lines; niche/search/tool/audience/price H2s; menu headings also present | App/keyword checks, niches, alternatives; public tools/reports |
| Appsupa | Mobile ideas with estimates; weak incumbents/search | One H1; product/funnel/examples/audience/comparison/price/FAQ H2s | Validate ideas, opportunities, niches; product/use-case links |
| Appaloma | Concepts, USPs and app intelligence | One ornate H1; niche platform/app intel/final action H2s | Narrow app concepts; taxonomy/research/free question tool |
| Peekly | Current winners; estimates/ads/paywalls | One H1; discovery/monitoring/ads/AI/features/FAQ H2s | Idea finding and monetization inspiration; use-case/tool links |
| Trend Apps | Trending apps; low-scale opportunity research | One H1; story/charts/steps/metric/features/price/FAQ H2s | Trending/new app ideas; public charts/detail/method links |
| Sensor Tower | Digital intelligence; app/ad performance | One H1; trust/product/blog H2s; many H3 feature explanations | App data/market intelligence; products/reports/source education |
| AppMagic | Brand-only title; research/classification description | No DOM H1 found; H2s for substantive tools, graphical wordmark | Segments/game research; charts/cases/blog |
| Appfigures | Intelligence/ASO/analytics; app growth | Two DOM H1s (hero and later catch-all); product/role/scale/report H2s | App analytics, competitor research and SDKs; product/report/teardown routes |
| AppTweak | ASO/store marketing; organic and paid growth | One H1; ASO/Ads/AI/services/proof/content H2s | ASO/Apple Ads/AI visibility; comparisons/case studies/guides |
| MobileAction | App/game growth; intelligence/automation | One rotating H1; supporting statement also H2 plus product H2s | ASO/UA, team/industry needs; resources/university/ad library |
| App Radar | ASO optimization; organic downloads | One H1; trust/benefits/experience/awards/content/final H2s | ASO/competitor intel; academy/glossary/use cases |
| AppBrain | Android intelligence/rankings/growth | One H1; market/AI/promote/monetize/about/CTA H2s | App lookup, rankings, market stats; extensive public app/developer links |
| FoxData | App analysis/data-driven marketing | One long H1; charts/keywords/ads/market/solutions/editorial H2s after hydration | ASO, app intelligence and indie tools; app pages/free utilities/education |

Multiple H1s are an architecture observation, not proof of an SEO penalty; a single clear H1 is the recommended AppRadar editorial structure. Dynamic animations/menu duplicates can complicate inspection. No technical indexability verdict is made on these competitors.

### 13.2 AppRadar's search proposition and page plan

**Primary home intent:** mobile app market research for indie developers. **Secondary:** app competitor research; researching an app idea before building; evaluating store signals. Treat these as relevant topics, not volume-validated keywords. Avoid buying or promising rankings for the bare brand while the naming question is unresolved.

Proposed EN title: **AppRadar | Mobile App Market Research for Indie Developers**

Proposed EN description: **Research app ideas with collected App Store and Google Play listings. Compare competitors, inspect available store signals and build a research shortlist.**

Proposed TR title: **AppRadar | Geliştiriciler İçin Mobil Uygulama Pazar Araştırması**

Proposed TR description: **App Store ve Google Play uygulamalarını inceleyin, rakipleri karşılaştırın ve mevcut mağaza verileriyle bir sonraki araştırma adımınızı belirleyin.**

Use one clear H1, H2s matching visitor questions, and H3s for the workflow. Keep key explanations as crawlable text rather than screenshots or animation-only labels. The existing metadata utilities already support locale and canonical behavior; do not describe hreflang as wholly missing. [R5], [R7]

| Proposed later page / topic | User intent / useful content | Evidence/data and priority |
|---|---|---|
| Research methodology | What ratings, update age, sample coverage and history can establish | Original explanation of existing rules; P0 in-page, P2 separate page |
| How to research an app idea before building | Step-by-step shortlist, competitor comparison, user-interview prompts | Original synthetic worked example; P2 first guide |
| How to compare mobile app competitors | Same-context worksheet, rating vs review count, download price vs subscription | Original editorial; P2 second guide |
| What an old app update does and does not tell you | Evaluate maintenance signals without claiming abandonment | I05; P2 after interviews validate interest |
| Store-signal checklist | Free I08 utility and plain-text result | No paid API; P2 |
| Carefully scoped category/app pages | App/niche research intent with actual differentiated evidence | P3 only after rights, coverage, data freshness and editorial value |
| Fact-based alternative/comparison page | Help readers choose a research workflow | P2/P3 after positioning validation; disclose own-product authorship, dates and differences; avoid misleading price equivalence |

Internal linking: home example → methodology → guide/worksheet → relevant product action; guide links return to a useful example, not only signup. No 20-page content burst before proving the initial guide helps. Translate selected high-value pages naturally; do not manufacture EN/TR duplicates with thin machine prose.

### 13.3 Technical SEO requirements for a later implementation

1. **Preserve current origin gates.** `/en` and `/tr` canonical/hreflang are already constructed from the validated site origin; development and unconfigured production are not intentionally indexed. Legal drafts stay `noindex` until reviewed. Root redirects by stored page-language preference; do not replace that flow casually. [R7]
2. **Confirm the actual public domain and reciprocal locale relationships** after naming/launch decisions. Page-language tags do not declare store-country coverage. Google's localized-version guidance supports making alternate versions discoverable explicitly. [S1]
3. **Create a small sitemap/robots plan only for approved public routes.** No sitemap/JSON-LD implementation was found in the reviewed source. Do not include authenticated catalog/query variants or legal drafts merely to fill a sitemap. This is future work, not a change made here.
4. **Create an original social-sharing image** using AppRadar typography and the synthetic example; no real app imagery. Existing Open Graph text is present; a purpose-made image/Twitter presentation is an enhancement, not a missing metadata system.
5. **Use structured data conservatively.** Confirm operator/site identity before Organization/WebSite claims. Do not invent reviews, ratings, pricing or a zero-priced offer for SoftwareApplication rich-result eligibility. Google's current software-app guidance requires substantiated offer and rating/review fields; markup does not guarantee enhanced results. FAQ content is useful for users without promising a FAQ rich result. [S2]
6. **Avoid indexable low-value scale.** Programmatic app/category pages require useful original content, authorized public data, stable identifiers, meaningful context, missing-data handling and freshness. Google's scaled-content policy concerns low-value ranking manipulation regardless of generation method. A private catalog and a single-category pilot are not a ready-made public SEO database. [S3]
7. **Measure before optimizing rendering.** The current root is dynamic/session-aware; the preview is a client component. Examine real loading/interaction performance in a future task, especially if adding controls. Keep synthetic fixture work local, reserve layout space, and avoid shipping a video/animation stack for one comparison. No performance score is asserted.

The bundled Next 16.4.6 metadata guide was read for this research. It specifies server-component metadata exports, async route parameters and streamed metadata behavior. Later implementation must reread relevant bundled guides as required by AGENTS.md rather than blindly applying older Next.js conventions. No Next.js code was written. [R15]

### 13.4 Conversion path and measurement proposal

**Current path:** landing → signup → verification → dashboard → discover the relevant research workflow. **Proposed path:** understand one example → choose to research → account/verification if access-ready → first meaningful app investigation → compare or save. Do not weaken authentication or silently make private routes public.

Time to value was not measured. The research goal for a later study is that a visitor can explain the product's job and one boundary after a short exposure; a suggested 10-second first-impression exercise is a method, not a claim that the page already succeeds in ten seconds.

| Event / metric proposal | Definition and decision use | Privacy / interpretation limit |
|---|---|---|
| `landing_view` | Eligible public visit, locale and coarse campaign | Define bot/internal filtering and denominator; no identity/query contents |
| `example_open` / `example_step` | Intentional exposure/selection, using fixed scenario IDs | Scrolling into view alone is not demonstrated understanding |
| `signup_click` | Click from an eligible landing CTA | Navigation intent, not an account |
| `signup_complete` | Server-confirmed account creation | Sensitive identity should not be sent to generic analytics |
| `email_verified` | Confirmation complete | Delivery failures are operational, not necessarily landing failure |
| `first_research_action` | First relevant detail opened after a scoped Explorer interaction | Data availability affects this; avoid logging searched terms/app IDs by default |
| `shortlist_action` | First successful compare of eligible apps or watchlist save | Stronger activation proxy than account creation; no revenue implication |
| Support/exit feedback | Users explain why data/access did not fit | Voluntary, minimal, with approved handling/retention |

No tracker was integrated in this task; legal copy currently says no analytics integration. A future instrumentation change must update the actual privacy behavior and disclosures. Keep marketing conversion separate from activation and data availability. Do not optimize toward misleading signup volume.

**Low-traffic validation sequence:**

1. Recruit, later and separately authorized, roughly five–eight relevant indie developers for short moderated sessions. Do not claim this qualitative sample gives population conversion estimates. No outreach was sent here.
2. Show hero/example; ask what AppRadar does, which data they expect, whether their market would be available, what they would do next and whether the example is real. Observe misunderstandings instead of asking only whether they like it.
3. Compare A's static version with the bounded interaction qualitatively. Preserve only interaction that improves understanding without being mistaken for live search.
4. After approved launch and sufficient traffic, record baseline intent→verification→research activation. For any A/B experiment, predefine the hypothesis, denominator, sample/power plan, decision threshold and stop conditions; don't manufacture an uplift target from this review.
5. Interview people who need revenue estimates to determine whether AppRadar's narrower proposition is valuable. A signup button cannot resolve a capability-market mismatch.

| Hypothesis | Later experiment | Success / guardrail |
|---|---|---|
| G01/G02: a concrete research example explains value better | Broad existing hero/preview vs specific hero/worked example | Correct comprehension + qualified research starts; no increased belief in guaranteed success |
| G07: ungated synthetic value increases informed intent | Static example vs how-it-works-only secondary action | More intentional example→research transitions; not just longer session time |
| G06: explicit scope improves qualification | Owner-approved scope near CTA | Fewer wrong-market expectations; signup reduction can be a positive outcome |
| G03: Compare/Watchlist establish repeatable utility | Workflow benefits vs six generic feature rows | More first meaningful comparison/save; preserve same-store constraints |
| G15: language notice reduces surprise | Honest English-workspace notice in TR flow | Correct expectation; later translated auth is a different implementation decision |

### 13.5 Responsive and accessibility research conclusions

For **all 15 competitors**, desktop typography/layout/product preview were directly viewed; mobile reflow, touch targets, sticky controls, focus order, reduced-motion compliance, contrast ratios and screen-reader output were **not verified**. That common limitation applies to each competitor profile; no desktop screenshot is used as proof of mobile quality. Peekly's portrait-mode text is a specific caution visible in the extracted page, not proof of how a real device behaved. Animated duplicate letters and initially sparse/blurred content were observed on some sites; the long-term accessibility or performance effect was not measured.

For AppRadar, source shows useful breakpoint changes: wrapped mobile navigation, stacked CTA group below 420px, preview sidebar only on large screens, grid reduction, and reduced-motion styling. Dense labels and a very tall first-screen layout are candidates for later device review. Preserve existing strengths and require a readable stacked example, visible limitations, no horizontal page overflow, keyboard access and a reflow check at 320 CSS px/400% zoom. The W3C reflow explanation supports this later acceptance criterion; data-table exceptions should not excuse an unreadable entire page. [S4]

## 14. Brand and naming analysis

### 14.1 Current overlap with App Radar at appradar.com

**Observed:** The established product uses App Radar and App Radar by SplitMetrics, markets App Store/Google Play competitor intelligence and ASO, and has explicit startup/indie-developer navigation. Its competitor-intelligence page discusses market research and growth opportunities. The legal notice identifies SplitMetrics Inc. as owner of the ASO tool. SplitMetrics' own company page describes the acquisition and continued brand operation. These are direct primary sources. [C13-H], [C13-I], [B1], [B2]

The repository product spells the name **AppRadar** without a space. Both names are visually and phonetically very similar. That typography difference should not be treated as a substantive customer-distinction strategy or legal conclusion.

| Risk | Evidence / inference | Recommendation for owner evaluation |
|---|---|---|
| Category/audience confusion | Both stores, competitor research and indie audience overlap; ASO is a different emphasis but not a separate world | Use a precise research-before-building descriptor and distinct visual execution; evaluate legal issue separately |
| Navigational search conflict | Established domain, product/resource pages and exact-name results were observed | Build descriptive topical content; do not assume ownership of bare-brand searches. No search-share/traffic estimate obtained |
| Domain/address confusion | `appradar.com` is already associated with the other product; repository production origin is not confirmed in this report | Choose/confirm an owner-controlled canonical origin, consistent support/sender identity and clear operator disclosure |
| Mistaken affiliation | Same words, category and app-store terms could imply a connection | Avoid SplitMetrics/other-product marks or asset styling. Consider a factual non-affiliation clarification only with counsel; it does not cure legal risk |
| Acquisition spend before clearance | Product/page work can precede an expensive branding conflict | Resolve targeted legal questions before paid acquisition or extensive brand-dependent content investment |

### 14.2 Public trademark information directly inspected

The official **USPTO TSDR** record for **US serial 90472728** was opened in the browser on **2026-11-27**, including Goods and Services and Current Owner sections. It displayed:

- Mark: **APP RADAR**.
- US registration **6606074**; filing **18 January 2021**; registration **4 January 2022**.
- Status presented by TSDR: registered, live/issued and active.
- Current owner displayed: **SPLITMETRICS, INC.**
- International classes **035** and **042**, with services broadly concerning app marketing consulting and software for optimization/management/analysis of software applications. This is a paraphrase; the full recorded services should be reviewed in the official record.

This verifies the existence and displayed status of that particular US record at inspection time. **It does not determine infringement, validity in every jurisdiction, the scope of protection against this product, defenses, consent, or whether the owner may lawfully use the proposed name.** No EU/Türkiye/WIPO clearance was completed; EUIPO access returned an error. No claim is made that the US record exhausts registrations or rights. The legal notice and tool terms also assert proprietary rights, but those statements are not a legal analysis. [B1], [B3], [B4], [B5]

The owner should obtain qualified advice on intended launch territories, exact services and proposed brand/domain presentation; preserve a dated record of that assessment and any required actions. **Do not rename AppRadar in this task.** The research recommends evaluation, not a new name, provider contact or legal filing.

### 14.3 Practical messaging while retaining the name

Use a stable descriptive line such as **“AppRadar · Mobile app market research for independent builders.”** Keep the original blue/white minimal identity, publish the true operator/contact once approved, and use one verified origin across metadata and email. Avoid representing AppRadar as a version of the established ASO service or claiming a commercial/technical partnership with stores/data providers. Distinct messaging can clarify the user experience; it is not permission to use a mark.

## 15. Prioritized implementation roadmap

This is a proposal for later authorization. **Impact is a hypothesis**, estimated effort is focused solo-developer time, and complexity includes integration/UX work but not an assumed vendor price. Owner/legal/provisioning tasks have external elapsed time that cannot responsibly be estimated here. Existing production-readiness documents remain authoritative; this roadmap does not reopen or certify their gates.

### P0 — Essential before beta promotion

| Item / linked gaps | Expected impact / rationale | Complexity / estimated effort | Dependencies | Ongoing incremental cost |
|---|---|---|---|---|
| P0.1 Approve launch scope, access policy and truthful claim inventory · G06/G08 | Highest expectation fit; defines what the page may promise | S editorial, 2–4h preparation + owner decisions | Current capability recheck, actual data availability, approved commercial/beta policy | Update when scope/access changes; no paid API |
| P0.2 Owner review of naming/domain · G17 | Avoid investing into unresolved confusion | S preparation, 1–2h; legal review external/unestimated | §14 evidence, launch territories, operator/domain | External professional cost if commissioned; no automated monitoring required |
| P0.3 Approve legal/contact and production access · G10 | Establishes a real operator and working conversion destination | Existing release work; 4–8h engineering coordination estimate, external decisions separate | BETA_READINESS/PRODUCTION gates, rights basis, production Auth/SMTP, monitored support | Existing hosting/email and operational review; costs not quoted |
| P0.4 Replace generic hero and consolidate repetitive sections · G01/G09 | Clearer specific job, shorter route to evidence | S, 4–6h | Approved positioning/access notes; existing dictionaries/components | Low; copy review at releases |
| P0.5 Static synthetic worked example · G02/G05/G07 | Most direct explanation of user value | M, 8–12h | Original three-app fixture, explicit labels, no invalid category percentages | Existing hosting only; no API; occasional methodology review |
| P0.6 Add accurate connected workflow + current scope/access/FAQ · G03/G06/G08/G10 | Makes implemented value and constraints reviewable | S, 4–6h | Same-store compare, Watchlist no-alert rule, confirmed scope; P0.1 | Static updates, no new infrastructure |
| P0.7 EN/TR refinement, mobile and accessibility pass · G13/G14/G15 | Readable, usable, consistent path to signup | M, 6–10h | Final layout/copy; future device/keyboard/zoom review | Low; regression review on later changes |
| P0.8 Verify final public metadata, origin and share preview · G11/G17 | Accurate discovery and sharing | S, 3–5h | Approved domain/operator; existing metadata gate; original social card | Static image/metadata upkeep |

**Practical P0 landing-only envelope:** approximately **25–39h** for P0.4–P0.8, with work overlap; P0.1–P0.3 are separate readiness/owner decisions. A narrower Concept A can land near the §9 estimate by merging sections and deferring a social-card enhancement. These are planning estimates, not a fixed quote or proof that beta can launch in one week. Public real-data authorization and production readiness can dominate elapsed time.

A synthetic-only marketing/example page can be prepared without exposing the pilot catalog. Turning on a signup CTA for a real-data beta requires actual approved access and the existing release gates; account availability and public listing rights must not be inferred from successful local rendering.

### P1 — Differentiation after the core message is understood

| Item / idea | Expected impact / rationale | Complexity / effort | Dependencies | Ongoing incremental cost |
|---|---|---|---|---|
| P1.1 One controlled missing-evidence or comparison interaction · I03/I04 | Lets visitors experience honest research reasoning | M, 8–16h | P0 fixture/text; accessible keyboard/state design | No API; small JS bundle; low review burden |
| P1.2 Two starting paths into the same example · I01/I09 | Increases relevance without a longer page | S–M, 6–10h | Comprehension findings; fixed local scenarios | No API; low content upkeep |
| P1.3 Explain one update-age signal / history gap · I05/I11 | Turns a caveat into a useful lesson | M, 6–12h for one, not both | Provisional method sync; original fixture | No API; review after rule changes |
| P1.4 Copyable example research brief · I06 | Gives a useful output before registration | M, 8–12h | Stable scenario; accessible copy fallback | Browser only; no storage service |

Do not implement all P1 items by default. Pick one interaction, observe whether users understand it, then decide. A large interactive dashboard is not the intended next step.

### P2 — Growth and validation

| Item | Expected impact / rationale | Complexity / effort | Dependencies | Ongoing incremental cost |
|---|---|---|---|---|
| P2.1 Small qualitative comprehension study | Validates audience, utility without revenue estimates and scope understanding | M, 6–10h preparation/synthesis plus sessions | Separately authorized recruitment; five–eight suitable participants | Research time/incentives if owner approves; no provider API |
| P2.2 Privacy-aware funnel/activation measurement · G16 | Distinguishes clicks from real research value | M, 8–16h | Approved analytics/privacy/retention decision; actual launch | Depends on chosen approach; avoid infrastructure until needed |
| P2.3 Methodology page + first two guides | Relevant acquisition and a reference for interpreting signals | M, 16–24h combined | Original editorial/synthetic examples; approved public routes | Roughly 1–2h review/month initially; hosting only |
| P2.4 Free evidence checklist · I08/I12 | Useful standalone outcome without paid data | M, 8–16h initial utility | Guide content; browser-local inputs; no hidden query capture | No API; occasional content maintenance |
| P2.5 Measured copy/example experiment | Improves qualified activation with actual evidence | M, 4–8h setup + analysis | Baseline traffic, defined sample/decision rule, stable scope | Analysis time; no new tool mandatory |
| P2.6 One carefully sourced alternative page | Helps users self-select on real differences | M, 6–10h | Position validated; fresh competitor facts; owner brand/legal review | Recheck material facts/pricing at least quarterly |

### P3 — Optional, gated expansion

| Item | Expected impact / rationale | Complexity / effort | Dependencies | Ongoing incremental cost |
|---|---|---|---|---|
| P3.1 One permissioned public cohort report · I13 | Could prove real utility and acquire relevant searches | L, 16–32h+ | Public storage/display/derived-use rights; adequate observations; privacy/access design | Bounded data collection and editorial refresh; approved budget required |
| P3.2 Public lookup / market exploration | Potential immediate product-led value | L, 32–64h+ | Rights, public read boundary, rate/cache/abuse controls, partial-data UX | Data/hosting load and support; not justified by competitor precedent alone |
| P3.3 Indexable app/category programmatic pages | Potential long-tail acquisition | L, 32–64h+ | P3.1/P3.2, meaningful original evidence, stable coverage, SEO review | Ongoing data/editorial/suppression monitoring |
| P3.4 Persistent research briefs/shared research · I14 | Possible retention/team value | L, 24–48h+ | New core-product authorization, private ownership/access/privacy model | DB/storage/support; separate product roadmap |
| P3.5 Cinematic narrative, AI guide, alerts or curated niche engine | Unproven acquisition appeal, significant product/maintenance scope | L, 40–100h+ depending on feature | User demand, real data, permissions, messaging/operational design | Potential AI/email/collection costs; do not introduce as landing polish |

### Sequencing and stop rules

1. Owner decides positioning, actual accessible scope/terms and naming-review path.
2. Implement only the selected P0 landing changes in a future task; reuse existing components.
3. Complete the existing production/public-data gates independently before enabling real-data acquisition promises.
4. Validate comprehension, especially **fictional example vs live data**, **sample vs whole market**, **comparison vs success prediction**.
5. Add one P1 enhancement only if it resolves a demonstrated problem. Defer P3 until users need it and data/rights economics support it.

Success criteria for that later task: accurate feature claims; no new content-rights assumptions; complete EN/TR copy; functional permitted destination; clearly synthetic example; readable mobile/table equivalents; no new paid data calls to make the landing work. Owner-approved implementation should have its own verification plan. **No tests or builds were run during this research.**

## 16. Sources and evidence

### 16.1 Source ledger and reproducibility

**Access date for every external URL below: 2026-11-27 (Europe/Istanbul).** Each ID resolves to the exact inspected or explicitly limited URL. Methods: **W** public web extraction; **B** browser/DOM; **V** desktop screenshot inspection. **Linked** means the URL/action was visible but the destination was not fully evaluated. Content may change, and cookie/promo/location/hydration state can affect what is shown.

Homepages were reviewed for positioning, section sequence, controls, visual hierarchy and metadata. Supplementary sources support scope, access, pricing and acquisition observations. Price arithmetic is explicitly labeled as monthly equivalent; annual totals take precedence over rounded labels. No competitor revenue, customer, data-rights or performance claim was independently audited. Search was used to discover destinations; third-party directory snippets were not used as proof of competitor product performance or current pricing.

| ID | Exact source / method | Evidence supported / limits |
|---|---|---|
| [C01-H] | AppKittie homepage · B/V; W intermittently 403 | Hero, sections, product previews, trust/CTA/nav; no checkout |
| [C01-P] | AppKittie pricing · W | Monthly/annual package and billing |
| [C01-B] | AppKittie blog · W | Editorial categories, profiles/comparisons |
| [C01-S] | AppKittie sign-in · B, W 403 | Loading/sparse during sample; form friction not established |
| [C02-H] | GetAppNiche homepage · W/B/V | Full section order, examples, promo pricing, CTA destinations, caveats |
| [C02-G] | Niche research guide · W | Method/education acquisition |
| [C02-S] | GetAppNiche registration · B | Name/email/password or Google; no submission |
| [C03-H] | AppGazers homepage · W/B/V | Hero, previews, tiers, free-entry messaging, titles/headings |
| [C03-T] | Tools directory · W | Public checker acquisition routes |
| [C03-A] | Alternatives directory · W | Comparison-content strategy |
| [C04-H] | Appsupa homepage · W/B/V | Funnel, sections, examples, hero, CTAs |
| [C04-P] | Appsupa pricing · W | Monthly/annual paid access; no-trial statement |
| [C04-W] | Appsupa how-it-works · W | Research steps and source/model explanation |
| [C04-O] | Appsupa Opportunities · W | Product framing around incumbent weakness |
| [C04-S] | Appsupa signup · B | Name/email/password or Google; next step plan selection |
| [C04-L] | Appsupa terms · W | Estimates and subscription statements; not rights clearance |
| [C05-H] | Appaloma homepage · W/B/V | Concept/niche structure, map, dossier, typography |
| [C05-P] | Appaloma pricing · W | Monthly/annual totals and access previews |
| [C05-R] | Appaloma research index · W | Niche/editorial acquisition architecture |
| [C05-T] | Free app-idea lookup · W | Public question-tool entry; no submitted query |
| [C05-S] | Appaloma sign-in · B | Sparse initial rendering; full form not established |
| [C06-H] | Peekly homepage · W/B/V | Sections, hero, feed/paywall screens, orientation text |
| [C06-P] | Peekly pricing · W | Limited free-account statement; displayed promo price/method; animated-number ambiguity |
| [C06-U] | Peekly app-idea use case · W | Pre-build acquisition/intent |
| [C06-S] | Peekly signup · B | Email/password or Google, no submission |
| [C07-H] | Trend Apps homepage · W/B/V | Public chart/price story, regional promo, section order |
| [C07-M] | Trend Apps methodology · W | US coverage, estimates, refresh/unknown handling |
| [C07-S] | Trend Apps auth · B | Google/GitHub/magic-link entry |
| [C08-H] | Sensor Tower homepage · W/B/V | Portfolio, source narrative, primary actions |
| [C08-P] | App Performance Insights · W | Product use cases, FAQ, estimates/free/full-access distinction |
| [C08-R] | Responsibly sourced data · W | Seller's provenance/model narrative, not AppRadar authorization |
| [C08-D] | Demo page · W | Custom-pricing statement, lead-form fields |
| [C08-S] | Signup page · W | Public signup entry; no account created |
| [C09-H] | AppMagic homepage · B/V; W no readable text | Feature sequence, graphical hero/no DOM H1, acquisition notice, chart/demo links |
| [C09-C] | AppMagic top charts · Linked from home | Free-entry destination observed; authenticated/chart depth not evaluated |
| [C10-H] | Appfigures homepage · W/B/V | Hero, role/scale/toolkit/editorial structure, two DOM H1s |
| [C10-P] | Appfigures platform pricing · W | Separate Analytics/ASO and Market Intelligence; do not equate base plan with broad research |
| [C10-E] | Appfigures Explorer · W | Research search/profiles/role paths and acquisition |
| [C10-I] | Appfigures App Intelligence · W | Competitor estimate product framing |
| [C10-S] | Appfigures signup · W | Form fields/free trial/SDK message; no account |
| [C11-H] | AppTweak homepage · W/B/V | Product stack, hero, proof/resources; cookie modal present in screenshot |
| [C11-P] | AppTweak pricing · W | ASO tier selected/annual display; product-specific pricing |
| [C11-M] | AppTweak Market Intelligence · W | Market research offer; free MI mentioned in pricing/product material |
| [C12-H] | MobileAction homepage · W/B/V | Rotating hero and product/team structure; cookie overlay visible |
| [C12-P] | MobileAction pricing · W | Lite monthly/annual ASO pricing and trial |
| [C12-U] | Marketing-team solution · W | Audience/task targeting |
| [C12-S] | Registration · W sparse | URL reached; full account friction not verified |
| [C13-H] | App Radar homepage · W/B/V | ASO proposition, trial/tour, audience overlap |
| [C13-P] | App Radar pricing · W | Annual EUR display and feature plans |
| [C13-I] | Competitor intelligence · W | Market/competitor research category overlap |
| [C13-S] | App entry · W 403 | Access limit; no account flow evaluated |
| [C14-H] | AppBrain homepage · W/B/V | Search-first utility and section order |
| [C14-P] | Intelligence pricing · W | Free/paid scope and $75 monthly plan |
| [C14-O] | Product overview · W | Intelligence/promotion/monetization architecture |
| [C14-S] | Subscription entry · W 403 | Developer-account boundary only |
| [C15-H] | FoxData homepage · W/B/V | Search-first hero; hydrated sections differ from initial extraction |
| [C15-P] | FoxData pricing · W | Public plan page; stable price/billing selection not captured |
| [C15-U] | Indie solution · W | Audience pain/solution and no-card claim |
| [C15-T] | Free tools · W | Public versus gated tool descriptions |
| [C15-S] | Registration · W | Form fields/terms, no submission |
| [C15-F] | Official trial help · W | Card requirement/billing after seven days; conflicts with indie claim |

### 16.2 Repository evidence

Repository inspection is a snapshot of files read during this task. Historical test counts and pilot details are **repository reports**, not new executions. No environment files, credentials, live database or paid collector were needed.

| ID | File(s) | Relevant evidence |
|---|---|---|
| [R1] | APPRADAR.md, especially §§6.12–6.28 | Dated implementation, owner-reported Auth, latest partial pilot, scope/permissions |
| [R2] | docs/CONTENT_USAGE.md | Internal approval vs verified third-party rights; public display closed; pilot boundaries |
| [R3] | docs/BETA_READINESS.md | Legal drafts, operational gates, mocked vs owner-reported development verification |
| [R4] | src/components/landing/landing-page.tsx | Exact section order and CTA destinations |
| [R5] | src/lib/landing/dictionaries.ts | Current complete EN/TR copy, FAQ/metadata claims |
| [R6] | src/components/landing/product-preview.tsx | Local fixture and label/caption; 146 apps/five categories; no live catalog |
| [R7] | src/lib/landing/metadata.ts; locale.ts; locale-sync.tsx | Origin-dependent indexing/canonical/hreflang, public locale handling |
| [R8] | src/lib/auth/paths.ts; actions.ts; components/auth/auth-forms.tsx | Auth/redirect policy, signup requirements, verification |
| [R9] | docs/AUTH_SETUP.md; src/app/(auth)/signup/page.tsx | Google conditional; English auth; production/development evidence split |
| [R10] | src/lib/intel/market.ts; components/core/opportunities.tsx; markets.tsx | Indicator rules, thresholds, cohorts/unknowns, supporting evidence |
| [R11] | src/lib/intel/compare.ts; components/core/compare.tsx | Same-context/store 2–3 comparison; compatible history; no winner |
| [R12] | components/core/explorer.tsx; app-details.tsx; trending.tsx; new-releases.tsx; watchlist.tsx | Current product-screen presentation and empty/partial states |
| [R13] | src/lib/ui/catalog.server.ts; demo-mode.ts; README.md | Viewer-guarded reads; development-only fixture boundary |
| [R14] | globals.css; docs/UI-KAYNAKLARI.md; components/ui | Modern Minimal tokens, accessible primary adjustment, local primitives and sourcing |
| [R15] | bundled Next metadata guide | Current framework metadata guidance; no code changes |
| [R16] | public-chrome.tsx; landing/legal.ts | Draft legal links/owner facts; no analytics integration claimed |
| [R17] | docs/screenshots/appradar-local.png | Older synthetic mobile UI, inspected as historical context only |

Additional source inspected: product specification's remaining architecture/security/cost/release sections, contract README, package metadata, proxy, root/localized routes, layout and current development browser EN/TR/signup. The older mobile screenshot is visually different from the current Modern Minimal implementation; it is deliberately excluded from claims about present mobile quality.

### 16.3 Design, SEO and brand primary references

| ID | Source / method | Role / limit |
|---|---|---|
| [D1] | 21st.dev community components · W | Public categories; no paid retrieval/code copied |
| [D2] | Modern Minimal theme preview · W | Original theme reference; no new license clearance |
| [S1] | Google localized-version documentation · W | Alternate-language discoverability guidance |
| [S2] | Google SoftwareApplication documentation · W | Rich-result properties and non-guarantee; do not invent price/reviews |
| [S3] | Google spam policies · W | Scaled low-value content caution |
| [S4] | W3C WCAG 2.2 reflow explanation · W | Future responsive/accessibility acceptance target |
| [B1] | App Radar legal notice · W | Owner/category statement, proprietary-content warning |
| [B2] | SplitMetrics about · W | Brand continuation/acquisition, company narrative |
| [B3] | App Radar tool terms · W | Proprietary-rights assertions; no independent legal conclusion |
| [B4] | USPTO TSDR exact record · B | Serial 90472728, registration 6606074, status, owner, goods/services directly read |
| [B5] | USPTO trademark search guidance · W | Official research entry; not a clearance search result |
| [B6] | EUIPO search · W failed | 502 during access; no EU registration conclusion |

### 16.4 Access failures and important inconsistencies

- AppKittie extraction returned 403 for home/sign-in; browser home rendered. Sign-in remained loading/sparse in the observation window. No access restriction was bypassed.
- Bare `appsupa.com` and `appaloma.com` were not reliably extracted; canonical `www` pages worked. Brand identities were established from the actual sites, not guessed from similarly named products.
- AppMagic's extracted home was empty. Browser rendering exposed its actual homepage and Sensor Tower acquisition notice; no current public pricing was established. Speculative `/home` and `/price` paths failed and were not used as evidence.
- GetAppNiche's bare app-subdomain root redirected to marketing; actual registration URL was obtained from rendered links and inspected. Hero “free niche” and workspace-registration actions have different destinations. Catalog counts and pricing-equivalent language vary across its own page.
- Peekly's animated pricing DOM included rolling digits and a promotion; the readable supporting annual text was recorded without inferring final checkout totals or renewal price.
- FoxData initial extraction omitted sections that appeared after browser hydration. Its official indie-page and trial-help card statements conflict. No purchase flow was used to resolve them.
- Several trial/app destinations were sparse/403 to extraction (AppTweak, App Radar, AppBrain, MobileAction); only the observable entry and public plan claims are recorded.
- Some deep-link attempts landed on image assets because link IDs differ by page. Those asset responses were discarded; no competitor assets were downloaded, reused or counted as feature evidence.
- Seasonal and regional offers were visible. They were not generalized to permanent pricing, nor used to approve AppRadar prices.
- Trademark serial was discovered through search and then verified in the official browser record. Third-party trademark summaries were not used as the legal finding.

## 17. Unresolved questions and validation requirements

### Decisions needed before implementation/publication

| Decision / question | Why it changes the recommendation | Responsible evidence / next step |
|---|---|---|
| Which initial real-data contexts will the beta actually expose? | Hero scope and first-session utility depend on it | Owner/product; recheck latest pilot and Cursor's subsequent market work |
| Are public storage/display and derived analysis authorized for each provider/store and field? | Public real previews/catalog/SEO remain gated | Owner/qualified review; retain per-provider/store basis; operator approval is not a license |
| What are beta access, limits, price, payment requirements and duration? | CTA/access FAQ cannot be finalized | Owner; do not infer a free plan from current auth code |
| Is signup intended to be open at launch, and what useful context can a new user access? | Must not drive visitors into empty contexts or imply an unavailable beta | Owner/product; define first research task |
| Which production origin/operator/support identity is approved? | Metadata, mail and accountable legal content require real facts | Owner; approve legal/contact and actual monitored channel |
| What is the qualified naming/trademark assessment for intended territories/services? | Brand acquisition investment and public presentation | Owner/counsel; §14 official evidence, no rename performed |
| Is the English-workspace handoff acceptable for Turkish visitors? | Current draft discloses it; full product localization is separate | Owner + Turkish user feedback |
| Are non-revenue store signals valuable enough for the intended audience? | Determines proposition viability, not just wording | Later interviews and actual research activation |
| Does a worked example improve understanding, and do visitors recognize it as synthetic? | Determines A vs interactive B | Later comprehension sessions; no claimed research participants in this report |
| What minimum observation coverage supports each promoted benefit? | Thin history can make Trending/Compare charts unhelpful | Product/data validation; retain contextual series/null rules |
| What analytics/consent/retention approach is approved? | Existing privacy draft says no analytics integration | Owner/privacy decision before implementation |
| Are new 21st.dev selections needed, and what are their licenses? | Existing primitives likely sufficient; no quota required | Later implementation records exact source/author/license; no blanket copying |

### Required validation in a later implementation task

- Re-read current source and capability notes before changing copy; this report is dated and another developer may be changing market intelligence.
- Validate proposed copy against the actual release, especially same-store Compare, Watchlist without alerts, conditional history, provisional thresholds, no revenue/download estimates, and actual beta scope.
- Verify synthetic fixtures contain no real app names/assets/data and no below-threshold statistics. Do not ship development-only real media in marketing screenshots.
- Inspect selected desktop/mobile layouts, keyboard/focus, native FAQ, chart alternatives, zoom/reflow, reduced motion, English/Turkish wrapping and the language handoff.
- Validate actual origin/locale metadata, accessible public routes, approved policy pages, auth destination and first meaningful research flow with an authorized account. No account was created for this research.
- Revisit critical competitor/access/price facts before publishing any named comparison. Do not present marketing statements as independent accuracy studies.
- Complete the existing production, content-rights and operator/legal gates independently; this document does not authorize flags, collection, migrations, deployment or pricing.

**Research completion boundary:** this document supplies the audit, 15-product evidence, strategy, concepts, complete bilingual draft and phased roadmap. No application implementation is included. Stop here for owner review; implementation requires a later instruction.

[C01-H]: https://www.appkittie.com/
[C01-P]: https://www.appkittie.com/pricing
[C01-B]: https://www.appkittie.com/blog
[C01-S]: https://www.appkittie.com/sign-in
[C02-H]: https://getappniche.com/
[C02-G]: https://getappniche.com/guides/find-profitable-ios-app-niches
[C02-S]: https://app.getappniche.com/auth/register
[C03-H]: https://appgazers.com/
[C03-T]: https://appgazers.com/tools
[C03-A]: https://appgazers.com/alternatives
[C04-H]: https://www.appsupa.com/
[C04-P]: https://www.appsupa.com/pricing
[C04-W]: https://www.appsupa.com/how-it-works
[C04-O]: https://www.appsupa.com/product/opportunities
[C04-S]: https://www.appsupa.com/sign-up
[C04-L]: https://www.appsupa.com/terms
[C05-H]: https://www.appaloma.com/
[C05-P]: https://www.appaloma.com/pricing
[C05-R]: https://www.appaloma.com/research
[C05-T]: https://www.appaloma.com/is-there-an-app
[C05-S]: https://www.appaloma.com/sign-in
[C06-H]: https://peekly.app/
[C06-P]: https://peekly.app/pricing
[C06-U]: https://peekly.app/use-cases/find-app-idea
[C06-S]: https://peekly.app/signup
[C07-H]: https://trendapps.dev/
[C07-M]: https://trendapps.dev/methodology/
[C07-S]: https://trendapps.dev/auth/
[C08-H]: https://sensortower.com/
[C08-P]: https://sensortower.com/product/mobile-app/app-performance-insights
[C08-R]: https://sensortower.com/responsibly-sourced-data
[C08-D]: https://sensortower.com/demo
[C08-S]: https://app.sensortower.com/users/sign_up
[C09-H]: https://appmagic.rocks/
[C09-C]: https://appmagic.rocks/top-charts/apps
[C10-H]: https://appfigures.com/
[C10-P]: https://appfigures.com/platform/pricing
[C10-E]: https://appfigures.com/products/explorer
[C10-I]: https://appfigures.com/products/app-intelligence
[C10-S]: https://appfigures.com/signup
[C11-H]: https://www.apptweak.com/en
[C11-P]: https://www.apptweak.com/en/pricing
[C11-M]: https://www.apptweak.com/en/market-intelligence
[C12-H]: https://www.mobileaction.co/
[C12-P]: https://www.mobileaction.co/pricing/
[C12-U]: https://www.mobileaction.co/for/marketing-teams/
[C12-S]: https://insights.mobileaction.co/register
[C13-H]: https://appradar.com/
[C13-P]: https://appradar.com/pricing
[C13-I]: https://appradar.com/app-market-intelligence
[C13-S]: https://start.appradar.com/
[C14-H]: https://www.appbrain.com/
[C14-P]: https://www.appbrain.com/product/intelligence-pricing
[C14-O]: https://www.appbrain.com/product
[C14-S]: https://www.appbrain.com/dev_dashboard?place=page%3Dsubscriptions
[C15-H]: https://foxdata.com/en/
[C15-P]: https://foxdata.com/en/pricing/
[C15-U]: https://foxdata.com/en/aso-tools-app-analytics-for-indie-developers/
[C15-T]: https://foxdata.com/en/free-aso-tools/
[C15-S]: https://foxdata.com/en/user/register/
[C15-F]: https://help.foxdata.com/en/articles/8504310-free-trial
[D1]: https://21st.dev/community/components
[D2]: https://21st.dev/@serafimcloud/themes/modern-minimal
[S1]: https://developers.google.com/search/docs/specialty/international/localized-versions
[S2]: https://developers.google.com/search/docs/appearance/structured-data/software-app
[S3]: https://developers.google.com/search/docs/essentials/spam-policies#scaled-content-abuse
[S4]: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
[B1]: https://appradar.com/legal-notice
[B2]: https://splitmetrics.com/about/
[B3]: https://appradar.com/tool-terms-of-service
[B4]: https://tsdr.uspto.gov/#caseNumber=90472728&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch
[B5]: https://www.uspto.gov/trademarks/search
[B6]: https://euipo.europa.eu/eSearch/
[R1]: /Users/aft/appradar/APPRADAR.md
[R2]: /Users/aft/appradar/docs/CONTENT_USAGE.md
[R3]: /Users/aft/appradar/docs/BETA_READINESS.md
[R4]: /Users/aft/appradar/src/components/landing/landing-page.tsx
[R5]: /Users/aft/appradar/src/lib/landing/dictionaries.ts
[R6]: /Users/aft/appradar/src/components/landing/product-preview.tsx
[R7]: /Users/aft/appradar/src/lib/landing/metadata.ts
[R8]: /Users/aft/appradar/src/lib/auth/paths.ts
[R9]: /Users/aft/appradar/docs/AUTH_SETUP.md
[R10]: /Users/aft/appradar/src/lib/intel/market.ts
[R11]: /Users/aft/appradar/src/lib/intel/compare.ts
[R12]: /Users/aft/appradar/src/components/core/explorer.tsx
[R13]: /Users/aft/appradar/src/lib/ui/catalog.server.ts
[R14]: /Users/aft/appradar/src/app/globals.css
[R15]: /Users/aft/appradar/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
[R16]: /Users/aft/appradar/src/components/landing/public-chrome.tsx
[R17]: /Users/aft/appradar/docs/screenshots/appradar-local.png
