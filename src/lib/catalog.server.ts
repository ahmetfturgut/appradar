import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PocJournal } from "../poc/journal";
import { createPlan } from "../poc/plan";
import { demoApps, categories } from "./demo-data";
import { buildLiveApps, type Catalog } from "./live-catalog";

export async function getCatalog(directory = process.cwd(), now = Date.now()): Promise<Catalog> {
  const base: Catalog = { mode: "unavailable", apps: [], categories: [], latestCollectedAt: null, observationCount: 0, missingObservations: 0, observedUsageUsd: null, completedRuns: 0, sourceLabel: "Apify", error: null };
  if (!existsSync(resolve(directory, ".poc/state.json")) && !existsSync(resolve(directory, ".poc/local-scope.json"))) {
    return { ...base, mode: "demo", apps: demoApps, categories: [...categories], sourceLabel: "Sentetik demo" };
  }
  try {
    const journal = new PocJournal(resolve(directory, ".poc"));
    await journal.load();
    const entries = Object.values(journal.state.entries).filter(entry => entry.status === "complete");
    const observations = entries.flatMap(entry => Object.values(entry.results).flatMap(result => result.kind === "valid" ? [result.observation] : []));
    const apps = buildLiveApps(observations, now);
    const plan = createPlan();
    const missing = entries.reduce((total, entry) => {
      const job = plan.find(j => j.id === entry.jobId);
      if (job?.mode !== "details") return total;
      const delivered = new Set(Object.values(entry.results).flatMap(r => r.kind === "valid" ? [r.observation.storeAppId] : []));
      return total + job.expectedIds.filter(id => !delivered.has(id)).length;
    }, 0);
    const costs = entries.map(e => e.run?.usageTotalUsd);
    const sources = new Set(observations.map(o => o.source));
    return { ...base, mode: apps.length ? "live" : "unavailable", apps, categories: [...new Set(apps.map(a => a.category).filter(c => c !== "Kategori verisi yok"))].sort((a, b) => a.localeCompare(b, "tr")), latestCollectedAt: observations.map(o => o.collectedAt).sort().at(-1) ?? null, observationCount: observations.length, missingObservations: missing, observedUsageUsd: costs.length && costs.every(c => c != null) ? costs.reduce<number>((n, c) => n + (c ?? 0), 0) : null, completedRuns: entries.length, sourceLabel: sources.size === 1 ? `Apify · ${sources.has("aurelix") ? "Aurelix" : "Subimpact"}` : "Apify", error: apps.length ? null : "Gösterilebilecek güncel ve doğrulanmış kayıt henüz yok." };
  } catch {
    // Never fall back to synthetic measurements after live collection has begun.
    return { ...base, error: "Yerel veri kaydı okunamadı. Kaynak durumunu kontrol et." };
  }
}
