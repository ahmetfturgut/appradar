"use client";
import { ArrowDownRight, ArrowUpRight, Info, LayoutDashboard, Compass, Radar } from "lucide-react";
import BarChart from "../ui/bar-chart";
import { Sparkline, StatCard, StatCardGroup } from "../ui/stat-card";
import { PartitionBar, PartitionBarSegment, PartitionBarSegmentTitle, PartitionBarSegmentValue } from "../ui/partition-bar";
import type { LandingDictionary } from "../../lib/landing/dictionaries";
import type { LandingLocale } from "../../lib/landing/locale";

// Local illustration only: no Supabase, demo catalog, real store content or network access.
const listings = [42, 35, 28, 24, 17];
const rankings = [{ letter: "A", store: "App Store", category: 0, position: 1, change: 3 }, { letter: "B", store: "Google Play", category: 2, position: 2, change: -1 }, { letter: "C", store: "App Store", category: 3, position: 3, change: 5 }];
const history = [4.1, 4.2, 4.15, 4.3, 4.25, 4.4];

export function ProductPreview({ text, locale }: { text: LandingDictionary["preview"]; locale: LandingLocale }) {
  const intlLocale = locale === "tr" ? "tr-TR" : "en-US";
  const number = new Intl.NumberFormat(intlLocale);
  return <figure className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="preview-caption">
    <div className="flex items-center justify-between gap-3 border-b bg-muted px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground"><span className="grid size-5 place-items-center rounded-md bg-primary text-primary-foreground"><Radar className="size-3" aria-hidden="true" /></span>AppRadar</div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"><Info className="size-3" aria-hidden="true" />{text.illustrative}</span>
    </div>
    <div className="flex">
      <div className="hidden w-40 shrink-0 flex-col gap-1 border-r bg-sidebar p-3 lg:flex" aria-hidden="true">
        <span className="flex min-h-9 items-center gap-2 rounded-md bg-sidebar-accent px-2 text-xs font-medium text-sidebar-accent-foreground"><LayoutDashboard className="size-3.5" />{text.dashboard}</span>
        <span className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs text-sidebar-foreground"><Compass className="size-3.5 text-muted-foreground" />{text.explorer}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
        <div><div className="text-base font-semibold text-foreground">{text.overview}</div><div className="mt-1 text-xs text-muted-foreground">{text.context}</div></div>
        <StatCardGroup aria-label={text.statsLabel} className="[&>[data-slot=stat-card]]:basis-[8.5rem]">
          <StatCard className="px-4 py-3" label={text.apps} value="146" hint={text.sample} />
          <StatCard className="px-4 py-3" label={text.listings} value="146" hint={text.sample} />
          <StatCard className="px-4 py-3" label={text.categories} value="5" hint={text.sample} />
        </StatCardGroup>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-lg border p-4"><div className="mb-3 text-xs font-medium text-foreground">{text.distribution}</div>
            <BarChart orientation="horizontal" animated={false} showValues name={text.listings} locale={intlLocale} aria-label={text.distributionLabel} data={listings} labels={text.categoryNames} defaultIndex={0} color="var(--chart-1)" radius={3} formatValueText={(value, index) => `${text.categoryNames[index]}: ${number.format(value)} ${text.sampleListings}`} />
          </div>
          <div className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
            <div><div className="mb-2 text-xs font-medium text-foreground">{text.rankings}</div>
              <ul className="divide-y">{rankings.map(row => <li key={row.letter} className="flex items-center gap-2 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-[11px] font-semibold text-accent-foreground" aria-hidden="true">{row.letter}</span>
                <span className="grid min-w-0 flex-1 leading-tight"><span className="truncate text-xs font-medium text-foreground">{text.sampleApp} {row.letter}</span><span className="truncate text-[11px] text-muted-foreground">{row.store} · {text.categoryNames[row.category]}</span></span>
                <span className="text-xs font-medium tabular-nums text-foreground">#{row.position}</span>
                <span className={`inline-flex min-w-10 items-center justify-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${row.change > 0 ? "border-success/20 bg-success/[0.08] text-success" : "border-destructive/20 bg-destructive/[0.07] text-destructive"}`}><span className="sr-only">{Math.abs(row.change)} {row.change > 0 ? text.rankUp : text.rankDown}</span><span aria-hidden="true" className="inline-flex items-center">{row.change > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{row.change > 0 ? "+" : ""}{row.change}</span></span>
              </li>)}</ul>
            </div>
            <div className="mt-auto"><div className="mb-3 text-xs font-medium text-foreground">{text.coverage}</div>
              <PartitionBar size="sm" gap={0.75} aria-label={text.coverageLabel}>
                <PartitionBarSegment num={81} variant="chart-1"><PartitionBarSegmentTitle className="text-[11px]">App Store</PartitionBarSegmentTitle><PartitionBarSegmentValue>81 {text.sampleApps}</PartitionBarSegmentValue></PartitionBarSegment>
                <PartitionBarSegment num={65} variant="chart-3" alignment="right"><PartitionBarSegmentTitle className="text-[11px]">Google Play</PartitionBarSegmentTitle><PartitionBarSegmentValue>65 {text.sampleApps}</PartitionBarSegmentValue></PartitionBarSegment>
              </PartitionBar>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"><div><p className="text-xs font-medium">{text.history}</p><p className="mt-1 text-[11px] text-muted-foreground">{text.historyPeriod}</p></div><div className="flex items-center gap-4"><span className="text-xs tabular-nums text-muted-foreground">{number.format(4.1)} → <strong className="font-semibold text-foreground">{number.format(4.4)}</strong></span><Sparkline values={history} area={false} role="img" aria-label={text.historyLabel} className="h-8 w-28" /></div></div>
      </div>
    </div>
    <figcaption id="preview-caption" className="border-t bg-muted px-4 py-3 text-xs/relaxed text-muted-foreground">{text.caption}</figcaption>
  </figure>;
}
