import { Dashboard } from "../components/core/dashboard";
import { parseScope, readFailure, type SearchValues } from "../components/core/catalog-query";
import { ReadNotice } from "../components/core/elements";
import { dashboardData } from "../lib/ui/catalog.server";
export default async function Home({ searchParams }: { searchParams: Promise<SearchValues> }) {
  try {
    const scope = parseScope(await searchParams);
    return <Dashboard result={await dashboardData(scope)} scope={scope} />;
  } catch (error) { return <ReadNotice result={readFailure(error)} resetHref="/" />; }
}
