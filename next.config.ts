import type { NextConfig } from "next";
import { indexingHeaderRules, publicIndexingApproved } from "./src/lib/config/indexing.ts";

/**
 * Response headers for every route. The CSP has no nonces (Next's documented static form), so inline
 * scripts stay allowed; it still blocks foreign script/connect/frame origins and clickjacking.
 * `img-src https:` is for store media, which stays disabled until usage rights are confirmed.
 * `form-action` includes the OAuth redirect chain for a Google button submitted before hydration.
 */
export function securityHeaders(development: boolean): { key: string; value: string }[] {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.supabase.co https://accounts.google.com",
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    // Subdomain and preload coverage is a domain-wide decision and is not claimed here.
    ...(development ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
  ];
}

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Evaluated at build time: changing APPRADAR_PUBLIC_INDEXING_APPROVED needs a rebuild/redeploy.
  headers: async () => [
    { source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "development") },
    ...indexingHeaderRules(publicIndexingApproved(process.env)),
  ],
};
export default config;
