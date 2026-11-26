import type { Metadata } from "next";
import { dictionaries } from "./dictionaries";
import { landingHref, type LandingLocale } from "./locale";
import { legalDictionaries, type LegalDocument } from "./legal";

export function landingMetadata(locale: LandingLocale, env: { NEXT_PUBLIC_SITE_URL?: string; NODE_ENV?: string } = process.env): Metadata {
  let origin: string | null = null;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || (env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : ""));
    const local = env.NODE_ENV === "development" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (!url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && local))) origin = url.origin;
  } catch { /* No guessed production domain. Keep indexing off until the site origin is configured. */ }
  const text = dictionaries[locale].meta;
  return {
    title: { absolute: text.title }, description: text.description,
    robots: { index: !!origin && env.NODE_ENV === "production", follow: !!origin && env.NODE_ENV === "production" },
    ...(origin ? { metadataBase: new URL(origin), alternates: {
      canonical: `${origin}${landingHref(locale)}`,
      languages: { en: `${origin}/en`, tr: `${origin}/tr`, "x-default": `${origin}/en` },
    } } : {}),
    openGraph: { title: text.title, description: text.description, type: "website", locale: locale === "tr" ? "tr_TR" : "en_US", alternateLocale: locale === "tr" ? "en_US" : "tr_TR", ...(origin ? { url: `${origin}${landingHref(locale)}` } : {}) },
  };
}

export function legalMetadata(locale: LandingLocale, document: LegalDocument, env: { NEXT_PUBLIC_SITE_URL?: string; NODE_ENV?: string } = process.env): Metadata {
  const base = landingMetadata(locale, env);
  const text = legalDictionaries[locale].documents[document];
  const origin = base.metadataBase?.toString().replace(/\/$/, "");
  const title = `${text.title} · AppRadar · ${legalDictionaries[locale].draft}`;
  return {
    ...base, title: { absolute: title }, description: text.description,
    robots: { index: false, follow: false }, // Drafts remain unindexed even with a valid production origin.
    ...(origin ? { alternates: {
      canonical: `${origin}/${locale}/${document}`,
      languages: { en: `${origin}/en/${document}`, tr: `${origin}/tr/${document}`, "x-default": `${origin}/en/${document}` },
    } } : {}),
    openGraph: { ...base.openGraph, title, description: text.description, ...(origin ? { url: `${origin}/${locale}/${document}` } : {}) },
  };
}
