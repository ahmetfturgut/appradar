import type { Metadata } from "next";
import { MarketsView } from "../../components/core/markets";
import { parseScope, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { ReadNotice } from "../../components/core/elements";
import { marketData } from "../../lib/ui/catalog.server";
import { requireViewer } from "../../lib/auth/server";
import { defaultLanguage, parseMarketFilters } from "../../lib/intel/query";

export const metadata: Metadata = { title: "Market insights" };

export default async function MarketsPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/markets");
  const params = await searchParams;
  let scope, filters;
  try { scope = parseScope(params); filters = parseMarketFilters(params); } catch (error) { return <ReadNotice result={readFailure(error)} resetHref="/markets" />; }
  const store = scope.store ?? "ios", language = scope.language ?? defaultLanguage(scope.country);
  const result = await marketData({ store, country: scope.country, language, ...filters });
  return <MarketsView result={result} scope={{ ...scope, language }} store={store} cohort={filters.cohort} />;
}
