/**
 * Shared presentation for Market Insights and Opportunity Finder.
 * Reuses the existing tokens and primitives (Card, BarChart from 21st.dev, Empty); no new components.
 */
"use client";
import { CircleAlert, CircleHelp, TriangleAlert } from "lucide-react";
import BarChart from "../ui/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";
import { INDICATOR_INFO, MARKET_THRESHOLDS, type Bucket, type Indicator, type IndicatorKey, type SampleStatus } from "../../lib/intel/market";
import { count, dateLabel } from "./view-models";

export const statusText: Record<SampleStatus, string> = {
  ok: "Sufficient sample",
  small_sample: `Small sample (under ${MARKET_THRESHOLDS.smallSample} known)`,
  low_coverage: `Low coverage (under ${Math.round(MARKET_THRESHOLDS.minCoverage * 100)}% known)`,
  insufficient: `Insufficient data (under ${MARKET_THRESHOLDS.minSample} known)`,
};

export function StatusBadge({ status, compact = false }: { status: SampleStatus; compact?: boolean }) {
  if (status === "ok") return null;
  const Icon = status === "insufficient" ? CircleAlert : TriangleAlert;
  return <span title={statusText[status]} className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
    status === "insufficient" ? "border-border bg-muted text-muted-foreground" : "border-warning/30 bg-warning/[0.08] text-warning")}>
    <Icon className="size-3" aria-hidden="true" />{compact ? <span className="sr-only">{statusText[status]}</span> : statusText[status]}
  </span>;
}

export function formatIndicator(ind: Indicator): string {
  if (ind.value == null) return ind.status === "insufficient" ? "Insufficient data" : "Not available";
  return INDICATOR_INFO[ind.key].unit === "count" ? count(ind.value) : `${ind.value}%`;
}

/** Value with its denominator, e.g. "37.5%  3 of 8 known". */
export function IndicatorCell({ ind, fullStatus = false }: { ind: Indicator; fullStatus?: boolean }) {
  const unit = INDICATOR_INFO[ind.key].unit;
  return <div className="flex flex-col items-start gap-0.5">
    <span className={cn("text-sm font-medium tabular-nums", ind.value == null && "text-xs font-normal text-muted-foreground")}>{formatIndicator(ind)}</span>
    <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
      {unit === "count" ? `n = ${ind.denominator} of ${ind.cohortSize}` : ind.numerator != null ? `${ind.numerator} of ${ind.denominator} known` : `${ind.denominator} of ${ind.cohortSize} known`}
      <StatusBadge status={ind.status} compact={!fullStatus} />
    </span>
  </div>;
}

export function Methodology({ keys }: { keys: IndicatorKey[] }) {
  const t = MARKET_THRESHOLDS;
  return <details className="group rounded-lg border bg-card px-4 py-3 text-sm shadow-xs">
    <summary className="flex cursor-pointer items-center gap-2 font-medium text-foreground"><CircleHelp className="size-4 text-muted-foreground" aria-hidden="true" />Methodology and provisional thresholds</summary>
    <div className="mt-3 grid gap-3 text-xs/relaxed text-muted-foreground">
      <p>All values are calculated within one tracked cohort: one store, one country, one requested language, and one category or one comparable chart snapshot. Chart cohorts use the snapshot only for membership; ratings, prices and dates are current listing fields. Freshness uses each listing’s last-observed time — missing times stay unknown and are never treated as fresh. Tracked apps are not the whole market. Thresholds are provisional research definitions, not validated predictions; there is no combined score.</p>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">{keys.map(key => { const info = INDICATOR_INFO[key]; return <div key={key} className="flex flex-col gap-0.5 border-0 p-0"><dt className="font-medium text-foreground">{info.title}</dt><dd className="m-0 text-left">{info.definition(t)} Denominator: {info.denominator} {info.caution}</dd></div>; })}</dl>
      <p>Withheld below {t.minSample} known observations; flagged as a small sample below {t.smallSample}; flagged as low coverage when fewer than {Math.round(t.minCoverage * 100)}% of the cohort is known. Dates in the future (beyond {t.futureToleranceHours} hours) or before {dateLabel(t.earliestStoreDate)} are invalid and excluded. Medians and percentiles use linear interpolation.</p>
    </div>
  </details>;
}

export function DistributionCard({ title, description, buckets, unknown, invalid, unit }: { title: string; description: string; buckets: Bucket[]; unknown: number; invalid?: number; unit: string }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  return <Card>
    <CardHeader className="pb-2"><CardTitle role="heading" aria-level={3}>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent className="pb-4">
      {total ? <BarChart orientation="horizontal" animated={false} showValues name={unit} aria-label={title} data={buckets.map(b => b.count)} labels={buckets.map(b => b.label)} defaultIndex={0} color="var(--chart-1)" radius={3}
        formatValueText={(value, index) => `${buckets[index]!.label}: ${value} ${unit}`} /> : <p className="py-6 text-center text-xs text-muted-foreground">No known values in this cohort.</p>}
      <p className="mt-3 text-[11px] text-muted-foreground tabular-nums">{total} known · {unknown} unknown{invalid ? ` · ${invalid} invalid (excluded)` : ""}</p>
    </CardContent>
  </Card>;
}
