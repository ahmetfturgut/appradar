import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { createPlan } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";
import { assertDevelopmentEnvironment } from "../src/lib/collection/target.js";

// Fixed local-research subset explicitly requested by the user. No full POC,
// automatic refresh, reviews, images, descriptions, publishing or commercial-rights attestation.
async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:fetch [--execute]");
  const jobs = createPlan().filter(j => j.provider === "aurelix" && j.mode === "details" && j.round === 1);
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", jobs: jobs.length, expectedObservations: 40, maxReservedUsd: 0.2, scope: "private-local-research", note: "Gerçek çekim için --execute; sayfa açmak veri çekmez." }));
    return;
  }
  // Paid path: refused unless this shell is the declared development project.
  assertDevelopmentEnvironment(process.env);
  const token = process.env.APIFY_TOKEN?.trim() ?? "";
  if (!token) throw new Error("APIFY_TOKEN_missing");
  const limitUsd = Number(process.env.POC_LIMIT_USD);
  if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5) throw new Error("approved_POC_LIMIT_USD_required_max_5");
  const journal = new PocJournal(resolve(".poc"));
  const client = new ApifyClient(token);
  await mkdir(journal.directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(journal.directory, "local-scope.json"), JSON.stringify({
    recordedAt: new Date().toISOString(), requestedOn: "2026-11-26", scope: "private-local-research", provider: "aurelix", jobIds: jobs.map(j => j.id),
    maxReservedUsd: 0.2, retentionDays: 7, commercialRightsVerified: false,
    userRequest: "gerçek verileri kullanabilir miyiz? apify'den çekebilir miyiz?",
    reviewedSource: "https://apify.com/aurelix/app-store-google-play-scraper",
    fields: "public app identity, developer, category, version, price, ratings and store link; no reviews, descriptions or images",
  }, null, 2) + "\n", { mode: 0o600 });
  await journal.exclusive(async () => {
    for (const job of jobs) {
      let entry = await collectJob(job, journal, client, { start: true, limitUsd });
      const deadline = Date.now() + 240000;
      while (entry.status !== "complete" && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        entry = await collectJob(job, journal, client, { start: false, limitUsd });
      }
      const results = Object.values(entry.results);
      console.log(JSON.stringify({ country: job.country, store: job.store, jobId: job.id, runId: entry.run?.id ?? null, status: entry.status, actorStatus: entry.run?.status ?? null, valid: results.filter(r => r.kind === "valid").length, invalid: results.filter(r => r.kind === "invalid").length, sourceErrors: results.filter(r => r.kind === "source_error").length, observedUsageUsd: entry.run?.usageTotalUsd ?? null }));
      if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid")) throw new Error("local_collection_needs_review_no_automatic_restart");
    }
  });
}
try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "local_collection_validation_failed");
  process.exitCode = 1;
}
