// Persistence wiring for a future approved import. Remote writes stay closed.
import type { Observation, KeywordObservation, ReviewObservation } from "../../poc/normalize.ts";
import type { Journal, Entry } from "../../poc/journal.ts";
import { persistAppObservations } from "../persistence/apps.ts";
import { persistDiscovery } from "../persistence/discovery.ts";
import { persistKeywords } from "../persistence/keywords.ts";
import { persistReviews } from "../persistence/reviews.ts";
import type { Rpc } from "../persistence/rpc.ts";
import { classifyResult, type ClassifyOptions } from "./classify.ts";

export class ImportDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportDisabledError";
  }
}

export interface WriteOptions extends ClassifyOptions {
  /** Must be true together with an explicit CLI --execute. Still refuses while remote import is disabled. */
  execute: boolean;
  /** Product decision. Required before any write. */
  retentionDays: number;
  reviewImportAllowed?: boolean;
}

/**
 * Groups eligible v2 rows and would call T4–T7. Refuses until remote import is enabled.
 * Does not create provider_runs or budget rows.
 */
export async function importEligibleObservations(
  rpc: Rpc, journal: Journal, options: WriteOptions,
): Promise<never> {
  if (!options.execute) throw new ImportDisabledError("execute_approval_required");
  // Dry-run-only phase: persistence helpers stay referenced, remote writes stay closed.
  void rpc;
  void persistEligibleGroups;
  void groupEligible(journal, options);
  throw new ImportDisabledError("remote_import_disabled");
}

export function groupEligible(journal: Journal, options: ClassifyOptions) {
  const apps: Observation[] = [];
  const reviews: ReviewObservation[] = [];
  const keywords: KeywordObservation[] = [];
  for (const entry of Object.values(journal.entries) as Entry[]) {
    for (const [offset, raw] of Object.entries(entry.results)) {
      const row = classifyResult(entry, offset, raw, options);
      if (row.disposition !== "eligible") continue;
      const result = entry.results[offset]!;
      if (result.kind === "valid") apps.push(result.observation as Observation);
      else if (result.kind === "valid_review") reviews.push(result.review as ReviewObservation);
      else if (result.kind === "valid_keyword") keywords.push(result.keyword as KeywordObservation);
    }
  }
  return { apps, reviews, keywords };
}

/** Reference for the approved write path. Not called while remote import is disabled. */
export async function persistEligibleGroups(
  rpc: Rpc,
  groups: ReturnType<typeof groupEligible>,
  expiresAt: string,
  reviewImportAllowed: boolean,
) {
  const options = { expiresAt };
  const results = [];
  if (groups.apps.length) {
    results.push(await persistAppObservations(rpc, groups.apps, options));
    results.push(await persistDiscovery(rpc, groups.apps, options));
  }
  if (reviewImportAllowed && groups.reviews.length) {
    results.push(await persistReviews(rpc, groups.reviews, options));
  }
  if (groups.keywords.length) {
    results.push(await persistKeywords(rpc, groups.keywords, options));
  }
  return results;
}
