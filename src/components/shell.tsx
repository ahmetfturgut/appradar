"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, CircleUser, Compass, Database, FlaskConical, LayoutDashboard, LogOut, Menu, Radar, Search, Sparkles, TrendingUp, X, ChartPie, Lightbulb, Columns3, Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { isChromelessPath } from "../lib/auth/paths";
import { landingLocaleFromPath } from "../lib/landing/locale";
import { signOut } from "../lib/auth/actions";
import { SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, sidebarMenuButtonVariants } from "./ui/sidebar";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "App Explorer", icon: Compass },
];
const research = [
  { href: "/markets", label: "Market insights", icon: ChartPie },
  { href: "/opportunities", label: "Opportunity finder", icon: Lightbulb },
  { href: "/compare", label: "Compare apps", icon: Columns3 },
];
const workspace = [
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
];
const intelligence = [
  { href: "/trending", label: "Trending apps", icon: TrendingUp },
  { href: "/new-releases", label: "New releases", icon: Sparkles },
];

/** `account` is the minimum the client needs: the verified user's email, or null (demo bypass / signed out). */
export function Shell({ children, demo = false, account = null }: { children: React.ReactNode; demo?: boolean; account?: { email: string | null } | null }) {
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
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  function closeNavigation() {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }
  const isActive = (href: string) => path === href || href === "/explore" && path.startsWith("/apps/");
  // Landing and authentication pages render their own minimal layout.
  if (isChromelessPath(path) || landingLocaleFromPath(path)) return <>{children}</>;
  const title = path.startsWith("/apps/") ? "App details" : path === "/account" ? "Account" : [...navigation, ...intelligence, ...research, ...workspace].find(item => item.href === path)?.label ?? "Workspace";
  return <div className="product-shell flex min-h-screen" onKeyDown={event => { if (open && event.key === "Escape") closeNavigation(); }}>
    <a className="skip-link" href="#main">Skip to content</a>
    {open && <button className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] lg:hidden" aria-label="Dismiss navigation" onClick={closeNavigation} />}
    <aside id="product-sidebar" aria-label="Sidebar" className={cn("fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:w-60", open ? "flex shadow-xl" : "hidden")}>
      <SidebarHeader className="gap-3 pt-4">
        <div className="flex items-center justify-between px-1">
          <Link href={scoped("/dashboard")} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-1 py-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs"><Radar className="size-4" strokeWidth={2.2} /></span>AppRadar
          </Link>
          <button ref={closeButton} type="button" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden" aria-label="Close navigation" onClick={closeNavigation}><X className="size-4" /></button>
        </div>
        <div className={cn(sidebarMenuButtonVariants({ variant: "outline", size: "lg" }), "gap-2.5 px-2.5 hover:bg-card hover:shadow-[0_0_0_1px_var(--sidebar-border)]")}><span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">IW</span><span className="grid min-w-0 flex-1 leading-tight"><span className="truncate text-[13px] font-medium text-foreground">Indie workspace</span><span className="truncate text-xs text-muted-foreground">Personal research</span></span></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <nav aria-label="Main navigation"><SidebarMenu>{navigation.map(item => <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={isActive(item.href)}><Link href={scoped(item.href)} onClick={() => setOpen(false)} aria-current={path === item.href ? "page" : undefined}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></nav>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Intelligence</SidebarGroupLabel>
          <nav aria-label="Intelligence"><SidebarMenu>{intelligence.map(item => <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={path === item.href}><Link href={scoped(item.href)} onClick={() => setOpen(false)} aria-current={path === item.href ? "page" : undefined}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></nav>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Research</SidebarGroupLabel>
          <nav aria-label="Research"><SidebarMenu>{research.map(item => <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={path === item.href}><Link href={scoped(item.href)} onClick={() => setOpen(false)} aria-current={path === item.href ? "page" : undefined}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></nav>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>My workspace</SidebarGroupLabel>
          <nav aria-label="My workspace"><SidebarMenu>{workspace.map(item => <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={path === item.href}><Link href={scoped(item.href)} onClick={() => setOpen(false)} aria-current={path === item.href ? "page" : undefined}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 pb-4">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">{demo ? <FlaskConical className="size-4 text-warning" /> : <Database className="size-4 text-primary" />}{demo ? "Synthetic demo data" : "Stored observations"}</div>
          <p className="mt-1.5 text-xs/relaxed text-muted-foreground">{demo ? "Every app, ranking and metric is a fixture. No store or database reads." : "Research stored observations with their country, language, and collection context."}</p>
        </div>
        {account ? <div className="flex items-center gap-1 rounded-lg border bg-card p-1.5 shadow-xs">
          <Link href="/account" onClick={() => setOpen(false)} aria-current={path === "/account" ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sidebar-accent"><CircleUser className="size-4 shrink-0 text-muted-foreground" /><span className="grid min-w-0 leading-tight"><span className="text-xs font-medium text-foreground">Account</span><span className="truncate text-[11px] text-muted-foreground">{account.email ?? "Signed in"}</span></span></Link>
          <form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><LogOut className="size-4" /></button></form>
        </div> : demo ? <p className="px-1 text-[11px]/relaxed text-muted-foreground">Development demo: authentication is bypassed locally. No user is signed in.</p> : null}
      </SidebarFooter>
    </aside>
    <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-60" inert={open || undefined}>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button ref={menuButton} type="button" className="-ml-1.5 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden" aria-label="Open navigation" aria-expanded={open} aria-controls="product-sidebar" onClick={() => setOpen(!open)}><Menu className="size-[18px]" /></button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]"><span className="hidden text-muted-foreground sm:inline">Workspace</span><ChevronRight className="hidden size-3.5 text-muted-foreground/70 sm:block" aria-hidden="true" /><span className="truncate font-medium text-foreground" aria-current="page">{title}</span></nav>
        </div>
        <div className="flex items-center gap-2.5">
          <form action="/explore" role="search" className="hidden h-9 w-64 items-center gap-2 rounded-md border bg-card px-2.5 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 md:flex xl:w-72">
            <Search className="size-4" aria-hidden="true" />{[...context].map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            <input aria-label="Search the app catalog" name="q" placeholder="Search apps…" maxLength={100} className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none" />
          </form>
          <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap", demo ? "border-warning/30 bg-warning/10 text-warning" : "bg-card text-muted-foreground")}><span className={cn("size-1.5 rounded-full", demo ? "bg-warning" : "bg-success")} aria-hidden="true" />{demo ? "Demo data" : "Research workspace"}</span>
        </div>
      </header>
      <main id="main" className="product-main px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8">
        {demo && <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/[0.06] px-3.5 py-2.5 text-xs/relaxed text-foreground sm:items-center" role="note"><FlaskConical className="mt-0.5 size-4 shrink-0 text-warning sm:mt-0" aria-hidden="true" /><p><strong className="mr-1.5 font-semibold tracking-[0.02em] text-warning">DEVELOPMENT DEMO</strong><span className="text-muted-foreground">All apps, developers, content, dates, rankings and metrics are synthetic. No Supabase reads or writes. Store media is not used.</span></p></div>}
        {children}
      </main>
      <footer className="flex flex-col gap-1 border-t px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <span>AppRadar · A clearer view of the app market.</span>
        <span>{demo ? "Synthetic demo data only" : "Stored observations"} · No download or revenue estimates</span>
      </footer>
    </div>
  </div>;
}
