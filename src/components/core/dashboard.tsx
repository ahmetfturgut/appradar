"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, ArrowUpRight, ArrowDownRight, LayoutGrid, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { count, compact, dateLabel, detailsHref, scopeQuery, type DashboardModel, type ReadResult, type Scope } from "./view-models";
import { AppIdentity, CatalogState, FreshnessLabel, Metric, PageHeading, PanelHeading, Rating, ReadNotice, ScopeControls, StoreLabel } from "./elements";

export function Dashboard({ result, scope }: { result: ReadResult<DashboardModel>; scope: Scope }) {
  const router = useRouter(), params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const data = result.state === "ready" ? result.data : null;
  const series = data?.rankingChanges.find(value => value.snapshotId === seriesId) ?? data?.rankingChanges[0];
  const explore = `/explore?${scopeQuery(scope)}`;
  const stores = data ? Number(data.stats.iosApps > 0) + Number(data.stats.playApps > 0) : null;
  return <>
    <PageHeading title="Market overview" description="Find your next idea in the signals behind the apps."><ScopeControls scope={scope} onChange={values => { const next = new URLSearchParams(params.toString()); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); } startTransition(() => router.replace(`/?${next}`)); }} /></PageHeading>
    {pending ? <CatalogState state="loading" /> : <>
      <ReadNotice result={result} />
      <section className="product-stats-grid" aria-label="Stored catalog overview"><Metric label="Apps in this catalog" value={data ? compact(data.stats.apps) : "Not available"} note="Distinct apps in the selected country/store" /><Metric label="Current listings" value={data ? count(data.stats.listings) : "Not available"} note="Catalog totals span requested languages" /><Metric label="Categories covered" value={data ? count(data.stats.categories) : "Not available"} note="Catalog totals span requested languages" /><Metric label="Stores with listings" value={count(stores)} note="App Store and Google Play" /></section>
      {data && <div className="product-data-note"><FreshnessLabel freshness={data.stats.freshness} /><p>Totals use country/store scope. Category, release, and chart sections also respect the requested language.</p></div>}
      <div className="product-section-intro"><div><span className="product-section-kicker">DISCOVER</span><h2>A little signal. A new direction.</h2><p>Compare public store metrics and build your own research perspective.</p></div><Button asChild variant="outline"><Link href={explore}>Explore apps <ArrowRight size={16} /></Link></Button></div>
      <div className="product-dashboard-columns">
        <section id="trending" className="product-panel"><PanelHeading title="Trending apps" subtitle="Position changes between two comparable chart snapshots" />{data && series ? <>
          <div className="product-chart-toolbar"><label>Chart series<select aria-label="Chart series" value={series.snapshotId} onChange={event => setSeriesId(Number(event.target.value))}>{data.rankingChanges.map(item => <option value={item.snapshotId} key={item.snapshotId}>{item.store} · {item.country} · {item.requestedLanguage} · {item.source} · {item.context} · {item.category ?? "All categories"}</option>)}</select></label></div>
          <p className="product-panel-footnote">{dateLabel(series.previousObservedAt)} → {dateLabel(series.observedAt)} · {series.elapsedHours} hours · coverage {series.previousCoverageStatus} → {series.coverageStatus}. Bounded charts do not cover the whole market.</p>
          <div className="product-trending-head"><span>APPLICATION</span><span>POSITION</span><span>CHANGE</span></div>{series.entries.slice(0, 5).map(entry => <div key={entry.appId} className="product-trending-row"><span className="product-list-rank">{entry.position}</span>{entry.app ? <AppIdentity app={entry.app} showStore /> : <span className="product-muted">Current listing unavailable</span>}<span>#{entry.position}</span><span className={entry.change == null || entry.change === 0 ? "product-muted" : entry.change < 0 ? "product-negative" : "product-positive"}>{entry.change == null ? "Unavailable" : <>{entry.change < 0 ? <ArrowDownRight size={14} /> : entry.change > 0 ? <ArrowUpRight size={14} /> : null}{entry.change > 0 ? "+" : ""}{entry.change}</>}</span></div>)}
        </> : <div className="product-state"><h3>{data ? "No comparable chart history yet" : "Chart changes unavailable"}</h3><p>Two stored snapshots of the same chart definition are required. Missing previous positions are unknown.</p></div>}<div className="product-panel-footnote">Chart movement is not rating growth, download growth, or revenue.</div></section>
        <section className="product-panel"><PanelHeading title="Category overview" subtitle="Current collected listings in the selected context" href={explore} /><div className="product-category-list">{data?.categories.map(item => {
          const content = <><span className="product-category-icon"><LayoutGrid size={16} /></span><div><strong>{item.category ?? "Uncategorized"}</strong></div><span>{count(item.appCount)} apps · {count(item.listingCount)} listings</span></>;
          return item.category ? <Link key={item.category} href={`${explore}&category=${encodeURIComponent(item.category)}`}>{content}<ArrowRight size={14} /></Link> : <div className="product-category-unlinked" key="uncategorized">{content}</div>;
        })}</div>{(!data || !data.categories.length) && <div className="product-state"><h3>{data ? "No categories collected yet" : "Categories unavailable"}</h3></div>}</section>
      </div>
      <section className="product-panel product-recent"><PanelHeading title="Recently released" subtitle={`Last 30 days · ${scope.store === "play" ? "Google Play" : "App Store"} · source release date`} href={`/explore?${scopeQuery({ ...scope, store: scope.store ?? "ios" })}&sort=releasedAt`} /><div className="product-recent-grid">{data?.recent.map(app => <article key={app.listingId}><AppIdentity app={app} /><p>{app.category}</p><div><StoreLabel store={app.store} /><Rating value={app.rating} /></div><footer><span>{dateLabel(app.releasedAt)}</span><Link href={detailsHref(app)} aria-label={`View ${app.name} details`}><ArrowUpRight size={17} /></Link></footer></article>)}</div>{(!data || !data.recent.length) && <div className="product-state"><h3>{data ? "No recent releases collected" : "Recent releases unavailable"}</h3></div>}</section>
      <div className="product-data-note"><Layers size={16} /><p>Coverage is limited to stored observations. Empty results are not evidence that no apps exist in a store. Release coverage defaults to App Store unless a store is selected.</p></div>
    </>}
  </>;
}
