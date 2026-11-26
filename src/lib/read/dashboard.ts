import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import { getRecentReleases } from "./discovery.ts";
import { listCategories } from "./explorer.ts";
import { Category, Country, Language, Store, freshness, listingsFor, num, parseInput, str, type Freshness, type ListingSummary } from "./shared.ts";

export interface CatalogStats {
  apps: number;
  listings: number;
  iosApps: number;
  playApps: number;
  developers: number;
  countries: number;
  categories: number;
  uncategorizedListings: number;
  chartSnapshots: number;
  keywordSnapshots: number;
  latestObservedAt: string | null;
  oldestObservedAt: string | null;
  freshness: Freshness;
}

const StatsInput = z.object({ store: Store.optional(), country: Country.optional() });

/** Catalog totals over current listings. Requires migration 20261126000800. */
export async function getCatalogStats(input: z.input<typeof StatsInput> = {}, client: ReadClient = defaultReadClient()): Promise<CatalogStats> {
  const v = parseInput(StatsInput, input);
  const raw = await client.rpc("appradar_read_catalog_stats", { p_store: v.store ?? null, p_country: v.country ?? null });
  if (!raw || typeof raw !== "object") throw new ReadError("read_unexpected_shape");
  const r = raw as Record<string, unknown>;
  const n = (k: string) => num(r[k]) ?? 0;
  return {
    apps: n("apps"), listings: n("listings"), iosApps: n("iosApps"), playApps: n("playApps"), developers: n("developers"),
    countries: n("countries"), categories: n("categories"), uncategorizedListings: n("uncategorizedListings"),
    chartSnapshots: n("chartSnapshots"), keywordSnapshots: n("keywordSnapshots"),
    latestObservedAt: str(r.latestObservedAt), oldestObservedAt: str(r.oldestObservedAt),
    freshness: freshness(str(r.latestObservedAt), client.now()),
  };
}

export interface RankingChange {
  appId: string;
  position: number;
  /** null: the app was not in the previous snapshot (unknown, not a new entry or drop). */
  previousPosition: number | null;
  /** previousPosition - position; positive is a rise. null when not comparable. */
  change: number | null;
  listing: ListingSummary | null;
}

export interface RankingChangeSeries {
  snapshotId: number;
  previousSnapshotId: number;
  source: string;
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  context: string;
  category: string | null;
  coverageStatus: string;
  previousCoverageStatus: string;
  observedAt: string;
  previousObservedAt: string;
  /** Real elapsed time between the two observations; never presented as a daily rate. */
  elapsedHours: number;
  entries: RankingChange[];
}

export const RankingChangesInput = z.object({
  store: Store.optional(), country: Country.optional(), language: Language.optional(),
  category: Category.optional(), context: z.string().trim().min(1).max(500).optional(),
  seriesLimit: z.coerce.number().int().min(1).max(50).default(10),
  positionLimit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * Position changes between the two latest snapshots of each chart definition
 * (same source, store, country, language, context and category). Charts with only
 * one snapshot are omitted. Requires migration 20261126000800.
 */
export async function getRankingChanges(input: z.input<typeof RankingChangesInput> = {}, client: ReadClient = defaultReadClient()): Promise<RankingChangeSeries[]> {
  const v = parseInput(RankingChangesInput, input);
  const rows = await client.rpc("appradar_read_ranking_changes", {
    p_store: v.store ?? null, p_country: v.country ?? null, p_language: v.language ?? null,
    p_category: v.category ?? null, p_context: v.context ?? null,
    p_series_limit: v.seriesLimit, p_position_limit: v.positionLimit,
  });
  if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
  const series = new Map<number, RankingChangeSeries>();
  for (const r of rows as Record<string, unknown>[]) {
    const id = Number(r.snapshot_id);
    let s = series.get(id);
    if (!s) {
      const observedAt = String(r.observed_at), previousObservedAt = String(r.previous_observed_at);
      series.set(id, s = {
        snapshotId: id, previousSnapshotId: Number(r.previous_snapshot_id), source: String(r.source),
        store: r.store === "play" ? "play" : "ios", country: String(r.country), requestedLanguage: String(r.requested_language),
        context: String(r.context), category: str(r.category), coverageStatus: String(r.coverage_status),
        previousCoverageStatus: String(r.previous_coverage_status), observedAt, previousObservedAt,
        elapsedHours: Math.round((Date.parse(observedAt) - Date.parse(previousObservedAt)) / 360000) / 10, entries: [],
      });
    }
    s.entries.push({ appId: String(r.app_id), position: Number(r.position), previousPosition: num(r.previous_position), change: num(r.change), listing: null });
  }
  // Attach current listing names per chart context.
  await Promise.all([...series.values()].map(async s => {
    const listings = await listingsFor(client, s.entries.map(e => e.appId), s.country, s.requestedLanguage);
    for (const e of s.entries) e.listing = listings.get(e.appId) ?? null;
  }));
  return [...series.values()];
}

export const DashboardInput = z.object({
  store: Store.optional(), country: Country.optional(), language: Language.optional(),
  recentDays: z.coerce.number().int().min(1).max(365).default(30),
  recentLimit: z.coerce.number().int().min(1).max(50).default(8),
});

export interface Dashboard {
  stats: CatalogStats;
  categories: { category: string | null; appCount: number; listingCount: number }[];
  recentReleases: ListingSummary[];
  rankingChanges: RankingChangeSeries[];
}

/** All dashboard sections in parallel. Any failing section fails the call; nothing is substituted. */
export async function getDashboard(input: z.input<typeof DashboardInput> = {}, client: ReadClient = defaultReadClient()): Promise<Dashboard> {
  const v = parseInput(DashboardInput, input);
  const scope = { ...(v.store ? { store: v.store } : {}), ...(v.country ? { country: v.country } : {}) };
  const withLanguage = { ...scope, ...(v.language ? { language: v.language } : {}) };
  const [stats, categories, recent, rankingChanges] = await Promise.all([
    getCatalogStats(scope, client),
    listCategories(withLanguage, client),
    getRecentReleases({ ...withLanguage, store: v.store ?? "ios", days: v.recentDays, pageSize: v.recentLimit }, client),
    getRankingChanges({ ...withLanguage, seriesLimit: 5, positionLimit: 20 }, client),
  ]);
  return { stats, categories, recentReleases: recent.items, rankingChanges };
}
