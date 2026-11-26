"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Bookmark, SlidersHorizontal, Radar, Radio, FlaskConical, ChevronRight, Monitor } from "lucide-react";
import { useWatchlist } from "../hooks/use-watchlist";
import { useCatalog } from "./catalog-provider";
import { formatObservedAt } from "../lib/live-catalog";

const navigation = [
  { href: "/explore", label: "Keşfet", icon: Compass },
  { href: "/watchlist", label: "Takip listem", icon: Bookmark },
  { href: "/admin", label: "Kaynak durumu", icon: Radio },
  { href: "/settings", label: "Ayarlar", icon: SlidersHorizontal },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const watchlist = useWatchlist();
  const catalog = useCatalog();
  const demo = catalog.mode === "demo";
  const active = navigation.find(n => path.startsWith(n.href)) ?? navigation[0]!;
  const links = navigation.map(item => <Link key={item.href} href={item.href} className={`nav-link ${active.href === item.href ? "nav-active" : ""}`} aria-current={active.href === item.href ? "page" : undefined}><item.icon size={19} /><span>{item.label}</span>{item.href === "/watchlist" && watchlist.items.length > 0 && <span className="nav-count">{watchlist.items.length}</span>}</Link>);
  return <div className="app-shell">
    <a className="skip-link" href="#main">İçeriğe geç</a>
    <aside className="sidebar">
      <Link href="/explore" className="brand" aria-label="AppRadar ana sayfa"><span className="brand-mark"><Radar size={25} /></span><span>AppRadar<span className="brand-dot">.</span></span></Link>
      <p className="sidebar-label">ÇALIŞMA ALANI</p>
      <nav aria-label="Ana menü">{links}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Radio size={21} /><strong>Verinin izini sür.</strong><p>{demo ? "Örnek uygulamalarla araştırma alanını dene." : "Mağaza verilerini kaynağı ve gözlem tarihiyle incele."}</p><Link href="/admin">Kaynağı incele <ChevronRight size={15} /></Link></div><div className="workspace-user"><span className="avatar">Y</span><span><strong>Yerel çalışma alanı</strong><small>{demo ? "Kişisel demo" : "Kişisel araştırma"}</small></span><Monitor size={17} /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><Radar size={21} className="mobile-brand" /><span>Çalışma alanı</span><ChevronRight size={14} /><strong>{path.startsWith("/apps/") ? "Uygulama detayı" : active.label}</strong></div><span className="environment-badge">{demo ? <FlaskConical size={14} /> : <Radio size={14} />}{demo ? "Yerel demo" : catalog.mode === "live" ? "Apify verisi" : "Veri bekleniyor"}</span></header>
      <div className={`demo-banner ${demo ? "" : "live-banner"}`}><span className="demo-tag">{demo ? "DEMO" : "APIFY"}</span><p>{demo ? "Keşfet, filtrele, takip et. Gösterilen uygulamalar ve ölçümler örnektir." : catalog.mode === "live" ? `Gerçek mağaza kayıtları · ${catalog.sourceLabel} · Son çekim ${formatObservedAt(catalog.latestCollectedAt)}` : catalog.error ?? "Mağaza verileri hazırlanıyor."}</p></div>
      <main id="main" className="main-content">{children}</main>
      <footer className="page-footer"><span>AppRadar · Merakını bir adım ileri taşı.</span><span>{demo ? "Örnek veriyle çalışan yerel sürüm" : "Yerel araştırma · Kaydedilmiş mağaza gözlemleri"}</span></footer>
    </div>
    <nav className="mobile-navigation" aria-label="Mobil menü">{links}</nav>
    {watchlist.temporary && <div role="status" className="storage-notice">Tarayıcı kaydı kullanılamıyor. Takiplerin yalnızca bu oturumda tutuluyor.</div>}
  </div>;
}
