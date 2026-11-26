import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import { Country, Language, Pagination, Store, bool, inList, num, parseInput, range, sanitizeText, str, toPage, type Page } from "./shared.ts";

/**
 * popularity: the source's popularity score. popularitySource says whether it is Apple Search
 * Popularity ("apple") or a proxy ("proxy"); null means unknown. Neither is search volume.
 * Series (contextKey) include build, filters and popularity source, so they are never merged.
 */
export interface KeywordMetrics {
  contextKey: string;
  measurementMethod: string;
  popularity: number | null;
  popularityProxy: number | null;
  popularitySource: "apple" | "proxy" | null;
  difficulty: number | null;
  measuredAt: string | null;
  checkedAt: string;
  stale: boolean | null;
  metricsError: string | null;
  fieldStatus: Record<string, unknown>;
}

const METRIC_COLUMNS = "snapshot_id,context_key,measurement_method,popularity,popularity_proxy,popularity_source,difficulty,measured_at,checked_at,stale,metrics_error,field_status";

function mapMetrics(r: Record<string, unknown>): KeywordMetrics {
  return {
    contextKey: String(r.context_key), measurementMethod: String(r.measurement_method),
    popularity: num(r.popularity), popularityProxy: num(r.popularity_proxy),
    popularitySource: r.popularity_source === "apple" || r.popularity_source === "proxy" ? r.popularity_source : null,
    difficulty: num(r.difficulty), measuredAt: str(r.measured_at), checkedAt: String(r.checked_at),
    stale: bool(r.stale), metricsError: sanitizeText(r.metrics_error, 500),
    fieldStatus: r.field_status && typeof r.field_status === "object" ? r.field_status as Record<string, unknown> : {},
  };
}

async function metricsBySnapshot(client: ReadClient, ids: number[]): Promise<Map<number, KeywordMetrics[]>> {
  const result = new Map<number, KeywordMetrics[]>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { rows } = await client.select("keyword_entries", {
      select: METRIC_COLUMNS, snapshot_id: inList(chunk.map(String)), row_type: "eq.metrics", order: "checked_at.asc,id.asc", limit: "2000",
    });
    for (const r of rows) {
      const id = Number(r.snapshot_id);
      const list = result.get(id) ?? [];
      list.push(mapMetrics(r));
      result.set(id, list);
    }
  }
  return result;
}

export interface KeywordSummary {
  snapshotId: number;
  keyword: string;
  store: "ios" | "play";
  country: string;
  requestedLanguage: string;
  effectiveLanguage: string | null;
  coverageStatus: "bounded" | "partial" | "truncated";
  observedAt: string;
  collectedAt: string;
  snapshotCount: number;
  metrics: KeywordMetrics[];
}

export const KeywordListInput = Pagination.extend({
  store: Store.optional(), country: Country.optional(), language: Language.optional(), q: z.string().max(200).optional(),
});

/** Latest observation of each keyword context with its metrics. Requires migration 20261126000800. */
export async function listKeywords(input: z.input<typeof KeywordListInput> = {}, client: ReadClient = defaultReadClient()): Promise<Page<KeywordSummary>> {
  const v = parseInput(KeywordListInput, input);
  const { offset, limit } = range(v.page, v.pageSize);
  const rows = await client.rpc("appradar_read_keyword_latest", {
    p_store: v.store ?? null, p_country: v.country ?? null, p_language: v.language ?? null,
    p_query: v.q ? v.q.trim().slice(0, 100) || null : null, p_limit: limit, p_offset: offset,
  });
  if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
  const metrics = await metricsBySnapshot(client, rows.map((r: Record<string, unknown>) => Number(r.snapshot_id)));
  const items = rows.map((r: Record<string, unknown>): KeywordSummary => ({
    snapshotId: Number(r.snapshot_id), keyword: String(r.keyword), store: r.store === "play" ? "play" : "ios",
    country: String(r.country), requestedLanguage: String(r.requested_language), effectiveLanguage: str(r.effective_language),
    coverageStatus: r.coverage_status as KeywordSummary["coverageStatus"], observedAt: String(r.observed_at),
    collectedAt: String(r.collected_at), snapshotCount: Number(r.snapshot_count), metrics: metrics.get(Number(r.snapshot_id)) ?? [],
  }));
  // total_count is the same on every row; an empty page past the end has no count, so fall back to a count of 0 only on page 1.
  const total = rows.length ? Number((rows[0] as Record<string, unknown>).total_count) : v.page === 1 ? 0 : null;
  return toPage(items, v.page, v.pageSize, total);
}

const KeywordContext = z.object({
  store: Store, country: Country, keyword: z.string().trim().min(1).max(10000), language: Language.optional(),
});

export const KeywordHistoryInput = KeywordContext.extend({ days: z.coerce.number().int().min(1).max(365).default(30) });

export interface KeywordSeries {
  contextKey: string;
  measurementMethod: string;
  popularitySource: "apple" | "proxy" | null;
  points: (KeywordMetrics & { snapshotId: number; observedAt: string; coverageStatus: string })[];
}

/** Historical metric observations, one series per context key. Gaps are not filled. */
export async function getKeywordHistory(input: z.input<typeof KeywordHistoryInput>, client: ReadClient = defaultReadClient()): Promise<{ from: string; to: string; series: KeywordSeries[] }> {
  const v = parseInput(KeywordHistoryInput, input);
  const now = client.now();
  const from = new Date(Date.parse(now) - v.days * 86400000).toISOString();
  const query: Record<string, string> = {
    select: "id,observed_at,coverage_status", store: `eq.${v.store}`, country: `eq.${v.country}`, keyword: `eq.${v.keyword}`,
    expires_at: `gt.${now}`, and: `(observed_at.gte.${from},observed_at.lte.${now})`, order: "observed_at.asc,id.asc", limit: "1000",
  };
  if (v.language) query.requested_language = `eq.${v.language}`;
  const { rows } = await client.select("keyword_snapshots", query);
  const metrics = await metricsBySnapshot(client, rows.map(r => Number(r.id)));
  const series = new Map<string, KeywordSeries>();
  for (const snap of rows) {
    for (const m of metrics.get(Number(snap.id)) ?? []) {
      let s = series.get(m.contextKey);
      if (!s) series.set(m.contextKey, s = { contextKey: m.contextKey, measurementMethod: m.measurementMethod, popularitySource: m.popularitySource, points: [] });
      s.points.push({ ...m, snapshotId: Number(snap.id), observedAt: String(snap.observed_at), coverageStatus: String(snap.coverage_status) });
    }
  }
  return { from, to: now, series: [...series.values()] };
}

export const KeywordRankingsInput = KeywordContext.extend({
  snapshotId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export interface KeywordRankingEntry {
  rank: number;
  appId: string | null;
  storeAppId: string | null;
  /** As shown by the keyword source at check time; not the catalog's current listing. */
  appName: string | null;
  developerName: string | null;
  rating: number | null;
  checkedAt: string;
}

/** Ranking entries (search positions) of the latest or a given keyword snapshot, plus suggestions. */
export async function getKeywordRankings(input: z.input<typeof KeywordRankingsInput>, client: ReadClient = defaultReadClient()): Promise<{
  snapshot: { id: number; observedAt: string; coverageStatus: string; requestedLanguage: string };
  rankings: KeywordRankingEntry[]; suggestions: string[]; metrics: KeywordMetrics[];
} | null> {
  const v = parseInput(KeywordRankingsInput, input);
  const now = client.now();
  const query: Record<string, string> = {
    select: "id,observed_at,coverage_status,requested_language", store: `eq.${v.store}`, country: `eq.${v.country}`,
    keyword: `eq.${v.keyword}`, expires_at: `gt.${now}`, order: "observed_at.desc,id.desc", limit: "1",
  };
  if (v.language) query.requested_language = `eq.${v.language}`;
  if (v.snapshotId) query.id = `eq.${v.snapshotId}`;
  const snap = (await client.select("keyword_snapshots", query)).rows[0];
  if (!snap) return null;
  const id = Number(snap.id);
  const [ranking, suggestion, metrics] = await Promise.all([
    client.select("keyword_entries", {
      select: "rank,app_id,store_app_id,app_name,developer_name,rating_value,checked_at", snapshot_id: `eq.${id}`,
      row_type: "eq.ranking", order: "rank.asc,id.asc", limit: String(v.limit),
    }),
    client.select("keyword_entries", { select: "suggestion", snapshot_id: `eq.${id}`, row_type: "eq.suggestion", order: "id.asc", limit: "100" }),
    metricsBySnapshot(client, [id]),
  ]);
  return {
    snapshot: { id, observedAt: String(snap.observed_at), coverageStatus: String(snap.coverage_status), requestedLanguage: String(snap.requested_language) },
    rankings: ranking.rows.map(r => ({
      rank: Number(r.rank), appId: str(r.app_id), storeAppId: str(r.store_app_id), appName: sanitizeText(r.app_name, 500),
      developerName: sanitizeText(r.developer_name, 500), rating: num(r.rating_value), checkedAt: String(r.checked_at),
    })),
    suggestions: suggestion.rows.map(r => sanitizeText(r.suggestion, 500)).filter((s): s is string => s != null),
    metrics: metrics.get(id) ?? [],
  };
}

