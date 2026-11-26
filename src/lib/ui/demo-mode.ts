/** Server-selected only; deliberately not a NEXT_PUBLIC flag. Exact opt-in, never production. */
export function isDevelopmentDemo(env: { NODE_ENV?: string; APPRADAR_DEMO_MODE?: string } = process.env): boolean {
  return typeof window === "undefined" && env.NODE_ENV === "development" && env.APPRADAR_DEMO_MODE === "true";
}
