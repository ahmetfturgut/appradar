# Content usage scopes (internal pilot vs public display)

This document separates **technical capability** from **usage rights**. Owner product approval and in-app attribution are **not** third-party licences. Paying Apify or enabling a flag does not confirm redistribution rights.

Nothing in this file enables collection, retention or media display. Default flags remain `false`.

## Scopes

| Scope | Meaning | Gate |
|---|---|---|
| **Internal development collection** | Authorized dry-run / paid collection into the development project only | `POC_DATA_USE_CONFIRMED`, `APIFY_COLLECTION_ENABLED`, `COLLECTION_PAID_EXECUTION`, budget caps, recorded provider/store basis for **storage** |
| **Internal development media display** | Showing icons/screenshots to operators on development hosts | `APPRADAR_STORE_ICONS_ENABLED` / `APPRADAR_STORE_SCREENSHOTS_ENABLED` plus recorded basis for **internal display**; provider eligibility; app-level suppression still applies |
| **Public commercial data & media** | End-user product with shared catalog and media | Separate production project, legal review, Terms publication, and recorded basis for **public storage and display** per provider **and** store. Do not reuse development confirmation alone |

Each applicable scope needs an **explicit documented usage basis** before the corresponding gates are opened. Leave gates closed when the basis is missing.

## Approved pilot technical scope (B4, unchanged)

- Markets: US Productivity; iOS and Google Play.
- Charts: top 50; iOS new releases.
- Budget: $1/day, $5/month, $0.05 per-run cap.
- Technical listing expiry: 30 days.
- `schedulingEnabled`: false.

Budget/scope approval is **not** commercial or public display approval (`APPRADAR.md` §6.22).

## Media controls

- Independent flags: `APPRADAR_STORE_ICONS_ENABLED`, `APPRADAR_STORE_SCREENSHOTS_ENABLED` (legacy `APPRADAR_STORE_MEDIA_ENABLED` ignored).
- Description / review text flags unchanged.
- HTTPS store/CDN allowlist only; no image binary storage.
- App-level suppression via `apps.icons_suppressed_at` / `apps.screenshots_suppressed_at` (`appradar_set_media_suppression`, service_role).

## Reviewer privacy

Normalization, persistence and public review responses exclude reviewer usernames and profile images. Do not reintroduce those fields.
