import { ObservationSchema, type Observation } from "../../poc/normalize.ts";
import { stableHash } from "../../poc/plan.ts";
import type { Rpc, WriteOptions } from "./rpc.ts";
import { groupBy, parseRows, writeRuns, type WriteResult } from "./shared.ts";

const newAppCharts = new Set(["newApps", "newFreeApps", "newPaidApps"]);

function kindOf(o: Observation) {
  if (o.collectionContext.mode === "search") return "search";
  if (o.collectionContext.mode === "developers") return "developer";
  return newAppCharts.has(o.collectionContext.context) ? "new_apps" : "chart";
}

export function discoverySnapshots(observations: Observation[]) {
  const lists = observations.filter(o => ["search", "charts", "developers"].includes(o.collectionContext.mode));
  return groupBy(lists, o => JSON.stringify([o.source, o.sourceRunId, o.store, o.country, o.requestedLanguage, o.collectionContext])).map(rows => {
    const first = rows[0]!;
    // One entry per app; a repeated row keeps its best position.
    const entries = groupBy(rows, o => o.storeAppId).map(same => {
      const best = [...same].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0]!;
      return { storeAppId: best.storeAppId, position: best.rank, observationKey: best.idempotencyKey, payloadHash: best.payloadHash };
    }).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.storeAppId.localeCompare(b.storeAppId));
    const languages = new Set(rows.map(o => o.language));
    return {
      kind: kindOf(first), mode: first.collectionContext.mode, source: first.source, sourceRunId: first.sourceRunId,
      sourceBuild: first.sourceBuild, store: first.store, country: first.country, requestedLanguage: first.requestedLanguage,
      effectiveLanguage: languages.size === 1 ? first.language : null,
      context: first.collectionContext.context, category: first.collectionContext.category,
      observedAt: rows.map(o => o.observedAt).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!,
      observedTimeBasis: rows.every(o => o.observedTimeBasis === "source") ? "source" : "collection",
      collectedAt: rows.map(o => o.collectedAt).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!,
      // Collection time is excluded so that re-reading the same dataset is a duplicate.
      payloadHash: stableHash(entries.map(e => [e.storeAppId, e.position, e.payloadHash])),
      entries,
    };
  });
}

/**
 * T5. Pass every valid observation of a run in one call: a snapshot is written once and never amended.
 * Detail observations are ignored. A run with no valid rows writes nothing.
 */
export async function persistDiscovery(rpc: Rpc, observations: readonly unknown[], options: WriteOptions): Promise<WriteResult> {
  const snapshots = discoverySnapshots(parseRows(ObservationSchema, observations));
  return writeRuns(rpc, "appradar_persist_discovery", "p_snapshots", snapshots, options);
}
