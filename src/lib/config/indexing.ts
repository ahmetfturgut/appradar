// Search indexing is off until the owner approves a public launch (docs/PRODUCTION.md §13).
// noindex is a request to search engines. It is not authentication and does not restrict access.
export const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex, nofollow" } as const;

/** Only the exact value "true" approves. Unset, empty or anything else keeps every page out of indexes. */
export function publicIndexingApproved(env: Record<string, string | undefined>): boolean {
  return env.APPRADAR_PUBLIC_INDEXING_APPROVED === "true";
}

/**
 * Header rules beside the security headers. Not approved: every route. Approved: every route except the two
 * landing pages, matching metadata (legal drafts, auth and product pages stay noindex either way).
 */
export function indexingHeaderRules(approved: boolean): { source: string; headers: { key: string; value: string }[] }[] {
  return [{ source: approved ? "/:path((?!en$|tr$).*)" : "/:path*", headers: [{ ...NOINDEX_HEADER }] }];
}
