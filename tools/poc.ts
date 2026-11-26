import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { createPlan, planSummary, stableHash } from "../src/poc/plan.js";
import { buildReport } from "../src/poc/report.js";
import { collectJob, requireLiveSettings } from "../src/poc/runner.js";

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const { values, positionals } = parseArgs({
    options: { round: { type: "string" }, job: { type: "string" }, "attach-run-id": { type: "string" }, "wait-seconds": { type: "string" } }, allowPositionals: true,
  });
  const command = positionals[0] ?? "plan";
  if (!["plan", "run", "resume", "report"].includes(command) || positionals.length > 1) throw new Error("usage: poc plan|run|resume|report [--round 1|2] [--job ID] [--attach-run-id ID]");
  if (values.round && !["1", "2"].includes(values.round)) throw new Error("round_must_be_1_or_2");
  const waitSeconds = Number(values["wait-seconds"] ?? "600");
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0 || waitSeconds > 1800) throw new Error("wait_seconds_must_be_0_to_1800");
  if (values["attach-run-id"] && (command !== "resume" || !values.job)) throw new Error("attach_requires_resume_and_job_id");
  const allJobs = createPlan();
  const journal = new PocJournal(resolve(".poc"));
  if (command === "plan") {
    const plan = { ...planSummary(allJobs), jobs: allJobs };
    await mkdir(journal.directory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(journal.directory, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify(planSummary(allJobs), null, 2));
    console.log("Ayrıntılar: .poc/plan.json. Ücretli istek yapılmadı.");
    return;
  }
  if (command === "report") {
    await journal.load();
    const report = buildReport(journal.state, allJobs);
    await mkdir(journal.directory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(journal.directory, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    console.log(`${report.decision}: ${report.completedJobs}/${report.plannedJobs} iş. Ayrıntılar: .poc/report.json`);
    return;
  }
  const settings = {
    token: process.env.APIFY_TOKEN ?? "", enabled: process.env.APIFY_COLLECTION_ENABLED === "true",
    dataUseConfirmed: process.env.POC_DATA_USE_CONFIRMED === "true", limitUsd: Number(process.env.POC_LIMIT_USD ?? ""),
  };
  // Resume reads existing runs even if paid collection has since been disabled.
  if (command === "run") requireLiveSettings(settings);
  else if (!settings.token.trim()) throw new Error("APIFY_TOKEN_required_for_resume");
  const selected = allJobs.filter(j => (!values.job || j.id === values.job) && (!values.round || String(j.round) === values.round));
  if (!selected.length) throw new Error("job_not_in_approved_plan");
  if (command === "run" && !values.job && !values.round) throw new Error("select_round_1_or_2_explicitly");
  const client = new ApifyClient(settings.token);
  const deadline = Date.now() + waitSeconds * 1000;
  await journal.exclusive(async () => {
    if (values["attach-run-id"]) {
      const job = selected[0];
      if (!job || selected.length !== 1) throw new Error("attach_one_job_only");
      const entry = journal.state.entries[job.id];
      if (!entry || entry.run || !["starting", "unknown"].includes(entry.status)) throw new Error("attach_only_to_unresolved_start");
      const run = await client.getRun(values["attach-run-id"], job);
      if (Object.values(journal.state.entries).some(e => e.run?.id === run.id)) throw new Error("run_already_attached");
      if (Date.parse(run.startedAt) < Date.parse(entry.startedAt) - 10000) throw new Error("run_predates_reserved_attempt");
      if (stableHash(await client.getInput(run)) !== stableHash(job.input)) throw new Error("run_input_mismatch");
      entry.run = run;
      entry.status = "running";
      entry.lastError = null;
      await journal.save();
    }
    for (const job of selected) {
      if (command === "resume" && !journal.state.entries[job.id]) continue;
      if (job.round === 2 && command === "run") {
        const firstRound = allJobs.filter(j => j.round === 1);
        if (firstRound.some(j => journal.state.entries[j.id]?.status !== "complete")) throw new Error("complete_first_round_before_second");
      }
      let entry = await collectJob(job, journal, client, { start: command === "run", limitUsd: settings.limitUsd });
      while (entry.status !== "complete" && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        entry = await collectJob(job, journal, client, { start: false, limitUsd: settings.limitUsd });
      }
      console.log(`${job.provider}/${job.store}/${job.country}/${job.mode}: ${entry.status}; job=${job.id}`);
      if (entry.status !== "complete") {
        console.log("Bekleme süresi doldu; checkpoint kaydedildi. Aynı komut güvenle sürdürülebilir.");
        process.exitCode = 2;
        break;
      }
      if (entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || Object.values(entry.results).some(r => r.kind === "invalid")) {
        throw new Error("poc_stopped_for_failed_or_invalid_result_review_report_before_next_job");
      }
      if (Date.now() >= deadline) break;
    }
  });
}

try { await main(); }
catch (error) {
  // All external request failures are converted to fixed codes before reaching here.
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "poc_validation_failed");
  process.exitCode = 1;
}
