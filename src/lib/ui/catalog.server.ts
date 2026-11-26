import "server-only";
import { getAppDetails, getDashboard, exploreApps, listCategories, listReviews, getReviewRatingDistribution, listKeywords, getKeywordHistory, getKeywordRankings, getChartPage, getAppRankings, getRecentReleases, getMarketPage, getOpportunities, type ChartPageQuery, type MarketQuery, type OpportunityQuery } from "../read/index";
import { toAppViewModel, toDashboardModel } from "../../components/core/catalog-mapping";
import { readFailure } from "../../components/core/catalog-query";
import type { DetailsSections, ExplorerFilters, ReadResult, Scope } from "../../components/core/view-models";
import { isDevelopmentDemo } from "./demo-mode";
import { requireViewer } from "../auth/server";

// Selection happens before a read, never inside an error/fallback path. The fixtures
// have no Supabase client and are only loaded for the explicit development opt-in.
const demoCatalog = async () => (await import("./demo-catalog")).createDemoCatalog();

export async function readResult<T>(load: () => Promise<T>): Promise<ReadResult<T>> {
  // Authorization lives at the data source: every catalog read requires a verified Supabase user
  // (or the development-only demo bypass). Outside the try so the login redirect is not swallowed.
  await requireViewer();
  try { return { state: "ready", data: await load() }; } catch (error) { return readFailure(error); }
}
export const dashboardData = (scope: Scope) => readResult(async () => toDashboardModel(isDevelopmentDemo() ? (await demoCatalog()).getDashboard(scope) : await getDashboard({ ...scope, recentLimit: 4 })));
export const categoryData = (scope: Scope) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).listCategories(scope) : await listCategories(scope));
export const explorerData = (filters: ExplorerFilters) => readResult(async () => {
  const { category, ...input } = filters;
  const result = isDevelopmentDemo() ? (await demoCatalog()).exploreApps(filters) : await exploreApps({ ...input, ...(category === "all" ? {} : { category }) });
  return { ...result, items: result.items.map(toAppViewModel) };
});
export const appData = (id: string, scope: Scope) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).getAppDetails(id, scope) : await getAppDetails({ appId: id, ...scope, historyDays: 30, relatedLimit: 0 }));
export async function detailSections(input: { appId: string; store: "ios" | "play"; country: string; language: string; tab: string; reviewPage: number; reviewSort: "newest" | "helpful"; keywordPage: number; keyword?: string; keywordSnapshot?: number }): Promise<DetailsSections> {
  await requireViewer();
  if (isDevelopmentDemo()) return (await demoCatalog()).detailSections(input);
  const result: DetailsSections = { reviews: null, distribution: null, keywords: null, selectedKeyword: null };
  const context = { country: input.country, language: input.language };
  if (input.tab === "Reviews") {
    [result.reviews, result.distribution] = await Promise.all([
      readResult(() => listReviews({ appId: input.appId, ...context, page: input.reviewPage, pageSize: 8, sort: input.reviewSort })),
      readResult(() => getReviewRatingDistribution({ appId: input.appId, ...context })),
    ]);
  }
  if (input.tab === "Keywords") {
    result.keywords = await readResult(() => listKeywords({ store: input.store, ...context, page: input.keywordPage, pageSize: 8 }));
    if (input.keyword) {
      const keywordContext = { store: input.store, ...context, keyword: input.keyword };
      const [rankings, history] = await Promise.all([
        readResult(() => getKeywordRankings({ ...keywordContext, ...(input.keywordSnapshot ? { snapshotId: input.keywordSnapshot } : {}), limit: 200 })),
        readResult(() => getKeywordHistory({ ...keywordContext, days: 30 })),
      ]);
      result.selectedKeyword = { rankings, history };
    }
  }
  return result;
}

// P1 ranking intelligence. Same authorization and demo selection as every other catalog read.
export const trendingData = (query: Omit<ChartPageQuery, "kind">) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).getChartPage({ ...query, kind: "chart" }) : await getChartPage({ ...query, kind: "chart" }));
export type ReleasesQuery = { store: "ios" | "play"; country: string; language?: string; category?: string; days: number; page: number; pageSize: number };
export const newAppChartData = (query: Omit<ChartPageQuery, "kind" | "store">) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).getChartPage({ ...query, kind: "new_apps", store: "ios" }) : await getChartPage({ ...query, kind: "new_apps", store: "ios" }));
export const knownReleasesData = (query: ReleasesQuery) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).getRecentReleases(query) : await getRecentReleases(query));
export const appRankingsData = (appId: string, country: string, language?: string) => readResult(async () => isDevelopmentDemo()
  ? (await demoCatalog()).getAppRankings(appId, country, language)
  : await getAppRankings({ appId, country, ...(language ? { language } : {}) }));

// P2 market research. Same authorization and demo selection as every other catalog read.
export const marketData = (query: MarketQuery) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).getMarketPage(query) : await getMarketPage(query));
export const opportunityData = (query: OpportunityQuery) => readResult(async () => isDevelopmentDemo() ? (await demoCatalog()).getOpportunities(query) : await getOpportunities(query));
