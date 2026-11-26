import { Suspense } from "react";
import { Explorer } from "../../components/explorer";
export const metadata = { title: "Takip listem" };
export default function WatchlistPage() { return <Suspense fallback={<p className="loading-state">Takip listen hazırlanıyor…</p>}><Explorer watchlistOnly /></Suspense>; }
