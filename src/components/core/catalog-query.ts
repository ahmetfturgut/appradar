import { scopeQuery, sortLabels, type ExplorerFilters, type Scope } from "./view-models";
export type SearchValues = Record<string, string | string[] | undefined>;
export class QueryError extends Error { readonly code = "invalid_input"; }
export function queryValue(params: SearchValues, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) throw new QueryError("Duplicate filter");
  return value;
}
export function parseScope(params: SearchValues): Scope {
  const country = (queryValue(params, "country") ?? "US").trim().toUpperCase();
  const language = queryValue(params, "language")?.trim();
  const store = queryValue(params, "store");
  if (!/^[A-Z]{2}$/.test(country) || language && (!/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(language) || language.length > 35) || store && !["all", "ios", "play"].includes(store)) throw new QueryError("Invalid context");
  return { country, ...(language ? { language } : {}), ...(store === "ios" || store === "play" ? { store } : {}) };
}
export function parsePage(params: SearchValues, key = "page", max = 1251): number {
  const raw = queryValue(params, key) ?? "1";
  const page = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(page) || page < 1 || page > max) throw new QueryError("Invalid page");
  return page;
}
export function parseExplorer(params: SearchValues): ExplorerFilters {
  const scope = parseScope(params), q = queryValue(params, "q") ?? "", category = queryValue(params, "category") ?? "all";
  const rawSort = queryValue(params, "sort") ?? "ratingCount";
  const sort = rawSort === "released" ? "releasedAt" : rawSort;
  const direction = queryValue(params, "direction") ?? "desc";
  const price = queryValue(params, "price") ?? "any";
  if (!Object.hasOwn(sortLabels, sort) || !["asc", "desc"].includes(direction) || !["any", "free", "paid"].includes(price) || q.length > 100 || category.length > 100 || !category.trim()) throw new QueryError("Invalid filters");
  return { ...scope, q, category, price: price as ExplorerFilters["price"], sort: sort as ExplorerFilters["sort"], direction: direction as "asc" | "desc", page: parsePage(params), pageSize: 8 };
}
export function contextResetHref(path: string, params: SearchValues): string {
  try { return `${path}?${scopeQuery(parseScope(params))}`; } catch { return path; }
}
export function readFailure(error: unknown): { state: "unavailable" | "error"; message: string } {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "catalog_display_closed") return { state: "unavailable", message: "Catalog data is not available in this deployment. No sample data is substituted." };
  if (code === "supabase_not_configured") return { state: "unavailable", message: "The data source is not configured on the server. No sample data is substituted." };
  if (code === "read_function_unavailable" || /read_rejected_(PGRST20[025]|42P01|42703|404)$/.test(code)) return { state: "unavailable", message: "The required read schema or functions are unavailable. The pending T8 migration must be applied by the backend team." };
  if (code === "invalid_input" || code === "page_out_of_range") return { state: "error", message: "These filters or this page are not supported. Check the URL or clear the filters." };
  if (code === "history_window_too_large") return { state: "unavailable", message: "This history window exceeds the read service limit. No partial series is shown." };
  return { state: "error", message: "The data could not be loaded. Please try again. No sample data is substituted." };
}
