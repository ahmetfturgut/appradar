/**
 * Deterministic chart-ranking calculations (P1: Trending, New Releases, App Details rankings).
 * Pure functions over snapshot facts: no IO, no clock except the `now` argument.
 * The same code runs on Supabase facts (src/lib/read/rankings.ts) and on the development demo.
 *
 * Integrity rules enforced here:
 *  - A change is computed only between two *eligible* snapshots of the *same series*
 *    (source/provider, list kind, collection mode, store, country, requested language, context, category)
 *    with the *same requested depth*.
 *  - Eligible = bounded coverage, accepted and untruncated run, no incompleteness reason,
 *    known requested depth fully met by the stored entries.
 *  - A horizon (1/7/30 days) uses a baseline whose real elapsed time falls inside that horizon's window.
 *    Adjacent snapshots are never relabelled as "daily".
 *  - An app missing from a snapshot is "not observed in the top N", never a confirmed drop.
 *    Missing observations are not filled in.
 */

export type ListKind = "chart" | "new_apps";

export interface SnapshotFacts {
  id: number;
  kind: ListKind;
  source: string;
  sourceBuild: string | null;
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  context: string;
  category: string | null;
  coverageStatus: "bounded" | "partial" | "truncated";
  entryCount: number;
  observedAt: string;
  observedTimeBasis: "source" | "collection";
  /** Run facts; null when the producing run is not known (e.g. imported data). */
  runValidationStatus: string | null;
  runTruncated: boolean | null;
  runIncompleteReason: string | null;
  runCollectionMode: string | null;
  /** Requested chart depth (maxResults); null when unknown. */
  requestedDepth: number | null;
}

export interface SnapshotWithEntries extends SnapshotFacts {
  /** Ranked entries; position may be null when the source gave none. */
  entries: { appId: string; position: number | null }[];
}

export type ExclusionReason =
  | "truncated" | "partial_coverage" | "run_not_accepted" | "run_unverified"
  | "run_incomplete" | "depth_unknown" | "depth_not_met" | "method_mismatch";

export const exclusionLabels: Record<ExclusionReason, string> = {
  truncated: "Truncated run",
  partial_coverage: "Invalid rows dropped",
  run_not_accepted: "Run not accepted",
  run_unverified: "Producing run unknown",
  run_incomplete: "Run marked incomplete",
  depth_unknown: "Requested depth unknown",
  depth_not_met: "Fewer entries than requested",
  method_mismatch: "Not a chart collection",
};

export function exclusionReasons(s: SnapshotFacts): ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  if (s.coverageStatus === "truncated" || s.runTruncated === true) reasons.push("truncated");
  if (s.coverageStatus === "partial") reasons.push("partial_coverage");
  if (s.runValidationStatus == null) reasons.push("run_unverified");
  else if (s.runValidationStatus !== "accepted") reasons.push("run_not_accepted");
  if (s.runIncompleteReason != null) reasons.push("run_incomplete");
  if (s.runCollectionMode != null && s.runCollectionMode !== "charts") reasons.push("method_mismatch");
  if (s.requestedDepth == null) reasons.push("depth_unknown");
  else if (s.entryCount !== s.requestedDepth) reasons.push("depth_not_met");
  return [...new Set(reasons)];
}
export const isEligible = (s: SnapshotFacts) => exclusionReasons(s).length === 0;

/** Series identity. Depth is deliberately not part of it: depth changes split a series into segments. */
export function seriesKey(s: Pick<SnapshotFacts, "kind" | "source" | "store" | "country" | "requestedLanguage" | "context" | "category">): string {
  return JSON.stringify([s.kind, s.source, s.store, s.country, s.requestedLanguage, s.context, s.category]);
}

export type Horizon = "1d" | "7d" | "30d";
export const HORIZONS: Horizon[] = ["1d", "7d", "30d"];
const H = 3_600_000;
/** Accepted baseline windows (hours ago) and target. Outside the window the horizon is unavailable. */
export const HORIZON_WINDOWS: Record<Horizon, { min: number; max: number; target: number; label: string }> = {
  "1d": { min: 18, max: 36, target: 24, label: "1 day" },
  "7d": { min: 6 * 24, max: 8 * 24, target: 7 * 24, label: "7 days" },
  "30d": { min: 27 * 24, max: 33 * 24, target: 30 * 24, label: "30 days" },
};
export const STALE_AFTER_HOURS = 72;

const time = (s: { observedAt: string }) => Date.parse(s.observedAt);
const newestFirst = (a: SnapshotFacts, b: SnapshotFacts) => time(b) - time(a) || b.id - a.id;

/** Baseline for a horizon: eligible, same series and depth, elapsed within the window, nearest to the target. */
export function pickBaseline<T extends SnapshotFacts>(latest: T, candidates: readonly T[], horizon: Horizon): T | null {
  const w = HORIZON_WINDOWS[horizon];
  const key = seriesKey(latest);
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const s of candidates) {
    if (s.id === latest.id || seriesKey(s) !== key || !isEligible(s) || s.requestedDepth !== latest.requestedDepth) continue;
    const hours = (time(latest) - time(s)) / H;
    if (hours < w.min || hours > w.max) continue;
    const distance = Math.abs(hours - w.target);
    if (distance < bestDistance || (distance === bestDistance && best && s.id > best.id)) { best = s; bestDistance = distance; }
  }
  return best;
}

export interface EntryChange {
  appId: string;
  position: number;
  /** Position in the baseline; null when the app was not in the baseline's top N. */
  previousPosition: number | null;
  /** previousPosition - position (positive = rose). null when not observed in the baseline. */
  change: number | null;
  /** True when the app is absent from a comparable baseline of the same depth. */
  newlyObserved: boolean;
}

export interface HorizonComparison {
  horizon: Horizon;
  available: boolean;
  baseline: { id: number; observedAt: string } | null;
  elapsedHours: number | null;
  entries: EntryChange[];
  /** Apps in the baseline top N but not in the latest list. Reported as a count, never as drops. */
  notObservedInLatest: number;
}

export function compareSnapshots(latest: SnapshotWithEntries, baseline: SnapshotWithEntries | null, horizon: Horizon): HorizonComparison {
  const ranked = latest.entries.filter((e): e is { appId: string; position: number } => e.position != null).sort((a, b) => a.position - b.position || a.appId.localeCompare(b.appId));
  if (!baseline) return { horizon, available: false, baseline: null, elapsedHours: null, entries: ranked.map(e => ({ ...e, previousPosition: null, change: null, newlyObserved: false })), notObservedInLatest: 0 };
  const before = new Map(baseline.entries.filter(e => e.position != null).map(e => [e.appId, e.position!]));
  const current = new Set(ranked.map(e => e.appId));
  return {
    horizon, available: true, baseline: { id: baseline.id, observedAt: baseline.observedAt },
    elapsedHours: Math.round((time(latest) - time(baseline)) / H * 10) / 10,
    entries: ranked.map(e => {
      const previous = before.get(e.appId) ?? null;
      return { ...e, previousPosition: previous, change: previous == null ? null : previous - e.position, newlyObserved: previous == null };
    }),
    notObservedInLatest: [...before.keys()].filter(id => !current.has(id)).length,
  };
}

export interface SeriesSummary {
  key: string;
  kind: ListKind;
  source: string;
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  context: string;
  category: string | null;
  /** Depth of the latest eligible snapshot (the active segment). */
  depth: number | null;
  latestObservedAt: string;
  latestEligible: { id: number; observedAt: string } | null;
  /** Newest snapshot excluded from comparisons, if it is newer than the latest eligible one. */
  newerExcluded: { id: number; observedAt: string; reasons: ExclusionReason[] } | null;
  snapshotCount: number;
  eligibleCount: number;
  /** Eligible snapshots with a different depth than the active segment (kept as separate segments). */
  otherDepthCount: number;
  excluded: { reason: ExclusionReason; count: number }[];
  ageHours: number | null;
  stale: boolean;
  horizons: Record<Horizon, boolean>;
}

/** Groups snapshots into series and summarises comparability. */
export function summariseSeries(snapshots: readonly SnapshotFacts[], now: number): SeriesSummary[] {
  const groups = new Map<string, SnapshotFacts[]>();
  for (const s of snapshots) { const k = seriesKey(s); groups.set(k, [...(groups.get(k) ?? []), s]); }
  return [...groups.entries()].map(([key, list]) => {
    const sorted = [...list].sort(newestFirst);
    const first = sorted[0]!;
    const latestEligible = sorted.find(isEligible) ?? null;
    const excludedCounts = new Map<ExclusionReason, number>();
    for (const s of sorted) for (const r of exclusionReasons(s)) excludedCounts.set(r, (excludedCounts.get(r) ?? 0) + 1);
    const eligible = sorted.filter(isEligible);
    const depth = latestEligible?.requestedDepth ?? null;
    const reference = latestEligible ?? first;
    const ageHours = Math.round((now - time(reference)) / H * 10) / 10;
    const newer = latestEligible ? sorted.find(s => time(s) > time(latestEligible) && !isEligible(s)) : first;
    return {
      key, kind: first.kind, source: first.source, store: first.store, country: first.country, requestedLanguage: first.requestedLanguage,
      context: first.context, category: first.category, depth, latestObservedAt: first.observedAt,
      latestEligible: latestEligible ? { id: latestEligible.id, observedAt: latestEligible.observedAt } : null,
      newerExcluded: newer && !isEligible(newer) ? { id: newer.id, observedAt: newer.observedAt, reasons: exclusionReasons(newer) } : null,
      snapshotCount: sorted.length, eligibleCount: eligible.length,
      otherDepthCount: eligible.filter(s => s.requestedDepth !== depth).length,
      excluded: [...excludedCounts.entries()].map(([reason, count]) => ({ reason, count })),
      ageHours, stale: ageHours > STALE_AFTER_HOURS,
      horizons: Object.fromEntries(HORIZONS.map(h => [h, !!(latestEligible && pickBaseline(latestEligible, sorted, h))])) as Record<Horizon, boolean>,
    };
  }).sort((a, b) => a.store.localeCompare(b.store) || a.kind.localeCompare(b.kind) || a.context.localeCompare(b.context) || String(a.category).localeCompare(String(b.category)) || a.source.localeCompare(b.source));
}

export interface HistoryPoint {
  snapshotId: number;
  observedAt: string;
  /** Position in this snapshot; null = not observed in the top N (or the source gave no position). */
  position: number | null;
  present: boolean;
  eligible: boolean;
  reasons: ExclusionReason[];
  depth: number | null;
}

/** Per-app positions across a series, oldest first. Ineligible snapshots stay visible but flagged. */
export function appHistory(snapshots: readonly SnapshotWithEntries[], appId: string): HistoryPoint[] {
  return [...snapshots].sort((a, b) => time(a) - time(b) || a.id - b.id).map(s => {
    const entry = s.entries.find(e => e.appId === appId);
    const reasons = exclusionReasons(s);
    return { snapshotId: s.id, observedAt: s.observedAt, position: entry?.position ?? null, present: !!entry, eligible: reasons.length === 0, reasons, depth: s.requestedDepth };
  });
}

/** Earliest eligible snapshot in the given set where the app was present. */
export function firstObserved(snapshots: readonly SnapshotWithEntries[], appId: string): string | null {
  const hits = snapshots.filter(s => isEligible(s) && s.entries.some(e => e.appId === appId)).map(s => s.observedAt).sort();
  return hits[0] ?? null;
}

/**
 * Latest eligible snapshot before `latest` with the same series and depth, regardless of elapsed time.
 * Mirrors the fixed appradar_read_ranking_changes pairing (Dashboard), which reports elapsed hours
 * instead of claiming a daily interval.
 */
export function previousComparable<T extends SnapshotFacts>(latest: T, candidates: readonly T[]): T | null {
  const key = seriesKey(latest);
  return [...candidates].filter(s => s.id !== latest.id && seriesKey(s) === key && isEligible(s) && s.requestedDepth === latest.requestedDepth
    && (time(s) < time(latest) || (time(s) === time(latest) && s.id < latest.id))).sort(newestFirst)[0] ?? null;
}
