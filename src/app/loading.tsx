import { CatalogState } from "../components/core/elements";
import { Skeleton } from "../components/ui/skeleton";

export default function Loading() {
  return <div className="flex flex-col gap-5">
    <div className="flex flex-col gap-2" aria-hidden="true"><Skeleton className="h-6 w-48" /><Skeleton className="h-3.5 w-72 max-w-full" /></div>
    <div className="rounded-xl border bg-card shadow-xs"><CatalogState state="loading" /></div>
  </div>;
}
