import type { Metadata } from "next";
import { TrendingView } from "../../components/core/trending";
import { parseScope, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { ReadNotice } from "../../components/core/elements";
import { trendingData } from "../../lib/ui/catalog.server";
import { requireViewer } from "../../lib/auth/server";
import { parseChartFilters } from "../../lib/intel/query";

export const metadata: Metadata = { title: "Trending apps" };

export default async function TrendingPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/trending");
  const params = await searchParams;
  let scope, filters;
  try { scope = parseScope(params); filters = parseChartFilters(params); } catch (error) { return <ReadNotice result={readFailure(error)} resetHref="/trending" />; }
  const result = await trendingData({ country: scope.country, ...(scope.language ? { language: scope.language } : {}), ...(scope.store ? { store: scope.store } : {}), ...filters });
  return <TrendingView result={result} scope={scope} filters={{ ...filters, ...(scope.store ? { store: scope.store } : {}) }} />;
}
