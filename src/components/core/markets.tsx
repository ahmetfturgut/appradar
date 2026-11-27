"use client";
import { FieldValue, MetricFreshnessSummary } from "./field-freshness";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { PartitionBar, PartitionBarSegment, PartitionBarSegmentTitle, PartitionBarSegmentValue } from "../ui/partition-bar";
import { StatCard, StatCardGroup } from "../ui/stat-card";
import { MARKET_THRESHOLDS, type MarketApp, type MarketView } from "../../lib/intel/market";
import { categoryLabel, chartLabel } from "../../lib/intel/views";
import type { MarketPageModel } from "../../lib/read/index";
import { PageHeading, Rating, ReadNotice, ScopeControls } from "./elements";
import { IntegrityNote } from "./rank-elements";
import { DistributionCard, IndicatorCell, Methodology, formatIndicator } from "./research";
import { Segmented, selectClass, useQueryUpdate } from "./trending";
import { DashboardSkeleton } from "./dashboard";
import { count, dateLabel, scopeQuery, type ReadResult, type Scope } from "./view-models";

export const appHref = (a: Pick<MarketApp, "appId" | "country" | "requestedLanguage">) =>
  `/apps/${encodeURIComponent(a.appId)}?${scopeQuery({ country: a.country, language: a.requestedLanguage })}`;
export const priceText = (a: MarketApp) => a.price.amount == null || a.price.currency == null ? (a.price.isFree === true ? "Free" : "Not available")
  : a.price.amount === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: a.price.currency }).format(a.price.amount);

export function cohortTitle(v: MarketView): string {
  const d = v.definition;
  if (d.kind === "chart" && d.chart) return `${chartLabel(d.chart.context)} · ${categoryLabel(d.store, d.category)}`;
  return d.category ?? "Uncategorized";
}

export function MarketsView({ result, scope, store, cohort }: { result: ReadResult<MarketPageModel>; scope: Scope; store: "ios" | "play"; cohort: "category" | "chart" }) {
  const { pending, update } = useQueryUpdate("/markets");
  const model = result.state === "ready" ? result.data : null;
  const view = model?.view ?? null;
  const explore = view && view.definition.kind === "category" ? `/explore?${scopeQuery({ country: view.definition.country, language: view.definition.requestedLanguage, store: view.definition.store })}&category=${encodeURIComponent(view.definition.category ?? "")}` : null;
  return <>
    <PageHeading title="Market insights" description="Descriptive statistics for one tracked cohort of apps. Tracked apps are not the whole store.">
      <ScopeControls scope={scope} onChange={values => update({ ...values, category: undefined, series: undefined })} />
    </PageHeading>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Segmented label="Store" value={store} onChange={value => update({ store: value, category: undefined, series: undefined })} options={[{ value: "ios", label: "App Store" }, { value: "play", label: "Google Play" }]} />
      <Segmented label="Cohort" value={cohort} onChange={value => update({ cohort: value === "category" ? undefined : value, series: undefined })} options={[{ value: "category", label: "Category" }, { value: "chart", label: "Chart snapshot" }]} />
      {model && cohort === "category" && <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Category
        <select aria-label="Category" className={selectClass} value={view?.definition.category ?? ""} onChange={event => update({ category: event.target.value })}>
          {model.categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.apps})</option>)}
        </select></label>}
      {model && cohort === "chart" && model.charts.length > 0 && <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Chart
        <select aria-label="Chart" className={selectClass} value={view?.definition.chart?.seriesId ?? ""} onChange={event => update({ series: event.target.value })}>
          {model.charts.map(c => <option key={c.id} value={c.id}>{chartLabel(c.context)} · {categoryLabel(store, c.category)} · top {c.depth ?? "?"}</option>)}
        </select></label>}
    </div>
    {pending ? <DashboardSkeleton /> : <div className="flex flex-col gap-5">
      <ReadNotice result={result} />
      {model && !view && <Card><Empty className="min-h-52 md:p-8"><EmptyHeader><EmptyMedia variant="icon"><Layers /></EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>{cohort === "chart" ? "No comparable chart snapshot" : "No tracked apps in this context"}</EmptyTitle>
        <EmptyDescription>{cohort === "chart" ? "Chart cohorts need a complete, accepted chart snapshot in this store, country and language." : "Listings appear here after collection. Nothing is estimated or filled in."}</EmptyDescription></EmptyHeader></Empty></Card>}
      {view && <MarketBody view={view} explore={explore} />}
    </div>}
  </>;
}

function MarketBody({ view, explore }: { view: MarketView; explore: string | null }) {
  const d = view.definition, ind = view.indicators;
  const rating = ind.qualityGap, counts = ind.incumbentStrength, pricing = ind.pricing;
  return <>
    <Card>
      <CardHeader className="border-b">
        <CardTitle role="heading" aria-level={2}>{cohortTitle(view)}</CardTitle>
        <CardDescription>{d.kind === "chart" ? `Membership from the latest comparable ${d.chart?.depth ? `top-${d.chart.depth} ` : ""}snapshot (${dateLabel(d.chart?.observedAt ?? null)}, ${d.chart?.source}). Ratings, prices, release and update dates come from current listings in this context — not from chart-time field values.` : "All tracked current listings in this category"} · {d.store === "ios" ? "App Store" : "Google Play"} · {d.country} · requested language {d.requestedLanguage}</CardDescription>
        {explore && <CardAction><Link className="product-text-link" href={explore}>Open in App Explorer <ArrowRight size={14} /></Link></CardAction>}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-xs sm:grid-cols-4">
        <Fact label="Tracked apps">{count(view.size)}{view.coverage.available != null && view.coverage.available !== view.size ? ` of ${count(view.coverage.available)}` : ""}</Fact>
        <Fact label="Rating metric provenance"><MetricFreshnessSummary value={view.indicators.qualityGap.freshness} /></Fact>
        <Fact label="Newest listing observation">{dateLabel(view.freshness.newest)}</Fact>
        <Fact label="Oldest listing observation">{dateLabel(view.freshness.oldest)}</Fact>
        <Fact label="Stale or unknown listing freshness">{view.freshness.stale} stale · {view.freshness.unknown} unknown{view.freshness.unknown ? " (missing last-observed time; not assumed fresh)" : ""}</Fact>
        {view.coverage.truncated && <p className="col-span-full rounded-md border border-warning/25 bg-warning/[0.06] px-3 py-2 text-foreground">Only the first {count(view.size)} listings were loaded; statistics cover that subset.</p>}
        {view.coverage.missingListings > 0 && <p className="col-span-full rounded-md border border-warning/25 bg-warning/[0.06] px-3 py-2 text-foreground">{view.coverage.missingListings} chart entries have no current listing in this context and are not included.</p>}
      </CardContent>
    </Card>

    <StatCardGroup aria-label="Cohort summary" className="[&>[data-slot=stat-card]]:basis-[9.5rem]">
      <StatCard className="px-5 py-4" label="Tracked apps" value={view.size} hint={d.kind === "chart" ? "Entries with a current listing" : "Current listings"} />
      <StatCard className="px-5 py-4" label="Median rating" value={rating.status === "insufficient" || rating.details.medianRating == null ? "Not available" : String(rating.details.medianRating)} hint={<>{rating.denominator} of {view.size} rated<MetricFreshnessSummary value={rating.freshness} /></>} />
      <StatCard className="px-5 py-4" label="Median rating count" value={formatIndicator(counts)} hint={<>{counts.value == null ? `${counts.denominator} known` : `25th percentile ${count(counts.details.p25 as number)} · n = ${counts.denominator}`}<MetricFreshnessSummary value={counts.freshness} /></>} />
      <StatCard className="px-5 py-4" label="Free to download" value={formatIndicator(pricing)} hint={<>{pricing.denominator} of {view.size} with a known price<MetricFreshnessSummary value={pricing.freshness} /></>} />
    </StatCardGroup>

    <div className="grid gap-5 lg:grid-cols-2">
      <DistributionCard freshness={rating.freshness} title="Rating distribution" description="Known store ratings. Unrated apps are not low-rated." buckets={view.ratingDistribution.buckets} unknown={view.ratingDistribution.unknown} unit="apps" />
      <Card>
        <CardHeader className="pb-2"><CardTitle role="heading" aria-level={3}>Pricing</CardTitle><MetricFreshnessSummary value={pricing.freshness} /><CardDescription>Download price only; in-app purchases are not included. Currencies are never combined.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4">
          {view.pricing.free + view.pricing.paid + view.pricing.unknown > 0 && <PartitionBar size="sm" gap={0.75} aria-label="Free, paid and unknown price">
            {[view.pricing.free ? <PartitionBarSegment key="free" num={view.pricing.free} variant="chart-1"><PartitionBarSegmentTitle className="text-xs">Free</PartitionBarSegmentTitle><PartitionBarSegmentValue>{view.pricing.free} apps</PartitionBarSegmentValue></PartitionBarSegment> : null,
              view.pricing.paid ? <PartitionBarSegment key="paid" num={view.pricing.paid} variant="chart-3"><PartitionBarSegmentTitle className="text-xs">Paid</PartitionBarSegmentTitle><PartitionBarSegmentValue>{view.pricing.paid} apps</PartitionBarSegmentValue></PartitionBarSegment> : null,
              view.pricing.unknown ? <PartitionBarSegment key="unknown" num={view.pricing.unknown} variant="muted" alignment="right"><PartitionBarSegmentTitle className="text-xs text-muted-foreground">Unknown</PartitionBarSegmentTitle><PartitionBarSegmentValue>{view.pricing.unknown} apps</PartitionBarSegmentValue></PartitionBarSegment> : null].filter(Boolean)}
          </PartitionBar>}
          {view.pricing.currencies.length ? <div className="relative overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs">
            <caption className="sr-only">Paid download prices per currency</caption>
            <thead><tr className="border-b text-[11px] text-muted-foreground">{["Currency", "Paid apps", "Min", "25th pct.", "Median", "75th pct.", "Max"].map(h => <th key={h} scope="col" className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{view.pricing.currencies.map(c => { const f = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: c.currency }).format(n); return <tr key={c.currency} className="border-b last:border-b-0 tabular-nums"><td className="py-2 pr-3 font-medium">{c.currency}</td><td className="py-2 pr-3">{c.count}</td><td className="py-2 pr-3">{f(c.min)}</td><td className="py-2 pr-3">{f(c.p25)}</td><td className="py-2 pr-3">{f(c.median)}</td><td className="py-2 pr-3">{f(c.p75)}</td><td className="py-2 pr-3">{f(c.max)}</td></tr>; })}</tbody>
          </table></div> : <p className="text-xs text-muted-foreground">No paid apps with a known price and currency.</p>}
          {view.pricing.paidWithoutCurrency > 0 && <p className="text-[11px] text-muted-foreground">{view.pricing.paidWithoutCurrency} paid app(s) without a currency are excluded from price statistics.</p>}
        </CardContent>
      </Card>
      <DistributionCard freshness={ind.newcomers.freshness} title="Release date" description="Time since the store release date." buckets={view.releaseDistribution.buckets} unknown={view.releaseDistribution.unknown} invalid={view.releaseDistribution.invalid} unit="apps" />
      <DistributionCard freshness={ind.neglected.freshness} title="Last store update" description="Time since the last store update. Missing dates are not treated as old." buckets={view.updateDistribution.buckets} unknown={view.updateDistribution.unknown} invalid={view.updateDistribution.invalid} unit="apps" />
    </div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card>
        <CardHeader className="border-b"><CardTitle role="heading" aria-level={3}>Developer concentration</CardTitle>
          <CardDescription>Share of tracked apps by store developer. This is not market share.</CardDescription></CardHeader>
        <CardContent className="py-4">
          <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Top {MARKET_THRESHOLDS.topDevelopers} developers</span><IndicatorCell ind={ind.concentration} /></div>
          {view.developers.length ? <ul className="divide-y text-sm">{view.developers.map(dev => <li key={dev.developerId} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate">{dev.developerName ?? "Unnamed developer"}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{dev.apps} app{dev.apps === 1 ? "" : "s"} · {dev.sharePercent}% of identified</span>
          </li>)}</ul> : <p className="text-xs text-muted-foreground">No identified developers in this cohort.</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">{view.identifiedApps} of {view.size} apps have an identified developer.</p>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="border-b"><CardTitle role="heading" aria-level={3}>Leading apps</CardTitle>
          <CardDescription>{d.kind === "chart" ? "By chart position in the cohort snapshot." : "By store rating count (cumulative ratings, not downloads)."}</CardDescription></CardHeader>
        <div className="relative overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Leading apps in this cohort</caption>
          <thead><tr className="border-b bg-muted/60 text-[11px] text-muted-foreground">{[d.kind === "chart" ? "Rank" : "#", "App", "Rating", "Ratings", "Price", ""].map((h, i) => <th key={i} scope="col" className="px-4 py-2 font-medium">{h || <span className="sr-only">Details</span>}</th>)}</tr></thead>
          <tbody>{view.leading.map((a, i) => <tr key={a.appId} className="border-b last:border-b-0 hover:bg-muted/40">
            <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{d.kind === "chart" ? `#${a.position}` : i + 1}</td>
            <td className="max-w-56 px-4 py-2"><span className="block truncate font-medium">{a.name ?? "App name unavailable"}</span><span className="block truncate text-[11px] text-muted-foreground">{a.developerName ?? "Developer unavailable"}</span></td>
            <td className="px-4 py-2"><FieldValue fields={a.fieldFreshness} field="rating_value" compact><Rating value={a.rating} /></FieldValue></td>
            <td className="px-4 py-2 text-xs tabular-nums text-muted-foreground"><FieldValue fields={a.fieldFreshness} field="rating_count" compact>{count(a.ratingCount)}</FieldValue></td>
            <td className="px-4 py-2 text-xs text-muted-foreground"><FieldValue fields={a.fieldFreshness} field="price" compact>{priceText(a)}</FieldValue></td>
            <td className="px-4 py-2 text-right"><Link href={appHref(a)} aria-label={`View ${a.name ?? "app"} details`} className="inline-grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"><ArrowUpRight className="size-4" /></Link></td>
          </tr>)}</tbody>
        </table></div>
        {!view.leading.length && <CardFooter className="border-t">No apps with a known rating count.</CardFooter>}
      </Card>
    </div>

    <Card>
      <CardHeader className="border-b"><CardTitle role="heading" aria-level={3}>Research indicators for this cohort</CardTitle><CardDescription>The same definitions as the Opportunity Finder. <Link href="/opportunities" className="font-medium text-primary hover:underline">Compare categories</Link></CardDescription></CardHeader>
      <CardContent className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {(["qualityGap", "neglected", "newcomers", "concentration", "incumbentStrength", "pricing"] as const).map(key => <div key={key} className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">{{ qualityGap: "Quality Gap", neglected: "Neglected Competitors", newcomers: "Newcomer Presence", concentration: "Developer Concentration", incumbentStrength: "Incumbent Strength (median ratings)", pricing: "Free to download" }[key]}</span><IndicatorCell ind={ind[key]} fullStatus /></div>)}
      </CardContent>
    </Card>
    <Methodology keys={["qualityGap", "neglected", "newcomers", "concentration", "incumbentStrength", "pricing"]} />
    <IntegrityNote>Statistics describe tracked apps only. Rating counts, prices and chart positions are not downloads, revenue, active users or profitability. Google Play install bands are lifetime ranges and are not used.</IntegrityNote>
  </>;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-0.5"><span className="text-[11px] text-muted-foreground">{label}</span><span className="text-foreground tabular-nums">{children}</span></div>;
}
