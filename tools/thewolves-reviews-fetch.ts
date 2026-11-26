import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";

// TheWolves iOS App Store reviews validation. Caps: $0.05/run, $0.10 total.
// App id from prior Aurelix detail runs (ChatGPT).
const VALIDATION_CEILING_USD = 0.10;
const APP_ID = "6448311069";

function reviewJob(): Job {
  const values = {
    provider: "thewolves" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "reviews" as const, context: APP_ID, expectedIds: [APP_ID], maxResults: 10,
    maxChargeUsd: 0.05 as const,
    input: { appIds: [APP_ID], country: "us", maxItems: 10 },
  };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}

function fixtureText(kind: "title" | "body", original: string | null): string | null {
  if (original == null || !original.trim()) return null;
  return kind === "title"
    ? "Sample App Store review title for fixture tests"
    : "Sample App Store review body for analysis-pipeline fixture tests. Personal identifiers removed.";
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:thewolves-reviews [--execute]");
  const job = reviewJob();
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", provider: "thewolves", jobs: [{ id: job.id, store: job.store, mode: job.mode, context: job.context, maxItems: job.input.maxItems }], maxReservedUsd: VALIDATION_CEILING_USD, note: "Gerçek çekim için --execute; sayfa açmak veri çekmez." }));
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
  await writeFile(resolve(journal.directory, "thewolves-reviews-scope.json"), JSON.stringify({
    recordedAt: new Date().toISOString(), scope: "thewolves-reviews-validation", provider: "thewolves",
    jobIds: [job.id], maxReservedUsd: VALIDATION_CEILING_USD, retentionDays: 7,
    reviewedSource: "https://apify.com/thewolves/appstore-reviews-scraper",
    apps: { ios: APP_ID }, fields: "review id, rating, date, app version, sanitized title/text; reviewer identity omitted",
  }, null, 2) + "\n", { mode: 0o600 });

  let spentUsd = 0;
  const summary: Record<string, unknown>[] = [];
  await journal.exclusive(async () => {
    if (spentUsd >= VALIDATION_CEILING_USD - 1e-9) throw new Error("thewolves_reviews_validation_budget_exhausted");
    const existing = journal.state.entries[job.id];
    if (existing?.status === "complete" && existing.run?.status === "SUCCEEDED") {
      const results = Object.values(existing.results);
      summary.push({ reused: true, store: job.store, mode: job.mode, context: job.context, jobId: job.id, reviews: results.filter(r => r.kind === "valid_review").length, invalid: results.filter(r => r.kind === "invalid").length, observedUsageUsd: existing.run.usageTotalUsd ?? null });
      spentUsd += existing.run.usageTotalUsd ?? 0;
    } else {
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
      await writeFile(resolve(fixtureDir, `thewolves-ios-reviews-${APP_ID}.json`), `${JSON.stringify({
        job: { id: job.id, provider: job.provider, store: job.store, country: job.country, mode: job.mode, context: job.context, input: job.input },
        run: entry.run ? { id: entry.run.id, status: entry.run.status, buildNumber: entry.run.buildNumber, usageTotalUsd: entry.run.usageTotalUsd, chargedEventCounts: entry.run.chargedEventCounts } : null,
        redactedRows: results.map(r => {
          if (r.kind === "valid_review") {
            return { kind: "valid_review", review: {
              store: r.review.store, storeAppId: r.review.storeAppId, country: r.review.country,
              requestedLanguage: r.review.requestedLanguage, language: r.review.language,
              sourceReviewId: r.review.sourceReviewId, rating: r.review.rating, reviewedAt: r.review.reviewedAt,
              appVersion: r.review.appVersion, title: fixtureText("title", r.review.title), text: fixtureText("body", r.review.text),
              hasDeveloperReply: r.review.hasDeveloperReply, source: r.review.source, idempotencyKey: r.review.idempotencyKey,
              fieldStatus: r.review.fieldStatus,
            } };
          }
          return r;
        }),
        redactedSamples: entry.redactedSamples,
      }, null, 2)}\n`, { mode: 0o600 });
      summary.push({ reused: false, store: job.store, mode: job.mode, context: job.context, jobId: job.id, runId: entry.run?.id ?? null, status: entry.status, actorStatus: entry.run?.status ?? null, reviews: reviews.length, invalid: results.filter(r => r.kind === "invalid").length, sourceErrors: results.filter(r => r.kind === "source_error").length, observedUsageUsd: entry.run?.usageTotalUsd ?? null, spentUsd, sampleIssues: results.filter(r => r.kind === "invalid").slice(0, 3) });
      if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid") || reviews.length === 0) {
        throw new Error(`thewolves_reviews_validation_failed:${job.store}/${job.context}`);
      }
      if (spentUsd > VALIDATION_CEILING_USD + 1e-9) throw new Error("thewolves_reviews_validation_budget_exceeded");
    }
  });
  console.log(JSON.stringify({ provider: "thewolves", spentUsd, ceilingUsd: VALIDATION_CEILING_USD, jobs: summary }, null, 2));
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "thewolves_reviews_collection_validation_failed");
  process.exitCode = 1;
}
