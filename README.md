# AppRadar

Türkçe uygulama keşif ve gözlem paneli. Ürün şartnamesi: [APPRADAR.md](APPRADAR.md).
Güncel iş parçaları: [GELISTIRME.md](GELISTIRME.md).

Şu an **yerelde çalışan Next.js demo uygulaması** hazır. Arama, mağaza/ülke/
kategori/fiyat filtreleri, sıralama, sayfalama, liste/kart görünümü, detay,
örnek geçmiş ve tarayıcıda saklanan takip listesi çalışır. Hesap gerekmez.
24 mağaza kaydı sentetiktir; arayüzde açıkça Demo olarak etiketlenir.

## Uygulamayı yerelde aç

```sh
npm ci
npm run dev
```

[Yerel uygulama](http://127.0.0.1:3000/explore). Sunucu yalnızca `127.0.0.1`
üzerinde dinler. Başka bir port gerekiyorsa `npm run dev -- --port 3001`.
Kapatıp yeniden açmak için proje klasöründe `npm run dev` yeterlidir.

Keşfet'te arama yap, bir mağaza seç, uygulamanın yer imi düğmesine bas ve
Takip listem'e geç. Sayfa yenilense de kayıt aynı tarayıcıda kalır. Takipler
ülke bazındadır; TR takibi US listesine karışmaz. Ayarlar'dan demo takipleri
temizlenebilir. Canlı veri ve hesapla giriş henüz bağlı değildir.

Yerel demo işlemleri Apify'yi çağırmaz ve ücretli çalışma başlatmaz. Token
sunucuda kalır. Gerçek veri kaynağı testleri aşağıdaki ayrı araçlarla yapılır.

## Kurulum ve kontroller

Node.js >=22.18 ve npm gerekir. Kurulu bağımlılıkların kesin sürümleri
`package-lock.json` ile sabitlenir.

```sh
npm ci
npm run check
npm run poc:plan
npm run poc:report
```

`check`: TypeScript, ESLint, ağ kullanmayan testler ve Next.js üretim derlemesi.
POC araçlarını ayrıca derlemek için `npm run build:poc`. CI/varsayılan test
ücretli API çağırmaz. `plan` ve `report` da ağ isteği yapmaz.

## Supabase katalog şeması — T2

Dört tabloluk katalog migration'ı ve rollback edilen SQL testleri hazırdır.
Yerel PostgreSQL test motoruyla doğrulanır; canlı Supabase projesine uygulanmaz.
Uygulama henüz Supabase'e bağlı değildir. Kapsam, sınırlamalar ve test komutları:
[supabase/README.md](supabase/README.md).

## Gerçek POC erişimi

`.env.example` dosyasını `.env.local` olarak kopyalayın. Gerçek Apify tokenını
yalnızca bu yerel dosyaya veya güvenli process environment'a ekleyin; sohbete,
koda veya Git'e yazmayın. `.env.local` otomatik yüklenir ve Git'ten hariçtir.

Canlı çalışma için aşağıdaki dört koşul birlikte gerekir:

1. `APIFY_TOKEN`: hesabın uygun yetkili tokenı.
2. `POC_LIMIT_USD=5`: kullanıcı tarafından onaylı tüketim tavanı; daha düşük
   değer seçilebilir, 5'in üstü reddedilir.
3. `APIFY_COLLECTION_ENABLED=true`: gerçek çalışma açık.
4. `POC_DATA_USE_CONFIRMED=true`: POC kapsamında çekme, inceleme ve kısa süreli
   saklama için kullanım dayanağı gerçekten kontrol edildi. Bu bir otomatik
   lisans kararı değildir; doğrulanmadıysa `false` bırakılır.

Hesaptaki güncel ücret olaylarını, minimum çalışma bedelini ve varsa sağlayıcı
harcama sınırını da kontrol edin. Aylık üretim bütçesi henüz belirlenmedi;
bu araç üretim taraması yapmaz.

```sh
npm run poc:run -- --round 1
# Daha sonra, ayrı zamanda:
npm run poc:run -- --round 2
npm run poc:report
```

Her tur sıralı çalışır. Birinci tur tamamlanmadan ikincisi başlamaz. Varsayılan
bekleme süresi komut başına 600 saniyedir; `--wait-seconds 0` beklemeyi kapatır,
`run` komutunun yeni ücretli iş başlatma davranışını değiştirmez. Üst sınır
1800'dür. Süre dolarsa checkpoint korunur ve
aynı `run` komutu güvenle sürdürülebilir. `resume` yalnızca başlamış işleri
okur; yeni actor çalışması başlatmaz. Yalnızca mevcut durumu kontrol etmek için
`resume --wait-seconds 0` kullanılır. Tamamlanmış işler tekrar başlatılmaz.

```sh
npm run poc:resume -- --round 1
npm run poc:run -- --job PLANDAKI_IS_KIMLIGI
```

## Güvenlik ve maliyet davranışı

- 76 çalışma / 160 planlanan detay gözlemi; 20 farklı uygulama, iki mağaza,
  iki ülke ve iki zaman. Arama/listeler ayrı kontrollü işlerdir.
- Her çalışmada Apify API'ye `maxTotalChargeUsd=0.05`, sabit build,
  sınırlı sonuç ve `restartOnError=false` gönderilir.
- Çalışmaların azami rezervasyon toplamı **3.80 USD**; onaylı POC tavanı 5 USD.
  Bu tutar fiyat teklifi veya toplam altyapı faturası garantisi değildir.
- Bütçe ve tek çalışma kilidi yerel `.poc/` defterinde tutulur. Rezervasyon
  diske yazılmadan ücretli POST yapılmaz. Bu araç tek makinedeki POC içindir;
  üretimde PostgreSQL transaction/lease kullanılır.
- Bilinmeyen maliyette rezervasyon serbest bırakılmaz. Daha ucuz gerçekleşen
  run'ın boşluğu da yeni işler için geri kullanılmaz; muhafazakâr tavan korunur.
- POST timeout/5xx sonrasında kör yeniden başlatma yok. GET hatalarında
  en fazla iki tekrar yapılır; yönlendirmeler izlenmez.
- Sağlayıcı input'u, actor/build kimliği ve dönen maliyet tavanı doğrulanır.
- API tokenı yalnızca Authorization başlığındadır; URL veya rapora yazılmaz.
- Her dataset sayfasından sonra checkpoint; çalışma başına en fazla 200 ham
  satır okunur. Limit aşımı başarılı POC sayılmaz.
- Ham payload'ın tamamı saklanmaz. En fazla üç allowlist edilmiş ham örnek ve
  normalize sonuçlar tutulur; yorum yazarları/iletişim bilgileri alınmaz.
- `.poc/` özel kanıt klasörüdür; paylaşmadan önce inceleyin. POC saklama
  dayanağı daha kısa süre gerektirmiyorsa en fazla 7 gün içinde silin.
- `.poc/run.lock` normal kapanışta kaldırılır. Süreç zorla sonlandırıldıysa
  dosyadaki PID'nin gerçekten çalışmadığını doğrulamadan kilidi silmeyin.

## Belirsiz başlangıçtan kurtarma

POST cevabı kaybolursa run başlamış olabilir. Yeni koşu oluşturmak yerine
Apify Console'dan ilgili run'ı bulun ve mevcut işe iliştirin:

```sh
npm run poc:resume -- --job IS_KIMLIGI --attach-run-id APIFY_RUN_KIMLIGI
```

İliştirme actor, build, zaman, maliyet tavanı ve gerçek `INPUT` kaydını
doğrular. Başka işe bağlı run kabul edilmez. Run bulunamıyorsa rezervasyonu
elle silip yeniden denemeyin; önce hesap/sağlayıcı kayıtlarıyla başlangıcın
gerçekleşmediğini kesinleştirin.

## POC kabulü

`.poc/report.json` mağaza/ülke/tur bazında kapsamı, alan doluluğunu, eksik
kimlikleri, hataları, ücret olaylarını ve zaman farklarını gösterir.

- Hiç canlı veri yoksa `AWAITING_LIVE_DATA`.
- Eksik işler varsa `INCOMPLETE`.
- Tam matris kalite eşiklerini geçmezse `NO_GO_REVIEW_REQUIRED`.
- Teknik eşikler geçerse `TECHNICAL_RESULTS_READY_FOR_REVIEW`.

Teknik sonuç tek başına üretim onayı değildir. `usageTotalUsd` fatura ile
uzlaştırılmalı; saklama/gösterim izinleri belgelenmeli ve birincil sağlayıcı
seçilmelidir. İki gözlem yalnızca snapshot akışını doğrular; geçmiş veri veya
aylık indirme/gelir tahmini sağlamaz. Her 10 uygulamalık alt grupta %95 eşiği
pratikte 10/10 gerektirir; küçük örneklem ölçek garantisi değildir.

Yerel demo, kullanıcının 26 Kasım 2026 tarihli yerelde çalıştırma isteğiyle
gerçek veri kapısından bağımsız oluşturuldu. Gerçek POC geçince desteklenen
alanlara göre canlı Next.js/Supabase bağlantısı geliştirilir. Erişim olmadan
canlı test başarılı gösterilmez.
