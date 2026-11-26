import type { ReactNode } from "react";
import type { FieldFreshness, Freshness, FreshnessSummary, ListingField } from "../../lib/read/field-freshness";
import { dateLabel } from "./view-models";

export function FieldFreshnessLabel({ freshness }: { freshness?: Freshness | undefined }) {
  const unknown = !freshness || freshness.status === "unknown";
  return <small className={`block text-[10px] leading-relaxed font-normal ${freshness?.status === "stale" ? "text-warning" : "text-muted-foreground"}`} title={unknown ? "No usable field provenance; listing observation time is not a substitute." : `Retained field observed at ${freshness.lastObservedAt} (UTC).`}>
    {unknown ? "Metric freshness unknown" : `${freshness.status === "stale" ? "Stale metric" : "Metric observed"} · ${dateLabel(freshness.lastObservedAt)}`}
  </small>;
}

export function FieldValue({ fields, field, children }: { fields?: FieldFreshness | undefined; field: ListingField; children?: ReactNode }) {
  return <span className="inline-flex flex-col items-start gap-0.5">{children}<FieldFreshnessLabel freshness={fields?.[field]} /></span>;
}

export function MetricFreshnessSummary({ value }: { value?: FreshnessSummary | undefined }) {
  return <span className="block text-[10px] leading-relaxed text-muted-foreground">{value
    ? `Metric provenance: ${value.stale} stale · ${value.unknown} unknown · oldest ${dateLabel(value.oldest)}`
    : "Metric freshness unknown"}. Listing observations do not refresh retained metrics.</span>;
}
