import { computeIndicators, type MarketApp } from "../intel/market.ts";

/** Original public fixtures, independent of the development catalog and its authorization flags. */
export const EXAMPLE_OBSERVED_AT = "2026-11-01T12:00:00.000Z";
export const EXAMPLE_NOW = Date.parse(EXAMPLE_OBSERVED_AT);
export const SCENARIO_IDS = ["habits", "budgets", "focus"] as const;
export type ScenarioId = typeof SCENARIO_IDS[number];
export const INDICATOR_KEYS = ["qualityGap", "neglected", "newcomers", "concentration", "incumbentStrength", "pricing"] as const;

const settings: Record<ScenarioId, { size: number; low: number; old: number; newFrom: number; free: number; names: readonly string[] }> = {
  habits: { size: 24, low: 8, old: 9, newFrom: 15, free: 18, names: ["Habit Meadow", "Daily Grove", "Little Ritual"] },
  budgets: { size: 18, low: 4, old: 5, newFrom: 10, free: 11, names: ["Pocket Ledger", "Budget Harbor", "Penny Trail"] },
  focus: { size: 24, low: 7, old: 6, newFrom: 17, free: 15, names: ["Focus Field", "Quiet Interval", "Minute Garden"] },
};
const daysBefore = (days: number) => new Date(EXAMPLE_NOW - days * 86_400_000).toISOString();

function makeScenario(id: ScenarioId): readonly MarketApp[] {
  const s = settings[id];
  return Array.from({ length: s.size }, (_, i): MarketApp => {
    const missing = i === 2;
    const sparse = id === "focus" && i >= 14;
    const priceMissing = missing || i === s.size - 1;
    const developer = i < 6 ? 0 : i < 10 ? 1 : i < 13 ? 2 : i;
    return {
      appId: `synthetic-${id}-${i + 1}`, listingId: i + 1,
      name: s.names[i] ?? `Example ${id} app ${i + 1}`,
      store: "ios", country: "US", requestedLanguage: "en", category: "Synthetic scenario",
      developerId: missing ? null : `synthetic-${id}-maker-${developer}`,
      developerName: missing ? null : `Example maker ${developer + 1}`,
      rating: missing || sparse ? null : i === 1 ? 4.6 : i < s.low ? 3.4 + (i % 3) * 0.2 : 4.2 + (i % 3) * 0.2,
      ratingCount: missing || sparse ? null : i === 0 ? 840 : i === 1 ? 2100 : 300 + i * 170,
      price: priceMissing ? { amount: null, currency: null, isFree: null }
        : { amount: i < s.free ? 0 : 1.99 + (i % 3), currency: "USD", isFree: i < s.free },
      releasedAt: missing ? null : daysBefore(i >= s.newFrom ? 50 + i * 3 : 900 + i * 10),
      storeUpdatedAt: missing || sparse ? null : daysBefore(i === 1 ? 35 : i < s.old ? 450 + i * 8 : 20 + i),
      lastObservedAt: EXAMPLE_OBSERVED_AT,
    };
  });
}

const scenarios = Object.fromEntries(SCENARIO_IDS.map(id => [id, makeScenario(id)])) as Record<ScenarioId, readonly MarketApp[]>;

/** Fixed clock, no random values, I/O, provider, database, or real app identifiers. */
export function marketCheck(id: ScenarioId, limitedUpdates = false) {
  // Four known dates: deliberately below the existing minimum. Other evidence stays unchanged.
  const apps = scenarios[id].map((app, i) => limitedUpdates && ![0, 1, 3, 4].includes(i)
    ? { ...app, storeUpdatedAt: null } : { ...app });
  return { apps, indicators: computeIndicators(apps, EXAMPLE_NOW), comparison: apps.slice(0, 3) };
}
