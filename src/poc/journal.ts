import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { Run } from "./apify.ts";
import { type Job } from "./plan.ts";
import { PersistedResultSchema, type PersistedNormalizationResult } from "./normalize.ts";

export interface Entry {
  jobId: string;
  reservedUsd: number;
  status: "starting" | "running" | "ingesting" | "complete" | "unknown";
  startedAt: string;
  run: Run | null;
  nextOffset: number;
  results: Record<string, PersistedNormalizationResult>;
  redactedSamples: Record<string, unknown>[];
  ingestionTruncated: boolean;
  lastError: string | null;
}
export interface Journal {
  version: 1;
  entries: Record<string, Entry>;
}

const EntryOnDisk = z.object({
  jobId: z.string(), reservedUsd: z.number().positive().max(0.05),
  status: z.enum(["starting", "running", "ingesting", "complete", "unknown"]),
  startedAt: z.iso.datetime({ offset: true }), run: Run.nullable(),
  nextOffset: z.number().int().nonnegative().max(200),
  results: z.record(z.string(), PersistedResultSchema), redactedSamples: z.array(z.record(z.string(), z.unknown())).max(3),
  ingestionTruncated: z.boolean(), lastError: z.string().nullable(),
});

export class PocJournal {
  state: Journal = { version: 1, entries: {} };
  constructor(public readonly directory: string) {}

  async load(): Promise<void> {
    try {
      const parsed = z.object({ version: z.literal(1), entries: z.record(z.string(), EntryOnDisk) }).parse(JSON.parse(await readFile(join(this.directory, "state.json"), "utf8")));
      for (const [key, entry] of Object.entries(parsed.entries)) {
        if (key !== entry.jobId || Object.keys(entry.results).length !== entry.nextOffset || Array.from({ length: entry.nextOffset }, (_, i) => String(i)).some(i => !(i in entry.results))) throw new Error("checkpoint_mismatch");
      }
      this.state = parsed;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw new Error("poc_state_invalid_or_unreadable", { cause: error });
    }
  }

  async save(): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = join(this.directory, "state.json.tmp");
    await writeFile(temporary, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600, flush: true });
    await rename(temporary, join(this.directory, "state.json"));
  }

  async exclusive<T>(work: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = join(this.directory, "run.lock");
    let lock;
    try { lock = await open(lockPath, "wx", 0o600); }
    catch { throw new Error("poc_locked_check_running_process_before_removing_lock"); }
    try {
      await lock.writeFile(String(process.pid));
      await this.load();
      return await work();
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }

  async reserve(job: Job, limitUsd: number): Promise<Entry> {
    if (this.state.entries[job.id]) throw new Error("job_already_reserved_resume_instead");
    if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5) throw new Error("poc_limit_must_be_between_zero_and_approved_5_usd");
    const reservedCents = Object.values(this.state.entries).reduce((n, e) => n + Math.round(e.reservedUsd * 100), 0);
    if (reservedCents + Math.round(job.maxChargeUsd * 100) > Math.floor(limitUsd * 100 + 1e-8)) throw new Error("poc_budget_exhausted");
    const entry: Entry = {
      jobId: job.id, reservedUsd: job.maxChargeUsd, status: "starting", startedAt: new Date().toISOString(), run: null,
      nextOffset: 0, results: {}, redactedSamples: [], ingestionTruncated: false, lastError: null,
    };
    this.state.entries[job.id] = entry;
    // Durable reservation precedes the only paid POST. Unknown starts retain the reservation.
    await this.save();
    return entry;
  }
}

export function redactedSample(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { invalid: true };
  const row = raw as Record<string, unknown>;
  if (row.type === "ranking" || row.type === "suggestion" || row.type === "metrics") {
    const allowed = ["type", "keyword", "suggestion", "store", "country", "rank", "appId", "appName", "developer", "rating", "popularity", "popularityProxy", "popularitySource", "difficulty", "measuredAt", "stale", "checkedAt", "error"];
    return Object.fromEntries(Object.entries(row).filter(([key, v]) => allowed.includes(key) && (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string")).map(([key, v]) => [key, typeof v === "string" ? v.slice(0, 200) : v]));
  }
  // Reviewer identity and free-text bodies stay out of durable redacted samples.
  if (row.type === "review") {
    const allowed = ["type", "store", "app_id", "country", "language", "scraped_at", "review_id", "rating", "date", "app_version", "helpful_votes", "total_votes"];
    const sample = Object.fromEntries(Object.entries(row).filter(([key, v]) => allowed.includes(key) && (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string")).map(([key, v]) => [key, typeof v === "string" ? v.slice(0, 200) : v]));
    sample.has_review_title = typeof row.review_title === "string" && row.review_title.length > 0;
    sample.has_text = typeof row.text === "string" && row.text.length > 0;
    sample.text_length = typeof row.text === "string" ? row.text.length : 0;
    sample.has_developer_reply = typeof row.developer_reply === "string" && row.developer_reply.length > 0;
    return sample;
  }
  // TheWolves App Store reviews: id/score/appId shape without Aurelix type discriminator.
  if (typeof row.id === "string" && typeof row.appId === "string" && typeof row.score === "number") {
    const allowed = ["id", "appId", "country", "date", "score", "version"];
    const sample = Object.fromEntries(Object.entries(row).filter(([key, v]) => allowed.includes(key) && (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string")).map(([key, v]) => [key, typeof v === "string" ? v.slice(0, 200) : v]));
    sample.has_review_title = typeof row.title === "string" && row.title.trim().length > 0;
    sample.has_text = typeof row.text === "string" && row.text.trim().length > 0;
    sample.text_length = typeof row.text === "string" ? row.text.length : 0;
    return sample;
  }
  const allowed = ["type", "store", "appId", "app_id", "appTitle", "title", "appUrl", "url", "country", "language", "scrapedAt", "scraped_at", "price", "currency", "isFree", "is_free", "rating", "ratingCount", "ratingsCount", "ratings_count", "reviewCount", "reviews_count", "chartRank", "chart_rank", "chartCollection", "chartCategory", "chart", "chartGenre", "chart_genre", "genre_id", "category", "categoryId", "developer", "developerId", "developer_id", "developer_url", "found_via", "searchRank", "searchTerm", "detailLevel", "source", "status", "genre", "version", "releaseDate", "updatedAt"];
  return Object.fromEntries(Object.entries(row).filter(([key, v]) => allowed.includes(key) && (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string")).map(([key, v]) => [key, typeof v === "string" ? v.slice(0, 500) : v]));
}
