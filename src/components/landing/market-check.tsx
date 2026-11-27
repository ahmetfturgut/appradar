"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, FlaskConical, Info } from "lucide-react";
import { Card } from "../ui/card";
import { MARKET_THRESHOLDS, type Indicator } from "../../lib/intel/market";
import { EXAMPLE_OBSERVED_AT, INDICATOR_KEYS, marketCheck, SCENARIO_IDS, type ScenarioId } from "../../lib/landing/market-check-data";
import type { MarketCheckCopy } from "../../lib/landing/dictionaries";
import type { LandingLocale } from "../../lib/landing/locale";
import { LANDING_BRAND } from "../../lib/landing/config";

const badge = "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-accent/50 px-2.5 py-1 text-xs font-medium text-accent-foreground";

export function MarketCheck({ text: t, locale }: { text: MarketCheckCopy; locale: LandingLocale }) {
  const [scenario, setScenario] = useState<ScenarioId>("habits");
  const [limited, setLimited] = useState(false);
  const [selected, setSelected] = useState(0);
  const model = marketCheck(scenario, limited);
  const intlLocale = locale === "tr" ? "tr-TR" : "en-US";
  const number = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: 1 });
  const date = (value: string) => new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
  const comparison = t.compare;
  const steps = [comparison.questions[scenario], comparison.observations[selected]!, comparison.uncertainties[selected]!, comparison.next[scenario]];

  return <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/70 px-4 py-4 sm:px-6">
      <span className="inline-flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-primary" aria-hidden="true" />{LANDING_BRAND.name}<span className="font-normal text-muted-foreground">/ {t.sample.toLocaleLowerCase(intlLocale)}</span></span>
      <span className={badge}><FlaskConical className="size-3.5" aria-hidden="true" />{t.synthetic}</span>
    </div>
    <div className="p-4 sm:p-6 lg:p-8">
      <div role="group" aria-label={t.scenariosLabel} className="grid gap-2 sm:inline-flex sm:rounded-lg sm:bg-muted sm:p-1">
        {SCENARIO_IDS.map(id => <button key={id} type="button" aria-pressed={scenario === id} onClick={() => { setScenario(id); setSelected(0); }} className={`min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none ${scenario === id ? "border-border bg-card text-foreground shadow-xs" : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"}`}>{t.scenarios[id]}</button>)}
      </div>
      <div className="my-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.scenarios[scenario]}</h3><p className="mt-2 text-xs/relaxed text-muted-foreground">{t.context}<br />{t.observed}: <time dateTime={EXAMPLE_OBSERVED_AT}>{date(EXAMPLE_OBSERVED_AT)}</time></p></div>
        <p className="text-sm text-muted-foreground">{t.sample}: <strong className="font-semibold tabular-nums text-foreground">{model.apps.length}</strong> {t.apps}</p>
      </div>
      <label className="mb-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm">
        <input type="checkbox" checked={limited} onChange={event => setLimited(event.target.checked)} aria-controls="market-indicators" className="size-4 shrink-0 accent-primary" />{t.limited}
      </label>
      <p role="status" aria-live="polite" aria-atomic="true" className={limited ? "mb-4 rounded-lg bg-accent/50 px-3 py-2 text-sm/relaxed text-accent-foreground" : "sr-only"}>
        {t.scenarios[scenario]} · {model.apps.length} {t.apps}. {limited ? t.limitedNote : ""}
      </p>
      <div id="market-indicators" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INDICATOR_KEYS.map((key, index) => {
          const indicator = model.indicators[key], copy = t.metrics[key];
          const value = indicator.value == null ? null : key === "incumbentStrength" ? number.format(indicator.value) : percent.format(indicator.value / 100);
          return <Card key={key} className="justify-between shadow-none" data-indicator={key}>
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-2"><h4 className="text-sm/relaxed font-medium">{copy.title}</h4><span className="pt-0.5 text-xs tabular-nums text-muted-foreground" aria-hidden="true">0{index + 1}</span></div>
              <div className="min-h-12 text-[2rem] leading-tight font-semibold tracking-tight tabular-nums text-foreground">{value ?? <span className="block pt-1 text-lg leading-snug text-muted-foreground">{t.insufficient}</span>}</div>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">{copy.short}</p>
              <div className={`my-4 h-1 overflow-hidden rounded-full ${key === "incumbentStrength" ? "" : "bg-muted"}`} aria-hidden="true">{key !== "incumbentStrength" && <div className="h-full rounded-full bg-primary/70" style={{ width: `${indicator.value ?? 0}%` }} />}</div>
              <p className="text-xs/relaxed tabular-nums text-muted-foreground">
                {indicator.numerator != null && <><strong className="font-medium text-foreground">{number.format(indicator.numerator)}</strong> / </>}
                <strong className="font-medium text-foreground">{indicator.denominator}</strong> {t.known} · {indicator.unknown} {t.unknown}
              </p>
              <SampleWarnings indicator={indicator} text={t} />
            </div>
            <details className="border-t px-4 sm:px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-medium [&::-webkit-details-marker]:hidden">{t.workings}<ChevronDown className="size-3.5 shrink-0" aria-hidden="true" /></summary>
              <div className="space-y-3 pb-4 text-xs/relaxed text-muted-foreground">
                <p><strong className="font-medium text-foreground">{t.method}.</strong> {copy.rule}</p>
                <p>{t.coverage}: {indicator.denominator} / {indicator.cohortSize} ({percent.format(indicator.denominator / indicator.cohortSize)}).</p>
                {key === "pricing" && indicator.details.medianPaidPrice != null && <p>{t.paidMedian}: {new Intl.NumberFormat(intlLocale, { style: "currency", currency: String(indicator.details.mainCurrency) }).format(Number(indicator.details.medianPaidPrice))}</p>}
                <p>{t.source}<br />{t.context}<br />{t.observed}: {date(EXAMPLE_OBSERVED_AT)}</p>
              </div>
            </details>
            <p className="border-t bg-muted/40 px-4 py-3 text-xs/relaxed text-muted-foreground sm:px-5">{copy.limit}</p>
          </Card>;
        })}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs/relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{t.thresholdNote}</p>

      <section aria-labelledby="comparison-title" className="mt-8 border-t pt-8">
        <div className="mb-5 max-w-2xl"><span className={`${badge} mb-3`}>{t.synthetic}</span><h3 id="comparison-title" className="text-xl font-semibold tracking-tight">{comparison.title}</h3><p className="mt-2 text-sm/relaxed text-muted-foreground">{comparison.description}</p></div>
        <div role="group" aria-label={comparison.select} className="grid gap-3 md:grid-cols-3">
          {model.comparison.map((app, i) => <button type="button" key={app.appId} aria-pressed={selected === i} onClick={() => setSelected(i)} className={`min-w-0 rounded-xl border p-4 text-left transition-colors motion-reduce:transition-none ${selected === i ? "border-primary bg-accent/30 ring-1 ring-primary" : "border-border bg-card hover:bg-muted"}`}>
            <span className="mb-4 flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-card text-xs font-semibold text-primary" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span className="min-w-0 text-sm font-semibold">{app.name}</span><ArrowRight className={`ml-auto size-4 shrink-0 ${selected === i ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" /></span>
            <span className="grid gap-2 text-xs text-muted-foreground">
              <span className="flex justify-between gap-2"><span>{comparison.rating}</span><strong className="font-medium tabular-nums text-foreground">{app.rating == null ? comparison.unavailable : `${number.format(app.rating)} / 5`}</strong></span>
              <span className="flex justify-between gap-2"><span>{comparison.ratings}</span><strong className="font-medium tabular-nums text-foreground">{app.ratingCount == null ? comparison.unavailable : number.format(app.ratingCount)}</strong></span>
              <span className="flex flex-wrap justify-between gap-x-2 gap-y-1"><span>{comparison.update}</span><strong className="font-medium text-foreground">{app.storeUpdatedAt ? date(app.storeUpdatedAt) : comparison.unavailable}</strong></span>
            </span>
          </button>)}
        </div>
        <ol aria-live="polite" aria-atomic="true" className="mt-5 grid gap-5 rounded-xl bg-muted p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {steps.map((step, i) => <li key={i} className="min-w-0"><p className="mb-2 text-xs font-semibold text-primary">0{i + 1} / {comparison.steps[i]}</p><p className="text-sm/relaxed text-foreground">{step}</p></li>)}
        </ol>
      </section>
    </div>
  </div>;
}

function SampleWarnings({ indicator, text: t }: { indicator: Indicator; text: MarketCheckCopy }) {
  if (indicator.status === "insufficient") return <p className="mt-2 text-xs font-medium text-warning">{t.withheld}</p>;
  return <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-warning">
    {indicator.denominator < MARKET_THRESHOLDS.smallSample && <span className="rounded border border-warning/20 px-1.5 py-0.5">{t.smallSample}</span>}
    {indicator.denominator / indicator.cohortSize < MARKET_THRESHOLDS.minCoverage && <span className="rounded border border-warning/20 px-1.5 py-0.5">{t.lowCoverage}</span>}
  </div>;
}
