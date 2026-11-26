import { z } from "zod";
import { PersistenceError, type Rpc, type WriteOptions } from "./rpc.ts";

const Counts = z.object({
  inserted: z.number().int(), duplicates: z.number().int(), conflicts: z.number().int(),
  unchanged: z.number().int().default(0),
});
export type WriteResult = z.infer<typeof Counts>;

export function groupBy<T>(rows: T[], key: (row: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const group = groups.get(k);
    if (group) group.push(row);
    else groups.set(k, [row]);
  }
  return [...groups.values()];
}

/** Validates the v2 contract, then writes one atomic batch per provider run. */
export function parseRows<T>(schema: z.ZodType<T>, rows: readonly unknown[]): T[] {
  return rows.map(row => {
    const parsed = schema.safeParse(row);
    // Legacy v1 and malformed rows are refused, never upgraded by guessing.
    if (!parsed.success) throw new PersistenceError("observation_contract_invalid");
    return parsed.data;
  });
}

export async function writeRuns<T extends { source: string; sourceRunId: string }>(
  rpc: Rpc, fn: string, argument: string, rows: T[], options: WriteOptions,
): Promise<WriteResult> {
  if (!z.iso.datetime({ offset: true }).safeParse(options.expiresAt).success) throw new PersistenceError("expires_at_required");
  const total: WriteResult = { inserted: 0, duplicates: 0, conflicts: 0, unchanged: 0 };
  for (const run of groupBy(rows, row => JSON.stringify([row.source, row.sourceRunId]))) {
    const result = Counts.parse(await rpc(fn, {
      p_provider: run[0]!.source, p_external_run_id: run[0]!.sourceRunId, [argument]: run, p_expires_at: options.expiresAt,
    }));
    total.inserted += result.inserted;
    total.duplicates += result.duplicates;
    total.conflicts += result.conflicts;
    total.unchanged += result.unchanged;
  }
  return total;
}
