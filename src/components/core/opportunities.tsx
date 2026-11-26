"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowRight, Info, Layers } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { cn } from "../../lib/utils";
import { INDICATOR_INFO, MARKET_THRESHOLDS, type IndicatorKey, type OpportunityRow, type OpportunityTable } from "../../lib/intel/market";
import { PageHeading, ReadNotice, ScopeControls } from "./elements";
import { IntegrityNote } from "./rank-elements";
import { IndicatorCell, Methodology, StatusBadge, formatIndicator } from "./research";
import { appHref, priceText } from "./markets";
import { Segmented, useQueryUpdate } from "./trending";
import { DashboardSkeleton } from "./dashboard";
import { count, dateLabel, scopeQuery, type ReadResult, type Scope } from "./view-models";

const COLUMNS: { key: IndicatorKey; label: string }[] = [
  { key: "qualityGap", label: "Quality gap" }, { key: "neglected", label: "Neglected" }, { key: "newcomers", label: "Newcomers" },
  { key: "concentration", label: "Top-3 developers" }, { key: "incumbentStrength", label: "Median ratings" }, { key: "pricing", label: "Free share" },
];
type SortKey = IndicatorKey | "category" | "size";

export function OpportunitiesView({ result, scope, store }: { result: ReadResult<OpportunityTable>; scope: Scope; store: "ios" | "play" }) {
  const { pending, update } = useQueryUpdate("/opportunities");
  const table = result.state === "ready" ? result.data : null;
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "size", dir: "desc" });
  const [selected, setSelected] = useState<string | null>(null);
  const rows = table ? [...table.rows].sort((a, b) => compare(a, b, sort.key) * (sort.dir === "asc" ? 1 : -1) || a.category.localeCompare(b.category)) : [];
  // Withheld values always sort last, whatever the direction.
  const ordered = [...rows.filter(r => sortValue(r, sort.key) != null), ...rows.filter(r => sortValue(r, sort.key) == null)];
  const current = ordered.find(r => r.category === selected) ?? ordered[0] ?? null;
  const toggle = (key: SortKey) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "category" ? "asc" : "desc" });
  return <>
    <PageHeading title="Opportunity finder" description="Compare transparent category indicators within one store, country and language.">
      <ScopeControls scope={scope} onChange={values => update(values)} />
    </PageHeading>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Segmented label="Store" value={store} onChange={value => update({ store: value })} options={[{ value: "ios", label: "App Store" }, { value: "play", label: "Google Play" }]} />
    </div>
    {pending ? <DashboardSkeleton /> : <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2 rounded-lg border bg-accent/50 px-4 py-3 text-xs/relaxed text-foreground"><Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        These are provisional research indicators for tracked apps, not predictions. There is no combined score, and no category is presented as a guaranteed commercial success. Read each value with its sample size and coverage.</p>
      <ReadNotice result={result} />
      {table && !table.rows.length && <Card><Empty className="min-h-52 md:p-8"><EmptyHeader><EmptyMedia variant="icon"><Layers /></EmptyMedia><EmptyTitle role="heading" aria-level={2}>No tracked categories in this context</EmptyTitle><EmptyDescription>Category indicators appear after listings are collected. Nothing is estimated or filled in.</EmptyDescription></EmptyHeader></Empty></Card>}
      {table && table.rows.length > 0 && <>
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle role="heading" aria-level={2}>Category comparison</CardTitle>
            <CardDescription>{table.store === "ios" ? "App Store" : "Google Play"} · {table.country} · requested language {table.requestedLanguage} · {count(table.rows.reduce((n, r) => n + r.size, 0))} categorised tracked apps{table.uncategorized ? ` · ${table.uncategorized} uncategorised (excluded)` : ""}{table.coverage.truncated ? " · cohort truncated at the read limit" : ""}</CardDescription>
          </CardHeader>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <caption className="sr-only">Category indicators. Column headers sort the table.</caption>
              <thead><tr className="border-b bg-muted/60 text-[11px] text-muted-foreground">
                <SortHeader label="Category" k="category" sort={sort} onSort={toggle} />
                <SortHeader label="Apps" k="size" sort={sort} onSort={toggle} />
                {COLUMNS.map(c => <SortHeader key={c.key} label={c.label} k={c.key} sort={sort} onSort={toggle} hint={INDICATOR_INFO[c.key].definition(MARKET_THRESHOLDS)} />)}
              </tr></thead>
              <tbody>{ordered.map(row => <tr key={row.category} aria-selected={row.category === current?.category} className={cn("border-b last:border-b-0 hover:bg-muted/40", row.category === current?.category && "bg-accent/40")}>
                <th scope="row" className="px-4 py-2.5 font-medium"><button type="button" onClick={() => setSelected(row.category)} className="text-left hover:text-primary" aria-pressed={row.category === current?.category}>{row.category}</button></th>
                <td className="px-4 py-2.5 tabular-nums">{row.size}</td>
                {COLUMNS.map(c => <td key={c.key} className="px-4 py-2.5 align-top"><IndicatorCell ind={row.indicators[c.key]} /></td>)}
              </tr>)}</tbody>
            </table>
          </div>
        </Card>
        {current && <CategoryDetail row={current} table={table} />}
      </>}
      <Methodology keys={COLUMNS.map(c => c.key)} />
      <IntegrityNote>Indicators describe tracked apps in one store, country and language. They do not estimate downloads, revenue, active users, market share or profitability.</IntegrityNote>
    </div>}
  </>;
}

function sortValue(r: OpportunityRow, key: SortKey): number | string | null {
  if (key === "category") return r.category;
  if (key === "size") return r.size;
  return r.indicators[key].value;
}
function compare(a: OpportunityRow, b: OpportunityRow, key: SortKey): number {
  const x = sortValue(a, key), y = sortValue(b, key);
  if (x == null || y == null) return 0;
  return typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number);
}

function SortHeader({ label, k, sort, onSort, hint }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; hint?: string }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-2.5 font-medium">
    <button type="button" onClick={() => onSort(k)} title={hint} className="inline-flex items-center gap-1 hover:text-foreground">{label}<Icon className="size-3" aria-hidden="true" /></button>
  </th>;
}

function CategoryDetail({ row, table }: { row: OpportunityRow; table: OpportunityTable }) {
  const markets = `/markets?${scopeQuery({ country: table.country, language: table.requestedLanguage, store: table.store })}&category=${encodeURIComponent(row.category)}`;
  return <Card aria-labelledby="category-detail">
    <CardHeader className="border-b">
      <CardTitle role="heading" aria-level={2} id="category-detail">{row.category}</CardTitle>
      <CardDescription>{row.size} tracked apps · newest listing observation {dateLabel(row.freshness.newest)} · {row.freshness.stale} stale, {row.freshness.unknown} unknown listing freshness</CardDescription>
      <CardAction><Link className="product-text-link" href={markets}>Market insights <ArrowRight size={14} /></Link></CardAction>
    </CardHeader>
    <CardContent className="grid gap-4 py-4 md:grid-cols-2 xl:grid-cols-3">
      {COLUMNS.map(({ key }) => {
        const ind = row.indicators[key], info = INDICATOR_INFO[key];
        return <section key={key} aria-label={info.title} className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{info.title}</h3><StatusBadge status={ind.status} /></div>
          <div className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">{formatIndicator(ind)}</div>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {info.unit === "count" ? `Median of ${ind.denominator} known · 25th pct. ${ind.details.p25 == null ? "—" : count(ind.details.p25 as number)} · 75th pct. ${ind.details.p75 == null ? "—" : count(ind.details.p75 as number)}` : `${ind.numerator ?? "—"} of ${ind.denominator} known`}
            {` · ${ind.unknown} unknown`}{ind.invalid ? ` · ${ind.invalid} invalid` : ""}
            {key === "concentration" && ind.details.distinctDevelopers != null ? ` · ${ind.details.distinctDevelopers} developers` : ""}
            {key === "pricing" && ind.details.mainCurrency ? ` · median paid ${ind.details.medianPaidPrice} ${ind.details.mainCurrency}${Number(ind.details.currencies) > 1 ? ` (${ind.details.currencies} currencies, not combined)` : ""}` : ""}
          </p>
          <p className="text-xs/relaxed text-muted-foreground">{info.definition(MARKET_THRESHOLDS)} {info.caution}</p>
          {ind.supporting.length > 0 && <ul className="mt-1 flex flex-col gap-1 border-t pt-2 text-xs">{ind.supporting.map(id => { const a = table.apps[id]; return a ? <li key={id} className="flex items-center justify-between gap-2">
            <Link href={appHref(a)} className="min-w-0 truncate font-medium text-foreground hover:text-primary">{a.name ?? "App name unavailable"}</Link>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{supportingFact(key, a)}</span>
          </li> : null; })}</ul>}
        </section>;
      })}
    </CardContent>
  </Card>;
}

function supportingFact(key: IndicatorKey, a: OpportunityTable["apps"][string]): string {
  switch (key) {
    case "qualityGap": return a.rating == null ? "" : `${a.rating.toFixed(1)} ★`;
    case "neglected": return `updated ${dateLabel(a.storeUpdatedAt)}`;
    case "newcomers": return `released ${dateLabel(a.releasedAt)}`;
    case "concentration": return a.developerName ?? "";
    case "incumbentStrength": return `${count(a.ratingCount)} ratings`;
    case "pricing": return priceText(a);
  }
}
