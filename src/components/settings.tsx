"use client";
import { useState } from "react";
import { Database, Bookmark, FlaskConical, CheckCircle2, Laptop } from "lucide-react";
import { useWatchlist } from "../hooks/use-watchlist";
import { Button } from "./ui/button";
import { useCatalog } from "./catalog-provider";

export function Settings() {
  const watchlist = useWatchlist();
  const catalog = useCatalog();
  const demo = catalog.mode === "demo";
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  return <><div className="page-heading"><div><p className="eyebrow">KENDİ ÇALIŞMA ALANIN</p><h1>Ayarlar</h1><p className="page-description">Yerel çalışma alanını ve tarayıcıda saklanan takiplerini yönet.</p></div></div><div className="settings-grid"><section className="panel settings-card"><span className="settings-icon"><FlaskConical size={23} /></span><h2>Özgürce dene.</h2><p>{demo ? "Bu sürüm örnek uygulama ve ölçümlerle çalışır." : "Katalog, Apify üzerinden alınmış gerçek mağaza kayıtlarını kullanır."} Giriş gerekmez; takiplerin bu tarayıcıda kalır.</p><div className="setting-row"><span><Laptop size={17} /> Çalışma ortamı</span><strong>{demo ? "Yerel demo" : "Yerel araştırma"}</strong></div><div className="setting-row"><span><Database size={17} /> Veri kaynağı</span><strong>{catalog.sourceLabel}</strong></div><div className="setting-row"><span><Bookmark size={17} /> Takip kaydı</span><strong>{watchlist.temporary ? "Geçici oturum" : "Bu tarayıcı"}</strong></div></section><section className="panel settings-card"><span className="settings-icon"><Bookmark size={23} /></span><h2>Takip listem</h2><p>{watchlist.items.length} uygulama–ülke takibi kayıtlı. Takiplerin bu tarayıcıda tutulur; farklı cihazlarla eşitlenmez.</p><div className="reset-area">{confirmClear ? <><p>Bu tarayıcıdaki tüm takipler silinsin mi?</p><div className="button-row"><Button variant="outline" onClick={() => setConfirmClear(false)}>Vazgeç</Button><Button onClick={() => { watchlist.clear(); setConfirmClear(false); setCleared(true); }}>Evet, temizle</Button></div></> : <Button variant="outline" disabled={!watchlist.items.length} onClick={() => { setConfirmClear(true); setCleared(false); }}>Takip listemi temizle</Button>}{cleared && <p className="success-message" role="status"><CheckCircle2 size={16} /> Takip listen temizlendi.</p>}</div></section></div></>;
}
