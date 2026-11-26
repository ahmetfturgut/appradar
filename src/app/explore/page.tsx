import { Suspense } from "react";
import { Explorer } from "../../components/explorer";
export default function ExplorePage() { return <Suspense fallback={<p className="loading-state">Uygulamalar hazırlanıyor…</p>}><Explorer /></Suspense>; }
