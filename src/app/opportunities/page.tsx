import type { Metadata } from "next";
import { OpportunitiesView } from "../../components/core/opportunities";
import { parseScope, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { ReadNotice } from "../../components/core/elements";
import { opportunityData } from "../../lib/ui/catalog.server";
import { requireViewer } from "../../lib/auth/server";
import { defaultLanguage } from "../../lib/intel/query";

export const metadata: Metadata = { title: "Opportunity finder" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/opportunities");
  const params = await searchParams;
  let scope;
  try { scope = parseScope(params); } catch (error) { return <ReadNotice result={readFailure(error)} resetHref="/opportunities" />; }
  const store = scope.store ?? "ios", language = scope.language ?? defaultLanguage(scope.country);
  const result = await opportunityData({ store, country: scope.country, language });
  return <OpportunitiesView result={result} scope={{ ...scope, language }} store={store} />;
}
