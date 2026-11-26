"use client";
import { FieldValue } from "./field-freshness";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChartNoAxesColumn, Info, LayoutGrid, Minus, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { PartitionBar, PartitionBarSegment, PartitionBarSegmentTitle, PartitionBarSegmentValue } from "../ui/partition-bar";
import { Skeleton } from "../ui/skeleton";
import { StatCard, StatCardGroup } from "../ui/stat-card";
import BarChart from "../ui/bar-chart";
import { cn } from "../../lib/utils";
import { count, compact, dateLabel, detailsHref, scopeQuery, type DashboardModel, type ReadResult, type Scope } from "./view-models";
import { AppIdentity, FreshnessLabel, PageHeading, Rating, ReadNotice, ScopeControls, StoreLabel } from "./elements";

const percent = (value: number, total: number) => total > 0 ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format((value / total) * 100)}%` : "Not available";

function SectionEmpty({ title, description, icon = <Info /> }: { title: string; description?: string; icon?: React.ReactNode }) {
  return <Empty className="min-h-52 border-t border-dashed md:p-8"><EmptyHeader><EmptyMedia variant="icon">{icon}</EmptyMedia><EmptyTitle role="heading" aria-level={3}>{title}</EmptyTitle>{description && <EmptyDescription>{description}</EmptyDescription>}</EmptyHeader></Empty>;
}

/** Dashboard-shaped placeholder shown while a scope change is in flight. */
export function DashboardSkeleton() {
  return <div className="flex flex-col gap-5" role="status" aria-label="Loading dashboard"><span className="sr-only">Loading dashboard…</span>
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card min-[360px]:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(cell => <div key={cell} className="-m-px border-t border-l px-5 py-4"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-6 w-16" /><Skeleton className="mt-3 h-2.5 w-36" /></div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">{[0, 1].map(panel => <div key={panel} className="rounded-xl border bg-card p-5"><Skeleton className="h-4 w-32" /><Skeleton className="mt-2 h-3 w-56" />{[0, 1, 2, 3, 4].map(row => <div key={row} className="mt-5 flex items-center gap-3"><Skeleton className="size-9 rounded-lg" /><div className="flex-1"><Skeleton className="h-3 w-1/2" /><Skeleton className="mt-2 h-2.5 w-1/3" /></div><Skeleton className="h-5 w-12 rounded-full" /></div>)}</div>)}</div>
  </div>;
}

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">Unavailable</span>;
  const tone = value === 0 ? "border-border bg-muted text-muted-foreground" : value < 0 ? "product-negative border-destructive/20 bg-destructive/[0.07]" : "product-positive border-success/20 bg-success/[0.08]";
  return <span className={cn("inline-flex h-6 min-w-12 items-center justify-center gap-0.5 rounded-full border px-2 text-xs font-medium tabular-nums", tone)}>
    {value < 0 ? <ArrowDownRight className="size-3.5" aria-hidden="true" /> : value > 0 ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <Minus className="size-3" aria-hidden="true" />}
    {value > 0 ? "+" : ""}{value}
  </span>;
}

export function Dashboard({ result, scope, demo = false }: { result: ReadResult<DashboardModel>; scope: Scope; demo?: boolean }) {
  const router = useRouter(), params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const data = result.state === "ready" ? result.data : null;
  const series = data?.rankingChanges.find(value => value.snapshotId === seriesId) ?? data?.rankingChanges[0];
  const explore = `/explore?${scopeQuery(scope)}`;
  const stores = data ? Number(data.stats.iosApps > 0) + Number(data.stats.playApps > 0) : null;
  const categories = data ? [...data.categories].sort((a, b) => b.listingCount - a.listingCount) : [];
  const categoryListings = categories.reduce((sum, item) => sum + item.listingCount, 0);
  const storeApps = data ? data.stats.iosApps + data.stats.playApps : 0;
  const recentStore = scope.store === "play" ? "Google Play" : "App Store";

  return <>
    <PageHeading title="Market overview" description="Find your next idea in the signals behind the apps.">
      <div className="flex flex-wrap items-end gap-2"><ScopeControls scope={scope} onChange={values => { const next = new URLSearchParams(params.toString()); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); } startTransition(() => router.replace(`/dashboard?${next}`)); }} /><Button asChild><Link href={explore}>Explore apps <ArrowRight size={15} /></Link></Button></div>
    </PageHeading>
    {pending ? <DashboardSkeleton /> : <div className="flex flex-col gap-5">
      <ReadNotice result={result} />
      <div className="flex flex-col gap-2.5">
        <StatCardGroup aria-label="Stored catalog overview" className="[&>[data-slot=stat-card]]:basis-[9.5rem]">
          <StatCard className="px-5 py-4" label="Apps in this catalog" value={data ? compact(data.stats.apps) : "Not available"} hint="Distinct apps in the selected country/store" />
          <StatCard className="px-5 py-4" label="Current listings" value={data ? count(data.stats.listings) : "Not available"} hint="Catalog totals span requested languages" />
          <StatCard className="px-5 py-4" label="Categories covered" value={data ? count(data.stats.categories) : "Not available"} hint="Catalog totals span requested languages" />
          <StatCard className="px-5 py-4" label="Stores with listings" value={count(stores)} hint="App Store and Google Play" />
        </StatCardGroup>
        {data && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="inline-flex h-6 items-center rounded-full border bg-card px-2.5 [&_.product-freshness]:text-xs"><FreshnessLabel freshness={data.stats.freshness} /></span>
          <p className="min-w-60 flex-1">{demo ? "Development demo. These totals, charts and rankings are synthetic fixtures, not stored observations." : "Totals use country/store scope. Category, release, and chart sections also respect the requested language."}</p>
        </div>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card id="trending" className="scroll-mt-20">
          <CardHeader className={cn(data && series && "border-b")}>
            <CardTitle role="heading" aria-level={2}>Trending apps</CardTitle>
            <CardDescription>Position changes between two comparable chart snapshots</CardDescription>
            <CardAction><Link className="product-text-link" href={`/trending?${scopeQuery(scope)}`}>View all <ArrowRight size={14} /></Link></CardAction>
          </CardHeader>
          {data && series ? <>
            <div className="flex flex-col gap-2 border-b bg-muted/40 px-5 py-3">
              <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"><span className="shrink-0">Chart series</span>
                <select aria-label="Chart series" value={series.snapshotId} onChange={event => setSeriesId(Number(event.target.value))} className="h-8 min-w-0 flex-1 rounded-md border bg-card px-2 text-xs text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none">{data.rankingChanges.map(item => <option value={item.snapshotId} key={item.snapshotId}>{item.store} · {item.country} · {item.requestedLanguage} · {item.source} · {item.context} · {item.category ?? "All categories"}</option>)}</select>
              </label>
              <p className="text-[11px]/relaxed text-muted-foreground">{dateLabel(series.previousObservedAt)} → {dateLabel(series.observedAt)} · {series.elapsedHours} hours · coverage {series.previousCoverageStatus} → {series.coverageStatus}. Bounded charts do not cover the whole market.</p>
            </div>
            <div role="table" aria-label="Ranking changes" className="px-2 sm:px-3">
              <div role="row" className="grid grid-cols-[minmax(0,1fr)_3.25rem_4.75rem] items-center gap-3 px-2 py-2 text-[11px] font-medium text-muted-foreground sm:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_5rem]"><span role="columnheader" className="sr-only max-sm:hidden">Rank</span><span role="columnheader" className="sm:col-start-2">Application</span><span role="columnheader" className="text-right">Position</span><span role="columnheader" className="text-right">Change</span></div>
              {series.entries.slice(0, 5).map(entry => <div role="row" key={entry.appId} className="grid grid-cols-[minmax(0,1fr)_3.25rem_4.75rem] items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60 sm:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_5rem]">
                <span role="cell" className="hidden text-center text-xs font-medium text-muted-foreground tabular-nums sm:block">{entry.position}</span>
                <span role="cell" className="min-w-0">{entry.app ? <AppIdentity app={entry.app} showStore /> : <span className="text-sm text-muted-foreground">Current listing unavailable</span>}</span>
                <span role="cell" className="text-right text-[13px] font-medium tabular-nums">#{entry.position}{entry.previousPosition != null && <span className="block text-[11px] font-normal text-muted-foreground">was #{entry.previousPosition}</span>}</span>
                <span role="cell" className="flex justify-end"><Change value={entry.change} /></span>
              </div>)}
            </div>
          </> : <SectionEmpty icon={<ChartNoAxesColumn />} title={data ? "No comparable chart history yet" : "Chart changes unavailable"} description="Two stored snapshots of the same chart definition are required. Missing previous positions are unknown." />}
          <CardFooter className="mt-auto border-t">Chart movement is not rating growth, download growth, or revenue.</CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>Category distribution</CardTitle>
            <CardDescription>Current collected listings per category in the selected context. Hover or use arrow keys for details.</CardDescription>
            <CardAction><Link className="product-text-link" href={explore}>View all <ArrowRight size={14} /></Link></CardAction>
          </CardHeader>
          {categories.length ? <CardContent className="flex flex-col gap-4 pb-5">
            <BarChart orientation="horizontal" animated={false} showValues name="Listings" aria-label="Current listings by category" data={categories.map(item => item.listingCount)} labels={categories.map(item => item.category ?? "Uncategorized")} defaultIndex={0} color="var(--chart-1)" radius={3} formatValueText={(value, index) => `${categories[index]?.category ?? "Uncategorized"}: ${count(value)} listings, ${count(categories[index]?.appCount ?? null)} apps, ${percent(value, categoryListings)} of shown listings`} />
            <nav aria-label="Open a category in App Explorer" className="flex flex-wrap gap-1.5 border-t pt-4">{categories.filter(item => item.category).map(item => <Link key={item.category} className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground" href={`${explore}&category=${encodeURIComponent(item.category!)}`}>{item.category}<span className="tabular-nums text-foreground/70">{count(item.appCount)} apps</span></Link>)}</nav>
          </CardContent> : <SectionEmpty icon={<LayoutGrid />} title={data ? "No categories collected yet" : "Categories unavailable"} />}
          {data && storeApps > 0 && <div className="mt-auto border-t px-5 pt-4 pb-5">
            <div className="mb-3 text-xs font-medium text-muted-foreground">Store coverage · distinct apps per store</div>
            <PartitionBar size="sm" gap={0.75} aria-label="Apps per store">
              {[data.stats.iosApps > 0 ? <PartitionBarSegment key="ios" num={data.stats.iosApps} variant="chart-1"><PartitionBarSegmentTitle className="text-xs">App Store</PartitionBarSegmentTitle><PartitionBarSegmentValue>{count(data.stats.iosApps)} apps</PartitionBarSegmentValue></PartitionBarSegment> : null,
                data.stats.playApps > 0 ? <PartitionBarSegment key="play" num={data.stats.playApps} variant="chart-3" alignment="right"><PartitionBarSegmentTitle className="text-xs">Google Play</PartitionBarSegmentTitle><PartitionBarSegmentValue>{count(data.stats.playApps)} apps</PartitionBarSegmentValue></PartitionBarSegment> : null].filter(Boolean)}
            </PartitionBar>
          </div>}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Recently released</CardTitle>
          <CardDescription>Last 30 days · {recentStore} · source release date</CardDescription>
          <CardAction><Link className="product-text-link" href={`/explore?${scopeQuery({ ...scope, store: scope.store ?? "ios" })}&sort=releasedAt`}>View all <ArrowRight size={14} /></Link></CardAction>
        </CardHeader>
        {data?.recent.length ? <CardContent className="grid gap-3 pb-5 sm:grid-cols-2 xl:grid-cols-4">{data.recent.map(app => <article key={app.listingId} className="flex min-w-0 flex-col rounded-lg border p-4 transition-colors hover:border-ring/40">
          <AppIdentity app={app} />
          <div className="mt-4 flex items-center justify-between gap-2"><span className="truncate rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{app.category}</span><FieldValue fields={app.fieldFreshness} field="rating_value"><Rating value={app.rating} /></FieldValue></div>
          <footer className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground"><span className="flex min-w-0 items-center gap-2"><StoreLabel store={app.store} /><span aria-hidden="true">·</span><span className="whitespace-nowrap">{dateLabel(app.releasedAt)}</span></span><Link href={detailsHref(app)} aria-label={`View ${app.name} details`} className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"><ArrowUpRight className="size-4" /></Link></footer>
        </article>)}</CardContent> : <SectionEmpty icon={<Sparkles />} title={data ? "No recent releases collected" : "Recent releases unavailable"} />}
      </Card>

      <p className="flex items-start gap-2 px-1 text-xs/relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Coverage is limited to stored observations. Empty results are not evidence that no apps exist in a store. Release coverage defaults to App Store unless a store is selected.</p>
    </div>}
  </>;
}
