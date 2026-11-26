"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Compass, SearchX } from "lucide-react";
import { Button } from "../components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../components/ui/empty";
import { contextResetHref } from "../components/core/catalog-query";

// Root not-found boundary. It serves both unknown URLs and `notFound()` from /apps/[id],
// so the copy follows the path instead of always claiming an app is missing.
export default function NotFound() {
  const params = Object.fromEntries(useSearchParams());
  const app = usePathname().startsWith("/apps/");
  return <section className="rounded-xl border bg-card shadow-xs">
    <Empty className="min-h-80"><EmptyHeader><EmptyMedia variant="icon">{app ? <Compass /> : <SearchX />}</EmptyMedia>
      <EmptyTitle role="heading" aria-level={1}>{app ? "App not found" : "Page not found"}</EmptyTitle>
      <EmptyDescription>{app ? "This app identity was not found in the stored catalog. Return to the explorer to discover another app." : "This address doesn’t match a page in AppRadar. Check the URL or go back to the dashboard."}</EmptyDescription>
    </EmptyHeader><EmptyContent>{app
      ? <Button asChild variant="outline"><Link href={contextResetHref("/explore", params)}>Back to App Explorer</Link></Button>
      : <Button asChild variant="outline"><Link href={contextResetHref("/dashboard", params)}>Go to Dashboard</Link></Button>}</EmptyContent></Empty>
  </section>;
}
