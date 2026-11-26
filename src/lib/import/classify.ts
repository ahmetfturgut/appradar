// Classifies journal result rows for a historical import. Does not invent v2 identity
// fields, provider runs, costs or review rights.
import {
  KeywordObservationSchema, ObservationSchema, PersistedResultSchema, ReviewObservationSchema,
  type PersistedNormalizationResult,
} from "../../poc/normalize.ts";
import type { Entry } from "../../poc/journal.ts";
import { isTerminal, type Run } from "../../poc/apify.ts";

export type Disposition = "eligible" | "skipped" | "expired" | "invalid";

export type SkipReason =
  | "entry_not_complete"
  | "provider_run_missing"
  | "provider_run_not_succeeded"
  | "source_error"
  | "legacy_v1_missing_v2_identity"
  | "review_content_excluded"
  | "synthetic_or_fixture"
  | "retention_not_configured"
  | "unsupported_kind";

export interface ClassifiedRecord {
  disposition: Disposition;
  reason: SkipReason | "ok" | "observation_contract_invalid" | "journal_result_invalid" | "expired_retention";
  jobId: string;
  offset: string;
  kind: PersistedNormalizationResult["kind"] | "unparsed";
  schemaVersion: 1 | 2 | null;
  source: string | null;
  sourceRunId: string | null;
  storeAppId: string | null;
  collectedAt: string | null;
}

const syntheticAppIds = new Set(["9999000011", "9999000012"]);

function isSynthetic(sourceRunId: string | null, storeAppId: string | null, name: string | null): boolean {
  if (storeAppId && syntheticAppIds.has(storeAppId)) return true;
  if (name === "Sentetik test kaydı") return true;
  if (!sourceRunId) return false;
  return sourceRunId === "Run1"
    || sourceRunId.startsWith("Synthetic")
    || sourceRunId.startsWith("EngRun");
}

function collectedAtOf(result: PersistedNormalizationResult): string | null {
  if (result.kind === "valid") return result.observation.collectedAt;
  if (result.kind === "valid_review") return result.review.collectedAt;
  if (result.kind === "valid_keyword") return result.keyword.collectedAt;
  return null;
}

function identityOf(result: PersistedNormalizationResult) {
  if (result.kind === "valid") {
    return {
      schemaVersion: result.observation.schemaVersion as 1 | 2,
      source: result.observation.source,
      sourceRunId: result.observation.sourceRunId,
      storeAppId: result.observation.storeAppId,
      name: result.observation.name,
    };
  }
  if (result.kind === "valid_review") {
    return {
      schemaVersion: result.review.schemaVersion as 1 | 2,
      source: result.review.source,
      sourceRunId: result.review.sourceRunId,
      storeAppId: result.review.storeAppId,
      name: null as string | null,
    };
  }
  if (result.kind === "valid_keyword") {
    return {
      schemaVersion: result.keyword.schemaVersion as 1 | 2,
      source: result.keyword.source,
      sourceRunId: result.keyword.sourceRunId,
      storeAppId: result.keyword.storeAppId,
      name: null as string | null,
    };
  }
  return { schemaVersion: null, source: null, sourceRunId: null, storeAppId: null, name: null };
}

function runSucceeded(run: Run | null): boolean {
  return !!run && isTerminal(run) && run.status === "SUCCEEDED";
}

export interface ClassifyOptions {
  now?: Date;
  /** Product retention window. Missing means no write can be planned. */
  retentionDays?: number | null;
  /** Reviews stay out until commercial storage rights are confirmed. */
  reviewImportAllowed?: boolean;
}

export function classifyResult(
  entry: Entry, offset: string, raw: unknown, options: ClassifyOptions = {},
): ClassifiedRecord {
  const base = {
    jobId: entry.jobId, offset, kind: "unparsed" as const, schemaVersion: null, source: null,
    sourceRunId: null, storeAppId: null, collectedAt: null,
  };

  if (entry.status !== "complete") {
    return { ...base, disposition: "skipped", reason: "entry_not_complete" };
  }
  if (!entry.run?.id) {
    return { ...base, disposition: "skipped", reason: "provider_run_missing" };
  }
  if (!runSucceeded(entry.run)) {
    return { ...base, disposition: "skipped", reason: "provider_run_not_succeeded" };
  }

  const parsed = PersistedResultSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...base, disposition: "invalid", reason: "journal_result_invalid" };
  }
  const result = parsed.data;
  const id = identityOf(result);
  const collectedAt = collectedAtOf(result);
  const shared = {
    jobId: entry.jobId, offset, kind: result.kind, schemaVersion: id.schemaVersion,
    source: id.source, sourceRunId: id.sourceRunId, storeAppId: id.storeAppId, collectedAt,
  };

  if (result.kind === "invalid") {
    return { ...shared, disposition: "invalid", reason: "observation_contract_invalid" };
  }
  if (result.kind === "source_error") {
    return { ...shared, disposition: "skipped", reason: "source_error" };
  }
  if (isSynthetic(id.sourceRunId, id.storeAppId, id.name)) {
    return { ...shared, disposition: "skipped", reason: "synthetic_or_fixture" };
  }
  if (result.kind === "valid_review") {
    if (!options.reviewImportAllowed) {
      return { ...shared, disposition: "skipped", reason: "review_content_excluded" };
    }
    if (result.review.schemaVersion !== 2 || !ReviewObservationSchema.safeParse(result.review).success) {
      return { ...shared, disposition: "skipped", reason: "legacy_v1_missing_v2_identity" };
    }
  } else if (result.kind === "valid") {
    if (result.observation.schemaVersion !== 2 || !ObservationSchema.safeParse(result.observation).success) {
      return { ...shared, disposition: "skipped", reason: "legacy_v1_missing_v2_identity" };
    }
  } else if (result.kind === "valid_keyword") {
    if (result.keyword.schemaVersion !== 2 || !KeywordObservationSchema.safeParse(result.keyword).success) {
      return { ...shared, disposition: "skipped", reason: "legacy_v1_missing_v2_identity" };
    }
  } else {
    return { ...shared, disposition: "skipped", reason: "unsupported_kind" };
  }

  const retentionDays = options.retentionDays ?? null;
  if (retentionDays == null || !Number.isInteger(retentionDays) || retentionDays < 1) {
    return { ...shared, disposition: "skipped", reason: "retention_not_configured" };
  }
  if (!collectedAt) {
    return { ...shared, disposition: "invalid", reason: "observation_contract_invalid" };
  }
  const expiresAt = Date.parse(collectedAt) + retentionDays * 86400000;
  if (!Number.isFinite(expiresAt) || expiresAt <= (options.now ?? new Date()).getTime()) {
    return { ...shared, disposition: "expired", reason: "expired_retention" };
  }
  return { ...shared, disposition: "eligible", reason: "ok" };
}
