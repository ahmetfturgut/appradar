// Server-only. Drives the retention functions of migration 20261126001200 in bounded batches.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PersistenceError, type Rpc } from "../persistence/rpc.ts";
import { executionBlocks, type RetentionPolicy } from "./policy.ts";

/** Deletion order: referencing rows always go before the rows they reference. */
export const RETENTION_STEPS = [
  { step: "review_observations", table: "public.review_observations", category: "reviews", action: "delete" },
  { step: "reviews", table: "public.reviews", category: "reviews", action: "delete" },
  { step: "keyword_snapshots", table: "public.keyword_snapshots (+keyword_entries)", category: "keyword_history", action: "delete" },
  { step: "discovery_snapshots", table: "public.discovery_snapshots (+discovery_entries)", category: "discovery_history", action: "delete" },
  { step: "app_snapshots", table: "public.app_snapshots", category: "app_snapshots", action: "delete" },
  { step: "listing_metrics", table: "public.app_listings", category: "listing_current", action: "clear_old_metrics" },
  { step: "listing_content", table: "public.app_listings", category: "listing_current", action: "clear_kept_row" },
  { step: "listings", table: "public.app_listings", category: "listing_current", action: "delete" },
  { step: "provider_runs", table: "private.provider_runs", category: "provider_runs", action: "delete" },
  { step: "collection_jobs", table: "private.collection_jobs", category: "collection_jobs", action: "delete" },
  { step: "budget_periods", table: "private.budget_periods", category: "budget_records", action: "delete" },
] as const;
export type RetentionStep = (typeof RETENTION_STEPS)[number]["step"];

const Count = z.number().int().min(0);
const Report = z.object({ eligible: z.record(z.string(), Count), preserved: z.record(z.string(), Count) });
const Batch = z.object({ affected: Count, cascaded: Count });

export interface CleanupOptions {
  policy: RetentionPolicy;
  env: Record<string, string | undefined>;
  execute: boolean;
  batchSize?: number;
  maxBatches?: number;
}

async function report(rpc: Rpc, policy: RetentionPolicy) {
  const result = Report.parse(await rpc("appradar_retention_report", { p_policy: policy }));
  return {
    tables: RETENTION_STEPS.map(entry => {
      const eligible = result.eligible[entry.step];
      if (eligible == null) throw new Error("retention_report_incomplete");
      return { ...entry, eligible };
    }),
    preserved: result.preserved,
  };
}

export async function runCleanup(rpc: Rpc, options: CleanupOptions) {
  const { policy, env, execute, batchSize = 100, maxBatches = 20 } = options;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error("batch_size_must_be_1_to_500");
  if (!Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 1000) throw new Error("max_batches_must_be_1_to_1000");
  const blocks = executionBlocks(env, policy);
  if (execute && blocks.length) throw new Error(`retention_execution_closed:${blocks.join(",")}`);
  if (!execute) return { dryRun: true as const, approved: policy.approval != null, closedGates: blocks, ...await report(rpc, policy) };

  const holder = randomUUID();
  const done: { step: RetentionStep; table: string; category: string; action: string; affected: number; cascaded: number; batches: number }[] = [];
  let failure: { step: RetentionStep; error: string } | null = null;
  try {
    for (const entry of RETENTION_STEPS) {
      const total = { ...entry, affected: 0, cascaded: 0, batches: 0 };
      done.push(total);
      try {
        // Every call commits on its own; a repeated or interrupted run simply continues.
        while (total.batches < maxBatches) {
          const batch = Batch.parse(await rpc("appradar_retention_batch",
            { p_policy: policy, p_step: entry.step, p_holder: holder, p_limit: batchSize }));
          total.batches++;
          total.affected += batch.affected;
          total.cascaded += batch.cascaded;
          if (batch.affected < batchSize) break;
        }
      } catch (error) {
        const code = error instanceof PersistenceError ? error.code : "retention_batch_failed";
        failure = { step: entry.step, error: code === "persistence_rejected_P0007" ? "retention_cleanup_locked" : code };
        break;
      }
    }
  } finally {
    // Releases only our own lease. If this fails the lease expires by itself after five minutes.
    await rpc("appradar_retention_release", { p_holder: holder }).catch(() => undefined);
  }
  if (failure) return { dryRun: false as const, completed: false, failure, tables: done };
  const after = await report(rpc, policy);
  return {
    dryRun: false as const, completed: true, tables: done,
    stillEligible: Object.fromEntries(after.tables.filter(t => t.eligible > 0).map(t => [t.step, t.eligible])),
    preserved: after.preserved,
  };
}
