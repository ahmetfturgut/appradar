"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "../components/ui/button";
import { contextResetHref } from "../components/core/catalog-query";
export default function NotFound() {
  const params = useSearchParams();
  return <section className="product-panel product-state"><Compass size={30} /><h1>App not found</h1><p>This app identity was not found in the stored catalog. Return to the explorer to discover another app.</p><Button asChild variant="outline"><Link href={contextResetHref("/explore", Object.fromEntries(params))}>Back to App Explorer</Link></Button></section>;
}
