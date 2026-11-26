/**
 * Synthetic, deterministic chart history for the development demo only.
 * Loaded exclusively through demo-catalog.ts after the NODE_ENV=development + APPRADAR_DEMO_MODE check.
 * Every snapshot is invented; nothing here is written to Supabase or fetched from a store.
 *
 * Scenarios (country/language specific, mirrored for every demo context):
 *  1. iOS Top Free · 6007, depth 20: 35 daily snapshots, one missing day (6 days ago), one truncated run (3 days ago),
 *     rising/falling apps and entries that come and go.
 *  2. Play Top Free · PRODUCTIVITY: depth 20 until 10 days ago, depth 50 afterwards → 30-day change unavailable.
 *  3. iOS Top Paid · 6007: two snapshots three hours apart → insufficient history for every horizon.
 *  4. Play Top Free · HEALTH_AND_FITNESS: newest run lost invalid rows (partial) → excluded; older days still comparable.
 *  5. iOS New Free Apps · 6007, depth 10: 14 daily snapshots; an app only appears on or after its demo release day.
 *  6. iOS Top Free · 6000: runs without provenance (unverified) → nothing is comparable.
 */
import type { SnapshotFacts, SnapshotWithEntries } from "../intel/ranking.ts";

export const DEMO_CHART_SOURCE = "Synthetic development demo";
const HOUR = 3_600_000;

interface Plan {
  kind: "chart" | "new_apps"; store: "ios" | "play"; context: string; category: string;
  days: number[]; depthFor: (day: number) => number; pool: number[];
  /** Optional per-day pool filter (new-app lists only contain apps already released that day). */
  availableOn?: (app: number, day: number) => boolean;
  override?: (day: number) => Partial<SnapshotFacts>; hourOffset?: (day: number) => number;
}

/** Deterministic score; higher ranks first. Slopes make some apps rise and others fall over time. */
function rankFor(pool: number[], day: number, depth: number, salt: number): { appId: number; position: number }[] {
  const scored = pool.map(app => {
    const slope = [0.9, -0.7, 0.35, -0.25, 0, 0.6, -0.5, 0.15][(app + salt) % 8]!;
    const wobble = Math.sin(app * 12.9898 + day * 4.1 + salt) * 1.6;
    return { app, score: 40 - ((app * 7 + salt) % 29) + slope * (35 - day) * 0.6 + wobble };
  }).sort((a, b) => b.score - a.score || a.app - b.app);
  return scored.slice(0, depth).map((s, i) => ({ appId: s.app, position: i + 1 }));
}

export function demoChartSnapshots(opts: { now: number; country: string; language: string; idFor: (index: number) => string; recentIos: number[]; releaseAgeDays: (index: number) => number }): SnapshotWithEntries[] {
  const { now, country, language, idFor } = opts;
  const iosPool = Array.from({ length: 40 }, (_, i) => i);          // demo iOS apps 0..39
  const playPool = Array.from({ length: 55 }, (_, i) => 60 + i);    // demo Play apps 60..114
  const daily = (n: number) => Array.from({ length: n }, (_, i) => i);
  const plans: Plan[] = [
    { kind: "chart", store: "ios", context: "topFree", category: "6007", days: daily(35).filter(d => d !== 6), depthFor: () => 20, pool: iosPool,
      override: d => d === 3 ? { coverageStatus: "truncated", runTruncated: true, runValidationStatus: "truncated", entryCount: 12 } : {} },
    { kind: "chart", store: "play", context: "topFree", category: "PRODUCTIVITY", days: daily(35), depthFor: d => d >= 10 ? 20 : 50, pool: playPool },
    { kind: "chart", store: "ios", context: "topPaid", category: "6007", days: [0, 0], depthFor: () => 10, pool: iosPool, hourOffset: () => 0 },
    { kind: "chart", store: "play", context: "topFree", category: "HEALTH_AND_FITNESS", days: daily(20), depthFor: () => 15, pool: playPool,
      override: d => d === 0 ? { coverageStatus: "partial", runIncompleteReason: "dataset_has_invalid_rows", entryCount: 13 } : {} },
    { kind: "new_apps", store: "ios", context: "newFreeApps", category: "6007", days: daily(14), depthFor: () => 10, pool: opts.recentIos, availableOn: (app, day) => opts.releaseAgeDays(app) >= day },
    { kind: "chart", store: "ios", context: "topFree", category: "6000", days: daily(8), depthFor: () => 20, pool: iosPool,
      override: () => ({ runValidationStatus: null, runTruncated: null, runCollectionMode: null, requestedDepth: null }) },
  ];
  const contextSalt = (country + language).split("").reduce((n, c) => n + c.charCodeAt(0), 0) % 7;
  let id = 900_000 + contextSalt * 10_000;
  const out: SnapshotWithEntries[] = [];
  plans.forEach((plan, p) => {
    plan.days.forEach((day, n) => {
      const depth = plan.depthFor(day);
      // Scenario 3 puts its two snapshots 3 hours apart; every other list is collected ~03:00 hours ago each day.
      const hours = plan.hourOffset ? 3 + n * 3 : 3 + (day % 3) * 0.25;
      const observedAt = new Date(now - day * 24 * HOUR - hours * HOUR).toISOString();
      const ranked = rankFor(plan.availableOn ? plan.pool.filter(app => plan.availableOn!(app, day)) : plan.pool, day, depth, p + contextSalt);
      const base: SnapshotFacts = {
        id: id++, kind: plan.kind, source: DEMO_CHART_SOURCE, sourceBuild: "demo-v1", store: plan.store, country, requestedLanguage: language,
        context: plan.context, category: plan.category, coverageStatus: "bounded", entryCount: depth, observedAt, observedTimeBasis: "collection",
        runValidationStatus: "accepted", runTruncated: false, runIncompleteReason: null, runCollectionMode: "charts", requestedDepth: depth,
      };
      // A list can only hold as many apps as exist; the stored count is what was received.
      const facts = { ...base, entryCount: Math.min(depth, ranked.length), ...(plan.override?.(day) ?? {}) };
      out.push({ ...facts, entries: ranked.slice(0, facts.entryCount).map(r => ({ appId: idFor(r.appId), position: r.position })) });
    });
  });
  return out;
}
