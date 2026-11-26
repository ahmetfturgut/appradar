// Retention policy file. There are no code defaults: every category must be written out,
// and anything missing or unrecognised refuses the whole run.
import { z } from "zod";
import { Provider } from "../../poc/plan.ts";

const Days = z.number().int().min(1).max(730);

/** Categories that can also be limited per provider. */
const providerCategories = {
  listing_current: Days,
  app_snapshots: Days,
  discovery_history: Days,
  keyword_history: Days,
  reviews: Days,
  collection_jobs: Days,
  provider_runs: Days,
};

export const RetentionPolicy = z.strictObject({
  version: z.literal(1),
  categories: z.strictObject({ ...providerCategories, budget_records: Days }),
  /** A provider entry replaces the category limit for that provider's rows. */
  providers: z.partialRecord(Provider, z.strictObject(providerCategories).partial()),
  /** null = planning draft: dry runs only. Filled in by the operator after a human decision. */
  approval: z.strictObject({
    approvedBy: z.string().trim().min(1).max(100),
    approvedAt: z.iso.datetime({ offset: true }),
    evidence: z.string().trim().min(12).max(500),
  }).nullable(),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicy>;

export function parsePolicy(text: string): RetentionPolicy {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("retention_policy_invalid:json");
  }
  const parsed = RetentionPolicy.safeParse(value);
  if (!parsed.success) {
    // Field paths only: a policy file may hold names or notes that do not belong in logs.
    const paths = [...new Set(parsed.error.issues.map(issue => issue.path.join(".") || "root"))];
    throw new Error(`retention_policy_invalid:${paths.join(",")}`);
  }
  return parsed.data;
}

/** Reasons destructive execution is closed. Dry runs ignore these. */
export function executionBlocks(env: Record<string, string | undefined>, policy: RetentionPolicy): string[] {
  const reasons: string[] = [];
  if (env.RETENTION_CLEANUP_EXECUTION !== "true") reasons.push("RETENTION_CLEANUP_EXECUTION_not_true");
  if (policy.approval == null) reasons.push("policy_not_approved");
  return reasons;
}
