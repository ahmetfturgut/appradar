/**
 * Deterministic app comparison (P3). Pure: inputs are catalog details and P1 ranking series.
 * Rules:
 *  - One country + requested language; every app must be in the same store, otherwise nothing is compared.
 *  - Current listing metrics are labelled with their own observation date; they are never placed on
 *    historical chart timestamps.
 *  - History is overlaid only when every app has a series with the same source and role
 *    (detail vs chart-derived observations). Otherwise each app's series is shown separately and labelled.
 *  - Ranking history is overlaid only within one shared chart series (same store, country, language,
 *    chart, category, source, depth). Eligible snapshots keep null positions when the app was not in
 *    that top N; ineligible/incomplete observations are omitted from plots, never treated as confirmed absences.
 *  - Prices are shown with their currency; different currencies are flagged and never compared.
 *  - No score, no winner.
 */
import type { AppDetails, HistorySeries } from "../read/app-details.ts";
import type { ListingSummary } from "../read/shared.ts";
import type { AppRankingSeries } from "./views.ts";

export interface CompareInput {
  id: string;
  details: AppDetails | null;
  rankings: AppRankingSeries[] | null;
}

export interface CompareApp {
  id: string;
  name: string | null;
  store: "ios" | "play" | null;
  listing: ListingSummary | null;
  /** True when the app exists but has no current listing in this country/language. */
  missingListing: boolean;
  /** True when the id is not in the catalog at all. */
  unknownApp: boolean;
}

export type HistoryMetric = "rating" | "ratingCount";
export interface OverlaySeries { appId: string; label: string; points: { observedAt: string; value: number | null }[] }
export interface HistoryComparison {
  metric: HistoryMetric;
  /** Overlay only when every compared app has a series of this source and role. */
  overlay: { source: string; role: "detail" | "discovery"; series: OverlaySeries[] } | null;
  /** Apps whose history cannot be overlaid, with the reason. */
  separate: { appId: string; reason: "no_history" | "different_source"; series: OverlaySeries | null; source: string | null }[];
}

export interface RankingComparison {
  /** Chart series shared by at least two compared apps. */
  shared: { seriesId: string; summary: AppRankingSeries["summary"]; apps: { appId: string; latestPosition: number | null; change1d: number | null; points: AppRankingSeries["points"] }[] }[];
  /** Series where only one compared app appeared (shown per app, not overlaid). */
  single: { appId: string; seriesId: string; summary: AppRankingSeries["summary"]; latestPosition: number | null; change1d: number | null }[];
}

export interface CompareModel {
  country: string;
  language: string;
  apps: CompareApp[];
  store: "ios" | "play" | null;
  storeMismatch: boolean;
  /** Distinct currencies among known prices; more than one means prices are not comparable. */
  currencies: string[];
  history: HistoryComparison[];
  rankings: RankingComparison;
  /** Enough to compare: two or three apps with a current listing in the same store. */
  comparable: boolean;
}

function chooseSeries(series: HistorySeries[]): HistorySeries | null {
  // Prefer full detail observations; chart-derived ("discovery") observations are a different method.
  return series.find(s => s.role === "detail" && s.points.length) ?? series.find(s => s.points.length) ?? null;
}

export function buildCompareModel(country: string, language: string, inputs: readonly CompareInput[]): CompareModel {
  const apps: CompareApp[] = inputs.map(i => ({
    id: i.id, name: i.details?.listing?.name ?? null, store: i.details?.app.store ?? null,
    listing: i.details?.listing ?? null, missingListing: !!i.details && !i.details.listing, unknownApp: !i.details,
  }));
  const stores = [...new Set(apps.flatMap(a => a.store ? [a.store] : []))];
  const storeMismatch = stores.length > 1;
  const listed = apps.filter(a => a.listing);
  const comparable = !storeMismatch && listed.length >= 2 && listed.length === apps.length;
  const currencies = [...new Set(listed.flatMap(a => a.listing!.price.amount != null && a.listing!.price.amount > 0 && a.listing!.price.currency ? [a.listing!.price.currency] : []))].sort();

  const history: HistoryComparison[] = (["rating", "ratingCount"] as const).map(metric => {
    const chosen = inputs.filter(i => i.details?.listing).map(i => ({ id: i.id, name: i.details!.listing!.name ?? "App", series: chooseSeries(i.details!.history.series) }));
    const toOverlay = (c: (typeof chosen)[number]): OverlaySeries | null => c.series ? { appId: c.id, label: c.name, points: c.series.points.map(p => ({ observedAt: p.observedAt, value: p[metric] })) } : null;
    const withSeries = chosen.filter(c => c.series);
    const reference = withSeries[0]?.series ?? null;
    const sameMethod = !!reference && withSeries.length === chosen.length && withSeries.every(c => c.series!.source === reference.source && c.series!.role === reference.role);
    if (comparable && sameMethod && reference) return { metric, overlay: { source: reference.source, role: reference.role, series: withSeries.map(c => toOverlay(c)!) }, separate: [] };
    return { metric, overlay: null, separate: chosen.map(c => ({ appId: c.id, reason: c.series ? "different_source" as const : "no_history" as const, series: toOverlay(c), source: c.series?.source ?? null })) };
  });

  const bySeries = new Map<string, { summary: AppRankingSeries["summary"]; apps: RankingComparison["shared"][number]["apps"] }>();
  for (const i of inputs) for (const s of i.rankings ?? []) {
    const entry = bySeries.get(s.id) ?? { summary: s.summary, apps: [] };
    entry.apps.push({ appId: i.id, latestPosition: s.latestPosition, change1d: s.change1d, points: s.points });
    bySeries.set(s.id, entry);
  }
  const rankings: RankingComparison = { shared: [], single: [] };
  for (const [seriesId, entry] of bySeries) {
    if (entry.apps.length >= 2) rankings.shared.push({ seriesId, ...entry });
    else rankings.single.push({ appId: entry.apps[0]!.appId, seriesId, summary: entry.summary, latestPosition: entry.apps[0]!.latestPosition, change1d: entry.apps[0]!.change1d });
  }
  rankings.shared.sort((a, b) => b.apps.length - a.apps.length || a.summary.context.localeCompare(b.summary.context));

  return { country, language, apps, store: stores.length === 1 ? stores[0]! : null, storeMismatch, currencies, history, rankings, comparable };
}
