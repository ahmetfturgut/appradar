/**
 * Small multi-series line chart for comparisons (inline SVG, theme tokens, no chart library).
 * Gaps are real: a null value breaks the line. Each series also differs by dash pattern, not only colour.
 * A data table alternative is always provided.
 */
import { dateLabel } from "./view-models";

export interface ChartSeries { key: string; label: string; points: { at: string; value: number | null }[] }
const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)"];
const DASHES = ["", "6 4", "2 3"];

export function OverlayChart({ title, series, invert = false, format = (v: number) => String(v) }: { title: string; series: ChartSeries[]; invert?: boolean; format?: (v: number) => string }) {
  const values = series.flatMap(s => s.points.flatMap(p => p.value == null ? [] : [p.value]));
  const times = series.flatMap(s => s.points.map(p => Date.parse(p.at))).filter(Number.isFinite);
  if (!values.length || !times.length) return <p className="text-xs text-muted-foreground">No observations to chart.</p>;
  const [minV, maxV] = [Math.min(...values), Math.max(...values)], [minT, maxT] = [Math.min(...times), Math.max(...times)];
  const W = 560, H = 160, P = { l: 44, r: 8, t: 8, b: 22 };
  const x = (t: number) => P.l + (maxT === minT ? (W - P.l - P.r) / 2 : ((t - minT) / (maxT - minT)) * (W - P.l - P.r));
  const span = maxV - minV || 1;
  const y = (v: number) => { const r = (v - minV) / span; return P.t + (invert ? r : 1 - r) * (H - P.t - P.b); };
  const ticks = [minV, minV + span / 2, maxV];
  const summary = series.map(s => { const known = s.points.filter(p => p.value != null); return `${s.label}: ${known.length} observations${known.length ? `, latest ${format(known.at(-1)!.value!)}` : ""}`; }).join("; ");
  return <figure className="m-0 flex flex-col gap-2">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. ${summary}`}>
      {ticks.map((t, i) => <g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="2 3" /><text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{format(Math.round(t * 10) / 10)}</text></g>)}
      <text x={P.l} y={H - 6} fontSize="10" fill="var(--muted-foreground)">{dateLabel(new Date(minT).toISOString())}</text>
      <text x={W - P.r} y={H - 6} fontSize="10" fill="var(--muted-foreground)" textAnchor="end">{dateLabel(new Date(maxT).toISOString())}</text>
      {series.map((s, i) => {
        const segments: string[] = []; let d = "";
        for (const p of [...s.points].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
          if (p.value == null) { if (d) segments.push(d); d = ""; continue; }
          d += `${d ? "L" : "M"}${x(Date.parse(p.at)).toFixed(1)},${y(p.value).toFixed(1)}`;
        }
        if (d) segments.push(d);
        return <g key={s.key}>{segments.map((seg, j) => <path key={j} d={seg} fill="none" stroke={COLORS[i % 3]} strokeWidth={1.75} strokeDasharray={DASHES[i % 3]} strokeLinejoin="round" />)}
          {segments.length === 0 ? null : s.points.filter(p => p.value != null).length === 1 && (() => { const p = s.points.find(q => q.value != null)!; return <circle cx={x(Date.parse(p.at))} cy={y(p.value!)} r={3} fill={COLORS[i % 3]} />; })()}</g>;
      })}
    </svg>
    <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">{series.map((s, i) => <span key={s.key} className="inline-flex items-center gap-1.5"><svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" stroke={COLORS[i % 3]} strokeWidth="2" strokeDasharray={DASHES[i % 3]} /></svg>{s.label}</span>)}</figcaption>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Data table</summary>
      <div className="relative mt-2 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-xs"><caption className="sr-only">{title}</caption>
        <thead><tr className="border-b"><th scope="col" className="py-1 pr-3 font-medium">Observed</th>{series.map(s => <th key={s.key} scope="col" className="py-1 pr-3 font-medium">{s.label}</th>)}</tr></thead>
        <tbody>{[...new Set(series.flatMap(s => s.points.map(p => p.at)))].sort().map(at => <tr key={at} className="border-b last:border-b-0"><td className="py-1 pr-3 tabular-nums">{dateLabel(at)}</td>{series.map(s => { const p = s.points.find(q => q.at === at); return <td key={s.key} className="py-1 pr-3 tabular-nums">{p?.value != null ? format(p.value) : p ? "Not available" : "—"}</td>; })}</tr>)}</tbody>
      </table></div>
    </details>
  </figure>;
}
