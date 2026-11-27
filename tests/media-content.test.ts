import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  internalMediaDisplayAuthorized, mediaDisplayAllowed, mediaEnabled, mediaScopeAuthorized,
  providerMediaEligible, storeIconsEnabled, storeScreenshotsEnabled,
} from "../src/lib/media/flags.ts";
import { safeMediaUrl, safeStoreListingUrl, validateStoreMediaUrl } from "../src/lib/media/urls.ts";
import { releaseScreenshotUrls } from "../src/lib/read/shared.ts";
import { getAppDetails } from "../src/lib/read/app-details.ts";
import type { ReadClient } from "../src/lib/read/client.ts";
import { toDetailsModel } from "../src/components/core/catalog-mapping.ts";

const env = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
  Object.assign(process.env, env);
});

const appId = "11111111-1111-4111-8111-111111111111";
const now = "2026-11-27T12:00:00.000Z";
const appleIcon = "https://is1-ssl.mzstatic.com/image/thumb/Purple/icon.png";
const playShot = "https://play-lh.googleusercontent.com/example-screenshot";

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, "NODE_ENV", { value, configurable: true, writable: true, enumerable: true });
}

function authorizeInternalMedia() {
  setNodeEnv("development");
  process.env.APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL = "true";
  process.env.APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED = "true";
  delete process.env.APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED;
  delete process.env.APPRADAR_THIRD_PARTY_RIGHTS_STATUS;
}

test("independent icon and screenshot flags default off; legacy media flag cannot enable display", () => {
  delete process.env.APPRADAR_STORE_ICONS_ENABLED;
  delete process.env.APPRADAR_STORE_SCREENSHOTS_ENABLED;
  process.env.APPRADAR_STORE_MEDIA_ENABLED = "true";
  authorizeInternalMedia();
  assert.equal(storeIconsEnabled(), false);
  assert.equal(storeScreenshotsEnabled(), false);
  assert.equal(mediaEnabled(), false);
  process.env.APPRADAR_STORE_ICONS_ENABLED = "true";
  process.env.APPRADAR_STORE_SCREENSHOTS_ENABLED = "false";
  assert.equal(storeIconsEnabled(), true);
  assert.equal(storeScreenshotsEnabled(), false);
});

test("kind flags require development internal media authorization or public commercial scope", () => {
  setNodeEnv("development");
  process.env.APPRADAR_STORE_ICONS_ENABLED = "true";
  process.env.APPRADAR_STORE_SCREENSHOTS_ENABLED = "true";
  delete process.env.APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL;
  delete process.env.APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED;
  delete process.env.APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED;
  assert.equal(internalMediaDisplayAuthorized(), false);
  assert.equal(storeIconsEnabled(), false);
  assert.equal(storeScreenshotsEnabled(), false);
  process.env.APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL = "true";
  assert.equal(storeIconsEnabled(), false);
  process.env.APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED = "true";
  assert.equal(storeIconsEnabled(), true);
  setNodeEnv("production");
  assert.equal(internalMediaDisplayAuthorized(), false);
  assert.equal(storeIconsEnabled(), false);
  process.env.APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED = "true";
  assert.equal(mediaScopeAuthorized(), true);
  assert.equal(storeIconsEnabled(), true);
  process.env.APPRADAR_THIRD_PARTY_RIGHTS_STATUS = "prohibited";
  assert.equal(storeIconsEnabled(), false);
});

test("provider eligibility allows aurelix/datatrail candidates and rejects subimpact and unknown", () => {
  assert.equal(providerMediaEligible("aurelix", "icons"), true);
  assert.equal(providerMediaEligible("datatrail", "screenshots"), true);
  assert.equal(providerMediaEligible("subimpact", "icons"), false);
  assert.equal(providerMediaEligible(null, "icons"), false);
  assert.equal(providerMediaEligible("unknown", "screenshots"), false);
  assert.equal(mediaDisplayAllowed({ kind: "icons", flagOn: true, providerSource: "aurelix", suppressed: true }), false);
  assert.equal(mediaDisplayAllowed({ kind: "icons", flagOn: true, providerSource: "aurelix", suppressed: false }), true);
});

test("media URL allowlist rejects http, credentials, untrusted hosts and javascript", () => {
  assert.equal(validateStoreMediaUrl(appleIcon), appleIcon);
  assert.equal(validateStoreMediaUrl(playShot), playShot);
  assert.equal(validateStoreMediaUrl("http://is1-ssl.mzstatic.com/x.png"), null);
  assert.equal(validateStoreMediaUrl("https://user:pass@is1-ssl.mzstatic.com/x.png"), null);
  assert.equal(validateStoreMediaUrl("https://evil.example/icon.png"), null);
  assert.equal(safeMediaUrl("javascript:alert(1)"), null);
  assert.equal(safeStoreListingUrl("https://apps.apple.com/app/id123"), "https://apps.apple.com/app/id123");
  assert.equal(safeStoreListingUrl("https://example.com/app"), null);
});

test("suppression and ineligible provenance withhold screenshots even when the flag is on", () => {
  authorizeInternalMedia();
  process.env.APPRADAR_STORE_SCREENSHOTS_ENABLED = "true";
  const row = {
    screenshot_urls: [playShot],
    field_provenance: { screenshot_urls: { source: "aurelix", role: "detail", observedAt: now } },
  };
  assert.deepEqual(releaseScreenshotUrls(row, {}), [playShot]);
  assert.equal(releaseScreenshotUrls(row, { screenshots_suppressed_at: now }), null);
  assert.equal(releaseScreenshotUrls({
    screenshot_urls: [playShot],
    field_provenance: { screenshot_urls: { source: "subimpact" } },
  }, {}), null);
});

test("public read path keeps icons and screenshots off by default and never trusts the legacy flag", async () => {
  process.env.APPRADAR_STORE_MEDIA_ENABLED = "true";
  delete process.env.APPRADAR_STORE_ICONS_ENABLED;
  delete process.env.APPRADAR_STORE_SCREENSHOTS_ENABLED;
  const client: ReadClient = {
    now: () => now,
    count: async () => 0,
    select: async (table, query) => {
      if (table === "apps") {
        return { rows: [{ id: appId, store: "ios", store_app_id: "123", canonical_url: "https://apps.apple.com/app/id123", developer_id: null, first_seen_at: now, last_seen_at: now }], total: null };
      }
      if (table === "app_listings") {
        assert.doesNotMatch(String(query.select), /screenshot_urls/);
        return { rows: [{
          id: 1, app_id: appId, store: "ios", country: "US", requested_language: "en", effective_language: "en",
          name: "Probe", developer_name: "Dev", category_name: "Productivity", version: null,
          released_at: null, released_at_precision: null, store_updated_at: null, store_updated_at_precision: null,
          price_amount: null, currency: null, is_free: true, rating_value: null, rating_count: null, review_count: null,
          installs_text: null, installs_lower_bound: null, icon_url: appleIcon, first_seen_at: now, last_observed_at: now,
          screenshot_urls: [playShot],
          field_provenance: {
            icon_url: { source: "aurelix", role: "detail", observedAt: now },
            screenshot_urls: { source: "aurelix", role: "detail", observedAt: now },
          },
          apps: { store_app_id: "123", canonical_url: "https://apps.apple.com/app/id123", developer_id: null, icons_suppressed_at: null, screenshots_suppressed_at: null },
        }], total: null };
      }
      return { rows: [], total: null };
    },
    rpc: async () => { throw new Error("unexpected rpc"); },
  };
  const result = await getAppDetails({ appId, country: "US", language: "en", relatedLimit: 0 }, client);
  assert.ok(result);
  assert.equal(result.media.iconsEnabled, false);
  assert.equal(result.media.screenshotsEnabled, false);
  assert.equal(result.listing?.iconUrl, null);
  assert.equal(result.listing?.screenshotUrls, null);
  const model = toDetailsModel(result)!;
  assert.equal(model.iconsEnabled, false);
  assert.equal(model.screenshots, null);
  assert.equal(model.storeListingUrl, "https://apps.apple.com/app/id123");
  assert.equal(model.contentReportHref, "/en/contact");
});
