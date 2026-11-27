"use client";
import { FieldValue } from "./field-freshness";
import Link from "next/link";
import { ArrowUpRight, Bookmark, FlaskConical } from "lucide-react";
import { AppIcon } from "../app-icon";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { cn } from "../../lib/utils";
import { WATCHLIST_LIMIT } from "../../lib/watchlist/model";
import type { WatchRow } from "../../lib/watchlist/server";
import { CompactCount, FreshnessLabel, PageHeading, Rating, StoreLabel } from "./elements";
import { ChangeBadge, IntegrityNote, seriesTitle } from "./rank-elements";
import { Segmented, selectClass, useQueryUpdate } from "./trending";
import { CompareLink, WatchButton } from "./app-actions";
import { countryLabel, dateLabel, detailsHref, price } from "./view-models";
import { toAppViewModel } from "./catalog-mapping";

export function WatchlistView({ mode, rows, store, country, error }: { mode: "account" | "demo" | null; rows: WatchRow[]; store: "all" | "ios" | "play"; country: string | null; error: string | null }) {
  const { update } = useQueryUpdate("/watchlist");
  const countries = [...new Set(rows.map(r => r.item.country))].sort();
  const visible = rows.filter(r => (store === "all" || r.listing?.store === store) && (!country || r.item.country === country));
  return <>
    <PageHeading title="Watchlist" description={`Apps you saved, with their current stored metrics. Up to ${WATCHLIST_LIMIT} apps.`} />
    <div className="flex flex-col gap-5">
      {mode === "demo" && <p className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/[0.06] px-3 py-2 text-xs text-foreground"><FlaskConical className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />Development demo: this watchlist lives in a browser cookie with synthetic apps. It is never written to Supabase and is separate from any account.</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.05] px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Store" value={store} onChange={value => update({ store: value === "all" ? undefined : value })} options={[{ value: "all", label: "All stores" }, { value: "ios", label: "App Store" }, { value: "play", label: "Google Play" }]} />
        {countries.length > 1 && <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Country
          <select aria-label="Country" className={selectClass} value={country ?? ""} onChange={event => update({ savedCountry: event.target.value || undefined })}>
            <option value="">All countries</option>{countries.map(c => <option key={c} value={c}>{countryLabel(c)}</option>)}
          </select></label>}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{rows.length} of {WATCHLIST_LIMIT} saved</span>
      </div>
      {!error && !rows.length && <Card><Empty className="min-h-56 md:p-8"><EmptyHeader><EmptyMedia variant="icon"><Bookmark /></EmptyMedia><EmptyTitle role="heading" aria-level={2}>No saved apps yet</EmptyTitle>
        <EmptyDescription>Use Save in App Explorer, App Details or Compare. Saving uses already-collected data and never starts a new collection.</EmptyDescription></EmptyHeader>
        <EmptyContent><Link href="/explore" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Open App Explorer</Link></EmptyContent></Empty></Card>}
      {rows.length > 0 && <Card className="overflow-hidden">
        <CardHeader className="border-b"><CardTitle role="heading" aria-level={2}>Saved apps</CardTitle><CardDescription>Each app is saved in one country and language; metrics are the latest stored observations.</CardDescription></CardHeader>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <caption className="sr-only">Saved apps with current metrics</caption>
            <thead><tr className="border-b bg-muted/60 text-[11px] text-muted-foreground">{["App", "Context", "Rating", "Ratings", "Price", "Last update", "Chart", "Listing", "Actions"].map(h => <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{visible.map(({ item, listing, ranking, rankingsAvailable }) => {
              const app = listing ? toAppViewModel(listing) : null;
              return <tr key={`${item.appId}|${item.country}|${item.language}`} className="border-b align-top last:border-b-0 hover:bg-muted/40">
                <td className="max-w-64 px-4 py-2.5">{app ? <Link href={detailsHref(app)} className="product-app-identity group"><AppIcon app={app} /><span className="min-w-0"><strong className="block truncate group-hover:text-primary">{app.name}</strong><small className="block truncate">{app.developer} · <StoreLabel store={app.store} /></small></span></Link>
                  : <span className="text-xs text-warning">No current listing (expired or removed)</span>}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{item.country} · {item.language}<span className="block text-[11px]">saved {dateLabel(item.createdAt)}</span></td>
                <td className="px-4 py-2.5"><FieldValue fields={listing?.fieldFreshness} field="rating_value"><Rating value={listing?.rating ?? null} /></FieldValue></td>
                <td className="px-4 py-2.5 text-xs tabular-nums"><FieldValue fields={listing?.fieldFreshness} field="rating_count"><CompactCount value={listing?.ratingCount ?? null} /></FieldValue></td>
                <td className="px-4 py-2.5 text-xs"><FieldValue fields={listing?.fieldFreshness} field="price">{listing ? price({ price: listing.price.amount, currency: listing.price.currency }) : "Not available"}</FieldValue></td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap"><FieldValue fields={listing?.fieldFreshness} field="store_updated_at">{dateLabel(listing?.storeUpdatedAt ?? null)}</FieldValue></td>
                <td className="px-4 py-2.5 text-xs">{ranking ? <span className="flex flex-col items-start gap-1"><span><span className="font-medium">#{ranking.position}</span> <span className="text-muted-foreground">{seriesTitle(ranking.series.summary)}</span></span><ChangeBadge change={ranking.change1d} available={ranking.series.summary.horizons["1d"]} /></span> : <span className="text-muted-foreground">{rankingsAvailable ? "Not in a comparable chart" : "Rankings unavailable"}</span>}</td>
                <td className={cn("px-4 py-2.5 text-xs", listing?.freshness.status === "stale" && "text-warning")}>{listing ? <FreshnessLabel freshness={listing.freshness} /> : "Not available"}</td>
                <td className="px-4 py-2.5"><span className="flex items-start gap-1">
                  <WatchButton appId={item.appId} country={item.country} language={item.language} watched compact appName={app?.name} />
                  {listing && <CompareLink appId={item.appId} country={item.country} language={item.language} compact appName={app?.name} />}
                  {app && <Link href={detailsHref(app)} aria-label={`View ${app.name} details`} className="inline-grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"><ArrowUpRight className="size-4" /></Link>}
                </span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!visible.length && <CardFooter className="border-t">No saved apps match these filters.</CardFooter>}
      </Card>}
      <IntegrityNote>No notifications, automatic refresh or collection are triggered by saving. Rating counts and chart positions are not downloads or revenue.</IntegrityNote>
    </div>
  </>;
}
