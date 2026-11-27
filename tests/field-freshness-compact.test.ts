import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FieldValue } from "../src/components/core/field-freshness.tsx";
import type { FieldFreshness } from "../src/lib/read/field-freshness.ts";

const fresh = { lastObservedAt: "2026-11-27T08:00:00.000Z", ageHours: 2, status: "fresh", staleAfterHours: 72 } as const;
const stale = { lastObservedAt: "2026-11-22T13:05:07.169Z", ageHours: 120, status: "stale", staleAfterHours: 72 } as const;
const unknown = { lastObservedAt: null, ageHours: null, status: "unknown", staleAfterHours: 72 } as const;

const render = (fields: FieldFreshness | undefined, value: string, compact = true) =>
  renderToStaticMarkup(createElement(FieldValue, { fields, field: "rating_count", compact }, value));

test("compact table freshness: per-field states stay distinguishable without inline text lines", () => {
  const current = render({ rating_count: fresh }, "12.3M");
  assert.doesNotMatch(current, /<button/);
  assert.match(current, /aria-hidden="true"/, "current values keep the reserved indicator slot for alignment");
  assert.match(current, /title="Retained field observed at 2026-11-27T08:00:00.000Z \(UTC\)\."/);

  const old = render({ rating_count: stale }, "12.1M");
  assert.match(old, /<button[^>]*aria-label="Stale · observed Nov 22, 2026"[^>]*data-freshness="stale"/);
  assert.doesNotMatch(old, /<small/, "no repeated inline stale line");

  const missing = render({ rating_count: unknown }, "11.9M");
  assert.match(missing, /aria-label="Freshness unknown"[^>]*data-freshness="unknown"/);
  const noProvenance = render(undefined, "11.9M");
  assert.match(noProvenance, /data-freshness="unknown"/);

  const unavailable = render({ rating_count: stale }, "Not available");
  assert.match(unavailable, />Not available</, "an unavailable value stays visible as text, separate from its freshness");
  assert.match(unavailable, /data-freshness="stale"/);

  // Freshness is per field: another field's status never leaks into this cell.
  assert.doesNotMatch(render({ rating_value: stale, rating_count: fresh }, "12.3M"), /<button/);
});

test("inline presentation (App Details, cards) is unchanged", () => {
  assert.match(render({ rating_count: stale }, "12.1M", false), /<small[^>]*text-warning[^>]*>Stale · (<!-- -->)?Nov 22, 2026<\/small>/);
  assert.match(render({ rating_count: unknown }, "11.9M", false), />Freshness unknown<\/small>/);
  assert.doesNotMatch(render({ rating_count: stale }, "12.1M", false), /<button/);
});
