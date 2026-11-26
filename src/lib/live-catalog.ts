import type { PersistedObservation as Observation } from "../poc/normalize";
import { translateCategory, type DemoApp, type LiveSnapshot, type Country } from "./demo-data";

export interface Catalog {
  mode: "demo" | "live" | "unavailable";
  apps: DemoApp[];
  categories: string[];
  latestCollectedAt: string | null;
  observationCount: number;
  missingObservations: number;
  observedUsageUsd: number | null;
  completedRuns: number;
  sourceLabel: string;
  error: string | null;
}
function preferredObservation(a: Observation, b: Observation): number {
  // Detail lookups beat discovery (search/charts/developers); Aurelix beats Subimpact when roles tie.
  const detail = (o: Observation) => (o.observationRole ?? (o.rank != null ? "discovery" : "detail")) === "detail" ? 1 : 0;
  const source = (o: Observation) => o.source === "aurelix" ? 1 : 0;
  return detail(b) - detail(a) || source(b) - source(a) || Date.parse(b.observedAt) - Date.parse(a.observedAt) || Date.parse(b.collectedAt) - Date.parse(a.collectedAt);
}

export function buildLiveApps(observations: Observation[], now = Date.now()): DemoApp[] {
  const groups = new Map<string, Observation[]>();
  for (const observation of observations) {
    if (now - Date.parse(observation.collectedAt) > 7 * 86400000) continue;
    const id = `live-${observation.store}-${observation.storeAppId}`;
    const group = groups.get(id) ?? [];
    group.push(observation);
    groups.set(id, group);
  }
  return [...groups.entries()].map(([id, values]) => {
    values.sort(preferredObservation);
    const newest = values[0]!;
    const selected: Partial<Record<Country, LiveSnapshot>> = {};
    const history: LiveSnapshot[] = [];
    const keys = new Set<string>();
    for (const value of values) {
      if (keys.has(value.idempotencyKey)) continue;
      keys.add(value.idempotencyKey);
      const snapshot: LiveSnapshot = { name: value.name, developer: value.developerName, category: value.category, country: value.country, requestedLanguage: value.requestedLanguage, language: value.language, source: value.source, runId: value.sourceRunId, observedAt: value.observedAt, collectedAt: value.collectedAt, rating: value.ratingValue, ratings: value.ratingCount, price: value.priceAmount, currency: value.currency, free: value.isFree, version: value.version, storeUrl: value.storeUrl, reviewCount: value.reviewCount, installsText: value.installsText };
      selected[value.country] ??= snapshot;
      history.push(snapshot);
    }
    return { id, name: newest.name, developer: newest.developerName ?? "Geliştirici verisi yok", category: translateCategory(newest.category), store: newest.store, icon: "orbit" as const, color: newest.store === "ios" ? "indigo" : "green", tagline: "Uygulama bilgileri", description: "Mağaza açıklaması bu katalogda sunulmuyor. Ayrıntıları uygulamanın mağaza sayfasında inceleyebilirsin.", rating: null, ratings: null, free: null, price: { TR: null, US: null }, version: null, live: { observations: selected, history } };
  }).sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
export function comparableHistory(app: DemoApp, country: Country, now = Date.now(), days = 14): LiveSnapshot[] {
  const latest = app.live?.observations[country];
  if (!latest) return [];
  const unique = new Map<string, LiveSnapshot>();
  for (const item of app.live?.history ?? []) {
    if (item.country !== country || item.source !== latest.source || item.requestedLanguage !== latest.requestedLanguage || item.language !== latest.language || item.ratings == null || now - Date.parse(item.observedAt) > days * 86400000) continue;
    unique.set(item.observedAt, item);
  }
  return [...unique.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}
export const formatObservedAt = (value: string | null) => value ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(value)) : "Henüz gözlem yok";
