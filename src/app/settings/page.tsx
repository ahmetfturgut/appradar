import { redirect } from "next/navigation";
import { requireViewer } from "../../lib/auth/server";
export const metadata = { title: "Account settings" };
export default async function SettingsPage() { await requireViewer("/settings"); redirect("/account"); }
