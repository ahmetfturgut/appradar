// Ranking intelligence reads (P1). Requires migration 20261126000900_ranking_intelligence (not applied remotely yet).
// Server-only via the service-role read client. All comparison logic lives in src/lib/intel (pure).
import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import { Category, Country, Language, Store, listingsFor, num, parseInput, str, type ListingSummary } from "./shared.ts";
import type { Horizon, ListKind, SnapshotFacts, SnapshotWithEntries } from "../intel/ranking.ts";
import { buildAppRankings, buildChartPage, selectSeries, snapshotsNeedingEntries, type AppRankingSeries, type ChartPageModel } from "../intel/views.ts";
import { summariseSeries } from "../intel/ranking.ts";

const DAY = 86_400_000;
/** 30-day horizon window plus slack. */
export const RANKING_WINDOW_DAYS = 35;

export function mapSnapshotFacts(r: Record<string, unknown>): SnapshotFacts {
  const coverage = String(r.coverage_status);
  return {
    id: Number(r.id), kind: r.kind === "new_apps" ? "new_apps" : "chart", source: String(r.source), sourceBuild: str(r.source_build),
    store: r.store === "play" ? "play" : "ios", country: String(r.country), requestedLanguage: String(r.requested_language),
    context: String(r.context), category: str(r.category),
    coverageStatus: coverage === "bounded" || coverage === "partial" ? coverage : "truncated",
    entryCount: Number(r.entry_count), observedAt: String(r.observed_at),
    observedTimeBasis: r.observed_time_basis === "source" ? "source" : "collection",
    runValidationStatus: str(r.run_validation_status), runTruncated: typeof r.run_truncated === "boolean" ? r.run_truncated : null,
    runIncompleteReason: str(r.run_incomplete_reason), runCollectionMode: str(r.run_collection_mode), requestedDepth: num(r.requested_depth),
  };
}

const FactsInput = z.object({
  kind: z.enum(["chart", "new_apps"]), store: Store.optional(), country: Country, language: Language.optional(),
  category: Category.optional(), days: z.number().int().min(1).max(90).default(RANKING_WINDOW_DAYS),
});
export async function getChartFacts(input: z.input<typeof FactsInput>, client: ReadClient = defaultReadClient()): Promise<SnapshotFacts[]> {
  const v = parseInput(FactsInput, input);
  const rows = await client.rpc("appradar_read_chart_facts", {
    p_kind: v.kind, p_store: v.store ?? null, p_country: v.country, p_language: v.language ?? null, p_category: v.category ?? null,
    p_context: null, p_source: null, p_since: new Date(Date.parse(client.now()) - v.days * DAY).toISOString(), p_limit: 1000,
  });
  if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
  return (rows as Record<string, unknown>[]).map(mapSnapshotFacts);
}

/** Entries of the given snapshots, paged so PostgREST's row cap cannot silently truncate them. */
export async function getSnapshotEntries(ids: readonly number[], client: ReadClient = defaultReadClient()): Promise<Map<number, { appId: string; position: number | null }[]>> {
  const out = new Map<number, { appId: string; position: number | null }[]>(ids.map(id => [id, []]));
  const PAGE = 1000;
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    for (let offset = 0; ; offset += PAGE) {
      const { rows } = await client.select("discovery_entries", {
        select: "snapshot_id,app_id,position", snapshot_id: `in.(${chunk.join(",")})`,
        order: "snapshot_id.asc,position.asc.nullslast,app_id.asc", offset: String(offset), limit: String(PAGE),
      });
      for (const r of rows) out.get(Number(r.snapshot_id))?.push({ appId: String(r.app_id), position: num(r.position) });
      if (rows.length < PAGE) break;
    }
  }
  return out;
}

export const ChartPageInput = z.object({
  kind: z.enum(["chart", "new_apps"]), store: Store.optional(), country: Country, language: Language.optional(),
  category: Category.optional(), chart: z.string().trim().min(1).max(500).optional(), series: z.string().regex(/^[a-z0-9]{1,13}$/).optional(),
  horizon: z.enum(["1d", "7d", "30d"]).default("1d"),
});
export type ChartPageQuery = z.input<typeof ChartPageInput>;

/** Shared IO pipeline (real and demo): facts → select series → load entries → listings → pure view. */
export async function loadChartPage(
  input: ChartPageQuery,
  io: { facts: (q: { kind: ListKind; store?: "ios" | "play"; country: string; language?: string }) => Promise<SnapshotFacts[]>; entries: (ids: number[]) => Promise<Map<number, { appId: string; position: number | null }[]>>; listings: (ids: string[], country: string, language: string) => Promise<Map<string, ListingSummary>>; now: () => number },
): Promise<ChartPageModel> {
  const v = parseInput(ChartPageInput, input);
  const facts = await io.facts({ kind: v.kind, ...(v.store ? { store: v.store } : {}), country: v.country, ...(v.language ? { language: v.language } : {}) });
  const filters = { store: v.store, category: v.category, chart: v.chart, series: v.series, horizon: v.horizon as Horizon };
  const selected = selectSeries(summariseSeries(facts.filter(f => f.kind === v.kind), io.now()), filters);
  const entries = await io.entries(snapshotsNeedingEntries(facts, selected));
  const snapshots: SnapshotWithEntries[] = facts.map(f => ({ ...f, entries: entries.get(f.id) ?? [] }));
  const latestEntries = selected?.latestEligible ? entries.get(selected.latestEligible.id) ?? [] : [];
  const listings = selected ? await io.listings(latestEntries.map(e => e.appId), selected.country, selected.requestedLanguage) : new Map<string, ListingSummary>();
  return buildChartPage(v.kind, facts, snapshots, filters, listings, io.now());
}

export function getChartPage(input: ChartPageQuery, client: ReadClient = defaultReadClient()): Promise<ChartPageModel> {
  return loadChartPage(input, {
    facts: q => getChartFacts(q, client), entries: ids => getSnapshotEntries(ids, client),
    listings: (ids, country, language) => listingsFor(client, ids, country, language), now: () => Date.parse(client.now()),
  });
}

const AppRankingsInput = z.object({ appId: z.uuid(), country: Country, language: Language.optional(), days: z.number().int().min(1).max(90).default(RANKING_WINDOW_DAYS) });
/** App Details: every chart/new-app series the app appeared in during the window, kept independent. */
export async function getAppRankings(input: z.input<typeof AppRankingsInput>, client: ReadClient = defaultReadClient()): Promise<AppRankingSeries[]> {
  const v = parseInput(AppRankingsInput, input);
  const rows = await client.rpc("appradar_read_app_chart_history", {
    p_app_id: v.appId, p_country: v.country, p_language: v.language ?? null,
    p_since: new Date(Date.parse(client.now()) - v.days * DAY).toISOString(), p_limit: 2000,
  });
  if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
  const snapshots: SnapshotWithEntries[] = (rows as Record<string, unknown>[]).map(r => ({
    ...mapSnapshotFacts(r), entries: r.app_present === true ? [{ appId: v.appId, position: num(r.app_position) }] : [],
  }));
  return buildAppRankings(snapshots, v.appId, Date.parse(client.now()));
}
