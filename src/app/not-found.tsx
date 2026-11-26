import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "../components/ui/button";
export default function NotFound() { return <div className="empty-state panel"><Compass size={36} /><h1>Burada bir uygulama bulamadık.</h1><p>Bağlantı değişmiş olabilir. Katalogdan yeni bir keşfe başlayabilirsin.</p><Button asChild><Link href="/explore">Keşfet sayfasına dön</Link></Button></div>; }
