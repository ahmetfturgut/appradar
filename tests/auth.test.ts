import test from "node:test";
import assert from "node:assert/strict";
import { isChromelessPath, isProtectedPath, loginHref, routeDecision, safeNextPath } from "../src/lib/auth/paths.ts";
import { publicAuthConfig } from "../src/lib/auth/config.ts";
import { isDevelopmentDemo } from "../src/lib/ui/demo-mode.ts";

test("safeNextPath keeps allowlisted internal paths with their query", () => {
  assert.equal(safeNextPath("/explore?country=TR&language=tr&store=play"), "/explore?country=TR&language=tr&store=play");
  assert.equal(safeNextPath("/apps/de000000-0000-4000-8000-000000000078?country=US"), "/apps/de000000-0000-4000-8000-000000000078?country=US");
  assert.equal(safeNextPath("/dashboard"), "/dashboard");
  assert.equal(safeNextPath("/account"), "/account");
  assert.equal(safeNextPath("/reset-password"), "/reset-password");
});

test("safeNextPath rejects open redirects and unknown destinations", () => {
  for (const value of [
    "https://evil.example/dashboard", "//evil.example/dashboard", "/\\evil.example", "\\\\evil.example",
    "/%2F%2Fevil.example", "javascript:alert(1)", "/dashboard\r\nLocation: https://evil.example", "/login",
    "/signup", "/", "/auth/callback?next=//evil", "/dashboardx", "/../dashboard/../../etc", "", undefined, null, 42,
    "/explore\u0000", `/${"a".repeat(2000)}`,
  ]) {
    const result = safeNextPath(value);
    assert.ok(result === "/dashboard" || result.startsWith("/dashboard"), `${String(value)} → ${result}`);
    assert.ok(!result.startsWith("//") && !result.includes("evil"), `${String(value)} leaked → ${result}`);
  }
  assert.equal(safeNextPath("/%2F%2Fevil.example"), "/dashboard");
});

test("route policy: protected, guest-only and chromeless paths", () => {
  for (const path of ["/dashboard", "/explore", "/apps/x", "/account", "/admin", "/settings", "/watchlist"]) assert.ok(isProtectedPath(path), path);
  for (const path of ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/dashboards", "/explorer"]) assert.ok(!isProtectedPath(path), path);
  for (const path of ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"]) assert.ok(isChromelessPath(path), path);
  assert.ok(!isChromelessPath("/dashboard"));
});

test("routeDecision redirects anonymous visitors with a preserved, validated next", () => {
  assert.deepEqual(routeDecision({ path: "/explore", search: "?country=TR&store=play", hasUser: false, demo: false }), { action: "redirect", to: `/login?next=${encodeURIComponent("/explore?country=TR&store=play")}` });
  assert.deepEqual(routeDecision({ path: "/dashboard", search: "", hasUser: true, demo: false }), { action: "next" });
  assert.deepEqual(routeDecision({ path: "/", search: "", hasUser: false, demo: false }), { action: "next" });
  assert.deepEqual(routeDecision({ path: "/login", search: "?next=%2Fexplore%3Fcountry%3DUS", hasUser: true, demo: false }), { action: "redirect", to: "/explore?country=US" });
  assert.deepEqual(routeDecision({ path: "/signup", search: "?next=https%3A%2F%2Fevil.example", hasUser: true, demo: false }), { action: "redirect", to: "/dashboard" });
  assert.deepEqual(routeDecision({ path: "/explore", search: "", hasUser: false, demo: true }), { action: "next" });
  assert.equal(loginHref("/apps/abc", "?country=US"), `/login?next=${encodeURIComponent("/apps/abc?country=US")}`);
});

test("demo auth bypass is impossible outside development", () => {
  assert.equal(isDevelopmentDemo({ NODE_ENV: "production", APPRADAR_DEMO_MODE: "true" }), false);
  assert.equal(isDevelopmentDemo({ NODE_ENV: "test", APPRADAR_DEMO_MODE: "true" }), false);
  assert.equal(isDevelopmentDemo({ NODE_ENV: "development", APPRADAR_DEMO_MODE: "false" }), false);
  assert.equal(isDevelopmentDemo({ NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" }), true);
  // Production with the flag set still redirects anonymous visitors.
  assert.equal(routeDecision({ path: "/dashboard", search: "", hasUser: false, demo: isDevelopmentDemo({ NODE_ENV: "production", APPRADAR_DEMO_MODE: "true" }) }).action, "redirect");
});

test("publicAuthConfig only accepts a publishable key and a safe URL", () => {
  const url = "https://project.supabase.co";
  assert.deepEqual(publicAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc" }), { url, publishableKey: "sb_publishable_abc" });
  assert.equal(publicAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" }), null);
  const serviceRoleJwt = `x.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.y`;
  const anonJwt = `x.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.y`;
  assert.equal(publicAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: serviceRoleJwt }), null);
  assert.ok(publicAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonJwt }));
  assert.equal(publicAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: "http://project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc" }), null);
  assert.equal(publicAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ab\nc" }), null);
  assert.equal(publicAuthConfig({}), null);
});

test("demo bypass never opens guest-only redirects and keeps protected paths open only in development", () => {
  assert.deepEqual(routeDecision({ path: "/login", search: "", hasUser: false, demo: true }), { action: "next" });
  assert.deepEqual(routeDecision({ path: "/dashboard", search: "", hasUser: false, demo: true }), { action: "next" });
  assert.equal(routeDecision({ path: "/explore", search: "", hasUser: false, demo: false }).action, "redirect");
});
