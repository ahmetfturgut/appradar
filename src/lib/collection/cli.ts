// Manual entry points. Without a command, or without --execute, nothing is written and no actor is started.
//   node --import tsx src/lib/collection/cli.ts plan      [--config f] [--provider p] [--mode m]
//   ... enqueue --provider p --mode m [--new-window] --execute   queue jobs (database only, free)
//   ... schedule --execute                                       queue due jobs if schedulingEnabled
//   ... work [--max-jobs 1] --execute                            PAID: run the oldest due jobs
//   ... reconcile --execute                                      settle a confirmed zero only (free reads)
//   ... resolve --run id --decision confirm_absent|attach_run|confirm_cost --evidence text [--actual n] [--external-run id] --execute
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ApifyClient } from "../../poc/apify.ts";
import { supabaseRpc } from "../persistence/rpc.ts";
import { closedGates, CollectionConfig, configuredBudgetLimits } from "./config.ts";
import { enqueue, planJobs, scheduleDue } from "./jobs.ts";
import { collectionStore } from "./store.ts";
import { reconcileCosts, runNextJob } from "./worker.ts";

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    config: { type: "string", default: "src/lib/collection/config.example.json" },
    provider: { type: "string" }, mode: { type: "string" }, "max-jobs": { type: "string", default: "1" },
    "new-window": { type: "boolean", default: false }, execute: { type: "boolean", default: false },
    run: { type: "string" }, decision: { type: "string" }, evidence: { type: "string" },
    actual: { type: "string" }, "external-run": { type: "string" },
  } });
  const command = positionals[0] ?? "plan";
  if (!["plan", "enqueue", "schedule", "work", "reconcile", "resolve"].includes(command)) throw new Error("unknown_command");
  const config = CollectionConfig.parse(JSON.parse(await readFile(values.config, "utf8")));
  const selection = {
    ...(values.provider ? { provider: values.provider } : {}), ...(values.mode ? { mode: values.mode } : {}),
    newWindow: values["new-window"],
  };
  const env = process.env;

  if (command === "plan" || !values.execute) {
    const planned = planJobs(config, new Date(), { ...selection, onlyEnabled: command === "schedule" });
    return {
      dryRun: true, command, schedulingEnabled: config.schedulingEnabled, closedGates: closedGates(env, config),
      reservationCeilingUsd: Number(planned.reduce((n, p) => n + p.job.maxChargeUsd, 0).toFixed(2)),
      jobs: planned.map(p => ({ provider: p.job.provider, mode: p.job.mode, store: p.job.store, country: p.job.country,
        context: p.job.context, scheduledFor: p.scheduledFor, dedupeKey: p.dedupeKey, input: p.job.input })),
    };
  }

  const rpc = supabaseRpc({ url: env.SUPABASE_URL ?? "", serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "" });
  const store = collectionStore(rpc);
  if (command === "resolve") {
    const decision = values.decision;
    if (!values.run || (decision !== "confirm_absent" && decision !== "attach_run" && decision !== "confirm_cost") || !values.evidence) {
      throw new Error("resolve_requires_run_decision_evidence");
    }
    const actual = values.actual == null ? null : Number(values.actual);
    if (decision === "confirm_cost" && (actual == null || !Number.isFinite(actual) || actual < 0)) throw new Error("resolve_requires_actual_cost");
    return store.reconcile(values.run, decision, values.evidence, {
      externalRunId: values["external-run"] ?? null, actualUsd: actual,
    });
  }
  if (command === "enqueue") {
    if (!values.provider || !values.mode) throw new Error("enqueue_requires_provider_and_mode");
    return enqueue(store, planJobs(config, new Date(), selection));
  }
  if (command === "schedule") return scheduleDue(store, config, new Date());
  if (command === "reconcile") return reconcileCosts({ store, apify: new ApifyClient(env.APIFY_TOKEN ?? "") });

  const closed = closedGates(env, config);
  if (closed.length) throw new Error(`paid_execution_closed:${closed.join(",")}`);
  const maxJobs = Number(values["max-jobs"]);
  if (!Number.isInteger(maxJobs) || maxJobs < 1 || maxJobs > 20) throw new Error("max_jobs_must_be_1_to_20");
  const apify = new ApifyClient(env.APIFY_TOKEN!);
  const outcomes = [];
  // Sequential on purpose: one paid run at a time.
  for (let i = 0; i < maxJobs; i++) {
    const outcome = await runNextJob({
      store, apify, rpc, retentionDays: config.retentionDays!, budgetLimits: configuredBudgetLimits(env),
    });
    outcomes.push(outcome);
    if (outcome.status === "idle" || outcome.status === "start_unknown") break;
  }
  return { outcomes, reconcile: await reconcileCosts({ store, apify }) };
}

main().then(
  result => console.log(JSON.stringify(result, null, 2)),
  (error: unknown) => { console.error(error instanceof Error ? error.message : "collection_failed"); process.exitCode = 1; },
);
