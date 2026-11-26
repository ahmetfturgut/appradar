import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Shell } from "../components/shell";
import { CatalogProvider } from "../components/catalog-provider";
import { isDevelopmentDemo } from "../lib/ui/demo-mode";
import { getViewer } from "../lib/auth/server";
import { headers } from "next/headers";
import { LANDING_LOCALE_HEADER, preferredLandingLocale } from "../lib/landing/locale";
import { dictionaries } from "../lib/landing/dictionaries";
import "./globals.css";
import "../components/core/product.css";

export const metadata: Metadata = { title: { default: "AppRadar", template: "%s · AppRadar" }, description: "Explore apps, compare public store signals, and discover your next idea.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
// Inter is the sans face specified by the 21st.dev "Modern Minimal" theme (see globals.css).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Legacy screens retain their context but never receive synthetic or journal data.
  // Core product routes consume their own scoped, paginated server read results.
  const catalog = { mode: "unavailable" as const, apps: [], categories: [], latestCollectedAt: null, observationCount: 0, missingObservations: 0, observedUsageUsd: null, completedRuns: 0, sourceLabel: "Supabase", error: "This legacy screen is not connected to the Supabase read services." };
  const demo = isDevelopmentDemo();
  // Verified identity (getUser). Only the email reaches the client; tokens never do.
  const viewer = await getViewer();
  const account = viewer.kind === "user" ? { email: viewer.user.email ?? null } : null;
  const locale = preferredLandingLocale((await headers()).get(LANDING_LOCALE_HEADER));
  return <html lang={locale} data-scroll-behavior="smooth" className={inter.variable}><body><CatalogProvider catalog={catalog}><Suspense fallback={<main className="product-main p-8 text-sm text-muted-foreground">{locale === "tr" ? dictionaries.tr.loading : demo ? "Loading synthetic development demo…" : "Loading workspace…"}</main>}><Shell demo={demo} account={account}>{children}</Shell></Suspense></CatalogProvider></body></html>;
}
