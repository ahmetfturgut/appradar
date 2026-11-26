import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import { exploreApps, type ExplorerResult } from "./explorer.ts";
import {
  Category, Country, Language, LISTING_SELECT, Pagination, Store, listingsFor, mapListing, num, parseInput, range, str, toPage,
  type ListingSummary, type Page,
} from "./shared.ts";

export type DiscoveryKind = "search" | "chart" | "developer" | "new_apps";
/** bounded: a capped list, never the whole market. partial: invalid rows were dropped. truncated: run hit its cap. */
export type CoverageStatus = "bounded" | "partial" | "truncated";

export interface DiscoverySnapshotInfo {
  id: number;
  kind: DiscoveryKind;
  source: string;
  store: Store;
  country: string;
  requestedLanguage: string;
  effectiveLanguage: string | null;
  context: string;
  category: string | null;
  coverageStatus: CoverageStatus;
  entryCount: number;
  observedAt: string;
  observedTimeBasis: "source" | "collection";
  collectedAt: string;
  previousObservedAt: string | null;
  snapshotCount: number | null;
}

function mapSnapshot(row: Record<string, unknown>): DiscoverySnapshotInfo {
  return {
    id: Number(row.id), kind: row.kind as DiscoveryKind, source: String(row.source), store: row.store === "play" ? "play" : "ios",
    country: String(row.country), requestedLanguage: String(row.requested_language), effectiveLanguage: str(row.effective_language),
    context: String(row.context), category: str(row.category), coverageStatus: row.coverage_status as CoverageStatus,
    entryCount: Number(row.entry_count), observedAt: String(row.observed_at),
    observedTimeBasis: row.observed_time_basis === "source" ? "source" : "collection", collectedAt: String(row.collected_at),
    previousObservedAt: str(row.previous_observed_at), snapshotCount: num(row.snapshot_count),
  };
}

const LatestInput = z.object({
  kind: z.enum(["search", "chart", "developer", "new_apps"]).optional(),
  store: Store.optional(), country: Country.optional(), language: Language.optional(), category: Category.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Latest snapshot of every list definition, with coverage. Requires migration 20261126000800. */
export async function getLatestDiscoverySnapshots(input: z.input<typeof LatestInput> = {}, client: ReadClient = defaultReadClient()): Promise<DiscoverySnapshotInfo[]> {
  const v = parseInput(LatestInput, input);
  const rows = await client.rpc("appradar_read_latest_discovery", {
    p_kind: v.kind ?? null, p_store: v.store ?? null, p_country: v.country ?? null,
    p_language: v.language ?? null, p_category: v.category ?? null, p_limit: v.limit,
  });
  if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
  return rows.map(mapSnapshot);
}

export interface ChartEntry {
  position: number | null;
  appId: string;
  storeAppId: string | null;
  /** Current listing in the chart's country/language; null when none is stored or it expired. */
  listing: ListingSummary | null;
}

export const ChartInput = z.object({
  store: Store, country: Country,
  /** Chart definition, e.g. topfreeapplications / topFree. Values are kept exactly as the source names them. */
  context: z.string().trim().min(1).max(500),
  language: Language.optional(), category: Category.optional(), source: z.string().trim().min(1).max(50).optional(),
  kind: z.enum(["chart", "new_apps"]).default("chart"),
  /** A specific historical snapshot; otherwise the latest. */
  snapshotId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

/** One store chart snapshot with ranked entries. Absence from a snapshot is not a rank drop. */
export async function getChart(input: z.input<typeof ChartInput>, client: ReadClient = defaultReadClient()): Promise<{ snapshot: DiscoverySnapshotInfo; entries: ChartEntry[] } | null> {
  const v = parseInput(ChartInput, input);
  const now = client.now();
  const query: Record<string, string> = {
    select: "id,kind,source,store,country,requested_language,effective_language,context,category,coverage_status,entry_count,observed_at,observed_time_basis,collected_at",
    kind: `eq.${v.kind}`, store: `eq.${v.store}`, country: `eq.${v.country}`, context: `eq.${v.context}`,
    expires_at: `gt.${now}`, order: "observed_at.desc,id.desc", limit: "1",
  };
  if (v.language) query.requested_language = `eq.${v.language}`;
  if (v.category) query.category = `eq.${v.category}`;
  if (v.source) query.source = `eq.${v.source}`;
  if (v.snapshotId) query.id = `eq.${v.snapshotId}`;
  const row = (await client.select("discovery_snapshots", query)).rows[0];
  if (!row) return null;
  const snapshot = mapSnapshot(row);
  const { rows } = await client.select("discovery_entries", {
    select: "position,app_id,apps!inner(store_app_id)", snapshot_id: `eq.${snapshot.id}`,
    order: "position.asc.nullslast,app_id.asc", limit: String(v.limit),
  });
  const listings = await listingsFor(client, rows.map(r => String(r.app_id)), snapshot.country, snapshot.requestedLanguage);
  return {
    snapshot,
    entries: rows.map(r => ({
      position: num(r.position), appId: String(r.app_id),
      storeAppId: str((r.apps as Record<string, unknown> | null)?.store_app_id), listing: listings.get(String(r.app_id)) ?? null,
    })),
  };
}

export const RecentReleasesInput = Pagination.extend({
  store: Store.default("ios"),
  country: Country.optional(), language: Language.optional(), category: Category.optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * Recently released apps by store release date (default iOS). Date-only precision is preserved
 * in releasedAtPrecision; midnight is not an exact release time.
 */
export async function getRecentReleases(input: z.input<typeof RecentReleasesInput> = {}, client: ReadClient = defaultReadClient()): Promise<Page<ListingSummary> & { since: string }> {
  const v = parseInput(RecentReleasesInput, input);
  const { offset, limit } = range(v.page, v.pageSize);
  const now = client.now();
  const since = new Date(Date.parse(now) - v.days * 86400000).toISOString();
  const query: Record<string, string> = {
    select: LISTING_SELECT, store: `eq.${v.store}`, expires_at: `gt.${now}`,
    and: `(released_at.gte.${since},released_at.lte.${now})`,
    order: "released_at.desc,id.asc", offset: String(offset), limit: String(limit),
  };
  if (v.country) query.country = `eq.${v.country}`;
  if (v.language) query.requested_language = `eq.${v.language}`;
  if (v.category) query.category_name = `eq.${v.category}`;
  const { rows, total } = await client.select("app_listings", query, { count: true });
  return { ...toPage(rows.map(r => mapListing(r, now)), v.page, v.pageSize, total), since };
}

export const CategoryListingInput = Pagination.extend({
  category: Category, store: Store.optional(), country: Country.optional(), language: Language.optional(),
  /** Chart category key as the source names it (e.g. "6007"); listing category names are a different vocabulary. */
  chartCategory: Category.optional(),
});

/** Apps in one category (current listings, by rating count) plus the latest chart snapshots for it. */
export async function getCategoryListing(input: z.input<typeof CategoryListingInput>, client: ReadClient = defaultReadClient()): Promise<{ apps: ExplorerResult; charts: DiscoverySnapshotInfo[] }> {
  const v = parseInput(CategoryListingInput, input);
  const filters = { ...(v.store ? { store: v.store } : {}), ...(v.country ? { country: v.country } : {}), ...(v.language ? { language: v.language } : {}) };
  const [apps, charts] = await Promise.all([
    exploreApps({ ...filters, category: v.category, page: v.page, pageSize: v.pageSize, sort: "ratingCount", direction: "desc" }, client),
    v.chartCategory
      ? getLatestDiscoverySnapshots({ ...filters, category: v.chartCategory, kind: "chart", limit: 50 }, client)
      : Promise.resolve([]),
  ]);
  return { apps, charts };
}
