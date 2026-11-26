import { ApifyClient, ApiError, isTerminal } from "./apify.ts";
import { PocJournal, redactedSample, type Entry } from "./journal.ts";
import { normalizeItem } from "./normalize.ts";
import { type Job } from "./plan.ts";

export interface LiveSettings { token: string; enabled: boolean; dataUseConfirmed: boolean; limitUsd: number }

export function requireLiveSettings(settings: LiveSettings): void {
  const missing: string[] = [];
  if (!settings.token.trim()) missing.push("APIFY_TOKEN");
  if (!settings.enabled) missing.push("APIFY_COLLECTION_ENABLED=true");
  if (!settings.dataUseConfirmed) missing.push("POC_DATA_USE_CONFIRMED=true");
  if (!Number.isFinite(settings.limitUsd) || settings.limitUsd <= 0 || settings.limitUsd > 5) missing.push("0<POC_LIMIT_USD<=5");
  if (missing.length) throw new Error(`live_poc_not_configured: ${missing.join(", ")}`);
}

export async function collectJob(job: Job, journal: PocJournal, client: ApifyClient, options: { start: boolean; limitUsd: number }): Promise<Entry> {
  let entry = journal.state.entries[job.id];
  if (entry?.status === "complete") return entry;
  if (!entry) {
    if (!options.start) throw new Error("job_not_started");
    if (Object.values(journal.state.entries).some(e => e.status !== "complete")) throw new Error("unfinished_run_must_be_reconciled_first");
    entry = await journal.reserve(job, options.limitUsd);
    try {
      entry.run = await client.start(job);
      entry.status = "running";
      await journal.save();
    } catch (error) {
      entry.status = "unknown";
      entry.lastError = error instanceof ApiError ? error.code : "start_response_invalid_or_checkpoint_failed";
      await journal.save();
      throw new Error(entry.lastError, { cause: error });
    }
  }
  if (!entry.run) throw new Error("start_result_unknown_attach_verified_run_before_continuing");
  try {
    entry.run = await client.getRun(entry.run.id, job);
    if (!isTerminal(entry.run)) {
      entry.status = "running";
      await journal.save();
      return entry;
    }
    entry.status = "ingesting";
    await journal.save();
    while (entry.nextOffset < 200) {
      const rows = await client.readPage(entry.run.defaultDatasetId, entry.nextOffset);
      const collectedAt = new Date().toISOString();
      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        entry.results[String(entry.nextOffset + i)] = normalizeItem(raw, job, entry.run.id, collectedAt);
        if (entry.redactedSamples.length < 3) entry.redactedSamples.push(redactedSample(raw));
      }
      entry.nextOffset += rows.length;
      await journal.save();
      if (rows.length < 50) { entry.status = "complete"; break; }
    }
    if (entry.status !== "complete") {
      // Bounded reads avoid runaway datasets; truncation can never pass the POC gate.
      entry.ingestionTruncated = true;
      entry.status = "complete";
    }
    // PAY_PER_EVENT usage may settle after status flips; refresh once before checkpointing.
    entry.run = await client.getRun(entry.run.id, job);
    entry.lastError = null;
    await journal.save();
    return entry;
  } catch (error) {
    entry.lastError = error instanceof ApiError ? error.code : "dataset_or_run_validation_failed";
    await journal.save();
    throw new Error(entry.lastError, { cause: error });
  }
}
