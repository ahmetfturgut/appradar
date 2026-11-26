// Pure watchlist and comparison rules (P3). No IO, no Next.js imports: unit-testable.
import { z } from "zod";

export const WATCHLIST_LIMIT = 50;
export const COMPARE_MAX = 3;
export const COMPARE_MIN = 2;

const uuid = z.string().regex(/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i).transform(v => v.toLowerCase());
export const Country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
export const Language = z.string().trim().max(35).regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/);

/** A saved app is a canonical app in one listing context; store follows from the app. */
export const WatchItemInput = z.object({ appId: uuid, country: Country, language: Language });
export type WatchKey = z.output<typeof WatchItemInput>;
export interface WatchItem extends WatchKey { createdAt: string }
export const watchKey = (k: WatchKey) => `${k.appId}|${k.country}|${k.language}`;

/* -------------------------------------------- development demo (browser cookie, never Supabase) */

export const DEMO_WATCHLIST_COOKIE = "appradar_demo_watchlist";
/** Compact cookie format: appId|country|language|createdAtEpochSeconds, comma separated. Invalid parts are dropped. */
export function parseDemoWatchlist(raw: string | undefined | null): WatchItem[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: WatchItem[] = [];
  for (const part of raw.split(",").slice(0, WATCHLIST_LIMIT)) {
    const [appId, country, language, epoch] = part.split("|");
    const parsed = WatchItemInput.safeParse({ appId, country, language });
    const seconds = Number(epoch);
    if (!parsed.success || !Number.isSafeInteger(seconds) || seconds <= 0 || seen.has(watchKey(parsed.data))) continue;
    seen.add(watchKey(parsed.data));
    out.push({ ...parsed.data, createdAt: new Date(seconds * 1000).toISOString() });
  }
  return out;
}
export const serializeDemoWatchlist = (items: readonly WatchItem[]) =>
  items.slice(0, WATCHLIST_LIMIT).map(i => `${i.appId}|${i.country}|${i.language}|${Math.floor(Date.parse(i.createdAt) / 1000)}`).join(",");

export type AddOutcome = "added" | "duplicate" | "limit" | "invalid" | "unavailable";
/** In-memory add with the same rules as the database (duplicate, capacity). Newest first. */
export function addItem(items: readonly WatchItem[], key: WatchKey, now: Date): { items: WatchItem[]; outcome: AddOutcome } {
  if (items.some(i => watchKey(i) === watchKey(key))) return { items: [...items], outcome: "duplicate" };
  if (items.length >= WATCHLIST_LIMIT) return { items: [...items], outcome: "limit" };
  return { items: [{ ...key, createdAt: now.toISOString() }, ...items], outcome: "added" };
}
export const removeItem = (items: readonly WatchItem[], key: WatchKey) => items.filter(i => watchKey(i) !== watchKey(key));

/* -------------------------------------------- comparison URL state */

export type CompareSelection =
  | { ok: true; ids: string[]; duplicatesRemoved: number }
  | { ok: false; error: "invalid_id" | "too_many" };

/** `apps` is a comma-separated list of canonical app ids. Duplicates are dropped; >3 or malformed ids are rejected. */
export function parseCompareIds(raw: string | undefined | null): CompareSelection {
  const parts = (raw ?? "").split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length > 10) return { ok: false, error: "too_many" };
  const ids: string[] = [];
  for (const part of parts) {
    const parsed = uuid.safeParse(part);
    if (!parsed.success) return { ok: false, error: "invalid_id" };
    if (!ids.includes(parsed.data)) ids.push(parsed.data);
  }
  if (ids.length > COMPARE_MAX) return { ok: false, error: "too_many" };
  return { ok: true, ids, duplicatesRemoved: parts.length - ids.length };
}

/** Adds an app to a selection: no duplicates, never more than three. */
export function addToSelection(ids: readonly string[], id: string): { ids: string[]; outcome: "added" | "duplicate" | "full" } {
  if (ids.includes(id)) return { ids: [...ids], outcome: "duplicate" };
  if (ids.length >= COMPARE_MAX) return { ids: [...ids], outcome: "full" };
  return { ids: [...ids, id], outcome: "added" };
}

export const COMPARE_COOKIE = "appradar_compare";
/** Last selection per browser, used only to append from Explorer / App Details. The URL stays the source of truth. */
export function parseCompareCookie(raw: string | undefined | null): { country: string; language: string; ids: string[] } | null {
  if (!raw) return null;
  const [country, language, list] = raw.split("~");
  const c = Country.safeParse(country), l = Language.safeParse(language), ids = parseCompareIds(list);
  return c.success && l.success && ids.ok ? { country: c.data, language: l.data, ids: ids.ids } : null;
}
export const serializeCompareCookie = (country: string, language: string, ids: readonly string[]) => `${country}~${language}~${ids.join(",")}`;
