"use client";

import Link from "next/link";
import { ChevronLeft, Apple, Play, Star, Globe2, Info, CalendarDays, ShieldCheck, ChevronDown, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type DemoApp, type Country, displayStats, formatCount, formatPrice } from "../lib/demo-data";
import { comparableHistory, formatObservedAt } from "../lib/live-catalog";
import { AppIcon } from "./app-icon";
import { SaveButton } from "./explorer";
import { Button } from "./ui/button";

export function AppDetail({ app, country, backHref }: { app: DemoApp; country: Country; backHref: string }) {
  const stats = displayStats(app, country);
  const router = useRouter();
  const [historyDays, setHistoryDays] = useState(7);
  const live = Boolean(app.live);
  const observation = app.live?.observations[country];
  const history = live
    ? comparableHistory(app, country, observation ? Date.parse(observation.collectedAt) : 0, historyDays).map(item => ({ date: formatObservedAt(item.observedAt), count: item.ratings! }))
    : stats.ratings == null ? [] : Array.from({ length: historyDays }, (_, i) => ({ date: `${26 - historyDays + i} Kas`, count: Math.round(stats.ratings! * (0.88 + (i / (historyDays - 1)) * 0.12)) }));
  const minimum = history.length ? Math.min(...history.map(h => h.count)) : 0;
  const maximum = history.length ? Math.max(...history.map(h => h.count)) : 0;
  const points = history.map((h, i) => `${52 + i / Math.max(1, history.length - 1) * 652},${178 - (h.count - minimum) / Math.max(1, maximum - minimum) * 130}`).join(" ");

  return <>
    <Link href={backHref} className="back-link"><ChevronLeft size={17} /> Listeye dön</Link>
    <div className="detail-heading">
      <div className="detail-identity"><AppIcon app={app} large /><div>
        <div className="detail-kicker"><span className="demo-tag">{live ? "MAĞAZA KAYDI" : "DEMO UYGULAMA"}</span><span>{app.store === "ios" ? <Apple size={14} /> : <Play size={14} />}{app.store === "ios" ? "App Store" : "Google Play"}</span></div>
        <h1>{app.name}</h1><p>{app.developer} <span>·</span> {app.category}</p>
      </div></div>
      <div className="button-row">{observation && <Button asChild variant="outline"><a href={observation.storeUrl} target="_blank" rel="noopener noreferrer">Mağazada aç <ExternalLink size={15} /></a></Button>}<SaveButton app={app} country={country} /></div>
    </div>
    <div className="detail-context"><span><Globe2 size={16} /> Mağaza bağlamı</span><label className="select-wrap"><select aria-label="Detay ülkesi" value={country} onChange={e => router.replace(`/apps/${app.id}?country=${e.target.value}&back=${encodeURIComponent(backHref)}`)}><option value="TR">Türkiye</option><option value="US">Amerika Birleşik Devletleri</option></select><ChevronDown size={13} /></label><span className="context-note">{live ? `Son gözlem: ${formatObservedAt(observation?.observedAt ?? null)}` : "Ülkeye göre örnek ölçümler"}</span></div>
    {live && !observation && <div className="info-note" role="status"><Info size={17} /> Seçili ülke için henüz gözlem yok. Başka bir ülkeyi seçebilirsin.</div>}
    <section className="detail-metrics" aria-label={live ? "Mağazada gözlenen ölçümler" : "Örnek uygulama ölçümleri"}>
      <div><p>Mağaza puanı</p><strong>{stats.rating == null ? "Veri yok" : <><Star size={22} fill="currentColor" className="star" />{stats.rating.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}<small>/ 5</small></>}</strong><span>{live ? "Mağazanın gösterdiği puan" : "Sentetik puan"}</span></div>
      <div><p>Değerlendirme sayısı</p><strong>{formatCount(stats.ratings)}</strong><span>{live ? "Yıldız verenler · mağaza verisi" : "Yıldız verenler · demo"}</span></div>
      <div><p>İndirme fiyatı</p><strong>{formatPrice(app, country)}</strong><span>Uygulama içi alımları kapsamaz</span></div>
      <div><p>Sürüm</p><strong>{stats.version || "Veri yok"}</strong><span>{live ? "Kaynakta bildirilen sürüm" : "Örnek sürüm bilgisi"}</span></div>
    </section>
    <div className="detail-columns">
      <section className="panel history-panel">
        <div className="section-heading"><div><p className="eyebrow">ZAMAN İÇİNDE</p><h2>Değerlendirme geçmişi</h2></div><label className="select-wrap"><select aria-label="Geçmiş aralığı" value={historyDays} onChange={e => setHistoryDays(Number(e.target.value))}><option value="7">{live ? "Son 7 gün" : "7 örnek gün"}</option><option value="14">{live ? "Son 14 gün" : "14 örnek gün"}</option></select><ChevronDown size={13} /></label></div>
        <div className="chart-label"><span className="chart-legend" /> Değerlendirme sayısı <span className="demo-tag">{live ? "GERÇEK GÖZLEM" : "SENTETİK"}</span></div>
        {history.length >= 2 ? <>
          <svg viewBox="0 0 744 224" className="history-chart" role="img" aria-label={live ? `${history.length} gerçek gözlem; ${formatCount(minimum)} ile ${formatCount(maximum)} arasında değerlendirme sayısı` : `${historyDays} örnek gün boyunca ${formatCount(minimum)} değerinden ${formatCount(maximum)} değerine yükselen sentetik değerlendirme sayısı`}>
            <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6157e8" stopOpacity="0.16" /><stop offset="100%" stopColor="#6157e8" stopOpacity="0" /></linearGradient></defs>
            {[48, 91, 134, 178].map(y => <line key={y} x1="52" x2="704" y1={y} y2={y} stroke="#e9ecf3" strokeDasharray="4 5" />)}
            <text x="0" y="52">{formatCount(maximum)}</text><text x="0" y="182">{formatCount(minimum)}</text>
            <polygon points={`52,178 ${points} 704,178`} fill="url(#chart-fill)" /><polyline points={points} fill="none" stroke="#6b5ce7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {history.map((h, i) => i === 0 || i === history.length - 1 || i === Math.floor(history.length / 2) ? <text key={`${h.date}-${i}`} x={52 + i / (history.length - 1) * 652} y="216" textAnchor={i === 0 ? "start" : i === history.length - 1 ? "end" : "middle"}>{h.date}</text> : null)}
          </svg>
          <details className="chart-table"><summary>{live ? "Gözlemleri tablo olarak göster" : "Örnek değerleri tablo olarak göster"}</summary><table><thead><tr><th>Tarih {live ? "" : "(demo)"}</th><th>Değerlendirme sayısı</th></tr></thead><tbody>{history.map((h, i) => <tr key={`${h.date}-${i}`}><td>{h.date}</td><td>{h.count.toLocaleString("tr-TR")}</td></tr>)}</tbody></table></details>
        </> : <div className="empty-state compact-empty"><CalendarDays size={27} /><h3>Henüz geçmiş oluşmadı.</h3><p>{live ? "Değişim göstermek için aynı bağlamda en az iki gözlem gerekiyor. İlk kayıt alındı; geçmiş sonraki çekimlerle oluşacak." : "Bu örnekte değerlendirme verisi bulunmuyor."}</p></div>}
        <p className="small-note">{live ? "Yalnızca aynı mağaza, ülke, dil ve kaynaktaki gözlemler karşılaştırılır. Eksik tarihler doldurulmaz." : "Grafik, görünümü denemen için hazırlanmıştır. Gerçek bir uygulamanın geçmişi değildir."}</p>
      </section>
      <aside className="panel data-card"><span className="data-card-icon"><ShieldCheck size={25} /></span><h2>Verinin arkasını gör.</h2><p>Her ölçümün kaynağı ve bağlamı görünür olmalı.</p><dl>
        <div><dt>Kaynak</dt><dd>{live ? `Apify · ${observation?.source === "aurelix" ? "Aurelix" : observation?.source === "subimpact" ? "Subimpact" : "Veri yok"}` : "Sentetik demo"}</dd></div>
        <div><dt>Ülke</dt><dd>{country === "TR" ? "Türkiye" : "ABD"}</dd></div>
        <div><dt>Mağaza</dt><dd>{app.store === "ios" ? "App Store" : "Google Play"}</dd></div>
        <div><dt>Gözlem</dt><dd>{live ? formatObservedAt(observation?.observedAt ?? null) : "Yapılmadı"}</dd></div>
        {live && <div><dt>Verinin alınması</dt><dd>{formatObservedAt(observation?.collectedAt ?? null)}</dd></div>}
        {live && app.store === "play" && <div><dt>Yükleme göstergesi</dt><dd>{observation?.installsText ?? "Veri yok"}</dd></div>}
      </dl><div className="info-note"><Info size={16} /><span>{live ? "Gelir ve aylık indirme tahmini sunulmaz. Yükleme göstergesi varsa dönemsel indirme sayısı değildir." : "Gelir veya gerçek indirme sayısı bu örnekte sunulmuyor."}</span></div></aside>
    </div>
    <section className="panel about-app"><p className="eyebrow">YAKINDAN TANI</p><h2>{app.tagline}</h2><p>{app.description}</p><div className="app-tags"><span>{app.category}</span><span>{stats.free === true ? "Ücretsiz indirme" : stats.free === false ? "Ücretli indirme" : "Fiyat durumu bilinmiyor"}</span><span>{live ? "Gerçek mağaza kaydı" : "Demo içerik"}</span></div></section>
  </>;
}
