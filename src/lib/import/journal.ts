// Loads the on-disk POC journal without mutating it.
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { Run } from "../../poc/apify.ts";
import type { Journal } from "../../poc/journal.ts";
import { PersistedResultSchema } from "../../poc/normalize.ts";

const EntryOnDisk = z.object({
  jobId: z.string(), reservedUsd: z.number().positive().max(0.05),
  status: z.enum(["starting", "running", "ingesting", "complete", "unknown"]),
  startedAt: z.iso.datetime({ offset: true }), run: Run.nullable(),
  nextOffset: z.number().int().nonnegative().max(200),
  results: z.record(z.string(), PersistedResultSchema),
  redactedSamples: z.array(z.record(z.string(), z.unknown())).max(3),
  ingestionTruncated: z.boolean(), lastError: z.string().nullable(),
});

const JournalOnDisk = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), EntryOnDisk),
});

/** Read-only. Same checkpoint rules as PocJournal.load, without a lock or write path. */
export async function loadJournalFile(path: string): Promise<Journal> {
  const parsed = JournalOnDisk.parse(JSON.parse(await readFile(path, "utf8")));
  for (const [key, entry] of Object.entries(parsed.entries)) {
    if (key !== entry.jobId
      || Object.keys(entry.results).length !== entry.nextOffset
      || Array.from({ length: entry.nextOffset }, (_, i) => String(i)).some(i => !(i in entry.results))) {
      throw new Error("checkpoint_mismatch");
    }
  }
  return parsed;
}
