import type { LandingLocale } from "./locale";

export const legalDocuments = ["privacy", "terms", "contact"] as const;
export type LegalDocument = typeof legalDocuments[number];
export const isLegalDocument = (value: string): value is LegalDocument => (legalDocuments as readonly string[]).includes(value);
type Document = { title: string; description: string; sections: { title: string; text: string }[]; missing: string[] };
type LegalDictionary = { draft: string; notice: string; unresolved: string; account: string; documents: Record<LegalDocument, Document> };

/** Draft copy only. Missing owner facts are visible, never replaced with invented contact details. */
export const legalDictionaries: Record<LandingLocale, LegalDictionary> = {
  en: {
    draft: "Draft · Not approved for publication",
    notice: "Prepared for beta review. Owner information is incomplete. These drafts require owner and legal review before publication; no effective date has been set.",
    unresolved: "Owner information required before launch",
    account: "Manage your account",
    documents: {
      privacy: {
        title: "Privacy Policy", description: "How the current AppRadar beta handles account and product data.",
        sections: [
          { title: "Account and authentication", text: "Supabase Auth manages your email address, user ID, sign-in identity, password credentials and authentication sessions. AppRadar uses these to authenticate requests, show account details and associate your watchlist with your account. If Google sign-in is enabled and you choose it, Supabase receives the identity information supplied by Google. AppRadar does not maintain a separate profile database." },
          { title: "Watchlist and market research", text: "Your watchlist stores app IDs and store-country-language context linked to your user ID. Catalog observations and historical metrics are shared product data, separate from your account. Market data comes from configured collection providers; completeness, freshness and permission to use each source must be verified before a real-data beta. Review content and store media are controlled by content feature flags." },
          { title: "Cookies and browser state", text: "Essential HttpOnly cookies maintain authentication sessions and remember your English or Turkish public-site language preference for up to one year. Search and store filters appear in URLs; comparison selections use a separate, script-readable cookie. Development demo watchlists use a separate cookie and synthetic data. The current product has no advertising or analytics tracker integration." },
          { title: "Service providers and logs", text: "Supabase provides authentication and database storage. Hosting services process web requests and operational logs; an email delivery provider is required for verification and recovery messages. Collection providers process app-market requests, not your watchlist or password. The final hosting, email providers, processing locations and international-transfer arrangements still require owner confirmation. Request URLs may reach infrastructure logs; avoid placing sensitive information in search fields." },
          { title: "Retention and deletion", text: "You can remove watchlist entries yourself. Account deletion requires a verified session, explicit confirmation and a fresh password check; it removes the Auth account and its watchlist through the existing database cascade. Shared catalog records and other users are preserved. No complete erasure from backups or infrastructure logs is promised. Approved retention periods for accounts, logs, backups and provider data, plus request procedures, remain to be set. Automated collection and retention execution remain gated; technical expiry settings are not a legal retention policy." },
          { title: "Requests and review", text: "The owner must publish a working contact channel and procedures for privacy requests before launch. This draft does not claim regulatory compliance or establish unconfirmed legal bases, rights or response deadlines." },
        ],
        missing: ["Owner / data-controller identity and contact details", "Applicable legal bases, user rights, jurisdictions and transfer arrangements after legal review", "Actual hosting and email providers, processing regions and approved retention / backup periods", "Privacy request channel, effective date and version"],
      },
      terms: {
        title: "Terms of Service", description: "Draft conditions for evaluating the AppRadar beta.",
        sections: [
          { title: "Beta scope", text: "AppRadar helps developers research stored app listings, ratings, prices and available rankings, compare apps and maintain a watchlist. Coverage is limited to collected observations. Historical, keyword and review sections depend on available data and content controls. Advanced intelligence is not promised. Payments and subscription tiers are not implemented." },
          { title: "Accounts and acceptable use", text: "Keep your credentials secure and use the service without attempting to access other accounts, bypass authorization or disrupt collection and budget safeguards. Account features require authentication. Deletion is available in Account with explicit confirmation and fresh password verification; a Google-only account must first use password recovery to set a password where supported." },
          { title: "Data limitations and source rights", text: "Unknown metrics are unavailable, not zero. Rankings are not download or revenue estimates, and observations may be incomplete or stale. Research output is not a promise of business results. AppRadar does not claim ownership of third-party store content or confirmed commercial data-use rights. Public availability and payment for a scraper do not grant storage, display or redistribution rights. A real-data launch remains blocked until the necessary permissions or other reviewed basis are recorded." },
          { title: "Beta changes and unresolved terms", text: "Features and data availability may change during evaluation. The operator identity, governing law, dispute process, liability provisions, termination procedures and effective date have not been established in this draft. They require owner decisions and legal review before publication. This page is not an approved legal agreement." },
        ],
        missing: ["Operator identity and contact details", "Reviewed governing law, dispute, liability and termination provisions", "Source-specific permission records and permitted user uses", "Approved effective date and version"],
      },
      contact: {
        title: "Contact", description: "Support and privacy contact details are awaiting owner confirmation.",
        sections: [
          { title: "Support and privacy requests", text: "No public support email or contact channel has been supplied yet. This page does not send messages or accept requests. Before beta launch the owner must provide a monitored channel for support, privacy requests and data concerns, plus an escalation procedure. Do not send passwords, tokens or payment information." },
          { title: "Account help", text: "Signed-in users can view their email, reset or change their password, sign out and delete their account in Account. Password recovery uses the configured verification email flow. Deletion is disabled in demo mode. If recovery or deletion is unavailable, an owner-provided support channel is still required; this page has not submitted a deletion request." },
        ],
        missing: ["Public operator name and any required address details", "Monitored support and privacy contact channel", "Support responsibility, request handling and escalation process"],
      },
    },
  },
  tr: {
    draft: "Taslak · Yayın için onaylanmadı",
    notice: "Beta incelemesi için hazırlandı. Sahip bilgileri eksik. Yayından önce sahip ve hukuk incelemesi gerekir; yürürlük tarihi belirlenmedi.",
    unresolved: "Yayından önce sahibin sağlaması gereken bilgiler",
    account: "Hesabını yönet",
    documents: {
      privacy: {
        title: "Gizlilik Politikası", description: "Mevcut AppRadar betasının hesap ve ürün verilerini işleme biçimi.",
        sections: [
          { title: "Hesap ve kimlik doğrulama", text: "Supabase Auth e-posta adresini, kullanıcı kimliğini, giriş kimliğini, parola bilgilerini ve oturumları yönetir. AppRadar bunları istekleri doğrulamak, hesap bilgilerini göstermek ve takip listesini hesabınla ilişkilendirmek için kullanır. Google ile giriş etkinse ve bu yöntemi seçersen Supabase, Google tarafından sağlanan kimlik bilgilerini alır. AppRadar ayrı bir profil veritabanı tutmaz." },
          { title: "Takip listesi ve pazar araştırması", text: "Takip listen uygulama kimliklerini ve mağaza-ülke-dil bağlamını kullanıcı kimliğinle saklar. Katalog gözlemleri ve tarihsel metrikler hesabından ayrı, ortak ürün verileridir. Pazar verisi yapılandırılmış toplama sağlayıcılarından gelir; gerçek verili beta öncesinde her kaynağın kapsamı, güncelliği ve kullanım dayanağı doğrulanmalıdır. Yorum içeriği ve mağaza medyası içerik bayraklarıyla denetlenir." },
          { title: "Çerezler ve tarayıcı durumu", text: "Gerekli HttpOnly çerezler oturumları sürdürür ve tanıtım sayfasındaki İngilizce veya Türkçe tercihini bir yıla kadar hatırlar. Arama ve mağaza filtreleri URL'lerde görünür; karşılaştırma seçimleri ayrı, betiklerin okuyabildiği bir çerez kullanır. Geliştirme demosunun takip listesi ayrı çerez ve sentetik veri kullanır. Mevcut üründe reklam veya analitik takip aracı entegrasyonu yoktur." },
          { title: "Hizmet sağlayıcılar ve kayıtlar", text: "Supabase kimlik doğrulama ve veritabanı hizmeti verir. Barındırma hizmetleri web isteklerini ve işletim kayıtlarını işler; doğrulama ve kurtarma e-postaları için bir e-posta sağlayıcısı gerekir. Toplama sağlayıcıları pazar sorgularını işler, takip listeni veya parolanı almaz. Son barındırma ve e-posta sağlayıcıları, işleme bölgeleri ve uluslararası aktarım düzenlemeleri sahip tarafından doğrulanmalıdır. İstek URL'leri altyapı kayıtlarına girebilir; arama alanlarına hassas bilgi yazma." },
          { title: "Saklama ve silme", text: "Takip kayıtlarını kendin kaldırabilirsin. Hesap silme; doğrulanmış oturum, açık onay ve yeni parola kontrolü gerektirir; Auth hesabını ve mevcut veritabanı cascade ilişkisiyle takip listesini siler. Ortak katalog ve diğer kullanıcılar korunur. Yedeklerden veya altyapı kayıtlarından tamamen silme sözü verilmez. Hesap, kayıt, yedek ve sağlayıcı verilerinin onaylı saklama süreleri ile talep süreçleri henüz belirlenmelidir. Otomatik toplama ve temizlik yürütmesi kapılarla sınırlandırılır; teknik süre sonu ayarları hukuki saklama politikası değildir." },
          { title: "Talepler ve inceleme", text: "Sahip yayından önce çalışan bir iletişim kanalı ve gizlilik talepleri için süreç yayımlamalıdır. Bu taslak mevzuata uyum iddiası taşımaz; doğrulanmamış hukuki dayanak, hak veya yanıt süresi belirlemez." },
        ],
        missing: ["Sahip / veri sorumlusu kimliği ve iletişim bilgileri", "Hukuk incelemesi sonrası uygulanacak dayanaklar, kullanıcı hakları, yetki alanları ve aktarım düzenlemeleri", "Gerçek barındırma ve e-posta sağlayıcıları, bölgeler ve onaylı saklama / yedek süreleri", "Gizlilik talep kanalı, yürürlük tarihi ve sürüm"],
      },
      terms: {
        title: "Kullanım Koşulları", description: "AppRadar betasını değerlendirmek için taslak koşullar.",
        sections: [
          { title: "Beta kapsamı", text: "AppRadar geliştiricilerin saklanan uygulama kayıtlarını, puanlarını, fiyatlarını ve mevcut sıralamalarını araştırmasını, uygulamaları karşılaştırmasını ve takip listesi tutmasını sağlar. Kapsam toplanmış gözlemlerle sınırlıdır. Tarihçe, anahtar kelime ve yorum bölümleri mevcut verilere ve içerik denetimlerine bağlıdır. İleri seviye analiz sözü verilmez. Ödeme ve abonelik katmanları uygulanmadı." },
          { title: "Hesaplar ve kabul edilebilir kullanım", text: "Giriş bilgilerini koru; başka hesaplara erişmeye, yetkilendirmeyi aşmaya veya toplama ve bütçe korumalarını bozmaya çalışma. Hesap özellikleri kimlik doğrulama gerektirir. Hesap sayfasından açık onay ve yeni parola doğrulamasıyla silme yapılabilir; yalnız Google kullanan hesap önce destekleniyorsa parola kurtarma yoluyla parola belirlemelidir." },
          { title: "Veri sınırlamaları ve kaynak hakları", text: "Bilinmeyen metrikler sıfır değil, kullanılamaz olarak gösterilir. Sıralamalar indirme veya gelir tahmini değildir; gözlemler eksik ya da eski olabilir. Araştırma çıktısı ticari sonuç vaadi değildir. AppRadar üçüncü taraf mağaza içeriğinin mülkiyetini veya doğrulanmış ticari kullanım hakkını iddia etmez. Verinin herkese açık olması ve scraper ücreti ödemek saklama, gösterim veya yeniden dağıtım hakkı vermez. Gerekli izinler veya incelenmiş diğer dayanak kaydedilmeden gerçek verili yayın engellidir." },
          { title: "Beta değişiklikleri ve açık koşullar", text: "Değerlendirme sırasında özellikler ve veri erişimi değişebilir. İşletmeci kimliği, uygulanacak hukuk, uyuşmazlık süreci, sorumluluk hükümleri, sona erdirme prosedürleri ve yürürlük tarihi bu taslakta belirlenmedi. Yayından önce sahip kararı ve hukuk incelemesi gerekir. Bu sayfa onaylanmış bir hukuki sözleşme değildir." },
        ],
        missing: ["İşletmeci kimliği ve iletişim bilgileri", "İncelenmiş uygulanacak hukuk, uyuşmazlık, sorumluluk ve sona erdirme hükümleri", "Kaynak bazlı izin kayıtları ve izin verilen kullanım biçimleri", "Onaylı yürürlük tarihi ve sürüm"],
      },
      contact: {
        title: "İletişim", description: "Destek ve gizlilik iletişim bilgileri sahip onayını bekliyor.",
        sections: [
          { title: "Destek ve gizlilik talepleri", text: "Henüz herkese açık destek e-postası veya iletişim kanalı sağlanmadı. Bu sayfa mesaj göndermez ve talep kabul etmez. Beta yayını öncesinde sahip; destek, gizlilik talepleri ve veriyle ilgili sorunlar için izlenen bir kanal ve eskalasyon süreci sağlamalıdır. Parola, token veya ödeme bilgisi gönderme." },
          { title: "Hesap yardımı", text: "Giriş yapan kullanıcılar Hesap sayfasında e-postalarını görebilir, parolalarını sıfırlayabilir veya değiştirebilir, çıkış yapabilir ve hesaplarını silebilir. Parola kurtarma, yapılandırılmış doğrulama e-postası akışını kullanır. Demo modunda silme kapalıdır. Kurtarma veya silme kullanılamıyorsa sahibin sağlayacağı destek kanalı hâlâ gereklidir; bu sayfa silme talebi göndermedi." },
        ],
        missing: ["Herkese açık işletmeci adı ve gereken adres bilgileri", "İzlenen destek ve gizlilik iletişim kanalı", "Destek sorumlusu, talep işleme ve eskalasyon süreci"],
      },
    },
  },
};
