import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";

// DataTrail iOS new-free-apps validation. Caps: $0.05/run, $0.10 total.
// Live validation already completed for US Productivity (6007); reuse unless forced.
const VALIDATION_CEILING_USD = 0.10;
const FIXTURE = "tests/fixtures/datatrail-ios-new-free-apps-6007.json";
const SCOPE = "datatrail-new-apps-scope.json";

function chartJob(): Job {
  const values = {
    provider: "datatrail" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "charts" as const, context: "newFreeApps", expectedIds: [] as string[], maxResults: 24,
    maxChargeUsd: 0.05 as const,
    input: {
      appleCharts: ["new-free-apps"], appleGenres: ["6007"], chartLimit: 10, trackRankChanges: false,
      countries: ["us"], language: "en", includeDescription: false, proxyConfiguration: { useApifyProxy: true },
    },
  };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:datatrail-new-apps [--execute]");
  const job = chartJob();
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", provider: "datatrail", jobs: [{ id: job.id, store: job.store, mode: job.mode, context: job.context, appleCharts: job.input.appleCharts, chartLimit: job.input.chartLimit }], maxReservedUsd: VALIDATION_CEILING_USD, note: "Gerçek çekim için --execute; başarılı canlı koşu fixture ile yeniden kullanılabilir." }));
    return;
  }
  const journal = new PocJournal(resolve(".poc"));
  await mkdir(journal.directory, { recursive: true, mode: 0o700 });
  const scopePath = resolve(journal.directory, SCOPE);
  if (existsSync(scopePath) && existsSync(FIXTURE)) {
    const scope = JSON.parse(await readFile(scopePath, "utf8")) as { completedRunId?: string; observedUsageUsd?: number };
    const fixture = JSON.parse(await readFile(FIXTURE, "utf8")) as { redactedRows: unknown[]; run: { usageTotalUsd?: number } };
    console.log(JSON.stringify({
      provider: "datatrail", reused: true, jobId: job.id, completedRunId: scope.completedRunId ?? null,
      apps: fixture.redactedRows.length, observedUsageUsd: scope.observedUsageUsd ?? fixture.run.usageTotalUsd ?? null,
      note: "Prior successful live validation reused; no new paid run.",
    }, null, 2));
    return;
  }
  const token = process.env.APIFY_TOKEN?.trim() ?? "";
  if (!token) throw new Error("APIFY_TOKEN_missing");
  const limitUsd = Number(process.env.POC_LIMIT_USD);
  if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5) throw new Error("approved_POC_LIMIT_USD_required_max_5");
  const client = new ApifyClient(token);
  const fixtureDir = resolve("tests/fixtures");
  await mkdir(fixtureDir, { recursive: true, mode: 0o700 });
  let spentUsd = 0;
  await journal.exclusive(async () => {
    if (spentUsd >= VALIDATION_CEILING_USD - 1e-9) throw new Error("datatrail_new_apps_validation_budget_exhausted");
    let entry = await collectJob(job, journal, client, { start: true, limitUsd });
    const deadline = Date.now() + 240000;
    while (entry.status !== "complete" && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      entry = await collectJob(job, journal, client, { start: false, limitUsd });
    }
    for (let i = 0; i < 5 && entry.run && (entry.run.usageTotalUsd == null || entry.run.usageTotalUsd === 0); i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      entry.run = await client.getRun(entry.run.id, job);
      await journal.save();
    }
    const results = Object.values(entry.results);
    const valid = results.filter(r => r.kind === "valid");
    spentUsd += entry.run?.usageTotalUsd ?? 0;
    const dates = valid.flatMap(r => r.kind === "valid" && r.observation.releasedAt ? [r.observation.releasedAt] : []).sort();
    await writeFile(resolve(FIXTURE), `${JSON.stringify({
      job: { id: job.id, provider: job.provider, store: job.store, country: job.country, mode: job.mode, context: job.context, input: job.input },
      run: entry.run ? { id: entry.run.id, status: entry.run.status, buildNumber: entry.run.buildNumber, usageTotalUsd: entry.run.usageTotalUsd, chargedEventCounts: entry.run.chargedEventCounts } : null,
      stats: { appCount: valid.length, chart: "new-free-apps", chartGenre: "6007", releaseDateMin: dates[0] ?? null, releaseDateMax: dates.at(-1) ?? null },
      redactedRows: results.map(r => {
        if (r.kind !== "valid") return r;
        return { kind: "valid", observation: { store: r.observation.store, storeAppId: r.observation.storeAppId, name: r.observation.name, country: r.observation.country, category: r.observation.category, observationRole: r.observation.observationRole, rank: r.observation.rank, rankContext: r.observation.rankContext, rankCategory: r.observation.rankCategory, releasedAt: r.observation.releasedAt, listingUpdatedAt: r.observation.listingUpdatedAt, source: r.observation.source, idempotencyKey: r.observation.idempotencyKey } };
      }),
      redactedSamples: entry.redactedSamples,
    }, null, 2)}\n`, { mode: 0o600 });
    await writeFile(scopePath, `${JSON.stringify({
      recordedAt: new Date().toISOString(), scope: "datatrail-new-apps-validation", provider: "datatrail",
      jobIds: [job.id], completedRunId: entry.run?.id ?? null, maxReservedUsd: VALIDATION_CEILING_USD,
      observedUsageUsd: entry.run?.usageTotalUsd ?? null, retentionDays: 7,
      reviewedSource: "https://apify.com/datatrail/app-store-google-play-charts",
    }, null, 2)}\n`, { mode: 0o600 });
    if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid") || valid.length === 0) {
      throw new Error("datatrail_new_apps_validation_failed");
    }
    if (spentUsd > VALIDATION_CEILING_USD + 1e-9) throw new Error("datatrail_new_apps_validation_budget_exceeded");
    console.log(JSON.stringify({ provider: "datatrail", reused: false, spentUsd, apps: valid.length, runId: entry.run?.id ?? null }, null, 2));
  });
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "datatrail_new_apps_collection_validation_failed");
  process.exitCode = 1;
}
