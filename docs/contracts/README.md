# Sağlayıcı sözleşmesi kayıtları

25 Kasım 2026 tarihli herkese açık GET incelemesi. Actor çalıştırılmadı.
Her JSON dosyası erişim zamanını, kaynak URL'lerini, actor/build kimliğini,
fiyat olaylarını ve build'in gerçek OpenAPI input şemasını içerir.

| Sağlayıcı | Actor kimliği | Sabit build | Başlangıç desteği |
|---|---|---|---|
| Subimpact | `cbSMPmaUHdY8NGIfS` | `0.1.1` / `NHjJXD6Nrjf8MpxN1` | İki mağazada details/search/charts |
| Aurelix | `wI26HiER6vwANfcVs` | `0.2.23` / `Jv44m9YSKPnrplU1T` | İki mağazada detay, yalnızca iOS chart; keyword search yok |
| TheWolves | `4qRgh5vXXsv0bKa1l` | `0.0.1057` / `MHfNUQWkb1bIq1UKN` | Yalnızca iOS App Store reviews; detay matrisi dışında |
| Aurelix Play Reviews | `iD7roBA32ueErH8qD` | `0.1.8` / `w3YTTu8Bd7IY6z2uU` | Yalnızca Google Play sayfalı reviews; detay matrisi dışında |
| DataTrail | `tKFe5g7p3PeBBfVhW` | `0.1.7` / `oKsySVUZf5K5p2o1U` | Apple `new-*-apps` charts; Play new-apps chart yok; detay matrisi dışında |
| ASO Keyword Intel | `w4WTaae6mpu8tDtRo` | `0.2.5` / `9ton1HLQZxcwZx6Jy` | Keyword rank + Apple/proxy popularity + difficulty; katalog araması değil |

## Kaynaklar

- [Subimpact metadata](https://api.apify.com/v2/acts/subimpact~app-store-scraper)
- [Subimpact OpenAPI](https://api.apify.com/v2/acts/subimpact~app-store-scraper/builds/default/openapi.json)
- [Subimpact çıktı açıklaması](https://apify.com/subimpact/app-store-scraper)
- [Aurelix metadata](https://api.apify.com/v2/acts/aurelix~app-store-google-play-scraper)
- [Aurelix OpenAPI](https://api.apify.com/v2/acts/aurelix~app-store-google-play-scraper/builds/default/openapi.json)
- [Aurelix çıktı açıklaması](https://apify.com/aurelix/app-store-google-play-scraper)
- [TheWolves metadata](https://api.apify.com/v2/acts/thewolves~appstore-reviews-scraper)
- [TheWolves OpenAPI](https://api.apify.com/v2/acts/thewolves~appstore-reviews-scraper/builds/default/openapi.json)
- [TheWolves çıktı açıklaması](https://apify.com/thewolves/appstore-reviews-scraper)
- [Aurelix Play Reviews metadata](https://api.apify.com/v2/acts/aurelix~google-play-reviews-scraper)
- [Aurelix Play Reviews OpenAPI](https://api.apify.com/v2/acts/aurelix~google-play-reviews-scraper/builds/default/openapi.json)
- [Aurelix Play Reviews çıktı açıklaması](https://apify.com/aurelix/google-play-reviews-scraper)
- [DataTrail metadata](https://api.apify.com/v2/acts/datatrail~app-store-google-play-charts)
- [DataTrail OpenAPI](https://api.apify.com/v2/acts/datatrail~app-store-google-play-charts/builds/default/openapi.json)
- [DataTrail çıktı açıklaması](https://apify.com/datatrail/app-store-google-play-charts)
- [ASO Keyword Intel metadata](https://api.apify.com/v2/acts/petersutarik~aso-keyword-intel)
- [ASO Keyword Intel OpenAPI](https://api.apify.com/v2/acts/petersutarik~aso-keyword-intel/builds/default/openapi.json)
- [ASO Keyword Intel çıktı açıklaması](https://apify.com/petersutarik/aso-keyword-intel)
- [Asenkron actor başlatma ve maxTotalChargeUsd](https://docs.apify.com/api/v2/actors-runs-post)

## Girdi/çıktı ayrımı

OpenAPI girdileri gerçek şemadan doğrulanmıştır. OpenAPI dataset öğelerinin
tam çıktı şemasını vermiyor. `normalize.ts` içindeki çıktı şemaları
sağlayıcının README alanlarına dayanan **aday sözleşmelerdir**; fixture testinin
geçmesi gerçek dataset sözleşmesinin geçtiği anlamına gelmez.

| Normalize alan | Subimpact aday yolu | Aurelix aday yolu |
|---|---|---|
| Mağaza | `store`: ios/play | `store`: app_store/google_play |
| Kimlik | `appId` | `app_id` |
| Ad | `appTitle` | `title` |
| URL | `appUrl` | `url` |
| Ülke | `country` | `country` |
| Gözlem zamanı | `scrapedAt` | `scraped_at` |
| Puan | `rating` | `rating` |
| Değerlendirme sayısı | `ratingCount` | `ratings_count` |
| Yazılı yorum sayısı | `reviewCount` | `reviews_count` |
| Yükleme alt sınırı | `minInstalls` | `installs_min` |
| Açıklama | (aday) | `description` (**B4.3 doğrulandı**; saklama OK, public gösterim `APPRADAR_STORE_DESCRIPTION_ENABLED`) |
| Yayın / güncelleme | — | `released_at` / `updated_at` ISO-8601 Z (**B4.3 doğrulandı**) |
| İkon / ekran | — | `icon_url` / `screenshots` (**B4.3 doğrulandı**; CDN allowlist) |
| Liste bağlamı | `chartCollection`, `chartCategory`, `chartRank` | `chart`, `chart_genre`, `chart_rank` |
| Arama bağlamı | `searchTerm`, `searchRank` | Desteklenmiyor |

Ülke/mağaza/kimlik/URL doğrulanır. iOS metin dili yalnızca request'teki
`language` ile kesinleştirilmez; `requestedLanguage` ayrı saklanır, efektif dil
bilinmiyorsa null kalır. Google Play'de çıktı dili varsa istekle eşleştirilir.
Liste filtre bağlamı eksikse genel listeyi kategori sonucu olarak kabul etmez.

## T1 — Normalize v2 kimlik ve zaman sözleşmeleri

Actor input'ları ve indirilen contract JSON'ları değiştirilmedi. Yeni
normalizasyon çıktısı `schemaVersion: 2`; observation SHA-256 anahtarları
tür/sürüm etiketli yapısal dizilerden üretilir. Canonical app anahtarı mağaza
kimliğiyle sabittir. Metin birleştirme veya ad benzerliği yoktur.

| Kayıt | Canonical / context kimliği | `idempotencyKey` observation kapsamı |
|---|---|---|
| App | `canonicalAppKey`: store + storeAppId | source + run + canonicalAppKey + ülke + istenen/efektif dil + observationRole + collectionContext |
| Review | `canonicalReviewKey`: store + storeAppId + reviewIdNamespace + sourceReviewId | canonicalReviewKey + run + ülke + istenen/efektif dil |
| Keyword | `keywordContextKey`: store + keyword + ülke + dil bağlamı + measurementMethod + relevantFilters | keywordContextKey + run + rowType + ranking app ID / suggestion metni |

App `collectionContext`, mode/context/category değerlerini saklar; developer
kimliği developer modunun context değeridir. Canonical app kimliği provider,
ülke, uygulama adı ve geliştirici adından bağımsızdır. Gözlenen değişken değerler
(rank, rating, yorum metni, skor) observation kimliğine eklenmez.

Review namespace'leri her Actor için `actor:<slug>` değeridir. İki Aurelix
Actor'ının ID'leri bile eşdeğerliği doğrulanmadan birleşmez. Aynı yorum başka
run'da yeni observation, aynı run/bağlam tekrarında aynı observation olur.

Keyword method'u ASO build'ini ve rowType'ı; metrics için bildirilen
`popularitySource` apple/proxy/unknown ayrımını içerir. `relevantFilters`:
`topN`, `appIds`, `includePopularity`, `includeSuggestions`. Eksik input null
olarak korunur; gizli Actor default'u varsayılmaz. App ID filtresi sırasız ve
tekrarsız bir kümedir. Keyword'ün büyük/küçük harf veya aksanları birleştirilmez.
Apple popularity, proxy skoru ve difficulty ayrı alanlardır; hacim değildir.

### Zamanlar

- App: kaynak scraped time → `observedAt`; yoksa collection fallback'i.
- Review: scraped time varsa `observedAt`; TheWolves gibi bu alanı vermeyen
  kaynaklarda collection fallback'i. `reviewedAt` yalnızca gerçek kaynak tarihi;
  bilinmiyorsa null. `observedTimeBasis` yorum tarihinin kökeni değildir.
- Keyword: `observedAt = checkedAt`, basis source. `measuredAt` ayrı ve nullable;
  cached/stale metriğin ölçüm zamanı gözlem zamanıyla değiştirilmez.
- `collectedAt` daima sistemin alma zamanı; replay'de değişse bile anahtar sabit.
- Release/update tarihleri kaynak yoksa null. DataTrail YYYY-MM-DD değerleri
  geçerli takvim günü olarak doğrulanır; ISO değeri yanında precision=date
  saklanır. Bu değer kesin saat veya doğrulanmış yayınlanma iddiası değildir.
- ASO language input'u yok: requestedLanguage korunur, language=null,
  languageInputSupported=false. İstenen dil gerçek ölçüm dili sayılmaz.

### Eski kayıtların okunması

`PersistedResultSchema` v1 ve v2 kayıtlarını ayrı sürümler olarak doğrular;
`ResultSchema` yalnızca yeni v2 çıktıları doğrular. Bozuk v2 veya bilinmeyen
sürüm v1'e düşürülmez. v1 hash'leri korunur; canonical/context v2 anahtarı
olarak kullanılmaz. Eski review `observedTimeBasis=collection` değeri, eski
reviewedAt'nin collection fallback'i olduğunu belirtir; yorum dağılımına
kaynak tarihi olarak alınmaz. v1 alanlarının anlamı yeni v2 anlamıyla karışmaz.

Journal zarfı, job ID, Actor input/build, rezervasyon ve satır checkpoint'i
korunur. Load işlemi dosya yazmaz. Tamamlanmış işler tekrar çağrı yapmaz;
yarım iş aynı run/cursor'dan devam ederek v2 satırlar ekleyebilir. v1/v2'nin
aynı kanıtı yeniden import etmesi halinde sürüm farkı tek başına yeni gözlem
sayılmaz: gelecekteki offline aktarım tam job/run/row bağlamıyla uzlaştırmalıdır.
Eksik bağlam için API çağrısı veya tahmini re-key yapılmaz. Arşiv JSON
fixture'ları redakte/kısmi kanıttır; yeni tam v2 kayıt ya da üretim yedeği değildir.

## Fiyat gözlemi

JSON dosyalarındaki `pricingInfos` birden çok dönem içerir; dizinin ilk
elemanını güncel fiyat kabul etmeyin. İlgili `startedAt` ve hesap planı
doğrulanmalıdır. Gözlem anında Subimpact `app`, Aurelix `app-result`,
`review-result`, `apify-actor-start` olayları tanımlıyor. Aurelix başlangıç
olayı bellekle ölçeklenebilir; yalnızca sonuç sayısına göre fiyat hesaplanmaz.

Bunlar herkese açık beyanlardır; hesaba özel ücret, fatura uzlaştırması,
veri saklama/gösterim lisansı veya gerçek çalışma başarısı kanıtı değildir.
Herhangi bir actor'ın OpenAPI içindeki otomatik araç açıklamaları uygulama
yetkisi sayılmaz; ücretli istekler uygulamanın kendi kapılarından geçer.

## Canlı test matrisi

- Detay: 20 kimlik × 2 ülke × 2 sağlayıcı × 2 tur = 160 beklenen gözlem.
- Arama: Subimpact, her mağaza/ülke/tur için `todo` ve `photo editor` ayrı işler.
- Listeler: üç liste türü; iOS Productivity `6007`, Play `PRODUCTIVITY`.
  Aurelix Play listeleri plana dahil edilmez.
- Negatif: iki sağlayıcı × iki mağaza × iki turda bulunmayan kimlik.
- 429, bozuk/eksik alan, timeout, tekrar işleme ve sayfalama kesintisi fixture
  ile sınanır; bunlar canlı hata deneyleri diye raporlanmaz.
- Kimliklerin ülke bazlı mağaza erişilebilirliği henüz doğrulanmadı. Başarısız
  uygulama sessizce örneklemden çıkarılmaz veya başarılı olarak yazılmaz.

Canlı koşu, fatura doğrulaması ve veri kullanım haklarının kanıtı bekliyor.
