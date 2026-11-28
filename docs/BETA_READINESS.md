# B5 beta launch preparation

Implementation is ready for isolated evaluation, **not public launch approval**. B4 permissions remain unconfirmed; no collection, external configuration or retention execution occurred in B5. A later owner-reported development Auth check is recorded below and in [APPRADAR.md](../APPRADAR.md) §6.24; it does not approve launch.

## Owner decisions required

- Operator / controller identity, any required business or address details, monitored support and privacy channels, responsible person and escalation process. **Update 28 November 2026:** the owner supplied a public contact address, published as category-specific `mailto:` links (no form or backend) on `/…/contact`; the drafts describe AppRadar as developed and operated under the Nomind (nomind.tech) brand and set a minimum user age of 18. The brand is not the legal operator identity: that identity and any required address are **pending owner confirmation**. The owner visually approved the page designs; this is not legal approval. The pages remain drafts and `noindex`.
- Legal review of the English and Turkish drafts at `/en/privacy`, `/en/terms`, `/en/contact` and their `/tr/…` equivalents. Confirm legal bases, rights/request procedures, processing locations, transfers, governing law, dispute/liability/termination terms, effective date and version. These are unresolved decisions, not compliance claims.
- Actual hosting and email providers and regions; backup/log storage, access and erasure arrangements. Approve category- and provider-specific retention, including account, operational-log and backup periods. B4's technical 30-day pilot expiry is **not** approval of a legal retention policy.
- Record reviewed storage, display, derived-use and redistribution permissions/basis per provider **and store**. Paying Apify or offering a free beta does not establish these rights. Keep all data-use and paid-execution gates unchanged until separately authorized.

**Legal blockers still open (28 November 2026):** legal operator identity and any required address; legal review of both languages; legal bases; international transfer safeguards; confirmation of the production database region (the pooler endpoint suggests `eu-west-1`, Ireland; not independently verified) and other processing regions; retention periods; effective date, version and acceptance; presentation/enforcement of the 18+ requirement (the application has no age check); KVKK notice, VERBİS and application procedure; EU/UK representative assessment; governing law, disputes, liability and content notice procedures; store data usage rights; hosted verification of account deletion, sign-in settings and email delivery.

All legal/contact pages visibly say draft, list open items by group, have localized metadata and remain `noindex`. Footer links use plain labels with an adjacent draft notice. Removing draft status and approving publication are a later owner/legal-reviewed change; `noindex` is not access control.

## Authentication setup

Follow [AUTH_SETUP.md](AUTH_SETUP.md) and [PRODUCTION.md](PRODUCTION.md).

**B5 automated tests** (`tests/beta-readiness.test.ts` and related suites) remain **fully mocked** (intercepted HTTP and synthetic cookies). They cover deletion authorization edge cases without contacting Auth. They are not live SMTP, OAuth, MFA or production proofs.

**Owner-reported development Auth (27 November 2026):** after correcting `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` to the project origin (no `/rest/v1`), the owner manually verified on the **development** project with **default Supabase SMTP**: registration, email delivery and confirmation, login, Dashboard/Explorer access, session persistence, logout, protected-route redirects, password reset, and account deletion (happy path). No application code change was required.

**Still not verified:** Google OAuth; MFA; production SMTP or production Auth; deletion edge cases beyond that happy path; live two-user watchlist isolation. Any further destructive test needs explicit authorization and a disposable account; never use an owner's normal account.

For production, configure a separate Supabase project and matching server/public project URLs and keys, a production HTTPS site origin and exact callback allowlist. Keep email confirmation on, anonymous sign-in off; set verification/recovery templates and **custom** SMTP with the required DNS records. Enable Google only if wanted and after approved public legal/contact pages exist. Configure Supabase Auth and host POST/Next-Action rate limits, including `/account`; no new rate limiter is introduced.

## Account deletion contract

- `/settings` verifies access and redirects to `/account`; obsolete local-browser watchlist settings no longer render. Account shows email, password change/recovery and sign-out.
- Deletion Server Action rejects development demo mode before any Auth request. It requires exact `DELETE`, an explicit acknowledgement and a password; every condition is checked server-side.
- The action checks the current cookie session directly with Auth `getUser()`, requires non-anonymous identity and confirmed email, then signs in **that verified email** with the supplied password in an isolated, nonpersistent server client. Returned identity must match. No form-supplied email/user ID/project is used. The original session is verified again; proof older than 60 seconds is rejected. No reusable reauthentication cookie or timestamp is trusted.
- Verified MFA accounts fail closed; the current UI has no MFA challenge flow. Google-only users are directed to existing password recovery to set a password **where supported**. Verify that route on the configured project before enabling Google for beta; if unavailable, owner-provided verified support is required. No fake support request is recorded.
- Admin credentials remain in a `server-only` module. Server and session project origins must match (`SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` as project origins, not `/rest/v1`); key kinds and legacy key refs are checked. Only `auth.admin.deleteUser(currentUser.id, false)` is called. Existing migration `0010` cascades that user's watchlist. No catalog, provider, other-user or manual watchlist delete is issued; no new migration.
- On failed/lost deletion response, check only the same user once. Only success or explicit `user_not_found` confirms completion; unresolved results report uncertainty, never auto-replay deletion. A retained account's watchlist is not pre-deleted. Confirmed deletion signs out locally; cleanup failures cannot undo deletion. Temporary proof sessions are signed out even on rejection; network failures can defer server-side token revocation.
- Shared catalog and other accounts remain. Backups, infrastructure logs and independent browser state are not erased by the Auth API. Existing JWTs can remain cryptographically valid until expiry; application requests recheck `getUser()`, watchlist inserts require an existing Auth FK and reads return no deleted-user rows. Do not claim instant global token invalidation. See [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).
- **Evidence split:** mocked suite = authorization edge cases; owner development check = happy-path live deletion only. Do not equate them.

## Content / media (B4.2)

Icons and screenshots use independent flags, provider eligibility, HTTPS CDN allowlisting and app-level suppression. See [CONTENT_USAGE.md](CONTENT_USAGE.md). Flags stay `false` until a documented usage basis exists for the intended scope. Terms drafts mention third-party store content; they remain drafts.

**Development integration (27 Nov 2026):** migration `0013` applied (ledger 13/13); service_role-only suppression RPC verified with synthetic rollback; fixture/media suite + full regression green. No display or collection flags enabled. Production still needs reviewed `0013` apply and rights-approved live media verification before any flag enablement.

## Remaining production gates

Owner/legal/contact approval; confirmed commercial data-use basis and approved real-data pilot (separate internal vs public scopes); production project/environment and reviewed migration procedure including `0013` media suppression; production Auth with custom SMTP validation; working support (including MFA/recovery exceptions); approved retention policy; host/Auth rate limiting; backups and restore rehearsal; deployment/header checks and monitoring; two-user isolation on the live stack when authorized; first rights-approved live media field verification before enabling icon/screenshot flags. Reuse [PRODUCTION.md](PRODUCTION.md), without activating scheduling or cleanup as part of B5. No payment or subscription implementation is included.
