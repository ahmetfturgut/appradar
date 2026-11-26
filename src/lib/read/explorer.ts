import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import {
  Category, Country, Language, LISTING_SELECT, Pagination, Store, mapListing, parseInput, quote, range, searchTerm, toPage,
  type ListingSummary, type Page,
} from "./shared.ts";

/** Sortable metrics. Unknown (null) values always sort last, whatever the direction. */
export const EXPLORER_SORTS = {
  ratingCount: "rating_count", rating: "rating_value", reviewCount: "review_count", price: "price_amount",
  releasedAt: "released_at", updatedAt: "store_updated_at", observedAt: "last_observed_at", name: "name",
  installsLowerBound: "installs_lower_bound",
} as const;
export type ExplorerSort = keyof typeof EXPLORER_SORTS;

export const ExplorerInput = Pagination.extend({
  q: z.string().max(200).optional(),
  store: Store.optional(),
  country: Country.optional(),
  language: Language.optional(),
  category: Category.optional(),
  price: z.enum(["any", "free", "paid"]).default("any"),
  /** Price bounds compare amounts only within one currency, so currency is required with them. */
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(Object.keys(EXPLORER_SORTS) as [ExplorerSort, ...ExplorerSort[]]).default("ratingCount"),
  direction: z.enum(["asc", "desc"]).default("desc"),
}).refine(v => (v.minPrice == null && v.maxPrice == null) || v.currency != null, { message: "currency_required" })
  .refine(v => v.minPrice == null || v.maxPrice == null || v.minPrice <= v.maxPrice, { message: "price_range" });
export type ExplorerInput = z.input<typeof ExplorerInput>;

export interface ExplorerResult extends Page<ListingSummary> {
  sort: ExplorerSort;
  direction: "asc" | "desc";
}

/**
 * Paginated listing explorer over current (non-expired) app listings. One row per
 * app + country + requested language context. Filtering, sorting and counting run in the database.
 */
export async function exploreApps(input: ExplorerInput = {}, client: ReadClient = defaultReadClient()): Promise<ExplorerResult> {
  const v = parseInput(ExplorerInput, input);
  const { offset, limit } = range(v.page, v.pageSize);
  const now = client.now();
  const query: Record<string, string> = {
    select: LISTING_SELECT, expires_at: `gt.${now}`,
    order: `${EXPLORER_SORTS[v.sort]}.${v.direction}.nullslast,id.asc`,
    offset: String(offset), limit: String(limit),
  };
  if (v.store) query.store = `eq.${v.store}`;
  if (v.country) query.country = `eq.${v.country}`;
  if (v.language) query.requested_language = `eq.${v.language}`;
  if (v.category) query.category_name = `eq.${v.category}`;
  if (v.minRating != null) query.rating_value = `gte.${v.minRating}`;
  if (v.currency) query.currency = `eq.${v.currency}`;

  const and: string[] = [];
  const term = searchTerm(v.q);
  if (v.q && !term) throw new ReadError("invalid_input");
  if (term) and.push(`or(name.ilike.${quote(`*${term}*`)},developer_name.ilike.${quote(`*${term}*`)})`);
  if (v.price === "free") and.push("or(is_free.is.true,price_amount.eq.0)");
  if (v.price === "paid") and.push("or(is_free.is.false,price_amount.gt.0)");
  if (v.minPrice != null) and.push(`price_amount.gte.${v.minPrice}`);
  if (v.maxPrice != null) and.push(`price_amount.lte.${v.maxPrice}`);
  if (and.length) query.and = `(${and.join(",")})`;

  const { rows, total } = await client.select("app_listings", query, { count: true });
  return { ...toPage(rows.map(row => mapListing(row, now)), v.page, v.pageSize, total), sort: v.sort, direction: v.direction };
}

/** Distinct categories present in current listings, with counts (requires migration 20261126000800). */
export async function listCategories(
  input: { store?: Store; country?: string; language?: string } = {}, client: ReadClient = defaultReadClient(),
): Promise<{ category: string | null; appCount: number; listingCount: number }[]> {
  const v = parseInput(z.object({ store: Store.optional(), country: Country.optional(), language: Language.optional() }), input);
  const rows = await client.rpc("appradar_read_category_distribution", {
    p_store: v.store ?? null, p_country: v.country ?? null, p_language: v.language ?? null, p_limit: 500,
  });
  if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
  return rows.map((row: Record<string, unknown>) => ({
    category: typeof row.category === "string" ? row.category : null,
    appCount: Number(row.app_count), listingCount: Number(row.listing_count),
  }));
}
