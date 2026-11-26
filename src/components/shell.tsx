"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChartNoAxesCombined, ChevronRight, Compass, Database, LayoutDashboard, Menu, Radar, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";


const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "App Explorer", icon: Compass },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const params = useSearchParams();
  const context = new URLSearchParams();
  for (const key of ["country", "language", "store"]) { const value = params.get(key); if (value) context.set(key, value); }
  const scoped = (href: string) => `${href}?${context}`;
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeButton.current?.focus(); }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  function closeNavigation() {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }
  const title = path.startsWith("/apps/") ? "App details" : navigation.find(item => item.href === path)?.label ?? "Workspace";
  return <div className="product-shell" onKeyDown={event => { if (open && event.key === "Escape") closeNavigation(); }}>
    <a className="skip-link" href="#main">Skip to content</a>
    {open && <button className="product-sidebar-overlay" aria-label="Dismiss navigation" onClick={closeNavigation} />}
    <aside id="product-sidebar" className={`product-sidebar ${open ? "is-open" : ""}`}>
      <div className="product-brand-row"><Link href={scoped("/")} className="product-brand" onClick={() => setOpen(false)}><span><Radar size={22} /></span>AppRadar</Link><button ref={closeButton} className="product-mobile-toggle" aria-label="Close navigation" onClick={closeNavigation}><X size={20} /></button></div>
      <div className="product-workspace"><span className="product-workspace-avatar">I</span><div><strong>Indie workspace</strong><small>Personal research</small></div><ChevronRight size={14} /></div>
      <p className="product-nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">{navigation.map(item => <Link href={scoped(item.href)} key={item.href} onClick={() => setOpen(false)} className={`product-nav-link ${path === item.href || item.href === "/explore" && path.startsWith("/apps/") ? "is-active" : ""}`} aria-current={path === item.href ? "page" : undefined}><item.icon size={18} />{item.label}</Link>)}</nav>
      <p className="product-nav-label">RESEARCH SHORTCUTS</p>
      <nav aria-label="Research shortcuts"><Link className="product-nav-link" href={`${scoped("/")}#trending`} onClick={() => setOpen(false)}><ChartNoAxesCombined size={18} />Trending apps</Link><Link className="product-nav-link" href={`${scoped("/explore")}&sort=releasedAt`} onClick={() => setOpen(false)}><Compass size={18} />New releases</Link></nav>
      <div className="product-sidebar-bottom"><div className="product-preview-note"><Database size={18} /><strong>Your research starts here</strong><p>Research stored observations with their country, language, and collection context.</p><span>Stored observations</span></div><div className="product-profile"><span>JD</span><div><strong>Indie developer</strong><small>Research workspace</small></div></div></div>
    </aside>
    <div className="product-main-shell" inert={open || undefined}>
      <header className="product-header"><div className="product-breadcrumb"><button ref={menuButton} className="product-mobile-toggle" aria-label="Open navigation" aria-expanded={open} aria-controls="product-sidebar" onClick={() => setOpen(!open)}><Menu size={21} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div><div className="product-header-actions"><form action="/explore" className="product-header-search"><Search size={15} />{[...context].map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}<input aria-label="Search the app catalog" name="q" placeholder="Search apps…" maxLength={100} /></form><span className="product-preview-badge"><span />Research workspace</span></div></header>
      <main id="main" className="product-main">{children}</main>
      <footer className="product-footer"><span>AppRadar <span>·</span> A clearer view of the app market.</span><span>Stored observations · No download or revenue estimates</span></footer>
    </div>
  </div>;
}
