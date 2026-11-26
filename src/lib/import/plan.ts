// Builds a dry-run import plan from a loaded POC journal. Read-only.
import type { Journal, Entry } from "../../poc/journal.ts";
import { classifyResult, type ClassifiedRecord, type ClassifyOptions } from "./classify.ts";

export interface ImportPlan {
  dryRun: true;
  journal: { version: Journal["version"]; entries: number; results: number };
  counts: {
    eligible: number;
    skipped: number;
    expired: number;
    invalid: number;
    byReason: Record<string, number>;
    byKind: Record<string, number>;
  };
  /** Distinct provider runs referenced by eligible rows. Never invented. */
  requiredProviderRuns: Array<{ source: string; externalRunId: string }>;
  unsafeCount: number;
  samples: {
    eligible: ClassifiedRecord[];
    skipped: ClassifiedRecord[];
    expired: ClassifiedRecord[];
    invalid: ClassifiedRecord[];
    unsafe: ClassifiedRecord[];
  };
  blockers: string[];
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

export function planJournalImport(journal: Journal, options: ClassifyOptions = {}): ImportPlan {
  const records: ClassifiedRecord[] = [];
  for (const entry of Object.values(journal.entries) as Entry[]) {
    for (const [offset, raw] of Object.entries(entry.results)) {
      records.push(classifyResult(entry, offset, raw, options));
    }
  }

  const counts = {
    eligible: 0, skipped: 0, expired: 0, invalid: 0,
    byReason: {} as Record<string, number>,
    byKind: {} as Record<string, number>,
  };
  const runs = new Map<string, { source: string; externalRunId: string }>();
  for (const row of records) {
    counts[row.disposition] += 1;
    bump(counts.byReason, row.reason);
    bump(counts.byKind, row.kind);
    if (row.disposition === "eligible" && row.source && row.sourceRunId) {
      runs.set(`${row.source}:${row.sourceRunId}`, { source: row.source, externalRunId: row.sourceRunId });
    }
  }

  const blockers = [
    "remote_import_disabled",
    "provider_runs_not_fabricated",
    "review_content_excluded_until_rights_confirmed",
  ];
  if (options.retentionDays == null) blockers.unshift("retention_days_required");
  if (counts.byReason.legacy_v1_missing_v2_identity) {
    blockers.push("legacy_v1_requires_full_v2_context_without_fabrication");
  }

  const take = (disposition: ClassifiedRecord["disposition"]) =>
    records.filter(row => row.disposition === disposition).slice(0, 5);
  const unsafe = records.filter(row =>
    row.disposition === "invalid"
    || row.reason === "legacy_v1_missing_v2_identity"
    || row.reason === "provider_run_missing");

  return {
    dryRun: true,
    journal: {
      version: journal.version,
      entries: Object.keys(journal.entries).length,
      results: records.length,
    },
    counts,
    requiredProviderRuns: [...runs.values()].sort((a, b) =>
      a.source.localeCompare(b.source) || a.externalRunId.localeCompare(b.externalRunId)),
    unsafeCount: unsafe.length,
    samples: {
      eligible: take("eligible"),
      skipped: take("skipped"),
      expired: take("expired"),
      invalid: take("invalid"),
      unsafe: unsafe.slice(0, 5),
    },
    blockers,
  };
}
