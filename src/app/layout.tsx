import type { Metadata } from "next";
import { Shell } from "../components/shell";
import { CatalogProvider } from "../components/catalog-provider";
import { getCatalog } from "../lib/catalog.server";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Keşfet · AppRadar", template: "%s · AppRadar" }, description: "Uygulamaları keşfet, mağaza sinyallerini incele ve kendi araştırma listeni oluştur.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const catalog = await getCatalog(); return <html lang="tr" data-scroll-behavior="smooth"><body><CatalogProvider catalog={catalog}><Shell>{children}</Shell></CatalogProvider></body></html>; }
