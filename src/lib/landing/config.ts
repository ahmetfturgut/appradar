/** Public presentation only. This does not change Auth or production authorization. */
export const LANDING_BRAND = { name: "AppRadar" } as const;
/** Umbrella brand attribution. AppRadar keeps its own product identity. */
export const UMBRELLA_BRAND = { name: "Nomind", url: "https://nomind.tech/", copyright: "© 2026 Nomind" } as const;
/** Public contact address, published at the owner's request (28 November 2026). */
export const CONTACT_EMAIL = "a.farukturgut@gmail.com";

/** Public registration has not been approved. Signed-out acquisition stays in the local example. */
export function landingAction(signedIn: boolean) {
  return signedIn
    ? { href: "/dashboard", kind: "dashboard" as const }
    : { href: "#market-check", kind: "example" as const };
}
