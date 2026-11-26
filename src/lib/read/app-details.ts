import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import {
  Country, Language, LISTING_SELECT, Store, Uuid, listingsFor, mapListing, mediaEnabled, storeDescriptionEnabled, num, parseInput, sanitizeText, str, bool,
  type ListingSummary,
} from "./shared.ts";

export const AppDetailsInput = z.object({
  appId: Uuid.optional(),
  store: Store.optional(),
  storeAppId: z.string().trim().min(1).max(255).optional(),
  /** Listing context. Without it the most recently observed listing is chosen. */
  country: Country.optional(),
  language: Language.optional(),
  /** History window; default 30 days (spec §11.1), at most 365. */
  historyDays: z.coerce.number().int().min(1).max(365).default(30),
  relatedLimit: z.coerce.number().int().min(0).max(24).default(12),
}).refine(v => v.appId != null || (v.store != null && v.storeAppId != null), { message: "app_identity_required" });
export type AppDetailsInput = z.input<typeof AppDetailsInput>;

export interface FieldProvenance {
  source: string | null;
  role: "detail" | "discovery" | null;
  observedAt: string | null;
  timeBasis: "source" | "collection" | null;
  build: string | null;
}

export interface HistoryPoint {
  observedAt: string;
  timeBasis: "source" | "collection";
  rating: number | null;
  ratingCount: number | null;
  reviewCount: number | null;
  price: { amount: number | null; currency: string | null; isFree: boolean | null };
  installs: { text: string | null; lowerBound: number | null };
  version: string | null;
  /** Per-field status as reported by the source: available | missing | unsupported. */
  fieldStatus: Record<string, string>;
}

/** One comparable series: same source, role and schema. Series are never blended; gaps are not filled. */
export interface HistorySeries {
  seriesKey: string;
  source: string;
  role: "detail" | "discovery";
  points: HistoryPoint[];
  /** At least two observations exist, so a delta between them can be shown. */
  comparable: boolean;
}

export interface AppDetails {
  app: { id: string; store: Store; storeAppId: string; storeUrl: string; firstSeenAt: string; lastSeenAt: string };
  listing: (ListingSummary & { description: string | null; screenshotUrls: string[] | null; provenance: Record<string, FieldProvenance> }) | null;
  /** Every current country/language context for this app. */
  contexts: { country: string; requestedLanguage: string; lastObservedAt: string | null }[];
  developer: { id: string; storeDeveloperId: string; name: string | null; storeUrl: string | null } | null;
  relatedApps: ListingSummary[];
  history: { from: string; to: string; series: HistorySeries[] };
  media: { enabled: boolean };
  /** Store listing description; withheld unless APPRADAR_STORE_DESCRIPTION_ENABLED=true. */
  storeDescription: { enabled: boolean };
}

function provenance(raw: unknown): Record<string, FieldProvenance> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, FieldProvenance> = {};
  for (const [field, stamp] of Object.entries(raw as Record<string, unknown>)) {
    if (!stamp || typeof stamp !== "object") continue;
    const s = stamp as Record<string, unknown>;
    // The external run id is an operational identifier and is deliberately not exposed.
    result[field] = {
      source: str(s.source), role: s.role === "detail" || s.role === "discovery" ? s.role : null,
      observedAt: str(s.observedAt), timeBasis: s.timeBasis === "source" || s.timeBasis === "collection" ? s.timeBasis : null,
      build: str(s.build),
    };
  }
  return result;
}

export async function getAppDetails(input: AppDetailsInput, client: ReadClient = defaultReadClient()): Promise<AppDetails | null> {
  const v = parseInput(AppDetailsInput, input);
  const now = client.now();

  const appQuery: Record<string, string> = { select: "id,store,store_app_id,canonical_url,developer_id,first_seen_at,last_seen_at", limit: "1" };
  if (v.appId) appQuery.id = `eq.${v.appId}`;
  else { appQuery.store = `eq.${v.store}`; appQuery.store_app_id = `eq.${v.storeAppId}`; }
  const appRow = (await client.select("apps", appQuery)).rows[0];
  if (!appRow) return null;
  const appId = String(appRow.id);
  const store: Store = appRow.store === "play" ? "play" : "ios";

  const descriptionsOn = storeDescriptionEnabled();
  const listingQuery: Record<string, string> = {
    select: `${LISTING_SELECT},${descriptionsOn ? "description," : ""}screenshot_urls,field_provenance`, app_id: `eq.${appId}`, expires_at: `gt.${now}`,
    order: "last_observed_at.desc.nullslast,id.asc", limit: "200",
  };
  const { rows: listingRows } = await client.select("app_listings", listingQuery);
  const contexts = listingRows.map(row => ({ country: String(row.country), requestedLanguage: String(row.requested_language), lastObservedAt: str(row.last_observed_at) }));
  const chosen = listingRows.find(row => (!v.country || row.country === v.country) && (!v.language || row.requested_language === v.language));
  // A requested context that has no current listing is reported as such, not swapped for another country.
  const listing = chosen ? {
    ...mapListing(chosen, now),
    description: descriptionsOn ? sanitizeText(chosen.description) : null,
    screenshotUrls: mediaEnabled() && Array.isArray(chosen.screenshot_urls) ? chosen.screenshot_urls.filter((u): u is string => typeof u === "string") : null,
    provenance: provenance(chosen.field_provenance),
  } : null;

  const developerId = str(appRow.developer_id);
  const [developerRows, relatedRows, history] = await Promise.all([
    developerId ? client.select("developers", { select: "id,store_developer_id,name,store_url", id: `eq.${developerId}`, limit: "1" }) : null,
    developerId && v.relatedLimit > 0
      ? client.select("apps", { select: "id", developer_id: `eq.${developerId}`, id: `neq.${appId}`, order: "last_seen_at.desc", limit: String(v.relatedLimit * 2) })
      : null,
    listing ? loadHistory(client, listing.listingId, v.historyDays, now) : Promise.resolve({ from: now, to: now, series: [] }),
  ]);

  let relatedApps: ListingSummary[] = [];
  if (relatedRows?.rows.length && listing) {
    const related = await listingsFor(client, relatedRows.rows.map(r => String(r.id)), listing.country, listing.requestedLanguage);
    relatedApps = [...related.values()].slice(0, v.relatedLimit);
  }
  const dev = developerRows?.rows[0];
  return {
    app: {
      id: appId, store, storeAppId: String(appRow.store_app_id), storeUrl: String(appRow.canonical_url),
      firstSeenAt: String(appRow.first_seen_at), lastSeenAt: String(appRow.last_seen_at),
    },
    listing, contexts,
    developer: dev ? { id: String(dev.id), storeDeveloperId: String(dev.store_developer_id), name: sanitizeText(dev.name, 500), storeUrl: str(dev.store_url) } : null,
    relatedApps, history, media: { enabled: mediaEnabled() }, storeDescription: { enabled: descriptionsOn },
  };
}

const SNAPSHOT_COLUMNS = "series_key,source,observation_role,observed_at,observed_time_basis,rating_value,rating_count,review_count,price_amount,currency,is_free,installs_text,installs_lower_bound,version,field_status";

async function loadHistory(client: ReadClient, listingId: number, days: number, now: string): Promise<AppDetails["history"]> {
  const from = new Date(Date.parse(now) - days * 86400000).toISOString();
  const { rows } = await client.select("app_snapshots", {
    select: SNAPSHOT_COLUMNS, listing_id: `eq.${listingId}`, expires_at: `gt.${now}`,
    and: `(observed_at.gte.${from},observed_at.lte.${now})`, order: "observed_at.asc,id.asc", limit: "2000",
  });
  const series = new Map<string, HistorySeries>();
  for (const row of rows) {
    const key = String(row.series_key);
    let s = series.get(key);
    if (!s) {
      s = { seriesKey: key, source: String(row.source), role: row.observation_role === "discovery" ? "discovery" : "detail", points: [], comparable: false };
      series.set(key, s);
    }
    s.points.push({
      observedAt: String(row.observed_at), timeBasis: row.observed_time_basis === "source" ? "source" : "collection",
      rating: num(row.rating_value), ratingCount: num(row.rating_count), reviewCount: num(row.review_count),
      price: { amount: num(row.price_amount), currency: str(row.currency), isFree: bool(row.is_free) },
      installs: { text: str(row.installs_text), lowerBound: num(row.installs_lower_bound) },
      version: str(row.version),
      fieldStatus: row.field_status && typeof row.field_status === "object" ? row.field_status as Record<string, string> : {},
    });
  }
  for (const s of series.values()) s.comparable = s.points.length >= 2;
  if (rows.length >= 2000) throw new ReadError("history_window_too_large");
  return { from, to: now, series: [...series.values()] };
}
