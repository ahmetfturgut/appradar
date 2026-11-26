/**
 * App Details → Rankings. One row per chart / new-app list the app appeared in during the last 35 days.
 * Series are never merged: store, country, language, chart, category, source and depth stay separate.
 */
import Link from "next/link";
import { ChartNoAxesColumn } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import type { AppRankingSeries } from "../../lib/intel/views";
import { ReadNotice } from "./elements";
import { ChangeBadge, RankSparkline, seriesTitle } from "./rank-elements";
import { dateLabel, type ReadResult } from "./view-models";

export function AppRankings({ result, appName }: { result: ReadResult<AppRankingSeries[]>; appName: string }) {
  const series = result.state === "ready" ? result.data : null;
  return <Card className="mt-6" aria-labelledby="app-rankings">
    <CardHeader className="border-b">
      <CardTitle role="heading" aria-level={2} id="app-rankings">Rankings</CardTitle>
      <CardDescription>Chart and new-app list positions in the last 35 days, per list. A missing position means the app was not in that list&apos;s top N.</CardDescription>
    </CardHeader>
    <ReadNotice result={result} />
    {series && (series.length ? <ul className="divide-y">{series.map(s => <li key={s.id} className="grid grid-cols-1 items-center gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
      <div className="min-w-0">
        <Link href={`/${s.summary.kind === "new_apps" ? "new-releases" : "trending"}?country=${s.summary.country}&language=${encodeURIComponent(s.summary.requestedLanguage)}${s.summary.kind === "chart" ? `&store=${s.summary.store}` : ""}&series=${s.id}`} className="text-sm font-medium text-foreground hover:text-primary">{seriesTitle(s.summary)}</Link>
        <p className="text-xs text-muted-foreground">{s.summary.store === "ios" ? "App Store" : "Google Play"} · {s.summary.country} · {s.summary.requestedLanguage} · {s.summary.depth ? `top ${s.summary.depth}` : "depth unknown"} · in {s.observedIn} comparable snapshot{s.observedIn === 1 ? "" : "s"}{s.summary.latestEligible ? ` · latest ${dateLabel(s.summary.latestEligible.observedAt)}` : ""}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums">{s.latestPosition != null ? `#${s.latestPosition}` : <span className="text-xs font-normal text-muted-foreground">Not in latest top {s.summary.depth ?? "N"}</span>}</span>
      <ChangeBadge change={s.change1d} available={s.summary.horizons["1d"]} />
      <RankSparkline points={s.points} depth={s.summary.depth} label={`${appName} in ${seriesTitle(s.summary)}`} />
    </li>)}</ul> : <Empty className="min-h-40 md:p-8"><EmptyHeader><EmptyMedia variant="icon"><ChartNoAxesColumn /></EmptyMedia><EmptyTitle role="heading" aria-level={3}>Not observed in any chart</EmptyTitle><EmptyDescription>This app did not appear in a collected chart or new-app list in this country and language during the last 35 days.</EmptyDescription></EmptyHeader></Empty>)}
    <CardFooter className="border-t">1-day change uses a comparable snapshot 18–36 hours earlier. Chart position is not downloads or revenue.</CardFooter>
  </Card>;
}
