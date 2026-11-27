import type { ReactNode } from "react";
import type { FieldFreshness, Freshness, FreshnessSummary, ListingField } from "../../lib/read/field-freshness";
import { dateLabel } from "./view-models";

function observationTitle(freshness?: Freshness | undefined): string {
  if (!freshness || freshness.status === "unknown" || !freshness.lastObservedAt) {
    return "No usable field provenance; listing observation time is not a substitute.";
  }
  return `Retained field observed at ${freshness.lastObservedAt} (UTC).`;
}

/** Visible only for stale/unknown; fresh observation times live in the parent title tooltip. */
export function FieldFreshnessLabel({ freshness }: { freshness?: Freshness | undefined }) {
  if (!freshness || freshness.status === "unknown") {
    return <small className="block text-[10px] leading-relaxed font-normal text-muted-foreground">Freshness unknown</small>;
  }
  if (freshness.status === "stale") {
    return <small className="block text-[10px] leading-relaxed font-normal text-warning">Stale · {dateLabel(freshness.lastObservedAt)}</small>;
  }
  return null;
}

export function FieldValue({ fields, field, children }: { fields?: FieldFreshness | undefined; field: ListingField; children?: ReactNode }) {
  const freshness = fields?.[field];
  const warn = !freshness || freshness.status === "unknown" || freshness.status === "stale";
  return <span className="inline-flex flex-col items-start gap-0.5" title={observationTitle(freshness)}>
    {children}
    {warn ? <FieldFreshnessLabel freshness={freshness} /> : null}
  </span>;
}

export function MetricFreshnessSummary({ value }: { value?: FreshnessSummary | undefined }) {
  return <span className="block text-[10px] leading-relaxed text-muted-foreground">{value
    ? `Metric provenance: ${value.stale} stale · ${value.unknown} unknown · oldest ${dateLabel(value.oldest)}`
    : "Metric freshness unknown"}. Listing checks do not refresh retained metrics.</span>;
}
