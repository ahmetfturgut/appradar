import type { Metadata } from "next";
import { Dashboard } from "../../components/core/dashboard";
import { parseScope, readFailure, type SearchValues } from "../../components/core/catalog-query";
import { ReadNotice } from "../../components/core/elements";
import { dashboardData } from "../../lib/ui/catalog.server";
import { isDevelopmentDemo } from "../../lib/ui/demo-mode";
import { requireViewer } from "../../lib/auth/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  await requireViewer("/dashboard");
  let scope;
  try {
    scope = parseScope(await searchParams);
  } catch (error) {
    return <ReadNotice result={readFailure(error)} resetHref="/dashboard" />;
  }
  return <Dashboard result={await dashboardData(scope)} scope={scope} demo={isDevelopmentDemo()} />;
}
