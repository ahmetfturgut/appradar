import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { WatchlistView } from "../../components/core/watchlist";
import type { SearchValues } from "../../components/core/catalog-query";
import { requireViewer } from "../../lib/auth/server";
import { loadWatchlist, type WatchRow } from "../../lib/watchlist/server";

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/watchlist");
  const params = await searchParams;
  const rawStore = typeof params.store === "string" ? params.store : "all";
  const store = rawStore === "ios" || rawStore === "play" ? rawStore : "all";
  const rawCountry = typeof params.savedCountry === "string" ? params.savedCountry : null;
  const country = rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  let mode: "account" | "demo" | null = null, rows: WatchRow[] = [], error: string | null = null;
  try { ({ mode, rows } = await loadWatchlist()); }
  catch (cause) { unstable_rethrow(cause); error = "The watchlist is unavailable right now. If this is a new installation, the watchlist migration may not be applied yet."; }
  return <WatchlistView mode={mode} rows={rows} store={store} country={country} error={error} />;
}
