import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";
import { assertDevelopmentEnvironment } from "../src/lib/collection/target.js";

// Dedicated Aurelix Google Play reviews validation. Caps: $0.05/run, $0.10 total.
// App id from prior successful Play detail/reviews runs (ChatGPT).
const VALIDATION_CEILING_USD = 0.10;
const APP_ID = "com.openai.chatgpt";
const MAX_REVIEWS = 100;

function reviewJob(): Job {
  const values = {
    provider: "aurelixplayreviews" as const, store: "play" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "reviews" as const, context: APP_ID, expectedIds: [APP_ID], maxResults: MAX_REVIEWS,
    maxChargeUsd: 0.05 as const,
    input: {
      apps: [APP_ID], maxReviewsPerApp: MAX_REVIEWS, sort: "newest", stars: "",
      language: "en", countries: ["us"], onlyNewReviews: false,
      proxyConfiguration: { useApifyProxy: true },
    },
  };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}

function fixtureText(original: string | null): string | null {
  if (original == null || !original.trim()) return null;
  return "Sample Google Play review body for analysis-pipeline fixture tests. Personal identifiers removed.";
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:aurelix-play-reviews [--execute]");
  const job = reviewJob();
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", provider: "aurelixplayreviews", jobs: [{ id: job.id, store: job.store, mode: job.mode, context: job.context, maxReviewsPerApp: job.input.maxReviewsPerApp, sort: job.input.sort }], maxReservedUsd: VALIDATION_CEILING_USD, note: "Gerçek çekim için --execute; sayfa açmak veri çekmez." }));
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
  const fixtureDir = resolve("tests/fixtures");
  await mkdir(fixtureDir, { recursive: true, mode: 0o700 });
  await mkdir(journal.directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(journal.directory, "aurelix-play-reviews-scope.json"), JSON.stringify({
    recordedAt: new Date().toISOString(), scope: "aurelix-play-reviews-validation", provider: "aurelixplayreviews",
    jobIds: [job.id], maxReservedUsd: VALIDATION_CEILING_USD, retentionDays: 7,
    reviewedSource: "https://apify.com/aurelix/google-play-reviews-scraper",
    apps: { play: APP_ID }, fields: "review id, rating, date, app version, helpful votes, developer reply, sanitized text; reviewer identity omitted",
  }, null, 2) + "\n", { mode: 0o600 });

  let spentUsd = 0;
  const summary: Record<string, unknown>[] = [];
  await journal.exclusive(async () => {
    if (spentUsd >= VALIDATION_CEILING_USD - 1e-9) throw new Error("aurelix_play_reviews_validation_budget_exhausted");
    const existing = journal.state.entries[job.id];
    if (existing?.status === "complete" && existing.run?.status === "SUCCEEDED") {
      const results = Object.values(existing.results);
      summary.push({ reused: true, store: job.store, mode: job.mode, context: job.context, jobId: job.id, reviews: results.filter(r => r.kind === "valid_review").length, invalid: results.filter(r => r.kind === "invalid").length, observedUsageUsd: existing.run.usageTotalUsd ?? null });
      spentUsd += existing.run.usageTotalUsd ?? 0;
    } else {
      let entry = await collectJob(job, journal, client, { start: true, limitUsd });
      const deadline = Date.now() + 300000;
      while (entry.status !== "complete" && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        entry = await collectJob(job, journal, client, { start: false, limitUsd });
      }
      for (let i = 0; i < 6 && entry.run && (entry.run.usageTotalUsd == null || entry.run.usageTotalUsd === 0); i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        entry.run = await client.getRun(entry.run.id, job);
        await journal.save();
      }
      const results = Object.values(entry.results);
      const reviews = results.filter(r => r.kind === "valid_review");
      const usage = entry.run?.usageTotalUsd ?? 0;
      spentUsd += usage;
      const dates = reviews.flatMap(r => r.kind === "valid_review" && r.review.reviewedAt != null && (r.review.schemaVersion === 2 || r.review.observedTimeBasis === "source") ? [r.review.reviewedAt] : []).sort();
      await writeFile(resolve(fixtureDir, `aurelix-play-reviews-scraper-${APP_ID.replace(/\./g, "-")}.json`), `${JSON.stringify({
        job: { id: job.id, provider: job.provider, store: job.store, country: job.country, mode: job.mode, context: job.context, input: job.input },
        run: entry.run ? { id: entry.run.id, status: entry.run.status, buildNumber: entry.run.buildNumber, usageTotalUsd: entry.run.usageTotalUsd, chargedEventCounts: entry.run.chargedEventCounts } : null,
        stats: { reviewCount: reviews.length, invalidCount: results.filter(r => r.kind === "invalid").length, reviewedAtMin: dates[0] ?? null, reviewedAtMax: dates.at(-1) ?? null },
        redactedRows: results.map(r => {
          if (r.kind === "valid_review") {
            return { kind: "valid_review", review: {
              store: r.review.store, storeAppId: r.review.storeAppId, country: r.review.country,
              requestedLanguage: r.review.requestedLanguage, language: r.review.language,
              sourceReviewId: r.review.sourceReviewId, rating: r.review.rating, reviewedAt: r.review.reviewedAt,
              appVersion: r.review.appVersion, helpfulVotes: r.review.helpfulVotes, totalVotes: r.review.totalVotes,
              title: null, text: fixtureText(r.review.text), hasDeveloperReply: r.review.hasDeveloperReply,
              source: r.review.source, idempotencyKey: r.review.idempotencyKey, fieldStatus: r.review.fieldStatus,
            } };
          }
          return r;
        }),
        redactedSamples: entry.redactedSamples,
      }, null, 2)}\n`, { mode: 0o600 });
      summary.push({ reused: false, store: job.store, mode: job.mode, context: job.context, jobId: job.id, runId: entry.run?.id ?? null, status: entry.status, actorStatus: entry.run?.status ?? null, reviews: reviews.length, invalid: results.filter(r => r.kind === "invalid").length, sourceErrors: results.filter(r => r.kind === "source_error").length, observedUsageUsd: entry.run?.usageTotalUsd ?? null, spentUsd, reviewedAtMin: dates[0] ?? null, reviewedAtMax: dates.at(-1) ?? null, sampleIssues: results.filter(r => r.kind === "invalid").slice(0, 3) });
      if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid") || reviews.length <= 20) {
        throw new Error(`aurelix_play_reviews_validation_failed:${job.store}/${job.context}:reviews=${reviews.length}`);
      }
      if (spentUsd > VALIDATION_CEILING_USD + 1e-9) throw new Error("aurelix_play_reviews_validation_budget_exceeded");
    }
  });
  console.log(JSON.stringify({ provider: "aurelixplayreviews", spentUsd, ceilingUsd: VALIDATION_CEILING_USD, jobs: summary }, null, 2));
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "aurelix_play_reviews_collection_validation_failed");
  process.exitCode = 1;
}
