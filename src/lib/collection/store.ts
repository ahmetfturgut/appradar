// Server-only. Typed access to the collection wrappers in migration 20261126000700.
import { z } from "zod";
import type { Rpc } from "../persistence/rpc.ts";

const RunRow = z.object({
  id: z.uuid(), attempt: z.number().int(), actorBuildId: z.string(), inputHash: z.string(),
  externalRunId: z.string().nullable(), datasetId: z.string().nullable(),
  executionStatus: z.enum(["pending", "unknown", "running", "succeeded", "failed", "aborted"]),
  validationStatus: z.enum(["pending", "accepted", "rejected", "truncated"]),
  costStatus: z.enum(["unset", "reserved", "unknown", "settled", "released"]),
  startRequested: z.boolean(),
});
export type RunRow = z.infer<typeof RunRow>;

const Claim = z.object({
  leaseToken: z.uuid(),
  run: RunRow.nullable(),
  job: z.object({
    id: z.uuid(), provider: z.string(), mode: z.string(), scope: z.unknown(),
    attempt: z.number().int(), maxAttempts: z.number().int(), scheduledFor: z.string(),
  }),
});
export type Claim = z.infer<typeof Claim>;

const Enqueued = z.object({ jobId: z.uuid(), created: z.boolean(), reason: z.string().nullable() });
const Unsettled = z.array(z.object({ runId: z.uuid(), externalRunId: z.string(), scope: z.unknown() }));

export type ExecutionStatus = "running" | "succeeded" | "failed" | "aborted";
export interface RunPatch {
  executionStatus?: ExecutionStatus;
  validationStatus?: "accepted" | "rejected" | "truncated";
  datasetId?: string;
  finishedAt?: string;
  pageOffset?: number;
  expectedCount?: number;
  receivedCount?: number;
  validCount?: number;
  invalidCount?: number;
  truncated?: boolean;
  error?: string;
}

export function collectionStore(rpc: Rpc) {
  const flag = async (name: string, args: Record<string, unknown>) => z.boolean().parse(await rpc(name, args));
  const lease = (c: Claim) => ({ p_job_id: c.job.id, p_lease_token: c.leaseToken });
  return {
    enqueue: async (job: { provider: string; mode: string; scope: unknown; dedupeKey: string; scheduledFor: string; maxAttempts: number }) =>
      Enqueued.parse(await rpc("appradar_collection_enqueue", {
        p_provider: job.provider, p_mode: job.mode, p_scope: job.scope, p_dedupe_key: job.dedupeKey,
        p_scheduled_for: job.scheduledFor, p_max_attempts: job.maxAttempts,
      })),
    claim: async (leaseSeconds: number) =>
      Claim.nullable().parse(await rpc("appradar_collection_claim", { p_lease_seconds: leaseSeconds })),
    renew: (c: Claim, seconds: number) => flag("appradar_collection_renew", { ...lease(c), p_lease_seconds: seconds }),
    markIngesting: (c: Claim) => flag("appradar_collection_ingesting", lease(c)),
    /** Returns true when the failed job was requeued for another attempt. */
    finish: (c: Claim, status: "succeeded" | "partial" | "failed", error: string | null, retryAt: string | null = null) =>
      flag("appradar_collection_finish", { ...lease(c), p_status: status, p_error: error, p_retry_at: retryAt }),
    createRun: async (c: Claim, run: { actorId: string; actorBuildId: string; inputHash: string; input: unknown; estimatedCost: number }) =>
      RunRow.parse(await rpc("appradar_collection_create_run", { ...lease(c), p_run: run })),
    reserve: (c: Claim, runId: string, amount: number) => flag("appradar_collection_reserve", { ...lease(c), p_run_id: runId, p_amount: amount }),
    beginStart: (c: Claim, runId: string) => flag("appradar_collection_begin_start", { ...lease(c), p_run_id: runId }),
    recordExternal: (runId: string, externalRunId: string, datasetId: string) =>
      flag("appradar_collection_record_external", { p_run_id: runId, p_external_run_id: externalRunId, p_dataset_id: datasetId }),
    markStartUnknown: (runId: string) => flag("appradar_collection_start_unknown", { p_run_id: runId }),
    updateRun: (c: Claim, runId: string, patch: RunPatch) => flag("appradar_collection_update_run", { ...lease(c), p_run_id: runId, p_patch: patch }),
    release: (c: Claim, runId: string) => flag("appradar_collection_release", { ...lease(c), p_run_id: runId }),
    settle: (runId: string, status: "succeeded" | "failed" | "aborted", actualUsd: number, chargedEvents: Record<string, number>) =>
      flag("appradar_collection_settle", { p_run_id: runId, p_execution_status: status, p_actual: actualUsd, p_charged_events: chargedEvents }),
    unsettled: async (limit: number) => Unsettled.parse(await rpc("appradar_collection_unsettled", { p_limit: limit })),
    ensureBudgets: async (dailyUsd: number, monthlyUsd: number) => z.object({
      dailyId: z.uuid(), monthlyId: z.uuid(), createdDaily: z.boolean(), createdMonthly: z.boolean(),
    }).parse(await rpc("appradar_collection_ensure_budgets", { p_daily: dailyUsd, p_monthly: monthlyUsd })),
    /** Does not start an actor. confirm_absent is the only decision that releases a reservation. */
    reconcile: async (
      runId: string, decision: "confirm_absent" | "attach_run" | "confirm_cost", evidence: string,
      extra: { externalRunId?: string | null; actualUsd?: number | null } = {},
    ) => z.object({
      decision: z.string(), released: z.boolean(), retried: z.literal(false), settled: z.number().optional(),
    }).parse(await rpc("appradar_collection_reconcile", {
      p_run_id: runId, p_decision: decision, p_evidence: evidence,
      p_external_run_id: extra.externalRunId ?? null, p_actual: extra.actualUsd ?? null,
    })),
  };
}
export type CollectionStore = ReturnType<typeof collectionStore>;
