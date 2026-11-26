"use client";
import { ArrowDownRight, ArrowUpRight, Info, LayoutDashboard, Compass, Radar } from "lucide-react";
import BarChart from "../ui/bar-chart";
import { StatCard, StatCardGroup } from "../ui/stat-card";
import { PartitionBar, PartitionBarSegment, PartitionBarSegmentTitle, PartitionBarSegmentValue } from "../ui/partition-bar";

/**
 * Static, illustrative product preview for the public landing page.
 * Every value below is a hard-coded sample: it does not read Supabase, the demo catalog,
 * or the collection engine, and it is labelled as illustrative on screen.
 */
const categories = ["Productivity", "Health & Fitness", "Finance", "Education", "Photo & Video"];
const listings = [42, 35, 28, 24, 17];
const rankings = [
  { name: "Sample App A", meta: "App Store · Productivity", position: 1, change: 3 },
  { name: "Sample App B", meta: "Google Play · Finance", position: 2, change: -1 },
  { name: "Sample App C", meta: "App Store · Education", position: 3, change: 5 },
];

export function ProductPreview() {
  return <figure className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="preview-caption">
    <div className="flex items-center justify-between gap-3 border-b bg-muted px-4 py-2.5">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground"><span className="grid size-5 place-items-center rounded-md bg-primary text-primary-foreground"><Radar className="size-3" /></span>AppRadar</div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning"><Info className="size-3" aria-hidden="true" />Illustrative data</span>
    </div>
    <div className="flex">
      <div className="hidden w-44 shrink-0 flex-col gap-1 border-r bg-sidebar p-3 md:flex" aria-hidden="true">
        <span className="flex h-8 items-center gap-2 rounded-md bg-sidebar-accent px-2 text-xs font-medium text-sidebar-accent-foreground"><LayoutDashboard className="size-3.5" />Dashboard</span>
        <span className="flex h-8 items-center gap-2 rounded-md px-2 text-xs text-sidebar-foreground"><Compass className="size-3.5 text-muted-foreground" />App Explorer</span>
      </div>
      <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
        <div>
          <div className="text-sm font-semibold text-foreground">Market overview</div>
          <div className="text-xs text-muted-foreground">Sample values for illustration only</div>
        </div>
        <StatCardGroup aria-label="Illustrative catalog overview" className="[&>[data-slot=stat-card]]:basis-[8.5rem]">
          <StatCard className="px-4 py-3" label="Apps in catalog" value="146" hint="Sample value" />
          <StatCard className="px-4 py-3" label="Current listings" value="292" hint="Sample value" />
          <StatCard className="px-4 py-3" label="Categories" value="5" hint="Sample value" />
        </StatCardGroup>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Listings by category</div>
            <BarChart orientation="horizontal" animated={false} showValues name="Listings" aria-label="Illustrative listings by category" data={listings} labels={categories} defaultIndex={0} color="var(--chart-1)" radius={3} formatValueText={(value, index) => `${categories[index]}: ${value} sample listings`} />
          </div>
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div>
              <div className="mb-2 text-xs font-medium text-foreground">Ranking changes</div>
              <ul className="divide-y">{rankings.map(row => <li key={row.name} className="flex items-center gap-3 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-[11px] font-semibold text-accent-foreground">{row.name.slice(-1)}</span>
                <span className="grid min-w-0 flex-1 leading-tight"><span className="truncate text-xs font-medium text-foreground">{row.name}</span><span className="truncate text-[11px] text-muted-foreground">{row.meta}</span></span>
                <span className="text-xs font-medium tabular-nums text-foreground">#{row.position}</span>
                <span className={`inline-flex min-w-11 items-center justify-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${row.change > 0 ? "border-success/20 bg-success/[0.08] text-success" : "border-destructive/20 bg-destructive/[0.07] text-destructive"}`}>{row.change > 0 ? <ArrowUpRight className="size-3" aria-hidden="true" /> : <ArrowDownRight className="size-3" aria-hidden="true" />}{row.change > 0 ? "+" : ""}{row.change}</span>
              </li>)}</ul>
            </div>
            <div className="mt-auto">
              <div className="mb-2 text-xs font-medium text-foreground">Store coverage</div>
              <PartitionBar size="sm" gap={0.75} aria-label="Illustrative apps per store">
                <PartitionBarSegment num={81} variant="chart-1"><PartitionBarSegmentTitle className="text-[11px]">App Store</PartitionBarSegmentTitle><PartitionBarSegmentValue>81 sample apps</PartitionBarSegmentValue></PartitionBarSegment>
                <PartitionBarSegment num={65} variant="chart-3" alignment="right"><PartitionBarSegmentTitle className="text-[11px]">Google Play</PartitionBarSegmentTitle><PartitionBarSegmentValue>65 sample apps</PartitionBarSegmentValue></PartitionBarSegment>
              </PartitionBar>
            </div>
          </div>
        </div>
      </div>
    </div>
    <figcaption id="preview-caption" className="border-t bg-muted px-4 py-2.5 text-[11px] text-muted-foreground">Illustrative preview with sample values. It does not show real store data, downloads or revenue.</figcaption>
  </figure>;
}

