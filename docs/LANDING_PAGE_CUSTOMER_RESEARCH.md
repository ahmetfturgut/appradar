# AppRadar: landing page customer research, positioning and creative differentiation

Status: independent research for owner review. Nothing in this document has been implemented.
Prepared: 27 November 2026. All web sources accessed 27 November 2026.
Scope: voice of customer, segments, jobs to be done, competitor experience gaps, creative concepts, positioning, copy (EN + TR), conversion, trust and prioritisation.
Out of scope: competitor website architecture, visual design, SEO audit. Codex covers those separately; this report did not read Codex's work.

Evidence labels used throughout:

- **[E] Evidence**: what a public source says, paraphrased, with a link in §16.
- **[I] Interpretation**: my reading of the evidence.
- **[H] Hypothesis**: needs an experiment or interviews before anyone relies on it.
- **[R] Repository fact**: checked in this repository on 27 November 2026.

---

## 1. Executive summary

1. **The pain is real, repeated and emotional: "I built it well and nobody came."** Indie builders keep describing the same loop: idea, build, polish, launch, silence. They blame skipping competitor and market research, not their code ([E] O1, O3, O7, O18). AI coding has made building faster, which makes the cost of picking the wrong idea matter *more* ([E] O16, O17).
2. **The market of "idea tools for indies" is filling up fast, and nearly all of them sell certainty.** Niches Hunter, RightIdea, Do Better, GapHunt, BigIdeasDB, Appark, AppIdeaHub, BuildNextApp and others promise revenue estimates, AI-generated ideas or "untapped niches" ([E] O7, O9, O11, O28). Leading the landing page with "Discover your next great app idea" puts AppRadar in that crowd with less to offer: no revenue figures, no AI ideas.
3. **Revenue and download estimates are weakest exactly where indie developers work.** AppMagic says its own estimates for apps under roughly 30K downloads or $30K a month should be treated cautiously. Appfigures reports that about 80% of apps with any meaningful downloads get under 10K a month ([E] O24, O25). Some users find enterprise methods opaque ([E] O12), though one modeller disputes this ([E] O13). [I] AppRadar's refusal to estimate is a credible position, not a missing feature, *if the page explains why*.
4. **AppRadar's most differentiated capability is missing from its landing page.** [R] Market Insights and Opportunity Finder compute six transparent cohort indicators (Quality Gap, Neglected Competitors, Newcomer Presence, Developer Concentration, Incumbent Strength, Pricing Landscape). Each shows its numerator, denominator, sample size and caveat, and a value is withheld when the sample is too small. The current landing page features describe search, filters, chart changes and rating history, but never these indicators.
5. **Recommended positioning: an evidence-first pre-build market check for indie mobile developers.** Core line: *"Check the market before you write the code."* The page's proof should be that AppRadar shows its work: sources, dates, sample sizes, and what it refuses to guess.
6. **Primary launch segment: technically capable indie developers and solo founders who are choosing what to build next** and have been burned before, or fear being burned. They are not ASO teams with live apps (well served by Appfigures, AppTweak and MobileAction), and not enterprise analysts (Sensor Tower, AppMagic).
7. **Constraints that shape everything:** third-party content rights are `unconfirmed` ([R] CONTENT_USAGE.md), so every public demo must use clearly labelled synthetic data. Ranking history is not yet real (single chart observation, [R] §6.28). Review text, alerts, AI summaries, own-app analytics and pricing do not exist yet and must not be advertised.
8. **Name risk:** an established ASO product called **App Radar** (now part of SplitMetrics) exists ([E] O29). This affects search visibility, confusion and possibly trademark. It is an owner and legal decision, flagged in §17.

---

## 2. Research methodology

**Repository review [R].** Read: `APPRADAR.md` (product spec, data sources, §6.16–6.18 features, §6.28 pilot), `docs/CONTENT_USAGE.md`, `docs/BETA_READINESS.md`, `src/lib/landing/dictionaries.ts` (EN + TR landing copy), `src/components/landing/*`, `src/lib/intel/market.ts` (indicator definitions and thresholds) and the route list under `src/app`. No code was run, built or changed.

**Public research.** Sources:

- Hacker News: thread pages, plus the public HN Algolia search API for comments 2012–2026 on Sensor Tower, Appfigures, app ideas, validation and vibe-coded clones.
- Indie Hackers posts and comment threads.
- Product Hunt product pages.
- Vendor documentation and data posts (AppMagic, Appfigures, Sensor Tower).
- Review-site aggregates (G2, Capterra, Software Advice), reached through web search result summaries.

**Limitations (important):**

- **Reddit could not be accessed.** The search tool refuses reddit.com, and the in-app browser blocks reddit.com and old.reddit.com. Reddit is probably the largest single venue for this conversation, so this report under-samples it. A manual Reddit pass by the owner is recommended (§17).
- **Capterra served a bot check.** It was not bypassed. G2 and Capterra findings come from search-engine summaries of those pages, including G2's AI-generated pros and cons. Treat them as medium-to-low confidence. Review counts are as reported by the summaries.
- **Many posts are self-promotional.** Indie Hackers and Product Hunt posts often come from makers of competing tools. They are still useful evidence of the *problem framing* that resonates and of competitor messaging. They are not neutral evidence of demand. Each is marked "vendor-affiliated".
- **Sample size is small.** Some HN comments are old (2012–2014) and are used only as historical context for long-standing workflows.
- **The evidence is qualitative.** Nothing here measures market size or conversion rates.

---

## 3. Voice of customer findings

### 3.1 Observation log

Each row: source, date, problem, motivation, workaround, unmet need and relevance. URLs are in §16. Paraphrased; nothing is presented as consensus.

| # | Source / date | Customer problem [E] | Motivation [E] | Existing workaround [E] | Unmet need [I] | Relevance to AppRadar [I] |
|---|---|---|---|---|---|---|
| O1 | Indie Hackers, "I Keep Building Apps Before Validating", 23 Jan 2026 (39 upvotes, 81 comments; vendor-affiliated: Do Better) | Several products worked technically but failed commercially. The author says they skipped competitor research, user complaints and willingness-to-pay checks | Stop being "fast at building the wrong thing" | Gut feeling, building for self; now building a review-analysis tool | Structured, fast competitor understanding before building | **High.** This is the target emotion and story |
| O2 | Same thread, commenter, 23 Jan 2026 | Competitor research feels tedious, so founders skip it because building is more fun | Save months | Building in public, talking to users | Make research feel as quick and satisfying as building | **High.** Supports a "minutes, not months" framing |
| O3 | Indie Hackers, Daji Labs, 25 Aug 2026 (vendor-affiliated: RightIdea) | An experienced multi-app shipper still has stretches of not knowing what to build next. Combing reviews, Reddit and search volume by hand "drove me crazy" | Avoid expensive wrong ideas | Manual review reading, Reddit, search volume, asking AI | One place to see market signals | **High.** Matches the "what next?" job |
| O4 | Same thread, commenter, 4 Sep 2026 | Validating that a problem exists differs from validating that *this person* should pursue it (skills, time, budget, reach) | Reduce uncertainty enough to know what to test next | n/a | Tools that help decide the *next test*, not promise certainty | **Very high.** This is almost exactly AppRadar's honest value |
| O5 | Same thread, commenter, 25 Aug 2026 | Polite feedback is noise. Money signals matter more | Real signal | Deposit or pre-sale page | Better signals before build | Medium. AppRadar complements this; it is not a substitute |
| O6 | Indie Hackers, "How do you validate mobile app ideas?", 15 Oct 2024 | Doesn't know how to find what people search for *inside* the app stores | Native store distribution | Web keyword research | Store-native demand clues | Medium. Keyword data is partial today ([R] ASO Keyword Intel, advanced ASO UI is later phase) |
| O7 | Indie Hackers, 12 Mar 2026 (vendor-affiliated: Niches Hunter) | Lost six months to an app nobody wanted | Find narrow niches, set prices, project revenue | Paid niche tool with revenue estimator | Niche discovery | [I] Shows competitors lead with revenue projection. AppRadar can't and shouldn't copy this |
| O8 | Hacker News, MoOk-OSC, ~Apr 2026 | Built an app for a niche that seemed too small for anyone else. By completion there were three competitors. Builder friends said "don't tell me what to make, tell me how to get users" | Find genuine white space; avoid red oceans | Built a private app corpus and queried it | (a) Pre-build competition check; (b) re-checking a niche *during* the build | **High.** Supports the watchlist and "re-check" concepts. Also a warning that launched devs want distribution help |
| O9 | Hacker News, OmPatel5, 16 Jul 2025 (vendor-affiliated: BigIdeasDB) | Wants overlooked problems in existing apps | Find apps users are unhappy with | Scraped and AI-clustered 50K negative reviews | Complaint-driven gap finding | Medium. AppRadar's Quality Gap is a rating-level proxy; review text display is disabled ([R]) |
| O10 | Hacker News comment, 1 Jul 2022 | Idea came from reading many negative competitor reviews | Build a better alternative | Manual reading of store reviews | Faster path to "who is disappointing users" | Medium–High. Matches Quality Gap and Neglected Competitors |
| O11 | Hacker News, Appark maker, 31 Dec 2025 (vendor-affiliated) | Early-stage market research needs to happen without expensive enterprise tools | Research before building | Free tool | Affordable research | [I] Price gap is real, and free competitors exist. Price alone won't differentiate |
| O12 | Hacker News comment, 10 Jul 2020 | Sensor Tower methods described as opaque. Asks how anyone can trust them | Trust in numbers | n/a | Transparent methodology | **High.** Supports "shows its work" |
| O13 | Hacker News comment, 19 Sep 2019 | Counter-evidence: someone who says they build such models claims small-app US estimates are very precise | n/a | n/a | n/a | Important balance: don't claim competitors are "wrong". Say AppRadar chooses not to estimate |
| O14 | Hacker News comment, 25 Mar 2026 | Uses Sensor Tower to quote an app's monthly revenue | Curiosity: "how much does this make?" | Sensor Tower public pages | Revenue curiosity is strong | [I] Visitors will ask "where are the revenue numbers?" The page must answer this before they leave |
| O15 | Hacker News comment, 4 Jul 2022 | Calls Sensor Tower "pretty accurate" for checking how much apps make | Proof that small apps can earn | Sensor Tower | Same as O14 | Same as O14. Some audience trusts estimates |
| O16 | Hacker News comment, 8 Apr 2026 | Indie in creative photo/video tools: copycat vibe-coded clones flood the store once an app gets traction | Defend or choose a niche | n/a | Watch newcomer activity in a niche | **High.** Newcomer Presence plus watchlist |
| O17 | Hacker News comment, 17 Jun 2026 | Cheaper code means more failures unless ideas are validated. Store app counts rise while usage doesn't | Validation matters more in the AI era | n/a | Fast pre-build checks | **High.** Supports the "code is cheap now, picking is the hard part" message |
| O18 | Hacker News post, 7 Apr 2026 | Idea to App Store felt plannable; launch to traction did not | Predictability | n/a | Earlier market signals | Medium |
| O19 | Hacker News comment, 16 Aug 2020 | Workout app idea; worried the market is over-saturated after seeing hundreds of Play results | Avoid crowded markets | A quick store search | Something beyond "count search results" | **High.** Developer Concentration and Incumbent Strength answer "is it crowded?" better than a result count |
| O20 | Hacker News comment, 12 Mar 2012 | Built a personal iTunes Search API script for market research before going indie | Market research | DIY scripts | Ready-made research workspace | Context only (old). Shows a long-standing DIY habit |
| O21 | Hacker News comment, 9 Oct 2014 | Uses Appfigures but wants keyword data in the same tool; too many services; won't pay without seeing the interface | Consolidation; low-risk evaluation | Multiple subscriptions | See the product before paying | Context (old). Still supports a visible, labelled product demo on the page |
| O22 | G2 aggregate for AppTweak (via search summary), 2026 | Reviewers cite a difficult learning curve (~11 reviews), high cost for small companies (~11), and data inaccuracy (~19 on a comparison page) | Professional ASO | Paid ASO suite | Simpler, cheaper, clearer data | Medium. ASO teams are not the primary segment, but "complexity" and "trust in data" recur |
| O23 | Capterra / Software Advice review of MobileAction (via search summary) | Interface needs simplifying; every first-time user at the reviewer's company asked basic questions | ASO / ads | Vendor support | Low-learning-curve onboarding | Medium. Supports a "first useful answer in minutes" promise |
| O24 | AppMagic documentation (vendor self-disclosure) | Advises caution on revenue and download estimates for apps under ~30K downloads or ~$30K revenue a month; says estimates for apps under ~$10K or ~10K downloads a month are hardly reliable | n/a | n/a | Honest data for small markets | **Very high.** Independent support for AppRadar's no-estimate stance |
| O25 | Appfigures "By the Numbers", 14 Jul 2023 | Among apps with 100+ monthly downloads, about 80% get under 10K downloads a month | n/a | n/a | n/a | Combined with O24, indie-scale apps sit where estimates are weakest [I] |
| O26 | Sensor Tower pricing (Capterra "contact vendor"; Vendr and Sonar third-party estimates) | No public self-serve pricing; third parties report five-figure annual contracts | Enterprise intelligence | n/a | Indie-scale access | Medium. Price gap confirmed, but AppRadar pricing is unapproved; don't use price as the hero |
| O27 | Appfigures pricing / reviews (via search summaries) | One G2 reviewer calls price too high for personal use; per-app add-on charges reported | Own-app tracking | Paid tiers | n/a | Low–Medium |
| O28 | Product Hunt, GapHunt (2026) | Tool mines 1★–2★ App Store reviews for gaps; maker says Google Play is not covered yet | Build from bad reviews | n/a | n/a | [I] Review mining is becoming crowded. It's a P3 product idea for AppRadar, not a launch message |
| O29 | Capterra / G2 / PocketGamer: App Radar (SplitMetrics) | An established ASO product shares the name "App Radar" | n/a | n/a | n/a | **Brand risk** (§17) |

### 3.2 Synthesis

**Direct evidence [E]:**
- Builders report losing months to products without demand and attribute it to skipped research (O1, O3, O7).
- Manual research (reviews, Reddit, store searches, DIY scripts) is described as tedious or maddening (O2, O3, O20).
- Some users distrust opaque estimates (O12); others trust them (O13, O15).
- Vendors themselves caution about small-app estimates (O24).
- Indie developers in 2026 report clone floods and rising app counts (O16, O17).

**Interpretation [I]:**
1. The core job is **reducing the risk of a wrong commitment**, not "finding an idea". Ideas are abundant; confidence is scarce (O4, O8).
2. "Is it crowded?" is the most common gut question, and today people answer it badly by counting search results (O19).
3. The audience is split on estimates. AppRadar should neither attack competitors' estimates nor fake its own. It should **explain its choice** and point to what it measures instead.
4. Because AI-era building is cheap, a pre-build check's value proposition is getting stronger (O16, O17).
5. Builders who already launched want users and ASO, not new ideas (O8). That's a different product.

---

## 4. Customer segments

| Segment | Primary goal | Main frustration | Current workflow | Alternatives | Buying motivation | Objections | WTP signals | Desired outcome | Most compelling message |
|---|---|---|---|---|---|---|---|---|---|
| **S1. Pre-build indie developer / solo founder** (can ship, choosing next project) | Pick a project worth months of evenings | Prior launches got silence; research is tedious and scattered | App Store search, competitor pages, Reddit, reviews, gut | Free tools (Appark), niche tools (Niches Hunter, GetAppNiche), manual | Avoid repeating a failed launch | "No revenue numbers?" "Is the data real or complete?" "Another idea tool?" | Indie tool prices cluster from free to ~$40/month (GetAppNiche $39/mo; Appfigures entry $9.99) [E, search summaries]. No AppRadar-specific evidence | Confident go / narrow / drop decision and a shortlist of competitors to study | "Check the market before you write the code." |
| **S2. Small mobile studio** (2–10 people, portfolio thinking) | Choose the next category to enter | Enterprise tools too expensive; time spent on desk research | Mix of Appfigures/AppTweak plus spreadsheets | AppTweak, MobileAction, AppMagic (from ~$150/mo) | Faster category scans across stores | Coverage breadth; team features; export | Pays $69–150+/mo for ASO and intel tools [E] | Category shortlist with comparable signals | "Compare categories on the same honest terms." |
| **S3. Launched indie developer watching competitors** | Grow their own app | Wants users and ASO, not ideas (O8) | Appfigures, App Store Connect, ASO tools | Appfigures, AppTweak, App Radar, MobileAction | Competitive alerts, keyword ranking | AppRadar has no own-app analytics, alerts or advanced ASO UI yet [R] | Pays for ASO | More installs | Secondary; don't target at launch |
| **S4. AI-era / vibe-coding builders** (fast builders, often non-traditional devs) | Ship something people want, fast | Clone floods; overwhelming choice | AI idea generators, trend lists | BuildNextApp, AppIdeaHub, GapHunt | Speed | Low patience for nuance; low WTP | Weak [H] | A quick "go / no-go" | "Code is cheap now. Choosing is the hard part." Good acquisition message, weak payer [H] |
| **S5. Product researchers / analysts at startups** | Context for planning | Numbers mean different things across tools | Mixed tools and decks | Sensor Tower, data.ai | Shareable, sourced facts | Coverage limits | Enterprise budgets elsewhere | Defensible evidence | Later segment |

**Recommendation: target S1 at launch.** Its pain is the best evidenced (O1–O4, O7, O8, O19). AppRadar's existing features answer its questions (crowdedness, leader quality, staleness, newcomers, pricing). And it is the segment for whom "no revenue estimates" hurts least once it's explained, because O24/O25 suggest estimates are weakest at its scale. S4 is the best *top-of-funnel* audience for content, but don't build the page for it. Deprioritise S3 until alerts and ASO exist.

---

## 5. Jobs to be done

| Job (customer's words) | Functional | Emotional | Practical | What AppRadar can do today [R] | Gap / honesty note |
|---|---|---|---|---|---|
| "What should I build next?" | Narrow from many categories to a few | Escape idea paralysis (O3) | Limited evenings | Opportunity Finder lists cohorts with the six indicators side by side; Explorer and New Releases help with browsing | No AI idea generation and no composite "best niche" score, by design |
| "Is this idea worth pursuing?" | Check the competitive landscape for a concept | Fear of wasting months (O1, O7) | Decide before writing code | Search for the concept, open the category cohort, read the indicators, compare up to 3 apps | Can't measure demand or revenue. Say so, and point to interviews and pre-sales (O5) |
| "Is this market too competitive?" | Gauge concentration and incumbent strength | Avoid being crushed | Quick answer | Developer Concentration (share of tracked apps held by the top 3 developers) and Incumbent Strength (median rating count, P25–P75) | Rating counts are not downloads. The UI already says so |
| "Are competitors outdated?" | Find stale leaders | Hope: "I can do better" | Target a weak spot | Neglected Competitors (last store update older than ~12 months) | An old update can also mean a stable app. The caveat already exists in `INDICATOR_INFO` |
| "Are users dissatisfied?" | Find low-rated incumbents | Same hope | Pick a wedge | Quality Gap (share with known rating below 4.0); rating history per app | No review text display (disabled by rights flags); no sentiment mining |
| "Is anyone else entering right now?" | Check newcomer activity | Fear of clone floods (O8, O16) | Timing | Newcomer Presence; New Releases (iOS new-app chart plus known release dates); Watchlist to re-check later | No alerts. Re-checking is manual |
| "How are competitors priced?" | Pricing benchmark | Avoid underpricing (O7) | Set price | Pricing Landscape (free share; paid price quartiles per currency) | Download price excludes IAP and subscriptions; the UI says so |
| "How do I avoid wasting months?" | A repeatable pre-build routine | Relief, control | Fits into a weekend | Combination of the above, plus shareable compare URLs | Needs a guided path (onboarding / landing walkthrough), not a new capability |

---

## 6. Competitor weaknesses (customer experience view)

| Competitor | Customer-reported weakness | Evidence strength | Gap AppRadar can realistically address |
|---|---|---|---|
| Sensor Tower | No public self-serve pricing; third parties report five-figure annual contracts (O26). Some users describe the methodology as opaque (O12); others trust it (O13, O15) | Medium (third-party pricing, anecdotal trust) | Indie-scale access; transparent definitions. **Don't** claim its estimates are wrong |
| AppMagic | Premium from ~$150/month per search summaries. Its own guidance cautions that small-app estimates are unreliable (O24) | Medium–High (vendor's own docs) | Signals that don't depend on estimation for small apps |
| Appfigures | Tier ladder and per-app charges; one reviewer says too expensive for personal use; "data inaccuracy" appears as a top con on a G2 comparison page (O27) | Low–Medium | Pre-build research (Appfigures centres on own-app analytics and ASO) |
| AppTweak | Learning curve, cost for small teams, estimate accuracy concerns (O22) | Medium (G2 aggregates) | Simplicity: a first useful answer without ASO expertise |
| MobileAction | Interface complexity; first-time users needed help (O23) | Low–Medium (single reviews) | Guided first-run research |
| App Radar (SplitMetrics) | Price can feel high and some bugs (G2 AI summary, O29) | Low | Different job (ASO vs pre-build). Name collision matters more than the weakness |
| Emerging indie tools (Niches Hunter, RightIdea, Do Better, GapHunt, BigIdeasDB, Appark, AppIdeaHub, BuildNextApp, GetAppNiche) | Self-described: AI-generated ideas, revenue estimators, "untapped niches"; some single-store coverage (O28); one maker admits limited certainty (O3) | Medium (maker statements) | **Trust**: definitions, denominators, withheld small samples, store/country context, both stores |

**Gaps validated across sources [I]:**
1. **Complexity.** ASO suites are built for specialists (O22, O23).
2. **Missing pre-build workflow.** Incumbents centre on apps you already own. Emerging tools jump straight to "here's your idea", skipping a transparent check.
3. **Opaque metrics.** Estimates without visible inputs (O12), with vendors' own caveats buried in docs (O24).
4. **Price mismatch.** Enterprise tools vs indie budgets (O11, O26). Free alternatives exist, so price is a weak lone differentiator.
5. **Unsupported "opportunity" claims.** The category is drifting toward promises AppRadar must not make.

---

## 7. Unmet market needs

1. **A trustworthy answer to "how crowded is this?"** that beats counting search results (O19). AppRadar has the indicators [R].
2. **"Tell me what you don't know."** Explicit coverage, freshness and withheld values (O12, O24). AppRadar has this deeply built in [R]. The landing page hides it.
3. **A short, repeatable pre-build routine** that fits a weekend (O2, O4). This needs a guided workflow, mostly a landing and onboarding job.
4. **Re-checking a niche while building** (O8, O16). Partially met by Watchlist; alerts are future work.
5. **Complaint-level insight** (O9, O10, O28). Blocked by review-content rights. Future work.
6. **Store-native demand signals** (O6). Partial keyword observations exist; advanced ASO is later phase [R].

---

## 8. Creative differentiation ideas

Effort scale: **S** ≤ 2 days, **M** 3–7 days, **L** > 1 week (solo developer, estimates [H]). Data note for all public concepts: rights are `unconfirmed` [R], so **synthetic, clearly labelled data only**. Real catalog data can appear only behind sign-in under the existing gates, and nothing public.

### 8.1 "The six-question market check" (interactive synthetic cohort)
- **Problem:** visitors can't picture what "market research" means in practice (O2, O19).
- **Why different:** competitors show dashboards. This shows *questions answered*: Is it crowded? Are leaders stale? Do users rate them well? Is anyone new arriving? How is it priced? Who dominates?
- **How:** a single fictional category ("Synthetic sample: Habit trackers, US") with six cards. Each card shows the value, its numerator and denominator, and a "What this does **not** mean" toggle that reuses the caveats in `INDICATOR_INFO`.
- **User value:** understands the product in 30 seconds. **Conversion potential:** high [H].
- **Effort:** S–M; reuses `market.ts` with demo data. **Maintenance:** low. **API cost:** none.
- **Data:** synthetic only. **New capability:** no.

### 8.2 "Every number shows its work" (number anatomy hover)
- **Problem:** distrust of opaque metrics (O12).
- **Why different:** competitors hide methodology in docs. Here it's the hero interaction.
- **How:** hovering or tapping any number in the preview reveals source type, observation date, store/country/language, sample size and coverage.
- **Value:** trust. **Conversion:** medium–high [H]. **Effort:** S. **Maintenance:** low. **Cost:** none. **Data:** synthetic. **New capability:** no; mirrors existing freshness and coverage metadata.

### 8.3 "Withheld, not invented"
- **Problem:** fear that tools fabricate (O12, O24).
- **Why different:** no competitor shows a tool *refusing* to answer.
- **How:** a synthetic tiny cohort where an indicator shows "Insufficient data: 3 known ratings (minimum 5)". The copy explains why showing nothing beats a confident guess.
- **Value:** memorable proof of honesty. **Conversion:** medium [H]. **Effort:** S. **Cost:** none. **New capability:** no (`minSample` already exists).

### 8.4 "Why there are no revenue numbers here" explainer
- **Problem:** revenue curiosity (O14, O15) is a top exit risk.
- **Why different:** turns the biggest objection into a credibility moment.
- **How:** short section with a simple diagram. Small apps rarely appear in top charts, and chart-based estimates get weaker as apps get smaller. Paraphrase industry sources and link them; avoid naming competitors in a way that reads as an attack (legal review).
- **Value:** objection handled. **Conversion:** high for S1 [H]. **Effort:** S. **Cost:** none. **New capability:** no.

### 8.5 Free "Pre-build research brief" generator (no data)
- **Problem:** no routine (O4: "know what to test next").
- **Why different:** useful without signing up or seeing any store data. A take-away artefact.
- **How:** visitor names an idea, a store and a target user. The page produces a checklist: what to check in AppRadar (the six questions, which competitors to compare) and what *only users can tell you* (interviews, pre-sale page, per O5). Rendered client-side. Optional "save it to your account" as the conversion step.
- **Value:** high. **Conversion:** medium–high; gives a reason to register [H]. **Effort:** M. **Maintenance:** low. **API cost:** none (no LLM needed, templated). **Data:** none. **New capability:** small (landing-only form; saving needs a simple table, so treat that as optional).

### 8.6 "Build, narrow or walk away?" decision simulator
- **Problem:** visitors don't know how to *interpret* signals.
- **Why different:** educational game rather than a feature tour.
- **How:** three synthetic categories with different indicator profiles. The visitor picks a decision, then sees how a researcher might reason about it, with caveats and no "correct answer" verdict on business success.
- **Value:** teaches the method. **Conversion:** medium [H]; memorable and shareable. **Effort:** M. **Maintenance:** low. **Cost:** none. **New capability:** no.
- **Risk:** must avoid implying predictions. The framing is "questions to ask next".

### 8.7 Path chooser: "Where are you right now?"
- **Problem:** mixed audiences (S1 vs S3).
- **How:** three chips: *Looking for my next idea* / *Checking an idea I have* / *Keeping an eye on competitors*. The choice reorders sections and adjusts the hero subline. The third path honestly says what's not there yet (alerts).
- **Value:** relevance. **Conversion:** testable [H]. **Effort:** M. **Cost:** none. **New capability:** no.

### 8.8 "When AppRadar is the wrong tool" (anti-pitch)
- **Problem:** skepticism toward marketing claims.
- **How:** a short honest list:
  - Need revenue or download estimates → enterprise intelligence tools.
  - Need your own app's analytics → App Store Connect / Play Console.
  - Need keyword rank tracking → ASO tools.
  - Need to know if people will pay → talk to them.
- **Value:** trust. **Conversion:** [H], may raise qualified sign-ups. **Effort:** S. **Cost:** none.

### 8.9 Public methodology and "known gaps" ledger
- **Problem:** no customers yet, so trust must come from transparency.
- **How:** a public page listing indicator definitions and thresholds (from `MARKET_THRESHOLDS`), freshness rules (72h stale), what is never inferred (§6.1 of the spec), and a dated changelog of coverage, e.g. "Currently strongest: US / English, selected categories".
- **Value:** credibility; SEO for "app market research methodology" [H]. **Effort:** S–M. **Maintenance:** low–medium (keep it in sync). **Cost:** none. **New capability:** no.

### 8.10 Founder research log (build-in-public)
- **Problem:** no social proof.
- **How:** short dated notes from the founder: why AppRadar refuses to estimate revenue, how it decides when to withhold a value, what was learned in the pilot. Synthetic or aggregate-only; no third-party store content.
- **Value:** human trust; matches IH culture (O2 commenter used build-in-public). **Effort:** S per post. **Maintenance:** ongoing. **Cost:** none.

### 8.11 "Re-check your niche while you build" story
- **Problem:** competitors appear mid-build (O8, O16).
- **How:** a three-frame synthetic timeline (Week 1, Week 6, Week 12) showing Newcomer Presence rising in a watchlisted category. Copy: save the category, come back and look again.
- **Value:** retention reason. **Conversion:** medium [H]. **Effort:** S. **Cost:** none.
- **New capability:** no for manual re-check. **Must not imply alerts.**

### 8.12 "Same idea, two stores" split view
- **Problem:** devs assume iOS and Play markets look alike.
- **How:** synthetic side-by-side showing that the same category can have different concentration and pricing on each store, while store, currency and country are never mixed.
- **Value:** shows both-store strength and data integrity. **Effort:** S. **Cost:** none. **New capability:** no.

### 8.13 "The 20-minute pre-build routine" walkthrough (video or step GIF)
- **Problem:** "how would I actually use this?"
- **How:** a narrated, clearly labelled synthetic walkthrough: pick store and country → open category cohort → read the six questions → compare 3 apps → save to watchlist → write down what to test with users.
- **Value:** clarity. **Conversion:** high [H]. **Effort:** M (recording). **Maintenance:** re-record on UI change. **Cost:** none.

### 8.14 "Code is cheap now. Choosing is the hard part." editorial section
- **Problem:** AI-era clone floods (O16, O17).
- **How:** short manifesto-style section connecting cheaper code to higher idea risk. No statistics unless sourced.
- **Value:** timely framing; good for S4 acquisition [H]. **Effort:** S. **Cost:** none.

**Ranking for a solo developer (value ÷ effort):** 8.1, 8.2, 8.4, 8.3, 8.8, 8.9, 8.13, 8.5, 8.11, 8.12, 8.7, 8.6, 8.10, 8.14.

---

## 9. Positioning alternatives

| | A. App idea discovery | B. Market validation | C. Competitor research | D. Opportunity discovery | E. Evidence before code (developer decision-making) | F. Honest market intelligence |
|---|---|---|---|---|---|---|
| **Core promise** | Find your next app idea | Know if your idea is viable | Know your competitors deeply | Spot overlooked gaps | Make the build decision with evidence, not a hunch | Market data that shows its work |
| **Audience** | S1, S4 | S1 | S1, S2, S3 | S1, S2 | S1 (primary), S2 | S1, S2, S5 |
| **Hero headline** | Discover your next great app idea. (current) | Validate your app idea before you build it. | See exactly what you're up against. | Find the gaps others are missing. | Check the market before you write the code. | App market research that shows its work. |
| **Supporting headline** | Explore both stores and research what to build. | Store signals on competition, quality and pricing. | Compare competitors' ratings, pricing, updates and rankings. | Spot stale leaders and low-rated categories. | See how crowded, well rated and current a category is, with the source, date and sample size behind every number. | Every number comes with its source, date, sample size and limits. |
| **Primary CTA** | Get started | Validate my idea | Research competitors | Find opportunities | Start your market check | Explore the method |
| **Emotional appeal** | Excitement | Reassurance | Control | Hope / greed | Relief and control: no more months wasted | Trust |
| **Differentiation** | Weak: crowded (O7, O28) | Medium; "validate" overpromises | Medium; incumbents own it | Weak; risks guarantee language | **Strong**: fits evidence (O1–O4, O17) and AppRadar's integrity design | Strong but abstract; better as proof than as promise |
| **Weaknesses** | Implies idea generation AppRadar doesn't do | "Validation" implies demand proof AppRadar can't give | Mainly a post-launch job; S3 not served | Conflicts with "no guaranteed opportunities" rule | Needs a clear demo to avoid sounding generic | Doesn't say what job it does |
| **Evidence** | Competitors use it; no AppRadar-specific edge | O1, O7 | O1, O10 | O9, O10 | O1–O4, O8, O16, O17, O19 | O12, O24 |

## 10. Recommended positioning

**Primary: E, "Evidence before code".** AppRadar is the pre-build market check for indie mobile developers. **F, "shows its work"**, is the proof pillar that makes E believable. Keep "opportunity" language inside the product's existing, caveated names (Opportunity Finder) and never in the promise.

Positioning statement (internal):
> For indie mobile developers deciding what to build next, AppRadar is the market check you run before writing code. It turns public App Store and Google Play listing data into a few clear signals about a category: how crowded it is, how well users rate the leaders, how current they are, who is arriving and how it's priced. Every number carries its source, date and sample size. Unlike idea generators and estimate-driven tools, AppRadar never invents revenue, downloads or "guaranteed niches". It tells you what the stores show and what still needs testing with real users.

Why: it addresses the most evidenced pain (wasted months). It uses features that exist. It turns the biggest limitation (no estimates) into credibility. And it's distinct from the crowded "find your idea" claims.

---

## 11. English marketing copy

All copy avoids claims about profitability, revenue, downloads, alerts, pricing or guaranteed outcomes.

### 11.1 Hero headlines (10)
1. **Check the market before you write the code.** ← recommended
2. Know what you're walking into before you build.
3. Your next app deserves more than a hunch.
4. Months to build. Minutes to check first.
5. Pick your next app with your eyes open.
6. See how crowded a category really is, before you commit.
7. App market research that shows its work.
8. Before the roadmap, the evidence.
9. Code is cheap now. Choosing is the hard part.
10. Is this category worth your next six months? Look first.

### 11.2 Supporting headlines (5)
1. AppRadar turns public App Store and Google Play listings into clear signals about a category: how crowded it is, how well users rate the leaders, how recently they've been updated. The source, date and sample size sit behind every number. ← recommended
2. Six questions every indie developer should answer before building, answered from store data you can inspect.
3. Find stale leaders, low-rated categories and new arrivals in minutes, without estimates dressed up as facts.
4. Research both stores, compare up to three apps, and save the categories you're watching. No spreadsheet required.
5. We don't guess revenue or downloads. We show you what the stores show, and tell you what still needs testing.

### 11.3 CTAs
- Primary: **Start your market check** · Create your account · Check a category
- Secondary: **See a sample check (synthetic data)** · How AppRadar measures · Why no revenue numbers?
- Avoid "free" until pricing is approved.

### 11.4 Problem section
**Eyebrow:** Before you build
**Title:** Building got faster. Picking the right thing to build didn't.
**Body:** You can ship an app in weeks now, and so can everyone else. The expensive mistake isn't bad code; it's months spent on a category that was already crowded, already well served or already moving on. Most of us skip the research because it means hours of store pages, screenshots and half-remembered numbers.
**Bullets ("Questions you should answer first"):**
- Is this category dominated by a few developers?
- Do users actually rate the leading apps well?
- When did the leaders last ship an update?
- Is anyone new arriving right now?
- What do similar apps charge?

### 11.5 Benefit-oriented feature descriptions (each maps to an existing capability [R])
- **See if a category is crowded.** Find out how much of a category belongs to its top three developers and how established the leaders are, measured by their rating counts.
- **Spot leaders that users rate poorly.** See the share of apps in a category rated below 4.0, and follow an app's rating over time.
- **Find leaders that stopped shipping.** See which apps haven't updated in over a year. That might be a gap, or a finished product. You decide.
- **Notice who's arriving.** See how many tracked apps launched in the last year, and browse new App Store releases.
- **Price with context.** See what share of apps are free and how paid prices spread, never mixing currencies.
- **Compare up to three apps side by side.** Same store, same country, same definitions. Share the link with your co-founder.
- **Keep a watchlist.** Save the apps you're tracking and come back to see what's changed.

### 11.6 Objection handling
- **"Where are the revenue and download numbers?"** We don't show them, on purpose. Estimates are often least reliable for small apps, which is where most indie developers compete. Instead, we show what the stores actually publish, with its date and source. Google Play install ranges are shown as ranges, never as exact downloads.
- **"Isn't this just another idea generator?"** No. AppRadar doesn't invent ideas or score "can't-miss niches". It helps you check the one you're considering, or compare a few, so you know what to test next.
- **"Is the data complete?"** No dataset is. AppRadar shows its coverage, freshness and sample size for every view, and withholds a value rather than guessing when there isn't enough data.
- **"I already search the App Store myself."** A search shows you results. AppRadar shows you the shape of a category: concentration, ratings, update recency, newcomers and pricing, all side by side and dated.
- **"Will this tell me if my app will succeed?"** No tool can. AppRadar reduces the guesswork about the market. Talking to users and testing willingness to pay is still your job, and we'll remind you.

### 11.7 Trust-building copy
- **Every number shows its work.** Source, observation date, store, country and sample size travel with every metric.
- **Missing means missing.** Unknown values say "unavailable". They never quietly become zero.
- **Too small to say? We say so.** Indicators with too few observations are withheld, not padded.
- **Built by an indie developer, for indie developers.** (Use only if the owner approves founder-led messaging, with the founder's real name and role.)
- **Sample screens use synthetic data.** Every demo on this page is labelled. Nothing here is a real app's performance.

### 11.8 Final conversion section
**Title:** Spend an evening on the market before you spend months on the code.
**Body:** Create an account, pick a store and category, and get a clear picture of what you'd be walking into.
**Button:** Start your market check
**Microcopy:** No revenue guesses. No guaranteed niches. Just store evidence, clearly labelled.

### 11.9 FAQ
1. **What does AppRadar actually do?** It organises public App Store and Google Play listing data into category-level signals (concentration, ratings, update recency, newcomers, pricing) and app-level details, so you can research a market before you build.
2. **Who is it for?** Indie developers and solo founders deciding what to build next, and small studios comparing categories.
3. **Does it show revenue or downloads?** No. See "Why no revenue numbers?" Google Play install ranges appear as published ranges where available; App Store install counts are unavailable.
4. **Does it tell me which app to build?** No. There is no composite "opportunity score" and no AI-generated idea list. It helps you evaluate ideas against evidence.
5. **Which stores and countries are covered?** App Store and Google Play. Coverage varies by country, language and category, and every view shows what has been collected. (Owner: list currently supported markets once approved.)
6. **How fresh is the data?** Each value shows when it was observed. Observations older than 72 hours are marked stale.
7. **Why are some values hidden?** If too few apps have a known value, the indicator is withheld so a handful of apps can't produce a misleading percentage.
8. **Can I get alerts when a category changes?** Not yet. You can save apps to your watchlist and check back. (Don't promise a date.)
9. **Is the sample data on this page real?** No. All landing page examples use synthetic data and are labelled.
10. **Does AppRadar replace talking to users?** No. It tells you about the market; only users can tell you whether they'll pay.

---

## 12. Turkish localization (recommended messaging)

Natural, conversational Turkish in the existing "siz" register of `dictionaries.ts`.

### 12.1 Hero
- **Başlık:** Kodu yazmadan önce pazarı kontrol edin.
  (Shorter alternative: *Kod yazmadan önce pazara bakın.*)
- **Alt başlık:** AppRadar, App Store ve Google Play'deki herkese açık mağaza verilerini bir kategori hakkında net sinyallere dönüştürür: Ne kadar kalabalık, kullanıcılar öne çıkan uygulamaları nasıl puanlıyor, bunlar en son ne zaman güncellenmiş? Her sayının kaynağı, tarihi ve örneklem büyüklüğü görünür.
- **Birincil CTA:** Pazar kontrolüne başlayın
- **İkincil CTA:** Örnek kontrolü görün (sentetik veri)
- **Not:** Gelir veya indirme tahmini yok. Garanti edilmiş niş yok. Yalnızca etiketli mağaza verisi.

### 12.2 Alternative headlines
1. Ne yaptığınızı bilerek geliştirmeye başlayın.
2. Bir sonraki uygulamanız bir önseziden fazlasını hak ediyor.
3. Geliştirmek aylar sürer; önce birkaç dakika kontrol edin.
4. Kod artık ucuz. Zor olan, neyi yapacağınızı seçmek.
5. Çalışmasını gösteren uygulama pazarı araştırması.

### 12.3 Problem section
- **Üst başlık:** Geliştirmeden önce
- **Başlık:** Uygulama geliştirmek hızlandı. Doğru şeyi seçmek hızlanmadı.
- **Metin:** Artık birkaç haftada uygulama yayınlayabiliyorsunuz; herkes yayınlayabiliyor. Pahalı hata kötü kod değil. Pahalı hata, zaten kalabalık, zaten iyi hizmet verilen ya da çoktan başka yöne dönmüş bir kategoriye aylar harcamak. Çoğumuz bu araştırmayı atlarız, çünkü saatlerce mağaza sayfası, ekran görüntüsü ve yarım hatırlanan sayılar demektir.
- **Önce yanıtlamanız gereken sorular:**
  - Bu kategori birkaç geliştiricinin elinde mi?
  - Kullanıcılar öne çıkan uygulamaları gerçekten iyi puanlıyor mu?
  - Öndekiler en son ne zaman güncelleme yayınladı?
  - Şu anda yeni gelen var mı?
  - Benzer uygulamalar ne kadar ücret alıyor?

### 12.4 Features
- **Kategori kalabalık mı, görün.** Kategorinin ne kadarının ilk üç geliştiriciye ait olduğunu ve öndekilerin puan sayılarına göre ne kadar yerleşik olduğunu görün.
- **Kullanıcıların düşük puanladığı uygulamaları fark edin.** Puanı 4,0'ın altındaki uygulamaların payını görün; bir uygulamanın puanını zaman içinde izleyin.
- **Güncellenmeyi bırakmış uygulamaları bulun.** Bir yıldan uzun süredir güncellenmeyenleri görün. Bu bir boşluk da olabilir, tamamlanmış bir ürün de; kararı siz verin.
- **Yeni gelenleri fark edin.** Son bir yılda yayınlanan takip edilen uygulamaların payını görün; App Store'daki yeni çıkanlara göz atın.
- **Fiyatı bağlamıyla belirleyin.** Ücretsiz uygulamaların payını ve ücretli fiyatların dağılımını görün; para birimleri asla karıştırılmaz.
- **Üç uygulamayı yan yana karşılaştırın.** Aynı mağaza, aynı ülke, aynı tanımlar. Bağlantıyı ortağınızla paylaşın.
- **Takip listesi tutun.** İzlediğiniz uygulamaları kaydedin, sonra dönüp nelerin değiştiğine bakın.

### 12.5 Objections
- **"Gelir ve indirme sayıları nerede?"** Bilerek göstermiyoruz. Tahminler çoğu zaman küçük uygulamalar için en az güvenilir olanlardır; bağımsız geliştiricilerin çoğu da tam orada rekabet eder. Bunun yerine mağazaların gerçekten yayınladığı veriyi tarihi ve kaynağıyla gösteriyoruz.
- **"Bu da başka bir fikir üretici mi?"** Hayır. AppRadar fikir uydurmaz, "kaçırılmaz niş" puanı vermez. Düşündüğünüz fikri kontrol etmenize ya da birkaç fikri karşılaştırmanıza yardım eder; böylece sırada neyi test edeceğinizi bilirsiniz.
- **"Veri eksiksiz mi?"** Hiçbir veri seti eksiksiz değildir. AppRadar her görünümde kapsamı, güncelliği ve örneklemi gösterir; yeterli veri yoksa tahmin etmek yerine değeri gizler.
- **"Uygulamam başarılı olacak mı?"** Hiçbir araç bunu söyleyemez. AppRadar pazara dair tahmini azaltır; kullanıcılarla konuşmak ve ödeme isteğini test etmek yine sizin işiniz.

### 12.6 Trust
- **Her sayı nereden geldiğini gösterir.** Kaynak, gözlem tarihi, mağaza, ülke ve örneklem her metrikle birlikte gelir.
- **Eksikse eksik yazar.** Bilinmeyen değerler sessizce sıfıra dönüşmez.
- **Söylemek için çok az veri varsa bunu söyleriz.** Yetersiz gözlemli göstergeler doldurulmaz, gizlenir.
- **Örnek ekranlar sentetik veridir.** Bu sayfadaki her örnek etiketlidir; gerçek bir uygulamanın performansı değildir.

### 12.7 Final CTA
- **Başlık:** Koda aylar harcamadan önce pazara bir akşam ayırın.
- **Metin:** Hesap oluşturun, bir mağaza ve kategori seçin, neyin içine girdiğinizi net görün.
- **Buton:** Pazar kontrolüne başlayın

### 12.8 FAQ (key items)
- **AppRadar tam olarak ne yapar?** App Store ve Google Play'deki herkese açık kayıt verilerini kategori düzeyinde sinyallere (yoğunlaşma, puanlar, güncellenme, yeni gelenler, fiyat) ve uygulama ayrıntılarına dönüştürür; böylece geliştirmeden önce pazarı araştırabilirsiniz.
- **Hangi uygulamayı yapacağımı söyler mi?** Hayır. Bileşik "fırsat puanı" veya yapay zekâ ile üretilmiş fikir listesi yoktur. Fikirleri kanıtla değerlendirmenize yardım eder.
- **Kategori değişince bildirim alabilir miyim?** Henüz değil. Uygulamaları takip listenize kaydedip daha sonra kontrol edebilirsiniz.
- **Bu sayfadaki örnek veriler gerçek mi?** Hayır. Tanıtım sayfasındaki tüm örnekler sentetiktir ve etiketlidir.

---

## 13. Conversion strategy

### 13.1 First-time visitor journey

| Stage | Visitor question | What must be on screen | Basis |
|---|---|---|---|
| 0–5 s | "What is this and is it for me?" | Hero: *Check the market before you write the code.* Subline naming App Store + Google Play and indie developers. One visual: the six-question synthetic card (8.1) labelled "Synthetic sample" | [E] pain framing O1–O4; [H] for exact wording |
| 5–30 s | "What would I actually learn?" | The six questions as a visual list, each with one synthetic value and "what this doesn't mean" | [I] O19 crowdedness question |
| 30–60 s | "Can I trust it?" | "Every number shows its work" anatomy (8.2) and "Withheld, not invented" (8.3) | [E] O12, O24 |
| 60–90 s | "Where are the revenue numbers?" (the top exit risk) | The "Why no revenue numbers" explainer (8.4) | [E] O14, O15, O24, O25 |
| 90–120 s | "How would I use it this weekend?" | The 20-minute routine (8.13) or a 4-step "How it works" | [E] O2 |
| Decision | "Is it worth signing up?" | Anti-pitch (8.8), FAQ, final CTA with honest microcopy | [H] |

### 13.2 What establishes credibility
Visible methodology, labelled synthetic data, explicit limits, consistent definitions, and founder identity if approved. Fake proof would backfire with this audience (O12).

### 13.3 What motivates registration
- A specific promise: "your first market check".
- A useful artefact: the research brief (8.5) [H].
- A watchlist as a reason to return.

### 13.4 Likely exit causes
- Hero sounds like other idea tools (current hero) [I].
- No revenue numbers, unexplained [I from O14/O15].
- A demo that looks like real data without a label (also a rights risk [R]).
- Long feature lists without outcomes.
- Unclear coverage ("does it have my country?").

### 13.5 Experiments (all hypotheses; no conversion-rate claims)
1. Hero A/B: "Check the market before you write the code" vs the current "Discover your next great app idea". Metric: sign-up start rate.
2. Revenue explainer above vs below the fold. Metric: scroll depth plus sign-up.
3. Path chooser (8.7) on vs off.
4. Research brief (8.5) with vs without the save-to-account step.
5. CTA wording: "Start your market check" vs "Create your account".

Validate qualitatively before any A/B testing: 5–8 short interviews with S1 developers using a clickable synthetic page (traffic will be too low for statistically meaningful A/B results early) [H].

---

## 14. Trust-building strategy (no customers yet)

**Recommended on the landing page (P0):**
1. "Synthetic sample" labels on every demo, plus one sentence explaining why.
2. "Every number shows its work" anatomy.
3. "Withheld, not invented" example.
4. "Why no revenue numbers" explainer with links to public industry sources.
5. A plain coverage statement, e.g. "Coverage is growing; each view shows what's been collected". Name specific markets only once approved.
6. "When AppRadar is the wrong tool".
7. Visible links to privacy, terms and contact pages, and their status. Today they're drafts and `noindex` [R]; publish final versions before beta.

**P1:** public methodology page with thresholds and freshness rules; founder note with real name and photo (owner decision); dated changelog of coverage and features.

**Never:** testimonials, user counts, logos, "trusted by", partnership badges, star ratings, "X ideas found", revenue or download claims, alerts, pricing, or real app names, icons or screenshots on public pages while rights are `unconfirmed`.

---

## 15. Prioritized recommendations

### Landing page (LP) recommendations

| ID | Recommendation | Customer evidence | Expected impact [H] | Complexity | Dependencies | Effort | Ongoing cost | Validation |
|---|---|---|---|---|---|---|---|---|
| **P0-1** | Reposition hero and messaging to "Check the market before you write the code"; rewrite EN + TR per §11–12 | O1–O4, O17; competitor crowding O7, O28 | High: clearer differentiation | Low (copy in `dictionaries.ts`) | Owner approval of positioning | 1–2 days | None | 5–8 S1 interviews; later A/B |
| **P0-2** | Add the six-question synthetic market check (8.1) and feature the Market Insights / Opportunity Finder indicators, currently absent from landing | O19, O2; [R] gap | High | Low–Medium | Synthetic dataset; reuse `market.ts` | 2–4 days | None | Interview comprehension test ("what does this tell you?") |
| **P0-3** | Add "Why no revenue numbers" explainer (8.4) and objection FAQ | O14, O15, O24, O25 | High (removes top exit cause) | Low | Legal check of competitor mentions | 1 day | None | Interview: does the objection still come up? |
| P0-4 | Trust block: number anatomy (8.2), withheld example (8.3), synthetic labels, honest microcopy | O12 | Medium–High | Low | P0-2 | 1–2 days | None | Interviews: trust rating before/after |
| P0-5 | Legal/contact pages finalised and linked; remove draft only after review | [R] BETA_READINESS | Required for beta | Owner/legal | Owner facts, legal review | Owner-dependent | Legal review cost | Checklist |
| P1-1 | Anti-pitch section (8.8) | O12, O8 | Medium | Low | None | 0.5 day | None | Interviews |
| P1-2 | Public methodology page and coverage changelog (8.9) | O12, O24 | Medium (+ SEO [H]) | Low–Medium | Threshold sign-off | 2–3 days | Keep in sync | Page engagement; sign-ups from it |
| P1-3 | 20-minute routine walkthrough (8.13) | O2, O21 | Medium–High | Medium | Stable UI; synthetic demo mode | 3–5 days | Re-record on UI change | Watch-through rate |
| P1-4 | Re-check-your-niche story (8.11) and both-stores split (8.12) | O8, O16 | Medium | Low | Synthetic data | 1–2 days | None | Interviews |
| P2-1 | Free research brief generator (8.5) | O4, O5 | Medium–High | Medium | Optional save requires small schema; landing-only version needs none | 3–5 days | None (no LLM) | Completion rate → sign-up rate |
| P2-2 | Path chooser (8.7) | Segment split O8 | Unknown | Medium | Analytics (none decided) | 3 days | None | A/B once traffic allows |
| P2-3 | Decision simulator (8.6) | O19 | Medium (memorable, shareable) | Medium | Careful copy review | 4–6 days | Low | Shares, time on page |
| P2-4 | Founder research log and IH/HN build-in-public posts (8.10, 8.14) | O1–O3 audience lives on IH/HN | Medium (acquisition) | Low | Founder time | Ongoing ~2 h/week | Time | Referral sign-ups |
| P2-5 | Hero and CTA experiments (§13.5) | n/a | Unknown | Low | Analytics tooling decision (privacy review) | 1–2 days | Tool cost if any | A/B |

### Core product opportunities (separate from the landing page)

| ID | Opportunity | Evidence | Impact [H] | Complexity | Dependencies | Effort | Ongoing cost | Validation |
|---|---|---|---|---|---|---|---|---|
| P3-1 | Guided "first market check" onboarding inside the app (store → category → six questions → compare → save) | O2, O23 | High activation | Medium | Real data gates | 1 week | None | Activation funnel |
| P3-2 | Watchlist/category change alerts | O8, O16 | High retention | High | Scheduling (currently off), email provider, budget, rights | 2+ weeks | Apify + email costs | Interest via waitlist checkbox (no promise) |
| P3-3 | Review-complaint themes | O9, O10, O28 | High interest; crowded | High | Review-content rights (`unconfirmed`), privacy, possibly LLM cost | 3+ weeks | Paid API / LLM | Interviews after rights resolved |
| P3-4 | Store-native keyword demand view (popularity / difficulty) | O6 | Medium | Medium | ASO Keyword Intel costs; advanced ASO UI planned for later phase | 1–2 weeks | Per-row costs | Interviews |
| P3-5 | Saved research briefs / notes per idea | O4 | Medium retention | Medium | Schema + RLS | 1 week | Low | Usage |
| P3-6 | Real ranking history (needs repeated snapshots) to power Trending | [R] single observation | Medium | Ops | Scheduling, budget, rights | Ongoing | Apify | Data readiness |

---

## 16. Sources and evidence

All accessed 27 November 2026. "Vendor" = author sells a related product.

**Community / voice of customer**
- O1, O2: Indie Hackers, "I Keep Building Apps Before Validating. So I'm Fixing That.", 23 Jan 2026 (vendor: Do Better). https://www.indiehackers.com/post/i-keep-building-apps-before-validating-so-i-m-fixing-that-3e6e3cbac9
- O3, O4, O5: Indie Hackers, "How do you find or validate an app/SaaS idea…", 25 Aug 2026; comments 25 Aug and 4 Sep 2026 (vendor: RightIdea). https://www.indiehackers.com/post/how-do-you-find-or-validate-an-app-saas-idea-to-the-point-where-you-actually-decide-to-go-build-it-f9d4485e8f
- O6: Indie Hackers, "How do you validate mobile app ideas?", 15 Oct 2024. https://www.indiehackers.com/post/how-do-you-validate-mobile-app-ideas-3655e0967b
- O7: Indie Hackers, "What I learned losing 6 months to an App Nobody wanted…", 12 Mar 2026 (vendor: Niches Hunter). https://www.indiehackers.com/post/what-i-learned-losing-6-months-to-an-app-nobody-wanted-and-how-i-fixed-my-process-UZO5Vpat4z8D3tk70BqS
- O8: Hacker News comment (MoOk-OSC), ~Apr 2026. https://news.ycombinator.com/item?id=47638231
- O9: Hacker News, "I analyzed 50k+ negative app reviews…", 16 Jul 2025 (vendor). https://news.ycombinator.com/item?id=44585879
- O10: Hacker News comment, 1 Jul 2022. https://news.ycombinator.com/item?id=31945402
- O11: Hacker News, Appark maker, 31 Dec 2025 (vendor). https://news.ycombinator.com/item?id=46440804
- O12: Hacker News comment, 10 Jul 2020. https://news.ycombinator.com/item?id=23792780
- O13: Hacker News comment, 19 Sep 2019. https://news.ycombinator.com/item?id=21014423
- O14: Hacker News comment, 25 Mar 2026. https://news.ycombinator.com/item?id=47515574
- O15: Hacker News comment, 4 Jul 2022. https://news.ycombinator.com/item?id=31979743
- O16: Hacker News comment, 8 Apr 2026. https://news.ycombinator.com/item?id=47691231
- O17: Hacker News comment, 17 Jun 2026. https://news.ycombinator.com/item?id=48567585
- O18: Hacker News post, 7 Apr 2026. https://news.ycombinator.com/item?id=47672566
- O19: Hacker News comment, 16 Aug 2020. https://news.ycombinator.com/item?id=24182198
- O20: Hacker News comment, 12 Mar 2012. https://news.ycombinator.com/item?id=3693186
- O21: Hacker News comment, 9 Oct 2014. https://news.ycombinator.com/item?id=8432961
- Context: HN, Sensor Tower data-collection story thread, Mar 2020. https://news.ycombinator.com/item?id=22532770
- HN search API used for discovery: https://hn.algolia.com/api

**Review sites (via search summaries; medium-to-low confidence)**
- O22: G2 AppTweak reviews / comparisons. https://www.g2.com/products/apptweak/reviews · https://www.g2.com/compare/apptweak-vs-sensor-tower
- O23: Capterra MobileAction; Software Advice. https://www.capterra.com/p/200378/MobileAction/ · https://www.softwareadvice.com/product/481027-MobileAction/ · G2 https://www.g2.com/compare/mobileaction-vs-sensor-tower
- O26: Sensor Tower on Capterra / G2 pricing. https://www.capterra.com/p/200383/Sensor-Tower/ · https://www.g2.com/products/sensor-tower/pricing · third-party estimates: https://vendr.com/marketplace/sensor-tower · https://trysonar.app/blog/sensor-tower-pricing (vendor)
- O27: Appfigures on G2 / Toolradar. https://www.g2.com/products/appfigures · https://toolradar.com/tools/appfigures
- O29: App Radar. https://www.capterra.com/p/152262/App-Radar/ · https://www.g2.com/products/app-radar/reviews · https://www.pocketgamer.biz/app-radar-snaps-up-aso-service-thetool
- AppMagic G2 / pricing context: https://www.g2.com/products/appmagic/reviews
- GetAppNiche: https://alternativeto.net/software/getappniche/about/

**Vendor documentation and data**
- O24: AppMagic, "The Essentials of Using AppMagic for Mobile Market Analysis". https://appmagic.rocks/tool-descriptions/essentials-new (statement located via search; not visible in the page text extract at access time, so re-verify before citing publicly)
- O25: Appfigures, "By the Numbers: Analyzing App Downloads…", 14 Jul 2023. https://appfigures.com/resources/insights/20230714
- Sensor Tower on estimates: https://sensortower.com/blog/how-to-get-estimated-downloads-and-revenue-for-apps

**Emerging competitors (maker statements)**
- O28: GapHunt, Product Hunt. https://www.producthunt.com/products/gaphunt
- Niches Hunter, Product Hunt. https://www.producthunt.com/p/niches-hunter-2/niches-hunter-3
- AppIdeaHub, Product Hunt. https://www.producthunt.com/products/appideahub
- Indie Hackers, AppstoreSpy launch. https://www.indiehackers.com/post/appstorespy-new-mobile-market-intelligence-tool-7fb0e7a19d

**Repository [R]:** `APPRADAR.md` §3–6, §6.16–6.18, §6.28; `docs/CONTENT_USAGE.md`; `docs/BETA_READINESS.md`; `src/lib/landing/dictionaries.ts`; `src/lib/intel/market.ts`.

---

## 17. Assumptions and unresolved questions

**Assumptions**
- S1 will accept "no revenue estimates" once it's explained [H]. Some visitors (O14, O15) will still leave; that is an accepted trade-off.
- Indie willingness to pay sits roughly in the free–$40/month band, inferred from competitor pricing, not from AppRadar evidence [H].
- Effort estimates assume one developer familiar with this codebase and the 21st.dev component approach.

**Unresolved (owner decisions)**
1. **Name collision with App Radar (SplitMetrics).** Search visibility, confusion and potential trademark exposure. Needs owner/legal review; not legal advice.
2. **Reddit evidence gap.** Recommend a manual owner pass on r/iOSProgramming, r/androiddev, r/SideProject, r/indiehackers and r/AppIdeas to confirm or contradict §3.
3. **Founder-led messaging.** Will the founder be named and pictured?
4. **Coverage statement.** Which stores, countries and categories can be named publicly at beta?
5. **Analytics.** Which privacy-reviewed tool, if any, for measuring the funnel?
6. **Competitor mentions.** Can the revenue explainer link to competitor documentation by name? Needs legal review.
7. **Pricing.** Unapproved. All copy avoids "free" and plan names.
8. **Rights.** Every public demo stays synthetic until `APPRADAR_THIRD_PARTY_RIGHTS_STATUS=verified` with a recorded display basis [R].
9. **Validation interviews.** Who recruits 5–8 S1 developers, and where?
