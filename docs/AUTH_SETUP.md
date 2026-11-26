# AppRadar authentication setup

AppRadar uses **Supabase Auth** through the official `@supabase/ssr` integration. These steps are manual and happen in the Supabase Dashboard and Google Cloud Console. No credentials are stored in the repository.

## 1. Environment variables

Set them in `.env.local` for development and in the hosting provider for production. See `.env.example`.

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | https only, except localhost |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable** key (`sb_publishable_…`), or the legacy `anon` key | Safe for browsers. `sb_secret_…` and `service_role` keys are rejected at runtime. |
| `NEXT_PUBLIC_SITE_URL` | Your public origin, e.g. `https://app.example.com` | Required in production. Used for email links and the OAuth callback. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Unchanged | Server-only catalog reads. Never prefix with `NEXT_PUBLIC_`. |

Without the two `NEXT_PUBLIC_SUPABASE_*` values, auth pages show "Authentication is not configured", and protected routes redirect to `/login`.

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
4. **Authentication → Emails → SMTP:** configure a custom SMTP provider before launch. The built-in sender is rate-limited and meant for testing only.
5. **Authentication → Attack Protection:** a minimum password length of 8 or more is recommended. The app enforces 8–72. Consider leaked-password protection and CAPTCHA.

## 3. Google OAuth (optional)

The "Continue with Google" button appears only when the Google provider is enabled in Supabase. The app reads this from the project's public `/auth/v1/settings` endpoint and caches the result for 5 minutes.

1. **Google Cloud Console:**
   1. Go to **APIs & Services → OAuth consent screen**. Set the app name, a support email, an authorized domain, and links to the privacy policy and terms (both still missing; see the launch blockers below).
   2. Go to **Credentials → Create credentials → OAuth client ID → Web application**:
      - **Authorized JavaScript origins:** your site origin, e.g. `https://app.example.com`. Add `http://localhost:3000` for local development.
      - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase shows this exact URL on the Google provider page.
2. **Supabase → Authentication → Sign In / Providers → Google:** enable it and paste the Client ID and Client Secret. The secret stays in Supabase, never in this app.
3. Keep `https://<your-domain>/auth/callback` in Supabase's Redirect URLs (step 2.2).

## 4. How it fits together

- `src/proxy.ts` refreshes session cookies (`getClaims()`), redirects signed-out visitors from protected routes to `/login?next=…`, and redirects signed-in users away from `/login` and `/signup`.
- `src/lib/auth/server.ts` verifies identity with `getUser()`. `requireViewer()` guards pages, server actions and **every catalog read** (`src/lib/ui/catalog.server.ts`).
- `src/lib/auth/paths.ts`: `safeNextPath()` allows only internal app paths, and keeps the query, so country, language and store survive the login round trip.
- `src/app/auth/callback/route.ts` handles OAuth codes and `token_hash` email links.
- **Development demo:** with `NODE_ENV=development` and `APPRADAR_DEMO_MODE=true`, protected pages open without signing in. No fake user or session is created, and data comes from local fixtures only. This bypass is impossible in production.

## 5. Launch blockers

- Privacy policy, terms of service and contact details have not been written or approved. The footer shows them as "coming soon", and Google's consent screen needs the first two.
- Custom SMTP and the email templates above must be configured.
- End-to-end sign-up, verification, Google sign-in and logout have not been tested against a real Supabase project yet, because no publishable key was configured and no test account has been approved.
