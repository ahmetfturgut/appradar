import type { Journal } from "./journal.ts";
import { createPlan, type Job } from "./plan.ts";

export function buildReport(state: Journal, jobs = createPlan()) {
  const ids = new Set<string>();
  const runs = new Set<string>();
  const strata: Record<string, { expected: number; valid: number }> = {};
  const fieldCoverage: Record<string, { observed: number; available: number; unsupported: number }> = {};
  const perJob = jobs.map(job => {
    const entry = state.entries[job.id];
    const valid = Object.values(entry?.results ?? {}).flatMap(r => r.kind === "valid" ? [r.observation] : []);
    const reviews = Object.values(entry?.results ?? {}).flatMap(r => r.kind === "valid_review" ? [r.review] : []);
    const keywords = Object.values(entry?.results ?? {}).flatMap(r => r.kind === "valid_keyword" ? [r.keyword] : []);
    const invalid = Object.values(entry?.results ?? {}).filter(r => r.kind === "invalid");
    const sourceErrors = Object.values(entry?.results ?? {}).filter(r => r.kind === "source_error");
    const unique = new Set(valid.map(o => o.storeAppId));
    const problems: string[] = [];
    if (entry) {
      if (entry.status !== "complete") problems.push("incomplete");
      if (entry.run && entry.run.status !== "SUCCEEDED") problems.push("actor_not_succeeded");
      if (entry.ingestionTruncated) problems.push("dataset_truncated");
      if (invalid.length) problems.push("invalid_rows");
      if (sourceErrors.length && job.mode !== "negative") problems.push("partial_source_errors");
      if (valid.length !== unique.size) problems.push("duplicate_app_rows");
      if (job.mode !== "reviews" && job.mode !== "keywords" && valid.length > job.maxResults) problems.push("result_limit_exceeded");
      if (job.mode === "reviews" && reviews.length > job.maxResults) problems.push("result_limit_exceeded");
      if (job.mode === "keywords" && keywords.length > job.maxResults) problems.push("result_limit_exceeded");
      if (job.mode === "reviews" && !reviews.length && entry.status === "complete") problems.push("empty_result");
      if (job.mode === "keywords" && !keywords.length && entry.status === "complete") problems.push("empty_result");
      if (job.mode !== "negative" && job.mode !== "reviews" && job.mode !== "keywords" && !valid.length && entry.status === "complete") problems.push("empty_result");
      if (job.mode === "negative" && valid.length) problems.push("invalid_id_returned_app");
      if (entry.run && runs.has(entry.run.id)) problems.push("run_reused_between_jobs");
      if (entry.run) runs.add(entry.run.id);
      for (const observation of [...valid, ...reviews, ...keywords]) {
        if (ids.has(observation.idempotencyKey)) problems.push("duplicate_observation");
        ids.add(observation.idempotencyKey);
        const key = `${job.provider}/${job.store}/${job.mode}`;
        for (const [field, status] of Object.entries(observation.fieldStatus)) {
          const counter = fieldCoverage[`${key}/${field}`] ??= { observed: 0, available: 0, unsupported: 0 };
          counter.observed++;
          if (status === "available") counter.available++;
          if (status === "unsupported") counter.unsupported++;
        }
      }
    }
    if (job.mode === "details") {
      const key = `${job.provider}/${job.store}/${job.country}/round-${job.round}`;
      const stratum = strata[key] ??= { expected: 0, valid: 0 };
      stratum.expected += job.expectedIds.length;
      stratum.valid += job.expectedIds.filter(id => unique.has(id)).length;
    }
    return {
      jobId: job.id, provider: job.provider, store: job.store, country: job.country, round: job.round,
      mode: job.mode, context: job.context, state: entry?.status ?? "not_started",
      runId: entry?.run?.id ?? null, actorStatus: entry?.run?.status ?? null,
      validRows: valid.length, validReviewRows: reviews.length, validKeywordRows: keywords.length, invalidRows: invalid.length, sourceErrorRows: sourceErrors.length,
      expectedDetails: job.mode === "details" ? job.expectedIds.length : null,
      missingIds: job.mode === "details" ? job.expectedIds.filter(id => !unique.has(id)) : [],
      observedUsageUsd: entry?.run?.usageTotalUsd ?? null,
      chargedEventCounts: entry?.run?.chargedEventCounts ?? null,
      problems: [...new Set(problems)],
    };
  });
  const completed = perJob.filter(j => j.state === "complete").length;
  const allDone = completed === jobs.length;
  const started = Object.keys(state.entries).length;
  const detailResults = perJob.filter(j => j.mode === "details");
  const expected = detailResults.reduce((n, j) => n + (j.expectedDetails ?? 0), 0);
  const missing = detailResults.reduce((n, j) => n + j.missingIds.length, 0);
  const successRate = started === 0 ? null : (expected - missing) / expected;
  const problemCount = perJob.reduce((n, j) => n + j.problems.length, 0);
  const failedStrata = allDone ? Object.entries(strata).filter(([, s]) => s.valid / s.expected < 0.95).map(([key]) => key) : [];
  const temporalComparisons = compareRounds(state, jobs);
  return {
    generatedAt: new Date().toISOString(),
    decision: started === 0 ? "AWAITING_LIVE_DATA" : !allDone ? "INCOMPLETE" : problemCount || (successRate ?? 0) < 0.95 || failedStrata.length || !temporalComparisons.allPairsHaveDistinctTimes ? "NO_GO_REVIEW_REQUIRED" : "TECHNICAL_RESULTS_READY_FOR_REVIEW",
    plannedJobs: jobs.length, startedJobs: started, completedJobs: completed,
    detailSuccessRate: successRate, failedStrata, perStratum: strata, fieldCoverage, temporalComparisons,
    reservedCeilingUsd: Object.values(state.entries).reduce((n, e) => n + Math.round(e.reservedUsd * 100), 0) / 100,
    invoiceVerified: false, productionDataUseVerified: false,
    limitations: [
      "usageTotalUsd gözlemidir; fatura uzlaştırması ve ücret olaylarının hesap planıyla doğrulanması gerekir.",
      "Teknik fixture testleri gerçek actor/veri veya ticari izin doğrulaması değildir.",
      "İki ayrı çekim uzun dönem geçmiş veya üretim ölçeği garantisi değildir.",
      "Arama kapsamı mağazanın tamamı değildir; desteklenmeyen modlar plana eklenmez.",
    ],
    jobs: perJob,
  };
}

function compareRounds(state: Journal, jobs: Job[]) {
  const first = jobs.filter(j => j.round === 1 && j.mode === "details");
  const pairs = first.map(job => {
    const next = jobs.find(j => j.round === 2 && j.mode === "details" && j.provider === job.provider && j.store === job.store && j.country === job.country);
    const a = Object.values(state.entries[job.id]?.results ?? {}).flatMap(r => r.kind === "valid" ? [r.observation] : []);
    const b = Object.values(next ? state.entries[next.id]?.results ?? {} : {}).flatMap(r => r.kind === "valid" ? [r.observation] : []);
    const differences = a.flatMap(old => {
      const newer = b.find(v => v.storeAppId === old.storeAppId);
      return newer ? [Date.parse(newer.observedAt) - Date.parse(old.observedAt)] : [];
    });
    return { provider: job.provider, store: job.store, country: job.country, comparedApps: differences.length, minGapMs: differences.length ? Math.min(...differences) : null, distinctTimes: differences.length > 0 && differences.every(d => d > 0) };
  });
  return { allPairsHaveDistinctTimes: pairs.length > 0 && pairs.every(p => p.distinctTimes), pairs };
}
