// Server-only read layer (T8). Import from Server Components, Route Handlers or Server Actions only.
export { ReadError, createReadClient, defaultReadClient, readSettingsFromEnv, type ReadClient } from "./client.ts";
export { MAX_PAGE_SIZE, STALE_AFTER_HOURS, type Freshness, type ListingSummary, type Page } from "./shared.ts";
export { exploreApps, listCategories, EXPLORER_SORTS, type ExplorerInput, type ExplorerResult, type ExplorerSort } from "./explorer.ts";
export { getAppDetails, type AppDetails, type AppDetailsInput, type HistorySeries, type HistoryPoint, type FieldProvenance } from "./app-details.ts";
export {
  getChart, getRecentReleases, getCategoryListing, getLatestDiscoverySnapshots,
  type ChartEntry, type CoverageStatus, type DiscoveryKind, type DiscoverySnapshotInfo,
} from "./discovery.ts";
export { listReviews, getReviewRatingDistribution, type ReviewItem, type ReviewsResult, type RatingDistribution } from "./reviews.ts";
export { listKeywords, getKeywordHistory, getKeywordRankings, type KeywordMetrics, type KeywordSummary, type KeywordSeries, type KeywordRankingEntry } from "./keywords.ts";
export { getDashboard, getCatalogStats, getRankingChanges, type Dashboard, type CatalogStats, type RankingChangeSeries, type RankingChange } from "./dashboard.ts";
