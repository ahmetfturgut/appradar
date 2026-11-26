import type { Metadata } from "next";
import { NewReleasesView } from "../../components/core/new-releases";
import { parseScope, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { ReadNotice } from "../../components/core/elements";
import { categoryData, knownReleasesData, newAppChartData } from "../../lib/ui/catalog.server";
import { requireViewer } from "../../lib/auth/server";
import { parseChartFilters, parseReleaseFilters } from "../../lib/intel/query";

export const metadata: Metadata = { title: "New releases" };

export default async function NewReleasesPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/new-releases");
  const params = await searchParams;
  let scope, chart, release;
  try { scope = parseScope(params); chart = parseChartFilters(params); release = parseReleaseFilters(params); } catch (error) { return <ReadNotice result={readFailure(error)} resetHref="/new-releases" />; }
  const language = scope.language ? { language: scope.language } : {};
  const [chartResult, releases, categories] = await Promise.all([
    newAppChartData({ country: scope.country, ...language, horizon: "1d", ...(chart.series ? { series: chart.series } : {}) }),
    knownReleasesData({ store: release.store, country: scope.country, ...language, ...(release.category ? { category: release.category } : {}), days: release.days, page: release.page, pageSize: 10 }),
    categoryData({ country: scope.country, store: release.store, ...language }),
  ]);
  const categoryNames = categories.state === "ready" ? categories.data.flatMap(c => c.category ? [c.category] : []) : [];
  return <NewReleasesView chart={chartResult} releases={releases} categories={categoryNames} scope={scope} filters={{ ...release, ...(chart.series ? { series: chart.series } : {}) }} />;
}
