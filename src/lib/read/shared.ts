import { z } from "zod";
import { ReadError, type ReadClient } from "./client.ts";
import { fieldFreshness, freshness, type FieldFreshness, type Freshness } from "./field-freshness.ts";
export { freshness, STALE_AFTER_HOURS, type Freshness, type FreshnessStatus } from "./field-freshness.ts";

export const MAX_PAGE_SIZE = 100;
export const MAX_OFFSET = 10000;

export const Store = z.enum(["ios", "play"]);
export type Store = z.infer<typeof Store>;
export const Country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
export const Language = z.string().trim().regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/).max(35);
export const Uuid = z.uuid();
export const IsoDate = z.iso.datetime({ offset: true }).or(z.iso.date());
export const Category = z.string().trim().min(1).max(100);

export const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  /** Exact count of matching rows; null only when the database could not report it. */
  total: number | null;
  pageCount: number | null;
}

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) throw new ReadError("invalid_input");
  return parsed.data;
}

export function range(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  if (offset > MAX_OFFSET) throw new ReadError("page_out_of_range");
  return { offset, limit: pageSize };
}

export function toPage<T>(items: T[], page: number, pageSize: number, total: number | null): Page<T> {
  return { items, page, pageSize, total, pageCount: total == null ? null : Math.ceil(total / pageSize) };
}

/** Quotes a value for PostgREST filter lists: in.(...), or=(...). */
export const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
export const inList = (values: readonly string[]) => `in.(${values.map(quote).join(",")})`;

/** Free text for ilike: LIKE wildcards and PostgREST syntax characters are removed, not interpreted. */
export function searchTerm(value: string | undefined): string | null {
  const cleaned = (value ?? "").replace(/[%_*\\"(),.:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  return cleaned.length >= 1 ? cleaned : null;
}

/** null stays null (unknown); numeric strings from bigint/numeric columns become numbers. */
export function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
export const str = (value: unknown): string | null => typeof value === "string" ? value : null;
export const bool = (value: unknown): boolean | null => typeof value === "boolean" ? value : null;

/** Untrusted store text: control characters removed, length bounded. Rendered as text, never HTML. */
export function sanitizeText(value: unknown, max = 20000): string | null {
  if (typeof value !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

/** Store media rights are unconfirmed (spec §5.2 / §6.5); icons/screenshots are withheld unless explicitly enabled. */
export const mediaEnabled = () => process.env.APPRADAR_STORE_MEDIA_ENABLED === "true";
/** Store description rights are unconfirmed; listing text is withheld unless explicitly enabled. */
export const storeDescriptionEnabled = () => process.env.APPRADAR_STORE_DESCRIPTION_ENABLED === "true";
/** Review usage rights are unconfirmed; text is withheld unless explicitly enabled. */
export const reviewContentEnabled = () => process.env.APPRADAR_REVIEW_CONTENT_ENABLED === "true";

export const LISTING_COLUMNS = [
  "id", "app_id", "store", "country", "requested_language", "effective_language", "name", "developer_name",
  "category_name", "version", "released_at", "released_at_precision", "store_updated_at", "store_updated_at_precision",
  "price_amount", "currency", "is_free", "rating_value", "rating_count", "review_count", "installs_text",
  "installs_lower_bound", "icon_url", "first_seen_at", "last_observed_at", "field_provenance",
].join(",");
export const LISTING_SELECT = `${LISTING_COLUMNS},apps!inner(store_app_id,canonical_url,developer_id)`;

export interface ListingSummary {
  appId: string;
  listingId: number;
  store: Store;
  storeAppId: string | null;
  storeUrl: string | null;
  country: string;
  requestedLanguage: string;
  effectiveLanguage: string | null;
  name: string | null;
  developerName: string | null;
  category: string | null;
  version: string | null;
  releasedAt: string | null;
  releasedAtPrecision: "date" | "datetime" | null;
  storeUpdatedAt: string | null;
  storeUpdatedAtPrecision: "date" | "datetime" | null;
  price: { amount: number | null; currency: string | null; isFree: boolean | null };
  rating: number | null;
  ratingCount: number | null;
  reviewCount: number | null;
  /** Google Play only: the store's displayed range, never a download count or rate. */
  installs: { text: string | null; lowerBound: number | null; supported: boolean };
  iconUrl: string | null;
  firstSeenAt: string | null;
  freshness: Freshness;
  /** Absent provenance is unknown; never inferred from the listing timestamp. */
  fieldFreshness?: FieldFreshness;
}

export function mapListing(row: Record<string, unknown>, now: string): ListingSummary {
  const app = (row.apps ?? {}) as Record<string, unknown>;
  const store = row.store === "play" ? "play" : "ios";
  const precision = (v: unknown) => v === "date" || v === "datetime" ? v : null;
  return {
    appId: String(row.app_id), listingId: Number(row.id), store,
    storeAppId: str(app.store_app_id), storeUrl: str(app.canonical_url),
    country: String(row.country), requestedLanguage: String(row.requested_language), effectiveLanguage: str(row.effective_language),
    name: sanitizeText(row.name, 500), developerName: sanitizeText(row.developer_name, 500), category: str(row.category_name),
    version: str(row.version), releasedAt: str(row.released_at), releasedAtPrecision: precision(row.released_at_precision),
    storeUpdatedAt: str(row.store_updated_at), storeUpdatedAtPrecision: precision(row.store_updated_at_precision),
    price: { amount: num(row.price_amount), currency: str(row.currency), isFree: bool(row.is_free) },
    rating: num(row.rating_value), ratingCount: num(row.rating_count), reviewCount: num(row.review_count),
    installs: { text: str(row.installs_text), lowerBound: num(row.installs_lower_bound), supported: store === "play" },
    iconUrl: mediaEnabled() ? str(row.icon_url) : null,
    firstSeenAt: str(row.first_seen_at), freshness: freshness(str(row.last_observed_at), now),
    fieldFreshness: fieldFreshness(row.field_provenance, now),
  };
}

/** Current listings for a set of apps in one country/language context (non-expired only). */
export async function listingsFor(client: ReadClient, appIds: readonly string[], country: string, language: string | null): Promise<Map<string, ListingSummary>> {
  const result = new Map<string, ListingSummary>();
  const unique = [...new Set(appIds)];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const query: Record<string, string> = {
      select: LISTING_SELECT, app_id: inList(chunk), country: `eq.${country}`, expires_at: `gt.${client.now()}`,
      order: "last_observed_at.desc.nullslast,id.asc",
    };
    if (language) query.requested_language = `eq.${language}`;
    const { rows } = await client.select("app_listings", query);
    for (const row of rows) {
      const listing = mapListing(row, client.now());
      // With no language given, the most recently observed context wins.
      if (!result.has(listing.appId)) result.set(listing.appId, listing);
    }
  }
  return result;
}
