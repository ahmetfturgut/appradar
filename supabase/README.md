# T2 — Katalog çekirdeği

Migration: `migrations/20261126000100_catalog_core.sql`. PostgreSQL **15+**
(`UNIQUE NULLS NOT DISTINCT`); Supabase'in `anon`, `authenticated`,
`service_role` rolleri önceden bulunmalıdır. Migration rol oluşturmaz.

Bu adım dört tabloyu içerir: `developers`, `apps`, `app_listings`,
`app_snapshots`. Henüz Supabase projesi/CLI konfigürasyonu, bağlantı,
veri aktarımı, Auth, worker, scheduler veya istemci okuma politikası yoktur.

## Bütünlük ve T1 eşlemesi

- Developer `(store, store_developer_id)`, app `(store, store_app_id)`,
  listing `(app_id, country, requested_language)` ile benzersizdir.
  Developer/app/listing/snapshot FK'leri mağaza değiştirerek yanlış eşleştirmeyi
  engeller. Service role mevcut kimlik kolonlarını güncelleyemez.
- App URL'si ülkesiz kimlik bağlantısıdır: iOS için
  `https://apps.apple.com/app/id<ID>`. Yerelleştirilmiş bağlantı, mağaza ID ve
  listing ülkesinden okuma katmanında türetilebilir; URL kimlik yerine geçmez.
- Snapshot yalnızca normalize **schemaVersion=2** kabul eder. T1
  `idempotencyKey → idempotency_key`, `sourceRunId → source_run_id`,
  `collectionContext → collection_mode/context/category` olarak saklanır.
  Ülke/istenen dil listing FK'siyle, gerçek dil snapshot üzerinde korunur.
- `UNIQUE idempotency_key` ve kaynak/run/listing/dil/rol/mod/bağlam için
  `NULLS NOT DISTINCT` replay çoğalmasını önler. Farklı run yeni gözlemdir.
  Hash'in T1 alanlarıyla anlamsal doğruluğu T1 runtime şemasında doğrulanır;
  PostgreSQL burada format/benzersizlik ve ilişkileri denetler.
- `content_hash` ve `series_key`, gelecekte T4 yazıcısında anlamlı alanlar ve
  uyumlu ölçüm tanımı üzerinden üretilecek; `payload_hash` ile eşit varsayılmaz.
- `source_run_id` bu aşamada dış Apify kimliğidir. **Provider-run FK'si henüz
  yoktur**; T3 `provider_runs` geldikten sonra ilişki ve geri doldurma eklenir.
  Geçici run tablosu oluşturulmadı. Ad standarttır: `provider_runs`
  (`source_runs` kullanılmaz).
- Güncel pointer aynı listing'in snapshot'ına bağlanabilir. Önce listing,
  ardından snapshot eklenip pointer güncellenebilir. Retention silmesinden
  önce pointer açıkça temizlenmeli/değiştirilmeli; silme cascade değildir.
- Snapshot UPDATE trigger ile reddedilir. Service role SELECT/INSERT/DELETE
  yapabilir; catalog metadata için yalnızca kimlik dışı kolonları güncelleyebilir.
- Null, gerçek sıfır, geçerli rating/fiyat/para birimi ve iOS'ta desteklenmeyen
  installs ayrımı SQL CHECK'leriyle korunur. Infinity/NaN bilinmeyen veri değildir.
- Release/update için kaynak hassasiyeti zorunludur. Precision=date değeri UTC
  gece yarısı taşıma değeridir, kesin saat iddiası değildir. Tarihler üretilmez.
- `expires_at` açık ve sonlu verilmelidir; migration saklama süresi belirlemez.
  SQL testlerindeki bir günlük tarih aralığı yalnızca rollback edilen test verisidir.

## T2.1 — T3 `provider_runs` ilişki planı

Snapshot değişmezliği ve mevcut `(source, source_run_id)` kolonları korunur;
T2 migration değiştirilmez.

| Konu | Karar |
|---|---|
| Tablo adı | `provider_runs` |
| Pre-Actor deneme | İç `id` UUID; `external_run_id` Actor yanıtına kadar `NULL` |
| UNIQUE | `(provider, external_run_id)` varsayılan `NULLS DISTINCT` (çoklu bekleyen deneme) |
| Snapshot FK | T3'te bileşik `app_snapshots(source, source_run_id) → provider_runs(provider, external_run_id)` |
| Ne zaman FK | `provider_runs` + distinct snapshot çiftlerinden backfill sonrası |
| Snapshot rewrite | Yok; satırlara UUID backfill yok |
| Writer sırası | `provider_runs` upsert (dış ID dolu) → snapshot insert |
| Reddedilen alternatif (onaysız) | Snapshot'a nullable `provider_run_id` UUID eklemek |

Bileşik FK, snapshot'ların zaten zorunlu dış run ID taşıması nedeniyle
tamamlanmış gözlemler için güvenlidir. ID öncesi denemeler yalnızca
`provider_runs` satırıdır.

## Sunum metadata → T4

`description`, `icon_url`, `screenshot_urls` güncel `app_listings` alanıdır;
`app_snapshots` metrik geçmişinde tekrarlanmaz. T1 normalize modeli ve T2 DDL
bu kolonları içermez; POC allowlist/Zod onları düşürür. Normalizasyon,
listing şema genişlemesi ve persistence T4 işidir (implementasyon bu adımda yok).

**T4 sınırı:** Eski/null/discovery verinin güncel alanı ezmemesi, kaynak kabulü,
alan bazlı provenance, transaction ile snapshot+pointer+checkpoint yazımı,
sunum metadata birleştirme burada implement edilmedi. Bu kurallar DDL'nin
otomatik davranışı değildir. Mevcut Next.js kataloğu hâlâ yerel journal'ı
okur; v1 kayıtlar otomatik aktarılmaz.

## Güvenlik

Dört tabloda RLS açıktır; istemci politikası yoktur. PUBLIC/anon/authenticated
tablo ve sequence yetkileri geri alınmıştır. Service role sunucu kullanımına
sınırlı grant alır; hiçbir anahtar bu migration veya testlere konmaz. Migration
diğer public tabloların veya schema'nın genel yetkilerini değiştirmez.

## Test

`tests/catalog.sql`, Supabase rol isimleri bulunan **atılabilir** PostgreSQL
15+ ortamında çalışır; test verisi ve geçici grant'ler sonunda rollback olur.
Bu testleri canlı projede çalıştırmayın.

Yerel PostgreSQL/Supabase test ortamında migration'ı migration runner ile veya
psql'ın `--single-transaction --set=ON_ERROR_STOP=1 --file` seçenekleriyle
uygulayın; ardından aynı ortamda `tests/catalog.sql` çalıştırın. Burada gerçek
proje bağlantısı veya migration otomatik çalıştırılmaz.

PostgreSQL/Docker kurulu değilse opsiyonel PGlite test aracı vardır. Proje
bağımlılığı değildir; test motorunu geçici klasöre sabit sürümle kurabilirsiniz:

```sh
T2_RUNTIME_DIR=$(mktemp -d)
npm install --prefix "$T2_RUNTIME_DIR" --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.6.0
node --import tsx supabase/tests/run-catalog.mjs "$T2_RUNTIME_DIR/node_modules/@electric-sql/pglite/dist/index.js"
```

Runner bellek içinde yeni PostgreSQL açar; Supabase rollerini yalnızca bu geçici
ortamda oluşturur, migration'ı transaction içinde uygular, SQL testlerini ve
mevcut gerçek app fixture örneklerinin T1→SQL eşlemesini doğrular; veriyi rollback
edip motoru kapatır. Apify/Supabase API veya uzak veritabanına bağlanmaz.
Bu sonuç tam Supabase stack/PostgREST ya da üretim performansı testi değildir.

Kaynaklar: [PostgreSQL 15 constraints](https://www.postgresql.org/docs/15/ddl-constraints.html),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PGlite](https://pglite.dev/docs/).
