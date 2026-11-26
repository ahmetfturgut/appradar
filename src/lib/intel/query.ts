// Validated URL filters for the ranking pages. Invalid values raise QueryError (shown as a reset notice).
import { queryValue, QueryError, type SearchValues } from "../../components/core/catalog-query";
import type { Horizon } from "./ranking";

export function parseChartFilters(params: SearchValues) {
  const horizon = queryValue(params, "horizon") ?? "1d";
  const category = queryValue(params, "category")?.trim() || undefined;
  const chart = queryValue(params, "chart")?.trim() || undefined;
  const series = queryValue(params, "series") || undefined;
  if (!["1d", "7d", "30d"].includes(horizon) || (category && category.length > 100) || (chart && chart.length > 100) || (series && !/^[a-z0-9]{1,13}$/.test(series))) throw new QueryError("Invalid chart filters");
  return { horizon: horizon as Horizon, ...(category ? { category } : {}), ...(chart ? { chart } : {}), ...(series ? { series } : {}) };
}

/** Known-release filters: store (iOS default), listing category name, window in days, page. */
export function parseReleaseFilters(params: SearchValues) {
  const store = queryValue(params, "releaseStore") ?? "ios";
  const category = queryValue(params, "releaseCategory")?.trim() || undefined;
  const days = Number(queryValue(params, "days") ?? "30");
  const page = Number(queryValue(params, "page") ?? "1");
  if (!["ios", "play"].includes(store) || ![7, 30, 90].includes(days) || !Number.isSafeInteger(page) || page < 1 || page > 500 || (category && category.length > 100)) throw new QueryError("Invalid release filters");
  return { store: store as "ios" | "play", days, page, ...(category ? { category } : {}) };
}

/** A cohort is always one requested-language context; default to the country's primary demo/collection language. */
export const defaultLanguage = (country: string) => country === "TR" ? "tr" : "en";

export function parseMarketFilters(params: SearchValues) {
  const cohort = queryValue(params, "cohort") ?? "category";
  const category = queryValue(params, "category")?.trim() || undefined;
  const series = queryValue(params, "series") || undefined;
  if (!["category", "chart"].includes(cohort) || (category && category.length > 100) || (series && !/^[a-z0-9]{1,13}$/.test(series))) throw new QueryError("Invalid market filters");
  return { cohort: cohort as "category" | "chart", ...(category ? { category } : {}), ...(series ? { series } : {}) };
}
