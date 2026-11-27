// Manual retention cleanup. Nothing schedules this. Without --execute it only counts.
//   node --env-file=.env.local --import tsx src/lib/retention/cli.ts --policy <file>
//   ... --policy <file> --execute [--batch-size 100] [--max-batches 20]
// --execute also needs RETENTION_CLEANUP_EXECUTION=true and an "approval" block in the policy.
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { collectionTargetProblems, developmentCollectionRpc } from "../collection/target.ts";
import { supabaseRpc } from "../persistence/rpc.ts";
import { executionBlocks, parsePolicy } from "./policy.ts";
import { runCleanup } from "./run.ts";

async function main() {
  const { values } = parseArgs({ options: {
    policy: { type: "string" }, execute: { type: "boolean", default: false },
    "batch-size": { type: "string", default: "100" }, "max-batches": { type: "string", default: "20" },
  } });
  if (!values.policy) throw new Error("retention_policy_required");
  const text = await readFile(values.policy, "utf8").catch(() => { throw new Error("retention_policy_unreadable"); });
  const policy = parsePolicy(text);
  const env = process.env;
  // Refuse before a client exists, so a closed gate never reaches the database.
  const blocks = executionBlocks(env, policy);
  if (values.execute && blocks.length) throw new Error(`retention_execution_closed:${blocks.join(",")}`);
  if (!env.SUPABASE_URL?.trim() || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()) throw new Error("supabase_configuration_missing");
  // Deleting requires the declared development project; the read-only dry run is unchanged.
  const rpc = values.execute ? developmentCollectionRpc(env) : supabaseRpc({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY });
  const result = await runCleanup(rpc, {
    policy, env, execute: values.execute,
    batchSize: Number(values["batch-size"]), maxBatches: Number(values["max-batches"]),
  });
  return result.dryRun ? { ...result, closedTargetGates: collectionTargetProblems(env) } : result;
}

main().then(
  result => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.dryRun && !result.completed) process.exitCode = 1;
  },
  (error: unknown) => {
    // Only our own codes are printed; any other message could echo a URL, key or row value.
    const message = error instanceof Error ? error.message : "";
    console.error(/^[a-z0-9_]+(:[A-Za-z0-9_.,]+)?$/.test(message) ? message : "retention_failed");
    process.exitCode = 1;
  },
);
