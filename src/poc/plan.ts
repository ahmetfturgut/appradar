import { createHash } from "node:crypto";
import { z } from "zod";

export const Provider = z.enum(["subimpact", "aurelix", "thewolves", "aurelixplayreviews", "datatrail", "asokeyword"]);
export const Store = z.enum(["ios", "play"]);
export type Provider = z.infer<typeof Provider>;
export type Store = z.infer<typeof Store>;

export const sources = {
  subimpact: { actor: "subimpact~app-store-scraper", actorId: "cbSMPmaUHdY8NGIfS", build: "0.1.1", buildId: "NHjJXD6Nrjf8MpxN1" },
  aurelix: { actor: "aurelix~app-store-google-play-scraper", actorId: "wI26HiER6vwANfcVs", build: "0.2.23", buildId: "Jv44m9YSKPnrplU1T" },
  // iOS App Store reviews only; not part of the details/search/charts matrix.
  thewolves: { actor: "thewolves~appstore-reviews-scraper", actorId: "4qRgh5vXXsv0bKa1l", build: "0.0.1057", buildId: "MHfNUQWkb1bIq1UKN" },
  // Paginated Google Play reviews only; main Aurelix actor remains ~20 public-page reviews.
  aurelixplayreviews: { actor: "aurelix~google-play-reviews-scraper", actorId: "iD7roBA32ueErH8qD", build: "0.1.8", buildId: "w3YTTu8Bd7IY6z2uU" },
  // Apple official new-apps charts (not in Aurelix/Subimpact enums). Play "new apps" chart not offered.
  datatrail: { actor: "datatrail~app-store-google-play-charts", actorId: "tKFe5g7p3PeBBfVhW", build: "0.1.7", buildId: "oKsySVUZf5K5p2o1U" },
  // ASO keyword popularity/difficulty/rank rows; not app-catalog search (Subimpact).
  asokeyword: { actor: "petersutarik~aso-keyword-intel", actorId: "w4WTaae6mpu8tDtRo", build: "0.2.5", buildId: "9ton1HLQZxcwZx6Jy" },
} as const;

// Kimliklerin hedef ülkelerde erişilebilirliği POC'nin bir sonucudur; önceden doğrulanmış değildir.
export const sample = {
  ios: ["389801252", "324684580", "310633997", "570060128", "1212616790", "284882215", "6448311069", "479516143", "425073498", "310636983"],
  play: ["com.instagram.android", "com.spotify.music", "com.whatsapp", "com.duolingo", "com.microsoft.todos", "com.facebook.katana", "com.openai.chatgpt", "com.mojang.minecraftpe", "com.teslacoilsw.launcher.prime", "com.tbig.playerpro"],
} as const;

export const Job = z.object({
  id: z.string().regex(/^[a-f0-9]{20}$/),
  provider: Provider,
  store: Store,
  country: z.enum(["TR", "US"]),
  requestedLanguage: z.enum(["tr", "en"]),
  round: z.union([z.literal(1), z.literal(2)]),
  mode: z.enum(["details", "search", "charts", "developers", "reviews", "keywords", "negative"]),
  context: z.string(),
  expectedIds: z.array(z.string()),
  maxResults: z.number().int().min(1).max(100),
  maxChargeUsd: z.literal(0.05),
  input: z.record(z.string(), z.unknown()),
});
export type Job = z.infer<typeof Job>;

export function stableHash(value: unknown): string {
  function canonical(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
    return input;
  }
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function createPlan(): Job[] {
  const jobs: Job[] = [];
  for (const round of [1, 2] as const) {
    for (const country of ["TR", "US"] as const) {
      const language = country === "TR" ? "tr" : "en";
      for (const store of ["ios", "play"] as const) {
        for (const provider of ["subimpact", "aurelix"] as const) {
          const add = (mode: Job["mode"], context: string, ids: string[], input: Job["input"], maxResults = 20) => {
            const values = { provider, store, country, requestedLanguage: language, round, mode, context, expectedIds: ids, input, maxResults, maxChargeUsd: 0.05 };
            jobs.push(Job.parse({ ...values, id: stableHash(values).slice(0, 20) }));
          };
          const detailsInput = (ids: string[]) => provider === "subimpact"
            ? { mode: "details", store, appIds: ids, country: country.toLowerCase(), language, maxItems: ids.length, fullDetails: true, proxy: { useApifyProxy: false } }
            : { apps: ids, countries: [country.toLowerCase()], language, maxReviewsPerApp: 0, developers: [], appStoreCharts: [], onlyNewReviews: false, proxyConfiguration: { useApifyProxy: false } };

          const ids = [...sample[store]];
          add("details", "sample", ids, detailsInput(ids), 10);
          // En az üç bağımsız negatif koşu: her sağlayıcı + mağaza için geçersiz kimlik.
          if (country === "US") {
            const invalid = [store === "ios" ? "999999999999999999" : "invalid.appradar.nonexistent.application"];
            add("negative", "unknown-id", invalid, detailsInput(invalid), 1);
          }
          if (provider === "subimpact") {
            for (const query of ["todo", "photo editor"]) {
              add("search", query, [], { mode: "search", store, searchTerms: [query], country: country.toLowerCase(), language, maxItems: 20, fullDetails: true, proxy: { useApifyProxy: false } });
            }
          }
          if (provider === "subimpact" || store === "ios") {
            for (const chart of ["topFree", "topPaid", "topGrossing"] as const) {
              const chartNames = { topFree: "top-free", topPaid: "top-paid", topGrossing: "top-grossing" };
              const input = provider === "subimpact"
                ? { mode: "charts", store, country: country.toLowerCase(), language, chartCollection: chart, iosGenreId: "6007", playCategory: "PRODUCTIVITY", maxItems: 20, fullDetails: true, proxy: { useApifyProxy: false } }
                : { apps: [], developers: [], appStoreCharts: [chartNames[chart]], chartGenre: "6007", countries: [country.toLowerCase()], language, maxAppsPerList: 20, maxReviewsPerApp: 0, proxyConfiguration: { useApifyProxy: false } };
              add("charts", chart, [], input);
            }
          }
        }
      }
    }
  }
  return jobs;
}

export function planSummary(jobs = createPlan()) {
  return {
    jobs: jobs.length,
    uniqueSampleApps: sample.ios.length + sample.play.length,
    detailObservations: jobs.filter(j => j.mode === "details").reduce((n, j) => n + j.expectedIds.length, 0),
    reservedCeilingUsd: Number((jobs.length * 0.05).toFixed(2)),
    approvedPocLimitUsd: 5,
    liveRunsStarted: 0,
    note: "Plan; canlı veri veya fiyat doğrulaması değildir. İkinci tur ayrı çalıştırılır.",
  };
}
