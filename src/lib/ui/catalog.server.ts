import "server-only";
import { getAppDetails, getDashboard, exploreApps, listCategories, listReviews, getReviewRatingDistribution, listKeywords, getKeywordHistory, getKeywordRankings } from "../read/index";
import { toAppViewModel, toDashboardModel } from "../../components/core/catalog-mapping";
import { readFailure } from "../../components/core/catalog-query";
import type { DetailsSections, ExplorerFilters, ReadResult, Scope } from "../../components/core/view-models";

export async function readResult<T>(load: () => Promise<T>): Promise<ReadResult<T>> {
  try { return { state: "ready", data: await load() }; } catch (error) { return readFailure(error); }
}
export const dashboardData = (scope: Scope) => readResult(async () => toDashboardModel(await getDashboard({ ...scope, recentLimit: 4 })));
export const categoryData = (scope: Scope) => readResult(() => listCategories(scope));
export const explorerData = (filters: ExplorerFilters) => readResult(async () => {
  const { category, ...input } = filters;
  const result = await exploreApps({ ...input, ...(category === "all" ? {} : { category }) });
  return { ...result, items: result.items.map(toAppViewModel) };
});
export const appData = (id: string, scope: Scope) => readResult(() => getAppDetails({ appId: id, ...scope, historyDays: 30, relatedLimit: 0 }));
export async function detailSections(input: { appId: string; store: "ios" | "play"; country: string; language: string; tab: string; reviewPage: number; reviewSort: "newest" | "helpful"; keywordPage: number; keyword?: string; keywordSnapshot?: number }): Promise<DetailsSections> {
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
