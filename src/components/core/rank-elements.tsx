/**
 * Shared presentation for ranking intelligence (Trending, New Releases, App Details).
 * Built from the existing tokens and primitives (Card, Empty); no new external components.
 */
import { ArrowDownRight, ArrowUpRight, CircleAlert, Minus, Sparkle } from "lucide-react";
import { cn } from "../../lib/utils";
import { exclusionLabels, HORIZON_WINDOWS, type ExclusionReason, type Horizon, type HistoryPoint, type SeriesSummary } from "../../lib/intel/ranking";
import { categoryLabel, chartLabel } from "../../lib/intel/views";
import { dateLabel } from "./view-models";

export function ChangeBadge({ change, newlyObserved = false, available = true }: { change: number | null; newlyObserved?: boolean; available?: boolean }) {
  if (!available) return <span className="text-xs text-muted-foreground">No comparable baseline</span>;
  if (newlyObserved) return <span className="inline-flex h-6 items-center gap-1 rounded-full border border-primary/25 bg-accent px-2 text-xs font-medium text-accent-foreground" title="Not in the comparable baseline's top N"><Sparkle className="size-3" aria-hidden="true" />Newly observed</span>;
  if (change == null) return <span className="text-xs text-muted-foreground">Unavailable</span>;
  const tone = change === 0 ? "border-border bg-muted text-muted-foreground" : change < 0 ? "border-destructive/20 bg-destructive/[0.07] text-destructive" : "border-success/20 bg-success/[0.08] text-success";
  return <span className={cn("inline-flex h-6 min-w-12 items-center justify-center gap-0.5 rounded-full border px-2 text-xs font-medium tabular-nums", tone)}>
    {change < 0 ? <ArrowDownRight className="size-3.5" aria-hidden="true" /> : change > 0 ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <Minus className="size-3" aria-hidden="true" />}
    <span className="sr-only">{change > 0 ? "Up" : change < 0 ? "Down" : "No change"}</span>{change > 0 ? "+" : ""}{change}
  </span>;
}

/**
 * Position history as a small inverted line (rank 1 at the top). Gaps are real: points where the app was
 * not observed in the top N or the snapshot was excluded break the line; nothing is interpolated.
 */
export function RankSparkline({ points, depth, label, className }: { points: HistoryPoint[]; depth: number | null; label: string; className?: string }) {
  const max = Math.max(depth ?? 0, ...points.map(p => p.position ?? 0), 2);
  const w = 96, h = 24, n = Math.max(points.length - 1, 1);
  const x = (i: number) => (i / n) * (w - 4) + 2;
  const y = (pos: number) => 2 + ((pos - 1) / (max - 1)) * (h - 4);
  const segments: string[] = [];
  let current = "";
  points.forEach((p, i) => {
    if (p.eligible && p.position != null) current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(p.position).toFixed(1)}`;
    else if (current) { segments.push(current); current = ""; }
  });
  if (current) segments.push(current);
  const observed = points.filter(p => p.eligible && p.position != null);
  const summary = observed.length ? `${label}: observed in ${observed.length} of ${points.length} snapshots, best #${Math.min(...observed.map(p => p.position!))}, latest ${points.at(-1)?.position != null ? `#${points.at(-1)!.position}` : "not observed"}` : `${label}: not observed in comparable snapshots`;
  return <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-6 w-24 overflow-visible", className)} role="img" aria-label={summary}>
    <title>{summary}</title>
    {points.map((p, i) => !p.eligible ? <line key={p.snapshotId} x1={x(i)} x2={x(i)} y1={2} y2={h - 2} stroke="var(--border)" strokeDasharray="2 2" /> : null)}
    {segments.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
    {observed.length === 1 && (() => { const i = points.indexOf(observed[0]!); return <circle cx={x(i)} cy={y(observed[0]!.position!)} r={2} fill="var(--chart-1)" />; })()}
  </svg>;
}

export const seriesTitle = (s: Pick<SeriesSummary, "store" | "context" | "category">) => `${chartLabel(s.context)} · ${categoryLabel(s.store, s.category)}`;
export const horizonLabel = (h: Horizon) => HORIZON_WINDOWS[h].label;

export function elapsedLabel(hours: number | null): string {
  if (hours == null) return "Not available";
  return hours < 48 ? `${hours} hours` : `${Math.round(hours / 24 * 10) / 10} days`;
}

/** Coverage and comparability facts for one series. Everything shown is observed, not estimated. */
export function CoveragePanel({ summary, excluded, horizon, baselineAt, latestAt, depth }: {
  summary: SeriesSummary; excluded: { id: number; observedAt: string; reasons: ExclusionReason[] }[];
  horizon: Horizon; baselineAt: string | null; latestAt: string | null; depth: number | null;
}) {
  const w = HORIZON_WINDOWS[horizon];
  return <div className="grid gap-3 text-xs text-muted-foreground">
    <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
      <Fact label="List depth">{depth == null ? "Unknown" : `Top ${depth} (bounded list, not the whole store)`}</Fact>
      <Fact label="Latest comparable observation">{latestAt ? dateLabel(latestAt) : "None"}{summary.stale && latestAt ? " · stale" : ""}</Fact>
      <Fact label={`${horizonLabel(horizon)} baseline`}>{baselineAt ? dateLabel(baselineAt) : `None between ${w.min}h and ${w.max}h earlier`}</Fact>
      <Fact label="Snapshots in the last 35 days">{summary.snapshotCount} collected · {summary.eligibleCount} comparable</Fact>
      {summary.otherDepthCount > 0 && <Fact label="Other depths">{summary.otherDepthCount} comparable snapshots at a different depth are kept as a separate series</Fact>}
      <Fact label="Source">{summary.source}</Fact>
    </dl>
    {excluded.length > 0 && <details className="rounded-md border bg-muted/50 px-3 py-2">
      <summary className="cursor-pointer font-medium text-foreground">{excluded.length} excluded snapshot{excluded.length === 1 ? "" : "s"}</summary>
      <ul className="mt-2 grid gap-1">{excluded.slice(0, 12).map(s => <li key={s.id} className="flex flex-wrap gap-x-2"><span className="tabular-nums">{dateLabel(s.observedAt)}</span><span>· {s.reasons.map(r => exclusionLabels[r]).join(", ")}</span></li>)}</ul>
    </details>}
  </div>;
}
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  // Explicit utilities override the App Details `.product-shell dl` rules (space-between, right-aligned dd).
  return <div className="flex min-w-0 flex-col justify-start gap-0.5 border-0 p-0 text-xs"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="m-0 text-left text-foreground">{children}</dd></div>;
}

export function IntegrityNote({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-2 px-1 text-xs/relaxed text-muted-foreground"><CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{children}</p>;
}
