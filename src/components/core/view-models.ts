import type { AppDetails, CatalogStats, Freshness, KeywordSummary, Page, RankingChangeSeries, RatingDistribution, ReviewsResult, HistorySeries, KeywordSeries } from "../../lib/read/index";

export type Country = string;
export type HistoryPoint = { date: string; rating: number | null; ratingCount: number | null };
export type ReadResult<T> = { state: "ready"; data: T } | { state: "unavailable" | "error"; message: string };
export interface Scope { country: string; language?: string; store?: "ios" | "play" }
export interface AppViewModel {
  id: string; listingId: number; storeAppId: string | null; name: string; developer: string; store: "ios" | "play";
  country: Country; requestedLanguage: string; effectiveLanguage: string | null; category: string;
  icon: "orbit"; color: string; placeholder: boolean; iconUrl: string | null;
  description: string | null; rating: number | null; ratingCount: number | null;
  price: number | null; currency: string | null; installsText: string | null;
  releasedAt: string | null; version: string | null; history: HistoryPoint[];
  sourceLabel: string; observedAt: string | null; freshness: Freshness;
}
export interface DashboardModel {
  stats: CatalogStats; categories: { category: string | null; appCount: number; listingCount: number }[];
  recent: AppViewModel[]; rankingChanges: (Omit<RankingChangeSeries, "entries"> & {
    entries: { appId: string; position: number; previousPosition: number | null; change: number | null; app: AppViewModel | null }[];
  })[];
}
export interface ExplorerModel extends Page<AppViewModel> { sort: ExplorerSort; direction: "asc" | "desc" }
export const sortLabels = { name: "App name", rating: "Rating", ratingCount: "Rating count", reviewCount: "Review count", price: "Price", releasedAt: "Release date", updatedAt: "Store update", observedAt: "Last observed", installsLowerBound: "Play install lower bound" } as const;
export type ExplorerSort = keyof typeof sortLabels;
export interface ExplorerFilters extends Scope { q: string; category: string; price: "any" | "free" | "paid"; sort: ExplorerSort; direction: "asc" | "desc"; page: number; pageSize: number }
export type KeywordSelection = {
  rankings: ReadResult<Awaited<ReturnType<typeof import("../../lib/read/keywords").getKeywordRankings>>>;
  history: ReadResult<{ from: string; to: string; series: KeywordSeries[] }>;
};
export interface DetailsSections {
  reviews: ReadResult<ReviewsResult> | null;
  distribution: ReadResult<RatingDistribution> | null;
  keywords: ReadResult<Page<KeywordSummary>> | null;
  selectedKeyword: KeywordSelection | null;
}
export interface DetailsModel {
  app: AppViewModel; developer: AppDetails["developer"]; contexts: AppDetails["contexts"];
  series: HistorySeries[]; historyTo: string; mediaEnabled: boolean; screenshots: string[] | null;
}
export const countryLabels: Record<string, string> = { US: "United States", TR: "Türkiye" };
export const countryLabel = (country: string) => countryLabels[country] ?? country;
export const count = (value: number | null) => value == null ? "Not available" : new Intl.NumberFormat("en-US").format(value);
export const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const price = (app: Pick<AppViewModel, "price" | "currency">) => app.price == null || app.currency == null ? "Not available" : app.price === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: app.currency }).format(app.price);
export const dateLabel = (value: string | null) => value == null || !Number.isFinite(Date.parse(value)) ? "Not available" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
export function scopeQuery(scope: Scope) {
  const query = new URLSearchParams({ country: scope.country });
  if (scope.language) query.set("language", scope.language);
  if (scope.store) query.set("store", scope.store);
  return query;
}
export const detailsHref = (app: AppViewModel, back?: string) => {
  const query = scopeQuery({ country: app.country, language: app.requestedLanguage });
  if (back) query.set("back", back);
  return `/apps/${encodeURIComponent(app.id)}?${query}`;
};
export function safeMediaUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; } catch { return null; }
}
