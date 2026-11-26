# B5 beta launch preparation

Implementation is ready for isolated evaluation, **not public launch approval**. B4 permissions remain unconfirmed; no collection, external configuration, real account deletion or retention execution occurred in B5.

## Owner decisions required

- Operator / controller identity, any required business or address details, monitored support and privacy channels, responsible person and escalation process. No invented email or contact form is provided.
- Legal review of the English and Turkish drafts at `/en/privacy`, `/en/terms`, `/en/contact` and their `/tr/…` equivalents. Confirm legal bases, rights/request procedures, processing locations, transfers, governing law, dispute/liability/termination terms, effective date and version. These are unresolved decisions, not compliance claims.
- Actual hosting and email providers and regions; backup/log storage, access and erasure arrangements. Approve category- and provider-specific retention, including account, operational-log and backup periods. B4's technical 30-day pilot expiry is **not** approval of a legal retention policy.
- Record reviewed storage, display, derived-use and redistribution permissions/basis per provider **and store**. Paying Apify or offering a free beta does not establish these rights. Keep all data-use and paid-execution gates unchanged until separately authorized.

All legal/contact pages visibly say draft, show missing owner facts, have localized metadata and remain `noindex`. Footer links open the drafts. Removing draft status and approving publication are a later owner/legal-reviewed change; `noindex` is not access control.

## Authentication setup (manual, deferred)

Follow [AUTH_SETUP.md](AUTH_SETUP.md) and [PRODUCTION.md](PRODUCTION.md). Configure a separate production Supabase project and matching server/public project URLs and keys, a production HTTPS site origin and exact callback allowlist. Keep email confirmation on, anonymous sign-in off; set verification/recovery templates and custom SMTP with the required DNS records. Enable Google only if wanted and after approved public legal/contact pages exist. Configure Supabase Auth and host POST/Next-Action rate limits, including `/account`; no new rate limiter is introduced.

Before launch, authorize disposable test accounts and verify real sign-up, verification, password recovery, OAuth if enabled, session expiry, sign-out and two-user watchlist isolation. B5 tests are fully mocked; SMTP, OAuth, MFA and real deletion are **not verified**. Any future destructive test needs explicit authorization and a disposable account; never use an owner's normal account.

## Account deletion contract

- `/settings` verifies access and redirects to `/account`; obsolete local-browser watchlist settings no longer render. Account shows email, password change/recovery and sign-out.
- Deletion Server Action rejects development demo mode before any Auth request. It requires exact `DELETE`, an explicit acknowledgement and a password; every condition is checked server-side.
- The action checks the current cookie session directly with Auth `getUser()`, requires non-anonymous identity and confirmed email, then signs in **that verified email** with the supplied password in an isolated, nonpersistent server client. Returned identity must match. No form-supplied email/user ID/project is used. The original session is verified again; proof older than 60 seconds is rejected. No reusable reauthentication cookie or timestamp is trusted.
- Verified MFA accounts fail closed; the current UI has no MFA challenge flow. Google-only users are directed to existing password recovery to set a password **where supported**. Verify that route on the configured project before enabling Google for beta; if unavailable, owner-provided verified support is required. No fake support request is recorded.
- Admin credentials remain in a `server-only` module. Server and session project origins must match; key kinds and legacy key refs are checked. Only `auth.admin.deleteUser(currentUser.id, false)` is called. Existing migration `0010` cascades that user's watchlist. No catalog, provider, other-user or manual watchlist delete is issued; no new migration.
- On failed/lost deletion response, check only the same user once. Only success or explicit `user_not_found` confirms completion; unresolved results report uncertainty, never auto-replay deletion. A retained account's watchlist is not pre-deleted. Confirmed deletion signs out locally; cleanup failures cannot undo deletion. Temporary proof sessions are signed out even on rejection; network failures can defer server-side token revocation.
- Shared catalog and other accounts remain. Backups, infrastructure logs and independent browser state are not erased by the Auth API. Existing JWTs can remain cryptographically valid until expiry; application requests recheck `getUser()`, watchlist inserts require an existing Auth FK and reads return no deleted-user rows. Do not claim instant global token invalidation. See [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

## Remaining production gates

Owner/legal/contact approval; confirmed commercial data-use basis and approved real-data pilot; production project/environment and reviewed migration procedure; real Auth/SMTP validation; working support (including MFA/recovery exceptions); approved retention policy; host/Auth rate limiting; backups and restore rehearsal; deployment/header checks and monitoring. Reuse [PRODUCTION.md](PRODUCTION.md), without activating scheduling or cleanup as part of B5. No payment or subscription implementation is included.
