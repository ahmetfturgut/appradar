// Third-party catalog data (names, developers, metrics, rankings, aggregates, content) has no recorded
// public or commercial display right. A production build therefore never reads it. No environment flag
// opens this: lifting it is a reviewed code change made together with a documented rights basis.
export function catalogDisplayClosed(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production";
}
