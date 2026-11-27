# Content usage scopes (internal pilot vs public display)

This document separates **technical capability** from **usage rights**. Owner product approval and in-app attribution are **not** third-party licences. Paying Apify or enabling a flag does not confirm redistribution rights.

Nothing in this file enables collection, retention or media display. Default flags remain closed.

## Authorization statuses

| Status (`APPRADAR_THIRD_PARTY_RIGHTS_STATUS`) | Meaning | Paid collection path |
|---|---|---|
| **verified** | Documented third-party storage/use basis exists for the intended provider **and** store | Requires `POC_DATA_USE_CONFIRMED=true` |
| **unconfirmed** | No verified third-party basis; outstanding legal uncertainty accepted as risk | Internal pilot only: operator approval **and** separate unconfirmed-risk acceptance; pilot bounds enforced |
| **prohibited** | Applicable contractual or legal prohibition recorded | **Always blocked** |
| *(missing)* | Status not set | **Always blocked** |

`POC_DATA_USE_CONFIRMED=true` is valid **only** with `APPRADAR_THIRD_PARTY_RIGHTS_STATUS=verified`. Setting it under `unconfirmed` or `prohibited` is rejected — it must never represent owner approval as verified permission.

## Scopes

| Scope | Meaning | Gate |
|---|---|---|
| **Internal pilot operator approval** | Owner/operator product decision to run a bounded development pilot | `APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL=true` (not a licence) |
| **Unconfirmed-risk acceptance** | Separate explicit decision to proceed while third-party rights remain unconfirmed | `APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED=true` |
| **Verified third-party usage rights** | Evidence-backed storage/use basis | `APPRADAR_THIRD_PARTY_RIGHTS_STATUS=verified` + `POC_DATA_USE_CONFIRMED=true` |
| **Internal development media display** | Showing icons/screenshots to operators on development hosts only | `NODE_ENV=development` + `APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL` + `APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED` + kind flags (`APPRADAR_STORE_ICONS_ENABLED` / `APPRADAR_STORE_SCREENSHOTS_ENABLED`). Not a third-party licence. Provider eligibility, URL allowlist, expiry and suppression still apply. Distinct from collection pilot approval. |
| **Public commercial data & media** | End-user product with shared catalog and media | `APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED` (default closed; production web fail-closed) **plus** kind flags, production project, legal review, Terms publication, and recorded basis for **public storage and display** per provider **and** store. Do not reuse development confirmation alone. Kind flags alone never open production media. |

Paid execution still requires `APIFY_COLLECTION_ENABLED`, `COLLECTION_PAID_EXECUTION`, token, budget caps and configured `retentionDays`.

## Unconfirmed rights — known risks (B4.3 / B4.4)

While status is `unconfirmed`, the following remain unresolved and are **not** cured by operator approval, attribution or API payment:

- App Store / Google Play terms may restrict scraping, bulk storage or redistribution of listing content.
- Apify Actor terms assign third-party IP compliance to the user; Actor payment is not a store licence.
- No recorded provider+store storage or display permission exists in this repository (`APPRADAR.md` §6.22 / §6.26 / §6.27).
- Metrics and listing text persisted to the development database are still **storage**, even when public media/description flags stay off.
- B4.3 pilot stored 6 listings / icons / screenshot URLs under unconfirmed rights; public display stayed closed. B4.4 may enable **development-only** internal media with explicit operator approval + unconfirmed-risk acceptance; that path is not public commercial authorization and must not be written as permanent env.
- B4.5 Productivity pilot (PARTIAL) expanded storage under the same unconfirmed status: 113 apps/listings; charts 50/50; DataTrail overfetch 24→10 persist (`coverage=partial`); Play details 45/50. Discovery vs detail `observation_role` must not be conflated. Description/review display remain disabled; description may still be **stored** from detail runs.
- Ranking history remains largely unavailable (single chart observation per series). Missing Play detail IDs stay chart-visible with discovery-only fields.

An explicit applicable contractual **prohibition** must be recorded as `prohibited` and keeps collection and media scopes closed.

Aurelix `description` may be **stored** when normalized; public release still requires `APPRADAR_STORE_DESCRIPTION_ENABLED` plus a recorded display basis. Do not treat storage as display authorization.

## Production catalog display (27 November 2026)

A production build never reads the third-party catalog, whatever the flags say (`src/lib/read/display-policy.ts`), and production configuration refuses to serve with any content flag on. Collection writes are limited to the declared development project. Neither is a rights approval.

## Internal pilot bounds (unconfirmed path only)

Enforced in code when rights are `unconfirmed` (not a generic bypass). Scope is selected with `APPRADAR_INTERNAL_PILOT_SCOPE` (`b43-details` default when unset; `b45-productivity` for the Productivity market pilot).

### B4.3 details (`b43-details`)

- Development operator shell only; production flags for pilot approval/risk/public display must stay false.
- Existing pinned Aurelix details build only; config shaped like `.poc/b43-pilot.config.json`.
- ≤6 app listings, ≤2 Actor targets/starts, `$0.05` per-run cap, `$0.10` planned ceiling.
- Budgets `$1` / `$5`; `retentionDays: 30`; `maxAttempts: 1`; `schedulingEnabled: false`.
- Requires `APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL` + `APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED`.
- No reviewer personal information; no image binary storage; no public data/media display flags.

### B4.5 Productivity (`b45-productivity`)

Expanded provider/store collection for US/en Productivity. **Does not widen B4.3 bounds.** Requires the B4.3 approval pair **and** separate:

- `APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL=true`
- `APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED=true`

Allowed schedules only (discovery-only, details-only, or full):

| Step | Provider / mode | Requested | Hard accept/persist |
|---|---|---|---|
| 1 | Aurelix iOS charts topFree `6007` | 50 | ≤50 chart entries |
| 2 | Subimpact Play charts topFree `PRODUCTIVITY` | 50 | ≤50 chart entries |
| 3 | DataTrail iOS newFreeApps `6007` | 10 | ≤10 entries (overfetch discarded) |
| 4–5 | Aurelix details iOS + Play | deduped IDs | ≤50 IDs/store, ≤100 total; chart IDs first |

- ≤5 Actor starts; `$0.05` per-run cap; planned reservation ceiling **$0.25**.
- `maxAttempts: 1`; `retentionDays: 30`; `schedulingEnabled: false`.
- `POC_DATA_USE_CONFIRMED` stays false; public commercial display stays closed.
- Known unconfirmed restrictions still apply per provider/store (see risks above). `prohibited` remains blocking.
- Config: gitignored `.poc/b45-discovery.config.json` then `.poc/b45-details.config.json` after ID validation.

## Approved pilot technical scope (B4 budget, unchanged)

- Markets: US; iOS and Google Play; language `en`.
- Budget: $1/day, $5/month, $0.05 per-run cap.
- Technical listing expiry: 30 days.
- `schedulingEnabled`: false.

Budget/scope approval is **not** verified commercial or public display approval.

## Media controls

- Independent kind flags: `APPRADAR_STORE_ICONS_ENABLED`, `APPRADAR_STORE_SCREENSHOTS_ENABLED` (legacy `APPRADAR_STORE_MEDIA_ENABLED` ignored).
- Kind flags require a **scope**: internal media authorization (development) or `APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED`.
- Description / review text flags unchanged and stay off for B4.4 validation.
- HTTPS store/CDN allowlist only; no image binary storage.
- App-level suppression via `apps.icons_suppressed_at` / `apps.screenshots_suppressed_at` (`appradar_set_media_suppression`, service_role).
- `prohibited` third-party status blocks media scopes.

## Reviewer privacy

Normalization, persistence and public review responses exclude reviewer usernames and profile images. Do not reintroduce those fields.
