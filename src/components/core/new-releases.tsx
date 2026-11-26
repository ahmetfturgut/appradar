"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import type { ChartPageModel, ChartRow } from "../../lib/intel/views";
import type { ListingSummary, Page } from "../../lib/read/index";
import { toAppViewModel } from "./catalog-mapping";
import { AppIdentity, PageHeading, Rating, ReadNotice, ScopeControls, StoreLabel } from "./elements";
import { CoveragePanel, IntegrityNote, seriesTitle } from "./rank-elements";
import { RankTable, Segmented, selectClass, useQueryUpdate } from "./trending";
import { DashboardSkeleton } from "./dashboard";
import { count, dateLabel, detailsHref, price, type ReadResult, type Scope } from "./view-models";

type Releases = Page<ListingSummary> & { since: string };
type Filters = { store: "ios" | "play"; days: number; page: number; category?: string; series?: string };

const releaseDate = (value: string | null, precision: "date" | "datetime" | null | undefined) =>
  value == null ? "Not available" : `${dateLabel(value)}${precision === "date" ? " (date only)" : ""}`;

export function NewReleasesView({ chart, releases, categories, scope, filters }: { chart: ReadResult<ChartPageModel>; releases: ReadResult<Releases>; categories: string[]; scope: Scope; filters: Filters }) {
  const { pending, update } = useQueryUpdate("/new-releases");
  const model = chart.state === "ready" ? chart.data : null;
  const view = model?.view ?? null;
  const list = releases.state === "ready" ? releases.data : null;
  const meta = (row: ChartRow) => row.listing;
  return <>
    <PageHeading title="New releases" description="Official new-app chart membership and recently released apps that AppRadar has observed.">
      <ScopeControls scope={scope} onChange={values => update({ ...values, series: undefined, page: undefined })} />
    </PageHeading>
    {pending ? <DashboardSkeleton /> : <div className="flex flex-col gap-6">
      <section aria-labelledby="new-app-chart" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="new-app-chart" className="text-base font-semibold tracking-[-0.01em]">App Store new-app charts</h2>
            <p className="mt-1 text-xs text-muted-foreground">Membership in an official App Store &ldquo;new apps&rdquo; list. Google Play has no verified new-app chart source, so none is shown.</p></div>
          {model && model.series.length > 1 && <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">List
            <select aria-label="New-app list" className={selectClass} value={view?.seriesId ?? ""} onChange={event => update({ series: event.target.value })}>
              {model.series.map(s => <option key={s.id} value={s.id}>{seriesTitle(s)} · {s.requestedLanguage}</option>)}
            </select></label>}
        </div>
        <ReadNotice result={chart} />
        {model && !view && <Card><ReleaseEmpty icon={<Sparkles />} title="No new-app chart observations" description="App Store new-app lists appear here after collection runs. Nothing is estimated or filled in." /></Card>}
        {view && <>
          <Card><CardContent className="py-4"><CoveragePanel summary={view.summary} excluded={view.excludedSnapshots} horizon="1d" baselineAt={view.baseline?.observedAt ?? null} latestAt={view.latest?.observedAt ?? null} depth={view.latest?.depth ?? null} /></CardContent></Card>
          {view.latest ? <RankTable rows={view.rows} available={!!view.baseline} depth={view.latest.depth} extra={[
            { header: "Released", cell: row => releaseDate(meta(row)?.releasedAt ?? null, meta(row)?.releasedAtPrecision) },
            { header: "First on list", cell: row => row.firstObservedAt ? dateLabel(row.firstObservedAt) : "Not available" },
            { header: "Rating", cell: row => <Rating value={meta(row)?.rating ?? null} /> },
            { header: "Ratings", cell: row => count(meta(row)?.ratingCount ?? null) },
            { header: "Price", cell: row => meta(row) ? price({ price: meta(row)!.price.amount, currency: meta(row)!.price.currency }) : "Not available" },
          ]} /> : <Card><ReleaseEmpty icon={<Sparkles />} title="No comparable list snapshot" description="Every snapshot of this list was excluded; see the reasons above." /></Card>}
          <IntegrityNote>&ldquo;First on list&rdquo; is the first comparable snapshot in the last 35 days that contained the app, not its release date. &ldquo;Previous&rdquo; compares with a snapshot about one day earlier.</IntegrityNote>
        </>}
      </section>

      <section aria-labelledby="known-releases">
        <Card>
          <CardHeader className="border-b">
            <CardTitle role="heading" aria-level={2} id="known-releases">Known release dates among tracked apps</CardTitle>
            <CardDescription>Apps AppRadar has collected whose store release date falls in the window. This is not a complete list of newly released apps.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-5 py-3">
            <Segmented label="Store" value={filters.store} onChange={value => update({ releaseStore: value, page: undefined })} options={[{ value: "ios", label: "App Store" }, { value: "play", label: "Google Play" }]} />
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Category
              <select aria-label="Release category" className={selectClass} value={filters.category ?? ""} onChange={event => update({ releaseCategory: event.target.value || undefined, page: undefined })}>
                <option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select></label>
            <Segmented label="Release window" value={String(filters.days) as "7" | "30" | "90"} onChange={value => update({ days: value, page: undefined })} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} />
          </div>
          <ReadNotice result={releases} />
          {list && (list.items.length ? <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">Tracked apps with a known release date in the selected window</caption>
              <thead><tr className="border-b bg-muted/60 text-[11px] font-medium text-muted-foreground">
                {["Application", "Released", "Category", "Rating", "Ratings", "Price", ""].map((h, i) => <th key={i} scope="col" className="px-4 py-2.5 font-medium">{h || <span className="sr-only">Details</span>}</th>)}
              </tr></thead>
              <tbody>{list.items.map(listing => ({ listing, app: toAppViewModel(listing) })).map(({ listing, app }) => <tr key={app.listingId} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="max-w-72 px-4 py-2.5"><AppIdentity app={app} showStore /></td>
                <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted-foreground" aria-hidden="true" />{releaseDate(listing.releasedAt, listing.releasedAtPrecision)}</span></td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{app.category}</td>
                <td className="px-4 py-2.5"><Rating value={app.rating} /></td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{count(app.ratingCount)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{price(app)}</td>
                <td className="px-4 py-2.5 text-right"><Link href={detailsHref(app)} aria-label={`View ${app.name} details`} className="inline-grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"><ArrowUpRight className="size-4" /></Link></td>
              </tr>)}</tbody>
            </table>
          </div> : <ReleaseEmpty icon={<CalendarDays />} title="No known releases in this window" description="No collected listing has a store release date in this window. That does not mean nothing was released." />)}
          {list && <CardFooter className="flex-wrap justify-between gap-2 border-t">
            <span className="flex items-center gap-2"><StoreLabel store={filters.store} /> · since {dateLabel(list.since)} · “date only” means the store gave no time of day</span>
            {(list.pageCount ?? 1) > 1 && <span className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={filters.page <= 1} onClick={() => update({ page: String(filters.page - 1) })} className="grid size-8 place-items-center rounded-md border bg-card disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <span className="px-2 tabular-nums">{filters.page} / {list.pageCount ?? 1}</span>
              <button type="button" aria-label="Next page" disabled={filters.page >= (list.pageCount ?? 1)} onClick={() => update({ page: String(filters.page + 1) })} className="grid size-8 place-items-center rounded-md border bg-card disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </span>}
          </CardFooter>}
        </Card>
      </section>
      <IntegrityNote>Release dates come from the stores; no downloads, revenue or install growth are inferred. Chart lists are bounded and cover only collected countries and categories.</IntegrityNote>
    </div>}
  </>;
}

function ReleaseEmpty({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return <Empty className="min-h-44 md:p-8"><EmptyHeader><EmptyMedia variant="icon">{icon}</EmptyMedia><EmptyTitle role="heading" aria-level={3}>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>;
}
