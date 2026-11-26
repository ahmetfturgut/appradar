// Market Insights & Opportunity Finder reads (P2). No new SQL: bounded PostgREST reads of current
// listings plus the P1 chart services. All calculations live in src/lib/intel/market.ts (pure).
import { z } from "zod";
import { defaultReadClient, type ReadClient } from "./client.ts";
import { Category, Country, Language, LISTING_SELECT, Store, mapListing, parseInput, str } from "./shared.ts";
import { listCategories } from "./explorer.ts";
import { getChartFacts, getSnapshotEntries } from "./rankings.ts";
import { isEligible, summariseSeries, type SnapshotFacts } from "../intel/ranking.ts";
import { selectSeries, seriesId } from "../intel/views.ts";
import { buildMarketView, buildOpportunityTable, type CohortCoverage, type MarketApp, type MarketView, type OpportunityTable } from "../intel/market.ts";

/** Upper bound of listings loaded for one context; beyond it the cohort is reported as truncated. */
export const MARKET_ROW_CAP = 5000;
const PAGE = 1000;

export function toMarketApp(row: Record<string, unknown>, now: string): MarketApp {
  const l = mapListing(row, now);
  const app = (row.apps ?? {}) as Record<string, unknown>;
  return {
    appId: l.appId, listingId: l.listingId, name: l.name, store: l.store, country: l.country, requestedLanguage: l.requestedLanguage,
    category: l.category, developerId: str(app.developer_id), developerName: l.developerName, rating: l.rating, ratingCount: l.ratingCount,
    price: l.price, releasedAt: l.releasedAt, storeUpdatedAt: l.storeUpdatedAt, lastObservedAt: l.freshness.lastObservedAt, fieldFreshness: l.fieldFreshness ?? {},
  };
}

export interface ContextQuery { store: "ios" | "play"; country: string; language: string; category?: string }
export interface ContextApps { apps: MarketApp[]; available: number | null; truncated: boolean }

/** Current (non-expired) listings in one store/country/language context, paged up to MARKET_ROW_CAP. */
export async function getContextApps(q: ContextQuery, client: ReadClient = defaultReadClient(), cap = MARKET_ROW_CAP): Promise<ContextApps> {
  const now = client.now();
  const apps: MarketApp[] = [];
  let available: number | null = null;
  for (let offset = 0; offset < cap; offset += PAGE) {
    const query: Record<string, string> = {
      select: LISTING_SELECT, store: `eq.${q.store}`, country: `eq.${q.country}`, requested_language: `eq.${q.language}`,
      expires_at: `gt.${now}`, order: "id.asc", offset: String(offset), limit: String(Math.min(PAGE, cap - offset)),
    };
    if (q.category) query.category_name = `eq.${q.category}`;
    const { rows, total } = await client.select("app_listings", query, { count: offset === 0 });
    if (offset === 0) available = total;
    apps.push(...rows.map(row => toMarketApp(row, now)));
    if (rows.length < PAGE) break;
  }
  return { apps, available, truncated: available != null ? available > apps.length : apps.length >= cap };
}

/** Listings (with developer identity) for specific apps in one context. */
export async function getMarketApps(appIds: readonly string[], country: string, language: string, client: ReadClient = defaultReadClient()): Promise<Map<string, MarketApp>> {
  const out = new Map<string, MarketApp>();
  const unique = [...new Set(appIds)];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { rows } = await client.select("app_listings", {
      select: LISTING_SELECT, app_id: `in.(${chunk.join(",")})`, country: `eq.${country}`, requested_language: `eq.${language}`,
      expires_at: `gt.${client.now()}`, order: "id.asc",
    });
    for (const row of rows) { const app = toMarketApp(row, client.now()); if (!out.has(app.appId)) out.set(app.appId, app); }
  }
  return out;
}

export interface MarketIO {
  contextApps: (q: ContextQuery) => Promise<ContextApps>;
  categories: (q: { store: "ios" | "play"; country: string; language: string }) => Promise<{ category: string | null; appCount: number }[]>;
  chartFacts: (q: { store: "ios" | "play"; country: string; language: string }) => Promise<SnapshotFacts[]>;
  entries: (ids: number[]) => Promise<Map<number, { appId: string; position: number | null }[]>>;
  marketApps: (ids: string[], country: string, language: string) => Promise<Map<string, MarketApp>>;
  now: () => number;
}

export const MarketInput = z.object({
  store: Store.default("ios"), country: Country, language: Language,
  cohort: z.enum(["category", "chart"]).default("category"),
  category: Category.optional(), series: z.string().regex(/^[a-z0-9]{1,13}$/).optional(),
});
export type MarketQuery = z.input<typeof MarketInput>;

export interface MarketPageModel {
  context: { store: "ios" | "play"; country: string; requestedLanguage: string };
  cohort: "category" | "chart";
  categories: { name: string; apps: number }[];
  /** P1 chart series in this context that have a comparable (eligible) snapshot. */
  charts: { id: string; context: string; category: string | null; source: string; observedAt: string; depth: number | null }[];
  view: MarketView | null;
}

export async function loadMarketPage(input: MarketQuery, io: MarketIO): Promise<MarketPageModel> {
  const v = parseInput(MarketInput, input);
  const ctx = { store: v.store, country: v.country, language: v.language };
  const [categoryRows, facts] = await Promise.all([io.categories(ctx), io.chartFacts(ctx)]);
  const categories = categoryRows.flatMap(c => c.category ? [{ name: c.category, apps: c.appCount }] : []).sort((a, b) => b.apps - a.apps || a.name.localeCompare(b.name));
  const series = summariseSeries(facts.filter(f => f.kind === "chart" && f.store === v.store), io.now()).filter(s => s.latestEligible);
  const charts = series.map(s => ({ id: seriesId(s.key), context: s.context, category: s.category, source: s.source, observedAt: s.latestEligible!.observedAt, depth: s.depth }));
  const base = { context: { store: v.store, country: v.country, requestedLanguage: v.language }, cohort: v.cohort, categories, charts };
  if (v.cohort === "chart") {
    const selected = selectSeries(series, { horizon: "1d", series: v.series });
    if (!selected?.latestEligible) return { ...base, view: null };
    const snapshot = facts.find(f => f.id === selected.latestEligible!.id)!;
    if (!isEligible(snapshot)) return { ...base, view: null };
    const entries = (await io.entries([snapshot.id])).get(snapshot.id) ?? [];
    const listings = await io.marketApps(entries.map(e => e.appId), v.country, v.language);
    const apps = entries.flatMap(e => { const app = listings.get(e.appId); return app ? [{ ...app, position: e.position }] : []; });
    const coverage: CohortCoverage = { available: entries.length, truncated: false, missingListings: entries.length - apps.length };
    return { ...base, view: buildMarketView({ kind: "chart", store: v.store, country: v.country, requestedLanguage: v.language, category: snapshot.category,
      chart: { seriesId: seriesId(selected.key), context: snapshot.context, source: snapshot.source, snapshotId: snapshot.id, observedAt: snapshot.observedAt, depth: snapshot.requestedDepth } }, apps, coverage, io.now()) };
  }
  const category = v.category ?? categories[0]?.name;
  if (!category) return { ...base, view: null };
  const loaded = await io.contextApps({ ...ctx, category });
  if (!loaded.apps.length) return { ...base, view: null };
  return { ...base, view: buildMarketView({ kind: "category", store: v.store, country: v.country, requestedLanguage: v.language, category },
    loaded.apps, { available: loaded.available, truncated: loaded.truncated, missingListings: 0 }, io.now()) };
}

export const OpportunityInput = z.object({ store: Store.default("ios"), country: Country, language: Language });
export type OpportunityQuery = z.input<typeof OpportunityInput>;

export async function loadOpportunities(input: OpportunityQuery, io: Pick<MarketIO, "contextApps" | "now">): Promise<OpportunityTable> {
  const v = parseInput(OpportunityInput, input);
  const loaded = await io.contextApps({ store: v.store, country: v.country, language: v.language });
  return buildOpportunityTable({ store: v.store, country: v.country, requestedLanguage: v.language }, loaded.apps,
    { available: loaded.available, truncated: loaded.truncated, missingListings: 0 }, io.now());
}

export function supabaseMarketIO(client: ReadClient = defaultReadClient()): MarketIO {
  return {
    contextApps: q => getContextApps(q, client),
    categories: q => listCategories({ store: q.store, country: q.country, language: q.language }, client),
    chartFacts: q => getChartFacts({ kind: "chart", store: q.store, country: q.country, language: q.language }, client),
    entries: ids => getSnapshotEntries(ids, client),
    marketApps: (ids, country, language) => getMarketApps(ids, country, language, client),
    now: () => Date.parse(client.now()),
  };
}
export const getMarketPage = (input: MarketQuery, client?: ReadClient) => loadMarketPage(input, supabaseMarketIO(client));
export const getOpportunities = (input: OpportunityQuery, client?: ReadClient) => loadOpportunities(input, supabaseMarketIO(client));
