"use client";
/**
 * Save-to-watchlist and add-to-comparison actions, reused by App Explorer, App Details, Compare and Watchlist.
 * Buttons use the existing token styles; no new external components.
 */
import Link from "next/link";
import { useActionState } from "react";
import { Bookmark, BookmarkCheck, Columns3, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { updateWatchlist, type WatchActionState } from "../../lib/watchlist/actions";

const base = "inline-flex items-center justify-center gap-1.5 rounded-md border bg-card text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

export function WatchButton({ appId, country, language, watched = false, compact = false, appName }: { appId: string; country: string; language: string; watched?: boolean; compact?: boolean; appName?: string | undefined }) {
  const [state, action, pending] = useActionState<WatchActionState, FormData>(updateWatchlist, { status: "idle", watched });
  const isWatched = state.watched ?? watched;
  const label = isWatched ? "Saved" : "Save";
  return <form action={action} className="inline-flex flex-col items-start gap-1">
    <input type="hidden" name="appId" value={appId} /><input type="hidden" name="country" value={country} /><input type="hidden" name="language" value={language} />
    <input type="hidden" name="intent" value={isWatched ? "remove" : "add"} />
    <button type="submit" disabled={pending} aria-pressed={isWatched}
      aria-label={`${isWatched ? "Remove" : "Save"} ${appName ?? "app"} ${isWatched ? "from" : "to"} watchlist`}
      title={isWatched ? "Remove from watchlist" : "Save to watchlist"}
      className={cn(base, compact ? "size-8" : "h-8 px-2.5", isWatched && "border-primary/30 bg-accent text-accent-foreground hover:bg-accent/70")}>
      {pending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : isWatched ? <BookmarkCheck className="size-3.5" aria-hidden="true" /> : <Bookmark className="size-3.5" aria-hidden="true" />}
      {!compact && label}
    </button>
    <span role="status" aria-live="polite" className={cn("text-[11px]", state.status === "error" ? "text-destructive" : "text-muted-foreground", (compact || !state.message) && "sr-only")}>{state.message}</span>
  </form>;
}

export const compareAddHref = (appId: string, country: string, language: string) =>
  `/compare/add?app=${encodeURIComponent(appId)}&country=${encodeURIComponent(country)}&language=${encodeURIComponent(language)}`;

export function CompareLink({ appId, country, language, compact = false, appName }: { appId: string; country: string; language: string; compact?: boolean; appName?: string | undefined }) {
  return <Link href={compareAddHref(appId, country, language)} prefetch={false} aria-label={`Add ${appName ?? "app"} to comparison`} title="Add to comparison"
    className={cn(base, compact ? "size-8" : "h-8 px-2.5")}><Columns3 className="size-3.5" aria-hidden="true" />{!compact && "Compare"}</Link>;
}

/** Compact row actions for tables (App Explorer). `watched` comes from the same saved-item list as Details/Compare. */
export function AppQuickActions({ appId, country, language, watched = false, appName }: { appId: string; country: string; language: string; watched?: boolean; appName?: string }) {
  return <span className="inline-flex items-start gap-1"><WatchButton appId={appId} country={country} language={language} watched={watched} compact {...(appName ? { appName } : {})} /><CompareLink appId={appId} country={country} language={language} compact {...(appName ? { appName } : {})} /></span>;
}
