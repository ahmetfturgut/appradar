import { notFound } from "next/navigation";
import Link from "next/link";
import "../../../components/core/explorer-details.css";
import { ProductAppDetails } from "../../../components/core/app-details";
import { ReadNotice } from "../../../components/core/elements";
import { toAppViewModel, toDetailsModel } from "../../../components/core/catalog-mapping";
import { contextResetHref, parseScope, parsePage, queryValue, readFailure, QueryError, type SearchValues } from "../../../components/core/catalog-query";
import { scopeQuery } from "../../../components/core/view-models";
import { appData, appRankingsData, detailSections } from "../../../lib/ui/catalog.server";
import { AppRankings } from "../../../components/core/app-rankings";
import { CompareLink, WatchButton } from "../../../components/core/app-actions";
import { savedItemsOrEmpty } from "../../../lib/watchlist/server";

export const metadata = { title: "App details" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchValues> };
export default async function AppPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id)) notFound();
  const query = await searchParams;
  let scope, tab, reviewPage, keywordPage, reviewSort, keyword, rawBack, keywordSnapshot;
  try {
    scope = parseScope(query);
    tab = queryValue(query, "tab") ?? "Overview";
    reviewPage = parsePage(query, "reviewPage"); keywordPage = parsePage(query, "keywordPage");
    reviewSort = queryValue(query, "reviewSort") ?? "newest";
    keyword = queryValue(query, "keyword"); rawBack = queryValue(query, "back");
    keywordSnapshot = queryValue(query, "keywordSnapshot") ? parsePage(query, "keywordSnapshot", Number.MAX_SAFE_INTEGER) : undefined;
    if (!["Overview", "History", "Reviews", "Keywords"].includes(tab) || !["newest", "helpful"].includes(reviewSort) || keyword != null && (!keyword.trim() || keyword.length > 10000)) throw new QueryError("Invalid details filters");
  } catch (error) { return <ReadNotice result={readFailure(error)} resetHref={contextResetHref(`/apps/${id}`, query)} />; }
  const result = await appData(id, scope);
  if (result.state !== "ready") return <ReadNotice result={result} />;
  if (!result.data) notFound();
  const model = toDetailsModel(result.data);
  const related = result.data.relatedApps.map(toAppViewModel);
  const backHref = rawBack && /^\/explore(?:\?[^#\\]*)?$/.test(rawBack) ? rawBack : `/explore?${scopeQuery(scope)}`;
  if (!model) return <div className="ed-root"><Link className="product-back" href={backHref}>Back to App Explorer</Link><section className="product-panel product-state"><h1>Listing unavailable in this context</h1><p>The app exists, but no current listing matches {scope.country} / {scope.language ?? "any requested language"}. Another context has not been substituted.</p>{result.data.contexts.map(context => <Link className="product-text-link" key={`${context.country}:${context.requestedLanguage}`} href={`/apps/${id}?${scopeQuery({ country: context.country, language: context.requestedLanguage })}&back=${encodeURIComponent(backHref)}`}>{context.country} · {context.requestedLanguage}</Link>)}</section></div>;
  const sections = await detailSections({ appId: id, store: model.app.store, country: model.app.country, language: model.app.requestedLanguage, tab, reviewPage, keywordPage, reviewSort: reviewSort as "newest" | "helpful", ...(keyword ? { keyword } : {}), ...(keywordSnapshot ? { keywordSnapshot } : {}) });
  const rankings = await appRankingsData(id, model.app.country, model.app.requestedLanguage);
  const watched = (await savedItemsOrEmpty(`/apps/${id}`)).some(i => i.appId === model.app.id && i.country === model.app.country && i.language === model.app.requestedLanguage);
  const actions = <div className="mb-3 flex flex-wrap items-start justify-end gap-2" aria-label="App actions"><WatchButton appId={model.app.id} country={model.app.country} language={model.app.requestedLanguage} watched={watched} appName={model.app.name} /><CompareLink appId={model.app.id} country={model.app.country} language={model.app.requestedLanguage} appName={model.app.name} /></div>;
  return <>{actions}<ProductAppDetails model={model} sections={sections} related={related} tab={tab as "Overview" | "History" | "Reviews" | "Keywords"} backHref={backHref} /><AppRankings result={rankings} appName={model.app.name} /></>;
}
