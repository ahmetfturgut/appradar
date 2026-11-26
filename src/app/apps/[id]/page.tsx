import { notFound } from "next/navigation";
import { AppDetail } from "../../../components/app-detail";
import { getCatalog } from "../../../lib/catalog.server";
import { displayApp } from "../../../lib/demo-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await getCatalog();
  return { title: catalog.apps.find(a => a.id === id)?.name ?? "Uygulama bulunamadı" };
}
export default async function AppPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const catalog = await getCatalog();
  const app = catalog.apps.find(a => a.id === id);
  if (!app) notFound();
  const country = query.country === "US" ? "US" : "TR";
  const back = typeof query.back === "string" ? query.back : "";
  const backHref = /^\/(explore|watchlist)(\?|$)/.test(back) ? back : `/explore?country=${country}`;
  return <AppDetail app={displayApp(app, country)} country={country} backHref={backHref} />;
}
