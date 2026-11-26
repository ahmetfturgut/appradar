"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChartNoAxesColumn, Info, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { StatCard, StatCardGroup } from "../ui/stat-card";
import { cn } from "../../lib/utils";
import { HORIZONS, type Horizon } from "../../lib/intel/ranking";
import { categoryLabel, chartLabel, type ChartPageModel, type ChartRow } from "../../lib/intel/views";
import { toAppViewModel } from "./catalog-mapping";
import { AppIdentity, PageHeading, ReadNotice, ScopeControls } from "./elements";
import { ChangeBadge, CoveragePanel, IntegrityNote, RankSparkline, elapsedLabel, horizonLabel, seriesTitle } from "./rank-elements";
import { DashboardSkeleton } from "./dashboard";
import { dateLabel, type ReadResult, type Scope } from "./view-models";

export const selectClass = "h-9 min-w-0 rounded-md border bg-card px-2.5 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none";

export function useQueryUpdate(path: string) {
  const router = useRouter(), params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    startTransition(() => router.replace(`${path}?${next}`, { scroll: false }));
  };
  return { params, pending, update };
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; disabled?: boolean; hint?: string }[]; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-muted p-0.5">
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} disabled={option.disabled} title={option.hint}
      onClick={() => onChange(option.value)}
      className="h-full rounded-[5px] px-3 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs">{option.label}</button>)}
  </div>;
}

export function TrendingView({ result, scope, filters }: { result: ReadResult<ChartPageModel>; scope: Scope; filters: { store?: string; category?: string; chart?: string; series?: string; horizon: Horizon } }) {
  const { pending, update } = useQueryUpdate("/trending");
  const model = result.state === "ready" ? result.data : null;
  const view = model?.view ?? null;
  const visible = model?.series.filter(s => !filters.store || s.store === filters.store) ?? [];
  const charts = [...new Set(visible.filter(s => !filters.category || s.category === filters.category).map(s => s.context))];
  const categories = [...new Set(visible.flatMap(s => s.category ? [s.category] : []))];
  const sameDefinition = view ? visible.filter(s => s.store === view.summary.store && s.context === view.summary.context && s.category === view.summary.category) : [];
  const rows = view?.rows ?? [];
  const rising = rows.filter(r => (r.change ?? 0) > 0).length, falling = rows.filter(r => (r.change ?? 0) < 0).length;
  return <>
    <PageHeading title="Trending apps" description="Chart position changes between comparable snapshots of the same store list.">
      <ScopeControls scope={scope} onChange={values => update({ ...values, series: undefined })} />
    </PageHeading>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Segmented label="Store" value={(filters.store ?? "all") as "all" | "ios" | "play"} onChange={value => update({ store: value === "all" ? undefined : value, series: undefined, category: undefined, chart: undefined })}
        options={[{ value: "all", label: "All stores" }, { value: "ios", label: "App Store" }, { value: "play", label: "Google Play" }]} />
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Category
        <select aria-label="Category" className={selectClass} value={filters.category ?? ""} onChange={event => update({ category: event.target.value || undefined, series: undefined })}>
          <option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{categoryLabel(visible.find(s => s.category === c)!.store, c)}</option>)}
        </select></label>
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Chart
        <select aria-label="Chart" className={selectClass} value={filters.chart ?? ""} onChange={event => update({ chart: event.target.value || undefined, series: undefined })}>
          <option value="">Any chart</option>{charts.map(c => <option key={c} value={c}>{chartLabel(c)}</option>)}
        </select></label>
      {sameDefinition.length > 1 && <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Series
        <select aria-label="Series" className={selectClass} value={view?.seriesId ?? ""} onChange={event => update({ series: event.target.value })}>
          {sameDefinition.map(s => <option key={s.id} value={s.id}>{s.source} · {s.requestedLanguage}</option>)}
        </select></label>}
      <div className="ml-auto"><Segmented label="Comparison horizon" value={filters.horizon} onChange={value => update({ horizon: value })}
        options={HORIZONS.map(h => ({ value: h, label: horizonLabel(h), disabled: !!view && !view.available[h], ...(view && !view.available[h] ? { hint: "No comparable baseline for this horizon" } : {}) }))} /></div>
    </div>
    {pending ? <DashboardSkeleton /> : <div className="flex flex-col gap-5">
      <ReadNotice result={result} />
      {model && !view && <Card><TrendEmpty title={model.series.length ? "No chart matches these filters" : "No chart observations yet"} description={model.series.length ? "Try another store, category or chart." : "Chart snapshots appear here after collection runs. Nothing is estimated or filled in."} /></Card>}
      {view && <>
        {visible.length > 1 && <SeriesPicker series={visible} selectedId={view.seriesId} onSelect={id => update({ series: id })} />}
        <Card>
          <CardHeader className="border-b">
            <CardTitle role="heading" aria-level={2}>{seriesTitle(view.summary)}</CardTitle>
            <CardDescription>{view.summary.store === "ios" ? "App Store" : "Google Play"} · {view.summary.country} · requested language {view.summary.requestedLanguage}</CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            {view.summary.newerExcluded && <p className="mb-3 rounded-md border border-warning/25 bg-warning/[0.06] px-3 py-2 text-xs text-foreground">A newer snapshot from {dateLabel(view.summary.newerExcluded.observedAt)} was excluded ({view.summary.newerExcluded.reasons.join(", ").replace(/_/g, " ")}). Changes use the latest comparable snapshot instead.</p>}
            <CoveragePanel summary={view.summary} excluded={view.excludedSnapshots} horizon={filters.horizon} baselineAt={view.baseline?.observedAt ?? null} latestAt={view.latest?.observedAt ?? null} depth={view.latest?.depth ?? null} />
          </CardContent>
        </Card>
        {!view.latest ? <Card><TrendEmpty title="No comparable snapshots" description="Every snapshot in this list was excluded (see reasons above). Changes are only calculated between complete, accepted runs of the same depth." /></Card> : <>
          <StatCardGroup aria-label="List summary" className="[&>[data-slot=stat-card]]:basis-[9.5rem]">
            <StatCard className="px-5 py-4" label="Apps in latest list" value={rows.length} hint={`Top ${view.latest.depth ?? "?"} · ${dateLabel(view.latest.observedAt)}`} />
            <StatCard className="px-5 py-4" label="Rose" value={view.baseline ? rising : "Not available"} hint={view.baseline ? `vs ${elapsedLabel(view.elapsedHours)} earlier` : "No comparable baseline"} />
            <StatCard className="px-5 py-4" label="Fell" value={view.baseline ? falling : "Not available"} hint="Within the list; exits are not drops" />
            <StatCard className="px-5 py-4" label="Newly observed" value={view.baseline ? view.newlyObserved.length : "Not available"} hint="Absent from the baseline's top N" />
          </StatCardGroup>
          {!view.baseline && <Card><TrendEmpty icon={<Layers />} title={`Not enough history for a ${horizonLabel(filters.horizon)} comparison`} description={`A comparable snapshot between ${horizonLabel(filters.horizon)} windows is required. Available: ${HORIZONS.filter(h => view.available[h]).map(horizonLabel).join(", ") || "none yet"}. Missing observations are not filled in.`} /></Card>}
          <RankTable rows={rows} available={!!view.baseline} depth={view.latest.depth} />
          {view.baseline && view.notObservedInLatest > 0 && <IntegrityNote>{view.notObservedInLatest} app{view.notObservedInLatest === 1 ? " was" : "s were"} in the baseline&apos;s top {view.latest.depth} but not in the latest list. Leaving a bounded list is not a confirmed ranking drop, so they are not ranked here.</IntegrityNote>}
        </>}
      </>}
      <IntegrityNote>Chart position is not downloads, revenue or market share. Each store, country, language, chart, category, source and list depth is a separate series.</IntegrityNote>
    </div>}
  </>;
}

function SeriesPicker({ series, selectedId, onSelect }: { series: ChartPageModel["series"]; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Available chart series">
    {series.map(s => <button key={s.id} type="button" aria-pressed={s.id === selectedId} onClick={() => onSelect(s.id)}
      className="flex min-w-48 shrink-0 flex-col items-start gap-1 rounded-lg border bg-card px-3 py-2 text-left shadow-xs transition-colors hover:border-ring/50 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary/30">
      <span className="text-[13px] font-medium text-foreground">{seriesTitle(s)}</span>
      <span className="text-[11px] text-muted-foreground">{s.store === "ios" ? "App Store" : "Google Play"} · {s.requestedLanguage} · {s.latestEligible ? `${s.eligibleCount} comparable` : "none comparable"}</span>
    </button>)}
  </div>;
}

function TrendEmpty({ title, description, icon = <ChartNoAxesColumn /> }: { title: string; description: string; icon?: React.ReactNode }) {
  return <Empty className="min-h-52 md:p-8"><EmptyHeader><EmptyMedia variant="icon">{icon}</EmptyMedia><EmptyTitle role="heading" aria-level={3}>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>;
}

export function RankTable({ rows, available, depth, extra }: { rows: ChartRow[]; available: boolean; depth: number | null; extra?: { header: string; cell: (row: ChartRow) => React.ReactNode }[] }) {
  return <Card className="overflow-hidden">
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">Ranked entries with comparable previous positions</caption>
        <thead><tr className="border-b bg-muted/60 text-[11px] font-medium text-muted-foreground">
          <th scope="col" className="w-14 px-4 py-2.5 text-right font-medium">Rank</th>
          <th scope="col" className="px-3 py-2.5 font-medium">Application</th>
          <th scope="col" className="px-3 py-2.5 text-right font-medium">Previous</th>
          <th scope="col" className="px-3 py-2.5 font-medium">Change</th>
          <th scope="col" className="px-3 py-2.5 font-medium">History</th>
          {extra?.map(column => <th key={column.header} scope="col" className="px-3 py-2.5 font-medium">{column.header}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => {
          const app = row.listing ? toAppViewModel(row.listing) : null;
          return <tr key={row.appId} className="border-b last:border-b-0 hover:bg-muted/40">
            <td className="px-4 py-2.5 text-right font-medium tabular-nums">#{row.position}</td>
            <td className="max-w-72 px-3 py-2.5">{app ? <AppIdentity app={app} showStore /> : <span className="text-muted-foreground">Current listing unavailable</span>}</td>
            <td className={cn("px-3 py-2.5 text-right tabular-nums", row.previousPosition == null && "text-muted-foreground")}>{row.previousPosition != null ? `#${row.previousPosition}` : available ? `Not in top ${depth ?? "N"}` : "—"}</td>
            <td className="px-3 py-2.5"><ChangeBadge change={row.change} newlyObserved={row.newlyObserved} available={available} /></td>
            <td className="px-3 py-2.5"><RankSparkline points={row.history} depth={depth} label={app?.name ?? "App"} /></td>
            {extra?.map(column => <td key={column.header} className="px-3 py-2.5 text-xs text-muted-foreground">{column.cell(row)}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
    <CardFooter className="border-t"><Info className="mr-1.5 size-3.5" aria-hidden="true" />History shows the active list depth only; dashed marks are excluded snapshots, breaks are snapshots where the app was not in the top N.</CardFooter>
  </Card>;
}

