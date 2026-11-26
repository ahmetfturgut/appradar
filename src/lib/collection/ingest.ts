// Hands an assessed dataset to the T4-T7 services. They are idempotent, so a resumed job repeats them safely.
import { persistAppObservations } from "../persistence/apps.ts";
import { persistDiscovery } from "../persistence/discovery.ts";
import { persistKeywords } from "../persistence/keywords.ts";
import { persistReviews } from "../persistence/reviews.ts";
import type { Rpc } from "../persistence/rpc.ts";
import type { Assessment } from "./dataset.ts";

export async function persistAssessment(rpc: Rpc, assessment: Assessment, collectedAt: string, retentionDays: number) {
  const options = { expiresAt: new Date(Date.parse(collectedAt) + retentionDays * 86400000).toISOString() };
  const results = [];
  const { apps, reviews, keywords, verdict } = assessment;
  if (verdict === "rejected") return { conflicts: 0 };
  // Each call receives every valid row of the run: list and keyword snapshots are written once.
  if (apps.length && verdict === "accepted") results.push(await persistAppObservations(rpc, apps, options));
  if (apps.length) results.push(await persistDiscovery(rpc, apps, options));
  if (reviews.length) results.push(await persistReviews(rpc, reviews, options));
  if (keywords.length) results.push(await persistKeywords(rpc, keywords, options));
  return { conflicts: results.reduce((n, r) => n + r.conflicts, 0) };
}
