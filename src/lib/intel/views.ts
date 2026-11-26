/**
 * Pure view models for the Trending, New Releases and App Details ranking screens.
 * Inputs are snapshot facts (+ entries) and current listings; output is serialisable.
 */
import type { ListingSummary } from "../read/shared.ts";
import {
  HORIZONS, appHistory, compareSnapshots, exclusionReasons, firstObserved, isEligible, pickBaseline, seriesKey, summariseSeries,
  type EntryChange, type ExclusionReason, type Horizon, type HistoryPoint, type ListKind, type SeriesSummary, type SnapshotFacts, type SnapshotWithEntries,
} from "./ranking.ts";

/** Short, URL-safe id for a series key (FNV-1a, 32-bit). Stable across requests. */
export function seriesId(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(36);
}

export interface ChartFilters {
  store?: "ios" | "play" | undefined;
  category?: string | undefined;
  chart?: string | undefined;
  series?: string | undefined;
  horizon: Horizon;
}

/** Narrow the available series by filters; an explicit `series` id wins. */
export function selectSeries(series: readonly SeriesSummary[], f: ChartFilters): SeriesSummary | null {
  if (f.series) { const exact = series.find(s => seriesId(s.key) === f.series); if (exact) return exact; }
  const matches = series.filter(s => (!f.store || s.store === f.store) && (!f.category || s.category === f.category) && (!f.chart || s.context === f.chart));
  // Prefer a series that can actually be compared, then the freshest.
  return [...matches].sort((a, b) => Number(!!b.latestEligible) - Number(!!a.latestEligible) || Date.parse(b.latestObservedAt) - Date.parse(a.latestObservedAt))[0] ?? null;
}

export interface ChartRow extends EntryChange {
  listing: ListingSummary | null;
  /** Positions across the active segment (same depth), oldest first; ineligible snapshots are flagged gaps. */
  history: HistoryPoint[];
  /** Earliest eligible snapshot in the loaded window where the app was present. */
  firstObservedAt: string | null;
}

export interface ChartView {
  summary: SeriesSummary;
  seriesId: string;
  horizon: Horizon;
  latest: { id: number; observedAt: string; observedTimeBasis: "source" | "collection"; depth: number | null } | null;
  available: Record<Horizon, boolean>;
  baseline: { id: number; observedAt: string } | null;
  elapsedHours: number | null;
  rows: ChartRow[];
  newlyObserved: ChartRow[];
  notObservedInLatest: number;
  /** Ineligible snapshots of the series in the window, with reasons (for the coverage panel). */
  excludedSnapshots: { id: number; observedAt: string; reasons: ExclusionReason[] }[];
}

/**
 * Builds the view for one series. `snapshots` must contain every snapshot of the series in the
 * window; entries are only needed for eligible snapshots of the active depth.
 */
export function buildChartView(summary: SeriesSummary, snapshots: readonly SnapshotWithEntries[], horizon: Horizon, listings: ReadonlyMap<string, ListingSummary>): ChartView {
  const own = snapshots.filter(s => seriesKey(s) === summary.key);
  const latest = summary.latestEligible ? own.find(s => s.id === summary.latestEligible!.id) ?? null : null;
  const segment = own.filter(s => s.requestedDepth === summary.depth || !isEligible(s));
  const excludedSnapshots = own.filter(s => !isEligible(s)).map(s => ({ id: s.id, observedAt: s.observedAt, reasons: exclusionReasons(s) })).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const base = { summary, seriesId: seriesId(summary.key), horizon, excludedSnapshots };
  if (!latest) return { ...base, latest: null, available: { "1d": false, "7d": false, "30d": false }, baseline: null, elapsedHours: null, rows: [], newlyObserved: [], notObservedInLatest: 0 };
  const available = Object.fromEntries(HORIZONS.map(h => [h, !!pickBaseline(latest, own, h)])) as Record<Horizon, boolean>;
  const baseline = pickBaseline(latest, own, horizon);
  const comparison = compareSnapshots(latest, baseline, horizon);
  const rows: ChartRow[] = comparison.entries.map(entry => ({
    ...entry, listing: listings.get(entry.appId) ?? null,
    history: appHistory(segment, entry.appId), firstObservedAt: firstObserved(segment, entry.appId),
  }));
  return {
    ...base, latest: { id: latest.id, observedAt: latest.observedAt, observedTimeBasis: latest.observedTimeBasis, depth: latest.requestedDepth },
    available, baseline: comparison.baseline, elapsedHours: comparison.elapsedHours,
    rows, newlyObserved: rows.filter(r => r.newlyObserved), notObservedInLatest: comparison.notObservedInLatest,
  };
}

export interface ChartPageModel {
  kind: ListKind;
  series: (SeriesSummary & { id: string })[];
  categories: string[];
  charts: string[];
  view: ChartView | null;
}

/** Everything a chart page needs, from facts already filtered by store/country/language. */
export function buildChartPage(kind: ListKind, facts: readonly SnapshotFacts[], snapshots: readonly SnapshotWithEntries[], filters: ChartFilters, listings: ReadonlyMap<string, ListingSummary>, now: number): ChartPageModel {
  const series = summariseSeries(facts.filter(f => f.kind === kind && (!filters.store || f.store === filters.store)), now);
  const selected = selectSeries(series, filters);
  return {
    kind, series: series.map(s => ({ ...s, id: seriesId(s.key) })),
    categories: [...new Set(series.flatMap(s => s.category ? [s.category] : []))].sort(),
    charts: [...new Set(series.map(s => s.context))].sort(),
    view: selected ? buildChartView(selected, snapshots, filters.horizon, listings) : null,
  };
}

/** Which snapshots need entries loaded for the selected series (eligible, active depth). */
export function snapshotsNeedingEntries(facts: readonly SnapshotFacts[], selected: SeriesSummary | null): number[] {
  if (!selected) return [];
  return facts.filter(f => seriesKey(f) === selected.key && isEligible(f) && f.requestedDepth === selected.depth).map(f => f.id);
}

export interface AppRankingSeries {
  id: string;
  summary: SeriesSummary;
  points: HistoryPoint[];
  latestPosition: number | null;
  /** Latest comparable 1-day change for this app, if a 1-day baseline exists. */
  change1d: number | null;
  observedIn: number;
}

/** App Details: one entry per series the app appeared in, each kept independent. */
export function buildAppRankings(snapshots: readonly SnapshotWithEntries[], appId: string, now: number): AppRankingSeries[] {
  return summariseSeries(snapshots, now).map(summary => {
    const own = snapshots.filter(s => seriesKey(s) === summary.key);
    const segment = own.filter(s => s.requestedDepth === summary.depth || !isEligible(s));
    const points = appHistory(segment, appId);
    const latest = summary.latestEligible ? own.find(s => s.id === summary.latestEligible!.id)! : null;
    const baseline = latest ? pickBaseline(latest, own, "1d") : null;
    const latestEntry = latest?.entries.find(e => e.appId === appId);
    const previous = baseline?.entries.find(e => e.appId === appId);
    return {
      id: seriesId(summary.key), summary, points,
      latestPosition: latestEntry?.position ?? null,
      change1d: latestEntry?.position != null && previous?.position != null ? previous.position - latestEntry.position : null,
      observedIn: points.filter(p => p.present && p.eligible).length,
    };
  });
}

/** Human label for a chart context/category as the source names them (raw values are kept). */
const APPLE_GENRES: Record<string, string> = { "6000": "Business", "6007": "Productivity", "6013": "Health & Fitness", "6015": "Finance", "6017": "Education", "6008": "Photo & Video", "6018": "Books", "6023": "Food & Drink", "6003": "Travel" };
export function categoryLabel(store: "ios" | "play", category: string | null): string {
  if (!category) return "All categories";
  if (store === "ios" && APPLE_GENRES[category]) return `${APPLE_GENRES[category]} (${category})`;
  return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAnd\b/g, "&");
}
const CHART_LABELS: Record<string, string> = { topFree: "Top Free", topPaid: "Top Paid", topGrossing: "Top Grossing", topfreeapplications: "Top Free", toppaidapplications: "Top Paid", newFreeApps: "New Free Apps", newPaidApps: "New Paid Apps", newApps: "New Apps" };
export const chartLabel = (context: string) => CHART_LABELS[context] ?? context;
