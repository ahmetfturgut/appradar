// Reads a finished dataset and decides whether it may be persisted. Nothing here treats "empty" as success.
import { normalizeItem, type KeywordObservation, type Observation, type ReviewObservation } from "../../poc/normalize.ts";
import type { Job } from "../../poc/plan.ts";

export const PAGE_SIZE = 50;
export const MAX_ROWS = 200;

export async function readDataset(
  readPage: (datasetId: string, offset: number, limit: number) => Promise<unknown[]>,
  datasetId: string,
  onPage: (offset: number) => Promise<unknown> = async () => {},
) {
  const rows: unknown[] = [];
  // Rows are not stored, so a resumed job re-reads from 0; reads are free and persistence is idempotent.
  while (rows.length < MAX_ROWS) {
    const page = await readPage(datasetId, rows.length, PAGE_SIZE);
    rows.push(...page);
    await onPage(rows.length);
    if (page.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export interface Assessment {
  verdict: "accepted" | "rejected" | "truncated";
  /** false: persisted data (if any) is incomplete, so the job must not be reported as succeeded. */
  complete: boolean;
  reason: string | null;
  apps: Observation[];
  reviews: ReviewObservation[];
  keywords: KeywordObservation[];
  counts: { received: number; valid: number; invalid: number; expected: number | null };
}

export interface Coverage {
  /** Reported usage reached the run's charge cap. */
  chargeCapReached?: boolean;
  /** A finite reported usage is strictly below the cap. Omitted usage is not this. */
  usageConfirmedBelowCap?: boolean;
}

export function assessDataset(
  job: Job, runId: string, collectedAt: string, rows: unknown[], truncated: boolean, coverage: Coverage = {},
): Assessment {
  const apps: Observation[] = [];
  const reviews: ReviewObservation[] = [];
  const keywords: KeywordObservation[] = [];
  let invalid = 0;
  for (const raw of rows) {
    const result = normalizeItem(raw, job, runId, collectedAt);
    if (result.kind === "valid") apps.push(result.observation);
    else if (result.kind === "valid_review") reviews.push(result.review);
    else if (result.kind === "valid_keyword") keywords.push(result.keyword);
    else invalid++;
  }
  // Rows that count as the mode's actual result. A reviews run that only returned app rows has no result.
  const primary = job.mode === "reviews" ? reviews.length : job.mode === "keywords" ? keywords.length : apps.length;
  const valid = apps.length + reviews.length + keywords.length;
  const expected = job.mode === "details" ? job.expectedIds.length : job.mode === "charts" ? job.maxResults : null;
  const found = job.mode === "details" ? new Set(apps.map(a => a.storeAppId)).size : primary;
  const base = { apps, reviews, keywords, counts: { received: rows.length, valid, invalid, expected } };
  const rejected = (reason: string): Assessment => ({ ...base, verdict: "rejected", complete: false, reason, apps: [], reviews: [], keywords: [] });
  if (rows.length === 0) return rejected("dataset_empty");
  if (primary === 0) return rejected("dataset_no_valid_rows");
  if (invalid > valid) return rejected("dataset_mostly_invalid");
  if (truncated) {
    // The database only accepts truncated runs for list and keyword snapshots, which record the truncation.
    return ["search", "charts", "developers", "keywords"].includes(job.mode)
      ? { ...base, apps: job.mode === "keywords" ? [] : apps, verdict: "truncated", complete: false, reason: "dataset_truncated" }
      : rejected("dataset_truncated");
  }
  let reason = invalid > 0 ? "dataset_has_invalid_rows" : expected != null && found < expected ? "dataset_below_expected" : null;
  let complete = reason === null;
  if (complete && coverage.chargeCapReached) {
    complete = false;
    reason = "charge_cap_stop";
  } else if (complete && job.mode !== "details" && !coverage.usageConfirmedBelowCap) {
    // Search, charts, developers, reviews and keywords cannot prove the source ended
    // when the cap might have stopped the actor.
    complete = false;
    reason = "coverage_uncertain";
  }
  return { ...base, verdict: "accepted", complete, reason };
}
