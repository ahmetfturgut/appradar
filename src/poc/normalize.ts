import { z } from "zod";
import { validateStoreMediaUrl } from "../lib/media/urls.ts";
import { type Job, sources, stableHash } from "./plan.ts";

const Text = z.string().trim().min(1).max(10000);
const Count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const Rating = z.number().min(0).max(5);
const DateTime = z.iso.datetime({ offset: true });
const nullable = <T extends z.ZodType>(schema: T) => schema.nullish();
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
type LanguageContext = { requested: string; effective: string | null };
const CollectionContext = z.object({ mode: z.enum(["details", "search", "charts", "developers", "reviews", "keywords", "negative"]), context: z.string(), category: Text.nullable() });
const KeywordFilters = z.object({
  topN: z.number().int().positive().nullable(), appIds: z.array(Text).nullable(),
  includePopularity: z.boolean().nullable(), includeSuggestions: z.boolean().nullable(),
});

export function canonicalAppIdentity(store: Job["store"], storeAppId: string): string {
  return stableHash(["app", store, storeAppId]);
}

function reviewIdentity(store: Job["store"], appId: string, namespace: string, reviewId: string): string {
  return stableHash(["review", 2, store, appId, namespace, reviewId]);
}

function reviewObservationKey(canonicalKey: string, runId: string, country: string, languageContext: LanguageContext): string {
  return stableHash(["review-observation", 2, canonicalKey, runId, country, languageContext]);
}

function keywordContextKey(store: Job["store"], keyword: string, country: string, languageContext: LanguageContext, method: string, filters: z.infer<typeof KeywordFilters>): string {
  return stableHash(["keyword-context", 2, store, keyword, country, languageContext, method, filters]);
}

function keywordObservationKey(contextKey: string, runId: string, rowType: KeywordObservation["rowType"], rowIdentity: string | null): string {
  return stableHash(["keyword-observation", 2, contextKey, runId, rowType, rowIdentity]);
}

function keywordMeasurementMethod(build: string, rowType: KeywordObservation["rowType"], popularitySource: KeywordObservation["popularitySource"]): string {
  return `asokeyword/${build}/${rowType}${rowType === "metrics" ? `/${popularitySource ?? "unknown"}` : ""}`;
}

function appObservationKey(source: string, runId: string, appKey: string, country: string, languageContext: LanguageContext, role: Observation["observationRole"], context: z.infer<typeof CollectionContext>): string {
  return stableHash(["app-observation", 2, source, runId, appKey, country, languageContext, role, context]);
}

const Subimpact = z.object({
  store: z.enum(["ios", "play"]), appId: Text, appTitle: Text, appUrl: Text,
  developerName: nullable(Text),
  country: z.string().regex(/^[A-Za-z]{2}$/), language: nullable(Text), scrapedAt: nullable(DateTime),
  price: nullable(z.number().nonnegative()), currency: nullable(z.string().regex(/^[A-Z]{3}$/)),
  isFree: nullable(z.boolean()), rating: nullable(Rating), ratingCount: nullable(Count), reviewCount: nullable(Count),
  installs: nullable(Text), minInstalls: nullable(Count), genre: nullable(Text), version: nullable(Text),
  chartRank: nullable(z.number().int().positive()), chartCollection: nullable(Text), chartCategory: nullable(Text),
  searchRank: nullable(z.number().int().positive()), searchTerm: nullable(Text), detailLevel: nullable(Text), source: nullable(Text),
});
const Aurelix = z.object({
  type: z.literal("app"), store: z.enum(["app_store", "google_play"]), app_id: Text, title: Text, url: Text,
  developer: nullable(Text), developer_id: nullable(Text), developer_url: nullable(Text), found_via: nullable(Text),
  country: z.string().regex(/^[A-Za-z]{2}$/), language: nullable(Text), scraped_at: nullable(DateTime),
  price: nullable(z.number().nonnegative()), currency: nullable(z.string().regex(/^[A-Z]{3}$/)),
  is_free: nullable(z.boolean()), rating: nullable(Rating), ratings_count: nullable(Count), reviews_count: nullable(Count),
  installs: nullable(Text), installs_min: nullable(Count), genre: nullable(Text), genre_id: nullable(Text), version: nullable(Text),
  chart_rank: nullable(z.number().int().positive()), chart: nullable(Text), chart_genre: nullable(Text),
});
const DataTrail = z.object({
  store: z.enum(["appStore", "googlePlay"]), appId: Text, title: Text, url: Text,
  developer: nullable(Text), developerId: nullable(Text),
  country: z.string().regex(/^[A-Za-z]{2}$/), category: nullable(Text), categoryId: nullable(Text),
  rating: nullable(Rating), ratingsCount: nullable(Count),
  price: nullable(z.number().nonnegative()), currency: nullable(z.string().regex(/^[A-Z]{3}$/)),
  isFree: nullable(z.boolean()), version: nullable(Text),
  releaseDate: nullable(z.string().trim().min(1).max(40)), updatedAt: nullable(z.string().trim().min(1).max(40)),
  source: z.enum(["chart", "search", "app"]),
  chart: nullable(Text), chartGenre: nullable(Text), chartRank: nullable(z.number().int().positive()),
  searchTerm: nullable(Text), searchRank: nullable(z.number().int().positive()),
});

// Presentation metadata is untrusted and optional: a bad value is dropped, never the whole row.
// Field names come from public Actor docs and are not yet verified against live payloads.
// Host allowlist matches src/lib/media/urls.ts (no binaries stored; https store/CDN URLs only).
const MediaUrl = z.string().max(2048).refine((value): value is string => validateStoreMediaUrl(value) != null).transform(value => validateStoreMediaUrl(value)!);
const Description = z.string().trim().min(1).max(20000);
const ScreenshotUrls = z.array(MediaUrl).min(1).max(30);

function presentation(provider: "subimpact" | "aurelix" | "datatrail", raw: Record<string, unknown>) {
  const names = provider === "datatrail" ? { description: "description", iconUrl: "iconUrl", screenshotUrls: "screenshots" }
    : provider === "aurelix" ? { description: null, iconUrl: "icon_url", screenshotUrls: "screenshots" }
    : { description: null, iconUrl: null, screenshotUrls: null };
  const read = <T>(name: string | null, schema: z.ZodType<T>): T | null => {
    const parsed = schema.safeParse(name == null ? undefined : raw[name]);
    return parsed.success ? parsed.data : null;
  };
  const values = {
    description: read(names.description, Description), iconUrl: read(names.iconUrl, MediaUrl),
    screenshotUrls: read(names.screenshotUrls, ScreenshotUrls),
  };
  const status = Object.fromEntries((Object.keys(values) as (keyof typeof values)[]).map(key =>
    [key, values[key] != null ? "available" as const : names[key] == null ? "unsupported" as const : "missing" as const]));
  return { values, status };
}

function storeDateToIso(value: string | null | undefined): string | null {
  if (value == null || !value.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return z.iso.date().safeParse(value).success ? `${value}T00:00:00.000Z` : null;
  const parsed = DateTime.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export interface Observation {
  idempotencyKey: string;
  canonicalAppKey: string;
  collectionContext: z.infer<typeof CollectionContext>;
  source: "subimpact" | "aurelix" | "datatrail";
  sourceRunId: string;
  sourceBuild: string;
  schemaVersion: 2;
  store: Job["store"];
  storeAppId: string;
  country: Job["country"];
  requestedLanguage: string;
  language: string | null;
  observedAt: string;
  observedTimeBasis: "source" | "collection";
  collectedAt: string;
  name: string;
  developerName: string | null;
  developerStoreId: string | null;
  observationRole: "detail" | "discovery";
  storeUrl: string;
  priceAmount: number | null;
  currency: string | null;
  isFree: boolean | null;
  ratingValue: number | null;
  ratingCount: number | null;
  reviewCount: number | null;
  installsText: string | null;
  installsLowerBound: number | null;
  category: string | null;
  version: string | null;
  description?: string | null;
  iconUrl?: string | null;
  screenshotUrls?: string[] | null;
  releasedAt: string | null;
  releasedAtPrecision: "date" | "datetime" | null;
  listingUpdatedAt: string | null;
  listingUpdatedAtPrecision: "date" | "datetime" | null;
  rank: number | null;
  rankContext: string | null;
  rankCategory: string | null;
  payloadHash: string;
  fieldStatus: Record<string, "available" | "missing" | "unsupported">;
}

export interface ReviewObservation {
  idempotencyKey: string;
  canonicalReviewKey: string;
  reviewIdNamespace: string;
  source: "aurelix" | "thewolves" | "aurelixplayreviews";
  sourceRunId: string;
  sourceBuild: string;
  schemaVersion: 2;
  store: Job["store"];
  storeAppId: string;
  country: Job["country"];
  requestedLanguage: string;
  language: string | null;
  sourceReviewId: string;
  rating: number;
  title: string | null;
  text: string | null;
  reviewedAt: string | null;
  observedAt: string;
  observedTimeBasis: "source" | "collection";
  collectedAt: string;
  appVersion: string | null;
  helpfulVotes: number | null;
  totalVotes: number | null;
  hasDeveloperReply: boolean;
  developerReply: string | null;
  developerReplyAt: string | null;
  payloadHash: string;
  fieldStatus: Record<string, "available" | "missing" | "unsupported">;
}

export interface KeywordObservation {
  idempotencyKey: string;
  keywordContextKey: string;
  measurementMethod: string;
  relevantFilters: z.infer<typeof KeywordFilters>;
  languageInputSupported: false;
  source: "asokeyword";
  sourceRunId: string;
  sourceBuild: string;
  schemaVersion: 2;
  rowType: "ranking" | "suggestion" | "metrics";
  keyword: string;
  store: Job["store"];
  country: Job["country"];
  requestedLanguage: string;
  language: string | null;
  checkedAt: string;
  observedAt: string;
  observedTimeBasis: "source";
  collectedAt: string;
  rank: number | null;
  storeAppId: string | null;
  appName: string | null;
  developerName: string | null;
  ratingValue: number | null;
  suggestion: string | null;
  // popularity is a 5–100 score (Apple Search Popularity or proxy), not monthly search volume.
  popularity: number | null;
  popularityProxy: number | null;
  popularitySource: "apple" | "proxy" | null;
  difficulty: number | null;
  measuredAt: string | null;
  stale: boolean | null;
  metricsError: string | null;
  payloadHash: string;
  fieldStatus: Record<string, "available" | "missing" | "unsupported">;
}

export type NormalizationResult =
  | { kind: "valid"; observation: Observation }
  | { kind: "valid_review"; review: ReviewObservation }
  | { kind: "valid_keyword"; keyword: KeywordObservation }
  | { kind: "source_error"; status: string }
  | { kind: "invalid"; issues: string[] };

const LegacyObservationSchema = z.object({
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/), source: z.enum(["subimpact", "aurelix", "datatrail"]),
  sourceRunId: Text, sourceBuild: Text, schemaVersion: z.literal(1), store: z.enum(["ios", "play"]),
  storeAppId: Text, country: z.enum(["TR", "US"]), requestedLanguage: Text, language: Text.nullable(),
  observedAt: DateTime, observedTimeBasis: z.enum(["source", "collection"]), collectedAt: DateTime,
  name: Text, developerName: Text.nullable().default(null), developerStoreId: Text.nullable().default(null),
  observationRole: z.enum(["detail", "discovery"]).default("detail"), storeUrl: z.url(), priceAmount: z.number().nonnegative().nullable(), currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  isFree: z.boolean().nullable(), ratingValue: Rating.nullable(), ratingCount: Count.nullable(), reviewCount: Count.nullable(),
  installsText: Text.nullable(), installsLowerBound: Count.nullable(), category: Text.nullable(), version: Text.nullable(),
  releasedAt: DateTime.nullable().default(null), listingUpdatedAt: DateTime.nullable().default(null),
  rank: z.number().int().positive().nullable(), rankContext: Text.nullable(), rankCategory: Text.nullable(),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/), fieldStatus: z.record(z.string(), z.enum(["available", "missing", "unsupported"])),
});
const LegacyReviewObservationSchema = z.object({
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/), source: z.enum(["aurelix", "thewolves", "aurelixplayreviews"]),
  sourceRunId: Text, sourceBuild: Text, schemaVersion: z.literal(1), store: z.enum(["ios", "play"]),
  storeAppId: Text, country: z.enum(["TR", "US"]), requestedLanguage: Text, language: Text.nullable(),
  sourceReviewId: Text, rating: Rating, title: Text.nullable(), text: Text.nullable(),
  reviewedAt: DateTime, observedTimeBasis: z.enum(["source", "collection"]), collectedAt: DateTime,
  appVersion: Text.nullable(), helpfulVotes: Count.nullable(), totalVotes: Count.nullable(),
  hasDeveloperReply: z.boolean(), developerReply: Text.nullable(), developerReplyAt: DateTime.nullable(),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/), fieldStatus: z.record(z.string(), z.enum(["available", "missing", "unsupported"])),
});
const LegacyKeywordObservationSchema = z.object({
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/), source: z.literal("asokeyword"),
  sourceRunId: Text, sourceBuild: Text, schemaVersion: z.literal(1),
  rowType: z.enum(["ranking", "suggestion", "metrics"]), keyword: Text,
  store: z.enum(["ios", "play"]), country: z.enum(["TR", "US"]), requestedLanguage: Text, language: Text.nullable(),
  checkedAt: DateTime, collectedAt: DateTime,
  rank: z.number().int().positive().nullable(), storeAppId: Text.nullable(), appName: Text.nullable(),
  developerName: Text.nullable(), ratingValue: Rating.nullable(), suggestion: Text.nullable(),
  popularity: z.number().min(0).max(100).nullable(), popularityProxy: z.number().min(0).max(100).nullable(),
  popularitySource: z.enum(["apple", "proxy"]).nullable(), difficulty: z.number().min(0).max(100).nullable(),
  measuredAt: DateTime.nullable(), stale: z.boolean().nullable(), metricsError: Text.nullable(),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/), fieldStatus: z.record(z.string(), z.enum(["available", "missing", "unsupported"])),
});
export const ObservationSchema: z.ZodType<Observation> = LegacyObservationSchema.extend({
  schemaVersion: z.literal(2), canonicalAppKey: Hash, collectionContext: CollectionContext,
  releasedAtPrecision: z.enum(["date", "datetime"]).nullable(), listingUpdatedAtPrecision: z.enum(["date", "datetime"]).nullable(),
  // Absent in earlier v2 journal entries; identity keys are unaffected.
  description: z.string().min(1).max(20000).nullable().default(null),
  iconUrl: z.string().max(2048).startsWith("https://").nullable().default(null),
  screenshotUrls: z.array(z.string().max(2048).startsWith("https://")).min(1).max(30).nullable().default(null),
}).superRefine((o, ctx) => {
  const canonical = canonicalAppIdentity(o.store, o.storeAppId);
  const key = appObservationKey(o.source, o.sourceRunId, canonical, o.country,
    { requested: o.requestedLanguage, effective: o.language }, o.observationRole, o.collectionContext);
  if (o.canonicalAppKey !== canonical || o.idempotencyKey !== key) {
    ctx.addIssue({ code: "custom", message: "app_identity_mismatch" });
  }
});
export const ReviewObservationSchema: z.ZodType<ReviewObservation> = LegacyReviewObservationSchema.extend({
  schemaVersion: z.literal(2), canonicalReviewKey: Hash, reviewIdNamespace: Text,
  reviewedAt: DateTime.nullable(), observedAt: DateTime,
}).superRefine((o, ctx) => {
  const namespace = `actor:${sources[o.source].actor}`;
  const canonical = reviewIdentity(o.store, o.storeAppId, namespace, o.sourceReviewId);
  const key = reviewObservationKey(canonical, o.sourceRunId, o.country,
    { requested: o.requestedLanguage, effective: o.language });
  if (o.reviewIdNamespace !== namespace || o.canonicalReviewKey !== canonical || o.idempotencyKey !== key) {
    ctx.addIssue({ code: "custom", message: "review_identity_mismatch" });
  }
});
export const KeywordObservationSchema: z.ZodType<KeywordObservation> = LegacyKeywordObservationSchema.extend({
  schemaVersion: z.literal(2), keywordContextKey: Hash, measurementMethod: Text, relevantFilters: KeywordFilters,
  languageInputSupported: z.literal(false), language: z.null(), observedAt: DateTime, observedTimeBasis: z.literal("source"),
}).superRefine((o, ctx) => {
  const method = keywordMeasurementMethod(o.sourceBuild, o.rowType, o.popularitySource);
  const context = keywordContextKey(o.store, o.keyword, o.country,
    { requested: o.requestedLanguage, effective: o.language }, method, o.relevantFilters);
  const rowIdentity = o.rowType === "ranking" ? o.storeAppId : o.rowType === "suggestion" ? o.suggestion : null;
  const key = keywordObservationKey(context, o.sourceRunId, o.rowType, rowIdentity);
  if (o.measurementMethod !== method || o.keywordContextKey !== context || o.idempotencyKey !== key) {
    ctx.addIssue({ code: "custom", message: "keyword_identity_mismatch" });
  }
  if (o.observedAt !== o.checkedAt || (o.rowType === "ranking" && (o.storeAppId == null || o.rank == null)) || (o.rowType === "suggestion" && o.suggestion == null)) {
    ctx.addIssue({ code: "custom", message: "keyword_row_context_invalid" });
  }
});

export const ResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("valid"), observation: ObservationSchema }),
  z.object({ kind: z.literal("valid_review"), review: ReviewObservationSchema }),
  z.object({ kind: z.literal("valid_keyword"), keyword: KeywordObservationSchema }),
  z.object({ kind: z.literal("source_error"), status: Text }),
  z.object({ kind: z.literal("invalid"), issues: z.array(Text) }),
]);

// Read compatibility only: never re-key old evidence or infer absent job filters.
// Existing job IDs, run IDs, row offsets and reservations still govern resuming.
export const PersistedResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("valid"), observation: z.union([ObservationSchema, LegacyObservationSchema]) }),
  z.object({ kind: z.literal("valid_review"), review: z.union([ReviewObservationSchema, LegacyReviewObservationSchema]) }),
  z.object({ kind: z.literal("valid_keyword"), keyword: z.union([KeywordObservationSchema, LegacyKeywordObservationSchema]) }),
  z.object({ kind: z.literal("source_error"), status: Text }),
  z.object({ kind: z.literal("invalid"), issues: z.array(Text) }),
]);
export type PersistedNormalizationResult = z.infer<typeof PersistedResultSchema>;
export type PersistedObservation = Observation | z.infer<typeof LegacyObservationSchema>;

const OptionalReviewText = z.string().trim().max(20000).nullish();
const AurelixReview = z.object({
  type: z.literal("review"), store: z.enum(["app_store", "google_play"]), app_id: Text,
  country: z.string().regex(/^[A-Za-z]{2}$/), language: nullable(Text), scraped_at: nullable(DateTime),
  review_id: Text, rating: Rating, review_title: OptionalReviewText, text: OptionalReviewText,
  date: nullable(DateTime), app_version: nullable(Text),
  helpful_votes: nullable(Count), total_votes: nullable(Count),
  developer_reply: OptionalReviewText, developer_reply_at: nullable(DateTime),
});
const TheWolvesReview = z.object({
  id: Text, appId: Text, country: z.string().regex(/^[A-Za-z]{2}$/),
  date: nullable(DateTime), score: Rating, title: OptionalReviewText, text: OptionalReviewText,
  version: nullable(Text),
});
const AsoStore = z.enum(["ios", "android"]);
const AsoRanking = z.object({
  type: z.literal("ranking"), keyword: Text, store: AsoStore, country: z.string().regex(/^[A-Za-z]{2}$/),
  rank: z.number().int().positive(), appId: Text, appName: nullable(Text), developer: nullable(Text),
  rating: nullable(Rating), checkedAt: DateTime,
});
const AsoSuggestion = z.object({
  type: z.literal("suggestion"), keyword: Text, suggestion: Text, store: AsoStore,
  country: z.string().regex(/^[A-Za-z]{2}$/), checkedAt: DateTime,
});
const AsoMetrics = z.object({
  type: z.literal("metrics"), keyword: Text, store: AsoStore, country: z.string().regex(/^[A-Za-z]{2}$/),
  popularity: nullable(z.number().min(0).max(100)), popularityProxy: nullable(z.number().min(0).max(100)),
  popularitySource: nullable(z.enum(["apple", "proxy"])), difficulty: nullable(z.number().min(0).max(100)),
  measuredAt: nullable(DateTime), stale: nullable(z.boolean()), error: OptionalReviewText, checkedAt: DateTime,
});

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

function mapAsoStore(store: "ios" | "android"): Job["store"] {
  return store === "ios" ? "ios" : "play";
}

function keywordFieldStatus(fields: Record<string, unknown>, unsupported: string[] = []): KeywordObservation["fieldStatus"] {
  const blocked = new Set(unsupported);
  return Object.fromEntries(Object.entries(fields).map(([key, v]) => [key, v == null ? (blocked.has(key) ? "unsupported" : "missing") : "available"]));
}

function keywordIdentityFields(job: Job, runId: string, rowType: KeywordObservation["rowType"], keyword: string, checkedAt: string, rowIdentity: string | null, popularitySource: KeywordObservation["popularitySource"], filters: z.infer<typeof KeywordFilters>) {
  // Build is deliberately retained in the method: changed scoring semantics
  // must not silently join an existing history series. Language is unsupported.
  const measurementMethod = keywordMeasurementMethod(sources.asokeyword.build, rowType, popularitySource);
  const contextKey = keywordContextKey(job.store, keyword, job.country, { requested: job.requestedLanguage, effective: null }, measurementMethod, filters);
  return {
    keywordContextKey: contextKey, measurementMethod, relevantFilters: filters, languageInputSupported: false as const,
    idempotencyKey: keywordObservationKey(contextKey, runId, rowType, rowIdentity),
    observedAt: checkedAt, observedTimeBasis: "source" as const,
  };
}

function keywordTimeIssues(checkedAt: string, collectedAt: string, measuredAt?: string | null): string[] {
  const limit = Date.parse(collectedAt) + 5 * 60000;
  return Date.parse(checkedAt) > limit || (measuredAt != null && Date.parse(measuredAt) > limit) ? ["future_observation"] : [];
}

function normalizeAsoKeyword(raw: Record<string, unknown>, job: Job, runId: string, collectedAt: string): NormalizationResult {
  if (job.mode !== "keywords") return { kind: "invalid", issues: ["unexpected_keyword_row"] };
  const parsedFilters = KeywordFilters.safeParse({
    topN: job.input.topN ?? null, appIds: job.input.appIds ?? null,
    includePopularity: job.input.includePopularity ?? null, includeSuggestions: job.input.includeSuggestions ?? null,
  });
  if (!parsedFilters.success) return { kind: "invalid", issues: ["invalid_keyword_filters"] };
  const filters = { ...parsedFilters.data, appIds: parsedFilters.data.appIds == null ? null : [...new Set(parsedFilters.data.appIds)].sort() };
  const type = raw.type;
  if (type === "ranking") {
    const parsed = AsoRanking.safeParse(raw);
    if (!parsed.success) return { kind: "invalid", issues: parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
    const value = parsed.data;
    const store = mapAsoStore(value.store);
    const issues: string[] = keywordTimeIssues(value.checkedAt, collectedAt);
    if (store !== job.store) issues.push("store_mismatch");
    if (value.country.toUpperCase() !== job.country) issues.push("country_mismatch");
    if (value.keyword !== job.context) issues.push("keyword_mismatch");
    if (issues.length) return { kind: "invalid", issues };
    const fields = {
      rank: value.rank, storeAppId: value.appId, appName: value.appName ?? null, developerName: value.developer ?? null,
      ratingValue: value.rating ?? null, suggestion: null, popularity: null, popularityProxy: null,
      popularitySource: null, difficulty: null, measuredAt: null, stale: null, metricsError: null,
    };
    return { kind: "valid_keyword", keyword: {
      ...keywordIdentityFields(job, runId, "ranking", value.keyword, value.checkedAt, value.appId, null, filters),
      source: "asokeyword", sourceRunId: runId, sourceBuild: sources.asokeyword.build, schemaVersion: 2,
      rowType: "ranking", keyword: value.keyword, store, country: job.country, requestedLanguage: job.requestedLanguage,
      language: null, checkedAt: value.checkedAt, collectedAt, ...fields,
      payloadHash: stableHash(raw), fieldStatus: keywordFieldStatus(fields, ["suggestion", "popularity", "popularityProxy", "popularitySource", "difficulty", "measuredAt", "stale", "metricsError"]),
    } };
  }
  if (type === "suggestion") {
    const parsed = AsoSuggestion.safeParse(raw);
    if (!parsed.success) return { kind: "invalid", issues: parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
    const value = parsed.data;
    const store = mapAsoStore(value.store);
    const issues: string[] = keywordTimeIssues(value.checkedAt, collectedAt);
    if (store !== job.store) issues.push("store_mismatch");
    if (value.country.toUpperCase() !== job.country) issues.push("country_mismatch");
    if (value.keyword !== job.context) issues.push("keyword_mismatch");
    if (issues.length) return { kind: "invalid", issues };
    const fields = {
      rank: null, storeAppId: null, appName: null, developerName: null, ratingValue: null,
      suggestion: value.suggestion, popularity: null, popularityProxy: null, popularitySource: null,
      difficulty: null, measuredAt: null, stale: null, metricsError: null,
    };
    return { kind: "valid_keyword", keyword: {
      ...keywordIdentityFields(job, runId, "suggestion", value.keyword, value.checkedAt, value.suggestion, null, filters),
      source: "asokeyword", sourceRunId: runId, sourceBuild: sources.asokeyword.build, schemaVersion: 2,
      rowType: "suggestion", keyword: value.keyword, store, country: job.country, requestedLanguage: job.requestedLanguage,
      language: null, checkedAt: value.checkedAt, collectedAt, ...fields,
      payloadHash: stableHash(raw), fieldStatus: keywordFieldStatus(fields, ["rank", "storeAppId", "appName", "developerName", "ratingValue", "popularity", "popularityProxy", "popularitySource", "difficulty", "measuredAt", "stale", "metricsError"]),
    } };
  }
  if (type === "metrics") {
    const parsed = AsoMetrics.safeParse(raw);
    if (!parsed.success) return { kind: "invalid", issues: parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
    const value = parsed.data;
    const store = mapAsoStore(value.store);
    const issues: string[] = keywordTimeIssues(value.checkedAt, collectedAt, value.measuredAt);
    if (store !== job.store) issues.push("store_mismatch");
    if (value.country.toUpperCase() !== job.country) issues.push("country_mismatch");
    if (value.keyword !== job.context) issues.push("keyword_mismatch");
    if (issues.length) return { kind: "invalid", issues };
    const fields = {
      rank: null, storeAppId: null, appName: null, developerName: null, ratingValue: null, suggestion: null,
      popularity: value.popularity ?? null, popularityProxy: value.popularityProxy ?? null,
      popularitySource: value.popularitySource ?? null, difficulty: value.difficulty ?? null,
      measuredAt: value.measuredAt ?? null, stale: value.stale ?? null, metricsError: blankToNull(value.error),
    };
    return { kind: "valid_keyword", keyword: {
      ...keywordIdentityFields(job, runId, "metrics", value.keyword, value.checkedAt, null, fields.popularitySource, filters),
      source: "asokeyword", sourceRunId: runId, sourceBuild: sources.asokeyword.build, schemaVersion: 2,
      rowType: "metrics", keyword: value.keyword, store, country: job.country, requestedLanguage: job.requestedLanguage,
      language: null, checkedAt: value.checkedAt, collectedAt, ...fields,
      payloadHash: stableHash(raw), fieldStatus: keywordFieldStatus(fields, ["rank", "storeAppId", "appName", "developerName", "ratingValue", "suggestion"]),
    } };
  }
  return { kind: "invalid", issues: ["unknown_keyword_row_type"] };
}

function unsupportedReviewFields(source: ReviewObservation["source"]): Set<string> {
  if (source === "thewolves") return new Set(["helpfulVotes", "totalVotes", "developerReply", "developerReplyAt"]);
  if (source === "aurelixplayreviews") return new Set(["title", "totalVotes"]);
  return new Set();
}

function reviewObservation(args: {
  job: Job; runId: string; collectedAt: string; raw: Record<string, unknown>;
  source: ReviewObservation["source"]; store: Job["store"]; storeAppId: string;
  sourceReviewId: string; rating: number; reviewedAt: string | null; observedAt: string; observedTimeBasis: "source" | "collection";
  language: string | null; title: string | null; text: string | null; appVersion: string | null;
  helpfulVotes: number | null; totalVotes: number | null;
  developerReply: string | null; developerReplyAt: string | null;
}): NormalizationResult {
  const fields = {
    title: args.title, text: args.text, appVersion: args.appVersion,
    helpfulVotes: args.helpfulVotes, totalVotes: args.totalVotes,
    developerReply: args.developerReply, developerReplyAt: args.developerReplyAt,
  };
  const unsupported = unsupportedReviewFields(args.source);
  const fieldStatus: ReviewObservation["fieldStatus"] = Object.fromEntries(Object.entries({
    ...fields, rating: args.rating, reviewedAt: args.reviewedAt,
  }).map(([key, v]) => [key, v == null ? (unsupported.has(key) ? "unsupported" : "missing") : "available"]));
  // No cross-Actor namespace equivalence has been verified, including the two
  // Aurelix actors. Text similarity never establishes identity.
  const reviewIdNamespace = `actor:${sources[args.source].actor}`;
  const canonicalReviewKey = reviewIdentity(args.store, args.storeAppId, reviewIdNamespace, args.sourceReviewId);
  return { kind: "valid_review", review: {
    canonicalReviewKey, reviewIdNamespace,
    idempotencyKey: reviewObservationKey(canonicalReviewKey, args.runId, args.job.country, { requested: args.job.requestedLanguage, effective: args.language }),
    source: args.source, sourceRunId: args.runId, sourceBuild: sources[args.source].build, schemaVersion: 2,
    store: args.store, storeAppId: args.storeAppId, country: args.job.country, requestedLanguage: args.job.requestedLanguage,
    language: args.language, sourceReviewId: args.sourceReviewId, rating: args.rating, ...fields,
    reviewedAt: args.reviewedAt, observedAt: args.observedAt, observedTimeBasis: args.observedTimeBasis, collectedAt: args.collectedAt,
    hasDeveloperReply: args.developerReply != null && args.developerReply.length > 0,
    payloadHash: stableHash(args.raw), fieldStatus,
  } };
}

function normalizeAurelixReview(raw: Record<string, unknown>, job: Job, runId: string, collectedAt: string, source: "aurelix" | "aurelixplayreviews"): NormalizationResult {
  const parsed = AurelixReview.safeParse(raw);
  if (!parsed.success) return { kind: "invalid", issues: parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
  const value = parsed.data;
  const store = value.store === "app_store" ? "ios" : "play";
  const issues: string[] = [];
  if (source === "aurelixplayreviews" && store !== "play") issues.push("store_mismatch");
  if (store !== job.store) issues.push("store_mismatch");
  if (value.country.toUpperCase() !== job.country) issues.push("country_mismatch");
  if (job.expectedIds.length && !job.expectedIds.includes(value.app_id)) issues.push("unexpected_app_id");
  if (job.store === "ios" ? !/^\d+$/.test(value.app_id) : !/^[A-Za-z][\w]*(?:\.[\w]+)+$/.test(value.app_id)) issues.push("invalid_app_id");
  if (value.date && Date.parse(value.date) > Date.parse(collectedAt) + 5 * 60000) issues.push("future_observation");
  if (value.scraped_at && Date.parse(value.scraped_at) > Date.parse(collectedAt) + 5 * 60000) issues.push("future_observation");
  if (job.store === "play" && value.language && value.language.toLowerCase() !== job.requestedLanguage) issues.push("language_mismatch");
  if (issues.length) return { kind: "invalid", issues };
  return reviewObservation({
    job, runId, collectedAt, raw, source, store, storeAppId: value.app_id,
    sourceReviewId: value.review_id, rating: value.rating, reviewedAt: value.date ?? null,
    observedAt: value.scraped_at ?? collectedAt, observedTimeBasis: value.scraped_at ? "source" : "collection",
    language: job.store === "ios" ? null : value.language ?? null,
    title: blankToNull(value.review_title), text: blankToNull(value.text), appVersion: value.app_version ?? null,
    helpfulVotes: value.helpful_votes ?? null, totalVotes: value.total_votes ?? null,
    developerReply: blankToNull(value.developer_reply), developerReplyAt: value.developer_reply_at ?? null,
  });
}

function normalizeTheWolvesReview(raw: Record<string, unknown>, job: Job, runId: string, collectedAt: string): NormalizationResult {
  const parsed = TheWolvesReview.safeParse(raw);
  if (!parsed.success) return { kind: "invalid", issues: parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
  const value = parsed.data;
  const issues: string[] = [];
  if (job.store !== "ios") issues.push("store_mismatch");
  if (value.country.toUpperCase() !== job.country) issues.push("country_mismatch");
  if (job.expectedIds.length && !job.expectedIds.includes(value.appId)) issues.push("unexpected_app_id");
  if (!/^\d+$/.test(value.appId)) issues.push("invalid_app_id");
  if (value.date && Date.parse(value.date) > Date.parse(collectedAt) + 5 * 60000) issues.push("future_observation");
  if (issues.length) return { kind: "invalid", issues };
  return reviewObservation({
    job, runId, collectedAt, raw, source: "thewolves", store: "ios", storeAppId: value.appId,
    sourceReviewId: value.id, rating: value.score, reviewedAt: value.date ?? null,
    observedAt: collectedAt, observedTimeBasis: "collection", language: null,
    title: blankToNull(value.title), text: blankToNull(value.text), appVersion: value.version ?? null,
    helpfulVotes: null, totalVotes: null, developerReply: null, developerReplyAt: null,
  });
}

function storeUrl(raw: string, job: Job, appId: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("store_url_protocol");
  if (job.store === "ios") {
    if (url.hostname !== "apps.apple.com" || !url.pathname.endsWith(`/id${appId}`)) throw new Error("store_url_identity");
    if (url.pathname.split("/")[1]?.toUpperCase() !== job.country) throw new Error("store_url_country");
    return `https://apps.apple.com/${job.country.toLowerCase()}/app/id${appId}`;
  }
  if (url.hostname !== "play.google.com" || url.pathname !== "/store/apps/details" || url.searchParams.get("id") !== appId) throw new Error("store_url_identity");
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}`;
}

export function normalizeItem(raw: unknown, job: Job, runId: string, collectedAt: string): NormalizationResult {
  const record = z.record(z.string(), z.unknown()).safeParse(raw);
  if (!record.success) return { kind: "invalid", issues: ["object_required"] };
  const error = z.object({ status: z.enum(["invalid-input", "not-found", "error"]) }).safeParse(record.data);
  if (error.success) return { kind: "source_error", status: error.data.status };
  DateTime.parse(collectedAt);
  if (job.provider === "asokeyword") {
    return normalizeAsoKeyword(record.data, job, runId, collectedAt);
  }
  if (job.provider === "thewolves") {
    if (job.mode !== "reviews" || job.store !== "ios") return { kind: "invalid", issues: ["unexpected_review_row"] };
    return normalizeTheWolvesReview(record.data, job, runId, collectedAt);
  }
  if (job.provider === "aurelixplayreviews") {
    if (job.mode !== "reviews" || job.store !== "play") return { kind: "invalid", issues: ["unexpected_review_row"] };
    return normalizeAurelixReview(record.data, job, runId, collectedAt, "aurelixplayreviews");
  }
  if (job.provider === "aurelix" && record.data.type === "review") {
    if (job.mode !== "reviews") return { kind: "invalid", issues: ["unexpected_review_row"] };
    return normalizeAurelixReview(record.data, job, runId, collectedAt, "aurelix");
  }

  const parsed = job.provider === "subimpact" ? Subimpact.safeParse(raw)
    : job.provider === "datatrail" ? DataTrail.safeParse(raw)
    : Aurelix.safeParse(raw);
  if (!parsed.success) return { kind: "invalid", issues: parsed.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
  const value = parsed.data;
  // Only validated, explicitly allowlisted fields enter normalized evidence.
  const appleGenre = Array.isArray(job.input.appleGenres) ? String((job.input.appleGenres as unknown[])[0] ?? "") : "";
  const playCategory = Array.isArray(job.input.playCategories) ? String((job.input.playCategories as unknown[])[0] ?? "") : "";
  const expectedChartCategory = job.store === "ios"
    ? (String(job.input.chartGenre ?? job.input.iosGenreId ?? (appleGenre || "6007")).trim() || "6007")
    : (String(job.input.playCategory ?? (playCategory || "PRODUCTIVITY")).trim() || "PRODUCTIVITY");
  const row = "app_id" in value ? {
    store: value.store === "app_store" ? "ios" : "play", id: value.app_id, name: value.title, developer: value.developer, developerId: value.developer_id ?? null, url: value.url, country: value.country,
    language: value.language, time: value.scraped_at, price: value.price, currency: value.currency, free: value.is_free,
    rating: value.rating, ratingCount: value.ratings_count, reviewCount: value.reviews_count,
    installs: value.installs, minimum: value.installs_min, category: value.genre, version: value.version,
    releasedAt: null as string | null, listingUpdatedAt: null as string | null,
    // Aurelix chart_genre is a display label; genre_id carries the App Store category id when present.
    rank: job.mode === "charts" ? value.chart_rank : null,
    rankContext: job.mode === "charts" ? value.chart : job.mode === "developers" ? job.context : null,
    rankCategory: job.mode === "charts" ? value.genre_id ?? expectedChartCategory : null,
  } : "appTitle" in value ? {
    store: value.store, id: value.appId, name: value.appTitle, developer: value.developerName, developerId: null as string | null, url: value.appUrl, country: value.country,
    language: value.language, time: value.scrapedAt, price: value.price, currency: value.currency, free: value.isFree,
    rating: value.rating, ratingCount: value.ratingCount, reviewCount: value.reviewCount,
    installs: value.installs, minimum: value.minInstalls, category: value.genre, version: value.version,
    releasedAt: null as string | null, listingUpdatedAt: null as string | null,
    rank: job.mode === "search" ? value.searchRank : job.mode === "charts" ? value.chartRank : null,
    rankContext: job.mode === "search" ? value.searchTerm : job.mode === "charts" ? value.chartCollection : null,
    rankCategory: job.mode === "charts" ? value.chartCategory : null,
  } : {
    store: value.store === "appStore" ? "ios" : "play", id: value.appId, name: value.title, developer: value.developer, developerId: value.developerId ?? null, url: value.url, country: value.country,
    language: null as string | null, time: null as string | null, price: value.price, currency: value.currency, free: value.isFree,
    rating: value.rating, ratingCount: value.ratingsCount, reviewCount: null as number | null,
    installs: null as string | null, minimum: null as number | null, category: value.category, version: value.version,
    releasedAt: storeDateToIso(value.releaseDate), listingUpdatedAt: storeDateToIso(value.updatedAt),
    rank: job.mode === "search" ? value.searchRank : job.mode === "charts" ? value.chartRank : null,
    rankContext: job.mode === "search" ? value.searchTerm : job.mode === "charts" ? value.chart : null,
    rankCategory: job.mode === "charts" ? value.chartGenre ?? value.categoryId ?? expectedChartCategory : null,
  };
  if (job.provider === "datatrail") {
    const trail = DataTrail.safeParse(raw);
    if (!trail.success) return { kind: "invalid", issues: trail.error.issues.map(i => `${i.path.join(".")}:${i.code}`) };
    if (job.mode === "charts" && trail.data.source !== "chart") return { kind: "invalid", issues: ["unexpected_source_row"] };
    if (job.mode === "search" && trail.data.source !== "search") return { kind: "invalid", issues: ["unexpected_source_row"] };
    if (trail.data.releaseDate && storeDateToIso(trail.data.releaseDate) == null) return { kind: "invalid", issues: ["invalid_release_date"] };
    if (trail.data.updatedAt && storeDateToIso(trail.data.updatedAt) == null) return { kind: "invalid", issues: ["invalid_listing_updated_at"] };
  }
  const issues: string[] = [];
  if (row.store !== job.store) issues.push("store_mismatch");
  if (row.country.toUpperCase() !== job.country) issues.push("country_mismatch");
  if (job.expectedIds.length && !job.expectedIds.includes(row.id)) issues.push("unexpected_app_id");
  if (job.store === "ios" ? !/^\d+$/.test(row.id) : !/^[A-Za-z][\w]*(?:\.[\w]+)+$/.test(row.id)) issues.push("invalid_app_id");
  if (row.price != null && row.currency == null) issues.push("price_without_currency");
  if (row.price != null && row.free != null && (row.price === 0) !== row.free) issues.push("price_free_conflict");
  if (row.time && Date.parse(row.time) > Date.parse(collectedAt) + 5 * 60000) issues.push("future_observation");
  if (job.store === "play" && row.language && row.language.toLowerCase() !== job.requestedLanguage) issues.push("language_mismatch");
  const chartAliases: Record<string, string> = {
    "top-free": "topFree", "top-paid": "topPaid", "top-grossing": "topGrossing",
    "new-apps": "newApps", "new-free-apps": "newFreeApps", "new-paid-apps": "newPaidApps",
  };
  const context = row.rankContext ? chartAliases[row.rankContext] ?? row.rankContext : null;
  if ((job.mode === "charts" || job.mode === "search") && (row.rank == null || context !== job.context)) issues.push("rank_context_missing_or_mismatch");
  if (job.mode === "charts" && row.rankCategory !== expectedChartCategory) issues.push("chart_category_missing_or_mismatch");
  if (job.mode === "developers") {
    const requested = String((job.input.developers as string[] | undefined)?.[0] ?? "");
    const developerId = row.developerId;
    if (!developerId || (!requested.includes(developerId) && requested !== developerId)) issues.push("developer_identity_mismatch");
    if (context !== job.context) issues.push("developer_context_mismatch");
  }
  let url = "";
  try { url = storeUrl(row.url, job, row.id); } catch { issues.push("invalid_store_url_or_context"); }
  if (issues.length) return { kind: "invalid", issues };

  const language = job.store === "ios" ? null : row.language ?? null;
  const observationRole: Observation["observationRole"] = job.mode === "details" || job.mode === "negative" ? "detail" : "discovery";
  const normalized = {
    priceAmount: row.price ?? null, currency: row.currency ?? null, isFree: row.free ?? null,
    ratingValue: row.rating ?? null, ratingCount: row.ratingCount ?? null, reviewCount: row.reviewCount ?? null,
    installsText: job.store === "ios" ? null : row.installs ?? null,
    installsLowerBound: job.store === "ios" ? null : row.minimum ?? null,
    category: row.category ?? null, version: row.version ?? null,
    releasedAt: row.releasedAt, listingUpdatedAt: row.listingUpdatedAt,
    releasedAtPrecision: row.releasedAt == null ? null : (typeof record.data.releaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.data.releaseDate) ? "date" as const : "datetime" as const),
    listingUpdatedAtPrecision: row.listingUpdatedAt == null ? null : (typeof record.data.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.data.updatedAt) ? "date" as const : "datetime" as const),
    rank: row.rank ?? null, rankContext: context, rankCategory: row.rankCategory ?? null,
  };
  const fieldStatus: Observation["fieldStatus"] = Object.fromEntries(Object.entries(normalized).map(([key, v]) => [key, v == null ? "missing" : "available"]));
  if (job.store === "ios") { fieldStatus.installsText = "unsupported"; fieldStatus.installsLowerBound = "unsupported"; }
  if (job.provider !== "datatrail") {
    fieldStatus.releasedAt = "unsupported";
    fieldStatus.listingUpdatedAt = "unsupported";
  }
  if (job.provider !== "subimpact" && job.provider !== "aurelix" && job.provider !== "datatrail") return { kind: "invalid", issues: ["unsupported_provider_for_app_row"] };
  const media = presentation(job.provider, record.data);
  Object.assign(fieldStatus, media.status);
  const canonicalAppKey = canonicalAppIdentity(job.store, row.id);
  const collectionContext = { mode: job.mode, context: job.context, category: job.mode === "charts" ? row.rankCategory ?? null : null };
  return { kind: "valid", observation: {
    ...normalized, ...media.values, canonicalAppKey, collectionContext,
    idempotencyKey: appObservationKey(job.provider, runId, canonicalAppKey, job.country, { requested: job.requestedLanguage, effective: language }, observationRole, collectionContext),
    source: job.provider, sourceRunId: runId, sourceBuild: sources[job.provider].build, schemaVersion: 2,
    store: job.store, storeAppId: row.id, country: job.country, requestedLanguage: job.requestedLanguage, language,
    observedAt: row.time ?? collectedAt, observedTimeBasis: row.time ? "source" : "collection", collectedAt,
    name: row.name, developerName: row.developer ?? null, developerStoreId: row.developerId, observationRole, storeUrl: url, payloadHash: stableHash(raw), fieldStatus,
  } };
}

export function countDelta(previous: number | null, current: number | null): number | null {
  return previous == null || current == null ? null : current - previous;
}
