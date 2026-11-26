/**
 * Deterministic market indicators (P2: Market Insights, Opportunity Finder).
 * Pure functions over one tracked cohort: one store, one country, one requested language, and either one
 * listing category or one comparable chart snapshot. Real and demo data both call these functions.
 *
 * Integrity rules:
 *  - Every value carries its numerator, denominator, known / unknown / invalid counts and cohort size.
 *  - Unknown ratings are not low ratings; missing dates are not neglect; unknown prices are not free.
 *  - Future or implausible dates are excluded (counted as invalid), not clamped.
 *  - Prices are only summarised within one currency.
 *  - Developer concentration is a share of *tracked apps*, never market share; revenue, downloads,
 *    active users and install rates are never inferred.
 *  - Values below the minimum sample are withheld ("insufficient data"), not shown with a caveat.
 *  - There is no composite score.
 */

/**
 * Provisional research definitions. They are not validated predictions of commercial success;
 * change them here only (UI, tests and methodology text read from this object).
 */
export const MARKET_THRESHOLDS = {
  /** Quality Gap: a known rating strictly below this counts as low. */
  lowRating: 4.0,
  /** Neglected Competitors: last store update older than this many days. */
  neglectedDays: 365,
  /** Newcomer Presence: store release date within this many days. */
  newcomerDays: 365,
  /** Developer Concentration: number of leading developers counted. */
  topDevelopers: 3,
  /** Below this many known observations an indicator is withheld (one app would move a share by over 20 points). */
  minSample: 5,
  /** Below this many known observations an indicator is shown with a small-sample warning. */
  smallSample: 20,
  /** Below this known/cohort share an indicator is shown with a low-coverage warning. */
  minCoverage: 0.7,
  /** Listing observations older than this are stale (same rule as the rest of the product). */
  staleAfterHours: 72,
  /** Store dates before this are treated as invalid (the App Store opened in July 2008). */
  earliestStoreDate: "2008-01-01T00:00:00Z",
  /** Dates more than this far in the future are invalid (allows clock and time-zone skew). */
  futureToleranceHours: 24,
} as const;
export type MarketThresholds = typeof MARKET_THRESHOLDS;

export interface MarketApp {
  appId: string;
  listingId: number;
  name: string | null;
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  category: string | null;
  /** Store developer identity; null when the developer is not identified. */
  developerId: string | null;
  developerName: string | null;
  rating: number | null;
  ratingCount: number | null;
  price: { amount: number | null; currency: string | null; isFree: boolean | null };
  releasedAt: string | null;
  storeUpdatedAt: string | null;
  lastObservedAt: string | null;
  /** Chart position when the cohort is a chart snapshot. */
  position?: number | null;
}

/* ------------------------------------------------------------------ statistics */

/**
 * Percentile with linear interpolation between closest ranks (R-7, the same as Excel PERCENTILE.INC
 * and NumPy's default). p in [0, 1]. Empty input → null.
 */
export function percentile(values: readonly number[], p: number): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const h = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}
export const median = (values: readonly number[]) => percentile(values, 0.5);

export type DateCheck = { status: "valid"; time: number } | { status: "unknown" } | { status: "invalid"; reason: "unparseable" | "future" | "too_early" };
export function checkDate(value: string | null, now: number, t: MarketThresholds = MARKET_THRESHOLDS): DateCheck {
  if (value == null || value === "") return { status: "unknown" };
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return { status: "invalid", reason: "unparseable" };
  if (time > now + t.futureToleranceHours * 3_600_000) return { status: "invalid", reason: "future" };
  if (time < Date.parse(t.earliestStoreDate)) return { status: "invalid", reason: "too_early" };
  return { status: "valid", time };
}

/** A rating is known only when present and, if a count is given, at least one rating exists. */
export const knownRating = (a: MarketApp): number | null =>
  a.rating != null && Number.isFinite(a.rating) && a.rating >= 0 && a.rating <= 5 && (a.ratingCount == null || a.ratingCount > 0) ? a.rating : null;

/** Free / paid / unknown. Conflicting fields stay unknown; an unknown price is never free. */
export function priceClass(a: MarketApp): "free" | "paid" | "unknown" {
  const { amount, isFree } = a.price;
  if (isFree === true) return amount == null || amount === 0 ? "free" : "unknown";
  if (isFree === false) return amount == null || amount > 0 ? "paid" : "unknown";
  if (amount == null) return "unknown";
  return amount === 0 ? "free" : "paid";
}

/* ------------------------------------------------------------------ indicators */

export type IndicatorKey = "qualityGap" | "neglected" | "newcomers" | "concentration" | "incumbentStrength" | "pricing";
export type SampleStatus = "ok" | "small_sample" | "low_coverage" | "insufficient";

export interface Indicator {
  key: IndicatorKey;
  /** Primary value (percent 0–100 for shares, a count for incumbent strength); null when withheld or unknown. */
  value: number | null;
  numerator: number | null;
  /** Known observations used as the denominator. */
  denominator: number;
  cohortSize: number;
  unknown: number;
  invalid: number;
  status: SampleStatus;
  /** Extra statistics (e.g. p25 rating count, distinct developers). Null when withheld. */
  details: Record<string, number | string | null>;
  /** App ids illustrating the indicator (deterministic order). */
  supporting: string[];
}

function sampleStatus(denominator: number, cohortSize: number, t: MarketThresholds): SampleStatus {
  if (denominator < t.minSample) return "insufficient";
  if (cohortSize > 0 && denominator / cohortSize < t.minCoverage) return "low_coverage";
  if (denominator < t.smallSample) return "small_sample";
  return "ok";
}
const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : null;
const byName = (a: MarketApp, b: MarketApp) => String(a.name).localeCompare(String(b.name)) || a.listingId - b.listingId;

function share(key: IndicatorKey, apps: readonly MarketApp[], known: MarketApp[], hits: MarketApp[], unknown: number, invalid: number, t: MarketThresholds, supporting: MarketApp[], details: Indicator["details"] = {}): Indicator {
  const status = sampleStatus(known.length, apps.length, t);
  const withheld = status === "insufficient";
  return { key, value: withheld ? null : pct(hits.length, known.length), numerator: withheld ? null : hits.length, denominator: known.length,
    cohortSize: apps.length, unknown, invalid, status, details: withheld ? Object.fromEntries(Object.keys(details).map(k => [k, null])) : details,
    supporting: withheld ? [] : supporting.slice(0, 5).map(a => a.appId) };
}

export interface DeveloperShare { developerId: string; developerName: string | null; apps: number; sharePercent: number; medianRatingCount: number | null }

export function developerShares(apps: readonly MarketApp[]): DeveloperShare[] {
  const identified = apps.filter(a => a.developerId);
  const groups = new Map<string, MarketApp[]>();
  for (const a of identified) groups.set(a.developerId!, [...(groups.get(a.developerId!) ?? []), a]);
  return [...groups.entries()].map(([developerId, list]) => ({
    developerId, developerName: list.find(a => a.developerName)?.developerName ?? null, apps: list.length,
    sharePercent: pct(list.length, identified.length) ?? 0,
    medianRatingCount: median(list.flatMap(a => a.ratingCount != null ? [a.ratingCount] : [])),
  })).sort((a, b) => b.apps - a.apps || String(a.developerName).localeCompare(String(b.developerName)) || a.developerId.localeCompare(b.developerId));
}

export interface CurrencyPrices { currency: string; count: number; min: number; p25: number; median: number; p75: number; max: number }

export function paidPricesByCurrency(apps: readonly MarketApp[]): { currencies: CurrencyPrices[]; paidWithoutCurrency: number } {
  const paid = apps.filter(a => priceClass(a) === "paid" && a.price.amount != null && a.price.amount > 0);
  const groups = new Map<string, number[]>();
  for (const a of paid) if (a.price.currency) groups.set(a.price.currency, [...(groups.get(a.price.currency) ?? []), a.price.amount!]);
  const round = (n: number | null) => n == null ? 0 : Math.round(n * 100) / 100;
  return {
    currencies: [...groups.entries()].map(([currency, values]) => ({ currency, count: values.length, min: round(Math.min(...values)), p25: round(percentile(values, 0.25)), median: round(median(values)), p75: round(percentile(values, 0.75)), max: round(Math.max(...values)) }))
      .sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency)),
    paidWithoutCurrency: paid.filter(a => !a.price.currency).length,
  };
}

/** All six indicators for one cohort. */
export function computeIndicators(apps: readonly MarketApp[], now: number, t: MarketThresholds = MARKET_THRESHOLDS): Record<IndicatorKey, Indicator> {
  const DAY = 86_400_000;
  // Quality Gap
  const rated = apps.filter(a => knownRating(a) != null);
  const low = rated.filter(a => knownRating(a)! < t.lowRating);
  const qualityGap = share("qualityGap", apps, rated, low, apps.length - rated.length, 0, t,
    [...low].sort((a, b) => knownRating(a)! - knownRating(b)! || byName(a, b)), { medianRating: round1(median(rated.map(a => knownRating(a)!))) });

  // Neglected Competitors
  const updates = apps.map(a => ({ a, d: checkDate(a.storeUpdatedAt, now, t) }));
  const updatedKnown = updates.filter(u => u.d.status === "valid");
  const stale = updatedKnown.filter(u => (now - (u.d as { time: number }).time) > t.neglectedDays * DAY);
  const neglected = share("neglected", apps, updatedKnown.map(u => u.a), stale.map(u => u.a), updates.filter(u => u.d.status === "unknown").length, updates.filter(u => u.d.status === "invalid").length, t,
    [...stale].sort((x, y) => (x.d as { time: number }).time - (y.d as { time: number }).time || byName(x.a, y.a)).map(u => u.a));

  // Newcomer Presence
  const releases = apps.map(a => ({ a, d: checkDate(a.releasedAt, now, t) }));
  const releasedKnown = releases.filter(r => r.d.status === "valid");
  const fresh = releasedKnown.filter(r => (now - (r.d as { time: number }).time) <= t.newcomerDays * DAY);
  const newcomers = share("newcomers", apps, releasedKnown.map(r => r.a), fresh.map(r => r.a), releases.filter(r => r.d.status === "unknown").length, releases.filter(r => r.d.status === "invalid").length, t,
    [...fresh].sort((x, y) => (y.d as { time: number }).time - (x.d as { time: number }).time || byName(x.a, y.a)).map(r => r.a));

  // Developer Concentration
  const identified = apps.filter(a => a.developerId);
  const devs = developerShares(apps);
  const top = devs.slice(0, t.topDevelopers);
  const topIds = new Set(top.map(d => d.developerId));
  const topApps = identified.filter(a => topIds.has(a.developerId!));
  const concentration = share("concentration", apps, identified, topApps, apps.length - identified.length, 0, t,
    [...topApps].sort((a, b) => (b.ratingCount ?? -1) - (a.ratingCount ?? -1) || byName(a, b)),
    { distinctDevelopers: devs.length, topDevelopers: top.map(d => d.developerName ?? "Unnamed developer").join(", ") || null });

  // Incumbent Strength
  const counted = apps.filter(a => a.ratingCount != null && a.ratingCount >= 0);
  const countStatus = sampleStatus(counted.length, apps.length, t);
  const counts = counted.map(a => a.ratingCount!);
  const incumbentStrength: Indicator = {
    key: "incumbentStrength", value: countStatus === "insufficient" ? null : round0(median(counts)), numerator: null, denominator: counted.length,
    cohortSize: apps.length, unknown: apps.length - counted.length, invalid: 0, status: countStatus,
    details: countStatus === "insufficient" ? { p25: null, p75: null } : { p25: round0(percentile(counts, 0.25)), p75: round0(percentile(counts, 0.75)) },
    supporting: countStatus === "insufficient" ? [] : [...counted].sort((a, b) => b.ratingCount! - a.ratingCount! || byName(a, b)).slice(0, 5).map(a => a.appId),
  };

  // Pricing Landscape (free share of known prices; paid statistics per currency)
  const priced = apps.filter(a => priceClass(a) !== "unknown");
  const free = priced.filter(a => priceClass(a) === "free");
  const { currencies, paidWithoutCurrency } = paidPricesByCurrency(apps);
  const main = currencies[0];
  const pricing = share("pricing", apps, priced, free, apps.length - priced.length, 0, t,
    apps.filter(a => priceClass(a) === "paid" && a.price.currency === main?.currency).sort((a, b) => (b.price.amount ?? 0) - (a.price.amount ?? 0) || byName(a, b)),
    { paidApps: priced.length - free.length, currencies: currencies.length, mainCurrency: main?.currency ?? null, medianPaidPrice: main?.median ?? null, paidWithoutCurrency });

  return { qualityGap, neglected, newcomers, concentration, incumbentStrength, pricing };
}
const round1 = (n: number | null) => n == null ? null : Math.round(n * 10) / 10;
const round0 = (n: number | null) => n == null ? null : Math.round(n);

/* ------------------------------------------------------------------ distributions */

export interface Bucket { label: string; count: number }

export const RATING_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "Below 3.0", min: 0, max: 3 }, { label: "3.0–3.4", min: 3, max: 3.5 }, { label: "3.5–3.9", min: 3.5, max: 4 },
  { label: "4.0–4.4", min: 4, max: 4.5 }, { label: "4.5–5.0", min: 4.5, max: 5.0001 },
];
export function ratingDistribution(apps: readonly MarketApp[]): { buckets: Bucket[]; unknown: number } {
  const known = apps.map(knownRating).filter((r): r is number => r != null);
  return { buckets: RATING_BUCKETS.map(b => ({ label: b.label, count: known.filter(r => r >= b.min && r < b.max).length })), unknown: apps.length - known.length };
}

export const AGE_BUCKETS: { label: string; maxDays: number }[] = [
  { label: "Under 3 months", maxDays: 91 }, { label: "3–12 months", maxDays: 365 }, { label: "1–2 years", maxDays: 730 },
  { label: "2–5 years", maxDays: 1826 }, { label: "Over 5 years", maxDays: Infinity },
];
export function ageDistribution(values: readonly (string | null)[], now: number, t: MarketThresholds = MARKET_THRESHOLDS): { buckets: Bucket[]; unknown: number; invalid: number } {
  const checks = values.map(v => checkDate(v, now, t));
  const ages = checks.flatMap(c => c.status === "valid" ? [(now - c.time) / 86_400_000] : []);
  let previous = -Infinity;
  const buckets = AGE_BUCKETS.map(b => { const count = ages.filter(a => a >= previous && a < b.maxDays).length; previous = b.maxDays; return { label: b.label, count }; });
  return { buckets, unknown: checks.filter(c => c.status === "unknown").length, invalid: checks.filter(c => c.status === "invalid").length };
}

/* ------------------------------------------------------------------ cohort views */

export interface CohortDefinition {
  kind: "category" | "chart";
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  /** Listing category name (category cohorts) or chart category key (chart cohorts). */
  category: string | null;
  /** Chart cohorts: P1 series id, title parts and snapshot. */
  chart?: { seriesId: string; context: string; source: string; snapshotId: number; observedAt: string; depth: number | null };
}

export interface CohortCoverage {
  /** Rows the source could have returned; null when unknown. */
  available: number | null;
  /** True when the bounded query stopped at its cap: metrics cover only the loaded rows. */
  truncated: boolean;
  /** Chart cohorts: entries without a current listing in this country/language. */
  missingListings: number;
}

export interface Freshness { newest: string | null; oldest: string | null; stale: number; unknown: number }
export function cohortFreshness(apps: readonly MarketApp[], now: number, t: MarketThresholds = MARKET_THRESHOLDS): Freshness {
  const times = apps.flatMap(a => a.lastObservedAt && Number.isFinite(Date.parse(a.lastObservedAt)) ? [a.lastObservedAt] : []).sort();
  return { newest: times.at(-1) ?? null, oldest: times[0] ?? null,
    stale: times.filter(v => now - Date.parse(v) > t.staleAfterHours * 3_600_000).length, unknown: apps.length - times.length };
}

export interface MarketView {
  definition: CohortDefinition;
  coverage: CohortCoverage;
  size: number;
  freshness: Freshness;
  indicators: Record<IndicatorKey, Indicator>;
  ratingDistribution: ReturnType<typeof ratingDistribution>;
  releaseDistribution: ReturnType<typeof ageDistribution>;
  updateDistribution: ReturnType<typeof ageDistribution>;
  pricing: { free: number; paid: number; unknown: number; currencies: CurrencyPrices[]; paidWithoutCurrency: number };
  developers: DeveloperShare[];
  identifiedApps: number;
  /** Leading apps: by chart position (chart cohorts) or by known rating count (category cohorts). */
  leading: MarketApp[];
  /** Every app referenced by the view, keyed by id (for supporting-app links). */
  apps: Record<string, MarketApp>;
}

export function buildMarketView(definition: CohortDefinition, apps: readonly MarketApp[], coverage: CohortCoverage, now: number, t: MarketThresholds = MARKET_THRESHOLDS): MarketView {
  const indicators = computeIndicators(apps, now, t);
  const classes = apps.map(priceClass);
  const prices = paidPricesByCurrency(apps);
  const leading = definition.kind === "chart"
    ? [...apps].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || byName(a, b)).slice(0, 10)
    : apps.filter(a => a.ratingCount != null).sort((a, b) => b.ratingCount! - a.ratingCount! || byName(a, b)).slice(0, 10);
  const developers = developerShares(apps);
  const referenced = new Set([...leading.map(a => a.appId), ...Object.values(indicators).flatMap(i => i.supporting)]);
  return {
    definition, coverage, size: apps.length, freshness: cohortFreshness(apps, now, t), indicators,
    ratingDistribution: ratingDistribution(apps),
    releaseDistribution: ageDistribution(apps.map(a => a.releasedAt), now, t),
    updateDistribution: ageDistribution(apps.map(a => a.storeUpdatedAt), now, t),
    pricing: { free: classes.filter(c => c === "free").length, paid: classes.filter(c => c === "paid").length, unknown: classes.filter(c => c === "unknown").length, ...prices },
    developers: developers.slice(0, 8), identifiedApps: apps.filter(a => a.developerId).length,
    leading, apps: Object.fromEntries(apps.filter(a => referenced.has(a.appId)).map(a => [a.appId, a])),
  };
}

export interface OpportunityRow {
  category: string;
  size: number;
  indicators: Record<IndicatorKey, Indicator>;
  freshness: Freshness;
}
export interface OpportunityTable {
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  coverage: CohortCoverage;
  rows: OpportunityRow[];
  uncategorized: number;
  apps: Record<string, MarketApp>;
}

/** One row per listing category within a single store/country/language context. */
export function buildOpportunityTable(context: { store: "ios" | "play"; country: string; requestedLanguage: string }, apps: readonly MarketApp[], coverage: CohortCoverage, now: number, t: MarketThresholds = MARKET_THRESHOLDS): OpportunityTable {
  const groups = new Map<string, MarketApp[]>();
  for (const a of apps) if (a.category) groups.set(a.category, [...(groups.get(a.category) ?? []), a]);
  const rows = [...groups.entries()].map(([category, list]) => ({ category, size: list.length, indicators: computeIndicators(list, now, t), freshness: cohortFreshness(list, now, t) }))
    .sort((a, b) => b.size - a.size || a.category.localeCompare(b.category));
  const referenced = new Set(rows.flatMap(r => Object.values(r.indicators).flatMap(i => i.supporting)));
  return { ...context, coverage, rows, uncategorized: apps.filter(a => !a.category).length, apps: Object.fromEntries(apps.filter(a => referenced.has(a.appId)).map(a => [a.appId, a])) };
}

/* ------------------------------------------------------------------ methodology */

export const INDICATOR_INFO: Record<IndicatorKey, { title: string; unit: "percent" | "count" | "pricing"; definition: (t: MarketThresholds) => string; denominator: string; caution: string }> = {
  qualityGap: { title: "Quality Gap", unit: "percent", definition: t => `Share of apps with a known rating below ${t.lowRating.toFixed(1)}.`,
    denominator: "Apps with a known store rating (unrated apps and apps with zero ratings are unknown).", caution: "A low rating can reflect many things; it does not prove unmet demand." },
  neglected: { title: "Neglected Competitors", unit: "percent", definition: t => `Share of apps whose last store update is older than ${Math.round(t.neglectedDays / 30.4)} months.`,
    denominator: "Apps with a valid last-update date. Missing dates are unknown, never counted as neglected; future dates are invalid.", caution: "An old update date can also mean a finished, stable app." },
  newcomers: { title: "Newcomer Presence", unit: "percent", definition: t => `Share of apps released in the last ${Math.round(t.newcomerDays / 30.4)} months.`,
    denominator: "Apps with a valid store release date (future or implausible dates are excluded).", caution: "Tracked apps only; new apps outside the tracked cohort are not seen." },
  concentration: { title: "Developer Concentration", unit: "percent", definition: t => `Share of tracked apps that belong to the ${t.topDevelopers} developers with the most tracked apps.`,
    denominator: "Tracked apps with an identified store developer.", caution: "This is a count of tracked apps, not market share, downloads or revenue." },
  incumbentStrength: { title: "Incumbent Strength", unit: "count", definition: () => "Median store rating count, with the 25th and 75th percentiles (linear interpolation).",
    denominator: "Apps with a known rating count (zero is a real zero).", caution: "Rating counts are cumulative and differ by store; they are not download or user counts." },
  pricing: { title: "Pricing Landscape", unit: "pricing", definition: () => "Share of apps that are free to download; paid price statistics are calculated per currency.",
    denominator: "Apps with a known price. Unknown prices are never treated as free; currencies are never mixed.", caution: "Download price excludes in-app purchases and subscriptions." },
};
