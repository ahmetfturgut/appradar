# AppRadar authentication setup

AppRadar uses **Supabase Auth** through the official `@supabase/ssr` integration. These steps are manual and happen in the Supabase Dashboard and Google Cloud Console. No credentials are stored in the repository.

## 1. Environment variables

Set them in `.env.local` for development and in the hosting provider for production. See `.env.example`.

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | Project **origin only**: `https://<ref>.supabase.co`. No `/rest/v1`, `/auth/v1`, trailing API path, query or hash. https only, except localhost. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable** key (`sb_publishable_…`), or the legacy `anon` key | Safe for browsers. `sb_secret_…` and `service_role` keys are rejected at runtime. |
| `NEXT_PUBLIC_SITE_URL` | Your public origin, e.g. `https://app.example.com` | Required in production. Used for email links and the OAuth callback. Locally use `http://127.0.0.1:3000` or `http://localhost:3000` when testing email links. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project API settings | Server-only catalog reads and current-user Auth deletion. `SUPABASE_URL` must be the **same project origin** as `NEXT_PUBLIC_SUPABASE_URL` (no `/rest/v1`). Never prefix with `NEXT_PUBLIC_`. |

Without the two `NEXT_PUBLIC_SUPABASE_*` values, auth pages show "Authentication is not configured", and protected routes redirect to `/login`. That is development behaviour: in production the whole app answers 503 until the variables in [PRODUCTION.md](PRODUCTION.md) are complete.

### Project-origin URL requirement

Both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` must be the Project URL origin copied from the Dashboard, not a PostgREST or Auth endpoint.

| Correct | Incorrect |
|---|---|
| `https://<ref>.supabase.co` | `https://<ref>.supabase.co/rest/v1/` |
| | `https://<ref>.supabase.co/auth/v1` |
| | any URL with path, query, hash or embedded credentials |

- Session/sign-up uses `NEXT_PUBLIC_SUPABASE_URL`. A `/rest/v1/` suffix can produce Auth HTTP **404** on registration.
- Account deletion (`accountDeletionConfig`) also requires `SUPABASE_URL` with pathname `/`. A `/rest/v1/` suffix makes the Account page show **"Account deletion is not configured"** even when login works.
- Origins of the two URLs must match. Legacy JWT service-role keys must carry the same project `ref` as the hostname when a ref is present.

After fixing `.env.local`, restart `next dev` so the process reloads environment variables.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| Sign-up / Auth requests return HTTP 404 | `NEXT_PUBLIC_SUPABASE_URL` includes `/rest/v1` or another API path |
| Login works, but Account shows deletion not configured | `SUPABASE_URL` includes `/rest/v1` or differs from the public project origin; or service-role key missing / wrong kind |
| "Authentication is not configured" | Missing `NEXT_PUBLIC_SUPABASE_URL` or publishable key |
| Redirect loop or lost `next` path | Site URL / Redirect URLs in the Dashboard do not include this origin’s `/auth/callback` |

## 2. Supabase Dashboard

1. **Authentication → Sign In / Providers → Email:** enable it, and keep **Confirm email** on.
2. **Authentication → URL Configuration:**
   - **Site URL:** the value of `NEXT_PUBLIC_SITE_URL`.
   - **Redirect URLs:** add `https://<your-domain>/auth/callback`. For local development, also add `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`.
3. **Authentication → Email Templates (recommended):** use `token_hash` links so verification also works when the email is opened on another device.
   - **Confirm signup:** `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   - **Reset password:** `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   - **Change email address:** `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/account`

   The default templates (`{{ .ConfirmationURL }}`) also work, but only in the browser that started the flow (PKCE).
4. **Authentication → Emails → SMTP:** configure a custom SMTP provider before **production** launch. The built-in sender is rate-limited and meant for testing only. Development verification may use the default Supabase SMTP (see §6).
5. **Authentication → Attack Protection:** a minimum password length of 8 or more is recommended. The app enforces 8–72. Consider leaked-password protection. Do **not** enable CAPTCHA: the forms send no CAPTCHA token yet, so sign-in, sign-up and reset would all fail.
6. **Authentication → Sign In / Providers:** keep **anonymous sign-ins** off. The app treats anonymous users as signed out.

## 3. Google OAuth (optional)

The "Continue with Google" button appears only when the Google provider is enabled in Supabase. The app reads this from the project's public `/auth/v1/settings` endpoint and caches the result for 5 minutes.

1. **Google Cloud Console:**
   1. Go to **APIs & Services → OAuth consent screen**. Set the app name, a support email, an authorized domain, and links to the privacy policy and terms (B5 drafts still require owner/legal approval; see the launch blockers below).
   2. Go to **Credentials → Create credentials → OAuth client ID → Web application**:
      - **Authorized JavaScript origins:** your site origin, e.g. `https://app.example.com`. Add `http://localhost:3000` for local development.
      - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase shows this exact URL on the Google provider page.
2. **Supabase → Authentication → Sign In / Providers → Google:** enable it and paste the Client ID and Client Secret. The secret stays in Supabase, never in this app.
3. Keep `https://<your-domain>/auth/callback` in Supabase's Redirect URLs (step 2.2).

## 4. How it fits together

- `src/proxy.ts` refreshes session cookies (`getClaims()`) on every page except `/auth/*`, redirects signed-out visitors from protected routes to `/login?next=…`, and redirects signed-in users away from `/login` and `/signup`.
- `src/lib/auth/server.ts` verifies identity with `getUser()`. `requireViewer()` guards pages, server actions and **every catalog read** (`src/lib/ui/catalog.server.ts`).
- `src/lib/auth/paths.ts`: `safeNextPath()` allows only internal app paths, and keeps the query, so country, language and store survive the login round trip.
- `src/app/auth/callback/route.ts` handles OAuth codes and `token_hash` email links.
- A successful password change signs out the account's other sessions.
- `/settings` redirects verified viewers to `/account`. Account deletion requires a real verified session, exact confirmation and password reauthentication in the same request (60-second maximum), then deletes only that Auth user; the existing FK cascades its watchlist. Demo cannot delete. MFA accounts fail closed; Google-only password recovery must be verified on the configured project. See [BETA_READINESS.md](BETA_READINESS.md) for authorization, partial failures and retention limitations.
- **Development demo:** with `NODE_ENV=development` and `APPRADAR_DEMO_MODE=true`, protected pages open without signing in. No fake user or session is created, and data comes from local fixtures only. This bypass is impossible in production.

## 5. Development verification status (27 November 2026)

Owner-reported **manual** checks against the **development** Supabase project (default Supabase SMTP), after correcting both project-origin URLs:

**Verified:** registration; email delivery; email confirmation; login; Dashboard and Explorer access; session persistence; logout; protected-route redirects; password reset; account deletion (happy path).

**Not verified (do not claim):** Google OAuth; MFA; production SMTP; production Auth; deletion edge cases beyond the owner’s happy path; live two-user watchlist isolation.

B5 automated suites remain **mocked** HTTP/cookie scenarios. They do not replace this live development check, and this live check does not re-prove the mocked edge cases. Details: [APPRADAR.md](../APPRADAR.md) §6.24 and [BETA_READINESS.md](BETA_READINESS.md).

## 6. Launch blockers

- Privacy, terms and contact have English/Turkish draft routes linked from the footer, but owner information, a working contact channel and legal approval remain missing. Do not use unapproved drafts to claim publication readiness or data-use permission.
- Commercial data-use rights and paid/collection gates remain closed (`POC_DATA_USE_CONFIRMED` unset/false until separately authorized).
- Production needs a **separate** Supabase project, migrations, production env check, custom SMTP + DNS, Auth rate limits at Supabase and the host, and a real production Auth E2E (including OAuth if enabled and two-user isolation).
- Development used default Supabase SMTP; that is **not** production email readiness.
- MFA support process and Google-only recovery (if Google is enabled) remain open. Account-deletion security edge cases stay covered by mocks unless re-tested with disposable accounts under explicit authorization.
