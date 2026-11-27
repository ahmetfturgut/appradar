// Collection settings. Everything that spends money or schedules work is off unless stated explicitly.
import { z } from "zod";
import { Provider, Store } from "../../poc/plan.ts";
import { dataUseAuthorizationClosed } from "./authorization.ts";

export const CollectionMode = z.enum(["details", "search", "charts", "developers", "reviews", "keywords"]);
export type CollectionMode = z.infer<typeof CollectionMode>;

export const Target = z.strictObject({
  store: Store,
  country: z.enum(["TR", "US"]),
  language: z.enum(["tr", "en"]).optional(),
  /** details: store app ids. reviews: exactly one id. */
  appIds: z.array(z.string().min(1)).min(1).max(100).optional(),
  /** search term or keyword. */
  term: z.string().trim().min(1).max(100).optional(),
  /** charts: topFree | topPaid | topGrossing, or newFreeApps | newPaidApps (datatrail). */
  chart: z.string().optional(),
  category: z.string().optional(),
  /** developers: store developer page URL and its id. */
  developer: z.strictObject({ id: z.string().min(1), url: z.url() }).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
});
export type Target = z.infer<typeof Target>;

const Schedule = z.strictObject({
  provider: Provider,
  mode: CollectionMode,
  everyMinutes: z.number().int().min(60).max(60 * 24 * 31),
  enabled: z.boolean().default(false),
  targets: z.array(Target).min(1),
});
export type Schedule = z.infer<typeof Schedule>;

export const CollectionConfig = z.strictObject({
  schedulingEnabled: z.boolean().default(false),
  /** No default on purpose: retention is a product decision. Execution is refused while null. */
  retentionDays: z.number().int().min(1).max(730).nullable().default(null),
  maxAttempts: z.number().int().min(1).max(3).default(2),
  schedules: z.array(Schedule).default([]).refine(
    list => new Set(list.map(s => `${s.provider}/${s.mode}`)).size === list.length, "one schedule per provider and mode"),
});
export type CollectionConfig = z.infer<typeof CollectionConfig>;

const limitPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;

/** Explicit USD limit. Empty, negative and non-numeric values are missing. Zero is configured. */
export function configuredBudgetLimits(env: Record<string, string | undefined>): { dailyUsd: number; monthlyUsd: number } | null {
  const parse = (value: string | undefined) => {
    if (value == null || !limitPattern.test(value.trim())) return null;
    const amount = Number(value.trim());
    return Number.isFinite(amount) ? amount : null;
  };
  const dailyUsd = parse(env.DAILY_LIMIT_USD);
  const monthlyUsd = parse(env.MONTHLY_LIMIT_USD);
  if (dailyUsd == null || monthlyUsd == null) return null;
  return { dailyUsd, monthlyUsd };
}

/** Reasons paid execution is closed. Separate from the POC flags so an existing .env cannot open the engine. */
export function closedGates(env: Record<string, string | undefined>, config: CollectionConfig): string[] {
  const reasons: string[] = [];
  for (const name of ["COLLECTION_PAID_EXECUTION", "APIFY_COLLECTION_ENABLED"] as const) {
    if (env[name] !== "true") reasons.push(`${name}_not_true`);
  }
  if (!env.APIFY_TOKEN?.trim()) reasons.push("APIFY_TOKEN_missing");
  if (config.retentionDays == null) reasons.push("retentionDays_not_configured");
  if (configuredBudgetLimits(env) == null) reasons.push("budget_limits_missing");
  reasons.push(...dataUseAuthorizationClosed(env, config));
  return reasons;
}
