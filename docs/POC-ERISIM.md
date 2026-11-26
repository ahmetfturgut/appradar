# POC erişim kontrolü — 25 Kasım 2026

## Doğrulananlar

- `.env.local` içindeki token yalnızca Apify Authorization başlığında kullanıldı.
- `GET /v2/users/me`: kimlik doğrulama başarılı; hesap planı `FREE`.
- Her iki actor'ın metadata kaydı kimlik doğrulamalı GET ile okunabildi.
- Actor ve build kimlikleri kaydedilmiş sözleşmelerle aynı:
  Subimpact `0.1.1` / `NHjJXD6Nrjf8MpxN1`,
  Aurelix `0.2.23` / `Jv44m9YSKPnrplU1T`.
- Kamuya açık fiyat kayıtlarının son başlayan döneminde FREE uygulama olayı
  Subimpact için 0.0003 USD, Aurelix için 0.00018 USD; Aurelix başlangıç olayı
  0.0043 USD ve bellekle ölçeklenebilir. Hesaba özel nihai fatura doğrulanmadı.
- Token, kullanıcı adı, e-posta, hesap kimliği veya sır bu kayda eklenmedi.

## Açık koşullar

- `APIFY_COLLECTION_ENABLED=false` ve `POC_DATA_USE_CONFIRMED=false`.
- POC bütçesi 5 USD olarak ayarlı. Ücretli actor **başlatılmadı**.
- Kullanıcıdan POC kapsamındaki çekim ve kısa süreli saklama dayanağının
  doğrulanıp doğrulanmadığı soruldu. Teknik plan onayı izin kanıtı sayılmadı.

## Koşul incelemesi

- [Apify Actor koşulları](https://docs.apify.com/legal/actor-terms-and-conditions)
  ve [genel koşullar](https://docs.apify.com/legal/general-terms-and-conditions)
  incelendi. Actor kullanım hakkı kaynak mağaza içeriğinin yeniden yayını için
  bağımsız bir hak kanıtı sayılmadı.
- [Subimpact kullanım açıklaması](https://apify.com/subimpact/app-store-scraper)
  bazı uç noktalar için robots.txt kısıtlarını belirtiyor; mağaza koşullarına
  uyulmasını istiyor. Tüm plan için çekim hakkı doğrulandı sonucu çıkarılmadı.
- [Aurelix FAQ](https://apify.com/aurelix/app-store-google-play-scraper)
  yalnızca herkese açık verilerin analizini öneriyor ve mağaza koşulları
  hakkında sınırlamaları belirtiyor. Bu beyan hukuki uygunluk kararı sayılmadı.
- Henüz üretim gösterimi, görsel/yorum yeniden yayını veya ticari saklama
  için izin kanıtı yok. Bu inceleme bunları onaylamaz.

Sıradaki iş: eksik kullanım dayanağını netleştir; ardından onaylı bütçe içinde
ilk POC turunu çalıştır. Tokenı yeniden isteme ve sohbette gösterme.
