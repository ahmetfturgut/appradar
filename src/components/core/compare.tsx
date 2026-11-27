"use client";
import { FieldValue } from "./field-freshness";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Columns3, Info, Plus, Search, X } from "lucide-react";
import { AppIcon } from "../app-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { cn } from "../../lib/utils";
import type { CompareModel, HistoryComparison } from "../../lib/intel/compare";
import { COMPARE_COOKIE, COMPARE_MAX, serializeCompareCookie } from "../../lib/watchlist/model";
import { CompactCount, FreshnessLabel, PageHeading, Rating, ReadNotice, ScopeControls, StoreLabel } from "./elements";
import { ChangeBadge, IntegrityNote, seriesTitle } from "./rank-elements";
import { OverlayChart } from "./overlay-chart";
import { WatchButton } from "./app-actions";
import { compact, dateLabel, detailsHref, price, type AppViewModel, type ReadResult, type Scope } from "./view-models";
import { toAppViewModel } from "./catalog-mapping";

export type CompareNotice = "full" | "duplicate" | "invalid_id" | "too_many" | null;

export function CompareView({ model, ids, scope, notice, search, query, watched }: {
  model: ReadResult<CompareModel> | null; ids: string[]; scope: { country: string; language: string }; notice: CompareNotice;
  search: AppViewModel[] | null; query: string; watched: string[];
}) {
  const router = useRouter();
  const href = (list: string[], extra = "") => `/compare?apps=${list.join(",")}&country=${scope.country}&language=${encodeURIComponent(scope.language)}${extra}`;
  // Mirror the selection so "Compare" buttons elsewhere can append to it. The URL remains the source of truth.
  useEffect(() => {
    try { document.cookie = `${COMPARE_COOKIE}=${serializeCompareCookie(scope.country, scope.language, ids)}; path=/; max-age=2592000; samesite=lax`; } catch { /* storage blocked */ }
  }, [ids, scope.country, scope.language]);
  const data = model?.state === "ready" ? model.data : null;
  const nameOf = (id: string) => data?.apps.find(a => a.id === id)?.name ?? "Unknown app";
  const iconOf = (id: string) => {
    const listing = data?.apps.find(a => a.id === id)?.listing;
    return listing ? toAppViewModel(listing) : null;
  };
  return <>
    <PageHeading title="Compare apps" description="Compare two or three apps side by side in the same store, country and language.">
      <ScopeControls scope={scope as Scope} onChange={values => router.push(`/compare?apps=${ids.join(",")}&country=${values.country ?? scope.country}&language=${encodeURIComponent(values.language || scope.language)}`)} />
    </PageHeading>
    <div className="flex flex-col gap-5">
      {notice && <p role="status" className="rounded-md border border-warning/25 bg-warning/[0.06] px-3 py-2 text-sm text-foreground">{{ full: `A comparison holds at most ${COMPARE_MAX} apps. Remove one to add another.`, duplicate: "That app is already in this comparison.", invalid_id: "The comparison link contained an invalid app id.", too_many: `A comparison holds at most ${COMPARE_MAX} apps.` }[notice]}</p>}
      <Card>
        <CardHeader className="border-b"><CardTitle role="heading" aria-level={2}>Selection</CardTitle>
          <CardDescription>{ids.length} of {COMPARE_MAX} apps · {scope.country} · language {scope.language} · this link can be shared</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          {ids.length > 0 && <ul className="flex flex-wrap gap-2">{ids.map(id => {
            const iconApp = iconOf(id);
            return <li key={id} className="inline-flex items-center gap-1.5 rounded-md border bg-card py-1 pr-1 pl-1.5 text-sm shadow-xs">
              {iconApp ? <AppIcon app={iconApp} /> : null}
              <span className="max-w-48 truncate">{nameOf(id)}</span>
              <Link href={href(ids.filter(x => x !== id))} aria-label={`Remove ${nameOf(id)} from comparison`} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" /></Link>
            </li>;
          })}</ul>}
          {ids.length < COMPARE_MAX && <form method="get" action="/compare" role="search" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="apps" value={ids.join(",")} /><input type="hidden" name="country" value={scope.country} /><input type="hidden" name="language" value={scope.language} />
            <label className="sr-only" htmlFor="compare-search">Search the catalog to add an app</label>
            <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-card px-2.5 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 sm:max-w-sm">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" /><input id="compare-search" name="q" defaultValue={query} maxLength={100} placeholder="Search apps to add…" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            <button type="submit" className="inline-flex h-9 items-center rounded-md border bg-card px-3 text-sm font-medium shadow-xs hover:bg-muted">Search</button>
          </form>}
          {search && (search.length ? <ul className="divide-y rounded-md border">{search.map(app => { const added = ids.includes(app.id); return <li key={app.listingId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="product-app-identity min-w-0"><AppIcon app={app} /><span className="min-w-0"><strong className="block truncate">{app.name}</strong><small className="block truncate">{app.developer} · <StoreLabel store={app.store} /></small></span></span>
            {added ? <span className="text-xs text-muted-foreground">Added</span> : <Link href={href([...ids, app.id])} className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium shadow-xs hover:bg-muted" aria-label={`Add ${app.name} to comparison`}><Plus className="size-3.5" aria-hidden="true" />Add</Link>}
          </li>; })}</ul> : <p className="text-xs text-muted-foreground">No catalog apps match &ldquo;{query}&rdquo; in this context.</p>)}
        </CardContent>
      </Card>
      {model && <ReadNotice result={model} />}
      {ids.length < 2 && <Card><Empty className="min-h-52 md:p-8"><EmptyHeader><EmptyMedia variant="icon"><Columns3 /></EmptyMedia><EmptyTitle role="heading" aria-level={2}>Select at least two apps</EmptyTitle>
        <EmptyDescription>Search above, or use Compare in App Explorer and App Details. Up to {COMPARE_MAX} apps from the same store, country and language.</EmptyDescription></EmptyHeader></Empty></Card>}
      {data && ids.length >= 2 && <CompareBody data={data} watched={watched} removeHref={id => href(ids.filter(x => x !== id))} />}
      <IntegrityNote>Values are stored observations. No score or winner is calculated, and nothing here estimates downloads, revenue, active users or market share.</IntegrityNote>
    </div>
  </>;
}

function CompareBody({ data, watched, removeHref }: { data: CompareModel; watched: string[]; removeHref: (id: string) => string }) {
  if (data.storeMismatch) return <Card><Empty className="min-h-40 md:p-8"><EmptyHeader><EmptyMedia variant="icon"><Info /></EmptyMedia><EmptyTitle role="heading" aria-level={2}>Apps are from different stores</EmptyTitle><EmptyDescription>App Store and Google Play metrics are not comparable. Remove apps until all are from one store.</EmptyDescription></EmptyHeader></Empty></Card>;
  const apps = data.apps;
  const best = (id: string) => [...data.rankings.shared.flatMap(s => s.apps.filter(a => a.appId === id).map(a => ({ ...a, summary: s.summary }))), ...data.rankings.single.filter(s => s.appId === id)]
    .filter(r => r.latestPosition != null).sort((a, b) => a.latestPosition! - b.latestPosition!)[0] ?? null;
  const rows: { label: string; cell: (a: CompareModel["apps"][number]) => React.ReactNode; note?: string | undefined }[] = [
    { label: "Developer", cell: a => a.listing?.developerName ?? "Not available" },
    { label: "Category", cell: a => a.listing?.category ?? "Not available" },
    { label: "Rating", cell: a => <FieldValue fields={a.listing?.fieldFreshness} field="rating_value" compact><Rating value={a.listing?.rating ?? null} /></FieldValue> },
    { label: "Rating count", cell: a => <FieldValue fields={a.listing?.fieldFreshness} field="rating_count" compact><CompactCount value={a.listing?.ratingCount ?? null} /></FieldValue> },
    { label: "Price", cell: a => a.listing ? <FieldValue fields={a.listing.fieldFreshness} field="price" compact>{price({ price: a.listing.price.amount, currency: a.listing.price.currency })}{a.listing.price.currency && a.listing.price.amount ? <span className="ml-1 text-[11px] text-muted-foreground">{a.listing.price.currency}</span> : null}</FieldValue> : "Not available", note: data.currencies.length > 1 ? `Different currencies (${data.currencies.join(", ")}): prices are not comparable.` : undefined },
    { label: "Released", cell: a => <FieldValue fields={a.listing?.fieldFreshness} field="released_at" compact>{a.listing ? `${dateLabel(a.listing.releasedAt)}${a.listing.releasedAtPrecision === "date" ? " (date only)" : ""}` : "Not available"}</FieldValue> },
    { label: "Last store update", cell: a => <FieldValue fields={a.listing?.fieldFreshness} field="store_updated_at" compact>{dateLabel(a.listing?.storeUpdatedAt ?? null)}</FieldValue> },
    { label: "Listing check", cell: a => a.listing ? <span className={cn(a.listing.freshness.status === "stale" && "text-warning")}><FreshnessLabel freshness={a.listing.freshness} /></span> : "Not available", note: "Latest listing check only. Each retained metric has its own provenance above; it is not dated by a chart or unrelated update." },
    { label: "Best chart position", cell: a => { const r = best(a.id); return r ? <span className="flex flex-col"><span className="font-medium">#{r.latestPosition}</span><span className="text-[11px] text-muted-foreground">{seriesTitle(r.summary)}</span></span> : <span className="text-muted-foreground">Not in a comparable chart</span>; } },
    { label: "1-day change", cell: a => { const r = best(a.id); return r ? <ChangeBadge change={r.change1d} available={r.summary.horizons["1d"]} /> : "—"; } },
  ];
  return <>
    <Card className="overflow-hidden">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <caption className="sr-only">Side-by-side comparison of current listing metrics</caption>
          <thead><tr className="border-b bg-muted/60 align-top">
            <th scope="col" className="w-44 px-4 py-3 text-[11px] font-medium text-muted-foreground">Metric</th>
            {apps.map(a => {
              const headerApp = a.listing ? toAppViewModel(a.listing) : null;
              return <th key={a.id} scope="col" className="px-4 py-3 font-medium">
              <span className="flex items-start gap-2">
                {headerApp ? <AppIcon app={headerApp} /> : null}
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{a.name ?? "Unknown app"}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] font-normal text-muted-foreground">{a.store ? <StoreLabel store={a.store} /> : null}</span>
                </span>
              </span>
              <span className="mt-2 flex flex-wrap items-start gap-1.5">
                {a.listing && <WatchButton appId={a.id} country={data.country} language={data.language} watched={watched.includes(a.id)} appName={a.name ?? undefined} />}
                {a.listing && <Link href={detailsHref(toAppViewModel(a.listing))} className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium shadow-xs hover:bg-muted">Details <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>}
                <Link href={removeHref(a.id)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${a.name ?? "app"} from comparison`}><X className="size-3.5" aria-hidden="true" />Remove</Link>
              </span>
            </th>;
            })}
          </tr></thead>
          <tbody>{apps.some(a => !a.listing) && <tr className="border-b"><th scope="row" className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Availability</th>{apps.map(a => <td key={a.id} className="px-4 py-2.5 text-xs">{a.unknownApp ? <span className="text-destructive">Not in the catalog</span> : a.missingListing ? <span className="text-warning">No current listing in {data.country} · {data.language}</span> : "Listed"}</td>)}</tr>}
            {rows.map(r => <tr key={r.label} className="border-b last:border-b-0">
              <th scope="row" className="px-4 py-2.5 align-top text-xs font-medium text-muted-foreground">{r.label}{r.note && <span className="mt-0.5 block text-[10px] font-normal">{r.note}</span>}</th>
              {apps.map(a => <td key={a.id} className="px-4 py-2.5 align-top tabular-nums">{r.cell(a)}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </Card>
    {data.comparable ? <>
      <div className="grid gap-5 lg:grid-cols-2">{data.history.map(h => <HistoryCard key={h.metric} h={h} data={data} />)}</div>
      <Card>
        <CardHeader className="border-b"><CardTitle role="heading" aria-level={2}>Ranking history</CardTitle><CardDescription>Positions are overlaid only within the same chart (store, country, language, chart, category, source, depth). Only eligible snapshots are plotted: a gap on an eligible day means the app was not in that chart&rsquo;s top N; incomplete or ineligible observations are omitted, not treated as confirmed absences.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-6 py-4">
          {data.rankings.shared.length ? data.rankings.shared.map(s => <div key={s.seriesId}><h3 className="mb-2 text-sm font-semibold">{seriesTitle(s.summary)} <span className="font-normal text-muted-foreground">· top {s.summary.depth ?? "?"}</span></h3>
            <OverlayChart title={`${seriesTitle(s.summary)} positions`} invert format={v => `#${Math.round(v)}`} series={s.apps.map(a => ({ key: a.appId, label: data.apps.find(x => x.id === a.appId)?.name ?? "App", points: a.points.filter(p => p.eligible).map(p => ({ at: p.observedAt, value: p.position })) }))} /></div>)
            : <p className="text-sm text-muted-foreground">These apps do not share a collected chart in this context.</p>}
          {data.rankings.single.length > 0 && <div><h3 className="mb-1 text-xs font-medium text-muted-foreground">Charts with only one of these apps (not overlaid)</h3><ul className="grid gap-1 text-xs">{data.rankings.single.map(s => <li key={`${s.appId}:${s.seriesId}`}>{data.apps.find(a => a.id === s.appId)?.name}: {seriesTitle(s.summary)} · {s.latestPosition != null ? `#${s.latestPosition}` : "no eligible latest position"}</li>)}</ul></div>}
        </CardContent>
      </Card>
    </> : <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">History and rankings are compared only when every selected app has a current listing in this context.</p>}
  </>;
}

function HistoryCard({ h, data }: { h: HistoryComparison; data: CompareModel }) {
  const title = h.metric === "rating" ? "Rating history" : "Rating count history";
  const format = h.metric === "rating" ? (v: number) => v.toFixed(1) : (v: number) => compact(Math.round(v));
  return <Card>
    <CardHeader className="pb-2"><CardTitle role="heading" aria-level={3}>{title}</CardTitle>
      <CardDescription>{h.overlay ? `Overlaid: every app has ${h.overlay.role === "detail" ? "detail" : "chart-derived"} observations from ${h.overlay.source}.` : "Not overlaid: the apps' histories come from different sources or methods, or are missing."}</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-4 pb-4">
      {h.overlay ? <OverlayChart title={title} format={format} series={h.overlay.series.map(s => ({ key: s.appId, label: s.label, points: s.points.map(p => ({ at: p.observedAt, value: p.value })) }))} />
        : h.separate.map(s => <div key={s.appId}><p className="mb-1 text-xs font-medium">{data.apps.find(a => a.id === s.appId)?.name} <span className="font-normal text-muted-foreground">· {s.reason === "no_history" ? "no stored history" : `separate series (${s.source})`}</span></p>
          {s.series && <OverlayChart title={`${title} for ${s.series.label}`} format={format} series={[{ key: s.appId, label: s.series.label, points: s.series.points.map(p => ({ at: p.observedAt, value: p.value })) }]} />}</div>)}
    </CardContent>
  </Card>;
}
