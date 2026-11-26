import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { LegalPage } from "../src/components/landing/legal-page.tsx";
import { legalDictionaries, legalDocuments } from "../src/lib/landing/legal.ts";
import { landingLocaleFromPath, LANDING_LOCALE_HEADER } from "../src/lib/landing/locale.ts";
import { legalMetadata } from "../src/lib/landing/metadata.ts";
import { proxy } from "../src/proxy.ts";

// Real SDK/action code, completely intercepted HTTP and request cookie store. No real accounts.
const jar = new Map<string, string>();
(globalThis as { __betaJar?: Map<string, string> }).__betaJar = jar;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  const fakes: Record<string, string> = {
    "server-only": "export{}",
    "next/headers": `export const cookies = async () => ({ getAll: () => [...globalThis.__betaJar].map(([name,value]) => ({name,value})), set: (n,v) => { if(v) globalThis.__betaJar.set(n,v); else globalThis.__betaJar.delete(n); } }); export const headers = async () => new Headers();`,
  };
  return specifier in fakes ? { url: `data:text/javascript,${encodeURIComponent(fakes[specifier]!)}`, shortCircuit: true } : nextResolve(specifier, context);
} });
const env = { ...process.env }, originalFetch = globalThis.fetch, originalNow = Date.now, originalWarn = console.warn;
const REF = "abcdefghijklmnopqrst", URL_BASE = `https://${REF}.supabase.co`, COOKIE = `sb-${REF}-auth-token`;
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
const makeUser = (id = A) => ({ id, aud: "authenticated", email: `${id}@example.test`, email_confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", is_anonymous: false, factors: [] as { status: string }[] });
let current = makeUser(), proof = makeUser(), proofFails = false, sessionRevoked = false, elapsed = false;
let deleteMode: "ok" | "rejected" | "lost" | "unknown" = "ok";
let logoutFails = false;
let revokeAfterProof = false, changeEmailAfterProof = false;
const calls: { url: URL; method: string; body: Record<string, unknown>; authorization: string | null }[] = [];
const deletedIds: string[] = [], warnings: string[] = [];
const accounts = new Map<string, unknown>(), watchlists = new Map<string, string[]>();
const catalog = [{ id: "shared-app", rating: 4.2 }];
const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: A, exp: 9999999999 })).toString("base64url")}.c2ln`;
const tokenResponse = (user = proof) => ({ access_token: jwt, refresh_token: "synthetic-proof-refresh", expires_in: 3600, token_type: "bearer", user });
const form = (extra: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ confirmation: "DELETE", acknowledge: "yes", password: "synthetic-password", ...extra })) data.set(key, value);
  return data;
};
function signInCookie() {
  jar.set(COOKIE, `base64-${Buffer.from(JSON.stringify({ ...tokenResponse(current), expires_at: 9999999999 })).toString("base64url")}`);
}
beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: "test", APPRADAR_DEMO_MODE: "false", SUPABASE_URL: URL_BASE, NEXT_PUBLIC_SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_synthetic", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic" });
  jar.clear(); calls.length = 0; deletedIds.length = 0; warnings.length = 0;
  current = makeUser(); proof = makeUser(); proofFails = false; sessionRevoked = false; elapsed = false; logoutFails = false; deleteMode = "ok";
  revokeAfterProof = false; changeEmailAfterProof = false;
  accounts.clear(); accounts.set(A, current); accounts.set(B, makeUser(B));
  watchlists.clear(); watchlists.set(A, ["shared-app"]); watchlists.set(B, ["shared-app"]);
  Date.now = originalNow;
  console.warn = (...args) => { warnings.push(args.join(" ")); };
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? "GET", headers = new Headers(init?.headers);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    calls.push({ url, method, body, authorization: headers.get("authorization") });
    const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-supabase-api-version": "2024-01-01" } });
    if (url.origin !== URL_BASE) throw new Error("Blocked unexpected origin");
    if (url.pathname === "/auth/v1/user") return accounts.has(A) && !sessionRevoked ? response(current) : response({ code: "user_not_found", msg: "synthetic absent user" }, 403);
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      if (elapsed) { const later = originalNow() + 61_000; Date.now = () => later; }
      if (revokeAfterProof) sessionRevoked = true;
      if (changeEmailAfterProof) current = { ...current, email: "changed@example.test" };
      return proofFails ? response({ code: "invalid_credentials", msg: "bad synthetic password" }, 400) : response(tokenResponse());
    }
    if (url.pathname === "/auth/v1/logout") return response({}, logoutFails ? 500 : 200);
    if (url.pathname.startsWith("/auth/v1/admin/users/")) {
      const id = url.pathname.split("/").at(-1)!;
      assert.equal(headers.get("apikey"), "sb_secret_synthetic");
      if (method === "DELETE") {
        deletedIds.push(id);
        if (deleteMode === "rejected" || deleteMode === "unknown") return response({ code: "unexpected_failure", msg: "synthetic failure" }, 400);
        accounts.delete(id); watchlists.delete(id); // isolated fake of the already-verified Auth FK cascade
        return deleteMode === "lost" ? response({ code: "unexpected_failure" }, 400) : response({});
      }
      if (deleteMode === "unknown") return response({ code: "unexpected_failure", msg: "unconfirmed" }, 400);
      return accounts.has(id) ? response({ user: accounts.get(id) }) : response({ code: "user_not_found", msg: "absent" }, 404);
    }
    throw new Error(`Blocked unexpected HTTP path ${url.pathname}`);
  };
});
after(() => {
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
  Object.assign(process.env, env); globalThis.fetch = originalFetch; Date.now = originalNow; console.warn = originalWarn; hooks.deregister();
});
const deletion = async (data = form()) => (await import("../src/lib/auth/delete-account.ts")).deleteCurrentAccount(data);

test("all six legal routes render localized drafts, unresolved facts and working language/footer links", async () => {
  const route = await import("../src/app/[locale]/[document]/page.tsx");
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  for (const locale of ["en", "tr"] as const) for (const document of legalDocuments) {
    const params = Promise.resolve({ locale, document });
    const html = renderToStaticMarkup(await route.default({ params }));
    const copy = legalDictionaries[locale];
    assert.ok(html.includes(copy.draft)); assert.ok(html.includes(copy.documents[document].title));
    assert.ok(html.includes(copy.unresolved));
    for (const other of ["en", "tr"]) assert.ok(html.includes(`href="/${other}/${document}"`));
    for (const target of legalDocuments) assert.ok(html.includes(`href="/${locale}/${target}"`));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.doesNotMatch(html, /mailto:|<form\b|@appradar|<img\b/);
    assert.equal(landingLocaleFromPath(`/${locale}/${document}`), locale);
    const metadata = legalMetadata(locale, document, { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://example.test" });
    assert.deepEqual(metadata.robots, { index: false, follow: false });
    assert.equal(metadata.alternates?.canonical, `https://example.test/${locale}/${document}`);
    const response = await proxy(new NextRequest(`http://localhost:3000/${locale}/${document}`));
    assert.equal(response.status, 200); assert.equal(response.headers.get(`x-middleware-request-${LANDING_LOCALE_HEADER}`), locale);
  }
  assert.equal(calls.length, 0);
  await assert.rejects(route.default({ params: Promise.resolve({ locale: "fr", document: "privacy" }) }), { digest: /404/ });
  await assert.rejects(route.default({ params: Promise.resolve({ locale: "tr", document: "unknown" }) }), { digest: /404/ });
  assert.equal(landingLocaleFromPath("/tr/account"), null);
});

test("account/settings access is protected; demo shows no real account or deletion form", async () => {
  const account = await import("../src/app/account/page.tsx");
  const settings = await import("../src/app/settings/page.tsx");
  await assert.rejects(account.default({ searchParams: Promise.resolve({}) }), { digest: /\/login\?next=%2Faccount/ });
  await assert.rejects(settings.default(), { digest: /\/login\?next=%2Fsettings/ });
  Object.assign(process.env, { NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" });
  const demoHtml = renderToStaticMarkup(await account.default({ searchParams: Promise.resolve({}) }));
  assert.match(demoHtml, /Development demo/); assert.doesNotMatch(demoHtml, /Permanently delete|<form/);
  await assert.rejects(settings.default(), { digest: /\/account/ });
  assert.equal(calls.length, 0);
});

test("account exposes email, reset, sign out and deletion only to a real verified account", async () => {
  signInCookie();
  const account = await import("../src/app/account/page.tsx");
  const html = renderToStaticMarkup(await account.default({ searchParams: Promise.resolve({}) }));
  assert.ok(html.includes(current.email));
  for (const text of ["Reset password by email", "Sign out", "Type DELETE", "Current password", "Permanently delete my account"]) assert.ok(html.includes(text));
  const settings = await import("../src/app/settings/page.tsx");
  await assert.rejects(settings.default(), { digest: /\/account/ });
  assert.equal(deletedIds.length, 0);
});

test("demo, absent session, anonymous user and unverified email cannot delete", async () => {
  Object.assign(process.env, { NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" });
  assert.match((await deletion()).message, /disabled/); assert.equal(calls.length, 0);
  Object.assign(process.env, { NODE_ENV: "test", APPRADAR_DEMO_MODE: "false" });
  assert.match((await deletion()).message, /Sign in again/);
  current.is_anonymous = true; signInCookie(); assert.match((await deletion()).message, /Sign in again/);
  current = { ...makeUser(), email_confirmed_at: "" }; signInCookie(); assert.match((await deletion()).message, /Verify/);
  assert.equal(deletedIds.length, 0); assert.ok(calls.every(c => !c.url.pathname.includes("admin") && !c.url.pathname.includes("token")));
});

test("explicit DELETE, checkbox and password are independently required server-side", async () => {
  signInCookie();
  for (const extra of [{ confirmation: "delete" }, { confirmation: "" }, { acknowledge: "" }, { acknowledge: "true" }, { password: "" }, { password: "x".repeat(73) }]) {
    assert.equal((await deletion(form(extra))).status, "error");
  }
  assert.equal(calls.length, 0);
});

test("credentials must target the session project and remain server-only", async () => {
  const { accountDeletionConfig } = await import("../src/lib/auth/delete-account.ts");
  for (const extra of [
    { SUPABASE_URL: "https://other.supabase.co" }, { SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_wrong" },
    { SUPABASE_SERVICE_ROLE_KEY: "" }, { SUPABASE_URL: `${URL_BASE}/auth` },
    { SUPABASE_URL: `https://user:password@${REF}.supabase.co` },
    { SUPABASE_SERVICE_ROLE_KEY: `x.${Buffer.from(JSON.stringify({ role: "service_role", ref: "other" })).toString("base64url")}.x` },
  ]) assert.equal(accountDeletionConfig({ ...process.env, ...extra }), null);
  process.env.SUPABASE_URL = "https://other.supabase.co";
  assert.equal((await deletion()).status, "error"); assert.equal(calls.length, 0);
});

test("fresh password check must match the current user; wrong password and MFA fail closed", async () => {
  signInCookie(); proofFails = true;
  assert.match((await deletion()).message, /Reauthentication failed/);
  proofFails = false; proof = makeUser(B);
  assert.match((await deletion()).message, /Reauthentication failed/);
  current.factors = [{ status: "verified" }];
  assert.match((await deletion()).message, /MFA/);
  assert.equal(deletedIds.length, 0);
  assert.ok(calls.every(c => !c.url.pathname.includes("admin")));
  assert.ok(calls.filter(c => c.url.pathname.endsWith("/token")).every(c => c.body.email === makeUser().email));
});

test("expired reauthentication and revoked session cannot reach deletion", async () => {
  signInCookie(); elapsed = true;
  assert.match((await deletion()).message, /expired/); assert.equal(deletedIds.length, 0);
  Date.now = originalNow; elapsed = false; sessionRevoked = true;
  assert.match((await deletion()).message, /Sign in again/); assert.equal(deletedIds.length, 0);
});

test("session revocation or identity change during reauthentication prevents deletion", async () => {
  signInCookie(); revokeAfterProof = true;
  assert.match((await deletion()).message, /changed or expired/);
  assert.equal(deletedIds.length, 0);
  revokeAfterProof = false; sessionRevoked = false; changeEmailAfterProof = true;
  signInCookie();
  assert.match((await deletion()).message, /changed or expired/);
  assert.equal(deletedIds.length, 0);
  assert.ok(calls.every(c => !c.url.pathname.includes("admin")));
});

test("successful deletion ignores forged IDs/emails and preserves other users and shared catalog", async () => {
  signInCookie();
  assert.equal((await deletion(form({ userId: B, email: makeUser(B).email }))).status, "deleted");
  assert.deepEqual(deletedIds, [A]); assert.equal(accounts.has(A), false); assert.equal(watchlists.has(A), false);
  assert.equal(accounts.has(B), true); assert.deepEqual(watchlists.get(B), ["shared-app"]);
  assert.deepEqual(catalog, [{ id: "shared-app", rating: 4.2 }]);
  assert.ok(!jar.has(COOKIE));
  const destructive = calls.filter(c => c.method === "DELETE");
  assert.deepEqual(destructive.map(c => c.url.pathname), [`/auth/v1/admin/users/${A}`]);
  assert.deepEqual(destructive[0]!.body, { should_soft_delete: false });
  assert.ok(calls.every(c => c.url.pathname.startsWith("/auth/v1/")), "no catalog, persistence or provider request");
});

test("failed deletion preserves the account/watchlist; a lost response is reconciled without replay", async () => {
  signInCookie(); deleteMode = "rejected";
  assert.match((await deletion()).message, /account remains/);
  assert.equal(accounts.has(A), true); assert.deepEqual(watchlists.get(A), ["shared-app"]); assert.ok(jar.has(COOKIE));
  calls.length = 0; deletedIds.length = 0; deleteMode = "lost";
  assert.equal((await deletion()).status, "deleted"); assert.deepEqual(deletedIds, [A]);
  assert.equal(accounts.has(B), true);
});

test("uncertain deletion never reports success; post-deletion logout failure never replays deletion", async () => {
  signInCookie(); deleteMode = "unknown";
  assert.match((await deletion()).message, /could not be confirmed/);
  assert.equal(accounts.has(A), true); assert.deepEqual(watchlists.get(A), ["shared-app"]);
  deleteMode = "ok"; logoutFails = true; deletedIds.length = 0;
  assert.equal((await deletion()).status, "deleted"); assert.deepEqual(deletedIds, [A]);
  assert.ok(!jar.has(COOKIE)); assert.ok(warnings.length > 0);
  assert.ok(warnings.every(line => !line.includes("synthetic-password") && !line.includes("sb_secret") && !line.includes(current.email)));
});

test("deletion server action redirects only after confirmed completion", async () => {
  const { deleteAccountAction } = await import("../src/lib/auth/delete-account-action.ts");
  assert.equal((await deleteAccountAction({ status: "idle" }, form())).status, "error");
  signInCookie();
  await assert.rejects(deleteAccountAction({ status: "idle" }, form()), { digest: /\/login\?message=account_deleted/ });
});

test("drafts stay explicit in both languages without owner email or jurisdiction invention", () => {
  for (const locale of ["en", "tr"] as const) {
    const html = renderToStaticMarkup(createElement(LegalPage, { locale, document: "contact", signedIn: false }));
    assert.ok(html.includes(legalDictionaries[locale].notice));
    assert.match(html, /href="\/account"/);
  }
});
