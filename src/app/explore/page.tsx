import { ProductExplorer } from "../../components/core/explorer";
import { ReadNotice } from "../../components/core/elements";
import { contextResetHref, parseExplorer, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { categoryData, explorerData } from "../../lib/ui/catalog.server";

export const metadata = { title: "App Explorer" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const params = await searchParams;
  let filters;
  try {
    filters = parseExplorer(params);
  } catch (error) {
    return <ReadNotice result={readFailure(error)} resetHref={contextResetHref("/explore", params)} />;
  }
  const [result, categories] = await Promise.all([explorerData(filters), categoryData(filters)]);
  return <ProductExplorer result={result} categories={categories} filters={filters} />;
}
