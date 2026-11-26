import { z } from "zod";
import { defaultReadClient, ReadError, type ReadClient } from "./client.ts";
import { Country, IsoDate, Language, Pagination, Uuid, num, parseInput, range, reviewContentEnabled, sanitizeText, str, toPage, type Page } from "./shared.ts";

const SORTS = {
  newest: "reviewed_at.desc.nullslast,id.desc",
  oldest: "reviewed_at.asc.nullslast,id.asc",
  ratingHigh: "rating.desc,reviewed_at.desc.nullslast,id.desc",
  ratingLow: "rating.asc,reviewed_at.desc.nullslast,id.desc",
  helpful: "helpful_votes.desc.nullslast,id.desc",
} as const;

const ReviewFilter = z.object({
  appId: Uuid,
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxRating: z.coerce.number().min(0).max(5).optional(),
  /** reviewed_at bounds. Reviews without a source date are excluded when a bound is given. */
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  /** Restricts to reviews observed in this country/language context. */
  country: Country.optional(),
  language: Language.optional(),
});

export const ReviewsInput = Pagination.extend(ReviewFilter.shape).extend({
  sort: z.enum(Object.keys(SORTS) as [keyof typeof SORTS, ...(keyof typeof SORTS)[]]).default("newest"),
}).refine(v => v.minRating == null || v.maxRating == null || v.minRating <= v.maxRating, { message: "rating_range" });

export interface ReviewItem {
  id: number;
  rating: number;
  reviewedAt: string | null;
  appVersion: string | null;
  helpfulVotes: number | null;
  totalVotes: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Present only when APPRADAR_REVIEW_CONTENT_ENABLED=true. Sanitized plain text; never HTML. */
  content: { title: string | null; body: string | null; developerReply: string | null; developerReplyAt: string | null } | null;
}

export interface ReviewsResult extends Page<ReviewItem> {
  /** "disabled" until review usage rights and access requirements are confirmed. */
  contentStatus: "enabled" | "disabled";
}

type Filter = z.infer<typeof ReviewFilter>;

function filterQuery(v: Filter, now: string, withRating: boolean): Record<string, string> {
  const query: Record<string, string> = { app_id: `eq.${v.appId}`, expires_at: `gt.${now}` };
  const and: string[] = [];
  if (withRating && v.minRating != null) and.push(`rating.gte.${v.minRating}`);
  if (withRating && v.maxRating != null) and.push(`rating.lte.${v.maxRating}`);
  if (v.from) and.push(`reviewed_at.gte.${v.from}`);
  if (v.to) and.push(`reviewed_at.lte.${v.to}`);
  if (and.length) query.and = `(${and.join(",")})`;
  if (v.country) query["review_observations.country"] = `eq.${v.country}`;
  if (v.language) query["review_observations.requested_language"] = `eq.${v.language}`;
  if (v.country || v.language) query["review_observations.expires_at"] = `gt.${now}`;
  return query;
}

const contextEmbed = (v: Filter) => v.country || v.language ? ",review_observations!inner(country)" : "";

export async function listReviews(input: z.input<typeof ReviewsInput>, client: ReadClient = defaultReadClient()): Promise<ReviewsResult> {
  const v = parseInput(ReviewsInput, input);
  const { offset, limit } = range(v.page, v.pageSize);
  const now = client.now();
  const enabled = reviewContentEnabled();
  // Content columns are not even requested while disabled.
  const columns = ["id", "rating", "reviewed_at", "app_version", "helpful_votes", "total_votes", "first_seen_at", "last_seen_at",
    ...(enabled ? ["title", "body", "developer_reply", "developer_reply_at"] : [])].join(",");
  const { rows, total } = await client.select("reviews", {
    ...filterQuery(v, now, true), select: columns + contextEmbed(v),
    order: SORTS[v.sort], offset: String(offset), limit: String(limit),
  }, { count: true });
  const items = rows.map((r): ReviewItem => ({
    id: Number(r.id), rating: Number(r.rating), reviewedAt: str(r.reviewed_at), appVersion: str(r.app_version),
    helpfulVotes: num(r.helpful_votes), totalVotes: num(r.total_votes),
    firstSeenAt: String(r.first_seen_at), lastSeenAt: String(r.last_seen_at),
    content: enabled ? {
      title: sanitizeText(r.title, 1000), body: sanitizeText(r.body, 10000),
      developerReply: sanitizeText(r.developer_reply, 10000), developerReplyAt: str(r.developer_reply_at),
    } : null,
  }));
  return { ...toPage(items, v.page, v.pageSize, total), contentStatus: enabled ? "enabled" : "disabled" };
}

export interface RatingDistribution {
  total: number;
  /** Count of reviews with exactly this star value. */
  buckets: { rating: 1 | 2 | 3 | 4 | 5; count: number }[];
  /** Non-integer or 0 ratings, kept separate instead of rounded into a bucket. */
  other: number;
}

/** Review star distribution for stored reviews (counted in the database). Not the store's overall rating histogram. */
export async function getReviewRatingDistribution(input: z.input<typeof ReviewFilter>, client: ReadClient = defaultReadClient()): Promise<RatingDistribution> {
  const v = parseInput(ReviewFilter, input);
  const now = client.now();
  const base = filterQuery(v, now, false);
  const select = "id" + contextEmbed(v);
  const stars = [1, 2, 3, 4, 5] as const;
  const [total, ...counts] = await Promise.all([
    client.count("reviews", { ...base, select }),
    ...stars.map(star => client.count("reviews", { ...base, select, rating: `eq.${star}` })),
  ]);
  if (total == null) throw new ReadError("read_count_unavailable");
  const buckets = stars.map((rating, i) => ({ rating, count: counts[i]! }));
  return { total, buckets, other: total - buckets.reduce((n, b) => n + b.count, 0) };
}
