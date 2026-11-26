import { Dashboard } from "../components/core/dashboard";
import { parseScope, readFailure, type SearchValues } from "../components/core/catalog-query";
import { ReadNotice } from "../components/core/elements";
import { dashboardData } from "../lib/ui/catalog.server";
import { isDevelopmentDemo } from "../lib/ui/demo-mode";

export default async function Home({ searchParams }: { searchParams: Promise<SearchValues> }) {
  let scope;
  try {
    scope = parseScope(await searchParams);
  } catch (error) {
    return <ReadNotice result={readFailure(error)} resetHref="/" />;
  }
  return <Dashboard result={await dashboardData(scope)} scope={scope} demo={isDevelopmentDemo()} />;
}
