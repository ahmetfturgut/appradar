"use client";

import { useEffect, useId, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { compact, count, dateLabel, type HistoryPoint } from "./view-models";

export function HistoryChart({ points, referenceDate, label }: { points: HistoryPoint[]; referenceDate: string; label: string }) {
  const [metric, setMetric] = useState<"ratingCount" | "rating">("ratingCount");
  const [range, setRange] = useState<7 | 30>(30);
  const [tips, setTips] = useState(false);
  // SVG <title> text is dropped by the HTML parser, so tooltips are attached after hydration.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTips(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const titleId = useId();
  const lastDate = points.length ? Date.parse(points[points.length - 1]!.date) : 0;
  const visible = points.filter(point => Date.parse(point.date) >= Date.parse(referenceDate) - range * 86400000 && Date.parse(point.date) <= Date.parse(referenceDate));
  const valid = visible.filter(point => point[metric] != null);
  const values = valid.map(point => point[metric]!);
  const min = metric === "rating" ? 0 : Math.min(...values);
  const max = metric === "rating" ? 5 : Math.max(...values);
  const span = max - min || 1;
  const firstDate = visible.length ? Date.parse(visible[0]!.date) : 0;
  const visibleLastDate = visible.length ? Date.parse(visible[visible.length - 1]!.date) : lastDate;
  const timeSpan = visibleLastDate - firstDate || 1;
  const x = (point: HistoryPoint) => 64 + (Date.parse(point.date) - firstDate) / timeSpan * 616;
  const y = (value: number) => 210 - (value - min) / span * 170;
  const segments: HistoryPoint[][] = [];
  let segment: HistoryPoint[] = [];
  for (const point of visible) {
    if (point[metric] == null) { if (segment.length) segments.push(segment); segment = []; }
    else segment.push(point);
  }
  if (segment.length) segments.push(segment);
  return <section className="product-panel product-history" aria-labelledby={titleId}>
    <div className="product-panel-heading"><div><h2 id={titleId}>Metric history</h2><p>{label} · gaps remain visible</p></div><div className="product-segmented" role="group" aria-label="History date range">{([7, 30] as const).map(days => <button key={days} aria-pressed={range === days} onClick={() => setRange(days)}>{days}D</button>)}</div></div>
    <div className="product-chart-toolbar"><label>Metric <select value={metric} onChange={event => setMetric(event.target.value as typeof metric)}><option value="ratingCount">Rating count</option><option value="rating">Rating (0–5)</option></select></label><span className="product-muted">{visible.length > 0 ? `${dateLabel(visible[0]!.date)} – ${dateLabel(visible[visible.length - 1]!.date)}` : "No dates available"}</span></div>
    {valid.length < 2 ? <div className="product-state"><ChartNoAxesCombined size={28} /><h3>Not enough history yet</h3><p>At least two comparable observations are needed for this metric.</p></div> : <>
      <div className="product-chart-summary"><strong>{metric === "ratingCount" ? count(values[values.length - 1]!) : values[values.length - 1]!.toFixed(2)}</strong><span>{metric === "ratingCount" ? "ratings at the last available observation" : "out of 5 at the last available observation"}</span></div>
      <svg className="product-chart" viewBox="0 0 720 255" role="img" aria-label={`${metric === "rating" ? "Rating" : "Rating count"} history. ${valid.length} observations. First value ${values[0]}, last value ${values[values.length - 1]}. A data table follows.`}>
        {[0, 1, 2, 3, 4].map(tick => { const value = min + span * tick / 4; return <g key={tick}><line x1="64" x2="680" y1={y(value)} y2={y(value)} stroke="var(--border)" /><text x="52" y={y(value) + 4} textAnchor="end">{metric === "rating" ? value.toFixed(1) : compact(value)}</text></g>; })}
        {segments.map((part, index) => {
          const line = part.map(point => `${x(point)},${y(point[metric]!)}`).join(" ");
          const first = part[0]!, last = part[part.length - 1]!;
          return <g key={index}><polygon points={`${x(first)},210 ${line} ${x(last)},210`} fill="var(--chart-1)" opacity="0.12" /><polyline points={line} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" /></g>;
        })}
        {valid.map(point => <circle key={`${point.date}:${valid.indexOf(point)}`} cx={x(point)} cy={y(point[metric]!)} r="3.5" fill="var(--chart-1)">{tips ? <title>{dateLabel(point.date)}: {point[metric]}</title> : null}</circle>)}
        {[visible[0]!, visible[visible.length - 1]!].map((point, index) => <text key={index} x={x(point)} y="242" textAnchor={index === 0 ? "start" : "end"}>{dateLabel(point.date)}</text>)}
      </svg>
    </>}
    <details className="product-chart-data"><summary>View underlying observations</summary><div className="product-table-scroll"><table className="product-table"><caption className="sr-only">Stored history observations</caption><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Rating</th><th scope="col">Rating count</th></tr></thead><tbody>{visible.map(point => <tr key={`${point.date}:${visible.indexOf(point)}`}><td>{dateLabel(point.date)}</td><td>{point.rating?.toFixed(2) ?? "Not available"}</td><td>{count(point.ratingCount)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
