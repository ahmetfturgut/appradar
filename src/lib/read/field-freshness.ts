/** Public, pure freshness helpers. No run ids, credentials or server imports. */
export type FreshnessStatus = "fresh" | "stale" | "unknown";
export interface Freshness { lastObservedAt: string | null; ageHours: number | null; status: FreshnessStatus; staleAfterHours: number }
export const STALE_AFTER_HOURS = 72;
export const LISTING_FIELDS = ["effective_language", "name", "developer_name", "category_name", "version", "released_at", "store_updated_at", "price", "rating_value", "rating_count", "review_count", "installs_text", "installs_lower_bound", "description", "icon_url", "screenshot_urls"] as const;
export type ListingField = typeof LISTING_FIELDS[number];
export type FieldFreshness = Partial<Record<ListingField, Freshness>>;

export function freshness(observedAt: string | null, now: string, staleAfterHours = STALE_AFTER_HOURS): Freshness {
  const time = observedAt == null ? NaN : Date.parse(observedAt);
  const reference = Date.parse(now);
  // Invalid/future stamps are unknown. Never clamp them into a fresh observation.
  if (!Number.isFinite(time) || !Number.isFinite(reference) || time > reference) return { lastObservedAt: null, ageHours: null, status: "unknown", staleAfterHours };
  const age = (reference - time) / 3_600_000;
  return { lastObservedAt: observedAt, ageHours: Math.round(age * 10) / 10, status: age > staleAfterHours ? "stale" : "fresh", staleAfterHours };
}

export function fieldFreshness(raw: unknown, now: string): FieldFreshness {
  const provenance = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return Object.fromEntries(LISTING_FIELDS.map(field => {
    const value = provenance[field];
    const stamp = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const valid = typeof stamp.source === "string" && stamp.source.length > 0 && (stamp.role === "detail" || stamp.role === "discovery") && (stamp.timeBasis === "source" || stamp.timeBasis === "collection");
    return [field, freshness(valid && typeof stamp.observedAt === "string" ? stamp.observedAt : null, now)];
  }));
}

/** One missing field prevents a claim that all contributing fields are fresh. */
export function retainedFreshness(fields: FieldFreshness | undefined, keys: readonly ListingField[]): Freshness {
  const values = keys.map(key => fields?.[key]);
  const known = values.filter((v): v is Freshness => !!v && v.status !== "unknown");
  const oldest = [...known].sort((a, b) => Date.parse(a.lastObservedAt!) - Date.parse(b.lastObservedAt!))[0];
  if (known.length !== keys.length || !oldest) return { lastObservedAt: null, ageHours: null, status: "unknown", staleAfterHours: STALE_AFTER_HOURS };
  return oldest;
}

export interface FreshnessSummary { newest: string | null; oldest: string | null; stale: number; unknown: number }
export function summarizeFreshness(values: readonly (Freshness | undefined)[]): FreshnessSummary {
  const dates = values.flatMap(v => v?.lastObservedAt && v.status !== "unknown" ? [v.lastObservedAt] : []).sort();
  return { newest: dates.at(-1) ?? null, oldest: dates[0] ?? null, stale: values.filter(v => v?.status === "stale").length, unknown: values.filter(v => !v || v.status === "unknown").length };
}
