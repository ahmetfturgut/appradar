import "server-only";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { createSupabaseServerClient, requireUser } from "../auth/server";
import { isDevelopmentDemo } from "../ui/demo-mode";
import { appRankingsData, listingsForContexts } from "../ui/catalog.server";
import type { ListingSummary } from "../read/shared";
import type { AppRankingSeries } from "../intel/views";
import { watchKey, DEMO_WATCHLIST_COOKIE, WATCHLIST_LIMIT, addItem, parseDemoWatchlist, removeItem, serializeDemoWatchlist, type AddOutcome, type WatchItem, type WatchKey } from "./model";

/**
 * Watchlist storage.
 *  - "account": the signed-in user's rows in public.watchlist_items, read and written with the user's own
 *    Supabase session (publishable key + JWT). RLS restricts every statement to user_id = auth.uid();
 *    the user id below comes from the verified session (getUser), never from client input.
 *  - "demo": NODE_ENV=development + APPRADAR_DEMO_MODE=true only. A browser cookie; never Supabase,
 *    never mixed with account rows. Production never reaches this branch.
 * Saving never starts collection: no job or provider call exists on this path.
 */
export interface WatchlistStore {
  mode: "account" | "demo";
  list(): Promise<WatchItem[]>;
  add(key: WatchKey): Promise<AddOutcome>;
  remove(key: WatchKey): Promise<void>;
}

export class WatchlistUnavailable extends Error { constructor(readonly code: string) { super(code); } }

export async function getWatchlistStore(nextPath = "/watchlist"): Promise<WatchlistStore> {
  if (isDevelopmentDemo()) return demoStore();
  const user = await requireUser(nextPath);
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new WatchlistUnavailable("auth_not_configured");
  return accountStore(supabase, user.id);
}

/**
 * Rows of the signed-in user. `client` must carry the user's session (publishable key + JWT) so RLS applies;
 * `userId` must come from the verified session. Every query also filters by user_id explicitly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal surface of the Supabase query builder
export function accountStore(client: { from: (table: string) => any }, userId: string): WatchlistStore {
  const table = () => client.from("watchlist_items");
  const user = { id: userId };
  return {
    mode: "account",
    async list() {
      const { data, error } = await table().select("app_id,country,requested_language,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(WATCHLIST_LIMIT);
      if (error) throw new WatchlistUnavailable(error.code ?? "watchlist_read_failed");
      return ((data ?? []) as Record<string, unknown>[]).map(r => ({ appId: String(r.app_id), country: String(r.country), language: String(r.requested_language), createdAt: String(r.created_at) }));
    },
    async add(key) {
      const { error } = await table().insert({ user_id: user.id, app_id: key.appId, country: key.country, requested_language: key.language });
      if (!error) return "added";
      if (error.code === "23505") return "duplicate";
      if (error.message?.includes("watchlist_limit_reached")) return "limit";
      if (error.code === "23503") return "invalid";
      return "unavailable";
    },
    async remove(key) {
      const { error } = await table().delete().eq("user_id", user.id).eq("app_id", key.appId).eq("country", key.country).eq("requested_language", key.language);
      if (error) throw new WatchlistUnavailable(error.code ?? "watchlist_delete_failed");
    },
  };
}

function demoStore(): WatchlistStore {
  const read = async () => parseDemoWatchlist((await cookies()).get(DEMO_WATCHLIST_COOKIE)?.value);
  const write = async (items: WatchItem[]) => (await cookies()).set(DEMO_WATCHLIST_COOKIE, serializeDemoWatchlist(items), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return {
    mode: "demo",
    list: read,
    async add(key) { const result = addItem(await read(), key, new Date()); if (result.outcome === "added") await write(result.items); return result.outcome; },
    async remove(key) { await write(removeItem(await read(), key)); },
  };
}

/* -------------------------------------------------------------------- watchlist page data */

export interface WatchRow {
  item: WatchItem;
  listing: ListingSummary | null;
  /** Best current chart position among the app's series, with its comparable 1-day change. */
  ranking: { series: AppRankingSeries; position: number; change1d: number | null } | null;
  rankingsAvailable: boolean;
}

/** Saved items + current catalog metrics. Catalog reads use the existing authorised read path; nothing is collected. */
export async function loadWatchlist(): Promise<{ mode: WatchlistStore["mode"]; rows: WatchRow[] }> {
  const store = await getWatchlistStore();
  const items = await store.list();
  const listings = await listingsForContexts(items);
  const rankings: (Awaited<ReturnType<typeof appRankingsData>>)[] = [];
  for (let i = 0; i < items.length; i += 5) rankings.push(...await Promise.all(items.slice(i, i + 5).map(it => appRankingsData(it.appId, it.country, it.language))));
  return {
    mode: store.mode,
    rows: items.map((item, i) => {
      const r = rankings[i]!;
      const series = r.state === "ready" ? r.data.filter(s => s.latestPosition != null).sort((a, b) => a.latestPosition! - b.latestPosition!)[0] ?? null : null;
      return { item, listing: listings.get(watchKey(item)) ?? null, ranking: series ? { series, position: series.latestPosition!, change1d: series.change1d } : null, rankingsAvailable: r.state === "ready" };
    }),
  };
}

/** Saved items for marking buttons as "Saved"; an unavailable watchlist (e.g. migration not applied) yields []. */
export async function savedItemsOrEmpty(nextPath: string): Promise<WatchItem[]> {
  try { return await (await getWatchlistStore(nextPath)).list(); } catch (error) { unstable_rethrow(error); return []; }
}
