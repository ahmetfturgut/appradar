import { Database, KeyRound, Radio, ShieldCheck, CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { getCatalog } from "../../lib/catalog.server";
import { formatObservedAt } from "../../lib/live-catalog";
export const metadata = { title: "Kaynak durumu" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const tokenPresent = Boolean(process.env.APIFY_TOKEN?.trim());
  const catalog = await getCatalog();
  const live = catalog.mode === "live";
  return <>
    <div className="page-heading"><div><p className="eyebrow">VERİNİN KAYNAĞINI BİL</p><h1>Kaynak durumu</h1><p className="page-description">Kullanılan veriyi, kapsamını ve son çekimi gör.</p></div><span className="environment-badge"><Radio size={14} /> {live ? "Gerçek mağaza verisi" : catalog.mode === "demo" ? "Demo ortamı" : "Veri bekleniyor"}</span></div>
    <section className="panel source-overview"><span className="source-logo"><Database size={30} /></span><div><h2>{live ? `${catalog.apps.length} gerçek uygulama katalogda.` : catalog.mode === "demo" ? "Örnek katalog kullanılıyor." : "Gösterilecek mağaza verisi yok."}</h2><p>{live ? `${catalog.sourceLabel} üzerinden ${catalog.observationCount} ülke–uygulama gözlemi alındı. Bu kayıtlar TR ve US bağlamlarını ayrı tutar. Katalog mağazanın tamamını kapsamaz.` : catalog.error ?? "Ekranlar açıkça etiketlenen sentetik verilerle çalışır."}</p></div><Button asChild variant="outline"><Link href="/explore">Kataloğu incele</Link></Button></section>
    <div className="source-grid">
      <section className="panel source-card"><div className="section-heading"><KeyRound size={22} /><span className={`status-pill ${tokenPresent ? "good" : ""}`}>{tokenPresent ? "Eklendi" : "Eklenmedi"}</span></div><h2>Apify bağlantısı</h2><p>{tokenPresent ? "API anahtarı sunucuda mevcut. Anahtar tarayıcıya gönderilmez." : "API anahtarı yerel ortamda yapılandırılmamış."}</p><div className="source-card-footer">Sayfa açmak ücretli çekim başlatmaz.</div></section>
      <section className="panel source-card"><div className="section-heading"><Clock3 size={22} /><span className={`status-pill ${live ? "good" : ""}`}>{live ? "Kayıt alındı" : "Bekliyor"}</span></div><h2>Son veri çekimi</h2><p>{formatObservedAt(catalog.latestCollectedAt)}<br />{catalog.completedRuns} tamamlanan çalışma · {catalog.observationCount} geçerli gözlem.</p><div className="source-card-footer">Kaynak: {catalog.sourceLabel}</div></section>
      <section className="panel source-card"><div className="section-heading"><ShieldCheck size={22} /><span className="status-pill">{catalog.missingObservations ? "Kısmi kapsam" : "Sınırlı katalog"}</span></div><h2>Kapsam ve kullanım</h2><p>{catalog.missingObservations ? `${catalog.missingObservations} beklenen ülke–uygulama kaydı dönmedi; eksik sonuçlar üretilmedi. ` : "Yalnızca gerçekten alınan kayıtlar gösterilir. "}Bildirilen API kullanımı: {catalog.observedUsageUsd == null ? "bilinmiyor" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(catalog.observedUsageUsd)}.</p><div className="source-card-footer">API kullanım bildirimi; fatura uzlaştırması değildir.</div></section>
    </div>
    <section className="panel source-checklist"><h2>Verinin sınırları</h2><p><CheckCircle2 size={18} /> Puan, değerlendirme sayısı ve fiyat kaynaktaki değerlerdir.</p><p><CheckCircle2 size={18} /> Mağaza, ülke ve gözlem tarihi ayrı tutulur.</p><p><CheckCircle2 size={18} /> Kaynakta bulunmayan sürüm veya sayı sıfırla doldurulmaz.</p><p className="muted"><CircleDashed size={18} /> Geçmiş, yeni çekimler yapıldıkça oluşur; eski tarihler üretilmez.</p><p className="muted"><CircleDashed size={18} /> Gelir ve aylık indirme tahmini sunulmaz.</p></section>
  </>;
}
