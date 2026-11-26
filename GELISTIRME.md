# AppRadar geliştirme takibi

Kullanıcı 25 Kasım 2026 tarihinde analiz ve uygulama planını onayladı; adımları
sırayla geliştirme ve kısa sonuç bildirme talimatı verdi. Her adımda tekrar onay
istenmez. Erişim/bütçe eksikliği ve gerçek test sonuçları gizlenmez.

## Güncel veritabanı görevleri — 26 Kasım 2026

- **T1 WORKING:** canonical/context kimlik ile run bazlı observation kimliği
  ayrıldı; normalize v2 ve v1 journal okuma uyumluluğu var. 78 ağsız test geçti.
- **T2 WORKING (yerel):** dört katalog tablosunun migration ve SQL testleri eklendi;
  `supabase/README.md` kapsam ve yerel doğrulama komutlarını içerir.
  Canlı Supabase projesi/bağlantısı, veri aktarımı veya Auth açılmadı.
- T2 doğrulama: PGlite 0.6.0 / PostgreSQL 19.0 bellek içi temiz kurulumda
  **62 SQL assertion + 21 gerçek redakte fixture örneğinin normalize→SQL kaydı**
  geçti; tüm test verisi rollback edildi. Bu, hosted Supabase/PostgREST testi
  değildir. Projeye test motoru bağımlılığı eklenmedi; geçici klasörde çalıştı.
- `npm test`: **78/78**; typecheck, lint, build:poc ve Next.js üretim build
  başarılı. `.poc/state.json` ve `.poc/plan.json` hash'leri değişmedi.
- T2 yalnızca katalog çekirdeğidir. Job/run/bütçe T3, snapshot yazıcısı ve
  güncel alan birleştirme T4, katalog okuma bağlantısı T8 olarak ayrı kalır.
- Sonraki göreve otomatik geçilmez; güncel kullanıcı talimatı gereği aşama
  tamamlandığında onay beklenir. Aşağıdaki eski POC kayıtları tarihseldir;
  bugünkü Actor destek durumu `APPRADAR.md` ve fixture'larla değerlendirilir.

## Onaylı başlangıç kararları

- Hedef: bağımsız geliştirici/küçük ürün ekibi için Türkçe responsive web.
- POC: App Store + Google Play; TR + US; her mağazadan 10 uygulama.
- İlk sürüm: e-posta ile giriş, keşfet, detay, kişisel takip, geçmiş, temel yönetim.
- Karşılaştırma, yorum analizi, ödeme ve bildirimler sonraki fazda.
- POC tüketim tavanı: 5 USD. Aylık altyapı/üretim bütçesi belirlenmedi.
- Gerçek gelir/aylık indirme tahmini yok; eksik değer sıfıra çevrilmez.
- Ücretli toplama güvenli varsayılanla kapalı. Hak/erişim ve hesap fiyatı
  doğrulanmadan otomatik açılmaz. Anahtarlar sohbete veya Git'e eklenmez.
- Hosting ve Supabase bölgesi henüz seçilmedi; kaynak oluşturulmadı.
- Üretim şeması ve canlı veri bağlantısı, gerçek POC destek matrisinden sonra kesinleşir.
- **26 Kasım kullanıcı yönlendirmesi:** uygulamayı yerelde açıp test et. Bu
  istek doğrultusunda POC beklenmeden açıkça etiketlenmiş sentetik demo
  arayüzü geliştirildi. Gerçek veri/üretim kapıları geçmiş sayılmaz.

## İş parçaları

| No | İş | Durum | Kabul |
|---|---|---|---|
| 1 | Kapsam ve karar kaydı | Tamamlandı | Bu belgedeki kararlar kayıtlı |
| 2 | Sağlayıcı sözleşmeleri ve test matrisi | Hazırlık tamamlandı | Gerçek OpenAPI/input ve fiyat kayıtlı; çıktı alanları canlı POC bekliyor |
| 3a | Yerel POC aracı ve güvenlik kontrolleri | Tamamlandı | Dry-run, normalizasyon, bütçe, devam etme: 35 yerel test |
| 3b | Gerçek veri POC'si | Token doğrulandı; kullanım dayanağı bekliyor | Kullanım dayanağı, iki çekim ve gerçek maliyet |
| 4 | Next.js uygulama iskeleti | Yerel demo tamamlandı | Typecheck/lint/Next.js build; localhost:3000 |
| 5 | Supabase Auth, şema ve RLS | Bekliyor | Temiz kurulum ve iki kullanıcı izolasyonu |
| 6 | Snapshot veri kaydı | Bekliyor | İdempotency ve eski gözlem koruması |
| 7 | Kuyruk, Cron ve bütçe | Bekliyor | Hata toparlama ve atomik maliyet rezervasyonu |
| 8 | Tasarım sistemi ve keşfet | Yerel demo tamamlandı | Responsive arama/filtre/sıralama/sayfalama |
| 9 | Detay, takip ve geçmiş | Yerel demo tamamlandı | Sentetik detay/geçmiş; ülke bazlı localStorage takip |
| 10 | Yönetim ve hesap işlemleri | Yerel kaynak/ayar ekranı hazır | Auth/RLS ve gerçek hesap silme hâlâ bekliyor |
| 11 | Pilot ve yayın hazırlığı | Bekliyor | Ölçülen pilot, güvenlik, maliyet ve izin kapıları |

## Devam kuralı

Sıradaki tamamlanmamış işten devam et. Fixture testini canlı sağlayıcı testi
sayma; POC geçmeden üretim hazır veya kaynak doğrulandı ifadesini kullanma.
Her işin sonucunu bu dosyada güncelle. Kullanıcıya en fazla birkaç cümlelik
sonuç ver; ayrıntılar depoda kalsın.

## Son doğrulama ve sıradaki iş

- `npm run check`: typecheck, lint, 35 ağsız test ve TypeScript build başarılı.
- `npm run poc:plan`: 76 iş; 160 detay gözlemi; 3.80 USD muhafazakâr run
  rezervasyon tavanı, 5 USD onaylı POC bütçesi.
- `npm run poc:report`: canlı veri yokken `AWAITING_LIVE_DATA`; başarı veya
  sıfır gerçekleşen maliyet iddia edilmez.
- Gerçek actor çalışması: **yapılmadı**. Veritabanı/migration/deploy: yapılmadı.
- Kullanıcının eklediği `APIFY_TOKEN` kimlik doğrulamalı GET ile kontrol edildi;
  çalışıyor, hesap planı FREE. İki actor'ın sabit build ve fiyat metadata'sı
  da okunabildi. Erişim incelemesi: `docs/POC-ERISIM.md`.
- Sıradaki iş **3b**: gerçekten doğrulanmış POC veri kullanım dayanağı.
  `POC_DATA_USE_CONFIRMED` ve toplama ayarı hâlâ false. Kullanıcıya doğrulama
  durumu soruldu; yanıt gelmeden doğrulanmış gibi işaretleme. Tokenı tekrar
  isteme veya sohbette gösterme.
- Erişim hazır olunca ilk turu çalıştır, ham/normalize eşlemeyi incele; ikinci
  turu ayrı zamanda al. Raporu gerçek fatura/ücret olaylarıyla uzlaştır.
- Ticari gösterim/saklama hakkı ve üretim aylık bütçesi hâlâ doğrulanmadı.
- POC geçmeden canlı veri, üretim şeması, hesap yönetimi ve yayını tamamlandı sayma.

## Yerel demo — 26 Kasım 2026

- `npm run dev`: `http://127.0.0.1:3000/explore` adresinde çalışır.
- Next.js 16.4.6, React 19.3.1, Tailwind 4.3.5; sürümler lockfile'da sabit.
- `npm run typecheck`, `npm run lint`, 41 test, Next.js üretim build ve
  `npm run build:poc` başarılı. Sandbox'ta Turbopack'ın yerel IPC port izni
  gerektiğinden üretim derlemesi uygun izinle doğrulandı.
- Tarayıcıda arama + mağaza filtresi, birleşik kategori/fiyat filtresi, kart
  görünümü, boş sonuç, takip ekleme/kaldırma, reload sonrası kalıcılık, TR/US
  takip ayrımı ve 14 örnek günlük geçmiş seçimi doğrulandı.
- 360, 390, 768, 1024 ve 1440 px görünümde yatay sayfa taşması yok.
- 46 tarayıcı build dosyasında gerçek token aranıp bulunmadığı doğrulandı;
  token değeri çıktıya yazılmadı.
- Gerçek Apify actor, Supabase kaynağı, migration veya deploy çalıştırılmadı.
- Yerel demoyu açmak için kullanıcıdan POC izin ayarı istenmez. Gerçek veri
  bağlantısına geçerken açık kalan kaynak doğrulaması ayrıca ele alınır.
