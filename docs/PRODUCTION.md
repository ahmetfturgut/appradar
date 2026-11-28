# AppRadar production runbook

**Private deployment (Option A) completed 28 November 2026** — owner testing only. Public launch is **not** approved. Live values: production URL `https://appradar-sigma.vercel.app`; source commit `99b75316ab3999ab7617355cdd68ae0331a97176`; production Supabase ref `ppngqbaisoroxfyybpix`. Catalog display, public signup, indexing and collection remain closed. Plan features, prices, limits, commercial-use terms and exact dashboard labels were not fully verified; check them before relying on them. Paid hosting options need explicit approval and were not activated.

## 1. Environments

| | Development | Production |
|---|---|---|
| Supabase project | existing development project | a new, separate project |
| Values live in | `.env.local` (git-ignored) | hosting provider, Production scope only |
| `APPRADAR_DEMO_MODE` | optional | unset or `false` |

Never copy `.env.local` to the host, and never reuse development keys, database passwords or SMTP credentials.

## 2. Create the production Supabase project

1. New project, region close to the web hosting region. Generate a new database password and keep it in a password manager.
2. Record the project ref (`<ref>` in `https://<ref>.supabase.co`) and confirm it differs from the development ref.
3. API settings: exposed schemas must **not** include `private` or `appradar_meta`.
4. Enable MFA on the Supabase, hosting, Google and SMTP accounts.

## 3. Environment variables

Required. In production the app answers **503** until all are present and consistent:

| Variable | Value | Visibility |
|---|---|---|
| `APPRADAR_SUPABASE_PROJECT_REF` | production project ref | server |
| `SUPABASE_URL` | `https://<ref>.supabase.co` (project **origin only**; no `/rest/v1`) | server |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (or legacy `service_role`) | **server secret** |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` (same origin; no `/rest/v1`) | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (or legacy `anon`) | public |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain`, origin only | public |

`SUPABASE_SERVICE_ROLE_KEY` is the existing application variable name and remains unchanged when
using a new `sb_secret_…` key. Direct Data API requests send new publishable/secret keys only in
the `apikey` header; legacy JWT keys retain the existing `Authorization: Bearer` fallback. This
compatibility is covered by synthetic tests, but remains unverified against the hosted production
project until the post-deployment smoke tests are completed.

Unset or exactly `false` (anything else is also a 503): `APPRADAR_DEMO_MODE`, `COLLECTION_PAID_EXECUTION`, `APIFY_COLLECTION_ENABLED`, `POC_DATA_USE_CONFIRMED`, `RETENTION_CLEANUP_EXECUTION`, `APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL`, `APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED`, `APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL`, `APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED`, `APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL`, `APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED`, `APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED`, `APPRADAR_STORE_ICONS_ENABLED`, `APPRADAR_STORE_SCREENSHOTS_ENABLED`, `APPRADAR_STORE_DESCRIPTION_ENABLED`, `APPRADAR_REVIEW_CONTENT_ENABLED`.

**Catalog display is closed in production.** Independently of every flag, a production build never reads the third-party catalog (names, developers, metrics, rankings, aggregates, content): signed-in screens show "Catalog data is not available in this deployment". Watchlist entries, if any, appear without catalog values. Opening this needs a documented rights basis and a reviewed code change (`src/lib/read/display-policy.ts`). Legacy `APPRADAR_STORE_MEDIA_ENABLED` is ignored. See [CONTENT_USAGE.md](CONTENT_USAGE.md).

Do **not** set on the web host: `APIFY_TOKEN`, `POC_LIMIT_USD`, `DAILY_LIMIT_USD`, `MONTHLY_LIMIT_USD`, database connection strings.

Check a production env file offline before deploying (names and reason codes only, no network):

```bash
node --env-file=.env.production.local --import tsx src/lib/config/check.ts
```

`npm run check:env` checks the current shell environment instead.

Limits of the check: it compares URLs and legacy JWT keys with the declared ref. The newer `sb_…` keys carry no ref, and it cannot tell if the declared ref is itself the development one. `NEXT_PUBLIC_*` values are compiled in at build time, so rebuild after changing them. A local `next start` is production too and returns 503 with development values; use `npm run dev` locally.

**URL pitfall (seen in development):** pasting the PostgREST URL (`…/rest/v1/`) into `NEXT_PUBLIC_SUPABASE_URL` breaks sign-up (Auth HTTP 404); the same suffix on `SUPABASE_URL` hides the account-deletion form. Always use the Dashboard Project URL origin. See [AUTH_SETUP.md](AUTH_SETUP.md).

## 4. Migrations

Use the runner (`src/lib/migrate/cli.ts`, `npm run db:migrate`). It needs the `psql` client (PostgreSQL 15+). On this machine `postgresql@17` is installed (keg-only): `export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"`. Elsewhere: `brew install postgresql@17` or `libpq`.

**What it enforces**
- Inventory: `supabase/migrations/` must match `supabase/migrations.manifest.json` (13 files, order and SHA-256). A new or edited migration needs a reviewed manifest update.
- Target: `--target-ref` must equal the ref inside the connection string (`db.<ref>.supabase.co`, or session pooler user `postgres.<ref>` on port 5432, TLS). `APPRADAR_DEVELOPMENT_PROJECT_REF` is required; that ref, and any ref in `.env.local`, are refused. No `?host=`-style parameters.
- Preflight before any write: a Supabase database on PostgreSQL 15+, and either no AppRadar tables, or a ledger with this tool's shape. The development ledger (no checksums) is not adopted.
- Ledger `appradar_meta.schema_migrations(version, checksum, applied_at)` (`supabase/bootstrap/ledger.sql`), hidden from API roles.
- One transaction per migration with its ledger row; first error stops. Re-running resumes; applied files must be an unchanged prefix.
- The connection string is read only from `APPRADAR_MIGRATION_DATABASE_URL`; psql receives it through its environment, never arguments. Errors are reduced to one redacted line.

**Procedure** (run from the repository root; use a shell without `.env.local` loaded):

```bash
export APPRADAR_DEVELOPMENT_PROJECT_REF=<development ref>
read -rs APPRADAR_MIGRATION_DATABASE_URL && export APPRADAR_MIGRATION_DATABASE_URL
```

```bash
npm run db:migrate -- --target-ref <production ref>
```

Copy the connection string from the new project's **Connect** panel (session pooler, port 5432, or direct) and put your database password in it; percent-encode characters such as `@ : / ? # %`, or choose a long password of letters and digits. That first run is offline: it checks the inventory and the target and prints the order. Then add, one at a time, `--status` (read-only), `--apply`, and `--verify` (read-only). Afterwards `unset APPRADAR_MIGRATION_DATABASE_URL`.

**Post-migration verification** (`--verify`, `supabase/bootstrap/verify.sql`): 15 tables present with RLS; `anon` has no table or column privilege; `authenticated` only SELECT/INSERT/DELETE on `watchlist_items` with its three policies; `private` and `appradar_meta` closed to API roles; no client EXECUTE on `appradar_*`; no `SECURITY DEFINER`. In the Dashboard also confirm exposed schemas do not include `private` or `appradar_meta`, and the Security Advisor shows nothing unexpected.

**Rehearsed locally (27 November 2026, PostgreSQL 17.12, same version as development).** `tests/migration-rehearsal.test.ts` creates a disposable loopback-only cluster with a Supabase stand-in (`supabase/tests/local-supabase-shim.sql`: API roles, non-superuser `postgres`, `auth.users`, `auth.uid()`, open default privileges), then runs the real runner and `psql`: all 13 migrations in order; a deliberately failing migration rolled back with later ones not started; resumption; changed, missing and duplicate migrations refused; `verify.sql` passing and catching six injected weakenings; two-user watchlist isolation, the 50-item limit and account-deletion cascade; refusal of non-Supabase, unrecorded and foreign-ledger databases. The cluster is deleted afterwards. Rerun:

```bash
APPRADAR_REHEARSAL_PG_BIN=/opt/homebrew/opt/postgresql@17/bin node --import tsx --test tests/migration-rehearsal.test.ts
```

**Still only provable on the hosted project:** the real `auth` schema, platform roles, event triggers and default privileges; Supavisor/direct connection and TLS (the rehearsal connects without TLS and bypasses the hosted-target parser, which is deliberately unchanged); PostgREST exposure and GoTrue behaviour. A passing `--verify` on the new project is required. Do not run `supabase/tests/*.sql` or the shim against any hosted database, and deploy the web app only after verification passes.

## 5. Supabase Auth

Dashboard steps are in [AUTH_SETUP.md](AUTH_SETUP.md). Required for production:

- Email provider on, **Confirm email on**, **Anonymous sign-ins off**. Consider turning sign-ups off until launch.
- Site URL = `NEXT_PUBLIC_SITE_URL`. Redirect URLs: only `https://your-domain/auth/callback`; no localhost or wildcards.
- Minimum password length ≥ 8; leaked-password protection if the plan has it.
- **Do not enable CAPTCHA yet:** the forms send no CAPTCHA token, so every sign-in, sign-up and reset would fail.
- If "Secure password change" is enabled, changing the password from an old session will fail; the reset-email route still works. Test it.
- Asymmetric JWT signing keys are recommended; a key rotation signs users out only if the old key is revoked early.

**Email and SMTP:** configure custom SMTP (the built-in sender is for testing only; a development pass with default Supabase SMTP does **not** satisfy production), set SPF, DKIM and DMARC for the sending domain, install the `token_hash` templates, and turn link tracking off. Some mail scanners open links and consume the one-time token; test with the mail providers your users have.

**OAuth (optional):** Google only. The client secret stays in Supabase. Redirect URI is `https://<ref>.supabase.co/auth/v1/callback`. The consent screen needs the privacy policy and terms, which do not exist yet.

## 6. Hosting (Vercel)

- Next.js preset, default build command, **Node.js 22.x** deployment baseline (the repository requires
  22.18 or newer). No cron jobs, no `vercel.json` needed.
- Production env vars in the Production scope; mark the service-role key Sensitive. Preview deployments must not receive production values. Without a complete set of their own (development project and its ref) they answer 503.
- Enable HTTPS-only custom domain and deployment protection for previews.
- Check that the plan's terms allow commercial use.
- Security headers come from `next.config.ts`. The CSP allows inline scripts (no nonces) and blocks third-party scripts, so adding analytics or a preview toolbar needs a CSP change.

## 7. Rate limiting and abuse

The app has no in-process rate limiter (it would not be shared between serverless instances). Its own protections are bounded pagination and inputs, sign-in for every catalog read, a 50-item watchlist, and no provider API call on any web request.

External setup, before opening sign-up:

- **Supabase → Auth → Rate Limits:** review email, sign-up/sign-in, verification and token refresh limits.
- **Shared-IP caveat:** auth calls are made by the app server, so Supabase's per-IP limits count the host's addresses, not each visitor. One abuser can exhaust them for everyone. Per-visitor limiting must happen at the host, or through Supabase's documented client-IP forwarding (not implemented; check its requirements).
- **Host firewall rules** (check plan availability): limit `POST` to `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/account`, and any request carrying a `Next-Action` header, since actions can be posted to other paths. Also limit authenticated heavy reads: `/markets`, `/opportunities`, `/compare`, `/watchlist`, `/trending`.
- The publishable key can call Supabase Auth directly, bypassing host rules; Supabase limits are the control there.
- Set spend alerts and caps on Supabase and the host.

## 8. Backup and restore

- Confirm what backups the chosen Supabase plan actually takes, their retention and whether point-in-time recovery is included. Do not assume any.
- Without sufficient plan backups, schedule encrypted `pg_dump` exports kept off the platform. They contain user emails (`auth` schema): restrict access and give them an expiry.
- Rehearse a restore into a scratch project before launch, and record how long it took.
- Take and verify a backup before every migration and before any retention execution.
- Keys, SMTP, OAuth and Auth settings are not in database backups; keep a private record of how they were configured.

## 9. Monitoring and logs

No monitoring service or dependency is added. Use host runtime logs and Supabase logs, and check how long each keeps them.

| Log line | Meaning |
|---|---|
| `appradar_config_invalid:NAME:reason,…` | every page is 503; fix the named variables |
| `appradar_auth_failed:flow:code` | sign-up, reset or session revocation failed; `over_email_send_rate_limit` is hidden from users |
| `appradar_read_failed:code` | a catalog read failed; users see fixed copy |

These lines carry codes only. Next.js and the host log unhandled errors and request URLs on their own; `/auth/callback` URLs contain one-time tokens, so restrict log access and do not forward raw logs elsewhere. Watch for 503/5xx rates, auth failures, email bounces and Supabase usage. If a secret is exposed: rotate it in Supabase, update the host, redeploy, then review logs.

## 10. Collection and retention safeguards

- The web app has no code path that starts collection or cleanup, and nothing is scheduled.
- Collection commands that write refuse every database except the declared development project (`APPRADAR_DEVELOPMENT_PROJECT_REF`, see `src/lib/collection/README.md`). There is no production collection path. The guard trusts the declared ref: never declare a production ref as development.

| Entry point | Covered | What still works without a verified target |
|---|---|---|
| `src/lib/collection/cli.ts` `enqueue`, `schedule`, `work`, `reconcile`, `resolve` with `--execute` | Target + server key | `plan` / dry run |
| `src/lib/retention/cli.ts --execute` | Target + server key, after the existing policy and flag gates | Read-only dry run (reports `closedTargetGates`) |
| `tools/*-fetch.ts --execute` (9 scripts, `data:*`) | Development environment, before the provider token is used | Preview and reuse of earlier results |
| `tools/poc.ts run`, `resume` | Development environment | `plan`, `report` |
| `src/lib/migrate/cli.ts` | Its own rules (§4): production-bound by design, refuses development | |
| `src/lib/import/cli.ts` | Remote writes disabled in code | |

"Development environment" means `NODE_ENV` is not production, `APPRADAR_DEVELOPMENT_PROJECT_REF` is declared and `SUPABASE_URL` is exactly that project. There is no override. **Retention against a production database is therefore not possible with this CLI**; it needs an approved policy and a separately reviewed production path. Old compiled copies in the git-ignored `dist/` folder predate these guards: delete them and never run them.
- Collection needs `COLLECTION_PAID_EXECUTION`, `APIFY_COLLECTION_ENABLED`, a token, budget limits, `retentionDays`, `--execute`, and a scoped data-use path from an operator shell (`verified`+`POC_DATA_USE_CONFIRMED`, or bounded `unconfirmed` internal pilot — see [CONTENT_USAGE.md](CONTENT_USAGE.md)). Do not set `POC_DATA_USE_CONFIRMED` without verified evidence. Production web must keep pilot/public-display flags false.
- Retention needs a human-approved policy, `RETENTION_CLEANUP_EXECUTION=true` and `--execute` (see `APPRADAR.md` 6.20). Dry-run and verify a backup first.
- Keep production operator env files separate from development ones, and check which project they point to before any `--execute`.

## 11. Launch checklist

Public launch remains blocked. Items checked below reflect the **private** Option A deployment only (§12); they do not approve commercial redistribution or indexing.

- [ ] Commercial data-use permissions recorded per provider and store
- [ ] Owner/legal approval of B5 bilingual privacy/terms/contact drafts, real contact channel and retention/request procedures; review [BETA_READINESS.md](BETA_READINESS.md)
- [x] Production Supabase project; migrations applied and privileges checked (`ppngqbaisoroxfyybpix`, 13/13, hosted verify passed — 28 Nov 2026)
- [x] Env vars set (six required Production-scope variables; project-origin URLs)
- [ ] Auth settings, redirect URL, templates, **custom** SMTP and DNS records (production Auth URLs configured; custom SMTP still open; development default SMTP is not enough)
- [ ] Rate limits at Supabase and the host
- [ ] Backup confirmed and restore rehearsed
- [ ] Real **production** end-to-end test: sign-up, verification, sign-in, session expiry, sign-out, reset, password change, OAuth if enabled, watchlist with two users; deletion happy path plus any authorized edge cases. Owner signed in and visually checked screens; logout, session persistence, account deletion and hosted user isolation are **not** fully verified. Development Auth verification (APPRADAR §6.24) does not cover these.
- [ ] Headers and CSP checked on the deployed site (browser console clean, Google sign-in works if enabled)
- [ ] Inspect the five outstanding Vercel build warnings
- [ ] Confirm the actual deployed Node.js runtime version (Vercel setting is 22.x; runtime not yet verified)
- [ ] Exercise hosted direct PostgREST secret-key compatibility once a controlled catalog-read path exists (deferred while catalog stays closed)

## 12. Private deployment checklist (Option A: owner testing only)

**Status (28 November 2026):** private Option A deployment is live for owner testing. Public launch, commercial catalog display, indexing and collection remain closed. This checklist records what the owner completed and what is still open.

Live reference: URL `https://appradar-sigma.vercel.app`; commit `99b75316ab3999ab7617355cdd68ae0331a97176`; production Supabase `ppngqbaisoroxfyybpix`; Vercel Hobby (no paid hosting subscription); latest redeploy ~51 s; Node.js **22.x selected** in Vercel (actual runtime version not yet verified). Five Vercel build warnings are not yet inspected.

The catalog stays empty and closed. Plan features, prices, limits, commercial-use terms and exact dashboard labels were not fully verified.

**Two different kinds of "private"**
- **Application authentication** (what this setup relies on): product routes require a signed-in user; with sign-ups off, only accounts you create exist.
- **Hosting access protection** (in use): Vercel Authentication is enabled for **All Deployments**. Incognito access redirects to Vercel authentication. Do not assume every plan offers the same controls, and do not buy a paid plan without deciding to.
- Indexing is off by default (§13): pages send `noindex`. That only asks search engines not to list them; it is not an access control.

**Supabase (new project, separate from development)**
- [ ] MFA on your Supabase and Vercel accounts.
- [x] Create the project. Ref `ppngqbaisoroxfyybpix`. Save the database password in a password manager.
- [x] Record: project ref; Project URL (origin only); publishable key; secret key; connection string as used for migrations.
- [ ] Data API: exposed schemas exclude `private` and `appradar_meta` (confirm again in Dashboard if not already noted).

**Database**
- [x] Install `psql`; run §4: offline check → `--status` → `--apply` → `--verify`. All 13 migrations applied; hosted verification passed.

**Authentication**
- [x] Production Supabase Auth URLs configured (Site URL / callback aligned with the deployment).
- [ ] Email provider on; **Confirm email on**; anonymous sign-ins **off**; Google **off**; CAPTCHA **off** (confirm each Dashboard toggle still matches).
- [x] **Allow new users to sign up: off** (public signup remains closed).
- [x] Owner user can sign in. Without custom SMTP, do not rely on password-reset or verification email.
- [ ] Logout, session persistence, account deletion and hosted two-user isolation fully verified.

**Vercel**
- [x] Import the repository; Next.js preset; default build; Node.js 22.x selected; Hobby plan. Check the plan's terms fit any future commercial use before opening the product publicly.
- [x] Environment variables, **Production scope only** — all six required names from the table below.
- [x] Leave `APPRADAR_PUBLIC_INDEXING_APPROVED` unset.
- [x] Do not set: any flag in §3, `APIFY_TOKEN`, budget limits, `APPRADAR_DEVELOPMENT_PROJECT_REF`, `APPRADAR_MIGRATION_DATABASE_URL`, `DATABASE_URL`.
- [x] Deployed and redeployed with `NEXT_PUBLIC_SITE_URL` = `https://appradar-sigma.vercel.app`.
- [x] Supabase → URL configuration: Site URL = `NEXT_PUBLIC_SITE_URL`; redirect URL includes `<site>/auth/callback`.
- [x] Vercel Authentication enabled for All Deployments.

| Name | Value | Note |
|---|---|---|
| `APPRADAR_SUPABASE_PROJECT_REF` | production ref | |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (variable name unchanged) | mark Sensitive |
| `NEXT_PUBLIC_SUPABASE_URL` | same origin | public, fixed at build |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key | public, fixed at build |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain-or-vercel.app>` | origin only, fixed at build |

**Smoke tests**
- [x] Owner signed in; application screens visually checked; production catalog unavailable as designed; no demo or development catalog substituted.
- [x] Incognito access redirected to Vercel authentication.
- [ ] `/en` and `/tr` load; no 503; browser console clean (not fully recorded).
- [ ] `curl -sI https://appradar-sigma.vercel.app/en` shows `x-robots-tag: noindex, nofollow`, and the page source has the robots `noindex` meta tag.
- [ ] `/dashboard` signed out redirects to `/login` (behind Vercel Authentication).
- [ ] Signing up at `/signup` is refused ("New sign-ups are currently disabled").
- [ ] Theme selector and Account → Appearance persist across reload.
- [ ] Sign out; protected pages redirect again.
- [ ] Response headers include CSP, HSTS and `X-Frame-Options: DENY`; `/admin` is 404.
- [ ] Host logs show no `appradar_config_invalid` or secrets.
- [ ] Hosted direct PostgREST secret-key path exercised (deferred while catalog remains closed).

## 13. Search indexing and future public launch

Default: **no indexing**. Every route sends `X-Robots-Tag: noindex, nofollow` and page metadata says the same. Canonical and language-alternate links are unaffected. No `robots.txt` blocks crawling, so crawlers can see the `noindex`.

Activate only after the owner approves a public launch (legal pages published, naming and data-rights decisions made):
1. Set `APPRADAR_PUBLIC_INDEXING_APPROVED=true` (exact value) in the Production scope only.
2. Ensure `NEXT_PUBLIC_SITE_URL` is the final domain, then **rebuild and redeploy** (headers are fixed at build time).
3. Verify: `/en` and `/tr` have no `x-robots-tag` and `index, follow` metadata; legal drafts, sign-in and all other routes still send `noindex`.

Legal drafts stay `noindex` until their draft status is removed in a separate reviewed change. To withdraw, unset the variable and redeploy; already indexed pages disappear only when search engines recrawl.
