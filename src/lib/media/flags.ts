/**
 * Content display flags and provider media eligibility.
 * Legacy APPRADAR_STORE_MEDIA_ENABLED is intentionally unread and cannot enable icons/screenshots.
 * Documentation-only provider capabilities are candidates only — not live-verified or rights-approved.
 */

export type MediaKind = "icons" | "screenshots";

/** Providers that may supply icon/screenshot URL fields per normalize candidate maps (APPRADAR §6.5). */
const PROVIDER_MEDIA_ELIGIBILITY: Record<string, ReadonlySet<MediaKind>> = {
  aurelix: new Set(["icons", "screenshots"]),
  datatrail: new Set(["icons", "screenshots"]),
  // subimpact: no icon/screenshot mapping in normalize
};

export function storeIconsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.APPRADAR_STORE_ICONS_ENABLED === "true";
}

export function storeScreenshotsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.APPRADAR_STORE_SCREENSHOTS_ENABLED === "true";
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
