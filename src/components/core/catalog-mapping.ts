import type { AppDetails, Dashboard, ListingSummary } from "../../lib/read/index";
import { safeMediaUrl, safeStoreListingUrl, type AppViewModel, type DashboardModel, type DetailsModel } from "./view-models";

/** Monogram fallback tone: deterministic per app (stable across views), varied across a list. Presentation only. */
const MONOGRAM_TONES = ["blue", "purple", "teal", "indigo", "green", "orange", "pink", "coral", "amber"] as const;
export function monogramTone(key: string): (typeof MONOGRAM_TONES)[number] {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return MONOGRAM_TONES[hash % MONOGRAM_TONES.length]!;
}

export function toAppViewModel(listing: ListingSummary): AppViewModel {
  return {
    id: listing.appId, listingId: listing.listingId, storeAppId: listing.storeAppId, name: listing.name ?? "App name unavailable",
    developer: listing.developerName ?? "Developer unavailable", store: listing.store,
    country: listing.country, requestedLanguage: listing.requestedLanguage, effectiveLanguage: listing.effectiveLanguage,
    category: listing.category ?? "Uncategorized", icon: "orbit", color: monogramTone(`${listing.store}:${listing.storeAppId ?? listing.appId}`),
    placeholder: true, iconUrl: safeMediaUrl(listing.iconUrl), description: null,
    rating: listing.rating, ratingCount: listing.ratingCount, price: listing.price.amount, currency: listing.price.currency,
    installsText: listing.installs.supported && listing.store === "play" ? listing.installs.text : null,
    releasedAt: listing.releasedAt, version: listing.version, history: [], sourceLabel: "Stored listing",
    observedAt: listing.freshness.lastObservedAt, freshness: listing.freshness, fieldFreshness: listing.fieldFreshness ?? {},
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
    app: {
      ...toAppViewModel(listing),
      description: data.storeDescription.enabled ? listing.description : null,
      iconUrl: data.media.iconsEnabled ? safeMediaUrl(listing.iconUrl) : null,
      sourceLabel: sources.length ? sources.join(", ") : "Source unavailable",
    },
    developer: data.developer, contexts: data.contexts, series: data.history.series, historyTo: data.history.to,
    iconsEnabled: data.media.iconsEnabled, screenshotsEnabled: data.media.screenshotsEnabled,
    storeDescriptionEnabled: data.storeDescription.enabled,
    screenshots: data.media.screenshotsEnabled
      ? listing.screenshotUrls?.flatMap(value => { const url = safeMediaUrl(value); return url ? [url] : []; }) ?? null
      : null,
    storeListingUrl: safeStoreListingUrl(data.app.storeUrl),
    contentReportHref: "/en/contact",
  };
}

/** Attribution copy for app details (EN). */
export function detailsAttribution(model: DetailsModel): string {
  return model.app.sourceLabel === "Source unavailable"
    ? "Third-party store data may be incomplete. AppRadar is an independent research tool and is not affiliated with Apple, Google or listed developers."
    : `Data observed via ${model.app.sourceLabel}. App names, trademarks, icons and screenshots remain third-party property. AppRadar is independent research software and is not affiliated with Apple, Google or listed developers.`;
}
