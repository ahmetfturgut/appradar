/**
 * Store media and listing URL validation. No server-side image fetch; clients load
 * validated https URLs only. Hostnames are suffix-matched against store/CDN allowlists.
 */

const MEDIA_HOST_SUFFIXES = [
  "mzstatic.com",           // Apple App Store artwork
  "googleusercontent.com",  // Google Play listing images
  "ggpht.com",              // Google image CDN alias
] as const;

const LISTING_HOST_SUFFIXES = [
  "apps.apple.com",
  "play.google.com",
] as const;

function hostAllowed(hostname: string, suffixes: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  if (!host || host.includes(":") || /^[\d.]+$/.test(host) || host.startsWith("[")) return false;
  return suffixes.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
}

function parseHttpsOriginUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048 || /[\s\r\n]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port) return null;
    // Block userinfo-style tricks and protocol-relative leftovers.
    if (trimmed.includes("@") && !url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

/** Icon/screenshot URL for persistence and public display. Rejects http, credentials, IPs and untrusted hosts. */
export function validateStoreMediaUrl(value: string | null | undefined): string | null {
  if (value == null) return null;
  const url = parseHttpsOriginUrl(value);
  if (!url || !hostAllowed(url.hostname, MEDIA_HOST_SUFFIXES)) return null;
  return url.href;
}

/** Original App Store / Play listing link only. */
export function validateStoreListingUrl(value: string | null | undefined): string | null {
  if (value == null) return null;
  const url = parseHttpsOriginUrl(value);
  if (!url || !hostAllowed(url.hostname, LISTING_HOST_SUFFIXES)) return null;
  return url.href;
}

/** UI helper: store media only (same rules as persistence). */
export function safeMediaUrl(value: string | null): string | null {
  return validateStoreMediaUrl(value);
}

export function safeStoreListingUrl(value: string | null): string | null {
  return validateStoreListingUrl(value);
}

export const STORE_MEDIA_HOST_SUFFIXES = MEDIA_HOST_SUFFIXES;
export const STORE_LISTING_HOST_SUFFIXES = LISTING_HOST_SUFFIXES;
