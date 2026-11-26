import { Suspense } from "react";
import type { Metadata } from "next";
import { Shell } from "../components/shell";
import { CatalogProvider } from "../components/catalog-provider";
import "./globals.css";
import "../components/core/product.css";

export const metadata: Metadata = { title: { default: "Dashboard · AppRadar", template: "%s · AppRadar" }, description: "Explore apps, compare public store signals, and discover your next idea.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Legacy screens retain their context but never receive synthetic or journal data.
  // Core product routes consume their own scoped, paginated server read results.
  const catalog = { mode: "unavailable" as const, apps: [], categories: [], latestCollectedAt: null, observationCount: 0, missingObservations: 0, observedUsageUsd: null, completedRuns: 0, sourceLabel: "Supabase", error: "This legacy screen is not connected to the Supabase read services." };
  return <html lang="en" data-scroll-behavior="smooth"><body><CatalogProvider catalog={catalog}><Suspense fallback={<main className="product-main">Loading workspace…</main>}><Shell>{children}</Shell></Suspense></CatalogProvider></body></html>;
}
