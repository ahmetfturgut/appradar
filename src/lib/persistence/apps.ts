import { ObservationSchema, type Observation } from "../../poc/normalize.ts";
import { stableHash } from "../../poc/plan.ts";
import type { Rpc, WriteOptions } from "./rpc.ts";
import { parseRows, writeRuns, type WriteResult } from "./shared.ts";

function appRow(o: Observation) {
  return {
    ...o,
    // Metric series stay per source and role; sources are never blended into one history.
    seriesKey: `${o.source}/${o.observationRole}/v2`,
    contentHash: stableHash([o.version, o.priceAmount, o.currency, o.isFree, o.ratingValue, o.ratingCount, o.reviewCount,
      o.installsText, o.installsLowerBound, o.releasedAt, o.listingUpdatedAt]),
  };
}

/** T4: developers, apps, listings and immutable snapshots. Requires an accepted provider run. */
export async function persistAppObservations(rpc: Rpc, observations: readonly unknown[], options: WriteOptions): Promise<WriteResult> {
  const rows = parseRows(ObservationSchema, observations).map(appRow);
  return writeRuns(rpc, "appradar_persist_app_observations", "p_observations", rows, options);
}
