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

**[DOĞRULANMADI]** Actor'a ödeme yapmak veriyi yeniden yayınlama, saklama, satma veya görselleri ticari üründe kullanma hakkını kendiliğinden kanıtlamaz. Apify koşulları, actor lisansı/sağlayıcı koşulları, kaynak mağaza şartları, görsel hakları, mağaza açıklama metinleri ve yorumların kişisel veri niteliği ayrı incelenmelidir. Bu belge hukuki uygunluk kararı vermez.

POC'nin saklama kapsamı dahil kullanım koşullarını kontrol et. Üretim öncesi saklama, kullanıcıya gösterim, türetilmiş analiz, cache, yeniden dağıtım ve silme talepleri için izin dayanağını kaydet. Belirsiz ticari yetki varsa gerekli sağlayıcı açıklamasını/uzman incelemesini tamamlamadan ilgili veriyi yayımlama. İzin verilen alan ve saklama süresi uygulama yapılandırmasına yansıtılmalıdır.

**Açık kısıtlar (27 Kasım 2026; B4.3 yetki kapsamı):** Ticari/public saklama-gösterim izni henüz onaylanmadı. Ücretli toplama ve zamanlama varsayılan kapalıdır; veri kullanımı `APPRADAR_THIRD_PARTY_RIGHTS_STATUS` ile ayrılır (`verified` / `unconfirmed` / `prohibited`). `POC_DATA_USE_CONFIRMED` yalnız `verified` ile geçerlidir; iç pilot için operatör onayı + unconfirmed risk kabulü ayrı bayraklardır (sahip onayı lisans değildir). Okuma katmanında varsayılan kapalı: `APPRADAR_STORE_ICONS_ENABLED`, `APPRADAR_STORE_SCREENSHOTS_ENABLED`, `APPRADAR_STORE_DESCRIPTION_ENABLED`, `APPRADAR_REVIEW_CONTENT_ENABLED`, `APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED`. Eski `APPRADAR_STORE_MEDIA_ENABLED` yok sayılır. Kapsam: `docs/CONTENT_USAGE.md` §6.26.

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
- **İlk T4 alan önceliği (0011 öncesi; B1 için 6.19):** Aurelix detay > diğer detay > discovery; eşitlikte
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

### 6.9 Toplama motoru köprüsü

`20261126000700_collection_bridge` `service_role` için T3 tetik yardımcılarını açar ve `private` şemayı dar public sarmalayıcılarla sunar. Sarmalayıcılar `search_path` boş, `SECURITY INVOKER` ve yalnızca `service_role` çalıştırabilir. İş yazmaları canlı lease ister. Ücretli koşunun kimliğini kaydetmek, unknown işaretlemek ve settle lease istemez; yeni ücretli başlangıç veya rezervasyon iadesi yapmazlar.

Günlük ve aylık UTC dönemleri `DAILY_LIMIT_USD` / `MONTHLY_LIMIT_USD` ile idempotent açılır. Aynı pencere tekrar insert edilmez; çakışma tetikleyicisi ikinci insert'i reddettiği için fonksiyon önce mevcut satırı okur. Limit yoksa ücretli başlangıç olmaz. Var olan dönemin limiti yükseltilmez; yapılandırmadan yüksekse çağrı reddedilir. Otomatik settle yalnız doğrulanmış sıfır maliyettedir. Pozitif veya eksik tutar rezervde kalır. `confirm_cost` kanıtla settle eder, rezervasyonu bırakmaz. `confirm_absent` yalnız dış kimliği olmayan unknown başlangıcı bırakır ve yeni koşu başlatmaz. `attach_run` kimliği kaydeder. Charge cap ve doğrulanmamış kapsam `succeeded` sayılmaz.

26 Kasım 2026: migration geliştirme veritabanına uygulandı. İki oturumda claim, süresi dolmuş lease, eski token ve çift reserve doğrulandı. Sahte Apify yanıtlarıyla pozitif maliyet rezervde kaldı, doğrulanmış sıfır settle oldu, eksik tutar ve charge cap `succeeded` sayılmadı. Unknown başlangıç ikinci POST açmadı; kanıtsız release reddedildi. Sentetik satırlar silindi. Otomatik ücretli çalıştırma kapalıdır.

### 6.10 T10 — Tarihsel journal import (dry-run)

`src/lib/import/` yerel `.poc/state.json` kaydını okur. Yalnızca başarılı, doğrulanmış v2 gözlemler adaydır. v1 kimlik alanları uydurulmaz. Yorum içeriği ticari saklama onayı olmadan dışarıda bırakılır. Sentetik fixture satırları elenir. Provider run ve maliyet satırı üretilmez. Uzak yazma kapalıdır; `--execute` açık onay ister ve yine reddedilir.

### 6.11 T8 — Okuma servisleri

`20261126000800_read_services` geliştirme veritabanına uygulandı. Beş `appradar_read_*` fonksiyonu `SECURITY INVOKER`, boş `search_path`, yalnız `service_role` execute. Anon/authenticated reddedilir. Süresi dolmuş listing’ler istatistik ve dağılıma girmez. Sentetik join/filtre/sıralama değişimi SQL oturumunda doğrulanıp geri alındı. PostgREST doğrulaması `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` gerektirir.

### 6.12 Çekirdek ürün entegrasyonu — 26 Kasım 2026

`SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` ile PostgREST üzerinden Dashboard, Explorer ve App Details okuma yolu doğrulandı. Migration yeniden uygulanmadı; ücretli API, otomatik toplama ve journal import çalıştırılmadı; review içeriği ile store media kapalı kaldı.

| Kontrol | Sonuç |
|---|---|
| Boş durum | stats/explorer/dashboard sıfır; eksik uygulama `null` |
| Dolu durum (geçici sentetik) | join, kategori filtresi, sıralama, ranking değişimi, detay+related+history |
| Media / review | icon/screenshot withhold; mediaEnabled false; review içeriği istenmedi |
| RPC yetkisi | anon `appradar_read_*` → 401 |
| Temizlik | sentetik jobs/apps/discovery/developers = 0 |
| Tarayıcı sırları | `catalog.server.ts` `server-only`; üretim `.next/static` içinde service role / DATABASE_URL / token yok |
| Kalite kapısı | test 88/88; typecheck OK; lint 0 error (2 `no-img-element` warning); `next build` OK |

Lint düzeltmeleri: `page.tsx` / `explore/page.tsx` try/catch içinde JSX kaldırıldı; `sanitizeText` düzensiz whitespace sınıfı Unicode kaçışlarına alındı.

### 6.13 Arayüz entegrasyonu — 26 Kasım 2026

Claude (kabuk, Dashboard, Modern Minimal tokenları, paylaşılan primitifler) ve Cursor (Explorer, App Details) aynı çalışma ağacında. Ek git worktree yok; `main` hâlâ `dc64364`. İki tarafın dosyaları korundu. Yeni ekran, bağımlılık, MCP çekimi, ücretli çağrı veya veritabanı değişikliği yok.

| Kontrol | Sonuç |
|---|---|
| Tokenlar | Explorer CSS tanımsız `--product-border` / `--product-muted` kullanıyordu; kenarlıklar ve grafik rengi `globals.css` tokenlarına alındı |
| Explorer | Arama, mağaza/kategori/fiyat, sunucu sıralaması, sütun gizleme, sayfa 2 (`9–16 / 120`) demo modunda geçti |
| Dashboard / Details | Demo kabuğu, KPI, ayrı tarih serileri ve boşluklar duruyor; production’da demo bayrağı sentetik katalog açmıyor |
| Hidrasyon | Enstrümansız Chrome. Dashboard ve Explorer uyumsuzluk üretmedi. Details’te SVG `<title>` metni HTML ayrıştırmasında boşalıyordu; ipuçları hidrasyondan sonra ekleniyor |
| Loading / not-found | `loading.tsx` iskeleti duruyor. Bilinmeyen adres “Page not found” (404). Geçersiz veya eksik uygulama “App not found”. `error.tsx` Next.js 16 `retry` kullanıyor |
| Koruma | `APPRADAR_DEMO_MODE` yalnız `NODE_ENV=development` iken geçerli. Production keşif sentetik değil. `.next/static` içinde service role / token yok |
| Kalite kapısı | test 100/100; typecheck OK; lint 0 error (2 `no-img-element` warning); `next build` OK |

**Tema lisansı [DOĞRULANMADI]:** 21st.dev “Modern Minimal” teması (`https://21st.dev/community/themes/modern-minimal`, serafimcloud) `get_theme` ile alındı. Bileşen dosyalarındaki MIT kayıtları duruyor (shadcn sidebar/card/empty/skeleton, Origin/shadcn tablo, StatCard, BarChart, Partition Bar). Tema sayfasının ticari kullanım lisansı bu entegrasyonda doğrulanmadı; tema değerleri `src/app/globals.css` içindedir ve lisans kaydı gelmeden yeni tema kopyalanmaz.

### 6.14 Tanıtım sayfası ve kimlik doğrulama — 26 Kasım 2026

- **Rotalar:** `/` herkese açık tanıtım; Dashboard `/dashboard`'a taşındı. Açık: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`. Korumalı: `/dashboard`, `/explore`, `/apps/[id]`, `/account` (+ eski `/admin`, `/settings`, `/watchlist`).
- **Auth:** Supabase Auth, resmi `@supabase/ssr` (0.12.7) + `@supabase/supabase-js` (2.119.0). E-posta/şifre, e-posta doğrulama, şifre sıfırlama, Google OAuth (yalnızca Supabase projesinde etkinse görünür), çıkış, `/account`.
- **Güvenlik:** `src/proxy.ts` oturumu yeniler ve iyimser yönlendirme yapar; asıl yetki kontrolü `getUser()` ile sunucuda: `lib/auth/server.ts` (`requireViewer`), sayfalar, server action'lar, `/auth/callback` ve tüm katalog okumaları (`lib/ui/catalog.server.ts` → `readResult`). `next` parametresi allowlist ile doğrulanır (open redirect yok). Tarayıcı yalnızca publishable key görür; service-role anahtarı `lib/read` ve `lib/persistence` içinde sunucuda kalır, publishable alanına girilirse reddedilir. Korumalı/auth yanıtlarında `Cache-Control: private, no-store`.
- **Demo:** kimlik doğrulama atlaması yalnızca `NODE_ENV=development` ve `APPRADAR_DEMO_MODE=true`; sahte kullanıcı/oturum yok, Supabase'e yazım yok; demo katalog gerçek okuma yoluna düşmez. Production'da atlama mümkün değil (`tests/auth.test.ts`, `tests/ui-demo.test.ts`).
- **Yeni tablo/migration yok.** Profil verisi Supabase Auth'ta kalır.
- **Kurulum:** ortam değişkenleri `.env.example`; Supabase Dashboard ve Google Cloud adımları `docs/AUTH_SETUP.md`.
- **Entegrasyon doğrulaması (26 Kasım 2026):** `f5e5ac7` sonrası landing/auth değişiklikleri korundu. Geçici `mock-auth` / scratch launch yapılandırmaları kaldırıldı. Eksik `NEXT_PUBLIC_SUPABASE_*` durumunda login/signup yapılandırılmamış mesajı gösteriyor; formlar disabled. Demo ile dashboard/explorer/account açılıyor; landing chromeless; masaüstü ve 390px kontrolleri geçti. `.next/static` içinde service-role/token yok.
- **Gerçek Supabase Auth doğrulaması [ERTELENDİ]:** Publishable key, Site URL, e-posta şablonları, SMTP ve Google OAuth bilinçli olarak yapılandırılmadı; gerçek kullanıcı oluşturma, e-posta teslimi ve dış sağlayıcı testi yapılmadı.
- **Yayın engelleri:** Gizlilik politikası, kullanım koşulları ve iletişim bilgisi yazılmadı/onaylanmadı (footer'da "coming soon"); Supabase e-posta şablonları ve SMTP üretim için ayarlanmalı; gerçek hesapla uçtan uca giriş/çıkış testi ertelendi.

### 6.15 Tanıtım sayfası yerelleştirmesi — 26 Kasım 2026

- **Rotalar:** `/en` İngilizce, `/tr` Türkçe; `/` geçerli dil tercihi çerezine, ilk ziyarette İngilizceye yönlenir. Seçim bir yıl saklanır. Mağaza ülke/dil filtreleriyle ilişkisi yoktur; ürün ve auth ekranları İngilizce kalır, mevcut auth yönlendirme kuralları değişmez.
- **İçerik:** Typed EN/TR sözlükleri `src/lib/landing/dictionaries.ts`; problem/çözüm, altı mevcut yetenek, üç adım, kullanım soruları, hedef kitle, SSS ve CTA. Tüm veri iddiaları mevcut katalog, karşılaştırılabilir gözlemler ve kapsam sınırlarıyla koşulludur. Ön izleme tamamen yerel ve temsili; Supabase/demo katalog okumaz. Hukuki içerik ve iletişim bilgileri hâlâ yayımlanmamıştır.
- **Dil/SEO:** Proxy yalnız tanıtım URL'sinden güvenilir SSR dil başlığı ve tercih çerezi üretir. Root HTML `lang` bunu kullanır; yumuşak gezinmede locale sync devreye girer. Dil bağlantıları tam belge gezinmesi yapar, ön yükleme tercihi değiştirmez. Başlık, açıklama, canonical, EN/TR ve `x-default` hreflang `NEXT_PUBLIC_SITE_URL` kökünü kullanır. Geçerli üretim adresi yoksa canonical uydurulmaz ve indeksleme kapalıdır.
- **Tasarım:** Yalnız 21st.dev referansı; mevcut Modern Minimal tokenları ve yerel StatCard/BarChart/PartitionBar/Sparkline bileşenleri kullanıldı. Yeni dış bileşen, tema, bağımlılık veya lisans kapsamı eklenmedi; mevcut tema lisansına ilişkin 6.13 notu geçerlidir.
- **Doğrulama (tarayıcı + entegrasyon):** `/` → cookie’ye göre `/en` veya `/tr` (proxy 307; Suspense içinde `redirect()` ürün yükleme flaşı ürettiği için proxy’ye alındı). `/en`/`/tr` dil, canonical, hreflang, `lang`, EN/TR anahtar, cookie kalıcılığı, tam çeviri (ön izleme + a11y etiketleri), Türkçe karakter/sarma, CTA→`/login`/`/signup`, public landing, korumalı rotalar (demo kapalıyken login), ön izlemenin Supabase’siz oluşu doğrulandı. Masaüstü/tablet/mobil tarayıcı kontrolü yapıldı. Dev overlay’de görülen hidrasyon uyarısı Cursor `data-cursor-ref` enjeksiyonu + HMR kaymasından kaynaklandı; üretim build temiz. `NEXT_PUBLIC_SITE_URL` üretimi ertelenmiş.

### 6.16 P1 — Trending Apps ve New Releases — 26 Kasım 2026

- **Ekranlar (korumalı):** `/trending`, `/new-releases`; App Details altında “Rankings” bölümü; kenar çubuğunda “Intelligence” grubu. Dashboard “Trending apps” kartı `/trending`'e bağlanır.
- **Karşılaştırılabilirlik (tek kaynak: `src/lib/intel/ranking.ts`, saf TypeScript):** seri = kaynak + liste türü + mağaza + ülke + istenen dil + chart + kategori; derinlik değişimi ayrı segmenttir. Uygun snapshot: `coverage_status = bounded`, run `accepted`, truncated değil, değerlendirme nedeni yok (`coverage_uncertain`, `dataset_below_expected` vb. dışlanır), istenen derinlik biliniyor ve tam karşılanmış, toplama modu `charts`. 1/7/30 gün bazları gerçek geçen süreye göre seçilir (18–36 sa, 6–8 g, 27–33 g); pencere dışında karşılaştırma yoktur, komşu snapshot “günlük” sayılmaz. Listede olmayan uygulama düşüş değildir (“Not in top N”, yalnız sayı olarak); baz listede olmayan uygulama “Newly observed”. Eksik gün doldurulmaz.
- **Migration (uygulandı, geliştirme Supabase):** `20261126000900_ranking_intelligence.sql` uzak geliştirme projesine tek transaction ile uygulandı ve `appradar_meta.schema_migrations` içine `20261126000900_ranking_intelligence.sql` olarak kaydedildi (2026-11-26T18:17:01Z). Önceki 8 migration yeniden uygulanmadı. Fonksiyonlar: `appradar_read_chart_facts`, `appradar_read_app_chart_history` (yalnız okuma) ve `appradar_read_ranking_changes` düzeltmesi (son uygun snapshot + aynı derinlikteki önceki uygun snapshot). Tablo/indeks/DML yok. `SECURITY INVOKER`, boş `search_path`; `anon`/`authenticated` EXECUTE yok (42501); yalnız `service_role`. Dönüş kolonlarında job/lease/maliyet/dataset/actor/`source_run_id` yok; `run_incomplete_reason` token veya `other`.
- **New Releases:** App Store new-app chart üyeliği (Google Play için doğrulanmış kaynak yok, gösterilmez) ile takip edilen uygulamaların bilinen yayın tarihleri ayrı bölümlerdir; ikincisi “tam liste değildir” etiketi ve tarih hassasiyetiyle (“date only”) gösterilir.
- **Demo:** `src/lib/ui/demo-charts.ts`: yükselen/düşen sıralar, yeni girişler, eksik gün, truncated ve partial run, derinlik değişimi (20→50), yetersiz geçmiş, run kökeni olmayan seri, yayın tarihinden önce listede görünmeyen new-app girişleri. Yalnız geliştirme demosu; ağ/Supabase yok. Dashboard demo sıralama değişimleri aynı kurala göre üretilir.
- **Doğrulama (P1 entegrasyon):** SQL dry-run VALIDATION_PASS → apply. Sentetik transaction verisiyle SQL↔TS bütünlük INTEGRITY_PASS (derinlik uyumu/uyumsuzluğu; provider/build/method; accepted/rejected/partial/truncated; bilinmeyen derinlik; eksik kapsam; 1/7/30g pencereleri; eksik gözlem; newly observed; listeden çıkan app; bağımsız seriler; gelecek yayın tarihi; boş üretim kataloğu). Dashboard `ranking_changes` ~3 saatlik aralığı günlük diye etiketlemez; `newerExcluded` iletilir. PostgREST `appradar_read_chart_facts` / `app_chart_history` / `ranking_changes` 200; geçersiz anahtar 401. Geçici DB kayıtları geri alındı (apps/snaps/runs/jobs=0). Auth/demo gateway testleri ve landing locale testleri yeşil; içerik kapıları kapalı (`APIFY_COLLECTION_ENABLED=false`, `POC_DATA_USE_CONFIRMED=false`). Tam paket: typecheck OK; lint 0 hata (2 mevcut `<img>` uyarısı); **126/126** test; production build OK.
- **Engeller:** gerçek chart toplama (zamanlama ve ücretli toplama kapalı); ticari veri kullanım izni; gerçek Auth oturumuyla Trending/New Releases tarayıcı turu bu turda yapılmadı (demo + PostgREST + birim testleriyle doğrulandı).

### 6.17 P2 — Market Insights ve Opportunity Finder — 26 Kasım 2026

- **Ekranlar (korumalı):** `/markets`, `/opportunities`; kenar çubuğunda “Research” grubu. Migration yok: sınırlı PostgREST listing okumaları (bağlam başına en fazla 5.000 satır, aşılırsa “truncated”) ve P1 chart servisleri.
- **Kohort:** tek mağaza + ülke + istenen dil; ya bir listing kategorisi ya da P1 kurallarına göre son uygun (complete/accepted, aynı derinlik) chart snapshot'ı. Mağaza, ülke, para birimi, chart bağlamı ve seriler birleştirilmez; takip edilen uygulamalar pazarın tamamı değildir.
- **Tek hesaplama modülü:** `src/lib/intel/market.ts` (gerçek ve demo aynı kod). Göstergeler: Quality Gap (bilinen puanı < 4.0 olan pay; puan yok veya 0 değerlendirme = bilinmiyor), Neglected Competitors (geçerli son güncellemesi > 365 gün; eksik tarih ihmal sayılmaz), Newcomer Presence (geçerli yayın tarihi ≤ 365 gün), Developer Concentration (tanımlı geliştiricili takip edilen uygulamalarda ilk 3 geliştiricinin payı; pazar payı değildir), Incumbent Strength (rating count medyan, P25/P75), Pricing Landscape (bilinen fiyatlarda ücretsiz payı; ücretli fiyatlar para birimi başına). Medyan/yüzdelik: doğrusal interpolasyon (R-7). Geçersiz tarih: ayrıştırılamayan, 24 saatten fazla gelecekte veya 2008 öncesi; hariç tutulur ve sayılır. Bileşik skor ve AI önerisi yoktur.
- **Geçici eşikler (`MARKET_THRESHOLDS`):** düşük puan 4.0; ihmal 365 g; yeni giriş 365 g; ilk 3 geliştirici; bilinen gözlem < 5 → değer gizlenir; < 20 → küçük örneklem uyarısı; kohortun < %70'i biliniyorsa → düşük kapsam uyarısı; tazelik 72 sa. Doğrulanmış ticari tahmin değildir.
- **Demo:** kategoriler arasında puan, değerlendirme sayısı, fiyat (bir EUR listing), yayın/güncelleme tarihleri, geliştirici yoğunluğu, eksik alanlar (bilinmeyen güncelleme, tanımsız geliştirici), gelecek tarihler (1 güncelleme, 1 yayın) ve küçük örneklemler farklılaştırıldı; demo yakın tarihli yayın listeleri gelecekteki tarihleri gerçek servis gibi dışlar. Yalnız geliştirme demosu; ağ/Supabase yok.
- **Doğrulama (P2 entegrasyon):** Korumalı `/markets`/`/opportunities` + `requireViewer`; demo kapalıyken proxy login yönlendirmesi; boş üretim kataloğunda PostgREST listing/RPC uyumu (view/rows boş, truncated değil); P1 chart_facts RPC 200. Ortak `market.ts` hesapları (medyan/yüzdelik, denizanası, free/paid, geçersiz/gelecek tarihler, küçük örneklem/düşük kapsam, 5.000 satır tavanı, sıralamada null sona). Chart kohortunda üyelik snapshot’tan, metrikler güncel listing’den — UI metni bunu açıkça ayırır; tazelik yalnız `last_observed_at` (eksik = unknown, taze varsayılmaz). Sentetik DB kaydı gerekmedi; apps/listings/snaps=0. Demo izolasyonu ve P1 rotaları korunuyor. Tam paket: typecheck OK; lint 0 hata (2 mevcut `<img>` uyarısı); **141/141** test; production build OK (`/markets`, `/opportunities` rotaları). Masaüstü/tablet/mobil tarayıcı kontrolü yapıldı.
- **Engeller:** gerçek listing/chart toplama kapalı; ticari veri kullanım izni; eşiklerin gerçek veriyle kalibrasyonu; üretim SITE_URL / gerçek Auth tarayıcı turu ertelenmiş.

### 6.18 P3 — Compare Apps ve Watchlist — 26 Kasım 2026

- **Ekranlar (korumalı):** `/compare` (2–3 uygulama, paylaşılabilir URL: `apps`, `country`, `language`), `/compare/add` (Explorer ve App Details'ten ekleme; aynı bağlamdaki son seçime ekler, en fazla 3; yönlendirme yalnız `/compare?…`, açık yönlendirme yok), `/watchlist`. Explorer / App Details / Compare üzerinde Save/Compare; kenar çubuğu: Research → Compare apps, My workspace → Watchlist. Explorer kaydedilmiş durumu `savedItemsOrEmpty` ile yükler (Details/Compare ile tutarlı).
- **Karşılaştırma kuralları (`src/lib/intel/compare.ts`, saf):** tek ülke + istenen dil; tüm uygulamalar aynı mağazada olmalı. Tekrarlanan id'ler URL'den atılır; geçersiz id ve 3'ten fazla uygulama reddedilir. Güncel listing değerleri kendi gözlem tarihiyle etiketlenir. Puan geçmişi yalnız aynı kaynak/rol varsa üst üste çizilir. Sıralama geçmişi yalnız aynı chart serisinde üst üste çizilir (P1). Uygun (eligible) snapshot'larda null konum = o gün top-N'de yok; incomplete/ineligible gözlemler çizime alınmaz ve “kesin yokluk” sayılmaz. Farklı para birimleri işaretlenir. Skor/kazanan yok.
- **Migration (uygulandı, geliştirme Supabase):** `20261126001000_watchlist.sql` uzak geliştirme projesine tek transaction ile uygulandı ve `appradar_meta.schema_migrations` içine `20261126001000_watchlist.sql` olarak kaydedildi (`applied_at` 2026-11-26T19:18:52.112Z). Önceki migration'lar yeniden uygulanmadı. `public.watchlist_items` (PK `user_id, app_id, country, requested_language`); FK: `user_id → auth.users` ve listing bağlamı → `app_listings`, ikisi de `ON DELETE CASCADE`. RLS: authenticated yalnız kendi satırları SELECT/INSERT/DELETE; UPDATE yok; anon grant yok. Tetikleyici `SECURITY INVOKER`, `search_path=""`, kullanıcı başına advisory xact lock ile 50 satır sınırı. Listing yenileme (`appradar_persist_app_observations` ON CONFLICT DO UPDATE) ve soft expiry satır silmez → watchlist korunur; sert listing silme / hesap silme cascade eder. Kaydetme collection tetiklemez.
- **RLS doğrulama (veritabanı düzeyi, sentetik kimlikler):** `SET LOCAL ROLE authenticated` + `request.jwt.claim.sub` (`auth.uid()` yolu; service_role kullanıcı yerine kullanılmadı). A okur/yazar/siler kendi satırlarını; B A'nın satırlarını okuyamaz/silemez ve A adına insert edemez (42501); anon 42501; ownership UPDATE 42501; geçersiz app/listing FK 23503; duplicate 23505; 50 sınırı ve eşzamanlı 49→50 yarışında biri başarılı / biri `watchlist_limit_reached`, final=50; bulk insert sınırda atomik başarısız; hesap silince cascade. **Tarayıcıda gerçek sign-in yapılmadı** (auth sağlayıcı yapılandırılmadı; JWT secret yok — PostgREST HTTP oturum testi yok). Uygulama yazma yolu: `createSupabaseServerClient` (publishable + oturum), service_role watchlist'te yok.
- **Demo:** yalnız `NODE_ENV=development` + `APPRADAR_DEMO_MODE=true`; httpOnly çerez; 50 öğe ≈ 2699 bayt (<4KB); geçersiz/aşırı parçalar düşülür; demo Supabase'e yazmaz (`watchlist_items` boş kaldı); production bu dala girmez.
- **Doğrulama:** tam paket 156/156; typecheck OK; lint 0 hata (2 mevcut img uyarısı); production build OK. Masaüstü + mobil (390×844) Explorer Save/Compare → Compare URL → Watchlist; `/watchlist` ve `/compare/add` `Cache-Control: no-store`. Düzeltmeler: ranking gap metni (eligible-only çizim); Explorer saved-state preload.
- **Engeller:** gerçek Auth ile uçtan uca watchlist (tarayıcı sign-in); gerçek veri toplama kapalı; production DB'ye dokunulmadı.

### 6.19 B1 — Alan tazeliği ve eski admin erişimi — 26 Kasım 2026

- **Kök neden:** T4 kaynak kalitesini tarihten önce seçiyordu; başka bir alanın gözlemi `last_observed_at` değerini ilerletirken tutulan eski metrikler taze görünebiliyordu. Eski `/admin`, ürünün Supabase okuma geçidi yerine yerel POC/demo kataloğunu okuyordu.
- **İleri migration (uygulandı, geliştirme Supabase):** `20261126001100_field_freshness.sql` uzak geliştirme projesine tek transaction ile uygulandı ve `appradar_meta.schema_migrations` içine kaydedildi (`applied_at` 2026-11-26T20:05:07.546Z). Önceki migration'lar yeniden uygulanmadı. Yalnız `private.observation_wins` ve `public.appradar_persist_app_observations` değiştirildi; yeni tablo/backfill/yetki genişlemesi yok. Boş katalogda apply sonrası listing/snapshot parmak izi değişmedi. `anon`/`authenticated` EXECUTE yok; yalnız `service_role`.
- **Kesin birleştirme sırası:** aynı app/ülke/istenen dil alanında önce **detail > discovery**; aynı otorite seviyesinde **observedAt → eşit zamanda Aurelix detail tercihi → collectedAt → source → runId → build**. Eski Aurelix detail daha yeni uyumlu detail'i ezemez; discovery authoritative detail'i ezemez. Temsilci snapshot işaretçisi aynı kurala uyar.
- **Null/fiyat:** null alan korunur; fiyat/tutar/para birimi atomik; uyumlu bare `is_free` tutulan fiyat provenance'ını yenilemez; çelişkili flag amount+currency'yi birlikte bilinmeyene çevirir. Snapshot immutability ve replay idempotency korunur.
- **Uzak SQL doğrulama (sentetik kayıtlar, sonra temizlendi):** detail/discovery önceliği; daha yeni uyumlu detail; eşit zamanda Aurelix; out-of-order; bağımsız alan tarihleri; ilgisiz discovery'nin listing zamanını ilerletip metrik zamanını değiştirmemesi; null koruma; atomik fiyat; bare/çelişkili `is_free`; idempotent replay; tarihsel snapshot/seri bütünlüğü; snapshot UPDATE reddi; privilege izolasyonu. TS `fieldFreshness` ile 72s stale / unknown / listing≠metric tutarlılığı doğrulandı.
- **Okuma/sunum:** listing tazeliği yalnız listing gözlemini belirtir (`Listing observed` / `Listing stale`). Metrikler kendi provenance tarihini taşır (`Metric observed`, UTC ipucu). Markets: `Metric provenance: N stale · …` ve “Listing observations do not refresh retained metrics.” Dashboard, Explorer, Details, Markets, Opportunities, Compare, Watchlist aynı kuralları kullanır; demo aynı freshness helper'larını izler.
- **Admin:** `/admin` ve alt yolları proxy'de Auth/demo'dan önce **HTTP 404** + `Cache-Control: private, no-store` + `X-Robots-Tag: noindex`; sayfa `notFound()`. Demo tarayıcıda 404 doğrulandı; gövdede POC/journal yok. Post-login hedef listesinden çıkarıldı. CLI `poc:*` / `data:*` scriptleri duruyor.
- **Doğrulama (entegrasyon):** tam paket **160 pass / 1 skip** (skip: `B1_PGLITE_PATH` yokken yerel PGlite runner; uzak SQL ile ikame edildi) / 0 fail; typecheck OK; lint 0 hata (2 mevcut img uyarısı); production build OK. Masaüstü + mobil Explorer/Markets tazelik göstergeleri ve admin 404 denetlendi.
- **Sınır:** geçmiş listing değerleri geriye dönük yeniden birleştirilmez. Gerçek Auth oturumuyla admin 404 (authenticated) bu turda yapılandırılmadı; proxy tüm ortamlarda Auth'tan önce 404 döner. Production DB'ye dokunulmadı; ücretli çağrı/toplama yok.

**B1 değişen dosyalar:**
- SQL/test: `supabase/migrations/20261126001100_field_freshness.sql`, `supabase/tests/field-freshness.sql`, `tests/b1-hardening.test.ts`.
- Veri: `src/lib/read/field-freshness.ts`, `src/lib/read/shared.ts`, `src/lib/read/app-details.ts`, `src/lib/read/markets.ts`, `src/lib/intel/market.ts`, `src/lib/ui/demo-catalog.ts`.
- UI: `src/components/core/` altında `field-freshness.tsx`, `view-models.ts`, `catalog-mapping.ts`, `elements.tsx`, `dashboard.tsx`, `explorer.tsx`, `app-details.tsx`, `markets.tsx`, `opportunities.tsx`, `research.tsx`, `compare.tsx`, `watchlist.tsx`.
- Erişim/belge: `src/app/admin/page.tsx`, `src/proxy.ts`, `src/lib/auth/paths.ts`, `APPRADAR.md`.

### 6.20 B2 — Veri yönetişimi ve saklama — 26 Kasım 2026

**Ticari izin durumu: [DOĞRULANMADI].** Hiçbir sağlayıcı (Subimpact, Aurelix, TheWolves, Aurelix Play Reviews, DataTrail, ASO Keyword Intel) veya kaynak mağaza için saklama, gösterim, türetilmiş analiz ya da yeniden dağıtım iznini gösteren kayıt repoda yok. Herkese açık olmak, ücretli actor çağrısı veya ücretsiz beta bu hakları vermez. Aşağıdaki süreler **planlama için teknik varsayılandır, onaylı sağlayıcı saklama izni değildir**; izin daha kısaysa kısa süre uygulanır. Medya, açıklama ve yorum içeriği bayrakları kapalı kalır.

#### Veri kategorileri

| Kategori | Tablolar | Varsayılan süre / yaş çapası | Temizlik davranışı |
|---|---|---|---|
| Kanonik kimlik | `apps`, `developers` | Süre yok | Hiç silinmez (geliştirici adı dahil). Açık silme talebi ayrı, elle yürütülen iştir |
| Güncel listing metadata ve metrik (`listing_current`) | `app_listings` | 30 gün; satır: `last_observed_at`, metrik: kendi provenance `observedAt` | Eski metrik null olur. Süresi dolan satır silinir; kaydedilmiş veya geçmişi olan satırın yalnız içeriği boşaltılır |
| Tarihsel snapshot (`app_snapshots`) | `app_snapshots` | 365 gün, `collected_at` | Satır bütün olarak silinir; güncellenmez |
| Keşif ve sıralama (`discovery_history`) | `discovery_snapshots`, `discovery_entries` | 365 gün, `collected_at` | Snapshot ve girdileri birlikte silinir |
| Anahtar kelime (`keyword_history`) | `keyword_snapshots`, `keyword_entries` | 365 gün, `collected_at` | Snapshot ve girdileri birlikte silinir |
| Yorum içeriği ve gözlemi (`reviews`) | `reviews`, `review_observations` | 90 gün, `last_seen_at` | Gözlemler silinir; gözlemi kalmayan yorum silinir |
| Toplama işi (`collection_jobs`) | `private.collection_jobs` | 90 gün, `completed_at` (yoksa `updated_at`) | Yalnız sonuçlanmış iş ve provider run'ı kalmadıysa |
| Provider run (`provider_runs`) | `private.provider_runs` | 365 gün, `finished_at`/`updated_at` | Yalnız uzlaşmış, hiçbir gözlemin başvurmadığı run |
| Bütçe kaydı (`budget_records`) | `private.budget_periods` | 365 gün, `period_end` | Rezervasyonu sıfır ve run'ı kalmamış dönem |
| Kullanıcı takip listesi | `watchlist_items` | Kullanıcı yönetir | Rutin temizlik hiç silmez; yalnız kullanıcı silmesi veya hesap silme |

#### Kurallar

- Bir satır `en erken(expires_at, yaş çapası + politika günü) <= now()` olunca adaydır. Mevcut `expires_at` hiç uzatılmaz; daha uzun politika süresi dolmuş satırı geri getirmez. `expires_at` olmayan tablolarda yalnız yaş kullanılır.
- Politika dosyasında sekiz kategorinin tümü, `providers` ve `approval` alanları zorunludur (1–730 gün). Kod varsayılanı yoktur; eksik veya tanınmayan değer çalışmayı reddeder. `providers.<ad>.<kategori>` o sağlayıcı için kategori süresinin yerine geçer; `budget_records` sağlayıcıya bölünmez. Listing birden çok sağlayıcının alanını taşıdığından satır süresi en kısa olanıdır.
- **Takip listesi:** `watchlist_items` listing silinince cascade olur, bu yüzden kaydedilmiş listing silinmez. İçeriği süresi dolunca null yapılır (bilinmeyen, sıfır değil), `expires_at` yalnız öne çekilir; yeni gözlem satırı yeniden doldurur. Silme öncesi satır kilitlenip uygunluk yeniden denetlenir. Rol RLS'yi aşamıyorsa (takip satırlarını göremiyorsa) fonksiyon çalışmayı reddeder.
- **Sonuçlanmamış kayıt:** `queued`/`running`/`ingesting` veya deneme hakkı kalan `failed` iş; `unknown`/`running` execution; `reserved`/`unknown` maliyet; ücretli başlangıcı istenmiş `pending` run silinmez. Böyle tek bir deneme işin tüm run'larını korur. Başlangıcı hiç istenmemiş `pending` run sonuçlanmış sayılır.
- **Bütçe bütünlüğü:** bir run ancak günlük ve aylık döneminin ikisi de saklama süresini geçmiş ve rezervasyonsuzsa silinir; tutulan dönemin run'ları eksilmez. Bu yüzden run'lar 365 günden en fazla yaklaşık bir ay daha uzun kalabilir.
- **FK sırası:** review_observations → reviews → keyword → discovery → app_snapshots (önce `latest_snapshot_id` boşaltılır) → listing metrik → listing içerik → listing → provider_runs → collection_jobs → budget_periods. Gözlemi tutulan run ve run'ı tutulan iş, kendi süresi dolsa da kalır.
- Tarihsel gözlem güncellenmez. Güncellenen tek şey güncel `app_listings` izdüşümüdür.

#### Uygulama

- Migration `20261126001200_data_retention.sql` (**development Supabase'e uygulandı**, `appradar_meta.schema_migrations` defteri 12/12; `applied_at` 2026-11-26T20:35:07.722Z). Production veritabanına **uygulanmadı**. `private.retention_lock` (tek satırlık kira; RLS açık), `private.retention_*` yardımcıları ve `public.appradar_retention_report` / `_batch` / `_release`. Hepsi `SECURITY INVOKER`, boş `search_path`, yalnız `service_role` EXECUTE. `service_role` için `watchlist_items` SELECT yetkisi açıkça yazıldı. Zamanlama kurmaz.
- Kod: `src/lib/retention/` (`policy.ts`, `run.ts`, `cli.ts`, `policy.example.json`). `report` `STABLE` fonksiyondur, yazamaz. Her `batch` çağrısı tek adımın en çok 500 satırlık kendi transaction'ıdır. Kira 5 dakikalıktır, her batch yeniler; ikinci çalışma `retention_cleanup_locked` alır.
- Çıktı yalnız adım, tablo, kategori ve sayılardır; satır içeriği, kimlik, URL veya anahtar yazılmaz.

#### Okunabilirlik (temizlik bağımlılığı)

Politika yaşını aşmış ama `expires_at` henüz dolmamış satırlar, temizlik çalıştırılana kadar okuma katmanında **görünür kalır**. Temizlik satırı silmeden veya içeriği null yapmadan okuma sözleşmesi saklama politikasını uygulamaz. Operasyonel bağımlılık: dry-run ile aday sayısını izle; silme ancak onaylı politika + `RETENTION_CLEANUP_EXECUTION=true` + `--execute` ile yapılır. Geniş okuma-servisi yeniden tasarımı yapılmadı.

#### İşletim

Otomatik temizlik ve zamanlama **yok**. Development migration deftere işlendi. Production uygulaması ve onaylı üretim saklama politikası ayrı kullanıcı onayı ister.

Politika kopyası (git dışı `.poc/` altında):

```bash
mkdir -p .poc && cp src/lib/retention/policy.example.json .poc/retention-policy.json
```

Dry-run (varsayılan):

```bash
npm run retention -- --policy .poc/retention-policy.json
```

Bu komut ortamda `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` bekler; `.env.local` kendiliğinden okunmaz:

```bash
node --env-file=.env.local --import tsx src/lib/retention/cli.ts --policy .poc/retention-policy.json
```

Silme için üç şart birlikte gerekir: politika dosyasında insan kararına dayanan `"approval": { "approvedBy": "…", "approvedAt": "2026-…Z", "evidence": "…" }`, ortamda `RETENTION_CLEANUP_EXECUTION=true` ve `--execute`. Önce aynı politika ile dry-run okunur ve yedek durumu doğrulanır; silme geri alınamaz.

```bash
RETENTION_CLEANUP_EXECUTION=true node --env-file=.env.local --import tsx src/lib/retention/cli.ts --policy .poc/retention-policy.json --execute --batch-size 100 --max-batches 20
```

`stillEligible` boş değilse (batch sınırı veya kilitli satır) komut güvenle yeniden çalıştırılır. `completed: false` olursa önceki batch'ler kalıcıdır; hata kodu incelenip yeniden denenir. Dry-run sayıları, daha önceki adımlar uygulanmış varsayılarak verilir; toplamalar arada çalışırsa sayı değişebilir.

#### Doğrulama ve sınırlar — B2 entegrasyon (26 Kasım 2026)

- **Migration:** defter doğrulandı; `20261126001200_data_retention.sql` development'a uygulandı (12 migration). Önceki migration'lar yeniden uygulanmadı. Production dokunulmadı.
- **Sentetik SQL (development, rollback/izolasyon, TAG `b2ret`):** 27/27 — kategori/sağlayıcı süreleri, `expires_at` uzatmama, fail-closed politika, unapproved batch reddi, dry-run yazmama, onay kapıları, sınırlı batch + silme sırası, FK bütünlüğü, apps/developers/watchlist koruma, listing içerik/metrik temizliği, alan yenileme, snapshot bütün-silme, unresolved/unknown/unsettled/bütçe koruma, idempotent tekrar, anon/authenticated EXECUTE reddi. Geçici kayıtlar silindi; `collection_jobs_guard` yeniden açıldı.
- **Eşzamanlılık (iki PostgreSQL oturumu):** 10/10 — aktif kira ikinci işçiyi `retention_cleanup_locked` ile keser; süresi dolmuş kira güvenle devralınır; eski holder devam edemez; açık transaction sırasında örtüşme yok; watchlist-first silmeyi engeller; yarışta watchlist+eksik listing durumu oluşmaz; temizleme sonrası ingestion satırı tutarlı doldurur. Kod düzeltmesi gerekmedi.
- **CLI / PostgREST:** onaysız `policy.example` kopyası ile dry-run OK (`dryRun: true`, kapılar listelenir, kilit/silme yok). `--execute` without `RETENTION_CLEANUP_EXECUTION` → `retention_execution_closed:…`. Flag açık + onaysız politika → `policy_not_approved`. Ücretli API çağrısı yok.
- **Güvenlik:** içerik bayrakları kapalı (`APPRADAR_STORE_*` / review content). Demo yalnız `NODE_ENV=development` + `APPRADAR_DEMO_MODE=true`. Retention RPC yalnız `service_role`. Loglarda satır içeriği/kimlik/anahtar yok.
- **Kalite kapısı (tek koşu):** test 165 geçti, 2 atlandı (PGlite retention senaryosu — yerel PGlite yok; `psql` worker), 0 başarısız; typecheck OK; lint 0 hata (2 mevcut img uyarısı); `next build` OK.
- **PGlite:** bu ortamda `RETENTION_PGLITE_PATH` / paket yok; bellek içi 12/12 önceki B2 biriminde doğrulanmıştı, bu turda tekrarlanamadı.
- **Kapsam dışı / kalan engeller:** ticari veri kullanım izni doğrulanmadı; onaylı üretim saklama politikası yok; zamanlayıcı kapalı; production DB değişmedi; sağlayıcı outreach yok; yedekler/Apify dataset/yerel journal/Auth hesapları kapsam dışı. Büyük hacimde süre ölçülmedi.
- Toplayıcının yazdığı `expires_at` (`retentionDays`) bu politikadan bağımsızdır; politika yalnız temizlikte ek üst sınırdır. Güncel `reviews` satırı, kalan başka gözlemi varsa silinmiş bir gözlemden dolmuş alanı taşıyabilir.
- Sonuçlanmamış veya uzlaşmamış kayıtlar süresiz kalır; `collection/cli.ts resolve` ile elle uzlaştırılır.

### 6.21 B3 — Üretim ve kimlik doğrulama hazırlığı — 26 Kasım 2026

Üretim projesi, deployment ve uzak ayar **yoktur**; uzak veritabanı, Auth ayarı, ücretli çağrı ve temizlik çalıştırılmadı. İşletim rehberi: `docs/PRODUCTION.md`.

#### Yapılandırma kapısı
- `src/lib/config/production.ts`: `NODE_ENV=production` iken eksik/geçersiz yapılandırmada proxy tüm istekleri **503** + `private, no-store` ile kapatır (eski `/admin` yine 404). Log yalnız değişken adı ve neden kodu taşır.
- Zorunlu: `APPRADAR_SUPABASE_PROJECT_REF` (yeni), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (https, yalnız origin, yerel olmayan alan adı). İki Supabase URL'si ve eski JWT anahtarlarının `ref` değeri beyan edilen ref ile eşleşmelidir.
- `APPRADAR_DEMO_MODE`, `COLLECTION_PAID_EXECUTION`, `APIFY_COLLECTION_ENABLED`, `POC_DATA_USE_CONFIRMED`, `RETENTION_CLEANUP_EXECUTION` boş veya `false` olmalıdır. `NEXT_PUBLIC_*` içinde gizli anahtar veya Apify token'ı reddedilir.
- Ağsız ön kontrol: `npm run check:env`. Development demo davranışı değişmedi. Yerel `next start` da üretim sayılır.
- Sınır: `sb_…` anahtarları ref taşımaz; beyan edilen ref'in geliştirme ref'i olup olmadığı anlaşılamaz. İçerik bayrakları (`APPRADAR_STORE_*`, yorum) hak kararıdır, kapı bunları zorlamaz.

#### Doğrulanan ve düzeltilen kusurlar
- Proxy `/en`, `/tr`, `/forgot-password` gibi sayfalarda oturumu yenilemiyordu; Server Component yenilenen refresh token'ı yazamadığı için oturum düşebilirdi. Artık `/auth/*` dışındaki her sayfada yenilenir.
- İptal edilmiş ama süresi dolmamış token `/login` ↔ `/dashboard` yönlendirme döngüsü üretebilirdi. Guest-only yönlendirme `getUser()` ile doğrulanır.
- Parola sıfırlama ve kayıt, adres bazlı e-posta bekleme hatasını göstererek hesabın varlığını açığa çıkarabilirdi. Bu hata başarıyla aynı yanıtı verir ve kodu loglanır.
- Güvenlik yanıt başlıkları yoktu: CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, üretimde HSTS (`next.config.ts`). CSP nonce kullanmaz; inline script serbesttir.
- Başarısız katalog okumaları hiç loglanmıyordu; yalnız hata kodu yazılır.

Sıkılaştırma: anonim Supabase kullanıcısı oturumsuz sayılır; parola değişince diğer oturumlar kapatılır; OAuth hedefi önek yerine origin eşitliğiyle denetlenir; okunamayan oturum çerezi oturumsuz sayılır; `/settings` sunucuda `requireViewer` çağırır; `/compare/add` `private, no-store`.

#### İncelenip değiştirilmeyenler
- `safeNextPath`, callback yönlendirmesi, watchlist yetkisi (doğrulanmış kullanıcı + RLS), `/admin` 404 ve kullanıcıya özel önbellek (paylaşılan veri cache'i yok).
- İdari RPC izolasyonu: 12 migration bellek içi PGlite'ta Supabase benzeri varsayılan yetkilerle uygulandı; `anon`/`authenticated` hiçbir fonksiyonu çalıştıramıyor, `SECURITY DEFINER` yok, yalnız `authenticated` için `watchlist_items` SELECT/INSERT/DELETE var. Uzak veritabanında yeniden denetlenmedi.
- Sınırlar: sayfa ≤100 kayıt, offset ≤10.000, karşılaştırma ≤3, watchlist ≤50, market ≤5.000 satır. Web isteği sağlayıcı API'si çağırmaz. Süreç içi rate limit, Redis veya ücretli servis eklenmedi; Supabase ve hosting ayarları gereklidir. Auth çağrıları sunucudan gittiği için Supabase IP limitleri ziyaretçi bazlı değildir.

#### Doğrulama — B3 entegrasyon (26–27 Kasım 2026)

- **Kimlik doğrulama:** yalnızca **mock / izole** senaryolar (`tests/production-readiness.test.ts`, `tests/auth.test.ts` ve ilgili UI testleri). Gerçek Supabase Auth, SMTP, kullanıcı oluşturma veya e-posta **doğrulanmadı** ve yapılandırılmadı.
- **Üretim kapısı (gerçek `next build` + `next start`):** eksik/geçersiz env ve `APPRADAR_DEMO_MODE=true` → tüm rotalar **503** + `private, no-store` (eski `/admin` ve `/admin/*` yine **404**). İzole fixture değerleriyle geçerli yapılandırma → `/en` `/tr` `/login` **200**, `/dashboard` **307** `/login?next=…` (kapı yanlışlıkla engellemez). Log satırı yalnız `appradar_config_invalid:NAME:reason`. Client `.next/static` içinde `sb_secret_` / `SERVICE_ROLE` / `DATABASE_URL` / `APIFY_TOKEN` yok. Web kapısı collection/retention CLI dosyalarını import etmez; işçiler kendi bayraklarıyla ayrı kalır.
- **Güvenlik başlıkları:** production yanıtlarında CSP (`script-src 'self' 'unsafe-inline'`, `connect-src 'self'`, `frame-ancestors 'none'`, …), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS `max-age=31536000`. Development'ta HSTS yok; CSP'te `'unsafe-eval'` + `ws:` var. **CSP sınırlaması:** nonce yok; inline script serbest bırakıldı (geniş yeniden tasarım yok). Google OAuth canlı CSP akışı denenmedi.
- **Development tarayıcı:** demo açıkken `/en`, `/login`, `/dashboard` (masaüstü + ~390px); dashboard sentetik “DEVELOPMENT DEMO” verisi gösteriyor. Production fixture `/en` demo katalog işaretleri taşımıyor; `APPRADAR_DEMO_MODE=true` production'da 503 ile demo verisi sunulmaz.
- **Geliştirme veritabanı defteri:** 12/12 migration. Salt-okunur yetki: `anon`/`authenticated` collection/retention/budget/admin RPC EXECUTE edemez (`has_function_privilege` + retention çağrıları `42501`); `SECURITY DEFINER` yok; `watchlist_items` için `authenticated` SELECT/INSERT/DELETE korundu. Grant değişikliği yapılmadı.
- **Rate limit:** uygulama içi süreç/Redis yok. Mevcut sınırlar duruyor (sayfa ≤100, offset ≤10k, compare ≤3, watchlist ≤50). Manuel: Supabase Auth rate limits + hosting firewall (`docs/PRODUCTION.md` §7).
- **Kalite kapısı (tek koşu):** test **180 geçti, 2 atlandı, 0 başarısız** (PGlite yok; `psql` worker atlandı); typecheck OK; lint 0 hata (2 mevcut `<img>` uyarısı); `next build` OK.

#### Değişen dosyalar
`src/proxy.ts`, `src/lib/config/{production,check}.ts`, `src/lib/auth/{actions,config,server}.ts`, `src/lib/ui/catalog.server.ts`, `src/app/settings/page.tsx`, `src/app/compare/add/route.ts`, `next.config.ts`, `package.json`, `.env.example`, `tests/production-readiness.test.ts`, `docs/{PRODUCTION,AUTH_SETUP}.md`, `APPRADAR.md`.

#### Kalan manuel adımlar ve yayın engelleri
Kontrol listesi: `docs/PRODUCTION.md` §11. Başlıca engeller: ticari veri kullanım izni; gizlilik politikası, koşullar, iletişim ve hesap silme süreci; **üretim Supabase projesi yok**; migration'ların production'a uygulanması; Auth/SMTP/OAuth yapılandırması ve **gerçek** uçtan uca auth testi; Supabase/hosting rate limit; yedek ve geri yükleme provası; onaylı saklama politikası; deployment.

### 6.22 B4 — Gerçek veri pilotu (ön kontrol) — 27 Kasım 2026

#### Sahip onayı (bütçe ve kapsam — veri kullanım izni değil)
Aşağıdakiler **onaylandı**: günlük bütçe **USD 1**; aylık bütçe **USD 5**; Actor koşusu başına üst ücret **USD 0.05** (motor `maxChargeUsd` sabiti); ülke **US**; dil **en**; kategori Productivity (iOS `6007`, Play `PRODUCTIVITY`); App Store top **50** free; Google Play top **50** free; iOS new releases istenen limit **10** (DataTrail aşımı bilinen risk); keşiften sonra tekilleştirilmiş detay toplama; teknik `retentionDays` / `expires_at` **30 gün**; yalnız **development** Supabase.

**Bütçe/kapsam onayı, ticari veya POC veri kullanım onayı değildir.** `POC_DATA_USE_CONFIRMED` bu turda **true yapılmadı** ve yapılamaz.

#### Hazırlık durumu
- Yapılandırma: git dışı `.poc/pilot.config.json` (`schedulingEnabled: false`, `retentionDays: 30`, `maxAttempts: 2`; Aurelix charts, Subimpact charts, DataTrail charts, Aurelix details iki hedef). Detay `appIds` keşif sonrası doldurulacak yer tutucudur.
- Offline `collection/cli.ts plan`: dry-run OK; **5 iş**; rezervasyon tavanı **$0.25**; kapılar kapalı (`COLLECTION_PAID_EXECUTION`, `APIFY_COLLECTION_ENABLED`, `POC_DATA_USE_CONFIRMED`, token/bütçe eksikleri).
- Hedef DB (salt okuma): development `*.supabase.co`; migration defteri **12/12**; `apps=0`; `budget_periods` boş (bu turda yazılmadı). Üretim kaynağı yok.
- Build pinleri (`src/poc/plan.ts`): Aurelix `0.2.23` / `Jv44m9YSKPnrplU1T`; Subimpact `0.1.1` / `NHjJXD6Nrjf8MpxN1`; DataTrail `0.1.7` / `oKsySVUZf5K5p2o1U`.
- İçerik bayrakları ve saklama temizliği kapalı kalır. Zamanlama kapalı.

#### Veri kullanımı — iç pilot ile ticari saklama/gösterim ayrımı
- Repoda hiçbir sağlayıcı veya mağaza için saklama/gösterim/yeniden dağıtım izni kaydı yok (§5.2, §6.20): durum **[DOĞRULANMADI]**.
- Apify Standard Actor Contract (yayımlanmış): Actor'u **kendi iç iş amaçlarıyla** kullanma hakkı; çıktının Creator'a karşı IP'si kullanıcıda kalabilir; **kullanıcı**, çıktının yürürlükteki hukuka ve **üçüncü taraf IP haklarına** uygunluğundan sorumludur. Bu, App Store / Google Play şartları altında katalog verisini üründe saklama veya gösterme izni değildir.
- Apify Genel Şartları (eski/genel metinler): çıkarma yalnızca yetkili olunan kaynaklarda; ihlalde sorumluluk kullanıcıdadır.
- Pilotun teknik yolu ücretli Actor + development DB'ye kalıcı yazma + (bayraklar kapalı olsa bile) metrik/sıralama UI gösterimini içerir → bu **saklama ve gösterim**dir; “yalnızca platform ücreti ödendi” yeterli dayanak değildir.
- Sonuç: `POC_DATA_USE_CONFIRMED` iç pilot için **meşru şekilde true edilemez**. Kapı açılmadan ücretli `work` çalışmaz. Ön kontrol sonucu: **BLOCKED**.

#### Sonraki adımlar (engel kalkarsa)
1. Sağlayıcı + mağaza için saklama/gösterim dayanağını kaydet (gerekirse uzman incelemesi; outreach ayrı onay).  
2. Kaydı APPRADAR'a yazdıktan sonra operatör `POC_DATA_USE_CONFIRMED=true` ve diğer ücretli bayrakları / bütçe env'lerini development kabuğunda açar.  
3. Önceki B4 plandaki enqueue → `work --max-jobs 1` sırası; keşif sonrası ID tekilleştirme; detay; `reconcile`; ~24s sonra `--new-window` ranking.

### 6.23 B5 — Beta yayın hazırlığı — 27 Kasım 2026

- **Yasal/iletişim taslakları:** `/en/privacy`, `/en/terms`, `/en/contact` ve `/tr/…` karşılıkları mevcut tanıtım tasarımını ve dil mimarisini kullanır; footer bağlantıları çalışır. Dil değişimi aynı belgeyi korur. Başlık/metadata yereldir; taslaklar production'da da `noindex` kalır. Görünür taslak ve eksik sahip bilgisi uyarısı vardır; şirket, adres, e-posta, yetki alanı, mevzuata uyum veya ticari veri hakkı uydurulmadı. Yayın onayı verilmedi; iletişim sayfası mesaj/talep göndermez.
- **Hesap:** `/settings` erişim kontrolünden sonra `/account`'a yönlenir; eski tarayıcı-içi takip iddiaları ürün akışından çıkarıldı. Hesap e-postası, parola değiştirme/kurtarma, çıkış ve silme aynı sayfada.
- **Silme yetkisi:** demo daha Auth çağrısı olmadan reddedilir. Server Action tam `DELETE` metni + ayrı onay + parolayı kontrol eder. `getUser()` ile o isteğin gerçek, anonim olmayan ve e-postası doğrulanmış kullanıcısı alınır; yalnız bu e-postayla, tarayıcıya yazmayan geçici istemcide yeni parola doğrulaması yapılır. Dönen kullanıcı kimliği aynı olmalı; ilk oturum yeniden doğrulanır; 60 saniyeyi aşan kanıt reddedilir. Formdaki kimlik/e-posta/proje kullanılmaz. Doğrulanmış MFA faktörü varsa parola ile güvenlik seviyesi düşürülmez, işlem kapalıdır.
- **Silme kapsamı:** `server-only` modülde session/admin proje origin'leri, anahtar türleri ve eski JWT proje ref'leri denetlenir. Yalnız `auth.admin.deleteUser(currentUser.id, false)`; mevcut `0010` watchlist FK cascade'i kullanılır. Ortak katalog, diğer hesaplar ve immutable gözlemler için DML yok. Yeni migration yok; uzaktaki 12 migration'a dokunulmadı.
- **Hata davranışı:** önce elle watchlist silinmez. Belirsiz/başarısız silme yanıtında aynı kullanıcı bir kez sorgulanır; yalnız başarı veya açık `user_not_found` tamamlanma sayılır; belirsizlikte başarı iddiası ve otomatik silme tekrarı yok. Başarıda yerel çıkış; geçici doğrulama oturumunda her sonuçta çıkış denenir. Ağ hatasında sunucu token iptali gecikebilir; çıkış hatası tamamlanmış silmeyi geri almaz. Yedek/altyapı kaydı temizliği veya bütün JWT'lerin anında geçersizleşmesi vaat edilmez; uygulama erişimi `getUser()` ile doğrulanır, silinen kullanıcı için watchlist FK'sı yeniden yazmayı engeller.
- **Sınırlamalar:** yalnız Google kullanan hesap mevcut parola kurtarma akışıyla önce parola belirlemelidir (gerçek projede desteklenmesi doğrulanacak). MFA veya kurtarma istisnaları için sahibin sağlayacağı doğrulanmış destek süreci eksiktir. Gerçek Auth, SMTP, OAuth ve hesap silme bu görevde denenmedi. Onaylı saklama/yedek/kayıt süreleri ve gerçek iletişim bilgisi hâlâ yayın engelidir.
- **Doğrulama (B5 entegrasyon, 27 Kasım 2026):** Odaklı paket (`beta-readiness` + landing + auth + production-readiness) **42/42**. Tam paket **194 pass / 2 skip / 0 fail** (PGlite yok → retention DB testi skip; `RETENTION_PGLITE_PATH` yok). Typecheck OK; lint 0 hata, 2 mevcut `<img>` uyarısı; production build OK (`/[locale]/[document]`, `/account`, `/settings` dahil). Yerel HTTP: altı yasal rota 200 + `noindex`/draft; `/admin` 404 + `private, no-store`; güvenlik başlıkları (CSP, `X-Frame-Options: DENY`, Permissions-Policy) korunuyor; hesap/settings `Cache-Control: no-store`. Demo tarayıcı: EN/TR Privacy masaüstü+mobil, footer/dil; `/settings` → `/account`; demo hesapta silme formu yok. `.next/static` içinde service-role/secret eşleşmesi yok. B4 §6.22 bloğu ve ücretli/toplama/saklama kapıları (`POC_DATA_USE_CONFIRMED` vb. false) korundu.
- **Silme doğrulama sınırı:** Hesap silme güvenliği **yalnızca mock** (sahte HTTP + sentetik kullanıcı/çerez). Gerçek Supabase Auth oturumu, SMTP, OAuth, MFA challenge veya canlı `deleteUser` **doğrulanmadı**; gerçek hesap/uzaktan DB silinmedi. Watchlist cascade için önceki SQL/RLS kanıtı + mock taklit; bu turda yeni DB cascade koşusu yok.
- **Dosyalar:** `src/lib/landing/{legal,locale,metadata,dictionaries}.ts`, `src/components/landing/{public-chrome,legal-page,landing-page}.tsx`, `src/app/[locale]/[document]/page.tsx`, `src/lib/auth/delete-account{,-action}.ts`, `src/components/auth/delete-account-form.tsx`, `src/app/{account,settings}/page.tsx`, `src/app/(auth)/auth-card.tsx`, `tests/beta-readiness.test.ts`; işletim ayrıntıları `docs/BETA_READINESS.md`, güncellenen `docs/{AUTH_SETUP,PRODUCTION}.md`.
- **Beta kararı:** teknik hazırlık doğrulandı, **yayına hazır değil**. B4 ticari kullanım engeli ve bütün veri/toplama kapıları korundu. Sahip/hukuk onayı + çalışan iletişim kanalı, gerçek Auth ve production yapılandırması, onaylı saklama politikası, veri kullanım dayanağı ve yetkilendirilmiş pilot beklenir. Ücretli API/toplama, gerçek hesap silme, uzak DB işlemi, deployment, dış kaynak oluşturma, zamanlama/temizlik veya ödeme işlemi yapılmadı. Onaylı kusur bulunmadı; kod düzeltmesi yapılmadı.

### 6.24 Gerçek geliştirme Auth doğrulaması — 27 Kasım 2026

Sahip, geliştirme Supabase projesinde gerçek e-posta/parola Auth akışlarını manuel doğruladı. Bu kayıt **B5 mock testlerinin yerine geçmez**; mock güvenlik senaryoları ile canlı happy-path ayrı kanıtlardır. Uygulama kodu değişmedi (`ae3ecfc` baseline).

- **Yapılandırma düzeltmeleri (yalnızca `.env.local`, git dışı):** `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_URL` yanlışlıkla `/rest/v1/` yolunu içeriyordu. Birincisi kayıtta HTTP 404; ikincisi `accountDeletionConfig` doğrulamasını düşürüp hesap sayfasında “Account deletion is not configured” gösteriyordu. Her iki değişken de artık proje origin’i (`https://<ref>.supabase.co`, path/query/hash yok). Ayrıntı: `docs/AUTH_SETUP.md`.
- **Sahip tarafından doğrulanan (geliştirme projesi, varsayılan Supabase SMTP):** kayıt; e-posta teslimi; e-posta onayı; giriş; Dashboard ve Explorer erişimi; oturum kalıcılığı; çıkış; korumalı rota yönlendirmeleri; parola sıfırlama; hesap silme (happy-path).
- **Doğrulanmadı / iddia edilmez:** Google OAuth; MFA; üretim SMTP veya production Auth; silme kenar durumları (MFA fail-closed, belirsiz sağlayıcı yanıtı, kimlik uyuşmazlığı, çapraz origin, vb. — bunlar B5 mock suite’te kaldı); canlı ortamda iki kullanıcılı watchlist izolasyonu; production deployment.
- **Kalan yayın engelleri:** ticari veri kullanım dayanağı ve ücretli/pilot kapıları; sahip/hukuk onayı + çalışan iletişim kanalı; production Supabase projesi + migration + env; özel SMTP/DNS ve production Auth E2E; OAuth (istenirse) + yasal sayfa onayı; host/Auth rate limit; yedek/geri yükleme; onaylı saklama politikası; izleme. B4 `POC_DATA_USE_CONFIRMED` false kaldı.

### 6.25 B4.2 — Medya, atıf ve pilot politika ayrımı — 27 Kasım 2026

Minimal genişleme: ortak `APPRADAR_STORE_MEDIA_ENABLED` kaldırıldı/yok sayılır; yerine `APPRADAR_STORE_ICONS_ENABLED` ve `APPRADAR_STORE_SCREENSHOTS_ENABLED` (varsayılan false). Açıklama ve yorum içeriği bayrakları aynı. Sağlayıcı medya uygunluğu provenance `source` ile (aurelix/datatrail aday; subimpact/bilinmeyen kapalı) — doküman adaylığı canlı doğrulama veya hukuki onay değildir. HTTPS + mağaza/CDN host allowlist (`mzstatic.com`, `googleusercontent.com`, `ggpht.com`); ikili görüntü saklanmaz. `apps.icons_suppressed_at` / `screenshots_suppressed_at` + `appradar_set_media_suppression` (service_role) koleksiyon yenilemesine rağmen gösterimi keser. UI: mevcut AppIcon/galeri; mağaza listesi bağlantısı; atıf; `/en/contact` içerik bildirimi. EN/TR Terms taslaklarına üçüncü taraf içerik ve kaldırma bölümleri eklendi. İç/public kapsam ayrımı: `docs/CONTENT_USAGE.md`. B4 pilot bütçe/kapsam ve tüm ücretli kapılar korundu; hiçbir display/collection bayrağı açılmadı. Yorumcu kullanıcı adı/avatar zaten normalize/persist/okuma dışında.

**Entegrasyon doğrulama (geliştirme Supabase, 27 Kasım 2026):** `20261126001300_media_suppression.sql` uygulandı; ledger **13/13**. Sütunlar ve `appradar_set_media_suppression` yalnızca `service_role`; anon/authenticated EXECUTE yok. Sentetik geri alma ile ikon/ekran bastırması bağımsız ve listing yenilemesine dayanıklı (kalıcı kayıt yok). Fixture: bayraklar false, legacy media yok sayılır, host allowlist, provenance, expired/suppressed public yanıt dışı, env ile bypass yok, reviewer kimliği hariç, mağaza/atıf/iletişim bağlantıları ve EN/TR Terms bölümleri. Kalite: test 199/199 (+2 skip), typecheck OK, lint (img uyarıları hariç temiz), production build OK. Bayraklar ve ücretli toplama kapalı kaldı.

### 6.26 B4.3 — İç pilot yetki, yürütme ve Aurelix metadata eşlemesi — 27 Kasım 2026

**Politika:** `APPRADAR_THIRD_PARTY_RIGHTS_STATUS` = `verified` | `unconfirmed` | `prohibited` (eksik → kapalı).  
- `verified` → yalnız kanıtlı dayanak ile `POC_DATA_USE_CONFIRMED=true`.  
- `unconfirmed` → operatör onayı **ve** ayrı unconfirmed-risk kabulü; pilot sınırları kodda. Operatör onayı lisans değildir.  
- `prohibited` → her zaman kapalı. `POC_DATA_USE_CONFIRMED` non-verified altında reddedilir.  
- Production web: pilot/public-display bayrakları fail-closed.

**Yürütme (development, shell-only auth, `POC_DATA_USE_CONFIRMED=false`):** 2 Aurelix details koşusu SUCCEEDED + settled; pin `0.2.23` / `Jv44m9YSKPnrplU1T`. Maliyet **$0.00484 + $0.00484 = $0.00968**; rezervasyon 0. DB: apps/listings/snapshots **6/6/6**, reviews **0**. İkon **6/6** allowlist; ekran **87** URL (0 rejected); CDN `*.mzstatic.com`, `play-lh.googleusercontent.com`. Expiry ~30g. Medya/public bayraklar kapalı kaldı; `.env.local` yazılmadı.

**Metadata eşleme (pilot dataset kanıtı):** Aurelix alanları `description`, `released_at`, `updated_at` (ISO-8601 `…Z`). Normalize artık saklar; geçersiz/gelecek tarihler reddedilir; provenance/freshness korunur. Açıklama gösterimi hâlâ `APPRADAR_STORE_DESCRIPTION_ENABLED` ile kapalı. Mevcut 6 listing bu eşlemeden **önce** yazıldı — description/tarih backfill yok; sonraki detay koşusunda dolar.

**Kalan engel:** üçüncü taraf hakları `unconfirmed`; ticari/public display yok. Ayrıntı: `docs/CONTENT_USAGE.md`, `docs/contracts/README.md`.

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

**[ÖNERİ] Saklama:** normalize günlük snapshot 12 ay, ham payload en fazla 7 gün, operasyon logu 30 gün; gerçek izinler ve bütçe daha kısaysa kısa süre uygulanır. Bunlar henüz kullanıcı kararı değildir (uygulanan saklama mekanizması ve planlama varsayılanları: 6.20). Silme işi test edilir; yedeklerdeki süre ayrıca belgelenir. Uzun vadeli depolama için günlük/haftalık özet önerilebilir fakat kaynak geçmişin üstüne sessizce yazılmaz.

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
| [21st.dev](https://21st.dev/) | Tasarım ve bileşen keşfi | Seçilen bileşenlerin MIT notları kaynak dosyalarda. Modern Minimal tema lisansı doğrulanmadı |
| [shadcn/ui](https://ui.shadcn.com/docs) | UI altyapı referansı | Sürüm ve seçili bileşenler uygulamada sabitlenecek |
| [Tailwind responsive](https://tailwindcss.com/docs/responsive-design) | Responsive uygulama referansı | Bu belge görsel prototip değildir |
| [Next.js App Router](https://nextjs.org/docs/app) | Web mimarisi referansı | Proje kurulumu/testi yapılmadı |
| [Supabase Auth](https://supabase.com/docs/guides/auth) | Kimlik doğrulama referansı | Giriş yöntemi yapılandırılmadı |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Yetki modeli referansı | Politika kodu ve izolasyon testi sonraki aşama |
| [Supabase Cron](https://supabase.com/docs/guides/cron) | Zamanlama referansı | İş sıklığı ve limitler onaylanmadı |
| [Supabase Edge Functions](https://supabase.com/docs/guides/functions) | Orkestrasyon referansı | Plan limitleri ve runtime uyumu doğrulanacak |

**Belge sonu — ajan için ilk çıktı:** Kod yazmadan ürün/veri analizi, açık noktalar, önerilen kararlar, aşamalı uygulama ve POC planını sun; açık kullanıcı onayını bekle.
