/**
 * Isolated, deterministic UI fixtures. No store content, external assets, network or persistence.
 * Only the server gateway selects this module, after the explicit development-mode check.
 * Names, developers, descriptions, reviews and every measurement are invented for this demo.
 */
import type { AppDetails, Dashboard, ExplorerResult, HistorySeries, KeywordMetrics, KeywordSummary, ListingSummary, Page, RatingDistribution, ReviewItem } from "../read/index";
import type { DetailsSections, ExplorerFilters, Scope } from "../../components/core/view-models";

const DAY = 86_400_000;
const SOURCE = "Synthetic development demo";
const categories = ["Productivity", "Finance", "Health & Fitness", "Education", "Photo & Video", "Books", "Food & Drink", "Travel"];
const APP_COUNT = 120;
const HALF = APP_COUNT / 2;
/** Stable invented names. Index 0, 22 and 60 stay fixed so search and null-metric examples remain unique. */
const names = Array.from({ length: APP_COUNT }, (_, i) => {
  if (i === 0) return "Harbor Notes";
  if (i === 22) return "Basil Basket";
  if (i === 60) return "Frame Orchard";
  const adjective = ["Quiet", "North", "Little", "Amber", "Cedar", "Silver", "Bright", "Open", "Kind", "Soft"][i % 10];
  const noun = ["Notes", "Ledger", "Steps", "Practice", "Lens", "Reader", "Pantry", "Routes", "Tasks", "Budget", "Trail", "Lessons"][i % 12];
  return `${adjective} ${noun} ${i + 1}`;
});
const purposes = ["Organize small projects with a calm daily checklist.", "Plan household spending with simple envelopes.", "Keep a gentle record of daily movement and rest.", "Practice a little each day with short learning sessions.", "Arrange personal visual ideas into themed collections.", "Keep a private reading list and short book notes.", "Plan meals from a reusable pantry checklist.", "Collect trip ideas and prepare a simple packing list."];
const contexts = [{ country: "US", language: "en", currency: "USD" }, { country: "US", language: "es", currency: "USD" }, { country: "TR", language: "tr", currency: "TRY" }, { country: "TR", language: "en", currency: "TRY" }];
const keywords = ["daily planner", "focus journal", "simple budget", "walking routine", "learn daily", "photo ideas", "reading notes", "meal planner", "packing list", "habit tracker", "private notebook", "weekly goals"];
const idFor = (index: number) => `de000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`;
const page = <T>(items: T[], number: number, size = 8): Page<T> => ({ items: items.slice((number - 1) * size, number * size), page: number, pageSize: size, total: items.length, pageCount: Math.ceil(items.length / size) });
const ready = <T>(data: T) => ({ state: "ready" as const, data });

/** A clock can be supplied by focused tests. Runtime dates stay useful as the demo ages. */
export function createDemoCatalog(clock = new Date()) {
  const now = clock.getTime();
  const at = (days: number, hours = 0) => new Date(now - days * DAY - hours * 3_600_000).toISOString();
  const fresh = (observed: string | null): ListingSummary["freshness"] => {
    const ageHours = observed == null ? null : Math.round((now - Date.parse(observed)) / 360_000) / 10;
    return { lastObservedAt: observed, ageHours, status: ageHours == null ? "unknown" : ageHours > 72 ? "stale" : "fresh", staleAfterHours: 72 };
  };
  const releaseAge = (i: number) => [2, 6, 12, 24, 38, 95, 210, 365][i % 8]!;
  const listings: ListingSummary[] = names.flatMap((name, i) => contexts.map((ctx, c) => {
    const store = i < HALF ? "ios" as const : "play" as const;
    const amount = i % 11 === 10 ? null : i % 3 === 0 ? (ctx.country === "TR" ? 79.99 + i * 5 : 1.99 + (i % 4)) : 0;
    const observedAt = i === 22 ? null : at(i % 7 === 6 ? 5 : 0, 2 + i % 6);
    const installLower = store === "play" && i !== 22 ? [1000, 10000, 100000, 1000000][i % 4]! : null;
    return {
      appId: idFor(i), listingId: (i + 1) * 10 + c, store, storeAppId: `demo.${store}.${i + 1}`, storeUrl: null,
      country: ctx.country, requestedLanguage: ctx.language, effectiveLanguage: i % 9 === 8 ? null : ctx.language,
      name, developerName: `Demo Studio ${Math.floor(i / 2)}`, category: categories[i % 8]!, version: i === 22 ? null : `1.${i % 6}.${i % 3}`,
      releasedAt: i === 22 ? null : at(releaseAge(i)), releasedAtPrecision: i === 22 ? null : "date",
      storeUpdatedAt: i === 22 ? null : at(Math.min(releaseAge(i), 1 + i % 5)), storeUpdatedAtPrecision: i === 22 ? null : "datetime",
      price: { amount: amount == null ? null : Math.round(amount * 100) / 100, currency: amount == null ? null : ctx.currency, isFree: amount == null ? null : amount === 0 },
      rating: i === 22 ? null : Number((3.6 + (i % 14) / 10).toFixed(1)), ratingCount: i === 22 ? null : i === 0 ? 0 : 127 + i * i * 871,
      reviewCount: i === 22 ? null : 18 + i * 67,
      installs: { text: installLower == null ? null : `${installLower.toLocaleString("en-US")}+`, lowerBound: installLower, supported: store === "play" },
      iconUrl: null, firstSeenAt: at(releaseAge(i)), freshness: fresh(observedAt),
    };
  }));
  const scoped = (scope: Scope) => listings.filter(row => row.country === scope.country && (!scope.store || row.store === scope.store) && (!scope.language || row.requestedLanguage === scope.language));
  function listCategories(scope: Scope): Dashboard["categories"] {
    const rows = scoped(scope);
    return categories.flatMap(category => {
      const matches = rows.filter(row => row.category === category);
      return matches.length ? [{ category, appCount: new Set(matches.map(row => row.appId)).size, listingCount: matches.length }] : [];
    });
  }
  function exploreApps(filters: ExplorerFilters): ExplorerResult {
    // Match the read service's literal search semantics (no wildcard syntax).
    const term = filters.q.replace(/[%_*\\"(),.:]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const matches = scoped(filters).filter(row => (!term || [row.name, row.developerName].some(value => value?.toLowerCase().includes(term)))
      && (filters.category === "all" || row.category === filters.category)
      && (filters.price === "any" || (filters.price === "free" ? row.price.isFree === true : row.price.isFree === false)));
    const value = (row: ListingSummary): string | number | null => {
      switch (filters.sort) {
        case "name": return row.name;
        case "price": return row.price.amount;
        case "updatedAt": return row.storeUpdatedAt;
        case "observedAt": return row.freshness.lastObservedAt;
        case "installsLowerBound": return row.installs.lowerBound;
        default: return row[filters.sort];
      }
    };
    matches.sort((a, b) => {
      const x = value(a), y = value(b);
      if (x == null || y == null) return x == null && y == null ? a.listingId - b.listingId : x == null ? 1 : -1;
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en");
      return order * (filters.direction === "asc" ? 1 : -1) || a.listingId - b.listingId;
    });
    return { ...page(matches, filters.page, filters.pageSize), sort: filters.sort, direction: filters.direction };
  }
  function getDashboard(scope: Scope): Dashboard {
    // Catalog totals intentionally ignore language, matching the real service contract.
    const rows = scoped({ country: scope.country, ...(scope.store ? { store: scope.store } : {}) });
    const unique = [...new Map(rows.map(row => [row.appId, row])).values()];
    const observed = rows.flatMap(row => row.freshness.lastObservedAt ? [row.freshness.lastObservedAt] : []).sort();
    const chartRows = scoped({ ...scope, language: scope.language ?? (scope.country === "TR" ? "tr" : "en") });
    const rankingChanges: Dashboard["rankingChanges"] = (["ios", "play"] as const).flatMap((store, s) => {
      const apps = chartRows.filter(row => row.store === store).slice(0, 8);
      if (!apps.length) return [];
      return [{ snapshotId: 500 + s, previousSnapshotId: 490 + s, source: SOURCE, store, country: scope.country,
        requestedLanguage: apps[0]!.requestedLanguage, context: "Synthetic top apps", category: null,
        coverageStatus: s ? "partial" : "bounded", previousCoverageStatus: "bounded", observedAt: at(0, 2), previousObservedAt: at(1, 2), elapsedHours: 24,
        entries: apps.map((listing, i) => ({ appId: listing.appId, position: i + 1, previousPosition: i === 3 ? null : Math.max(1, i + 1 + [4, 0, -2, 0, 6, -3, 2, 1][i]!), change: i === 3 ? null : Math.max(1, i + 1 + [4, 0, -2, 0, 6, -3, 2, 1][i]!) - (i + 1), listing })) }];
    });
    return {
      stats: { apps: unique.length, listings: rows.length, iosApps: unique.filter(row => row.store === "ios").length, playApps: unique.filter(row => row.store === "play").length,
        developers: new Set(rows.map(row => row.developerName)).size, countries: rows.length ? 1 : 0, categories: new Set(rows.map(row => row.category)).size, uncategorizedListings: 0,
        chartSnapshots: new Set(rows.map(row => `${row.store}:${row.requestedLanguage}`)).size * 2,
        keywordSnapshots: new Set(rows.map(row => `${row.store}:${row.requestedLanguage}`)).size * keywords.length * 4,
        latestObservedAt: observed.at(-1) ?? null, oldestObservedAt: observed[0] ?? null, freshness: fresh(observed.at(-1) ?? null) },
      categories: listCategories(scope),
      recentReleases: scoped({ ...scope, store: scope.store ?? "ios" }).filter(row => row.releasedAt != null).sort((a, b) => b.releasedAt!.localeCompare(a.releasedAt!) || a.listingId - b.listingId).slice(0, 4),
      rankingChanges,
    };
  }
  function getAppDetails(appId: string, scope: Scope): AppDetails | null {
    const i = names.findIndex((_, index) => idFor(index) === appId);
    if (i < 0) return null;
    const all = listings.filter(row => row.appId === appId);
    const chosen = scoped(scope).find(row => row.appId === appId);
    const listing: AppDetails["listing"] = chosen ? { ...chosen,
      description: `Synthetic demo description. ${purposes[i % 8]} ${names[i]} is a fictional application created only for AppRadar UI evaluation. No real store listing or user content is used.`,
      screenshotUrls: null,
      provenance: { rating: { source: SOURCE, role: "detail", observedAt: chosen.freshness.lastObservedAt, timeBasis: "collection", build: "demo-v1" } },
    } : null;
    const series: HistorySeries[] = !listing || i === 22 ? [] : (["detail", "discovery"] as const).map((role, s) => {
      const days = Array.from({ length: 15 }, (_, n) => 28 - n * 2).filter(day => day * 24 + 2 + i % 6 <= releaseAge(i) * 24 && day * 24 + 2 + i % 6 >= (listing.freshness.ageHours ?? 0));
      const points = days.map((day, n) => ({ observedAt: at(day, 2 + i % 6), timeBasis: "collection" as const,
        rating: n === 3 ? null : Math.max(0, Number((listing.rating! - day * .004 + s * .02).toFixed(2))),
        ratingCount: n === 3 ? null : Math.max(0, listing.ratingCount! - day * (i + 1) * 3), reviewCount: Math.max(0, listing.reviewCount! - day * 2),
        price: listing.price, installs: { text: listing.installs.text, lowerBound: listing.installs.lowerBound }, version: listing.version,
        fieldStatus: { rating: n === 3 ? "missing" : "available", installs: listing.store === "ios" ? "unsupported" : "available" },
      }));
      return { seriesKey: `demo:${appId}:${listing.country}:${listing.requestedLanguage}:${role}`, source: `${SOURCE}${s ? " (discovery)" : ""}`, role, points, comparable: points.length >= 2 };
    });
    return { app: { id: appId, store: all[0]!.store, storeAppId: all[0]!.storeAppId!, storeUrl: "", firstSeenAt: at(releaseAge(i)), lastSeenAt: all[0]!.freshness.lastObservedAt ?? at(releaseAge(i)) },
      listing, contexts: all.map(row => ({ country: row.country, requestedLanguage: row.requestedLanguage, lastObservedAt: row.freshness.lastObservedAt })),
      developer: { id: `demo-developer-${Math.floor(i / 2)}`, storeDeveloperId: `demo-studio-${Math.floor(i / 2)}`, name: all[0]!.developerName, storeUrl: null },
      relatedApps: [], history: { from: at(30), to: at(0), series }, media: { enabled: false }, storeDescription: { enabled: true } };
  }
  function detailSections(input: { appId: string; store: "ios" | "play"; country: string; language: string; tab: string; reviewPage: number; reviewSort: "newest" | "helpful"; keywordPage: number; keyword?: string; keywordSnapshot?: number }): DetailsSections {
    const result: DetailsSections = { reviews: null, distribution: null, keywords: null, selectedKeyword: null };
    const app = getAppDetails(input.appId, input);
    if (!app?.listing) return result;
    if (input.tab === "Reviews") {
      const reviews: ReviewItem[] = Array.from({ length: 18 }, (_, i) => ({ id: app.listing!.listingId * 100 + i,
        rating: [5, 4, 5, 3, 4, 5, 2, 4, 1][i % 9]!, reviewedAt: i === 17 ? null : at(Math.min(i / 4 + .1, releaseAge(names.indexOf(app.listing!.name!)))),
        appVersion: i % 5 === 0 ? null : app.listing!.version, helpfulVotes: i === 17 ? null : i * 3 % 11, totalVotes: i === 17 ? null : 12,
        firstSeenAt: at(0), lastSeenAt: at(0), content: { title: ["Demo: useful daily routine", "Demo: a few rough edges", "Demo: easy to get started"][i % 3]!,
          body: ["Synthetic review: The short checklist fits a quiet morning. I would like an easier way to rearrange items.", "Synthetic review: Setup was straightforward. More keyboard shortcuts would help on longer lists.", "Synthetic review: The layout is clear, although the first session could explain the filters better."][i % 3]!,
          developerReply: i % 4 === 0 ? "Synthetic developer reply: Thanks for this example feedback. We are exploring a simpler workflow." : null, developerReplyAt: i % 4 === 0 ? at(0, 1) : null } }));
      reviews.sort((a, b) => {
        const x = input.reviewSort === "helpful" ? a.helpfulVotes : a.reviewedAt;
        const y = input.reviewSort === "helpful" ? b.helpfulVotes : b.reviewedAt;
        if (x == null || y == null) return x == null ? y == null ? b.id - a.id : 1 : -1;
        return (typeof x === "number" && typeof y === "number" ? y - x : String(y).localeCompare(String(x))) || b.id - a.id;
      });
      const distribution: RatingDistribution = { total: reviews.length, buckets: ([1, 2, 3, 4, 5] as const).map(rating => ({ rating, count: reviews.filter(review => review.rating === rating).length })), other: 0 };
      result.reviews = ready({ ...page(reviews, input.reviewPage), contentStatus: "enabled" });
      result.distribution = ready(distribution);
    }
    if (input.tab === "Keywords") {
      const contextIndex = contexts.findIndex(ctx => ctx.country === input.country && ctx.language === input.language);
      const rows = scoped(input);
      const metric = (k: number, day = 0): KeywordMetrics => ({ contextKey: `demo:${input.store}:${input.country}:${input.language}:${k}:proxy-v1`, measurementMethod: "Synthetic proxy score", popularity: null,
        popularityProxy: k === 10 ? null : Math.min(100, 28 + k * 5 + day % 4), popularitySource: "proxy", difficulty: k === 10 ? null : 20 + k * 4, measuredAt: at(day, 2), checkedAt: at(day, 2), stale: false, metricsError: k === 10 ? "Synthetic unavailable metric example" : null, fieldStatus: { popularity: "unsupported", popularityProxy: k === 10 ? "missing" : "available" } });
      const summaries: KeywordSummary[] = keywords.map((keyword, k) => ({ keyword, snapshotId: 10000 + contextIndex * 1000 + (input.store === "play" ? 500 : 0) + k,
        store: input.store, country: input.country, requestedLanguage: input.language, effectiveLanguage: input.language,
        coverageStatus: k % 3 === 0 ? "partial" : k % 3 === 1 ? "bounded" : "truncated", observedAt: at(0, 2), collectedAt: at(0, 1), snapshotCount: 4, metrics: [metric(k)] }));
      result.keywords = ready(page(summaries, input.keywordPage));
      if (input.keyword) {
        const k = keywords.indexOf(input.keyword);
        const summary = summaries[k];
        const matches = summary && (input.keywordSnapshot == null || input.keywordSnapshot === summary.snapshotId);
        result.selectedKeyword = { rankings: ready(matches ? { snapshot: { id: summary.snapshotId, observedAt: summary.observedAt, coverageStatus: summary.coverageStatus, requestedLanguage: input.language },
          rankings: rows.map((row, n) => ({ rank: n + 1, appId: row.appId, storeAppId: row.storeAppId, appName: row.name, developerName: row.developerName, rating: row.rating, checkedAt: at(0, 2) })), suggestions: ["synthetic weekly planner", "synthetic quiet focus"], metrics: summary.metrics } : null),
          history: ready({ from: at(30), to: at(0), series: !summary ? [] : [{ contextKey: metric(k).contextKey, measurementMethod: metric(k).measurementMethod, popularitySource: "proxy", points: [21, 14, 7, 0].map((day, n) => ({ ...metric(k, day), snapshotId: summary.snapshotId + (n - 3) * 100, observedAt: at(day, 2), coverageStatus: summary.coverageStatus })) }] }) };
      }
    }
    return result;
  }
  return { getDashboard, listCategories, exploreApps, getAppDetails, detailSections };
}
