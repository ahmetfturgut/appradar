"use client";
import { CatalogState } from "../components/core/elements";

// Next.js 16 passes `retry` to error boundaries (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <section className="rounded-xl border bg-card shadow-xs"><CatalogState state="error" onReset={() => retry()} /></section>;
}
