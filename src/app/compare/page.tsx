import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompareView, type CompareNotice } from "../../components/core/compare";
import { parseScope, queryValue, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { ReadNotice } from "../../components/core/elements";
import { compareData, explorerData } from "../../lib/ui/catalog.server";
import { requireViewer } from "../../lib/auth/server";
import { defaultLanguage } from "../../lib/intel/query";
import { parseCompareIds } from "../../lib/watchlist/model";
import { savedItemsOrEmpty } from "../../lib/watchlist/server";

export const metadata: Metadata = { title: "Compare apps" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/compare");
  const params = await searchParams;
  let scope, rawIds, q, rawNotice;
  try { scope = parseScope(params); rawIds = queryValue(params, "apps"); q = (queryValue(params, "q") ?? "").trim().slice(0, 100); rawNotice = queryValue(params, "notice"); }
  catch (error) { return <ReadNotice result={readFailure(error)} resetHref="/compare" />; }
  const country = scope.country, language = scope.language ?? defaultLanguage(country);
  const selection = parseCompareIds(rawIds);
  // Canonical URL: duplicates are dropped by redirecting to the de-duplicated selection.
  if (selection.ok && selection.duplicatesRemoved > 0) redirect(`/compare?apps=${selection.ids.join(",")}&country=${country}&language=${encodeURIComponent(language)}&notice=duplicate`);
  const ids = selection.ok ? selection.ids : [];
  const notice: CompareNotice = !selection.ok ? selection.error : rawNotice === "full" || rawNotice === "duplicate" ? rawNotice : null;
  const model = ids.length ? await compareData(ids, country, language) : null;
  const store = model?.state === "ready" ? model.data.store : null;
  const search = q ? await explorerData({ country, language, ...(store ? { store } : {}), q, category: "all", price: "any", sort: "ratingCount", direction: "desc", page: 1, pageSize: 8 }) : null;
  const watched = (await savedItemsOrEmpty("/compare")).filter(i => i.country === country && i.language === language).map(i => i.appId);
  return <CompareView model={model} ids={ids} scope={{ country, language }} notice={notice} query={q} watched={watched}
    search={search?.state === "ready" ? search.data.items : null} />;
}
