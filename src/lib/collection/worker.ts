// Server-only worker. Invariants:
//  - the paid POST happens only after budget reservation and a committed one-time start ticket;
//  - a run that may exist is never started again;
//  - once a paid run succeeded, ingest problems resume that run and never requeue the job;
//  - only a confirmed zero, backed by an all-zero charge breakdown, is settled automatically;
//  - a missing amount and a positive reported amount stay reserved.
import { ApiError, isTerminal, type ApifyClient, type Run } from "../../poc/apify.ts";
import { Job, sources, stableHash } from "../../poc/plan.ts";
import { PersistenceError, type Rpc } from "../persistence/rpc.ts";
import { assessDataset, readDataset } from "./dataset.ts";
import { persistAssessment } from "./ingest.ts";
import type { Claim, CollectionStore, RunRow } from "./store.ts";

export type Apify = Pick<ApifyClient, "start" | "getRun" | "readPage">;

export interface WorkerDeps {
  store: CollectionStore;
  apify: Apify;
  rpc: Rpc;
  retentionDays: number;
  /** Missing limits fail closed before a new reservation. They are not required to resume a paid run. */
  budgetLimits?: { dailyUsd: number; monthlyUsd: number } | null;
  now?: () => Date;
  sleep?: (ms: number) => Promise<unknown>;
  options?: Partial<typeof defaults>;
}

export const defaults = {
  leaseSeconds: 300,
  pollMs: 5000,
  maxPolls: 48,
  deferSeconds: 60,
  /** Kept so older callers can still pass it. Elapsed time is not settlement evidence. */
  settleDelaySeconds: 120,
  maxJobAgeHours: 48,
  retryBackoffSeconds: 900,
};

export type Outcome =
  | { status: "idle" }
  | { status: "succeeded" | "partial" | "failed" | "retry_scheduled" | "deferred" | "start_unknown" | "lease_lost"; jobId: string; reason: string | null; externalRunId?: string };

function code(error: unknown): string {
  if (error instanceof PersistenceError || error instanceof ApiError) return error.code;
  return "unexpected_error";
}

const executionOf = (run: Run) => run.status === "SUCCEEDED" ? "succeeded" as const : run.status === "ABORTED" ? "aborted" as const : "failed" as const;

/** Confirmed zero is a finite 0 plus an explicit all-zero event breakdown. Null and a positive total are not. */
export function reportedCost(run: Pick<Run, "usageTotalUsd" | "chargedEventCounts">): { kind: "unknown" } | { kind: "confirmed"; usd: 0 } {
  if (run.usageTotalUsd !== 0 || !run.chargedEventCounts) return { kind: "unknown" };
  if (Object.values(run.chargedEventCounts).some(count => count !== 0)) return { kind: "unknown" };
  return { kind: "confirmed", usd: 0 };
}

/** Settles a confirmed zero only. Elapsed time and a positive reported amount are not evidence. */
async function trySettle(store: CollectionStore, runId: string, run: Run): Promise<boolean> {
  if (!isTerminal(run)) return false;
  const cost = reportedCost(run);
  if (cost.kind !== "confirmed") return false;
  await store.settle(runId, executionOf(run), cost.usd, run.chargedEventCounts ?? {});
  return true;
}

function configuredLimits(limits: WorkerDeps["budgetLimits"]): { dailyUsd: number; monthlyUsd: number } | null {
  if (!limits) return null;
  const usable = (amount: number) => Number.isFinite(amount) && amount >= 0;
  return usable(limits.dailyUsd) && usable(limits.monthlyUsd) ? limits : null;
}

export async function runNextJob(deps: WorkerDeps): Promise<Outcome> {
  const o = { ...defaults, ...deps.options };
  const claim = await deps.store.claim(o.leaseSeconds);
  if (!claim) return { status: "idle" };
  try {
    return await processClaim(deps, claim, o);
  } catch (error) {
    if (code(error) === "persistence_rejected_42501") return { status: "lease_lost", jobId: claim.job.id, reason: code(error) };
    // Unclassified failures never change job state here: the lease expires and the same attempt resumes.
    return { status: "deferred", jobId: claim.job.id, reason: code(error) };
  }
}

async function processClaim(deps: WorkerDeps, claim: Claim, o: typeof defaults): Promise<Outcome> {
  const { store, apify } = deps;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const jobId = claim.job.id;
  const stale = now().getTime() - Date.parse(claim.job.scheduledFor) > o.maxJobAgeHours * 3600000;

  const fail = async (reason: string, retryAt: Date | null = null): Promise<Outcome> => {
    const retried = await store.finish(claim, "failed", reason, retryAt?.toISOString() ?? null);
    return { status: retried ? "retry_scheduled" : "failed", jobId, reason };
  };
  const defer = async (reason: string, seconds = o.deferSeconds): Promise<Outcome> => {
    await store.renew(claim, seconds);
    return { status: "deferred", jobId, reason };
  };

  const parsed = Job.safeParse(claim.job.scope);
  if (!parsed.success || parsed.data.provider !== claim.job.provider || parsed.data.mode !== claim.job.mode) return fail("invalid_job_scope");
  const job = parsed.data;
  const source = sources[job.provider];
  const inputHash = stableHash(job.input);

  let run: RunRow = claim.run ?? await store.createRun(claim, {
    actorId: source.actorId, actorBuildId: source.buildId, inputHash, input: job.input, estimatedCost: job.maxChargeUsd,
  });
  let started: Run | null = null;

  if (!run.externalRunId) {
    if (run.startRequested) {
      // A previous worker may have created a paid run. Keep the reservation and block the target.
      await store.markStartUnknown(run.id);
      await store.finish(claim, "failed", "start_result_unknown");
      return { status: "start_unknown", jobId, reason: "start_result_unknown" };
    }
    if (run.executionStatus !== "pending") return fail("run_closed_before_start");
    const outdated = run.actorBuildId !== source.buildId || run.inputHash !== inputHash;
    if (stale || outdated) {
      if (run.costStatus === "reserved") await store.release(claim, run.id);
      await store.updateRun(claim, run.id, { executionStatus: "aborted", validationStatus: "rejected", error: "not_started" });
      return fail(outdated ? "provider_contract_changed" : "job_expired");
    }
    if (run.costStatus !== "reserved") {
      const limits = configuredLimits(deps.budgetLimits);
      if (!limits) {
        await store.updateRun(claim, run.id, { executionStatus: "aborted", validationStatus: "rejected", error: "budget_not_configured" });
        return fail("budget_not_configured");
      }
      try {
        await store.ensureBudgets(limits.dailyUsd, limits.monthlyUsd);
      } catch (error) {
        if (code(error) === "persistence_rejected_P0004") {
          await store.updateRun(claim, run.id, { executionStatus: "aborted", validationStatus: "rejected", error: "budget_not_configured" });
          return fail("budget_not_configured");
        }
        throw error;
      }
    }
    try {
      await store.reserve(claim, run.id, job.maxChargeUsd);
    } catch (error) {
      const rejection = code(error);
      const reason = rejection === "persistence_rejected_P0004" ? "budget_not_configured"
        : rejection === "persistence_rejected_P0001" ? "daily_budget_exceeded"
        : rejection === "persistence_rejected_P0002" ? "monthly_budget_exceeded" : null;
      if (!reason) throw error;
      await store.updateRun(claim, run.id, { executionStatus: "aborted", validationStatus: "rejected", error: reason });
      const t = now();
      // A monthly or missing budget needs an operator; only the daily limit resets soon enough to wait for.
      const retryAt = reason === "daily_budget_exceeded" ? new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1)) : null;
      return fail(reason, retryAt);
    }
    await store.renew(claim, o.leaseSeconds);
    if (!await store.beginStart(claim, run.id)) return defer("start_ticket_unavailable");
    try {
      started = await apify.start(job);
    } catch (error) {
      // Includes HTTP errors and contract mismatches: none of them proves that no run was created.
      const reason = `start_result_unknown:${code(error)}`;
      await store.markStartUnknown(run.id);
      await store.finish(claim, "failed", reason);
      return { status: "start_unknown", jobId, reason };
    }
    let recorded = false;
    for (let attempt = 0; attempt < 3 && !recorded; attempt++) {
      try { recorded = await store.recordExternal(run.id, started.id, started.defaultDatasetId); }
      catch { await sleep(1000 * (attempt + 1)); }
    }
    // The id is surfaced so an operator can reconcile it; the next claim will mark the start unknown.
    if (!recorded) return { status: "start_unknown", jobId, reason: "external_run_id_not_recorded", externalRunId: started.id };
    run = { ...run, externalRunId: started.id, datasetId: started.defaultDatasetId, executionStatus: "running", costStatus: "reserved" };
  }

  const externalRunId = run.externalRunId!;
  let current = started ?? await apify.getRun(externalRunId, job);
  for (let poll = 0; !isTerminal(current) && poll < o.maxPolls; poll++) {
    await sleep(o.pollMs);
    await store.renew(claim, o.leaseSeconds);
    current = await apify.getRun(externalRunId, job);
  }
  if (!isTerminal(current)) return defer("provider_run_still_running");

  const execution = executionOf(current);
  await store.updateRun(claim, run.id, {
    executionStatus: execution, datasetId: current.defaultDatasetId,
    ...(current.finishedAt ? { finishedAt: current.finishedAt } : {}),
  });
  if (run.costStatus === "reserved") await trySettle(store, run.id, current);

  if (execution !== "succeeded") {
    await store.updateRun(claim, run.id, { validationStatus: "rejected", error: `actor_${current.status}` });
    // Only provider-side failures are retried, with a new reservation. An abort is an operator decision.
    const retryAt = execution === "failed" ? new Date(now().getTime() + o.retryBackoffSeconds * 1000 * claim.job.attempt) : null;
    return fail(`actor_${current.status}`, retryAt);
  }

  // From here on the run is paid for: no path may requeue the job.
  await store.markIngesting(claim);
  const collectedAt = current.finishedAt ?? current.startedAt;
  try {
    const { rows, truncated } = await readDataset(
      (id, offset, limit) => apify.readPage(id, offset, limit), current.defaultDatasetId,
      async offset => { await store.renew(claim, o.leaseSeconds); await store.updateRun(claim, run.id, { pageOffset: offset }); },
    );
    const usage = current.usageTotalUsd;
    const assessment = assessDataset(job, externalRunId, collectedAt, rows, truncated, {
      chargeCapReached: usage != null && usage >= job.maxChargeUsd,
      usageConfirmedBelowCap: usage != null && usage < job.maxChargeUsd,
    });
    await store.updateRun(claim, run.id, {
      validationStatus: assessment.verdict, truncated, receivedCount: assessment.counts.received,
      validCount: assessment.counts.valid, invalidCount: assessment.counts.invalid,
      ...(assessment.counts.expected == null ? {} : { expectedCount: assessment.counts.expected }),
      ...(assessment.reason ? { error: assessment.reason } : {}),
    });
    if (assessment.verdict === "rejected") return fail(assessment.reason ?? "dataset_rejected");
    await store.renew(claim, o.leaseSeconds);
    const { conflicts } = await persistAssessment(deps.rpc, assessment, collectedAt, deps.retentionDays);
    const status = assessment.complete && conflicts === 0 ? "succeeded" : "partial";
    const reason = assessment.reason ?? (conflicts ? "persistence_conflicts" : null);
    await store.finish(claim, status, reason);
    return { status, jobId, reason };
  } catch (error) {
    const reason = code(error);
    if (reason === "persistence_rejected_42501") throw error;
    if (stale) return fail(`ingest_abandoned:${reason}`);
    return defer(`ingest_failed:${reason}`, 900);
  }
}

/** Free reads only. Settles a confirmed zero. A positive or missing amount stays reserved for manual reconciliation. */
export async function reconcileCosts(deps: Pick<WorkerDeps, "store" | "apify">, limit = 20) {
  const pending = await deps.store.unsettled(limit);
  let settled = 0;
  for (const item of pending) {
    const job = Job.safeParse(item.scope);
    if (!job.success) continue;
    try {
      const run = await deps.apify.getRun(item.externalRunId, job.data);
      if (await trySettle(deps.store, item.runId, run)) settled++;
    } catch { /* stays reserved; picked up next time */ }
  }
  return { checked: pending.length, settled, stillReserved: pending.length - settled };
}
