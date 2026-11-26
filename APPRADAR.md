# AppRadar — Ürün ve Geliştirme Şartnamesi

Sürüm: 1.0 • Hazırlanma: 25 Kasım 2026 • Dil: Türkçe

**Uygulama durumu (25 Kasım 2026):** Kullanıcı analiz ve aşamalı uygulama planını
onayladı; adımların sırayla geliştirilmesini ve kısa sonuç bildirilmesini istedi.
Tekrar plan onayı gerekmez. Güncel kararlar, iş parçaları ve gerçek doğrulama
durumu `GELISTIRME.md` içinde tutulur. Canlı POC, bütçe ve ticari kullanım kapıları
bu onayla test edilmiş sayılmaz.

**26 Kasım 2026 kullanıcı yönlendirmesi:** Önce uygulamayı yerelde açıp test et.
Bu doğrultuda gerçek POC beklenmeden sentetik verileri açıkça etiketleyen yerel
demo arayüzü geliştirilebilir. Bu yönlendirme gerçek veri, lisans, RLS veya
üretim yayını kapılarının geçildiği anlamına gelmez; yerel test bu kapılara
bağlanarak engellenmez. Güncel yerel kurulum `README.md` içindedir.

**Belgenin amacı:** AppRadar'ın ürün sınırlarını, veri gerçekliğini, mimarisini ve kabul kapılarını tek dosyada tanımlamak. Bu dosya bir AI coding agent'a doğrudan verilebilir. Bu belgenin teslim edilmesi uygulama kodlamasının, ücretli API çalıştırılmasının veya yayına almanın onaylandığı anlamına gelmez.

## 1. AI coding agent için zorunlu başlangıç talimatı

**Önce analiz ve plan; açık kullanıcı onayından sonra kodlama.**

1. Bu dosyayı tamamen oku. Mevcut repository varsa talimatlarını, bağımlılıklarını ve mevcut uygulamayı salt okunur incele. Yeni proje varsa bunu belirt.
2. Kesin kararlar, öneriler, varsayımlar ve doğrulanmamış noktalar için ayrı bir özet hazırla. Eksik konuşma içeriğini bildiğini iddia etme.
3. Ürün kapsamı, veri yeterliliği, mimari, veri modeli, RLS, ekranlar, maliyet ve test planını analiz et. Riskleri somut etkileriyle anlat.
4. POC için örneklem, gerçek actor input/output sözleşmesi, maliyet tavanı, gerekli erişimler ve geçme/kalma eşiklerini sun.
5. Aşamaları, yapılacak dosya/değişiklik gruplarını, bağımlılıkları ve kabul kriterlerini içeren uygulanabilir planı kullanıcıya sun. Bloke eden soruları tek grupta sor.
6. **“Bu analiz ve uygulama planını onaylıyor musunuz?” sorusundan sonra açık yanıtı bekle.** Onaydan önce uygulama veya POC kodu yazma, paket kurma, migration çalıştırma, kaynak oluşturma, ücretli actor çağrısı yapma ve deploy etme. Salt okunur inceleme ve plan hazırlama yapılabilir.
7. Onaydan sonra yalnızca onaylı aşamada çalış. POC başarısızsa ürünün desteklenmeyen özelliğini sessizce simüle etme; kapsam değişikliğini onaya sun.
8. Her aşamada değişiklikleri, doğrulamayı ve kalan belirsizlikleri raporla. Gerçek yapılmayan testleri başarılı gösterme. Yayına alma, ticari veri kullanım kapısı geçilmeden yapılmaz.

Bu onay gereksinimi kullanıcının açık isteğidir; isteğe bağlı bir süreç önerisi değildir.

## 2. Kaynak kapsamı ve kararların güven düzeyi

Referans: **Uygulama Önerileri Analizi**, konuşma kimliği `6b060112-1518-83ed-940c-9f1dc687675d`.

Konuşma okuma aracı beş kullanıcı mesajı döndürdü: Apify kullandıkça öde kaynaklarının yeniden araştırılması, veri kaynağının yeterliliği, 21st.dev tasarım kaynağı, Supabase seçimi ve tüm bilgileri içeren Markdown isteği. Önceki asistan cevapları yalnızca içerik referansı işaretleri olarak erişilebildi; gerçek açıklamaları okunamadı. Bu nedenle önceki konuşmanın ayrıntılı ürün hedefi veya MVP kararlarının tamamının geri kazanıldığı iddia edilmez. Güncel kullanıcı isteğinde adı geçen teknoloji ve konu başlıkları bu belgenin açık girdisidir.

Etiketler:

- **[KESİN]** Erişilebilen kullanıcı mesajı veya güncel istek ile belirlenmiştir.
- **[ÖNERİ]** Uygulanabilir bir başlangıç tasarımıdır; plan onayıyla kabul edilir veya değiştirilir.
- **[İLAN]** Sağlayıcının kamuya açık sayfasındaki beyandır; çalışır API veya sözleşmesel garanti değildir.
- **[DOĞRULANMADI]** Canlı test, hesap ekranı, lisans veya yazılı izin ile kanıtlanmamıştır.
- **[KAPI]** İlgili aşamaya geçmeden karşılanması gereken koşuldur.

| Başlık | Durum ve uygulama anlamı |
|---|---|
| Proje adı ve teslimat | [KESİN] AppRadar; tek, kapsamlı Türkçe `APPRADAR.md` |
| Platform | [KESİN] Responsive web; native mobil uygulama istenmiyor |
| Frontend yönü | [KESİN] Next.js, TypeScript, 21st.dev/shadcn/Tailwind |
| Tasarım kaynağı | [KESİN] 21st.dev incelenecek ve tasarım seçimlerinde kullanılacak; belirli bileşenler henüz seçilmedi |
| Backend | [KESİN] Supabase PostgreSQL, Auth, RLS, Cron ve Edge Functions değerlendirilecek mimarinin parçaları |
| Veri kaynakları | [KESİN] Apify Subimpact ve Aurelix bağlantıları ve yeterlilikleri ele alınacak; ikisinin üretimde eş zamanlı çalışması kesin karar değil |
| Fiyat yaklaşımı | [KESİN] PAYG ile platform minimumu ayrı açıklanacak; ücretsiz üretim varsayılmayacak |
| Veri dürüstlüğü | [KESİN] Gerçek gelir veya indirme tahmini uydurulmayacak |
| Uygulama başlangıcı | [KESİN] Kodlama öncesi analiz ve plan onayı gerekiyor |
| Persona, ilk ülkeler, kategoriler, özellik sınırları | [ÖNERİ] Aşağıdaki taslak; önceki sohbetten doğrulanmış karar sayılmaz |
| Hosting, kullanıcı ücretlendirmesi ve bütçe | [DOĞRULANMADI] Henüz seçilmedi |

## 3. Ürün hedefi ve değer önerisi

**[ÖNERİ — eksik önceki içerik yerine hazırlanmış çalışma tanımı]** AppRadar, App Store ve Google Play uygulamalarını keşfetmek, mağazada gözlenebilen göstergelerle karşılaştırmak ve zaman içindeki değişimlerini izlemek isteyen bağımsız geliştiriciler, ürün araştırmacıları ve küçük ürün ekipleri için bir araştırma panelidir.

Temel soru: “Hangi uygulamalar ve kategoriler araştırmaya değer, gözlenen sinyaller ne söylüyor ve hangi veriler elimizde yok?”

Ürün; arama, liste/sıralama, uygulama detayları, favoriler ve zaman içinde toplanan snapshot'lar üzerinden bu soruya yardımcı olur. Pazarın tamamını kapsadığını, kesin ticari başarı öngördüğünü veya rakiplerin gerçek cirosunu bildiğini söylemez. “Fırsat” ifadesi bir araştırma hipotezidir; doğrulanmış kazanç değildir.

Önerilen başarı göstergeleri: kullanıcıların aramadan detay sayfasına geçebilmesi, takip listesi oluşturabilmesi, veri kaynağı/tarihini anlayabilmesi; çekim başarısı, zorunlu alan doluluğu, veri tazeliği ve başarılı benzersiz snapshot başına maliyet. Dönüşüm ve kullanıcı sayısı hedefleri henüz belirlenmedi.

## 4. MVP kapsamı ve kapsam dışı işler

### 4.1 Önerilen MVP

| Özellik | Davranış | Koşul |
|---|---|---|
| Kimlik doğrulama | Supabase Auth ile kayıt/giriş/çıkış, oturum ve hesap ekranı | Giriş yöntemi plan onayında seçilir |
| Keşfet | Mağaza, ülke, arama sözcüğü ve mevcut kategori alanlarıyla filtreleme | Önce yerel katalog; yeni çekimler kontrollü kuyruk |
| Uygulama listesi | Sayfalama, desteklenen alanlarda sıralama, kaynağı ve tazeliği gösterme | Sonuç sayısı tüm pazarın büyüklüğü değildir |
| Detay | Kimlik, açıklama, mağaza bağlantısı, fiyat/para birimi, puan/sayılar, görseller ve kaynak | Yalnızca gerçekten mevcut alanlar |
| Takip listesi | Kişiye özel favoriler ve takipten çıkarma | RLS ile kullanıcı izolasyonu |
| Değişim görünümü | Puan, değerlendirme sayısı ve varsa liste sırası geçmişi | En az iki karşılaştırılabilir gözlem |
| Karşılaştırma | En fazla 3 uygulamanın aynı bağlamdaki alanları | [ÖNERİ] MVP süresine göre ikinci faza taşınabilir |
| Yönetim | Kaynak, çekim durumu, hata, kota/bütçe ve tazelik takibi | Yalnızca yetkili yönetici |

### 4.2 MVP dışında

Gerçek gelir/aylık indirme tahmini, DAU/MAU, retention, churn, CAC/LTV, reklam harcaması, kesin pazar payı, garantili fırsat puanı, tüm mağazaların eksiksiz taranması, native uygulama, otomatik yatırım önerisi, ödeme/abonelik sistemi, ekip çalışma alanları, dışa açık API ve toplu veri satışı kapsam dışıdır. Yorum analizi, e-posta bildirimleri, CSV dışa aktarım, gelişmiş ASO ve yapay zekâ özetleri sonraki faz önerileridir; veri izinleri ve ek maliyetleri ayrıca doğrulanır.

## 5. Apify veri kaynakları ve doğrulama durumu

26 Kasım 2026: Subimpact keşif, Aurelix iOS charts/developers, TheWolves iOS yorumları, Aurelix Google Play Reviews, DataTrail iOS new-apps ve ASO Keyword Intel (popularity/difficulty) canlı API ile doğrulandı. Aurelix uygulama detayı birincil kaynaktır. **Ticari yeniden yayın izni ayrıca doğrulanmadı.**

| Aday | Bağlantılar | İlan edilen kapsam | Doğrulama durumu |
|---|---|---|---|
| Subimpact | [Actor](https://apify.com/subimpact/app-store-scraper) · [OpenAPI](https://apify.com/subimpact/app-store-scraper/api/openapi) · [Fiyat](https://apify.com/subimpact/app-store-scraper/pricing) | İki mağazada arama, uygulama detayı ve listeler; ortak JSON | **WORKING (keşif):** iOS/Play “Habit Tracker” araması ve Play Productivity Top Free doğrulandı. Keyword popularity/difficulty yok. |
| Aurelix | [Actor](https://apify.com/aurelix/app-store-google-play-scraper) · [OpenAPI](https://apify.com/aurelix/app-store-google-play-scraper/api/openapi) · [Fiyat](https://apify.com/aurelix/app-store-google-play-scraper/pricing) | Uygulama, yorum, App Store listeleri ve geliştirici sayfaları | **WORKING (detay + iOS charts + developers); PARTIAL (embedded Play reviews ~20; iOS reviews boş).** |
| TheWolves | [Actor](https://apify.com/thewolves/appstore-reviews-scraper) · [OpenAPI](https://api.apify.com/v2/acts/thewolves~appstore-reviews-scraper/builds/default/openapi.json) · [Fiyat](https://apify.com/thewolves/appstore-reviews-scraper/pricing) | Yalnızca Apple App Store kullanıcı yorumları | **WORKING (iOS reviews).** |
| Aurelix Play Reviews | [Actor](https://apify.com/aurelix/google-play-reviews-scraper) · [OpenAPI](https://api.apify.com/v2/acts/aurelix~google-play-reviews-scraper/builds/default/openapi.json) · [Fiyat](https://apify.com/aurelix/google-play-reviews-scraper/pricing) | Sayfalı Google Play yorumları | **WORKING.** |
| DataTrail | [Actor](https://apify.com/datatrail/app-store-google-play-charts) · [OpenAPI](https://api.apify.com/v2/acts/datatrail~app-store-google-play-charts/builds/default/openapi.json) · [Fiyat](https://apify.com/datatrail/app-store-google-play-charts/pricing) | Apple charts + new-apps; Play new-apps yok | **PARTIAL (iOS new-apps WORKING).** |
| ASO Keyword Intel | [Actor](https://apify.com/petersutarik/aso-keyword-intel) · [OpenAPI](https://api.apify.com/v2/acts/petersutarik~aso-keyword-intel/builds/default/openapi.json) · [Fiyat](https://apify.com/petersutarik/aso-keyword-intel/pricing) | Keyword rank, autocomplete suggestions, popularity (Apple Search Popularity / proxy), difficulty | **WORKING (iOS metrics+rank):** “habit tracker” US topN=10 + popularity → 10 ranking + 1 metrics; `popularitySource=apple`, popularity=56, difficulty=72. **Aylık arama hacmi değil** (5–100 skor). Suggestions canlı koşulmadı (maliyet). PPE; kiralama yok. |

**[KARAR / uygulama]** Aurelix birincil detaydır. Subimpact uygulama araması + Play top charts. iOS yorumları TheWolves; Play yorumları Aurelix Play Reviews. iOS new-apps DataTrail. **Keyword popularity/difficulty ASO Keyword Intel** (`KeywordObservation`); Subimpact aramasının yerine geçmez. Ranking satırları katalog detayını ezmez. Top grossing gelir tutarı değildir. Gelişmiş ASO UI sonraki fazdır.

### 5.1 PAYG, actor ücreti ve platform minimumu

PAYG/kullandıkça öde, değişken tüketimin ücretlendirilmesidir. **Sıfır sabit gider**, **sınırsız ücretsiz kullanım** veya **ticari veri yeniden dağıtım izni** anlamına gelmez.

[Apify fiyat sayfası](https://apify.com/pricing) inceleme anında Free için aylık $0 ve $5 kullanım kredisi; Starter için aylık $19 ve $19 tüketim bakiyesi gösteriyordu. Bunlar sayfa beyanıdır; satın alma anındaki hesap, vergiler, plan dönemi, kredi kapsamı ve aşım koşulları yeniden kontrol edilmelidir. Free planın varlığı nedeniyle herkese zorunlu ücretli platform minimumu varmış gibi anlatma; seçilen ücretli plan varsa onun taban bedelini ayrı göster.

- **Actor tüketimi:** Sonuç/olay veya kullanım bazlı ücret. “1.000 sonuç” ile “1.000 istek” aynı değildir; bir çağrı çok sayıda ücretli olay üretebilir.
- **Platform tabanı:** Seçilen planın dönemlik bedeli. Dahil tüketim kredisi varsa aynı tüketimi iki kez maliyete ekleme.
- **Ek kalemler:** Yalnızca sözleşmede ayrıca ücretleniyorsa compute, proxy, depolama, veri transferi ve diğer olaylar. Dahil olan kalemi tekrar sayma.
- **Diğer altyapı:** Supabase, web hosting, e-posta, izleme, domain ve vergiler ayrı tutulur; fiyatları bu çalışmada doğrulanmadı.

Fiyat gözlemleri:

| Kaynak | Sayfadaki gösterim | Yorum |
|---|---|---|
| Subimpact | Başlıkta “from $0.24 / 1,000 apps”; açıklamada $0.30/1.000 uygulama | 26 Kasım 2026 canlı doğrulama: 3 koşu × 5 `app` olayı = $0.0045 (`usageTotalUsd` uzlaştırıldı). Başlangıç ücreti yok. |
| Aurelix | Başlıkta “from $0.14 / 1,000 app results”; açıklamada Free plan için $0.18/1.000 uygulama, $0.025/1.000 yorum | Charts ≈ $0.0052; developers ≈ $0.00968; reviews denemeleri ≈ $0.018 (Play: 1 app + 10 review ≈ $0.00473; iOS feed boş denemeler yalnızca start+app). |
| TheWolves | `$0.10 / 1,000 reviews` (PPE `apify-default-dataset-item` = $0.0001); kiralama yok | ChatGPT US 10 yorum: `usageTotalUsd` = $0.001 (10 × $0.0001). Free hesap: ayda ≤5 koşu, koşu başına ≤10 öğe (sayfa beyanı). |
| Aurelix Play Reviews | Free ≈ `$0.05 / 1,000` review-result + `$0.0001` app-checked + `$0.0025` actor-start; `minimalMaxTotalChargeUsd` 0.02; kiralama yok | ChatGPT US 100 newest: uzlaştırılmış `usageTotalUsd` = $0.0085 (100×review-result + start). |
| DataTrail | from `$1.20 / 1,000` apps (FREE `$0.002`/app + `$0.00005` start); PPE; kiralama yok | iOS new-free-apps US/6007: `usageTotalUsd` = $0.04405 (24×app + start). `chartLimit=10` canlıda aşılabiliyor. |
| ASO Keyword Intel | `$0.002` ranking-row · `$0.001` suggestion-row · `$0.02` metrics-row; PPE; kiralama yok | habit tracker iOS US topN=10 + metrics: `usageTotalUsd` = $0.04; `maxTotalChargeUsd=0.05` uygulandı. |

Bu tutarları ürün arayüzüne, satış vaadine veya sabit iş kuralına gömme. Aktif ücret olayları, başlangıç ücreti, başarısız çalışmanın maliyeti, tekrarlar ve platform kullanımının dahil olup olmadığı gerçek POC harcama dökümüyle doğrulanmalıdır.

### 5.2 Ticari kullanım kapısı

**[DOĞRULANMADI]** Actor'a ödeme yapmak veriyi yeniden yayınlama, saklama, satma veya görselleri ticari üründe kullanma hakkını kendiliğinden kanıtlamaz. Apify koşulları, actor lisansı/sağlayıcı koşulları, kaynak mağaza şartları, görsel hakları ve yorumların kişisel veri niteliği ayrı incelenmelidir. Bu belge hukuki uygunluk kararı vermez.

POC'nin saklama kapsamı dahil kullanım koşullarını kontrol et. Üretim öncesi saklama, kullanıcıya gösterim, türetilmiş analiz, cache, yeniden dağıtım ve silme talepleri için izin dayanağını kaydet. Belirsiz ticari yetki varsa gerekli sağlayıcı açıklamasını/uzman incelemesini tamamlamadan ilgili veriyi yayımlama. İzin verilen alan ve saklama süresi uygulama yapılandırmasına yansıtılmalıdır.

## 6. Veri sözlüğü ve veri yeterliliği

Aşağıdaki alanlar **hedef normalize şemadır; actor'ın kesin çıktı alan adları değildir.** Her alanın gerçek kaynak yolu, tipi ve platform farkı POC'de eşlenir.

| Alan grubu | Normalize alanlar | Anlam ve eksik veri davranışı |
|---|---|---|
| Kimlik | `store`, `store_app_id`, `store_url`, `bundle_id`, `package_name` | İlk üçü temel; bundle/package her mağazada aynı değildir |
| Bağlam | `country`, `language`, `source_id`, `source_run_id`, `observed_at`, `collected_at` | Ülke ve zaman karşılaştırmaların parçasıdır |
| Sunum | `name`, `description`, `icon_url`, `screenshot_urls` | Metin/görseller güvenilmeyen içeriktir; haklar ve boş durum kontrol edilir |
| Yayıncı/kategori | `developer_name`, `developer_store_id`, `categories`, `primary_category` | Eşleşmeyen kategori değerlerini ham olarak koru |
| Fiyat | `price_amount`, `currency`, `is_free`, `has_iap` | İndirme fiyatı toplam kullanım maliyeti veya abonelik fiyatı değildir |
| Değerlendirme | `rating_value`, `rating_scale`, `rating_count`, `review_count` | Yıldız veren sayısı ile yazılı yorum sayısını eşitleme |
| Mağaza bilgisi | `version`, `released_at`, `store_updated_at`, `age_rating` | Yayın tarihi, veri toplama tarihi ve güncelleme tarihi ayrıdır |
| Yükleme göstergesi | `installs_text`, `installs_lower_bound`, `installs_upper_bound` | Kaynak gerçekten verirse mağazanın gösterdiği aralık; kesin veya dönemsel indirme değildir |
| Sıralama | `rank`, `chart_type`, `category`, `country`, `store` | Arama sırası, ücretsiz liste ve hasılat listesi ayrı bağlamlardır |
| Arama kökeni | `query`, `search_rank`, `search_context_id` | Belirli aramadaki gözlem; evrensel popülerlik puanı değildir |
| Opsiyonel yorum | `source_review_id`, `rating`, `text`, `reviewed_at`, `language` | Play kapsamlı: Aurelix Play Reviews; iOS: TheWolves; MVP için zorunlu değil |
| Kalite | `field_status`, `validation_errors`, `schema_version`, `payload_hash` | Eksik, desteklenmiyor, hata ve gerçek sıfır ayrılır |

### 6.1 Kesinlikle varsayılmayacak veriler

- iOS indirme sayısı ve her iki mağazanın gerçek gelirleri: **mevcut ve doğrulanmış kabul edilmez**.
- Google Play yükleme aralığı varsa bile aylık/yıllık indirme hızına dönüştürülmez. Aralığın değişmemesi sıfır indirme anlamına gelmez.
- Puan/değerlendirme artışından kurulum veya gelir hesaplanmaz. Liste sırasından ciro türetilmez.
- Tarihsel veri, sağlayıcı gerçekten ve izinli şekilde sunmadıkça geçmişe doğru doldurulmaz. AppRadar geçmişi ilk başarılı gözlemle başlar.
- Her ülkedeki bütün uygulamalar, anahtar kelime hacmi, rekabet skoru, aktif kullanıcı sayısı ve abonelik dağılımı bilinmiyor.
- Kullanıcı kendi uygulamasının doğrulanmış analitiğini daha sonra bağlarsa bu ayrı kaynak/türdür; herkese açık rakip verisiyle karıştırılmaz.

### 6.2 Null, karşılaştırma ve türetilmiş göstergeler

`null` bilinmeyen değerdir; `0` gerçek gözlenen sıfırdır. UI “Veri yok”, “Kaynak desteklemiyor”, “Çekim başarısız” veya “Henüz geçmiş oluşmadı” durumlarını ayırır. Eksik değerler sıralamada açık politikayla sona taşınır.

Türetilmiş metrikler yalnızca karşılaştırılabilir iki gözlemle hesaplanır: aynı uygulama, mağaza, ülke, dil ve aynı tanım. `rating_count_delta = yeni - eski`; negatif farkı gizleme, kaynak düzeltmesi olabilir. Liste sırası değişimi `eski_sıra - yeni_sıra` olarak pozitifse yükseliş diye gösterilebilir. Eski değer yoksa değişim `null`; payda sıfırsa yüzde `null`. Gözlemler arası gerçek süreyi göster, günlük aralıklı çekimden saatlik kesinlik üretme. Veri boşluklarını grafik üzerinde kesinti olarak göster.

**Yeterlilik sonucu:** Bu adaylar, doğrulama kapısı geçilirse mağaza keşfi ve gözlem paneli için yeterli olabilir. Gelir/indirme istihbaratı ürünü için yeterlilik gösterilmemiştir. “Sensor Tower benzeri kesin tahmin sistemi” kapsamı vaat edilmez.

### 6.3 T1 — Kimlik ve zaman sözleşmesi (normalize v2)

Yeni normalize app/review/keyword kayıtları `schemaVersion: 2` kullanır.
Canonical kimlik ile run bazlı `idempotencyKey` ayrıdır:

- App: `canonicalAppKey`, mağaza + mağaza uygulama kimliğinden türetilir.
  Observation anahtarı kaynak/run, canonical app, ülke, istenen/efektif dil,
  detail/discovery rolü ve mod/query/chart/kategori/developer bağlamını içerir.
- Review: `canonicalReviewKey`, mağaza + app ID + `reviewIdNamespace` + yorum
  kimliğidir. Doğrulanmış ortak mağaza namespace'i yoktur; her Actor kendi
  `actor:<slug>` namespace'ini kullanır. Observation anahtarı canonical review,
  run, ülke ve istenen/efektif dilden oluşur. Metin benzerliği eşleştirme değildir.
- Keyword: `keywordContextKey`, mağaza/keyword/ülke, dil bağlamı, build ve satır
  türüyle sürümlenen `measurementMethod`, ilgili filtreler ve metrics için
  Apple/proxy/unknown kaynak ayrımını korur. Observation anahtarı ayrıca run,
  satır türü ve ranking app ID veya suggestion metnini içerir. Değişen rank,
  puan veya metrik değeri aynı run'ın kimliğini değiştirmez.

`observedAt` gözlem, `collectedAt` sistemin alma zamanıdır. Kaynak gözlem zamanı
yoksa collection fallback'i `observedTimeBasis` ile işaretlenir. Eksik
`reviewedAt`, `releasedAt`, `listingUpdatedAt` ve keyword `measuredAt` null kalır.
Keyword `checkedAt` gözlem; `measuredAt` upstream metriğin ölçüm zamanıdır.
DataTrail'in yalnızca gün verdiği tarihler ISO taşıma değerine dönüştürülürken
`releasedAtPrecision` / `listingUpdatedAtPrecision = date` ile işaretlenir;
gece yarısı kesin yayın saati olarak yorumlanmaz. ASO dil girdisi desteklemez:
`requestedLanguage` isteğin bağlamıdır, `language` null ve
`languageInputSupported` false kalır.

Eski journal zarfı `version: 1` korunur; kayıtların `schemaVersion: 1` veya `2`
olması ayrı kavramdır. Eski anahtarlar okunurken değiştirilmez, eksik keyword
filtreleri tahmin edilmez. v1 yorumda `observedTimeBasis=collection` ise eski
`reviewedAt` kaynak yorum tarihi olarak kullanılamaz. T2 aktarımı v1/v2 sürümünü
açıkça ayırmalı; tam bağlam olmadan v1'i canonical v2 kayıt saymamalıdır.
Job kimlikleri, Actor girdileri, rezervasyonlar ve checkpoint'ler değişmez;
tamamlanmış iş yeni sözleşme nedeniyle yeniden ücretli çağrıya dönüşmez.
Bu görev Supabase kurulumu, migration, toplama sıklığı veya saklama kararı içermez.

### 6.4 T2 — Katalog çekirdeği DDL

`supabase/migrations/20261126000100_catalog_core.sql`, PostgreSQL 15+ için
developers/apps/app_listings/app_snapshots tablolarını tanımlar. Mağaza bazlı
kimlikler, ülke/istenen dil listing anahtarı, aynı listing'e ait latest pointer,
immutable v2 snapshot ve run/bağlam idempotency SQL ile korunur. Kaynak/run/build
alanları saklanır; `provider_runs` FK'si T3'e bırakılmıştır. RLS açıktır; istemci
erişimi varsayılan olarak kapalıdır. Server grant'leri kimlik güncelleme
ve snapshot UPDATE yetkisi vermez. Saklama süresi varsayılmaz; expires_at açık
ve sonlu girilir. Güncel alanların kaynak/tarih bazlı birleştirilmesi T4'tür.

SQL testleri ve geçici PostgreSQL motoruyla doğrulama aracı
`supabase/tests/` altındadır. Ayrıntılar `supabase/README.md` içindedir.
Bu dosyaların hazırlanması canlı Supabase projesi oluşturulduğu, migration'ın
canlıya uygulandığı, v1 verilerin aktarıldığı veya katalog bağlantısının değiştiği
anlamına gelmez. Toplama/API/normalizasyon kodu T2'de değiştirilmez.

### 6.5 T2.1 — Provider run ilişkisi ve sunum metadata (karar)

**Tablo adı:** standart ad `provider_runs`. Kavramsal modeldeki eski `source_runs`
adı kullanılmaz; T3 DDL ve kod bu adı izler.

**Mevcut snapshot durumu (T2):** `app_snapshots.source` + `source_run_id` dış
Apify run kimliğini tutar (`NOT NULL`, `^[A-Za-z0-9]+$`); `(source, source_run_id)`
indekslidir. Geçici/stub run tablosu yoktur. Snapshot UPDATE yasaktır.

**T3 ilişki stratejisi (onaylı yön):**

1. `provider_runs` iç kimlik (`id` UUID) ile açılır. Harici Actor run ID
   (`external_run_id`) Actor yanıtı gelene kadar `NULL` olabilir; deneme
   kaydı ID oluşmadan önce yazılabilir.
2. `(provider, external_run_id)` için varsayılan PostgreSQL `UNIQUE`
   (`NULLS DISTINCT`): birden çok bekleyen denemede birden çok `NULL`
   dış kimlik serbesttir; bilinen dış ID tekildir.
3. Snapshot satırları yalnızca dış run ID bilindikten sonra yazılır (mevcut
   `source_run_id NOT NULL` ile uyumlu). Bileşik FK
   `app_snapshots (source, source_run_id) → provider_runs (provider, external_run_id)`
   T3'te, `provider_runs` oluşturulup mevcut distinct `(source, source_run_id)`
   çiftlerinden geri doldurulduktan sonra eklenir.
4. Snapshot satırlarına UUID eklenmez; mevcut gözlemler yeniden yazılmaz.
   Geri doldurma yalnızca `provider_runs` insert'idir.
5. Snapshot değişmezliği korunur; FK ekleme UPDATE tetiklemez.

**Bileşik FK güvenliği:** Snapshot tarafında dış ID her zaman dolu olduğu için
bileşik FK tamamlanmış gözlemler için güvenlidir. Pre-Actor denemeler
yalnızca `provider_runs` üzerinde yaşar; snapshot'a nullable UUID kolonu
eklemek alternatif olurdu ama gereksiz rewrite riski taşır — **onaysız
uygulanmaz**. Alternatif gerekirse onay beklenir.

**T3 migration sırası:** `provider_runs` → distinct snapshot çiftlerinden
backfill → bileşik UNIQUE/FK → writer her snapshot insert öncesi
`provider_runs` upsert. Job/bütçe tabloları aynı T3 diliminde gelir.

**Sunum metadata (T4'e kayıt; bu görevde implement yok):**

| Alan | API | Normalize `Observation` | Kayıp noktası | Hedef DB |
|---|---|---|---|---|
| Description | DataTrail `includeDescription` ile opsiyonel; Aurelix/Subimpact POC şemasında parse edilmiyor; canlı redakte örneklerde yok | Yok | Zod + `redactedSample` allowlist `description` tutmuyor | `app_listings` (güncel); snapshot'ta tekrarlanmaz |
| Icon URL | Actor çıktısında görülebilir (doküman/hedef sözlük); POC Zod/fixture'da yok | Yok | Allowlist dışı; UI yer tutucu ikon | `app_listings.icon_url` (T4) |
| Screenshot URLs | Hedef sözlükte var; POC Zod/fixture'da yok | Yok | Allowlist dışı | `app_listings.screenshot_urls` (T4) |

Bu alanlar tarihsel `app_snapshots` metrik satırında kopyalanmaz. T4:
normalize genişletme, listing kolonları, provenance birleştirme ve hak/boş
durum kontrolü. Ticari görsel kullanım dayanağı ayrıca doğrulanmadan
yayımlanmaz.

### 6.6 T3 — İş, provider run ve bütçe

`supabase/migrations/20261126000200_collection_budget.sql` üç tabloyu `private`
şemasına koyar: `collection_jobs`, `provider_runs`, `budget_periods`. Ayrı ledger
yoktur. Rezervasyonun hangi günlük/aylık döneme yazıldığı `provider_runs`
üzerindeki dönem FK'lerinde tutulur; böylece settlement saat dilimi değişse de
aynı satırlara döner.

**Job:** `queued → running → ingesting → succeeded|partial|failed`. `failed → queued`
aynı satırda retry'dir. `queued` ve çalışan durumlar `cancelled` olabilir.
`succeeded` / `partial` / `cancelled` terminaldir. Aynı `dedupe_key` + `scheduled_for`
ikinci işi reddeder; farklı `scheduled_for` yeni penceredir.

**Lease:** `claim_collection_job` `FOR UPDATE SKIP LOCKED` ile tek satır alır.
İlk claim `attempt_count` artırır. Süresi dolmuş `running`/`ingesting` lease
yeni token ile alınır, attempt artmaz. Aynı token ile güncelleme yalnızca
`appradar.lease_token` oturum değeri eşleşirse ve süre dolmamışsa geçer.
Eski token veya süresi dolmuş sahip, yeni worker'ın satırını değiştiremez.

**Provider run:** Actor ID'den önce `external_run_id` null olabilir. `UNIQUE
(provider, external_run_id)` varsayılan `NULLS DISTINCT`tir. `(job_id,
attempt_number)` tektir. `execution_status = unknown` yeni ücretli run insert'ini
ve yeni claim'i kapatır; rezervasyonu silmez. `validation_status` execution'dan
bağımsızdır. `truncated` satır `accepted` olamaz. Maliyet kolonları
`numeric(18,6)` ve null'dur; null bilinmeyen, 0 gerçek sıfırdır.

**Bütçe:** Dönem sınırları UTC `date_trunc` gün/ay, `[start, end)`. Limit
migration'da yoktur; dönem satırı yoksa reserve `budget_not_configured` döner.
Reserve günlük sonra aylık satırı kilitler; biri aşılırsa ikisi de artmaz.
Aynı run ve aynı tutar ikinci reserve no-op'tur. Settle reserved tutarı düşer,
`spent` gerçek tutar kadar artar (limit üstüne çıksa da kısılmaz) ve yalnız
reserve anındaki dönemlere yazılır. Release yalnız reserved'ı geri alır.
`cost_status = unknown` veya `execution_status = unknown` iken release/settle
rezervasyonu tutar. Başarısız fonksiyon exception'ı transaction'ı geri alır.

**FK:** Boş katalogda `app_snapshots (source, source_run_id) → provider_runs
(provider, external_run_id)` eklenir. Snapshot satırı varsa ve eşleşen run yoksa
migration uydurma backfill yapmadan durur. Snapshot UPDATE hâlâ kapalıdır.

**T4 bağımlılığı:** Snapshot insert'ten önce dış ID dolu provider run gerekir.
Ücretli çağrıdan önce reserve, sonuç belli olunca settle veya release çağrılır.
Unknown start/cost release edilmez. Journal import ve worker bu adımda yoktur.

### 6.7 Paket 1 — Kalıcılık (T4–T7)

Migration'lar `20261126000300_app_persistence` … `000600_keywords`; servisler
`src/lib/persistence/`. Her veri kümesi tek SQL fonksiyonuyla (`SECURITY INVOKER`,
yalnızca `service_role`) koşu bazında atomik yazılır. `expires_at` çağırandan gelir;
saklama süresi seçilmedi. Worker'a bağlanmadı; journal içeri aktarılmadı.

### 6.8 Geliştirme veritabanı — 26 Kasım 2026

Altı migration, boş Supabase geliştirme projesine (Tokyo session pooler, PostgreSQL 17.12) sırayla uygulandı. Uygulanan sürümler `appradar_meta.schema_migrations` içindedir; bu şema istemciye açık değildir. 13 tablo, snapshot→provider run FK ve persist/claim/bütçe fonksiyonları yerinde. Anon ve authenticated bu tablolara ve fonksiyonlara erişemez.

İki ayrı oturumda: eşzamanlı claim tek işi verdi; limit 1 iken ikinci rezervasyon reddedildi ve bakiye 1 kaldı; aynı run için ikinci reserve/settle bakiyeyi değiştirmedi; süresi dolmuş lease ve eski token reddedildi; unknown run yeni insert ve claim açmadı. T4–T7 sentetik testi transaction içinde rollback oldu. Sentetik iş, bütçe ve katalog satırı kalmadı. Otomatik toplama açılmadı. T8 başlatılmadı.

- **Kabul:** `execution_status = succeeded` ve `validation_status = accepted`.
  Yalnızca discovery ve keyword listeleri `truncated` koşuyu kapsam etiketiyle kabul eder.
- **Güncel alan önceliği (T4):** Aurelix detay > diğer detay > discovery; eşitlikte
  yeni gözlem. Null ezmez; fiyat grubu atomiktir. Daha iyi bir `is_free` tutarla
  çelişirse tutar/para birimi bilinmeyene döner.
- **Yorum geçmişi (T6):** ülke/dil bağlamında yalnızca içerik değişince yeni satır;
  aynı içerikte `last_seen_at`/`expires_at` ilerler.
- **Replay:** yazılmış discovery/keyword snapshot'ı değiştirilmez; farklı içerik `conflicts` sayılır.
- **Sunum metadata (doğrulanmadı):** DataTrail `description`/`iconUrl`/`screenshots`,
  Aurelix `icon_url`/`screenshots` herkese açık belgelerden alındı; sabit build'in canlı
  çıktısıyla doğrulanmadı. Subimpact ve Aurelix description işlenmiyor.
- **Doğrulama:** geçici yerel PostgreSQL 16'da tüm migration'lar ve `supabase/tests/*.sql`
  ile `tests/persistence.test.ts` geçti. Çalıştırılmayan: PGlite runner, PostgREST/Supabase,
  çok oturumlu eşzamanlılık, mevcut test paketi, typecheck, lint, build.

## 7. Kodlamadan sonraki ilk teknik aşama: POC doğrulama kapısı

POC kodu da Bölüm 1'deki plan onayından sonra yazılır. Aşağıdaki eşikler öneridir ve onaylı plana alınmalıdır.

### 7.1 Örneklem ve kanıt paketi

- İki sağlayıcıyı aynı sabit kimlikler üzerinde dene: önerilen toplam 20 uygulama, iki mağazadan 10'ar; ücretsiz/ücretli ve farklı popülerlik düzeyleri.
- Önerilen iki ülke TR ve US; kesin hedef ülke kararı değildir. Desteklenmeyen ülkeyi sessizce başka ülkeye yönlendirme.
- Her mağazada detay ve anahtar kelime aramasını; ilan edilen liste türlerini ve kategori desteğini ayrı test et. Bir modun geçmesi diğerinin geçtiği anlamına gelmez.
- Aynı örneklemi iki farklı zamanda tekrar al. İki çekim bir günlük geçmişi kanıtlamaz; yalnızca snapshot akışını sınar.
- En az üç negatif vaka: geçersiz kimlik, eksik/boş alan, erişilemeyen sonuç. Kota, timeout ve 429 davranışını kontrollü test veya fixture ile sınayıp hangisinin gerçek olduğunu yaz.
- Yorum örneklemlerini izinli saklama kapsamında tut; reviewer kimliği toplama; Play için Aurelix Play Reviews, iOS için TheWolves kullan.
- Her koşu için input, actor/build sürümü, run ID, UTC zamanlar, dataset örneği, olay sayıları, gerçek ücret, süre, hata ve normalize çıktı sakla. Tokenları kanıta koyma.

### 7.2 Geçme/kalma kriterleri

| Alan | Önerilen geçme kriteri | Başarısızlık kararı |
|---|---|---|
| Kimlik | Başarılı kayıtlarda %100 mağaza+kimlik ve bağlam doğruluğu; yanlış uygulama eşleştirmesi yok | Entegrasyon durur |
| Temel kapsam | Onaylı örneklemin en az %95'i başarılı; ad/URL/kaynak/zaman temel alanları başarılı kayıtlarda %100 | Kaynak değiştir veya kapsamı yeniden onaylat |
| Alan gerçeği | Her hedef alan için mağaza bazında doluluk ve anlam tablosu; desteklenmeyen özellikler işaretli | İlgili özellik kapatılır |
| Ücret | Hesaptaki harcama ile olay sayıları açıklanabilir; onaylı POC tavanı aşılmıyor | Yeni koşular durur |
| Tekrarlanabilirlik | İkinci çekim yeni snapshot; aynı run yeniden işlenince mükerrer kayıt yok | Veri hattı düzeltilir |
| Dayanıklılık | Eksik/bozuk sonuç tüm partiyi geçerli göstermiyor; retry sınırlı ve gözlenebilir | Üretim kapısı kapalı |
| Haklar | Kullanılacak veri ve bileşenlerin kullanım dayanağı kayıtlı | Üretim gösterimi durur |

Çıktı: destek matrisi, alan eşlemesi, ham/normalize örnekler, gerçek maliyet tablosu, açık sorunlar ve **GO / KOŞULLU GO / NO-GO** raporu. Koşullu GO yalnızca açıkça çıkarılan özelliklerle ve kullanıcı kapsam onayıyla geçerlidir. Küçük POC başarısı ölçek garantisi değildir.

## 8. Önerilen sistem mimarisi

```text
Responsive tarayıcı
  → Next.js arayüzü + kullanıcı oturumuyla sunucu işlemleri
  → Supabase Auth + PostgreSQL/RLS (okuma, favoriler)

Supabase Cron
  → yetkili dispatcher Edge Function
  → PostgreSQL iş kuyruğu / bütçe rezervasyonu
  → sağlayıcı adaptörü → Apify asenkron actor run
  → doğrulanmış callback veya kontrollü durum sorgulama
  → sayfalı dataset alımı → doğrulama → normalize snapshot
  → mevcut görünüm + geçmiş + operasyon metrikleri
```

Next.js App Router ve TypeScript strict önerilir. Salt okuma ekranları uygun yerde Server Components; filtre ve etkileşimler Client Components olabilir. Tarayıcı Apify tokenı veya ayrıcalıklı Supabase anahtarı almaz. Supabase Auth kimlik yönetir; PostgreSQL kalıcı depodur; RLS yetki sınırıdır; Cron zamanlayıcıdır; Edge Functions kısa, tekrar denenebilir orkestrasyon/işleme görevlerini yürütür. Bunlar resmi dokümantasyondaki ürün bileşenleridir; seçilen planın süre/kota sınırları uygulama öncesi kontrol edilir. [Next.js](https://nextjs.org/docs/app), [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Cron](https://supabase.com/docs/guides/cron), [Edge Functions](https://supabase.com/docs/guides/functions).

Uzun actor koşusunu açık HTTP isteği içinde bekletme. Başlat, run kimliğini kaydet, sonra tamamlanmayı işle. Edge Function sınırına sığmayan işi parçalara böl; gerekirse ayrı worker önerisini gerekçesiyle plan değişikliğine sun. Cron yalnızca işi tetikler; başlı başına garantili teslimat kuyruğu değildir.

Adaptör sözleşmesi uygulama içi tasarımdır: `startCollection`, `getRunStatus`, `readDatasetPage`, `normalizeItem`. Bunları sağlayıcının var olduğu iddia edilen API yöntemleri gibi sunma. Input/output şemasını gerçek OpenAPI ve örnek çıktılardan çıkar; bilinmeyen alanları `unknown` alıp runtime doğrula.

## 9. Önerilen PostgreSQL veri modeli

Tüm operasyon zamanları `timestamptz`/UTC; kullanıcıya gösterimde yerelleştirme. Varlık anahtarları UUID, yüksek hacimli listing/snapshot anahtarları `bigint identity`; mağaza kimlikleri metin. Fiyatlar floating point değil `numeric`; büyük sayımlar `bigint`. Ülke ve dil ayrı alanlar. Aşağıdaki model kavramsaldır; uygulanmış T2 alt kümesi ve migration sınırları Bölüm 6.4'te kayıtlıdır.

| Tablo | Temel alanlar ve anahtarlar | Amaç |
|---|---|---|
| `profiles` | `id → auth.users.id`, `display_name`, `locale`, zamanlar | Özel kullanıcı tercihleri; rolü kullanıcı düzenleyemez |
| `apps` | `id`, `store`, `store_app_id`, `canonical_url`; unique `(store, store_app_id)` | Mağazaya özgü kalıcı kimlik |
| `app_listings` | `app_id`, `country`, `language`, `latest_snapshot_id`; unique üçlü | Yerelleştirilmiş güncel görünüm |
| `app_snapshots` | `id`, `listing_id`, `source`, `source_run_id`, zamanlar, normalize metrik alanlar, `field_status`, hash | Değişmez tarihsel gözlem; T2 uygulanmış alt küme Bölüm 6.4 |
| `chart_snapshots` | `id`, kaynak/run, mağaza/ülke/dil/kategori/liste türü, `observed_at`, `coverage_status` | Belirli listenin belirli andaki kapsamı |
| `chart_entries` | `chart_snapshot_id`, `app_id`, `rank`; unique snapshot+app | Uygulama sırasını uygulama detayından ayrı tutar |
| `search_observations` | `id`, run, query, mağaza/ülke/dil, zaman, sonuç kapsamı | Aramanın bağlamı |
| `search_entries` | `search_observation_id`, `app_id`, `position` | Arama sırası; liste sırasına karışmaz |
| `watchlist_items` | `user_id`, `app_id`, ülke/dil, zaman; unique bu bağlam | Kullanıcıya özel takip |
| `data_sources` | `id`, actor slug, aktif sürüm, destek matrisi, son kontrol | Kaynak yapılandırması; sırlar burada açık metin tutulmaz |
| `collection_jobs` | `id`, `dedupe_key`, tür/bağlam, durum, lease, deneme, `next_attempt_at` | Kalıcı ve kilitlenebilir iş kuyruğu |
| `provider_runs` | `id`, `job_id`, `provider`, nullable `external_run_id`, durum, sayfa cursor, maliyet, zamanlar | İş denemesi; Actor ID öncesi kayıt + T3'te snapshot bileşik FK (Bölüm 6.5) |
| `raw_payloads` | run/öğe kimliği, hash, JSON veya özel depoya referans, `expires_at` | Kısa süreli hata araştırma; izinli ve boyutu sınırlı |
| `budget_periods` | dönem/kaynak, limit, rezervasyon, gerçekleşen maliyet, para birimi | Eş zamanlı işlerde merkezi bütçe |
| `usage_ledger` | run/ücret olayı/harici kimlik, tutar, `estimated` durumu | Tahmin ve gerçekleşen tüketimi ayırır |
| `audit_events` | aktör, işlem, hedef, zaman, redakte özet | Yönetici işlemleri ve operasyon denetimi |
| `reviews` (opsiyonel) | kaynak/store review kimliği, app/ülke/dil, metin/puan/zaman | POC ve kullanım izni sonrası; MVP zorunlu değil |

### 9.1 Bütünlük ve indeks kuralları

- Snapshot idempotency anahtarı: kaynak run + uygulama + ülke + dil + kayıt türü. Aynı run'ın yeniden işlenmesi yeni satır üretmez; sonraki zamanda aynı değerlerin görülmesi yeni gözlem olabilir.
- `observed_at` kaynak gözlem zamanı varsa kullanılır, yoksa toplama zamanı olduğu işaretlenir. `collected_at` her zaman sistemin alma zamanıdır.
- Snapshot başarılı ve geçerliyse güncel işaretçi transaction içinde güncellenir; gecikmiş eski run yeni gözlemi ezmez.
- Rank pozitif tamsayı; sayımlar negatif olamaz; fiyat ve para birimi uyumlu; tarih parse hatası karantinaya alınır. Rating ölçeği kaynak eşlemesinde doğrulanır.
- Snapshot geçmişi için `(app_id, country, language, observed_at desc)`, kuyruk için `(status, next_attempt_at)`, favori için `(user_id, created_at)` indeksleri önerilir.
- Mağazalar arası aynı markayı yalnızca ad benzerliğiyle birleştirme. Gerekirse ayrı doğrulanmış eşleştirme tablosu ekle.
- Gözlenen son değer ile “güncel” iddiasını ayır; tazelik eşiği geçtiyse güncel görünümde de eski veri rozeti göster.
- Katalog silinmesi veya mağazada görünmeme tek hatalı koşuyla kesinleştirilmez. Son geçerli veriyi koru, erişim durumunu ayrı kaydet.

## 10. Toplama, snapshot ve hata stratejisi

**[ÖNERİ] Başlangıç politikası:** Sınırlı ülke/kategori evreni; takip edilen uygulamalar günde bir, seçili listeler günde bir, uzun kuyruktaki detaylar haftada bir. Kesin sıklık POC maliyeti ve kullanıcı bütçesine göre onaylanır; gerçek zamanlı güncelleme vaat edilmez.

1. Tarayıcı araması önce PostgreSQL kataloğunu okur. Cache hit yeni dış çağrı üretmez. Yetersiz veri varsa kullanıcıya durum gösterilir; yetkili ve kotaya tabi yenileme talebi kuyruğa girer.
2. Normalize iş anahtarı mağaza/ülke/dil/mod/query veya app ID ve zaman penceresini içerir. Aynı iş ve birden fazla kullanıcının aynı uygulama takibi ortak çekime dönüşür.
3. Dispatcher iş lease'i ve bütçe rezervasyonunu atomik alır. Eş zamanlılık sınırlıdır; süresi dolan lease kontrollü geri alınır.
4. Actor asenkron başlatılır. Belirsiz timeout sonrası kör yeniden başlatma yapma; önce mevcut run'ı uzlaştır. Sağlayıcı idempotency destekliyormuş gibi varsayma.
5. Tamamlanan run'ın dataset'i sayfalanarak okunur. Cursor/checkpoint kaydedilir; kesilen iş aynı sayfayı güvenle tekrar işleyebilir.
6. Her öğe runtime şemadan geçer. Geçersiz satır karantinaya; kısmi başarı ayrı durumdur. Sağlayıcı “başarılı” dese bile sıfır/eksik sonuç kapsam kontrolünü geçmeyebilir.
7. Snapshot, köken kaydı ve güncel işaretçi tutarlı transaction'larla yazılır. Aynı gözlem iki kez sayılmaz.
8. İş durumu `queued → running → ingesting → succeeded | partial | failed | cancelled`; dış run ve iç iş durumları ayrı izlenir.
9. 429/5xx/geçici ağ hatasında sınırlı, jitter içeren artan bekleme; önerilen en fazla 3 deneme. Kalıcı input/kimlik hatasını otomatik döngüye sokma. Başarısız iş manuel inceleme kuyruğuna gider.
10. Bütçe durdurma, hata oranı ve sağlayıcı şema değişimi circuit breaker ile yeni başlatmaları kapatabilir. Çalışmakta olan koşuların durması garanti sayılmaz; rezervasyon bırakılır ve maliyet uzlaştırılır.

**[ÖNERİ] Saklama:** normalize günlük snapshot 12 ay, ham payload en fazla 7 gün, operasyon logu 30 gün; gerçek izinler ve bütçe daha kısaysa kısa süre uygulanır. Bunlar henüz kullanıcı kararı değildir. Silme işi test edilir; yedeklerdeki süre ayrıca belgelenir. Uzun vadeli depolama için günlük/haftalık özet önerilebilir fakat kaynak geçmişin üstüne sessizce yazılmaz.

## 11. Ekranlar ve kullanıcı akışları

| Ekran / önerilen rota | İçerik | Zorunlu durumlar |
|---|---|---|
| Tanıtım `/` | Ürün amacı ve veri sınırları, giriş çağrısı | Uydurma müşteri sayısı/başarı iddiası yok |
| Giriş `/login` | Onaylanan Auth yöntemi, oturum hataları | Gönderiliyor, geçersiz/süresi geçmiş bağlantı, tekrar deneme |
| Keşfet `/explore` | Arama, mağaza/ülke/kategori, tablo veya kartlar, sayfalama | Loading, boş sonuç, eski veri, kaynak kesintisi |
| Detay `/apps/[id]` | Mağaza kartı, bağlam seçimi, ölçümler, geçmiş, kaynak | Eksik alan, yetersiz tarihçe, bulunamadı, kaldırılmış olabilir |
| Takip `/watchlist` | Kişisel uygulamalar, güncelleme/tazelik | Boş liste, kaydetme hatası, oturum gerekli |
| Karşılaştır `/compare` | Aynı bağlamda en fazla 3 uygulama | Uyumsuz ülke/platform uyarısı, eksik değer |
| Hesap `/settings` | Profil/tercihler, çıkış, silme akışı | Yetkisiz erişim ve başarısız kayıt |
| Yönetim `/admin` | İşler, kaynaklar, harcama, limit, hatalar | Rol kontrolü, doğrulama, işlem sonucu |

### 11.1 Ana akışlar

**Keşif:** kullanıcı giriş yapar → ülke/mağaza seçer → arar → sonuçları filtreler → detaya girer → kaynağı ve son gözlem zamanını görür → takip eder. Filtreler URL'de tutulur; geri dönüşte korunur. Arama sonucu bulunmaması “bu uygulama mağazada yok” demek değildir.

**Takip:** kullanıcı favoriye ekler → RLS'li kayıt yapılır → mevcut katalog verisi hemen gösterilir → gerekiyorsa ortak yenileme planına dahil olur. Favori eklemek kontrolsüz ücretli çağrı başlatmaz. Silme yalnızca kullanıcının takibini kaldırır, başka kullanıcının verisini silmez.

**Trend:** kullanıcı tarih aralığı seçer → aynı bağlamdaki snapshot'lar gösterilir → eksik günler kesintidir → en az iki karşılaştırılabilir gözlem yoksa açıklama gösterilir. Varsayılan tarih aralığı önerisi 30 gündür; 30 günlük veri varmış gibi üretme.

**Kaynak sorunu:** son geçerli veri korunur → “Son gözlem …; yenileme başarısız” gösterilir → yönetici hatayı görür → sınırlı yeniden deneme yapılır. UI hiçbir zaman boş cevabı sıfır gelir/indirme olarak yorumlamaz.

**Hesap silme:** kimlik yeniden doğrulanır → kullanıcıya ait özel veriler ve Auth hesabı kontrollü silinir → ortak kamu kataloğu kullanıcı kaydı olmadığı için ayrı tutulur → işlem sonucu bildirilir. Saklama zorunlulukları varsa açıkça belgelenir.

## 12. Tasarım sistemi ve responsive davranış

[21st.dev](https://21st.dev/) tasarım/bileşen keşif kaynağıdır; [shadcn/ui](https://ui.shadcn.com/docs) temel UI bileşenleri, [Tailwind](https://tailwindcss.com/docs/responsive-design) yerleşim ve stil için kullanılır. Belirli premium şablon satın alma veya tüm kütüphaneyi kopyalama kararı yoktur.

**[ÖNERİ] Görsel yön:** sakin ve veri odaklı araştırma paneli; açık zemin, koyu metin, tek indigo vurgu, sınırlı hareket. Koyu tema ikinci öncelik olabilir. İlk onaya sunulacak ekranlar keşfet, uygulama detayı ve mobil filtre görünümüdür.

- 21st.dev üzerinden sidebar, arama/filtre, veri kartı, tablo, boş durum ve auth adaylarını seç. Her seçimin URL, yazar, lisans, bağımlılık ve değiştirme notunu kaydet. Bu belgede belirli bileşen lisansı doğrulanmış değildir.
- Bileşenleri tek token sistemine uyarla; her kartta farklı radius/gölge/renk kullanma. 4/8 tabanlı boşluk, yaklaşık 16 px gövde metni, 8–12 px köşe yarıçapı başlangıç önerileridir.
- Semantik renkler: `background`, `surface`, `foreground`, `muted`, `border`, `primary`, `success`, `warning`, `danger`; yalnızca renk ile anlam verme.
- Mobilde tek sütun, filtre sheet/drawer, okunabilir kartlar; masaüstünde sidebar ve tablo. Büyük tablo gerekiyorsa kendi alanında yatay kaydır; sayfanın tamamı taşmasın.
- Kontrol genişlikleri: 360, 390, 768, 1024 ve 1440 px. Dokunma hedefleri yaklaşık 44 px; odak görünür, klavye ile tüm ana akışlar tamamlanabilir.
- Grafikler metin özeti/tablo alternatifi, eksen/birim ve gerçek tarih aralığı sunar. Yükseliş/düşüşte işaret ve metin kullanır.
- Formlarda görünür label, alan bazlı hata ve yardımcı metin; diyaloglarda focus yönetimi. Reduced-motion tercihine uyulur. WCAG 2.2 AA hedefi önerilir ve gerçek denetimle değerlendirilir.
- Skeleton, empty, error, stale ve partial durumları tasarımın parçasıdır. Rastgele sayılarla dolu “başarılı” ekran üretme.

## 13. Güvenlik, erişim ve veri koruma

### 13.1 RLS ve roller

| Veri | Anonim | Giriş yapmış kullanıcı | Yönetici / worker |
|---|---|---|---|
| Kullanıcı profili | Yok | Yalnızca kendi satırını oku/değiştir | Gerekli ve denetlenen erişim |
| Takip listesi | Yok | `auth.uid() = user_id` ile kendi CRUD | Operasyon gerektirirse denetimli |
| Normalize katalog/snapshot | Önerilen MVP'de yok | Salt okuma; lisans/kapsam filtresi | Worker yazar |
| Ham payload, run, maliyet, iş kuyruğu | Yok | Yok | İhtiyaca göre sınırlı erişim |
| Kaynak/limit/rol ayarları | Yok | Yok | Yetkili yönetici, sunucu kontrolü |

RLS tüm istemciye açılan tablolarda etkin; hem `USING` hem `WITH CHECK` mutasyonları kapsar. Kullanıcı A'nın kullanıcı B verisini okuma, ekleme, güncelleme ve silmesi test edilir. Profil alanı üzerinden admin rolü yükseltilemez. View ve RPC erişiminde RLS'nin otomatik korunduğunu varsayma; invoker/definer davranışı, grant'ler ve `search_path` incelenir. Ayrıcalıklı servis anahtarı RLS'yi aşabildiği için tarayıcıya kesinlikle verilmez.

### 13.2 Uygulama önlemleri

- Auth oturumu sunucuda doğrulanır. Middleware/route görünürlüğü tek başına yetkilendirme değildir; her server action/endpoint kendi kontrolünü yapar.
- Kullanıcının keyfi actor, URL veya script çalıştırmasına izin verme. Mağaza URL'lerini allowlist ile ayrıştır; SSRF ve yönlendirme riskini kontrol et.
- Webhook desteği ve imzası POC'de doğrulanır. İmza yoksa tahmin edilmez gizli doğrulama ve sağlayıcıdan run durumunu yeniden teyit etme; güvenilir doğrulama kurulamazsa kontrollü polling seçilir. Replay/double-processing idempotency ile önlenir.
- Actor çıktısı, mağaza açıklaması ve yorumlar güvenilmeyen veridir. HTML doğrudan çalıştırılmaz; XSS sanitization/escaping uygulanır. Sonradan LLM eklenirse bunlar talimat olarak işlenmez.
- Apify ve Supabase ayrıcalıklı sırları yalnızca sunucu/Edge secret yönetiminde; loglarda, URL query'lerinde, hata ekranlarında ve git geçmişinde bulunmaz. Geliştirme ve üretim anahtarları ayrıdır.
- Kullanıcı ve IP bazlı rate limit; pahalı işlerde hesap kotası, global tavan ve yönetici yetkisi. CSRF/origin kontrolleri, güvenli oturum çerezleri ve redirect allowlist değerlendirilir.
- Yorum yazarı adları ve geliştirici iletişim bilgileri MVP için gerekmiyorsa normalize ürüne alınmaz. Ham payload'da da redaksiyon ve sınırlı saklama uygulanır.
- Yedekleme/geri yükleme planı, silme politikası, secret rotasyonu ve incident prosedürü üretim öncesinde belgelenir. Planın yedek özellikleri doğrulanmadan garanti verilmez.

## 14. Maliyet kontrolü ve operasyon

Bütçe rakamları kullanıcı tarafından henüz belirlenmedi. Plan onayında `POC_LIMIT`, `MONTHLY_LIMIT`, `DAILY_LIMIT`, `MAX_RUN_RESULTS`, `MAX_CONCURRENCY`, `MAX_RETRIES`, `REFRESH_TTL` ve saklama süreleri açık değer almalıdır. Boş bütçe yapılandırmasında ücretli toplama kapalıdır; sınırsız varsayılan yoktur.

### 14.1 Hesaplama modeli

```text
Aylık planlanan sonuç ≈ uygulama sayısı × ülke/dil bağlamı × ay içi çekim sayısı
                     + arama/liste sonuçları + ek yorum olayları + ücretli tekrarlar
Actor tahmini = Σ(ücretli olay adedi × olayın doğrulanmış birim ücreti)
Platform toplamı = plan bedeli
                 + max(0, krediye uygun tüketim − kullanılabilir dahil kredi)
                 + kredi dışı kalemler
Proje toplamı = platform toplamı + diğer altyapı + vergi/kur etkisi
```

Bu bir planlama formülüdür; gerçek faturada kredi kapsamı farklıysa uyarlanır. Aynı uygulamanın birden çok sonuçta gelmesi sağlayıcı açısından birden çok ücretli olay olabilir. Yerel dedup, dış faturanın otomatik azalacağı anlamına gelmez. Gerçekleşen tutar `unknown` ise sıfır yazma.

### 14.2 Kontroller

- İş başlatmadan önce tahmini maliyeti atomik rezerve et; gerçekleşen ücretle uzlaştır. Paralel işler tavanı ayrı ayrı okuyup aşamamalı.
- Önerilen uyarılar %70/%90, yeni iş durdurma %100. Eşikler ve iletişim kanalı plan onayında belirlenir.
- Aktif koşular ve gecikmeli faturalama için pay bırak. Uygulama içi tavanı sağlayıcı tarafı harcama sınırıyla destekle; mutlak fatura garantisi verme.
- Ortak cache, artımlı çekim gerçekten destekleniyorsa kullanımı, sık takip edilenlere öncelik ve uzun kuyrukta düşük sıklık uygula.
- Kullanıcı yenilemesi için cooldown ve kota; kötüye kullanımda engelleme. Varsayılan olarak sayfa yenilemek dış actor çalıştırmaz.
- İzle: iş başarı/kısmi başarı oranı, kuyruk yaşı, P95 süre, alan doluluğu, stale oranı, maliyet/run, maliyet/geçerli benzersiz gözlem, bütçe rezervasyonu ve şema hataları.
- Sağlayıcı arızasında son geçerli veriyle okuma sürer; pahalı sınırsız fallback başlatılmaz. Alternatif sağlayıcı geçişi ölçüm uyumluluğu ve bütçe kontrolünden geçer.

## 15. Geliştirme kuralları ve teslim standardı

1. Onaylı kapsamı küçük aşamalarla uygula; kapsam değişikliğini kullanıcıya bildir. Önce veri sözleşmesi ve POC, sonra kesin veri şeması ve üretim arayüzü.
2. Next.js/React, TypeScript, Tailwind, shadcn ve Supabase araçlarının uyumlu sürümlerini uygulama başlangıcında resmi kaynaklardan doğrula; lockfile ile sabitle. Bu belge sürüm numarası dayatmaz.
3. Sağlayıcı adaptörlerini UI'dan ayır. Önerilen modüller: `app`, `components/ui`, `features`, `lib/supabase`, `lib/providers`, `lib/validation`, `supabase/migrations`, `supabase/functions`, `tests`.
4. Runtime doğrulama için Zod veya eşdeğer tek yaklaşım seç; güvenilmeyen çıktıyı TypeScript cast ile geçerli sayma. Domain alanları ve sağlayıcı ham şeması ayrıdır.
5. Migration'lar sürümlü ve yeniden kurulabilir olmalı; dashboard'da izsiz şema değişikliği yapma. Yıkıcı migration için veri taşıma/geri dönüş planı hazırla.
6. `.env.example` yalnızca değişken isimleri/placeholder içerir. Server-only sırları `NEXT_PUBLIC_` ile yayınlama. Gerçek anahtarları örnek veri olarak kullanma.
7. Demo veriyi görünür biçimde “Demo / sentetik veri” olarak etiketle ve üretimden ayır. Gerçek uygulama adlarına uydurma gelir veya indirme metrikleri ekleme.
8. UI metinleri Türkçe; kod tanımları tutarlı İngilizce olabilir. Tarih, sayı ve para birimi locale ile biçimlenir; USD değeri para birimini değiştirmeden TL gibi gösterilmez.
9. Filtreler ve sayfalama sunucuda sınırlanır; sınırsız dataset tarayıcıya aktarılmaz. Kullanıcıya özel yanıtlar ortak cache'e sızmaz.
10. Lisansı belirsiz 21st.dev bileşeni veya bağımlılığı ekleme. Kullanılmayan ağır animasyon/paketleri taşımama; erişilebilirliği görsellik için bozma.
11. Testler risk temelli olmalı: normalize alanlar/null, idempotency, sıra/tarih hesapları, RLS, bütçe rezervasyonu, hata toparlama ve ana akışlar. Yalnızca görüntülenen metni tekrar eden anlamsız test üretme.
12. Her aşamada typecheck, lint, ilgili testler ve build çalıştır; gerçek sonuçları raporla. Ücretli API kullanan testleri varsayılan CI'ya koyma; kontrollü entegrasyon testi ayır.
13. Uygulama tesliminde kurulum, gerekli environment değişkenleri, migration, cron etkinleştirme, test, yedek/geri yükleme ve operasyon adımları belgelenir. Harici hesap erişimi olmadan doğrulanamayan kısımlar açık bırakılır.

## 16. Aşamalar ve kabul kapıları

| Aşama | Çıktı | Kabul / sonraki aşama şartı |
|---|---|---|
| 0 — Analiz ve plan | Karar matrisi, kapsam, mimari, POC ve bütçe planı, sorular | **Kullanıcı açık onayı; öncesinde kod yok** |
| 1 — POC | Gerçek actor denemeleri, alan matrisi, maliyet ve hak incelemesi | Bölüm 7 geçer; desteklenmeyen özellikler çıkarılır veya yeniden onaylanır |
| 2 — Temel altyapı | Supabase şema/migration, Auth/RLS, ortamlar, adaptör arayüzü | Temiz kurulum; iki kullanıcı izolasyonu; sırlarda sızıntı yok |
| 3 — Veri hattı | Cron, kuyruk, Edge Functions, normalize snapshot, bütçe | Tekrar işleme mükerrer üretmez; başarısızlık toparlanır; bütçe kapanışı çalışır |
| 4 — Responsive MVP | Keşfet, detay, takip, geçmiş, yönetim ve onaylı ek ekranlar | Ana akışlar gerçek izinli veride; tüm boş/hata/tazelik durumları; mobil QA |
| 5 — Pilot | Sınırlı kullanıcı/katalog, izleme, geri yükleme provası | Önerilen 7 gün izleme; bütçe/tazelik hedefleri ve kritik hatalar değerlendirilir |
| 6 — Üretim | Onaylı deployment ve işletim rehberi | Ticari izinler, güvenlik ve maliyet kapıları açık; kullanıcı yayın onayı |

### 16.1 Somut kabul senaryoları

- Kullanıcı A, B'nin favori kimliğini bilse bile okuyamaz/değiştiremez; anonim erişim reddedilir. Admin yetkisi normal profilden yükseltilemez.
- Eksik `rating_count` “0” olarak görünmez. iOS indirme alanı yoksa uydurulmaz. Gelir alanı mevcut veri yokken gösterilmez veya açıkça “Veri sağlanmıyor” der.
- Aynı run iki kez işlendiğinde snapshot sayısı artmaz; ertesi günkü yeni run aynı değerlerle yeni tarihsel gözlem yaratabilir.
- Eski run geç tamamlandığında son güncel veri geri alınmaz. Bir bağlamdaki grafik başka ülkenin gözlemiyle devam etmez.
- Actor timeout/429 ve sayfalı alım kesintisi veriyi bozmaz; en fazla onaylı deneme sayısına ulaşılır; kısmi sonuçlar tam kapsam gibi gösterilmez.
- İki paralel iş bütçe tavanını birlikte aşacaksa uygun iş rezervasyon alamaz. Limit dolunca yeni ücretli iş başlamaz; mevcut harcama uzlaştırılır.
- Kullanıcı aynı sayfayı tekrar açınca gereksiz actor çağrısı oluşmaz. Takipten çıkarma başka kullanıcıların takibini etkilemez.
- 360–1440 px kontrol boyutlarında ana akışlar kullanılabilir; klavye ile arama, filtre, detay ve takip çalışır; form hatası okunabilir.
- Üretim bundle/loglarında gizli anahtar yok; API endpoint'leri server-side yetki kontrolünü geçer; webhook replay güvenle etkisizleşir.
- POC sonuçları, sınırlamalar, testler ve lisans kayıtları incelemeye hazırdır. Yapılmayan performans veya güvenlik testi tamamlandı sayılmaz.

## 17. Plan onayında çözülmesi gereken sorular

| Soru | Önerilen başlangıç | Karar etkisi |
|---|---|---|
| İlk hedef kullanıcı kim? | Bağımsız geliştirici/küçük ürün ekibi | Ekranlar, metrikler ve fiyatlandırma |
| Hangi mağazalar/ülkeler? | İki mağaza; POC TR+US, üretimde dar kapsam | Katalog büyüklüğü ve maliyet |
| Hangi kategoriler ve kaç uygulama? | Küçük pilot; sayı bütçeyle belirlenir | Tarama evreni ve performans |
| Aylık ve POC bütçesi nedir? | Rakam onaylanana kadar ücretli toplama kapalı | Güvenli çalıştırma için bloke edici |
| Giriş yöntemi ve erişim? | E-posta tabanlı, yalnızca giriş yapanlara katalog | SMTP, Auth ayarları, güvenlik |
| Kullanıcılar için ücretli ürün olacak mı? | MVP'de ödeme entegrasyonu yok | Abonelik/kota tasarımı |
| Takip kotası ve yenileme sıklığı? | Günlük gözlem; kota pilot maliyetiyle | Bütçe ve tazelik |
| Yorum/karşılaştırma MVP'ye dahil mi? | Karşılaştırma opsiyonel; yorum sonraki faz | Veri ve arayüz kapsamı |
| Hangi hosting ve Supabase bölgesi? | Kullanıcı/operasyon ihtiyaçlarına göre seç | Gecikme, maliyet ve veri konumu |
| Ticari kullanım dayanağı hazır mı? | İnceleme ve kanıt kaydı | Yayın için bloke edici |

Bu sorular tümü yeni tasarım kararıdır; önceki sohbetten kesinleşmiş gibi sunulmaz. Analiz ajanı bağımsız okunabilir incelemeyi tamamlayıp bir karar paketi sunmalı; soruları tek tek sorarak çalışmayı gereksiz yere bölmemelidir.

## 18. Kaynaklar ve doğrulama kayıtları

Aşağıdaki birincil kaynaklar 25 Kasım 2026 tarihinde kamuya açık web içerikleri üzerinden incelendi. Bazı sayfalar arama aracının önbelleğinden gelebilir; fiyat ve sürüm bilgileri uygulama/satın alma anında tekrar kontrol edilmelidir.

| Kaynak | Kullanım | Doğrulama sınırı |
|---|---|---|
| [Subimpact actor](https://apify.com/subimpact/app-store-scraper) | Keşif kapsamı (arama + Play liste) | 26 Kasım 2026: 3 canlı koşu SUCCEEDED; fixture `tests/fixtures/subimpact-*.json` |
| [Subimpact OpenAPI](https://apify.com/subimpact/app-store-scraper/api/openapi) | Giriş sözleşmesi build `0.1.1` / `NHjJXD6Nrjf8MpxN1` | Plan girdileri OpenAPI ile uyumlu; keşif çıktıları normalize edildi |
| [Subimpact fiyat](https://apify.com/subimpact/app-store-scraper/pricing) | `$0.0003` / app olayı | Canlı koşularda 15 app = $0.0045 doğrulandı |
| [Aurelix actor](https://apify.com/aurelix/app-store-google-play-scraper) | Detay + iOS charts + developers (+ embedded ~20 Play reviews) | Embedded Play fixture `aurelix-play-reviews-com-openai-chatgpt.json`; iOS review feed canlıda boş |
| [Aurelix OpenAPI](https://apify.com/aurelix/app-store-google-play-scraper/api/openapi) | `maxReviewsPerApp`, `reviewSort` mostrecent/mosthelpful, `onlyNewReviews` | Build `0.2.23`; App Store ≤500/ülke; Play ≈20/dil (public page) |
| [Aurelix fiyat](https://apify.com/aurelix/app-store-google-play-scraper/pricing) | app-result + review-result + actor-start | Embedded Play reviews: 1 app + 10 review + start ≈ $0.00473 |
| [Aurelix Play Reviews actor](https://apify.com/aurelix/google-play-reviews-scraper) | Sayfalı Google Play reviews | ChatGPT US/EN newest 100 SUCCEEDED; fixture `aurelix-play-reviews-scraper-com-openai-chatgpt.json` |
| [Aurelix Play Reviews OpenAPI](https://api.apify.com/v2/acts/aurelix~google-play-reviews-scraper/builds/default/openapi.json) | `apps`, `maxReviewsPerApp`≤100000, `sort`, `onlyNewReviews`, `countries`, `language` | Build `0.1.8` / `w3YTTu8Bd7IY6z2uU` |
| [Aurelix Play Reviews fiyat](https://apify.com/aurelix/google-play-reviews-scraper/pricing) | review-result + app-checked + actor-start; min charge $0.02 | 100 review run ≈ $0.0085 |
| [TheWolves actor](https://apify.com/thewolves/appstore-reviews-scraper) | iOS App Store reviews | ChatGPT US 10 yorum SUCCEEDED; fixture `thewolves-ios-reviews-6448311069.json` |
| [TheWolves OpenAPI](https://api.apify.com/v2/acts/thewolves~appstore-reviews-scraper/builds/default/openapi.json) | `appIds`, `country`, `startUrls`, `maxItems` | Build `0.0.1057` / `MHfNUQWkb1bIq1UKN`; Apple ≤500 review/ülke/uygulama |
| [TheWolves fiyat](https://apify.com/thewolves/appstore-reviews-scraper/pricing) | PPE $0.0001 / review; kiralama yok | 10 review = $0.001 |
| [DataTrail actor](https://apify.com/datatrail/app-store-google-play-charts) | iOS new-apps charts | Fixture `datatrail-ios-new-free-apps-6007.json`; Play new-apps yok |
| [DataTrail OpenAPI](https://api.apify.com/v2/acts/datatrail~app-store-google-play-charts/builds/default/openapi.json) | `appleCharts` includes new-*; `playCharts` top only; `chartLimit`≤100 | Build `0.1.7` / `oKsySVUZf5K5p2o1U` |
| [DataTrail fiyat](https://apify.com/datatrail/app-store-google-play-charts/pricing) | PPE app + actor-start | 24 app run ≈ $0.04405 |
| [ASO Keyword Intel actor](https://apify.com/petersutarik/aso-keyword-intel) | Keyword rank + popularity/difficulty | Fixture `asokeyword-ios-habit-tracker.json`; popularity ≠ monthly volume |
| [ASO Keyword Intel OpenAPI](https://api.apify.com/v2/acts/petersutarik~aso-keyword-intel/builds/default/openapi.json) | `keywords`, `store` ios/android/both, `topN`≤50, `includePopularity` | Build `0.2.5` / `9ton1HLQZxcwZx6Jy`; dil ayrı input yok |
| [ASO Keyword Intel fiyat](https://apify.com/petersutarik/aso-keyword-intel/pricing) | ranking/suggestion/metrics events | 10 rank + 1 metrics = $0.04 |
| [Apify fiyatlandırma](https://apify.com/pricing) | PAYG ve plan tabanı ayrımı | Hesap/kredi/vergi koşulları teyit bekliyor |
| [21st.dev](https://21st.dev/) | Tasarım ve bileşen keşfi | Seçilmiş bileşen ve ticari lisans doğrulaması yok |
| [shadcn/ui](https://ui.shadcn.com/docs) | UI altyapı referansı | Sürüm ve seçili bileşenler uygulamada sabitlenecek |
| [Tailwind responsive](https://tailwindcss.com/docs/responsive-design) | Responsive uygulama referansı | Bu belge görsel prototip değildir |
| [Next.js App Router](https://nextjs.org/docs/app) | Web mimarisi referansı | Proje kurulumu/testi yapılmadı |
| [Supabase Auth](https://supabase.com/docs/guides/auth) | Kimlik doğrulama referansı | Giriş yöntemi yapılandırılmadı |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Yetki modeli referansı | Politika kodu ve izolasyon testi sonraki aşama |
| [Supabase Cron](https://supabase.com/docs/guides/cron) | Zamanlama referansı | İş sıklığı ve limitler onaylanmadı |
| [Supabase Edge Functions](https://supabase.com/docs/guides/functions) | Orkestrasyon referansı | Plan limitleri ve runtime uyumu doğrulanacak |

**Belge sonu — ajan için ilk çıktı:** Kod yazmadan ürün/veri analizi, açık noktalar, önerilen kararlar, aşamalı uygulama ve POC planını sun; açık kullanıcı onayını bekle.
