"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Bookmark, Star, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, List, Apple, Play, SlidersHorizontal, X, Sparkles, Layers, Globe2, Compass, Orbit, Trees, Camera } from "lucide-react";
import { displayStats, filterApps, formatCount, formatPrice, parseFilters, type DemoApp, type Country } from "../lib/demo-data";
import { useCatalog } from "./catalog-provider";
import { formatObservedAt } from "../lib/live-catalog";
import { useWatchlist } from "../hooks/use-watchlist";
import { AppIcon } from "./app-icon";
import { Button } from "./ui/button";

export function SaveButton({ app, country, compact = false }: { app: DemoApp; country: Country; compact?: boolean }) {
  const watchlist = useWatchlist();
  const saved = watchlist.isSaved(app.id, country);
  return <Button variant={compact ? "ghost" : saved ? "outline" : "default"} size={compact ? "icon" : "default"} className={saved ? "saved-button" : ""} aria-label={`${app.name}: ${saved ? "takipten çıkar" : "takibe al"}`} aria-pressed={saved} onClick={() => watchlist.toggle(app.id, country)}><Bookmark size={17} fill={saved ? "currentColor" : "none"} />{!compact && (saved ? "Takip ediliyor" : "Takibe al")}</Button>;
}

export function Explorer({ watchlistOnly = false }: { watchlistOnly?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const catalog = useCatalog();
  const { apps, categories } = catalog;
  const demo = catalog.mode === "demo";
  const filters = parseFilters(new URLSearchParams(params.toString()), categories);
  const watchlist = useWatchlist();
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [pending, startTransition] = useTransition();
  const available = watchlistOnly ? apps.filter(app => watchlist.isSaved(app.id, filters.country)) : apps;
  const countryApps = apps.filter(app => !app.live || app.live.observations[filters.country]);
  const storesCount = new Set(countryApps.map(app => app.store)).size;
  const results = filterApps(available, filters);
  const pageCount = Math.max(1, Math.ceil(results.length / 8));
  const requestedPage = Number(params.get("page") ?? "1");
  const page = Math.min(pageCount, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
  const visible = results.slice((page - 1) * 8, page * 8);
  const activeFilters = [filters.query !== "", filters.store !== "all", filters.category !== "all", filters.price !== "all"].filter(Boolean).length;
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all" || value === "") next.delete(key); else next.set(key, value);
    if (key !== "page") next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }
  const detailsHref = (app: DemoApp) => `/apps/${app.id}?country=${filters.country}&back=${encodeURIComponent(`${pathname}?${params}`)}`;
  return <>
    <div className="page-heading"><div><p className="eyebrow">{watchlistOnly ? "KİŞİSEL KOLEKSİYONUN" : "MERAK ET. İNCELE. KEŞFET."}</p><h1>{watchlistOnly ? "Takip listem" : "Bir sonraki fikrini keşfet."}</h1><p className="page-description">{watchlistOnly ? "İlgini çeken uygulamalar, tek bir yerde. Takiplerin bu tarayıcıda saklanır." : "Uygulamaları incele, mağaza sinyallerini karşılaştır ve ilgini çekenleri takip et."}</p></div><label className="country-select"><Globe2 size={17} /><select aria-label="Ülke" value={filters.country} onChange={e => update("country", e.target.value)}><option value="TR">Türkiye</option><option value="US">Amerika Birleşik Devletleri</option></select><ChevronDown size={14} /></label></div>
    {!watchlistOnly && <>
      <section className="discovery-hero" aria-labelledby="hero-title"><div className="hero-copy"><span className="hero-label"><Sparkles size={14} /> KEŞFİN BAŞLADIĞI YER</span><h2 id="hero-title">Büyük fikirler,<br />küçük bir merakla başlar.</h2><p>Popüler olanın ötesine bak.<br />Araştırmaya değer uygulamalara yakından göz at.</p><Button asChild className="hero-button"><Link href="#catalog">Uygulamaları keşfet <Compass size={16} /></Link></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" /><div className="hero-radar"><Compass size={54} strokeWidth={1.3} /></div><span className="floating-app float-one"><Trees size={28} /></span><span className="floating-app float-two"><Orbit size={29} /></span><span className="floating-app float-three"><Camera size={27} /></span><span className="orbit-star star-one" /><span className="orbit-star star-two" /></div></section>
      <section className="overview-stats" aria-label="Katalog özeti"><div><span className="stat-icon"><Layers size={20} /></span><span><strong>{countryApps.length}<small> uygulama</small></strong><p>{demo ? "Örnek katalogda" : "Seçili ülke kataloğunda"}</p></span></div><div><span className="stat-icon stat-teal"><Globe2 size={20} /></span><span><strong>{storesCount}<small> mağaza</small></strong><p>App Store & Google Play</p></span></div><div><span className="stat-icon stat-orange"><LayoutGrid size={20} /></span><span><strong>{categories.length}<small> kategori</small></strong><p>Farklı fikir alanları</p></span></div></section>
    </>}
    <section id="catalog" className="catalog" aria-labelledby="catalog-heading" aria-busy={pending}>
      <div className="catalog-title"><h2 id="catalog-heading">{watchlistOnly ? "Takip ettiğin uygulamalar" : "Uygulama radarı"}<span>{results.length}</span></h2><div className="view-toggle" role="group" aria-label="Görünüm"><button aria-label="Liste görünümü" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={17} /></button><button aria-label="Kart görünümü" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={16} /></button></div></div>
      <div className="catalog-controls"><form className="search-field" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); update("q", String(data.get("q") ?? "")); }}><Search size={18} /><input key={filters.query} name="q" defaultValue={filters.query} maxLength={100} aria-label="Uygulama ara" placeholder="Uygulama, geliştirici veya kategori ara…" /><button type="submit" aria-label="Ara">Ara</button></form><div className="store-tabs" role="group" aria-label="Mağaza filtresi">{[["all", "Tümü"], ["ios", "App Store"], ["play", "Google Play"]].map(([value, label]) => <button key={value} aria-pressed={filters.store === value} onClick={() => update("store", value!)}>{value === "ios" ? <Apple size={15} /> : value === "play" ? <Play size={14} /> : null}{label}</button>)}</div></div>
      <div className="filter-row"><div className="filters"><span className="filter-caption"><SlidersHorizontal size={15} /> Filtrele</span><label className="select-wrap"><select aria-label="Kategori" value={filters.category} onChange={e => update("category", e.target.value)}><option value="all">Tüm kategoriler</option>{categories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={13} /></label><label className="select-wrap"><select aria-label="Ücret türü" value={filters.price} onChange={e => update("price", e.target.value)}><option value="all">Tüm fiyatlar</option><option value="free">Ücretsiz</option><option value="paid">Ücretli</option></select><ChevronDown size={13} /></label>{activeFilters > 0 && <button className="clear-filters" onClick={() => startTransition(() => router.replace(`${pathname}?country=${filters.country}`, { scroll: false }))}><X size={13} /> Temizle</button>}</div><label className="sort-select"><span>Sırala:</span><select aria-label="Sıralama" value={filters.sort} onChange={e => update("sort", e.target.value)}><option value="rating">En yüksek puan</option><option value="ratings">Değerlendirme sayısı</option><option value="name">Uygulama adı</option></select><ChevronDown size={13} /></label></div>
      {!visible.length ? <div className="empty-state"><span><Bookmark size={28} /></span><h3>{watchlistOnly && !activeFilters ? "Merak ettiklerini burada biriktir." : "Bu filtrelerde sonuç bulunamadı."}</h3><p>{watchlistOnly && !activeFilters ? "Bir uygulamanın yanındaki yer imi simgesine dokunarak takip listeni oluşturmaya başla." : "Başka bir kelime dene veya filtrelerini sadeleştir."}</p><Button asChild variant="outline"><Link href="/explore">Keşfet sayfasına git</Link></Button></div> : <>
        <div className={`application-list ${layout === "grid" ? "application-grid" : ""}`}><div className="table-head"><span>UYGULAMA</span><span>MAĞAZA</span><span className="category-column">KATEGORİ</span><span>PUAN</span><span>DEĞERLENDİRME</span><span>FİYAT</span><span className="sr-only">Takip</span></div>{visible.map(app => { const stats = displayStats(app, filters.country); return <article className="app-row" key={app.id}>
          <Link href={detailsHref(app)} className="app-name-cell"><AppIcon app={app} /><span><strong>{app.name}</strong><small>{app.developer}</small></span></Link><span className="store-cell">{app.store === "ios" ? <Apple size={15} /> : <Play size={14} />}{app.store === "ios" ? "App Store" : "Google Play"}</span><span className="category-cell category-column">{app.category}</span><span className="rating-cell">{stats.rating == null ? "Veri yok" : <><Star size={13} fill="currentColor" /><strong>{stats.rating.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong></>}</span><span className="count-cell"><span className="mobile-label">Değerlendirme</span>{formatCount(stats.ratings)}</span><span className={`price-cell ${stats.free === true ? "free-price" : ""}`}>{formatPrice(app, filters.country)}</span><div className="save-cell"><SaveButton app={app} country={filters.country} compact /></div>
        </article>; })}</div>
        <div className="pagination"><span aria-live="polite">{results.length} sonuçtan {(page - 1) * 8 + 1}–{Math.min(page * 8, results.length)} gösteriliyor</span><div><button aria-label="Önceki sayfa" disabled={page === 1 || pending} onClick={() => update("page", String(page - 1))}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, i) => <button key={i} aria-label={`${i + 1}. sayfa`} aria-current={page === i + 1 ? "page" : undefined} onClick={() => update("page", String(i + 1))}>{i + 1}</button>)}<button aria-label="Sonraki sayfa" disabled={page === pageCount || pending} onClick={() => update("page", String(page + 1))}><ChevronRight size={16} /></button></div></div>
      </>}
      <div className="catalog-footnote"><span className="demo-tag">{demo ? "DEMO" : "APIFY"}</span>{demo ? "Bu katalogdaki tüm uygulamalar, puanlar ve fiyatlar sentetiktir. Gerçek mağaza sonuçları değildir." : `${catalog.sourceLabel} · Son çekim ${formatObservedAt(catalog.latestCollectedAt)}. Arama yalnızca alınmış kayıtları kapsar; mağazanın tamamı değildir.`}</div>
    </section>
  </>;
}
