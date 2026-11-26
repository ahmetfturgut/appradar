import { ReviewObservationSchema, type ReviewObservation } from "../../poc/normalize.ts";
import { stableHash } from "../../poc/plan.ts";
import type { Rpc, WriteOptions } from "./rpc.ts";
import { parseRows, writeRuns, type WriteResult } from "./shared.ts";

function reviewRow(o: ReviewObservation) {
  const instant = (value: string | null) => value == null ? null : new Date(value).toISOString();
  return {
    ...o,
    // Vote counts drift constantly and do not create new history.
    contentHash: stableHash([o.rating, o.title, o.text, instant(o.reviewedAt), o.appVersion, o.developerReply, instant(o.developerReplyAt)]),
  };
}

/** T6. Identity comes from the v2 contract; provider namespaces are never merged. */
export async function persistReviews(rpc: Rpc, reviews: readonly unknown[], options: WriteOptions): Promise<WriteResult> {
  const rows = parseRows(ReviewObservationSchema, reviews).map(reviewRow);
  return writeRuns(rpc, "appradar_persist_reviews", "p_reviews", rows, options);
}
