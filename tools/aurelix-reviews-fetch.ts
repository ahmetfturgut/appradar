import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";

// Aurelix reviews validation. Caps: $0.05/run, $0.10 total.
// App ids from prior Aurelix detail runs (ChatGPT / OpenAI).
// Note: Apple's public review feed often returns 0 rows (actor status Partial);
// Play public page reviews have been validated live for this app.
const VALIDATION_CEILING_USD = 0.10;
const APPS = {
  ios: "6448311069",
  play: "com.openai.chatgpt",
} as const;

function reviewJobs(): Job[] {
  const jobs: Job[] = [];
  const add = (store: "ios" | "play") => {
    const appId = APPS[store];
    const values = {
      provider: "aurelix" as const, store, country: "US" as const, requestedLanguage: "en",
      round: 1 as const, mode: "reviews" as const, context: appId, expectedIds: [appId], maxResults: 10,
      maxChargeUsd: 0.05 as const,
      input: {
        apps: [appId], developers: [], appStoreCharts: [], chartGenre: "",
        countries: ["us"], language: "en", maxReviewsPerApp: 10, reviewSort: "mostrecent",
        onlyNewReviews: false, proxyConfiguration: { useApifyProxy: false },
      },
    };
    jobs.push(Job.parse({ ...values, id: stableHash(values).slice(0, 20) }));
  };
  add("ios");
  add("play");
  return jobs;
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:aurelix-reviews [--execute]");
  const jobs = reviewJobs();
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", provider: "aurelix", jobs: jobs.map(j => ({ id: j.id, store: j.store, mode: j.mode, context: j.context, maxReviewsPerApp: j.input.maxReviewsPerApp })), maxReservedUsd: VALIDATION_CEILING_USD, note: "Gerçek çekim için --execute; sayfa açmak veri çekmez." }));
    return;
  }
  const token = process.env.APIFY_TOKEN?.trim() ?? "";
  if (!token) throw new Error("APIFY_TOKEN_missing");
  const limitUsd = Number(process.env.POC_LIMIT_USD);
  if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5) throw new Error("approved_POC_LIMIT_USD_required_max_5");
  const journal = new PocJournal(resolve(".poc"));
  const client = new ApifyClient(token);
  const fixtureDir = resolve("tests/fixtures");
  await mkdir(fixtureDir, { recursive: true, mode: 0o700 });
  await mkdir(journal.directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(journal.directory, "aurelix-reviews-scope.json"), JSON.stringify({
    recordedAt: new Date().toISOString(), scope: "aurelix-reviews-validation", provider: "aurelix",
    jobIds: jobs.map(j => j.id), maxReservedUsd: VALIDATION_CEILING_USD, retentionDays: 7,
    reviewedSource: "https://apify.com/aurelix/app-store-google-play-scraper",
    apps: APPS, fields: "review id, rating, date, app version, helpful votes; reviewer identity and free text omitted from fixtures",
  }, null, 2) + "\n", { mode: 0o600 });

  let spentUsd = 0;
  const summary: Record<string, unknown>[] = [];
  await journal.exclusive(async () => {
    for (const job of jobs) {
      if (spentUsd >= VALIDATION_CEILING_USD - 1e-9) throw new Error("aurelix_reviews_validation_budget_exhausted");
      const existing = journal.state.entries[job.id];
      if (existing?.status === "complete" && existing.run?.status === "SUCCEEDED") {
        const results = Object.values(existing.results);
        summary.push({ reused: true, store: job.store, mode: job.mode, context: job.context, jobId: job.id, apps: results.filter(r => r.kind === "valid").length, reviews: results.filter(r => r.kind === "valid_review").length, invalid: results.filter(r => r.kind === "invalid").length, observedUsageUsd: existing.run.usageTotalUsd ?? null });
        spentUsd += existing.run.usageTotalUsd ?? 0;
        continue;
      }
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
      const reviews = results.filter(r => r.kind === "valid_review");
      const usage = entry.run?.usageTotalUsd ?? 0;
      spentUsd += usage;
      const label = `aurelix-${job.store}-reviews-${job.context.replace(/\./g, "-")}`;
      await writeFile(resolve(fixtureDir, `${label}.json`), `${JSON.stringify({
        job: { id: job.id, provider: job.provider, store: job.store, country: job.country, mode: job.mode, context: job.context, input: job.input },
        run: entry.run ? { id: entry.run.id, status: entry.run.status, buildNumber: entry.run.buildNumber, usageTotalUsd: entry.run.usageTotalUsd, chargedEventCounts: entry.run.chargedEventCounts } : null,
        redactedRows: results.map(r => {
          if (r.kind === "valid_review") {
            return { kind: "valid_review", review: { store: r.review.store, storeAppId: r.review.storeAppId, country: r.review.country, requestedLanguage: r.review.requestedLanguage, language: r.review.language, sourceReviewId: r.review.sourceReviewId, rating: r.review.rating, reviewedAt: r.review.reviewedAt, appVersion: r.review.appVersion, helpfulVotes: r.review.helpfulVotes, totalVotes: r.review.totalVotes, hasDeveloperReply: r.review.hasDeveloperReply, hasTitle: r.review.title != null, hasText: r.review.text != null, textLength: r.review.text?.length ?? 0, source: r.review.source, idempotencyKey: r.review.idempotencyKey } };
          }
          if (r.kind === "valid") {
            return { kind: "valid", observation: { store: r.observation.store, storeAppId: r.observation.storeAppId, name: r.observation.name, country: r.observation.country, observationRole: r.observation.observationRole, source: r.observation.source } };
          }
          return r;
        }),
        redactedSamples: entry.redactedSamples,
      }, null, 2)}\n`, { mode: 0o600 });
      summary.push({ reused: false, store: job.store, mode: job.mode, context: job.context, jobId: job.id, runId: entry.run?.id ?? null, status: entry.status, actorStatus: entry.run?.status ?? null, apps: results.filter(r => r.kind === "valid").length, reviews: reviews.length, invalid: results.filter(r => r.kind === "invalid").length, sourceErrors: results.filter(r => r.kind === "source_error").length, observedUsageUsd: entry.run?.usageTotalUsd ?? null, spentUsd, sampleIssues: results.filter(r => r.kind === "invalid").slice(0, 3) });
      if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid") || reviews.length === 0) {
        throw new Error(`aurelix_reviews_validation_failed:${job.store}/${job.context}`);
      }
      if (spentUsd > VALIDATION_CEILING_USD + 1e-9) throw new Error("aurelix_reviews_validation_budget_exceeded");
    }
  });
  console.log(JSON.stringify({ provider: "aurelix", spentUsd, ceilingUsd: VALIDATION_CEILING_USD, jobs: summary }, null, 2));
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "aurelix_reviews_collection_validation_failed");
  process.exitCode = 1;
}
