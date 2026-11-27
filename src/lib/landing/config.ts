/** Public presentation only. This does not change Auth or production authorization. */
export const LANDING_BRAND = { name: "AppRadar" } as const;

/** Public registration has not been approved. Signed-out acquisition stays in the local example. */
export function landingAction(signedIn: boolean) {
  return signedIn
    ? { href: "/dashboard", kind: "dashboard" as const }
    : { href: "#market-check", kind: "example" as const };
}
