import { notFound } from "next/navigation";

// Retired in every environment: never load POC journals or demo administrative data.
// Collection operations remain available through the existing server-side CLI.
export default function RetiredAdminPage(): never { notFound(); }
