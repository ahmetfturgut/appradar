# AppRadar Landing Page: Master Document

Single source of truth for landing strategy, selected decisions, implementation and owner review.
Updated: 27 November 2026. The owner's **Landing Page V2 Strategy & Implementation** prompt authorizes the focused package below. It does not approve public launch, legal conclusions, pricing or third-party data rights.

**Decision statuses:** `APPROVED` · `PROPOSED` · `REJECTED` · `DEFERRED` · `UNRESOLVED`.
Implementation status and decision approval are separate. Visual acceptance is pending owner review; no commit, push or deployment is authorized yet.

## 1. Status and research references

| Area | Status |
|---|---|
| Customer research | Complete — [LANDING_PAGE_CUSTOMER_RESEARCH.md](LANDING_PAGE_CUSTOMER_RESEARCH.md), Claude, 27 Nov 2026 |
| Competitor / design / SEO research | Complete — [LANDING_PAGE_RESEARCH.md](LANDING_PAGE_RESEARCH.md), Codex, 27 Nov 2026 |
| Selected positioning, architecture and focused implementation | `APPROVED` by owner V2 prompt; implemented locally |
| EN/TR hero and supporting copy | `APPROVED` verbatim by V2 prompt; implemented |
| Supporting EN/TR copy and original visuals | Implemented within the selected scope; owner visual/editorial review pending |
| Quality / browser validation | Recorded in §10 |
| Public registration / real-data public launch | `UNRESOLVED`; not approved by this package |
| Naming, legal, pricing, data rights | `UNRESOLVED`; see §12 |

Both original research documents are preserved unchanged. Their proposals and dated observations remain research, not blanket approvals. No additional competitor/customer research was conducted for V2.

**Evidence limitations retained:** customer research is qualitative (29 observations), with Reddit inaccessible, some review-site evidence available only as search summaries, vendor-affiliated posts and older contextual observations. The AppMagic small-app estimate citation requires re-verification before public citation. Competitor research inspected public marketing, not authenticated products or independently measured accuracy, customers, conversion or licensing. Its desktop observations do not establish mobile usability. All expected conversion benefits remain hypotheses.

## 2. Selected positioning and synthesis

**Evidence before code.** AppRadar helps indie mobile developers research markets and competitors before committing to their next application. The primary audiences are indie mobile developers, solo founders and small mobile studios. It is not positioned as an AI idea generator, revenue estimator, advanced ASO suite or guaranteed opportunity finder.

Customer research §§3–5 and §10 support the pre-build job: builders can ship, but need to reduce uncertainty about what deserves months of effort. Competitor research §§4–8 finds crowded income/idea promises, broad enterprise/ASO workflows and an opportunity to explain a narrower research task with visible evidence. These are positioning inputs, not proof of demand for AppRadar.

The selected package combines the customer research's six-question check (§8.1), number anatomy (§8.2) and withheld values (§8.3) with the competitor research's bounded worked comparison (§6.1), connected workflow (§10) and restrained product-led concept (§9). Repetitive standalone anti-pitch, revenue and access sections are consolidated into metric limits, evidence and FAQ.

## 3. Copy and conversion decisions

| Locale | Hero | Supporting copy |
|---|---|---|
| EN | Check the market before you write the code. | Explore app markets, compare competitors, and uncover signals worth investigating before investing months in your next mobile app. |
| TR | Koda başlamadan önce pazarı araştırın. | Uygulama pazarlarını keşfedin, rakiplerinizi karşılaştırın ve bir sonraki mobil uygulamanıza aylarınızı ayırmadan önce araştırmaya değer fırsat sinyallerini belirleyin. |

The intended primary label is **Start your research / Araştırmaya başlayın**; secondary is **Explore an example / Bir örneği inceleyin**. Existing signed-in visitors receive `/dashboard`. Because public registration is not approved, signed-out visitors instead receive the synthetic example as the prominent action, with an access explanation and existing `/login` link. No signup promises, free/trial claims or new access policy were introduced. Existing account screens and product interface remain English; TR FAQ/evidence explain that handoff.

Outcomes precede tools. Copy describes tracked observations rather than the entire market, distinguishes rating counts from downloads, treats old updates as inconclusive, excludes subscriptions/IAP from download prices, and treats missing values as unknown. No combined success score, certainty, fake testimonials, logos, revenue/download estimates or alert promises.

## 4. Implemented architecture

1. Navigation — brand, four section links, language switch, existing sign-in and context-aware action.
2. Hero — approved headline/support, bounded action, concise research outcomes.
3. Interactive Market Check — three fictional markets, six indicators, workings and compact competitor reasoning.
4. Connected Research Workflow — explore → understand alternatives → choose the next check.
5. Product Features — four restrained bento cards with original synthetic fragments.
6. Evidence and Data Transparency — number context, withheld values, interpretive limits and access explanation.
7. Target Audience — indie developers, solo founders, small studios.
8. FAQ — eight answers covering scope, stores/coverage, estimates, freshness, indicators, account access, manual Watchlist and Turkish handoff.
9. Final CTA — same access-aware destination as hero.
10. Footer — existing legal/contact routes, explicitly still drafts.

The four feature groups cover App Explorer + App Details; Market Insights + Opportunity Finder; Competitor Comparison + available historical observations; Watchlist + New Releases. Trending is conditional on comparable chart observations. Watchlist saves apps for manual research and creates no alerts. Available coverage varies by store, country, requested language and field.

## 5. Interactive example and data boundaries

`src/lib/landing/market-check-data.ts` defines original fictional fixtures and a fixed fictional observation clock, **2026-11-01 12:00 UTC**. These are not provider observations. All scenarios use App Store / US / requested English to keep comparisons compatible. The landing UI locale is independent of this research context.

| Scenario | Cohort | Demonstrated boundary |
|---|---:|---|
| Habit trackers | 24 | Sufficient known samples with explicit missing values |
| Budget planners | 18 | Existing small-sample warnings |
| Focus timers | 24 | Partial ratings/update coverage; small-sample and low-coverage warnings together |

The client reuses existing pure `computeIndicators` and `MARKET_THRESHOLDS` from `src/lib/intel/market.ts`; no duplicated indicator calculations, server-only import, database/provider call, random value or live clock. The six values are Quality Gap, Neglected Competitors, Newcomer Presence, Developer Concentration, Incumbent Strength and Pricing Landscape. Counts/known denominators and unknowns are visible; workings disclose full cohort coverage, provisional definition, synthetic source and observation date. Paid download median is shown when available in pricing workings.

The controlled checkbox retains exactly four known update dates. Existing minimum-sample logic withholds the Neglected Competitors value and numerator; other indicators stay unchanged. Current provisional rules: minimum 5 known values; fewer than 20 is small; below 70% known coverage is flagged. The incumbent metric is a median rating count, so it is not drawn as a percentage bar.

The comparison contains three fictional apps drawn from the full scenario, with rating, rating count and last update. One has missing fields. Selecting an app updates **Question → Observation → Uncertainty → Next check**. Category percentages use the whole 18/24-app sample, never the three comparison apps. Scenarios reset selection; the controlled evidence limitation persists until unchecked. Interaction state is ephemeral and bounded; no persisted research or public protected comparison URLs.

Native buttons use pressed states; the limitation is a labelled checkbox; workings/FAQ use native disclosures. Live regions announce scenario/limited-data state and comparison reasoning. All examples carry visible synthetic labels, including static feature fragments. Letter monograms are original, not third-party icons.

## 6. Design, sources and licensing

Preserved the existing Modern Minimal semantic colors, darker accessible blue, Inter typography, existing radii and global focus/reduced-motion rules. White space, a strong hero and restrained borders establish hierarchy; no new animation library, gradients, media assets or dependencies.

| Reused source | Author / license record | V2 use / limitation |
|---|---|---|
| Existing `src/components/ui/card.tsx` | shadcn/ui, MIT; [21st listing](https://21st.dev/@shadcn/components/card), [upstream](https://ui.shadcn.com/docs/components/card); attribution already in source | Indicator and feature surfaces, spacing utilities only; no retrieval |
| Existing AppRadar public chrome and tokens | Original project composition; Modern Minimal theme by serafimcloud, [theme reference](https://21st.dev/@serafimcloud/themes/modern-minimal) | Layout adapted locally; historical theme-license clearance remains unresolved, not certified here |
| Existing `lucide-react` dependency | Lucide, ISC project license | Existing icon system; no new dependency or external media |
| Workings / FAQ disclosures | Native HTML | Original composition, no copied component code |
| Synthetic research/product visuals | Original AppRadar HTML/CSS and fictional data | No competitor assets, store screenshots or third-party names/icons |

21st.dev remains the approved implementation design source. No paid retrieval quotas were used and no new third-party component was copied. Existing source/license records are reused, not a new blanket licensing conclusion. See [CONTENT_USAGE.md](CONTENT_USAGE.md).

## 7. SEO and localization

Complete EN/TR copy lives in `src/lib/landing/dictionaries.ts`; the brand name is centralized for landing presentation in `config.ts`. Existing locale routing, cookie preference and SSR language remain intact. One H1, semantic headings, crawlable initial text, native controls and localized descriptions support research terminology without unsupported search-volume claims.

Existing `metadata.ts` origin validation, canonical, hreflang, Open Graph and robots behavior are preserved: index only where existing validated production configuration permits it; otherwise retain noindex. Legal/contact drafts remain noindex and linked with draft labels. No public catalog, programmatic pages, comparison articles, structured-data claims, domain or product rename.

## 8. Decision log

| ID | Date | Decision | Status / authority |
|---|---|---|---|
| D1 | 2026-11-27 | Evidence before code | `APPROVED`, V2 prompt §2; supersedes proposed status |
| D2 | 2026-11-27 | Exact EN/TR hero/support and access-aware actions | `APPROVED`, V2 §§3/9; public registration remains unresolved |
| D3 | 2026-11-27 | Six indicators across three fictional scenarios | `APPROVED`, V2 §5 |
| D4 | 2026-11-27 | Every number shows its work | `APPROVED`, V2 §§5/8 |
| D5 | 2026-11-27 | Controlled withheld-value example | `APPROVED`, V2 §§5/8 |
| D6 | 2026-11-27 | Explain absence of revenue/download estimates | `APPROVED`, V2 §9; no competitor attack/statistics |
| D7 | 2026-11-27 | Standalone anti-pitch section | `DEFERRED`; limits integrated into focused FAQ/evidence instead |
| D8 | 2026-11-27 | Indie developers, solo founders, small studios | `APPROVED`, V2 §2 |
| D9 | 2026-11-27 | Research complete; focused ten-section architecture | `APPROVED`, V2 §§1/4; only selected recommendations authorized |
| D10 | 2026-11-27 | Retain AppRadar now; naming/trademark conflict | Retention `APPROVED`, V2 §12; clearance `UNRESOLVED` |
| D11 | Existing | Synthetic labelled public examples only | `APPROVED`, existing rights boundary reaffirmed by V2 |
| D12 | Existing | Existing components first; 21st.dev source | `APPROVED`, V2 §10; no paid retrieval |
| D13 | 2026-11-27 | Same-context fictional three-app reasoning | `APPROVED`, V2 §6 |
| D14 | 2026-11-27 | Keep auth, collection and core product unchanged | `APPROVED`, V2 constraints |
| D15 | 2026-11-27 | Owner review before commit/push/deployment | `APPROVED`, V2 constraints; acceptance pending |

## 9. Implementation inventory

- `src/components/landing/landing-page.tsx`: ten-section composition, four original feature fragments, localized FAQ.
- `src/components/landing/market-check.tsx`: scenario selection, limitation checkbox, six workings disclosures, competitor selection/reasoning.
- `src/components/landing/public-chrome.tsx`: navigation, existing login/language/legal routes, bounded CTA.
- `src/lib/landing/dictionaries.ts`: complete EN/TR V2 messaging.
- `src/lib/landing/config.ts`: landing brand and access-aware destination.
- `src/lib/landing/market-check-data.ts`: pure deterministic fictional scenarios using existing indicator engine.
- Removed obsolete `product-preview.tsx`; replaced by the coherent market example and feature fragments.
- `tests/landing.test.ts`: updated localized render/auth expectations, retained metadata/routing checks.
- `tests/landing-market-check.test.ts`: data, withholding, comparison, accessible initial controls and client calculation boundary.
- This master document and the APPRADAR reference. Review screenshots were captured in the local browser for the owner and are not stored in the repository. Both original research documents remain unchanged.
- Recovery fix (Claude, 27 Nov 2026): `public-chrome.tsx` header action used `hidden … xl:inline-flex` on top of a base `inline-flex`. In Tailwind v4 the base display utility won, so the action showed on mobile and tablet, stacking the header into three rows and duplicating the hero action. It now uses `max-xl:hidden`; a regression test was added to `tests/landing.test.ts`.

No authenticated product routes, auth policies, provider/collection infrastructure, migrations, dependencies or environment flags changed.

## 10. Validation and review evidence

Recorded 27 November 2026, after the recovery fix, against the local dev server (`http://127.0.0.1:3000/en`, `/tr`).

**Final quality gate (run once):**

| Check | Result |
|---|---|
| Full test suite | 213 passed, 0 failed, 2 skipped (215 total), including 11 focused landing tests |
| Typecheck | Passed |
| Lint | 0 errors; 3 existing `@next/next/no-img-element` warnings in `app-icon.tsx` and `screenshot-gallery.tsx`, not landing files |
| Production build | Passed (`/[locale]` and `/[locale]/[document]` dynamic) |

**Focused tests:**
- Deterministic synthetic values for all three scenarios, computed with the shared engine.
- Minimum-sample withholding: four known update dates withhold only Neglected Competitors.
- Small-sample warning (Budget planners) and low-coverage warning (Focus timers).
- The three-app comparison cannot produce category values.
- Signed-out and signed-in actions.
- Public calculation code has no fetch, clock, random, env, Supabase, Apify or catalog imports.
- EN/TR completeness.
- Header action visibility (regression).

**Browser checks (in-app browser):**
- **Widths:** 1440, 768, 390 and 320 px in EN and TR. No horizontal overflow and no elements beyond the viewport.
- **Interactions:** scenario switching, the limited-data checkbox (value withheld, status announced) and comparison selection (Question → Observation → Uncertainty → Next check updates) all work.
- **Keyboard:** Enter on a scenario button and Space on the checkbox both work. The skip link and controls show a 2 px focus outline.
- **Header action:** hidden below 1280 px and shown at 1440 px.
- **Turkish formatting:** numbers use Turkish formatting (`%52,2`, `2.340`) and the document `lang="tr"`.

**Not performed or limited:**
- Reduced motion was checked in CSS only. The global `prefers-reduced-motion` rule disables smooth scroll, transitions and animations, but the media query was not emulated in the browser.
- No screen-reader audit.
- No signed-in browser session; signed-in actions are covered by render tests only.
- No cross-browser or real-device testing.
- No Lighthouse or performance audit.
- No production deployment.

**Owner visual review pending.** Note for review: on mobile the sticky header takes about 170 px of an 844 px viewport, because of the 2×2 section links. This is a design choice, left unchanged.

## 11. Deferred roadmap

These remain `DEFERRED`, not authorized for implementation by this package.

| Priority | Ideas | Dependencies |
|---|---|---|
| P1 | Browser-local research brief generator; public methodology page; same idea/two stores demonstration | Separate scope and editorial review; maintain synthetic/data boundaries |
| P2 | Personalized research paths; decision simulator; founder research log; educational SEO; privacy-approved conversion analytics | Product/editorial validation, privacy decisions and separate approval |
| P3 | Public real-data market explorer; programmatic app/category pages; persistent research briefs; AI-generated research; alerts | Rights, access, sufficient coverage, operational/budget/privacy design and separate approval |

No new core product features in V2. Later interviews with 5–8 indie developers can test comprehension/value before analytics or A/B testing. Conversion benefits and the value of non-revenue signals remain unmeasured hypotheses.

## 12. Remaining dependencies and launch blockers

- **App Radar naming/trademark conflict:** unresolved owner/qualified legal review for intended services and territories. Existing research §14 records the evidence and limits; this package makes no legal conclusion and does not rename or change domains.
- **Third-party data rights:** public storage/display and derived analysis remain unconfirmed per provider/store/field. Synthetic examples do not clear rights for a real catalog.
- **Public launch/access:** owner approval and existing [BETA_READINESS.md](BETA_READINESS.md) operational/auth gates remain authoritative. Public registration is not approved here.
- **Legal/contact:** owner and legal finalization, actual contact details and privacy/terms review remain pending. Draft links are not publication approval.
- **Pricing:** no approved plan, trial, free-access or launch offer. No pricing claims made.
- **Component/theme provenance:** reused component notices retained; historical Modern Minimal theme-license confirmation remains open.
- **Coverage:** real public beta scope (markets, categories, freshness and limits) needs an owner-approved release statement. The fictional US/English scenario is not a coverage claim.
- **Validation/research gaps:** customer evidence limitations, manual Reddit pass if desired, interviews and conversion/privacy measurement remain separate work. No new research or analytics was added.
- **Owner visual acceptance:** review EN/TR and screenshots before commit/push; deployment requires separate authorization.
