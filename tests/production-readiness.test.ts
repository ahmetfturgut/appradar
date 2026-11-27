import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import config, { securityHeaders } from "../next.config.ts";
import { productionConfigProblems } from "../src/lib/config/production.ts";
import { closedGates, CollectionConfig } from "../src/lib/collection/config.ts";
import { parsePage, parseExplorer } from "../src/components/core/catalog-query.ts";
import { exploreApps, MAX_PAGE_SIZE } from "../src/lib/read/index.ts";
import type { ReadClient } from "../src/lib/read/client.ts";
import { parseCompareIds } from "../src/lib/watchlist/model.ts";
import { proxy } from "../src/proxy.ts";

// Everything here is offline: Supabase is replaced by a fetch stub and Next's request stores by fakes.
const jar = new Map<string, string>();
const fakes: Record<string, string> = {
  "server-only": "",
  "next/headers": `const jar = () => globalThis.__testJar;
    export const cookies = async () => ({ get: n => jar().has(n) ? { name: n, value: jar().get(n) } : undefined,
      getAll: () => [...jar()].map(([name, value]) => ({ name, value })), set: (n, v) => { v ? jar().set(n, v) : jar().delete(n); } });
    export const headers = async () => new Headers({ host: "evil.example" });`,
  "next/cache": "export const refresh = () => {}; export const revalidatePath = () => {};",
};
(globalThis as { __testJar?: Map<string, string> }).__testJar = jar;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  const fake = fakes[specifier];
  return fake === undefined ? nextResolve(specifier, context) : { url: `data:text/javascript,${encodeURIComponent(fake || "export{}")}`, shortCircuit: true };
} });

const REF = "abcdefghijklmnopqrst", DEV_REF = "devdevdevdevdevdevde";
const SUPABASE = `https://${REF}.supabase.co`, SITE = "https://app.example.com";
const COOKIE = `sb-${REF}-auth-token`;
const jwt = (claims: object) => `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.c2ln`;
const productionClosed = {
  APPRADAR_DEMO_MODE: "false", COLLECTION_PAID_EXECUTION: "false", APIFY_COLLECTION_ENABLED: "false",
  POC_DATA_USE_CONFIRMED: "false", RETENTION_CLEANUP_EXECUTION: "false",
  APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL: "false", APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED: "false",
  APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL: "false", APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED: "false",
  APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED: "false",
};
const production = {
  NODE_ENV: "production", APPRADAR_SUPABASE_PROJECT_REF: REF, SUPABASE_URL: SUPABASE, NEXT_PUBLIC_SUPABASE_URL: SUPABASE,
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture", NEXT_PUBLIC_SITE_URL: SITE,
  ...productionClosed,
};

const originalEnv = { ...process.env }, originalFetch = globalThis.fetch, originalError = console.error, originalWarn = console.warn;
const logs: string[] = [], calls: { method: string; url: URL }[] = [];
type Reply = { status?: number; body?: unknown };
let reply: (url: URL, method: string) => Reply | undefined = () => undefined;

beforeEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnv, { NODE_ENV: "test", NEXT_PUBLIC_SUPABASE_URL: SUPABASE, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture", NEXT_PUBLIC_SITE_URL: SITE, APPRADAR_DEMO_MODE: "false" });
  jar.clear(); logs.length = 0; calls.length = 0; reply = () => undefined;
  console.error = console.warn = (...args: unknown[]) => { logs.push(args.join(" ")); };
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? "GET";
    calls.push({ method, url });
    const found = reply(url, method);
    if (!found) throw new Error("unexpected network call");
    return new Response(JSON.stringify(found.body ?? {}), { status: found.status ?? 200, headers: { "content-type": "application/json" } });
  };
});
after(() => {
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv); globalThis.fetch = originalFetch; console.error = originalError; console.warn = originalWarn; hooks.deregister();
});

const form = (values: Record<string, string>) => { const data = new FormData(); for (const [k, v] of Object.entries(values)) data.set(k, v); return data; };
const user = (extra: object = {}) => ({ id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", email: "someone@example.com", ...extra });
const sessionCookie = (accessToken: string, expiresIn = 3600) => `base64-${Buffer.from(JSON.stringify({
  access_token: accessToken, refresh_token: "refresh-fixture", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + expiresIn, user: user(),
})).toString("base64url")}`;

/** A real ES256 token plus its JWKS, so the proxy verifies the signature locally as with asymmetric keys. */
async function signedToken(extra: object = {}) {
  const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const kid = crypto.randomUUID();
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const data = `${encode({ alg: "ES256", typ: "JWT", kid })}.${encode({ sub: user().id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s", ...extra })}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(data));
  const jwks: Reply = { body: { keys: [{ ...(await crypto.subtle.exportKey("jwk", publicKey)), kid, alg: "ES256", use: "sig" }] } };
  return { token: `${data}.${Buffer.from(signature).toString("base64url")}`, jwks };
}
const visit = (path: string, cookie?: string) => proxy(new NextRequest(`${SITE}${path}`, cookie ? { headers: { cookie: `${COOKIE}=${cookie}` } } : {}));

test("production configuration: a complete set passes and every omission or mix-up fails closed", () => {
  assert.deepEqual(productionConfigProblems(production), []);
  assert.deepEqual(productionConfigProblems({ ...production, SUPABASE_SERVICE_ROLE_KEY: jwt({ role: "service_role", ref: REF }), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt({ role: "anon", ref: REF }), COLLECTION_PAID_EXECUTION: "false", RETENTION_CLEANUP_EXECUTION: "" }), []);
  const required = ["APPRADAR_SUPABASE_PROJECT_REF", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"];
  for (const name of required) {
    assert.ok(productionConfigProblems({ ...production, [name]: " " }).includes(`${name}:missing`), name);
  }
  const rejected: [string, string, string][] = [
    ["SUPABASE_URL", `https://${DEV_REF}.supabase.co`, "project_mismatch"],
    ["NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321", "invalid"],
    ["NEXT_PUBLIC_SUPABASE_URL", `${SUPABASE}.evil.example`, "project_mismatch"],
    ["SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_fixture", "wrong_key_type"],
    ["SUPABASE_SERVICE_ROLE_KEY", jwt({ role: "service_role", ref: DEV_REF }), "project_mismatch"],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_fixture", "wrong_key_type"],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", jwt({ role: "anon", ref: DEV_REF }), "project_mismatch"],
    ["APPRADAR_SUPABASE_PROJECT_REF", "not a ref", "invalid"],
    ...["http://app.example.com", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://app.test", "https://app.example.com/path", "https://user@app.example.com", "nonsense"]
      .map(v => ["NEXT_PUBLIC_SITE_URL", v, "invalid"] as [string, string, string]),
  ];
  for (const [name, value, reason] of rejected) {
    assert.ok(productionConfigProblems({ ...production, [name]: value }).includes(`${name}:${reason}`), `${name}=${value}`);
  }
});

test("production cannot enable demo, collection or retention, and never publishes a server secret", () => {
  for (const flag of [
    "APPRADAR_DEMO_MODE", "COLLECTION_PAID_EXECUTION", "APIFY_COLLECTION_ENABLED", "POC_DATA_USE_CONFIRMED",
    "RETENTION_CLEANUP_EXECUTION", "APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED", "APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED", "APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED",
  ]) {
    for (const value of ["true", "TRUE", "1"]) assert.deepEqual(productionConfigProblems({ ...production, [flag]: value }), [`${flag}:must_be_false`]);
  }
  assert.deepEqual(productionConfigProblems({ ...production, NEXT_PUBLIC_EXTRA: "sb_secret_other" }), ["NEXT_PUBLIC_EXTRA:exposes_server_secret"]);
  assert.deepEqual(productionConfigProblems({ ...production, APIFY_TOKEN: "apify-token-value", NEXT_PUBLIC_EXTRA: "apify-token-value" }), ["NEXT_PUBLIC_EXTRA:exposes_server_secret"]);
  // Problems name variables only.
  assert.doesNotMatch(productionConfigProblems({ ...production, SUPABASE_URL: "https://private-host.example", NEXT_PUBLIC_EXTRA: "sb_secret_hidden" }).join(), /private-host|hidden/);
  // Defaults: nothing paid or destructive is open with an empty environment.
  assert.ok(closedGates({}, CollectionConfig.parse({})).includes("COLLECTION_PAID_EXECUTION_not_true"));
});

test("proxy answers 503 in production while misconfigured, without network or leaking values", async () => {
  for (const override of [{ APPRADAR_DEMO_MODE: "true" }, { SUPABASE_URL: `https://${DEV_REF}.supabase.co` }, { NEXT_PUBLIC_SITE_URL: "" }]) {
    Object.assign(process.env, production, override);
    for (const path of ["/", "/en", "/login", "/dashboard", "/auth/callback?code=x"]) {
      const response = await visit(path);
      assert.equal(response.status, 503, path);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.equal(await response.text(), "Service unavailable");
    }
    assert.equal((await visit("/admin")).status, 404);
    Object.assign(process.env, production, { APPRADAR_DEMO_MODE: "false" });
  }
  assert.equal(calls.length, 0);
  assert.ok(logs.length && logs.every(line => line.startsWith("appradar_config_invalid:") && !line.includes("fixture") && !line.includes(DEV_REF)));
  const response = await visit("/dashboard");
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), `${SITE}/login?next=%2Fdashboard`);
});

test("forged, garbage and anonymous-user sessions do not pass the protected routes", async () => {
  const real = await signedToken(), other = await signedToken();
  const [head, body] = real.token.split(".");
  const forged = `${head}.${body}.${other.token.split(".")[2]}`;
  const anonymous = await signedToken({ is_anonymous: true });
  for (const [cookie, jwks] of [
    [sessionCookie(forged), real.jwks], [sessionCookie("not-a-jwt"), undefined], ["base64-%%%garbage", undefined], [sessionCookie(anonymous.token), anonymous.jwks],
  ] as const) {
    reply = url => url.pathname.endsWith("jwks.json") ? jwks : { status: 401, body: { code: "bad_jwt", message: "invalid" } };
    const response = await visit("/watchlist", cookie);
    assert.equal(response.status, 307, cookie.slice(0, 30));
    assert.match(response.headers.get("location")!, /\/login\?next=%2Fwatchlist$/);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});

test("a revoked session with a still-valid token is cleared instead of looping between login and dashboard", async () => {
  const { token, jwks } = await signedToken();
  reply = url => url.pathname.endsWith("jwks.json") ? jwks : url.pathname === "/auth/v1/user" ? { status: 403, body: { code: "session_not_found", error_code: "session_not_found", msg: "gone" } } : undefined;
  const response = await visit("/login", sessionCookie(token));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.cookies.get(COOKIE)?.value, "");
  assert.match(response.headers.get("Cache-Control")!, /private.*no-store/);
});

test("expired sessions are refreshed and persisted on public pages too, in a private response", async () => {
  const { token, jwks } = await signedToken();
  for (const path of ["/en", "/tr", "/forgot-password"]) {
    calls.length = 0;
    reply = url => url.pathname === "/auth/v1/token" ? { body: { access_token: token, refresh_token: "rotated", token_type: "bearer", expires_in: 3600, user: user() } }
      : url.pathname.endsWith("jwks.json") ? jwks : undefined;
    const response = await visit(path, sessionCookie(token, -60));
    assert.ok(calls.some(call => call.url.pathname === "/auth/v1/token"), path);
    assert.ok(response.cookies.get(COOKIE)?.value, path);
    assert.equal(response.cookies.get(COOKIE)?.httpOnly, true);
    assert.equal(response.cookies.get(COOKIE)?.sameSite, "lax");
    assert.match(response.headers.get("Cache-Control")!, /private.*no-store/);
  }
  calls.length = 0;
  await visit("/en");
  assert.equal(calls.length, 0, "visitors without a session cause no auth traffic");
});

test("server guards verify the user: unauthenticated and anonymous-user requests are redirected", async () => {
  const { getViewer } = await import("../src/lib/auth/server.ts");
  const { updateWatchlist } = await import("../src/lib/watchlist/actions.ts");
  const { GET } = await import("../src/app/compare/add/route.ts");
  const toLogin = { digest: /^NEXT_REDIRECT;replace;\/login/ };
  const data = () => form({ intent: "remove", appId: "de000000-0000-4000-8000-000000000001", country: "US", language: "en" });
  await assert.rejects(updateWatchlist({ status: "idle" }, data()), toLogin);
  await assert.rejects(GET(new NextRequest(`${SITE}/compare/add?app=x`)), toLogin);
  assert.equal(calls.length, 0);
  jar.set(COOKIE, sessionCookie(jwt({ sub: user().id, exp: 9999999999 })));
  reply = () => ({ body: user({ is_anonymous: true }) });
  assert.equal((await getViewer()).kind, "anonymous");
  await assert.rejects(updateWatchlist({ status: "idle" }, data()), toLogin);
  reply = () => ({ status: 401, body: { code: "bad_jwt", msg: "forged" } });
  assert.equal((await getViewer()).kind, "anonymous");
  assert.ok(calls.every(call => call.url.pathname === "/auth/v1/user"), "no data request is made for a rejected session");
});

test("auth callback only redirects to the configured origin and allowlisted paths", async () => {
  const { GET } = await import("../src/app/auth/callback/route.ts");
  reply = url => url.pathname === "/auth/v1/verify" ? { body: { access_token: jwt({ sub: user().id }), refresh_token: "r", token_type: "bearer", expires_in: 3600, user: user() } } : undefined;
  for (const next of ["https://evil.example/x", "//evil.example", "/\\evil.example", "/dashboard/..//evil.example", "/%2F%2Fevil.example"]) {
    // The request host is attacker-chosen; the redirect must still use NEXT_PUBLIC_SITE_URL.
    const response = await GET(new NextRequest(`https://evil.example/auth/callback?token_hash=h&type=email&next=${encodeURIComponent(next)}`));
    assert.equal(response.headers.get("location"), `${SITE}/dashboard`, next);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
  const recovery = await GET(new NextRequest(`${SITE}/auth/callback?token_hash=h&type=recovery&next=/explore`));
  assert.equal(recovery.headers.get("location"), `${SITE}/reset-password`);
  const failed = await GET(new NextRequest(`${SITE}/auth/callback?error=x&error_description=${encodeURIComponent("<script>secret</script>")}`));
  assert.equal(failed.headers.get("location"), `${SITE}/login?error=callback_failed&next=%2Fdashboard`);
});

test("password reset and sign-up answers do not reveal whether an address exists", async () => {
  const { requestPasswordReset, signUpWithPassword } = await import("../src/lib/auth/actions.ts");
  const reset = () => requestPasswordReset({ status: "idle" }, form({ email: "someone@example.com" }));
  const signUp = () => signUpWithPassword({ status: "idle" }, form({ email: "someone@example.com", password: "long-enough", confirmPassword: "long-enough" }));
  for (const submit of [reset, signUp]) {
    reply = () => ({ body: {} });
    const unknown = await submit();
    // GoTrue returns this only after it tried to mail an existing address.
    reply = () => ({ status: 429, body: { error_code: "over_email_send_rate_limit", code: "over_email_send_rate_limit", msg: "private provider text" } });
    assert.deepEqual(await submit(), unknown);
    assert.equal(unknown.status, "success");
  }
  reply = () => ({ status: 429, body: { error_code: "over_request_rate_limit", code: "over_request_rate_limit", msg: "private provider text" } });
  assert.equal((await reset()).message, "Too many attempts. Wait a moment and try again.");
  reply = () => ({ status: 400, body: { error_code: "unexpected_failure", code: "unexpected_failure", msg: "relation private.users token=abc" } });
  assert.equal((await signUp()).message, "Something went wrong. Please try again.");
  assert.ok(logs.length && logs.every(line => /^appradar_auth_failed:[a-z_]+:[a-z0-9_]+$/.test(line)), logs.join("\n"));
});

test("updating the password revokes other sessions; OAuth must stay on the configured Supabase origin", async () => {
  const { updatePassword } = await import("../src/lib/auth/actions.ts");
  jar.set(COOKIE, sessionCookie(jwt({ sub: user().id, exp: 9999999999 })));
  reply = url => url.pathname === "/auth/v1/user" ? { body: user() } : url.pathname === "/auth/v1/logout" ? { body: {} } : undefined;
  await assert.rejects(updatePassword({ status: "idle" }, form({ password: "new-password", confirmPassword: "new-password" })), { digest: /\/account\?message=password_updated/ });
  assert.equal(calls.find(call => call.url.pathname === "/auth/v1/logout")?.url.searchParams.get("scope"), "others");
  assert.ok(jar.has(COOKIE), "the current session stays");
  const source = await readFile(new URL("../src/lib/auth/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /result\.url\.startsWith/);
});

test("sign-out clears the session cookie even when Supabase cannot be reached", async () => {
  const { signOut } = await import("../src/lib/auth/actions.ts");
  jar.set(COOKIE, sessionCookie(jwt({ sub: user().id, exp: 9999999999 })));
  await assert.rejects(signOut(), { digest: /\/login\?message=signed_out/ });
  assert.ok(!jar.has(COOKIE));
});

test("read failures log a code only", async () => {
  Object.assign(process.env, { NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" });
  const { readResult } = await import("../src/lib/ui/catalog.server.ts");
  const result = await readResult(async () => { throw Object.assign(new Error("https://x.supabase.co key=sb_secret_abc"), { code: "read_rejected_42501" }); });
  const odd = await readResult(async () => { throw Object.assign(new Error("m"), { code: "has secret text" }); });
  assert.deepEqual(logs, ["appradar_read_failed:read_rejected_42501", "appradar_read_failed:unknown"]);
  assert.doesNotMatch(JSON.stringify([result, odd]), /sb_secret|supabase\.co|42501/);
});

test("security headers cover every route; HSTS and strict script rules outside development", async () => {
  const rules = await config.headers!();
  assert.deepEqual(rules.map(rule => rule.source), ["/:path*"]);
  assert.equal(config.poweredByHeader, false);
  const live = new Map(securityHeaders(false).map(h => [h.key, h.value]));
  assert.equal(live.get("X-Frame-Options"), "DENY");
  assert.equal(live.get("X-Content-Type-Options"), "nosniff");
  assert.equal(live.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(live.get("Strict-Transport-Security")!, /max-age=31536000/);
  const csp = live.get("Content-Security-Policy")!;
  for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "connect-src 'self';"]) assert.ok(csp.includes(directive), directive);
  assert.doesNotMatch(csp, /unsafe-eval|ws:/);
  assert.ok(!securityHeaders(true).some(h => h.key === "Strict-Transport-Security"));
});

test("client components never import service-role or session modules", async () => {
  const root = new URL("../src/", import.meta.url);
  for (const name of (await readdir(root, { recursive: true })).filter(n => /\.tsx?$/.test(n))) {
    const source = await readFile(new URL(name, root), "utf8");
    if (!/^(?:\/\/.*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(source)) continue;
    const imports = [...source.matchAll(/^import (?!type )[^;]*?from ["']([^"']+)["']/gm)].map(m => m[1]!);
    assert.deepEqual(imports.filter(i => /(read\/(client|index)|persistence\/|auth\/(server|config)|watchlist\/server|ui\/catalog\.server|collection\/|retention\/)/.test(i)), [], name);
  }
});

test("existing request bounds stay in place", async () => {
  assert.equal(MAX_PAGE_SIZE, 100);
  const client = {} as ReadClient;
  await assert.rejects(exploreApps({ pageSize: 101 }, client), { code: "invalid_input" });
  await assert.rejects(exploreApps({ page: 1000, pageSize: 100 }, client), { code: "page_out_of_range" });
  assert.throws(() => parsePage({ page: "1252" }));
  assert.throws(() => parseExplorer({ q: "a".repeat(101) }));
  assert.deepEqual(parseCompareIds(Array.from({ length: 4 }, (_, i) => `de000000-0000-4000-8000-00000000000${i}`).join(",")), { ok: false, error: "too_many" });
});
