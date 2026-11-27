# AppRadar production runbook

Nothing in this document has been executed: no production project, deployment or remote setting exists yet. Plan features, limits and prices of Supabase, Vercel, Google and the SMTP provider were not verified; check them before relying on them. Paid options need explicit approval.

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

Unset or exactly `false` (anything else is also a 503): `APPRADAR_DEMO_MODE`, `COLLECTION_PAID_EXECUTION`, `APIFY_COLLECTION_ENABLED`, `POC_DATA_USE_CONFIRMED`, `RETENTION_CLEANUP_EXECUTION`, `APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL`, `APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED`, `APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED`.

Keep `false` until usage rights are recorded (not enforced by the check): `APPRADAR_STORE_ICONS_ENABLED`, `APPRADAR_STORE_SCREENSHOTS_ENABLED`, `APPRADAR_STORE_DESCRIPTION_ENABLED`, `APPRADAR_REVIEW_CONTENT_ENABLED`. Legacy `APPRADAR_STORE_MEDIA_ENABLED` is ignored. See [CONTENT_USAGE.md](CONTENT_USAGE.md).

Do **not** set on the web host: `APIFY_TOKEN`, `POC_LIMIT_USD`, `DAILY_LIMIT_USD`, `MONTHLY_LIMIT_USD`, database connection strings.

Check a production env file offline before deploying (names and reason codes only, no network):

```bash
node --env-file=.env.production.local --import tsx src/lib/config/check.ts
```

`npm run check:env` checks the current shell environment instead.

Limits of the check: it compares URLs and legacy JWT keys with the declared ref. The newer `sb_…` keys carry no ref, and it cannot tell if the declared ref is itself the development one. `NEXT_PUBLIC_*` values are compiled in at build time, so rebuild after changing them. A local `next start` is production too and returns 503 with development values; use `npm run dev` locally.

**URL pitfall (seen in development):** pasting the PostgREST URL (`…/rest/v1/`) into `NEXT_PUBLIC_SUPABASE_URL` breaks sign-up (Auth HTTP 404); the same suffix on `SUPABASE_URL` hides the account-deletion form. Always use the Dashboard Project URL origin. See [AUTH_SETUP.md](AUTH_SETUP.md).

## 4. Migrations

Apply all files in `supabase/migrations/` to the empty production database in filename order (`000100` → `001300` media suppression), each in its own transaction, stopping at the first error:

```bash
psql "$PRODUCTION_DATABASE_URL" --single-transaction --set=ON_ERROR_STOP=1 --file supabase/migrations/20261126000100_catalog_core.sql
```

- Record each applied file in `appradar_meta.schema_migrations`, as in development. The repository does not create this ledger; create it first, in a schema that is not exposed to clients.
- Do not run `supabase/tests/*.sql` against production.
- The "Not applied remotely" header comments in `000800` and `001000` are older than `APPRADAR.md`'s application records; trust each database's ledger, not the comments.
- Afterwards confirm: every `public` table has RLS; `anon` has no table or function access; `authenticated` only has SELECT/INSERT/DELETE on `watchlist_items`.
- Deploy the web app only after the migrations.

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

- Next.js preset, default build command, Node.js 22.18 or newer. No cron jobs, no `vercel.json` needed.
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
- Collection needs `COLLECTION_PAID_EXECUTION`, `APIFY_COLLECTION_ENABLED`, a token, budget limits, `retentionDays`, `--execute`, and a scoped data-use path from an operator shell (`verified`+`POC_DATA_USE_CONFIRMED`, or bounded `unconfirmed` internal pilot — see [CONTENT_USAGE.md](CONTENT_USAGE.md)). Do not set `POC_DATA_USE_CONFIRMED` without verified evidence. Production web must keep pilot/public-display flags false.
- Retention needs a human-approved policy, `RETENTION_CLEANUP_EXECUTION=true` and `--execute` (see `APPRADAR.md` 6.20). Dry-run and verify a backup first.
- Keep production operator env files separate from development ones, and check which project they point to before any `--execute`.

## 11. Launch checklist

- [ ] Commercial data-use permissions recorded per provider and store
- [ ] Owner/legal approval of B5 bilingual privacy/terms/contact drafts, real contact channel and retention/request procedures; review [BETA_READINESS.md](BETA_READINESS.md)
- [ ] Production Supabase project; migrations applied and privileges checked
- [ ] Env vars set (project-origin URLs, no `/rest/v1`); offline check prints `production_config_ok`
- [ ] Auth settings, redirect URL, templates, **custom** SMTP and DNS records (development default SMTP is not enough)
- [ ] Rate limits at Supabase and the host
- [ ] Backup confirmed and restore rehearsed
- [ ] Real **production** end-to-end test: sign-up, verification, sign-in, session expiry, sign-out, reset, password change, OAuth if enabled, watchlist with two users; deletion happy path plus any authorized edge cases. Development Auth verification (APPRADAR §6.24) does not cover production, OAuth, MFA or live isolation.
- [ ] Headers and CSP checked on the deployed site (browser console clean, Google sign-in works if enabled)
