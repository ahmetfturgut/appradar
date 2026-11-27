import assert from "node:assert/strict";
import { test } from "node:test";
import {
  b45ProductivityPilotBoundViolations,
  dataUseAuthorizationClosed,
  internalPilotBoundViolations,
  publicCommercialDisplayAuthorized,
  thirdPartyRightsStatus,
} from "../src/lib/collection/authorization.ts";
import { closedGates, CollectionConfig } from "../src/lib/collection/config.ts";
import { PRODUCTION_DISABLED_FLAGS, productionConfigProblems } from "../src/lib/config/production.ts";

/** Mirrors `.poc/b43-pilot.config.json` bounds (gitignored); keep in sync for the unconfirmed path. */
const pilot = CollectionConfig.parse({
  schedulingEnabled: false,
  retentionDays: 30,
  maxAttempts: 1,
  schedules: [{
    provider: "aurelix", mode: "details", everyMinutes: 10080, enabled: false,
    targets: [
      { store: "ios", country: "US", language: "en", appIds: ["1232780281", "572688855", "6448311069"] },
      { store: "play", country: "US", language: "en", appIds: ["notion.id", "com.todoist", "com.openai.chatgpt"] },
    ],
  }],
});
/** Mirrors `.poc/b45-discovery.config.json` (gitignored). */
const b45Discovery = CollectionConfig.parse({
  schedulingEnabled: false,
  retentionDays: 30,
  maxAttempts: 1,
  schedules: [
    { provider: "aurelix", mode: "charts", everyMinutes: 1440, enabled: false,
      targets: [{ store: "ios", country: "US", language: "en", chart: "topFree", category: "6007", maxResults: 50 }] },
    { provider: "subimpact", mode: "charts", everyMinutes: 1440, enabled: false,
      targets: [{ store: "play", country: "US", language: "en", chart: "topFree", category: "PRODUCTIVITY", maxResults: 50 }] },
    { provider: "datatrail", mode: "charts", everyMinutes: 1440, enabled: false,
      targets: [{ store: "ios", country: "US", language: "en", chart: "newFreeApps", category: "6007", maxResults: 10 }] },
  ],
});
const openPilotEnv = {
  COLLECTION_PAID_EXECUTION: "true",
  APIFY_COLLECTION_ENABLED: "true",
  APIFY_TOKEN: "t",
  DAILY_LIMIT_USD: "1",
  MONTHLY_LIMIT_USD: "5",
  APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "unconfirmed",
  APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL: "true",
  APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED: "true",
};
const openB45Env = {
  ...openPilotEnv,
  APPRADAR_INTERNAL_PILOT_SCOPE: "b45-productivity",
  APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL: "true",
  APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED: "true",
};

test("rights status is explicit and fail-closed when missing", () => {
  assert.equal(thirdPartyRightsStatus({}), null);
  assert.equal(thirdPartyRightsStatus({ APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "verified" }), "verified");
  assert.equal(thirdPartyRightsStatus({ APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "unconfirmed" }), "unconfirmed");
  assert.equal(thirdPartyRightsStatus({ APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "prohibited" }), "prohibited");
  assert.equal(thirdPartyRightsStatus({ APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "yes" }), null);
  assert.equal(publicCommercialDisplayAuthorized({}), false);
  assert.equal(publicCommercialDisplayAuthorized({ APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED: "true" }), true);
});

test("prohibited third-party usage always blocks", () => {
  const reasons = dataUseAuthorizationClosed({
    ...openPilotEnv,
    APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "prohibited",
    POC_DATA_USE_CONFIRMED: "true",
  }, pilot);
  assert.deepEqual(reasons, ["third_party_rights_prohibited"]);
  assert.ok(closedGates({ ...openPilotEnv, APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "prohibited" }, pilot).includes("third_party_rights_prohibited"));
});

test("POC_DATA_USE_CONFIRMED cannot falsely claim verified rights", () => {
  assert.ok(dataUseAuthorizationClosed({
    POC_DATA_USE_CONFIRMED: "true",
    APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "unconfirmed",
  }, pilot).includes("POC_DATA_USE_CONFIRMED_requires_verified_rights"));
  assert.ok(dataUseAuthorizationClosed({
    POC_DATA_USE_CONFIRMED: "true",
  }, pilot).includes("POC_DATA_USE_CONFIRMED_requires_verified_rights"));
  assert.deepEqual(dataUseAuthorizationClosed({
    APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "verified",
    POC_DATA_USE_CONFIRMED: "true",
  }, pilot), []);
  assert.deepEqual(dataUseAuthorizationClosed({
    APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "verified",
  }, pilot), ["POC_DATA_USE_CONFIRMED_not_true"]);
});

test("unconfirmed internal pilot needs operator approval, risk acceptance and bounds", () => {
  assert.deepEqual(dataUseAuthorizationClosed(openPilotEnv, pilot), []);
  assert.deepEqual(closedGates(openPilotEnv, pilot), []);
  assert.ok(dataUseAuthorizationClosed({
    ...openPilotEnv,
    APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL: "false",
  }, pilot).includes("INTERNAL_PILOT_OPERATOR_APPROVAL_not_true"));
  assert.ok(dataUseAuthorizationClosed({
    ...openPilotEnv,
    APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED: undefined,
  }, pilot).includes("INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED_not_true"));
  const wide = CollectionConfig.parse({
    ...pilot,
    schedulingEnabled: true,
    maxAttempts: 2,
    schedules: [
      { provider: "subimpact", mode: "search", everyMinutes: 1440, enabled: false,
        targets: [{ store: "play", country: "US", term: "todo", maxResults: 20 }] },
    ],
  });
  const bounds = internalPilotBoundViolations(wide);
  assert.ok(bounds.includes("internal_pilot_scheduling_forbidden"));
  assert.ok(bounds.includes("internal_pilot_retries_forbidden"));
  assert.ok(bounds.includes("internal_pilot_aurelix_details_only"));
  assert.ok(closedGates(openPilotEnv, wide).some(r => r.startsWith("internal_pilot_")));
});

test("operator approval alone does not open paid collection", () => {
  assert.ok(closedGates({
    APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "unconfirmed",
    APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL: "true",
  }, pilot).includes("COLLECTION_PAID_EXECUTION_not_true"));
  assert.ok(closedGates({
    ...openPilotEnv,
    COLLECTION_PAID_EXECUTION: "false",
  }, pilot).includes("COLLECTION_PAID_EXECUTION_not_true"));
});

test("B4.5 Productivity scope needs separate approvals and does not widen B4.3", () => {
  assert.deepEqual(b45ProductivityPilotBoundViolations(b45Discovery), []);
  assert.deepEqual(dataUseAuthorizationClosed(openB45Env, b45Discovery), []);
  assert.deepEqual(closedGates(openB45Env, b45Discovery), []);
  // B4.3 approvals alone cannot open a B4.5 discovery config.
  assert.ok(dataUseAuthorizationClosed(openPilotEnv, b45Discovery).some(r => r.startsWith("internal_pilot_")));
  assert.ok(dataUseAuthorizationClosed({
    ...openPilotEnv,
    APPRADAR_INTERNAL_PILOT_SCOPE: "b45-productivity",
  }, b45Discovery).includes("INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL_not_true"));
  assert.ok(dataUseAuthorizationClosed({
    ...openB45Env,
    APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED: "false",
  }, b45Discovery).includes("INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED_not_true"));
  // A B4.3-sized details config may pass as B4.5 details-only; discovery still cannot use the B4.3 path.
  assert.deepEqual(dataUseAuthorizationClosed(openB45Env, pilot), []);
  assert.ok(internalPilotBoundViolations(b45Discovery).includes("internal_pilot_aurelix_details_only"));
  assert.ok(closedGates(openPilotEnv, b45Discovery).some(r => r.startsWith("internal_pilot_")));
});

test("production keeps internal pilot and public commercial display fail-closed", () => {
  for (const flag of [
    "APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED",
    "APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED",
    "APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED",
    "APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED",
    "POC_DATA_USE_CONFIRMED",
  ]) {
    assert.ok(PRODUCTION_DISABLED_FLAGS.includes(flag as typeof PRODUCTION_DISABLED_FLAGS[number]));
  }
  const production = {
    NODE_ENV: "production",
    APPRADAR_SUPABASE_PROJECT_REF: "abcdefghijklmnop",
    SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    NEXT_PUBLIC_SITE_URL: "https://app.example.com",
  };
  assert.deepEqual(productionConfigProblems(production), []);
  for (const flag of [
    "APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED",
    "APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED",
    "APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL",
    "APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED",
    "APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED",
  ]) {
    assert.deepEqual(productionConfigProblems({ ...production, [flag]: "true" }), [`${flag}:must_be_false`]);
  }
});
