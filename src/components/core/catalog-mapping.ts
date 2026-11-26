import type { AppDetails, Dashboard, ListingSummary } from "../../lib/read/index";
import { safeMediaUrl, type AppViewModel, type DashboardModel, type DetailsModel } from "./view-models";

export function toAppViewModel(listing: ListingSummary): AppViewModel {
  return {
    id: listing.appId, listingId: listing.listingId, storeAppId: listing.storeAppId, name: listing.name ?? "App name unavailable",
    developer: listing.developerName ?? "Developer unavailable", store: listing.store,
    country: listing.country, requestedLanguage: listing.requestedLanguage, effectiveLanguage: listing.effectiveLanguage,
    category: listing.category ?? "Uncategorized", icon: "orbit", color: listing.store === "ios" ? "indigo" : "green",
    placeholder: true, iconUrl: safeMediaUrl(listing.iconUrl), description: null,
    rating: listing.rating, ratingCount: listing.ratingCount, price: listing.price.amount, currency: listing.price.currency,
    installsText: listing.installs.supported && listing.store === "play" ? listing.installs.text : null,
    releasedAt: listing.releasedAt, version: listing.version, history: [], sourceLabel: "Stored listing",
    observedAt: listing.freshness.lastObservedAt, freshness: listing.freshness,
  };
}
export function toDashboardModel(data: Dashboard): DashboardModel {
  return {
    stats: data.stats, categories: data.categories, recent: data.recentReleases.map(toAppViewModel),
    rankingChanges: data.rankingChanges.map(series => ({ ...series, entries: series.entries.map(entry => ({
      appId: entry.appId, position: entry.position, previousPosition: entry.previousPosition, change: entry.change,
      app: entry.listing ? toAppViewModel(entry.listing) : null,
    })) })),
  };
}
export function toDetailsModel(data: AppDetails): DetailsModel | null {
  if (!data.listing) return null;
  const listing = data.listing;
  const sources = [...new Set(Object.values(listing.provenance).flatMap(stamp => stamp.source ? [stamp.source] : []))];
  return {
    app: { ...toAppViewModel(listing), description: listing.description,
      iconUrl: data.media.enabled ? safeMediaUrl(listing.iconUrl) : null,
      sourceLabel: sources.length ? sources.join(", ") : "Source unavailable" },
    developer: data.developer, contexts: data.contexts, series: data.history.series, historyTo: data.history.to,
    mediaEnabled: data.media.enabled,
    screenshots: data.media.enabled ? listing.screenshotUrls?.flatMap(value => { const url = safeMediaUrl(value); return url ? [url] : []; }) ?? null : null,
  };
}
