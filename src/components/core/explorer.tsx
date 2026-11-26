"use client";
/**
 * Catalog table adapted from shadcn/ui Data Table and Table (MIT).
 * 21st.dev listings: https://21st.dev/@shadcn/components/data-table
 * and https://21st.dev/@shadcn/components/table (sort, search, column visibility).
 * Origin UI table (MIT): https://21st.dev/@originui/components/table
 * TanStack Table is not a dependency; sorting, search and pagination stay on the server.
 */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Apple, ArrowUpDown, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Play, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { count, countryLabel, price, detailsHref, sortLabels, type ExplorerFilters, type ExplorerModel, type ExplorerSort, type ReadResult, type DashboardModel } from "./view-models";
import { AppIdentity, CatalogState, InstallValue, PageHeading, ReadNotice, Rating, ScopeControls, StoreLabel } from "./elements";

export function ProductExplorer({ result, categories, filters, demo = false }: { result: ReadResult<ExplorerModel>; categories: ReadResult<DashboardModel["categories"]>; filters: ExplorerFilters; demo?: boolean }) {
  const params = useSearchParams(), router = useRouter(), pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [columns, setColumns] = useState({ store: true, category: true, rating: true, ratingCount: true, price: true, installs: true });
  const columnLabels = { store: "Store", category: "Category", rating: "Rating", ratingCount: "Rating count", price: "Price", installs: "Store installs" } as const;
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
  function sortHeader(field: ExplorerSort, label: string, numeric = false) {
    const active = sort === field;
    return <th className={numeric ? "ed-num" : undefined} scope="col" aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}><button onClick={() => update({ sort: field, direction: active && direction === "desc" ? "asc" : "desc" })}>{label}<ArrowUpDown size={12} /></button></th>;
  }
  return <div className="ed-root">
    <PageHeading title="App Explorer" description="Explore stored apps and compare public store signals."><ScopeControls scope={filters} onChange={update} /></PageHeading>
    <section className="product-panel product-explorer" aria-labelledby="catalog-title" aria-busy={pending}>
      <div className="ed-meta"><div><h2 id="catalog-title">Application catalog</h2><p>{countryLabel(country)} · {filters.language ?? "All requested languages"} · {demo ? "synthetic listings" : "current stored listings"}</p></div><span className="ed-count">{data?.total == null ? "Count unavailable" : count(data.total)}</span></div>
      <div className="ed-toolbar"><form className="ed-search" onSubmit={event => { event.preventDefault(); update({ q: String(new FormData(event.currentTarget).get("q") ?? "") }); }}><Search size={16} /><input key={q} name="q" defaultValue={q} placeholder="Search apps or developers" aria-label="Search applications" maxLength={100} /><Button type="submit" variant="ghost" size="sm">Search</Button></form><div className="ed-filters"><div className="ed-segmented" role="group" aria-label="Store filter">{(["all", "ios", "play"] as const).map(value => <button key={value} aria-pressed={(store ?? "all") === value} onClick={() => update({ store: value })}>{value === "ios" ? <Apple size={14} /> : value === "play" ? <Play size={13} /> : <SlidersHorizontal size={14} />}{value === "all" ? "All" : value === "ios" ? "App Store" : "Google Play"}</button>)}</div><label><span className="sr-only">Category</span><select aria-label="Category" value={category} onChange={event => update({ category: event.target.value })}><option value="all">All categories</option>{options.map(value => <option key={value}>{value}</option>)}</select></label><label><span className="sr-only">Price</span><select aria-label="Price filter" value={filters.price} onChange={event => update({ price: event.target.value })}><option value="any">All prices</option><option value="free">Free</option><option value="paid">Paid</option></select></label><label className="ed-sort">Sort by <select aria-label="Sort by" value={sort} onChange={event => update({ sort: event.target.value, direction: event.target.value === "name" ? "asc" : "desc" })}>{Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><details className="ed-columns"><summary>Columns <ChevronDown size={14} /></summary><div>{(Object.keys(columnLabels) as (keyof typeof columnLabels)[]).map(key => <label key={key}><input type="checkbox" checked={columns[key]} onChange={() => setColumns(current => ({ ...current, [key]: !current[key] }))} />{columnLabels[key]}</label>)}</div></details>{(q || store || category !== "all" || filters.price !== "any") && <button className="ed-clear" onClick={clearFilters}><X size={13} />Clear</button>}</div></div>
      {categories.state !== "ready" && (result.state === "ready" || result.message !== categories.message) && <ReadNotice result={{ ...categories, message: `Category options: ${categories.message}` }} />}
      {pending ? <CatalogState state="loading" /> : result.state !== "ready" ? <ReadNotice result={result} /> : !result.data.items.length ? <><>{filters.page === 1 ? <CatalogState state="empty" onReset={clearFilters} /> : <div className="product-state"><h2>No listings on this page</h2><p>Other pages may contain matching listings.</p><Button variant="outline" onClick={() => update({ page: "1" })}>Go to first page</Button></div>}</>{filters.page > 1 && <div className="product-pagination"><Button variant="outline" onClick={() => update({ page: String(filters.page - 1) })}>Previous page</Button></div>}</> : <>
        <div className="product-table-scroll" tabIndex={0} role="region" aria-label="Application results; scroll horizontally for more columns"><table className="product-table"><caption className="sr-only">Current stored listings in {countryLabel(country)}. Sorting and pagination run on the server.</caption><thead><tr>{sortHeader("name", "Application")}{columns.store && <th scope="col">Store</th>}{columns.category && <th scope="col">Category</th>}{columns.rating && sortHeader("rating", "Rating", true)}{columns.ratingCount && sortHeader("ratingCount", "Rating count", true)}{columns.price && sortHeader("price", "Price", true)}{columns.installs && <th className="ed-num" scope="col">Store installs</th>}<th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{result.data.items.map(app => <tr key={app.listingId}><td><AppIdentity app={app} back={back} /></td>{columns.store && <td><StoreLabel store={app.store} /></td>}{columns.category && <td><span className="ed-badge">{app.category}</span></td>}{columns.rating && <td className="ed-num"><Rating value={app.rating} /></td>}{columns.ratingCount && <td className="ed-num">{count(app.ratingCount)}</td>}{columns.price && <td className="ed-num"><span className={app.price === 0 ? "ed-badge ed-badge-free" : "ed-badge"}>{price(app)}</span></td>}{columns.installs && <td className="ed-num"><InstallValue app={app} /></td>}<td><Link className="product-table-open" href={detailsHref(app, back)} aria-label={`View ${app.name} details`}><ArrowUpRight size={17} /></Link></td></tr>)}</tbody></table></div>
        <div className="product-pagination"><p role="status">Showing {(result.data.page - 1) * result.data.pageSize + 1}–{(result.data.page - 1) * result.data.pageSize + result.data.items.length} of {count(result.data.total)} listings</p><div><Button variant="outline" size="sm" disabled={result.data.page === 1} onClick={() => update({ page: String(result.data.page - 1) })}><ChevronLeft size={14} />Previous</Button><span>Page {result.data.page}{result.data.pageCount != null ? ` of ${result.data.pageCount}` : ""}</span><Button variant="outline" size="sm" disabled={result.data.page * result.data.pageSize > 10000 || (result.data.pageCount != null ? result.data.page >= result.data.pageCount : result.data.items.length < result.data.pageSize)} onClick={() => update({ page: String(result.data.page + 1) })}>Next<ChevronRight size={14} /></Button></div></div>
      </>}
      <div className="product-panel-footnote">Catalog coverage is limited to collected, non-expired listings. Play install ranges are not exact or periodic downloads; App Store install counts are not published. Price amounts keep their original currency.</div>
    </section>
  </div>;
}
