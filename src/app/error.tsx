"use client";
import { CatalogState } from "../components/core/elements";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="product-panel"><CatalogState state="error" onReset={reset} /></section>; }
