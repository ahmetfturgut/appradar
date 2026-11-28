import assert from "node:assert/strict";
import { test } from "node:test";
import { supabaseApiKeyHeaders } from "../src/lib/auth/api-headers.ts";
import { supabaseRpc } from "../src/lib/persistence/rpc.ts";
import { createReadClient } from "../src/lib/read/client.ts";

const URL = "https://synthetic-project.supabase.co";
const legacyServiceRole = `x.${Buffer.from(JSON.stringify({ role: "service_role", ref: "synthetic-project" })).toString("base64url")}.synthetic-signature`;

async function directClientHeaders(key: string) {
  const seen: Headers[] = [];
  const fetcher: typeof fetch = async (_input, init) => {
    seen.push(new Headers(init?.headers));
    return new Response("[]", { headers: { "content-type": "application/json" } });
  };
  await createReadClient({ url: URL, serviceRoleKey: key }, fetcher).select("apps", {});
  await supabaseRpc({ url: URL, serviceRoleKey: key }, fetcher)("appradar_fixture", {});
  return seen;
}

test("new Supabase API keys use apikey without an API-key Bearer header", async () => {
  for (const key of ["sb_secret_synthetic", "sb_publishable_synthetic"]) {
    assert.deepEqual(supabaseApiKeyHeaders(key), { apikey: key });
    for (const headers of await directClientHeaders(key)) {
      assert.equal(headers.get("apikey"), key);
      assert.equal(headers.get("authorization"), null);
    }
  }
});

test("legacy service-role JWTs preserve apikey and Bearer authentication", async () => {
  assert.deepEqual(supabaseApiKeyHeaders(legacyServiceRole), {
    apikey: legacyServiceRole,
    Authorization: `Bearer ${legacyServiceRole}`,
  });
  for (const headers of await directClientHeaders(legacyServiceRole)) {
    assert.equal(headers.get("apikey"), legacyServiceRole);
    assert.equal(headers.get("authorization"), `Bearer ${legacyServiceRole}`);
  }
});
