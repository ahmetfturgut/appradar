import { Settings } from "../../components/settings";
import { requireViewer } from "../../lib/auth/server";
export const metadata = { title: "Ayarlar" };
export default async function SettingsPage() { await requireViewer("/settings"); return <Settings />; }
