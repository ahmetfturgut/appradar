import { KeywordObservationSchema, type KeywordObservation } from "../../poc/normalize.ts";
import { stableHash } from "../../poc/plan.ts";
import type { Rpc, WriteOptions } from "./rpc.ts";
import { groupBy, parseRows, writeRuns, type WriteResult } from "./shared.ts";

export function keywordSnapshots(observations: KeywordObservation[]) {
  return groupBy(observations, o => JSON.stringify([o.source, o.sourceRunId, o.store, o.country, o.requestedLanguage, o.keyword])).map(rows => {
    const first = rows[0]!;
    const entries = groupBy(rows, o => o.idempotencyKey).map(same => same[0]!)
      .sort((a, b) => a.idempotencyKey.localeCompare(b.idempotencyKey));
    return {
      source: first.source, sourceRunId: first.sourceRunId, sourceBuild: first.sourceBuild, schemaVersion: first.schemaVersion,
      store: first.store, keyword: first.keyword, country: first.country, requestedLanguage: first.requestedLanguage,
      effectiveLanguage: first.language, relevantFilters: first.relevantFilters,
      observedAt: rows.map(o => o.checkedAt).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!,
      collectedAt: rows.map(o => o.collectedAt).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!,
      payloadHash: stableHash(entries.map(o => [o.idempotencyKey, o.payloadHash])),
      entries,
    };
  });
}

/** T7. Pass every valid keyword row of a run in one call; snapshots are written once. */
export async function persistKeywords(rpc: Rpc, rows: readonly unknown[], options: WriteOptions): Promise<WriteResult> {
  const snapshots = keywordSnapshots(parseRows(KeywordObservationSchema, rows));
  return writeRuns(rpc, "appradar_persist_keywords", "p_snapshots", snapshots, options);
}
