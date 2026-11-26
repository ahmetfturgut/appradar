"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Apple, ArrowDown, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, Play, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { count, countryLabel, price, detailsHref, sortLabels, type ExplorerFilters, type ExplorerModel, type ExplorerSort, type ReadResult, type DashboardModel } from "./view-models";
import { AppIdentity, CatalogState, InstallValue, PageHeading, ReadNotice, Rating, ScopeControls, StoreLabel } from "./elements";

export function ProductExplorer({ result, categories, filters }: { result: ReadResult<ExplorerModel>; categories: ReadResult<DashboardModel["categories"]>; filters: ExplorerFilters }) {
  const params = useSearchParams(), router = useRouter(), pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { country, q, store, category, sort, direction } = filters;
  const data = result.state === "ready" ? result.data : null;
  const options = categories.state === "ready" ? [...new Set(categories.data.flatMap(item => item.category ? [item.category] : []))] : [];
  if (category !== "all" && !options.includes(category)) options.push(category);
  const back = `${pathname}?${params}`;
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    if (!("page" in values)) next.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (!value || value === "all" || value === "any") next.delete(key); else next.set(key, value);
    }
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }
  function clearFilters() { update({ q: "", category: "all", store: "all", price: "any", page: "1" }); }
  function sortHeader(field: ExplorerSort, label: string) {
    return <th scope="col" aria-sort={sort === field ? direction === "asc" ? "ascending" : "descending" : "none"}><button onClick={() => update({ sort: field, direction: sort === field && direction === "desc" ? "asc" : "desc" })}>{label}{sort === field && (direction === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}</button></th>;
  }
  return <>
    <PageHeading title="App Explorer" description="Explore stored apps and compare public store signals."><ScopeControls scope={filters} onChange={update} /></PageHeading>
    <section className="product-panel product-explorer" aria-labelledby="catalog-title" aria-busy={pending}>
      <div className="product-explorer-title"><div><h2 id="catalog-title">Application catalog <span>{data?.total == null ? "Count unavailable" : count(data.total)}</span></h2><p>{countryLabel(country)} · {filters.language ?? "All requested languages"} · current stored listings</p></div><span className="product-neutral-badge">Supabase catalog</span></div>
      <div className="product-explorer-controls"><form className="product-search" onSubmit={event => { event.preventDefault(); update({ q: String(new FormData(event.currentTarget).get("q") ?? "") }); }}><Search size={18} /><input key={q} name="q" defaultValue={q} placeholder="Search apps or developers…" aria-label="Search applications" maxLength={100} /><Button type="submit" variant="ghost" size="sm">Search</Button></form><div className="product-segmented" role="group" aria-label="Store filter">{(["all", "ios", "play"] as const).map(value => <button key={value} aria-pressed={(store ?? "all") === value} onClick={() => update({ store: value })}>{value === "ios" ? <Apple size={14} /> : value === "play" ? <Play size={13} /> : null}{value === "all" ? "All stores" : value === "ios" ? "App Store" : "Google Play"}</button>)}</div></div>
      <div className="product-filter-row"><div><SlidersHorizontal size={15} /><label><select aria-label="Category" value={category} onChange={event => update({ category: event.target.value })}><option value="all">All categories</option>{options.map(value => <option key={value}>{value}</option>)}</select></label><label><select aria-label="Price filter" value={filters.price} onChange={event => update({ price: event.target.value })}><option value="any">All prices</option><option value="free">Free</option><option value="paid">Paid</option></select></label>{(q || store || category !== "all" || filters.price !== "any") && <button className="product-clear" onClick={clearFilters}><X size={13} />Clear filters</button>}</div><label className="product-sort">Sort by <select value={sort} onChange={event => update({ sort: event.target.value, direction: event.target.value === "name" ? "asc" : "desc" })}>{Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {categories.state !== "ready" && (result.state === "ready" || result.message !== categories.message) && <ReadNotice result={{ ...categories, message: `Category options: ${categories.message}` }} />}
      {pending ? <CatalogState state="loading" /> : result.state !== "ready" ? <ReadNotice result={result} /> : !result.data.items.length ? <><>{filters.page === 1 ? <CatalogState state="empty" onReset={clearFilters} /> : <div className="product-state"><h2>No listings on this page</h2><p>Other pages may contain matching listings.</p><Button variant="outline" onClick={() => update({ page: "1" })}>Go to first page</Button></div>}</>{filters.page > 1 && <div className="product-pagination"><Button variant="outline" onClick={() => update({ page: String(filters.page - 1) })}>Previous page</Button></div>}</> : <>
        <div className="product-table-scroll" tabIndex={0} role="region" aria-label="Application results; scroll horizontally for more columns"><table className="product-table"><caption className="sr-only">Current stored listings in {countryLabel(country)}. Sorting and pagination run on the server.</caption><thead><tr>{sortHeader("name", "Application")}<th scope="col">Store</th><th scope="col">Category</th>{sortHeader("rating", "Rating")}{sortHeader("ratingCount", "Rating count")}{sortHeader("price", "Price")}<th scope="col">Store installs</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{result.data.items.map(app => <tr key={app.listingId}><td><AppIdentity app={app} back={back} /></td><td><StoreLabel store={app.store} /></td><td><span className="product-category-pill">{app.category}</span></td><td><Rating value={app.rating} /></td><td className="product-numeric">{count(app.ratingCount)}</td><td>{price(app)}</td><td><InstallValue app={app} /></td><td><Link className="product-table-open" href={detailsHref(app, back)} aria-label={`View ${app.name} details`}><ArrowUpRight size={17} /></Link></td></tr>)}</tbody></table></div>
        <div className="product-pagination"><p role="status">Showing {(result.data.page - 1) * result.data.pageSize + 1}–{(result.data.page - 1) * result.data.pageSize + result.data.items.length} of {count(result.data.total)} listings</p><div><Button variant="outline" size="icon" aria-label="Previous page" disabled={result.data.page === 1} onClick={() => update({ page: String(result.data.page - 1) })}><ChevronLeft size={16} /></Button><span>Page {result.data.page}{result.data.pageCount != null ? ` of ${result.data.pageCount}` : " · total unavailable"}</span><Button variant="outline" size="icon" aria-label="Next page" disabled={result.data.page * result.data.pageSize > 10000 || (result.data.pageCount != null ? result.data.page >= result.data.pageCount : result.data.items.length < result.data.pageSize)} onClick={() => update({ page: String(result.data.page + 1) })}><ChevronRight size={16} /></Button></div></div>
      </>}
      <div className="product-panel-footnote">Catalog coverage is limited to collected, non-expired listings. Play install ranges are not exact or periodic downloads; App Store install counts are not published. Price amounts keep their original currency.</div>
    </section>
  </>;
}
