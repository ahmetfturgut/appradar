"use server";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { listingsForContexts } from "../ui/catalog.server";
import { getWatchlistStore, WatchlistUnavailable } from "./server";
import { WATCHLIST_LIMIT, WatchItemInput, type AddOutcome } from "./model";

/**
 * Public endpoints: validate everything, never trust client-supplied identity, return fixed messages.
 * The user comes from getWatchlistStore() → requireUser() (verified getUser). Server Actions are POST-only
 * and Next.js checks their Origin, so they are not cacheable and not cross-site callable.
 */
export type WatchActionState = { status: "idle" | "ok" | "error"; watched?: boolean; message?: string };

const MESSAGES: Record<AddOutcome, string> = {
  added: "Saved to your watchlist.",
  duplicate: "Already in your watchlist.",
  limit: `Your watchlist is full (${WATCHLIST_LIMIT} apps). Remove an app to save another.`,
  invalid: "This app has no current listing in this country and language.",
  unavailable: "The watchlist is unavailable right now. Please try again later.",
};

export async function updateWatchlist(_: WatchActionState, data: FormData): Promise<WatchActionState> {
  const intent = data.get("intent");
  const parsed = WatchItemInput.safeParse({ appId: data.get("appId"), country: data.get("country"), language: data.get("language") });
  if (!parsed.success || (intent !== "add" && intent !== "remove")) return { status: "error", message: "Invalid watchlist request." };
  try {
    const store = await getWatchlistStore();
    if (intent === "remove") {
      await store.remove(parsed.data);
      refresh();
      return { status: "ok", watched: false, message: "Removed from your watchlist." };
    }
    // The context must be a real current listing; the database also enforces this with a foreign key.
    const listings = await listingsForContexts([parsed.data]);
    if (!listings.size) return { status: "error", watched: false, message: MESSAGES.invalid };
    const outcome = await store.add(parsed.data);
    refresh();
    return { status: outcome === "added" || outcome === "duplicate" ? "ok" : "error", watched: outcome === "added" || outcome === "duplicate", message: MESSAGES[outcome] };
  } catch (error) {
    unstable_rethrow(error); // sign-in redirects must still happen
    // Missing table/migration, catalog read errors, network: a fixed message; details are never echoed.
    return { status: "error", message: error instanceof WatchlistUnavailable && error.code === "auth_not_configured" ? "Sign-in is not configured on this server." : MESSAGES.unavailable };
  }
}
