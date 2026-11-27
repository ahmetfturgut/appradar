/**
 * Content display flags and provider media eligibility.
 * Legacy APPRADAR_STORE_MEDIA_ENABLED is intentionally unread and cannot enable icons/screenshots.
 * Documentation-only provider capabilities are candidates only — not live-verified or rights-approved.
 *
 * Icon/screenshot kind flags never alone authorize display:
 * - Development internal path: operator approval + unconfirmed media-risk acceptance (not a third-party licence).
 * - Public/commercial path: APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED (production web keeps this false).
 */

export type MediaKind = "icons" | "screenshots";

/** Providers that may supply icon/screenshot URL fields per normalize candidate maps (APPRADAR §6.5). */
const PROVIDER_MEDIA_ELIGIBILITY: Record<string, ReadonlySet<MediaKind>> = {
  aurelix: new Set(["icons", "screenshots"]),
  datatrail: new Set(["icons", "screenshots"]),
  // subimpact: no icon/screenshot mapping in normalize
};

/**
 * Separate from collection pilot approval. Owner/operator product decision for
 * development-only media display while third-party media rights remain unconfirmed.
 */
export function internalMediaDisplayAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV !== "development") return false;
  if (env.APPRADAR_THIRD_PARTY_RIGHTS_STATUS === "prohibited") return false;
  return env.APPRADAR_INTERNAL_MEDIA_OPERATOR_APPROVAL === "true"
    && env.APPRADAR_INTERNAL_MEDIA_UNCONFIRMED_RISK_ACCEPTED === "true";
}

/** Scope gate after a kind flag is on. Never treats operator approval as verified third-party rights. */
export function mediaScopeAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.APPRADAR_THIRD_PARTY_RIGHTS_STATUS === "prohibited") return false;
  if (env.APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED === "true") return true;
  return internalMediaDisplayAuthorized(env);
}

export function storeIconsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.APPRADAR_STORE_ICONS_ENABLED === "true" && mediaScopeAuthorized(env);
}

export function storeScreenshotsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.APPRADAR_STORE_SCREENSHOTS_ENABLED === "true" && mediaScopeAuthorized(env);
}

/** @deprecated Do not use. Kept only so accidental references fail closed. */
export function mediaEnabled(): boolean {
  return false;
}

/**
 * Provider eligibility from listing field provenance `source`.
 * Unknown / missing / ineligible providers never release media even when flags are on.
 */
export function providerMediaEligible(source: string | null | undefined, kind: MediaKind): boolean {
  if (!source) return false;
  const allowed = PROVIDER_MEDIA_ELIGIBILITY[source.toLowerCase()];
  return allowed?.has(kind) === true;
}

export function mediaDisplayAllowed(args: {
  kind: MediaKind;
  flagOn: boolean;
  providerSource: string | null | undefined;
  suppressed: boolean;
}): boolean {
  return args.flagOn && !args.suppressed && providerMediaEligible(args.providerSource, args.kind);
}
