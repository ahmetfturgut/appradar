import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { LandingPage } from "../src/components/landing/landing-page.tsx";
import { dictionaries } from "../src/lib/landing/dictionaries.ts";
import { landingMetadata } from "../src/lib/landing/metadata.ts";
import { LANDING_LOCALE_COOKIE, LANDING_LOCALE_HEADER, landingHref, landingLocaleFromPath, preferredLandingLocale } from "../src/lib/landing/locale.ts";
import { proxy } from "../src/proxy.ts";
import { routeDecision } from "../src/lib/auth/paths.ts";

function leaves(value: unknown, path = ""): Map<string, string> {
  const result = new Map<string, string>();
  if (typeof value === "string") result.set(path, value);
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    for (const [leaf, text] of leaves(child, `${path}.${key}`)) result.set(leaf, text);
  }
  return result;
}

test("English and Turkish have complete non-empty dictionaries and all required content", () => {
  const en = leaves(dictionaries.en), tr = leaves(dictionaries.tr);
  assert.deepEqual([...en.keys()], [...tr.keys()]);
  for (const [key, text] of [...en, ...tr]) assert.ok(text.trim().length > 0, key);
  for (const locale of ["en", "tr"] as const) {
    const text = dictionaries[locale];
    assert.equal(text.features.items.length, 4); assert.equal(text.how.items.length, 3);
    assert.equal(text.faq.items.length, 8); assert.equal(text.audience.items.length, 3);
    assert.equal(Object.keys(text.market.metrics).length, 6);
  }
  assert.equal(dictionaries.en.hero.title, "Check the market before you write the code.");
  assert.equal(dictionaries.tr.hero.title, "Koda başlamadan önce pazarı araştırın.");
});

test("locale URLs are independent of store filters and first visits default to English", () => {
  assert.equal(landingHref("en"), "/en"); assert.equal(landingHref("tr"), "/tr");
  assert.equal(landingLocaleFromPath("/en"), "en"); assert.equal(landingLocaleFromPath("/tr"), "tr");
  for (const path of ["/dashboard", "/explore", "/login", "/tr/explore", "/fr", "/"]) assert.equal(landingLocaleFromPath(path), null);
  assert.equal(preferredLandingLocale("tr"), "tr");
  for (const value of [undefined, null, "TR", "fr", "tr-TR", "../../tr"]) assert.equal(preferredLandingLocale(value), "en");
});

test("localized metadata has stable canonical, hreflang and localized social descriptions", () => {
  for (const locale of ["en", "tr"] as const) {
    // Indexing is opt-in; canonical and alternates are identical with or without approval.
    const unapproved = landingMetadata(locale, { NEXT_PUBLIC_SITE_URL: "https://example.test/", NODE_ENV: "production" });
    assert.deepEqual(unapproved.robots, { index: false, follow: false });
    const metadata = landingMetadata(locale, { NEXT_PUBLIC_SITE_URL: "https://example.test/", NODE_ENV: "production", APPRADAR_PUBLIC_INDEXING_APPROVED: "true" });
    assert.deepEqual(unapproved.alternates, metadata.alternates);
    assert.deepEqual(metadata.title, { absolute: dictionaries[locale].meta.title });
    assert.equal(metadata.description, dictionaries[locale].meta.description);
    assert.equal(metadata.alternates!.canonical, `https://example.test/${locale}`);
    assert.deepEqual(metadata.alternates!.languages, { en: "https://example.test/en", tr: "https://example.test/tr", "x-default": "https://example.test/en" });
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    assert.equal(metadata.openGraph!.description, dictionaries[locale].meta.description);
  }
  for (const NEXT_PUBLIC_SITE_URL of ["", "not-a-url", "javascript:alert(1)", "http://example.test", "https://user:secret@example.test"]) {
    const metadata = landingMetadata("en", { NEXT_PUBLIC_SITE_URL, NODE_ENV: "production" });
    assert.equal(metadata.alternates, undefined);
    assert.deepEqual(metadata.robots, { index: false, follow: false });
  }
});

test("landing renders both languages without a store-data request and retains semantic sections", () => {
  for (const locale of ["en", "tr"] as const) {
    const text = dictionaries[locale];
    const html = renderToStaticMarkup(createElement(LandingPage, { locale, signedIn: false }));
    assert.ok(html.includes(text.hero.title)); assert.ok(html.includes(text.market.synthetic));
    assert.ok(html.includes(text.features.illustrative)); assert.ok(html.includes(text.footer.unpublished));
    for (const id of ["main", "features", "how-it-works", "market-check", "evidence", "comparison-title", "audience-title", "faq-title", "cta-title"]) assert.ok(html.includes(`id="${id}"`), id);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((html.match(/<details\b/g) ?? []).length, 14);
    assert.equal((html.match(/<summary\b/g) ?? []).length, 14);
    assert.match(html, /href="\/login"/); assert.doesNotMatch(html, /href="\/signup"/);
    assert.match(html, /href="#market-check"/);
    assert.match(html, /href="\/en" hrefLang="en"/);
    assert.match(html, /href="\/tr" hrefLang="tr"/);
    assert.match(html, /aria-current="page"/);
    assert.ok(html.includes(text.features.visual.history));
    assert.doesNotMatch(html, /<img\b|<iframe\b|supabase\.co|apps\.apple\.com|play\.google\.com/);
    if (locale === "tr") {
      assert.doesNotMatch(html, /Illustrative data|Sample value|coming soon|Skip to content|Store coverage/);
      assert.match(html, /İçeriğe geç|Örnek|ş|ğ/);
    }
  }
});

test("authenticated CTAs retain the dashboard destination, without localized auth paths", () => {
  for (const locale of ["en", "tr"] as const) {
    const html = renderToStaticMarkup(createElement(LandingPage, { locale, signedIn: true }));
    assert.match(html, /href="\/dashboard"/);
    assert.doesNotMatch(html, /href="\/(signup|login)"/);
    assert.doesNotMatch(html, /href="\/(en|tr)\/(dashboard|login|signup)"/);
  }
});

test("proxy supplies URL-based SSR language, persists preferences and preserves protected redirects", async () => {
  const previous = { ...process.env };
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.APPRADAR_DEMO_MODE = "false";
    const root = await proxy(new NextRequest("http://localhost:3000/"));
    assert.equal(root.status, 307);
    assert.equal(new URL(root.headers.get("location")!).pathname, "/en");
    const rootTr = await proxy(new NextRequest("http://localhost:3000/", { headers: { cookie: `${LANDING_LOCALE_COOKIE}=tr` } }));
    assert.equal(rootTr.status, 307);
    assert.equal(new URL(rootTr.headers.get("location")!).pathname, "/tr");
    for (const locale of ["en", "tr"] as const) {
      const request = new NextRequest(`http://localhost:3000/${locale}?country=US&language=en`, { headers: { [LANDING_LOCALE_HEADER]: "forged" } });
      const response = await proxy(request);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get(`x-middleware-request-${LANDING_LOCALE_HEADER}`), locale);
      const cookie = response.cookies.get(LANDING_LOCALE_COOKIE);
      assert.equal(cookie?.value, locale); assert.equal(cookie?.path, "/");
      assert.equal(cookie?.httpOnly, true); assert.equal(cookie?.maxAge, 31_536_000);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.equal(response.headers.get("location"), null);
    }
    const login = await proxy(new NextRequest("http://localhost:3000/login", { headers: { [LANDING_LOCALE_HEADER]: "tr", cookie: `${LANDING_LOCALE_COOKIE}=tr` } }));
    assert.equal(login.headers.get(`x-middleware-request-${LANDING_LOCALE_HEADER}`), "en");
    const protectedResponse = await proxy(new NextRequest("http://localhost:3000/explore?country=TR&language=tr"));
    assert.equal(protectedResponse.status, 307);
    const location = new URL(protectedResponse.headers.get("location")!);
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("next"), "/explore?country=TR&language=tr");
    assert.deepEqual(routeDecision({ path: "/signup", search: "?next=%2Fexplore%3Fcountry%3DTR", hasUser: true, demo: false }), { action: "redirect", to: "/explore?country=TR" });
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("header action is hidden below xl by a variant, not a conflicting base display utility", () => {
  const html = renderToStaticMarkup(createElement(LandingPage, { locale: "en", signedIn: false }));
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  const action = header.match(/<a [^>]*href="\/en#market-check"[^>]*class="([^"]*bg-primary[^"]*)"/)?.[1] ?? header.match(/<a [^>]*class="([^"]*bg-primary[^"]*)"[^>]*href="\/en#market-check"/)?.[1];
  assert.ok(action, "header action present");
  assert.match(action, /\bmax-xl:hidden\b/);
  assert.doesNotMatch(action, /(^|\s)hidden(\s|$)/);
});
