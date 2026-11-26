"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Apple, ArrowRight, CircleAlert, Search, Star, Play, Globe2 } from "lucide-react";
import { AppIcon } from "../app-icon";
import { Button } from "../ui/button";
import { countryLabels, countryLabel, dateLabel, detailsHref, type AppViewModel, type Scope, type ReadResult } from "./view-models";
import type { Freshness } from "../../lib/read/index";

export function ReadNotice({ result, resetHref }: { result: ReadResult<unknown>; resetHref?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (result.state === "ready") return null;
  return <div className="product-read-notice" role="status"><CircleAlert size={18} /><div><strong>{result.state === "unavailable" ? "Data unavailable" : "Unable to load data"}</strong><p>{result.message}</p></div>{resetHref ? <Button asChild variant="outline"><Link href={resetHref}>Reset filters</Link></Button> : <Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Loading…" : "Try again"}</Button>}</div>;
}
export function ScopeControls({ scope, onChange }: { scope: Scope; onChange: (values: Record<string, string>) => void }) {
  const countries = Object.hasOwn(countryLabels, scope.country) ? countryLabels : { ...countryLabels, [scope.country]: scope.country };
  return <div className="product-scope-controls"><label className="product-country"><Globe2 size={16} /><select aria-label="Country" value={scope.country} onChange={event => onChange({ country: event.target.value })}>{Object.entries(countries).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><form className="product-language" onSubmit={event => { event.preventDefault(); onChange({ language: String(new FormData(event.currentTarget).get("language") ?? "").trim() }); }}><label>Requested language<input key={scope.language ?? ""} aria-label="Requested language" name="language" defaultValue={scope.language ?? ""} placeholder="All languages" maxLength={35} /></label><Button type="submit" variant="outline" size="sm">Apply</Button></form></div>;
}
export function FreshnessLabel({ freshness }: { freshness: Freshness }) {
  return <span className={`product-freshness product-freshness-${freshness.status}`}>{freshness.lastObservedAt ? `${freshness.status === "stale" ? "Stale · " : "Observed "}${dateLabel(freshness.lastObservedAt)}` : "Freshness unknown"}</span>;
}
export function PageHeading({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="product-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
export function StoreLabel({ store }: { store: AppViewModel["store"] }) {
  return <span className="product-store">{store === "ios" ? <Apple size={14} /> : <Play size={13} />} {store === "ios" ? "App Store" : "Google Play"}</span>;
}
export function AppIdentity({ app, back, showStore = false }: { app: AppViewModel; back?: string; showStore?: boolean }) {
  return <Link className="product-app-identity" href={detailsHref(app, back)}><AppIcon app={app} /><span><strong>{app.name}</strong><small>{showStore ? `${app.store === "ios" ? "App Store" : "Google Play"} · ${app.developer}` : app.developer}</small><small>{countryLabel(app.country)} · {app.requestedLanguage} · <FreshnessLabel freshness={app.freshness} /></small></span></Link>;
}
export function Rating({ value }: { value: number | null }) {
  return value == null ? <span className="product-muted">Not available</span> : <span className="product-rating"><Star size={13} fill="currentColor" />{value.toFixed(1)}</span>;
}
export function PanelHeading({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return <div className="product-panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{href && <Link className="product-text-link" href={href}>View all <ArrowRight size={14} /></Link>}</div>;
}
export function CatalogState({ state, onReset }: { state: "loading" | "empty" | "error"; onReset?: () => void }) {
  if (state === "loading") return <div className="product-loading" role="status" aria-label="Loading applications"><span className="sr-only">Loading applications…</span>{[0, 1, 2, 3, 4].map(row => <div className="product-skeleton-row" key={row}><span /><span /><span /></div>)}</div>;
  return <div className="product-state" role={state === "error" ? "alert" : "status"}>{state === "error" ? <CircleAlert size={28} /> : <Search size={28} />}<h2>{state === "error" ? "We couldn’t load these apps" : "No current listings found"}</h2><p>{state === "error" ? "Your filters are preserved. Try loading the catalog again." : "No stored listings match this context and these filters. Try another search or clear a filter. This does not mean the apps are absent from the store."}</p>{onReset && <Button variant="outline" onClick={onReset}>{state === "error" ? "Try again" : "Clear filters"}</Button>}</div>;
}
export function Metric({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return <div className="product-metric"><p>{label}</p><strong>{value}</strong><span>{note}</span></div>;
}
export function InstallValue({ app }: { app: AppViewModel }) {
  return app.store === "ios" ? <span className="product-muted" title="App Store does not publish install counts">Not published</span> : <span>{app.installsText ?? "Not available"}</span>;
}
