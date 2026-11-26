// Job creation. Inputs reproduce the shapes already validated against each actor in tools/.
import { Job, stableHash, type Provider } from "../../poc/plan.ts";
import type { CollectionConfig, CollectionMode, Schedule, Target } from "./config.ts";
import type { CollectionStore } from "./store.ts";

function need<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`target_requires_${name}`);
  return value;
}

const storeCharts: Record<string, string> = { topFree: "top-free", topPaid: "top-paid", topGrossing: "top-grossing" };
const trailCharts: Record<string, string> = { newFreeApps: "new-free-apps", newPaidApps: "new-paid-apps" };

function providerInput(provider: Provider, mode: CollectionMode, t: Target, language: string) {
  const country = t.country.toLowerCase();
  const max = t.maxResults ?? 20;
  const pair = `${provider}/${mode}`;
  if (provider === "subimpact" && (mode === "details" || mode === "search" || mode === "charts")) {
    const base = { mode, store: t.store, country, language, fullDetails: true, proxy: { useApifyProxy: false } };
    if (mode === "details") {
      const ids = need(t.appIds, "appIds");
      return { context: "sample", expectedIds: ids, maxResults: ids.length, input: { ...base, appIds: ids, maxItems: ids.length } };
    }
    if (mode === "search") {
      const term = need(t.term, "term");
      return { context: term, expectedIds: [], maxResults: max, input: { ...base, searchTerms: [term], maxItems: max } };
    }
    const chart = need(t.chart, "chart");
    if (!storeCharts[chart]) throw new Error("unsupported_chart");
    return { context: chart, expectedIds: [], maxResults: max, input: {
      ...base, chartCollection: chart, maxItems: max,
      iosGenreId: t.store === "ios" ? t.category ?? "6007" : "6007",
      playCategory: t.store === "play" ? t.category ?? "PRODUCTIVITY" : "PRODUCTIVITY",
    } };
  }
  if (provider === "aurelix") {
    const base = { countries: [country], language, proxyConfiguration: { useApifyProxy: false } };
    if (mode === "details") {
      const ids = need(t.appIds, "appIds");
      return { context: "sample", expectedIds: ids, maxResults: ids.length,
        input: { ...base, apps: ids, maxReviewsPerApp: 0, developers: [], appStoreCharts: [], onlyNewReviews: false } };
    }
    if (mode === "charts") {
      const chart = need(t.chart, "chart");
      if (t.store !== "ios" || !storeCharts[chart]) throw new Error("unsupported_chart");
      return { context: chart, expectedIds: [], maxResults: max, input: {
        ...base, apps: [], developers: [], appStoreCharts: [storeCharts[chart]], chartGenre: t.category ?? "6007",
        maxAppsPerList: max, maxReviewsPerApp: 0 } };
    }
    if (mode === "developers") {
      const developer = need(t.developer, "developer");
      return { context: developer.id, expectedIds: [], maxResults: max, input: {
        ...base, apps: [], developers: [developer.url], appStoreCharts: [], chartGenre: "", maxAppsPerList: max, maxReviewsPerApp: 0 } };
    }
    if (mode === "reviews") {
      const [id, extra] = need(t.appIds, "appIds");
      if (!id || extra) throw new Error("reviews_require_one_app");
      return { context: id, expectedIds: [id], maxResults: max, input: {
        ...base, apps: [id], developers: [], appStoreCharts: [], chartGenre: "", maxReviewsPerApp: max,
        reviewSort: "mostrecent", onlyNewReviews: false } };
    }
  }
  if ((pair === "thewolves/reviews" && t.store === "ios") || (pair === "aurelixplayreviews/reviews" && t.store === "play")) {
    const [id, extra] = need(t.appIds, "appIds");
    if (!id || extra) throw new Error("reviews_require_one_app");
    const input = provider === "thewolves"
      ? { appIds: [id], country, maxItems: max }
      : { apps: [id], maxReviewsPerApp: max, sort: "newest", stars: "", language, countries: [country], onlyNewReviews: false, proxyConfiguration: { useApifyProxy: true } };
    return { context: id, expectedIds: [id], maxResults: max, input };
  }
  if (pair === "datatrail/charts" && t.store === "ios") {
    const chart = need(t.chart, "chart");
    if (!trailCharts[chart]) throw new Error("unsupported_chart");
    return { context: chart, expectedIds: [], maxResults: max, input: {
      appleCharts: [trailCharts[chart]], appleGenres: [t.category ?? "6007"], chartLimit: max, trackRankChanges: false,
      countries: [country], language, includeDescription: false, proxyConfiguration: { useApifyProxy: true } } };
  }
  if (pair === "asokeyword/keywords") {
    const keyword = need(t.term, "term");
    return { context: keyword, expectedIds: [], maxResults: max, input: {
      keywords: [keyword], store: t.store, country, appIds: t.appIds ?? [], topN: max, includeSuggestions: false, includePopularity: true } };
  }
  throw new Error(`unsupported_collection:${pair}/${t.store}`);
}

export function buildJob(provider: Provider, mode: CollectionMode, target: Target): Job {
  const language = target.language ?? (target.country === "TR" ? "tr" : "en");
  const values = {
    provider, mode, store: target.store, country: target.country, requestedLanguage: language, round: 1 as const,
    maxChargeUsd: 0.05 as const, ...providerInput(provider, mode, target, language),
  };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}

export function dedupeKey(job: Job): string {
  return `v1:${job.provider}:${job.mode}:${stableHash([job.store, job.country, job.requestedLanguage, job.context, job.input]).slice(0, 40)}`;
}

export function windowStart(now: Date, everyMinutes: number): string {
  const size = everyMinutes * 60000;
  return new Date(Math.floor(now.getTime() / size) * size).toISOString();
}

export interface PlannedJob { job: Job; dedupeKey: string; scheduledFor: string; maxAttempts: number }
export interface Selection { provider?: string; mode?: string; onlyEnabled?: boolean; newWindow?: boolean }

/** Pure: the dry run and the real enqueue use the same plan. */
export function planJobs(config: CollectionConfig, now: Date, selection: Selection = {}): PlannedJob[] {
  const selected = config.schedules.filter((s: Schedule) =>
    (!selection.provider || s.provider === selection.provider) && (!selection.mode || s.mode === selection.mode)
    && (!selection.onlyEnabled || s.enabled));
  return selected.flatMap(schedule => schedule.targets.map(target => {
    const job = buildJob(schedule.provider, schedule.mode, target);
    return {
      job, dedupeKey: dedupeKey(job), maxAttempts: config.maxAttempts,
      scheduledFor: selection.newWindow ? now.toISOString() : windowStart(now, schedule.everyMinutes),
    };
  }));
}

export async function enqueue(store: Pick<CollectionStore, "enqueue">, planned: PlannedJob[]) {
  const results = [];
  for (const p of planned) {
    const result = await store.enqueue({
      provider: p.job.provider, mode: p.job.mode, scope: p.job, dedupeKey: p.dedupeKey,
      scheduledFor: p.scheduledFor, maxAttempts: p.maxAttempts,
    });
    results.push({ ...result, provider: p.job.provider, mode: p.job.mode, context: p.job.context });
  }
  return results;
}

/** Scheduler tick for a future cron. Does nothing unless scheduling is enabled; never starts an actor. */
export async function scheduleDue(store: Pick<CollectionStore, "enqueue">, config: CollectionConfig, now: Date) {
  if (!config.schedulingEnabled) return [];
  return enqueue(store, planJobs(config, now, { onlyEnabled: true }));
}
