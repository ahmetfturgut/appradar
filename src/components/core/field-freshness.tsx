import type { ReactNode } from "react";
import type { FieldFreshness, Freshness, FreshnessSummary, ListingField } from "../../lib/read/field-freshness";
import { dateLabel } from "./view-models";
import { FreshnessHint } from "./freshness-hint";

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

/**
 * `compact` (data tables): same per-field semantics, presented as a fixed 24px indicator slot beside the
 * value (amber clock = stale, help icon = unknown, empty = current) so values stay aligned and rows keep
 * one height. The default (inline) presentation is kept for App Details and cards.
 */
export function FieldValue({ fields, field, children, compact = false }: { fields?: FieldFreshness | undefined; field: ListingField; children?: ReactNode; compact?: boolean }) {
  const freshness = fields?.[field];
  const warn = !freshness || freshness.status === "unknown" || freshness.status === "stale";
  if (compact) {
    const stale = freshness?.status === "stale" && !!freshness.lastObservedAt;
    return <span className="inline-flex items-center gap-0.5 align-middle" title={warn ? undefined : observationTitle(freshness)}>
      <span className="min-w-0">{children}</span>
      {warn
        ? <FreshnessHint kind={stale ? "stale" : "unknown"}
          label={stale ? `Stale · observed ${dateLabel(freshness!.lastObservedAt)}` : "Freshness unknown"}
          detail={stale ? ` Field last observed ${freshness!.lastObservedAt} (UTC). Listing checks do not refresh retained metrics.` : ` ${observationTitle(freshness)}`} />
        : <span className="inline-block size-6 shrink-0" aria-hidden="true" />}
    </span>;
  }
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
