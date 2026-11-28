import { CONTACT_EMAIL } from "./config";
import type { LandingLocale } from "./locale";

export const legalDocuments = ["privacy", "terms", "contact"] as const;
export type LegalDocument = typeof legalDocuments[number];
export const isLegalDocument = (value: string): value is LegalDocument => (legalDocuments as readonly string[]).includes(value);

export const contactCategories = ["support", "feedback", "privacy", "report"] as const;
export type ContactCategory = typeof contactCategories[number];

/** Rendered in this order: lead paragraphs, list, closing note. */
/** Owner-approved brand description (28 November 2026). The brand never stands in for the legal operator. */
export const brandDescription: Record<LandingLocale, string> = {
  en: "AppRadar is an independent software product developed and operated under the Nomind (nomind.tech) brand.",
  tr: "AppRadar, Nomind (nomind.tech) markası altında geliştirilen ve işletilen bağımsız bir yazılım ürünüdür.",
};

type Section = { id: string; title: string; paragraphs?: string[]; list?: string[]; note?: string[] };
type Document = { title: string; description: string; sections: Section[]; open: { title: string; items: string[] }[] };
type Category = { title: string; text: string; include: string; subject: string };
type LegalDictionary = {
  draft: string; notice: string; updated: string; onThisPage: string; unresolved: string; account: string; accountText: string; emailAction: string;
  categories: Record<ContactCategory, Category>;
  documents: Record<LegalDocument, Document>;
};

/** The only address published. Subjects carry the product prefix so mail can be told apart. */
export const contactHref = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

/**
 * Draft copy only: not legally approved. It describes the application as implemented; anything the owner
 * or a legal reviewer has not decided is listed under `open`, never filled with an invented fact.
 */
export const legalDictionaries: Record<LandingLocale, LegalDictionary> = {
  en: {
    draft: "Draft · Not approved for publication",
    notice: "This draft awaits legal review and is not an approved policy or agreement. Owner information is incomplete and no effective date has been set.",
    updated: "Draft last updated 28 November 2026",
    onThisPage: "On this page",
    unresolved: "Open items before approval",
    account: "Manage your account",
    accountText: "Signed-in users can view their email, change or reset their password, sign out and delete their account.",
    emailAction: "Send email",
    categories: {
      support: { title: "General support", text: "Questions about using AppRadar, sign-in or something that is not working.", include: "What you tried, what happened and the page you were on.", subject: "[AppRadar] General support" },
      feedback: { title: "Feedback and feature requests", text: "Ideas, missing information or parts of the research flow that could be clearer.", include: "The decision you were trying to make and what would have helped.", subject: "[AppRadar] Feedback and feature request" },
      privacy: { title: "Privacy and personal data", text: "Access, correction, deletion or other requests about your personal data.", include: "Your request and, if you have an account, write from its email address.", subject: "[AppRadar] Privacy and personal data request" },
      report: { title: "Content and intellectual property", text: "Report listing content that should be corrected or removed, or a rights concern.", include: "The app or page, the content concerned, your relationship to it and the change you ask for.", subject: "[AppRadar] Content or intellectual property report" },
    },
    documents: {
      privacy: {
        title: "Privacy Policy", description: "What personal data AppRadar handles, why, who processes it and the choices you have.",
        sections: [
          { id: "operator", title: "Who operates AppRadar", paragraphs: [
            brandDescription.en,
            "The legal operator is responsible for the personal data described here (data controller under KVKK and GDPR). The operator's legal identity and any required address are pending owner confirmation.",
            `For privacy questions and requests, write to ${CONTACT_EMAIL}.`,
            "AppRadar is currently a private beta. Public registration is closed and store catalog data is not displayed in the live service.",
          ] },
          { id: "account", title: "Account and authentication data", paragraphs: [
            "Accounts are handled by Supabase Auth: your email address, a user ID, your sign-in method, password credentials (stored by Supabase in hashed form), authentication sessions and timestamps such as account creation, email confirmation and last sign-in. AppRadar keeps no separate profile database.",
            "If Google sign-in is offered and you choose it, Supabase would receive the identity information Google provides. The production sign-in settings are pending confirmation.",
            "AppRadar is intended only for people aged 18 or over. We do not knowingly collect personal data from anyone under 18. If you believe a person under 18 has an account, write to us so it can be reviewed.",
          ] },
          { id: "product", title: "What you create while using the product", list: [
            "Watchlist: app identifiers with store, country and language, linked to your user ID. Access rules limit each user to their own entries.",
            "Comparison selection: kept in a cookie in your browser, not in your account.",
            "Search terms and filters: carried in page addresses, so they can appear in infrastructure logs. Do not enter sensitive information in search fields.",
          ] },
          { id: "technical", title: "Technical data and logs", paragraphs: [
            "Hosting and database providers process requests to deliver the service and may record technical data such as IP address, browser details, requested address and time. AppRadar's own application logs record short error codes, not message content or passwords.",
            "AppRadar uses no advertising, analytics or cross-site tracking tools.",
          ] },
          { id: "correspondence", title: "When you email us", paragraphs: [
            "We receive your email address, your name if you include it, and what you write, and use them to answer and to handle your request. The contact address is a Google mail account, so Google processes this correspondence. Please do not send passwords, access tokens or payment details.",
          ] },
          { id: "store-data", title: "Public app store information", paragraphs: [
            "AppRadar researches public App Store and Google Play listings, collected through third-party providers. This can include developer names, which may identify individuals. Reviewer usernames and profile images are excluded. Collected data from development evaluation may be stored even though the live service does not display it. Rights to use this content commercially have not been confirmed.",
            "If listing information about you should be corrected or removed, use the privacy or content report address on the Contact page.",
          ] },
          { id: "purposes", title: "Why the data is processed", list: [
            "To create and secure your account, keep you signed in and recover access.",
            "To provide the features you ask for, such as your watchlist and comparisons.",
            "To operate, protect and troubleshoot the service.",
            "To answer messages and handle legal or privacy requests.",
          ], note: ["The legal basis for each purpose is still to be confirmed by legal review (see open items). We do not sell personal data, use it for advertising or make automated decisions about you."] },
          { id: "cookies", title: "Cookies and browser storage", list: [
            "Authentication session cookies: essential, HttpOnly, used to keep you signed in.",
            "appradar_landing_locale: remembers English or Turkish on the public site, for up to one year.",
            "appradar_compare: your comparison selection, for up to 30 days. This cookie can be read by page scripts.",
            "appradar-theme (local storage): The signed-in app keeps your appearance choice (Light, Dark or System) in this browser's local storage; it stays on your device and is not sent to AppRadar's servers. It remains until you clear your browser data.",
            "While access to the deployment is restricted, the hosting provider may set its own access cookie.",
          ], note: ["You can delete or block cookies in your browser; signing in will not work without the session cookies. No analytics or advertising cookies are used."] },
          { id: "processors", title: "Service providers", list: [
            "Supabase: authentication and database storage, and delivery of account verification and recovery email unless a separate email provider is configured.",
            "Vercel: web hosting, request processing, hosting logs and access protection of the private deployment.",
            "Google: the contact mailbox; and sign-in only if Google sign-in is offered.",
            "Apify and data collection providers: gather public app store listings. They do not receive your account, password or watchlist.",
          ], note: ["These providers process data under their own terms and privacy notices. The email delivery setup of the live service is pending confirmation."] },
          { id: "transfers", title: "International data transfers", paragraphs: [
            "AppRadar is intended for a global audience, and its providers can process data in countries other than yours, including outside Türkiye, the European Economic Area and the United Kingdom.",
            "Connection details suggest that the production database is in eu-west-1 (Ireland). This is pending confirmation and has not been independently verified.",
            "KVKK and GDPR place conditions on such transfers (for example an adequacy decision, standard contractual clauses or another permitted safeguard). The processing locations and the safeguard relied on for each provider have not yet been verified; until they are, this policy does not state that those conditions are met.",
          ] },
          { id: "retention", title: "How long data is kept", list: [
            "Account data: while your account exists.",
            "Watchlist entries: until you remove them, delete your account, or the related listing is removed from the catalog.",
            "Cookies and local storage: as listed above, or until you clear them.",
            "Provider logs, backups and email correspondence: retention periods have not yet been set.",
          ] },
          { id: "deletion", title: "Deleting your account", paragraphs: [
            "Account deletion is implemented on the Account page; its verification on the hosted production service is still pending. It requires a verified email, typing a confirmation and entering your password again, and is designed to remove the authentication account and its watchlist without affecting shared catalog records or other users.",
            "Deletion does not immediately erase provider backups or infrastructure logs. If you cannot use the Account page or deletion does not work, ask by email from your account's address.",
          ] },
          { id: "rights", title: "Your rights", paragraphs: [
            "Under Article 11 of Türkiye's Law No. 6698 (KVKK) you can ask whether your data is processed; request information about it, its purpose and whether it is used accordingly; learn the third parties in Türkiye or abroad who receive it; ask for correction, deletion or destruction and for third parties to be told; object to a result against you arising solely from automated analysis; and claim compensation for damage caused by unlawful processing.",
            "Where the GDPR or UK GDPR applies, you have rights of access, rectification, erasure, restriction, data portability and objection, the right to withdraw consent where processing relies on it, and the right to complain to a supervisory authority. In Türkiye you can complain to the Personal Data Protection Board after applying to the controller as the law requires.",
            `Send requests to ${CONTACT_EMAIL}. We may need to confirm your identity; writing from the address registered on your account helps. These rights have limits set by law. The formal application procedure is still under legal review.`,
          ] },
          { id: "security", title: "Security", paragraphs: ["Connections use HTTPS, session cookies are HttpOnly, database access rules separate users' data and server keys are not sent to the browser. No system is completely secure."] },
          { id: "changes", title: "Changes and contact", paragraphs: [`This draft may change before approval. Questions: ${CONTACT_EMAIL}.`] },
        ],
        open: [
          { title: "Operator identity", items: ["Legal operator identity and any required address: pending owner confirmation.", "Effective date and version."] },
          { title: "Legal bases", items: ["Confirm a KVKK (Articles 5 and 6) and GDPR (Article 6) basis for each purpose. Contract performance, legitimate interests and legal obligation are candidates, not conclusions."] },
          { title: "Transfer safeguards", items: ["Record each provider's processing region. Confirm the production database region (eu-west-1, Ireland, is suggested by the connection endpoint).", "Confirm data processing terms and the KVKK Article 9 and GDPR Chapter V mechanism for each transfer."] },
          { title: "Retention decisions", items: ["Approve periods for accounts, logs, backups, email correspondence and collected store data, and how deletion is carried out."] },
          { title: "KVKK notices and obligations", items: ["Prepare the required information notice (aydınlatma metni) at the point of collection, and decide whether any processing needs separate explicit consent.", "Confirm the application procedure, response deadlines and whether VERBİS registration is required.", "Assess whether an EU or UK representative is required."] },
          { title: "Production verification", items: ["Verify account deletion on the hosted service.", "Confirm the production sign-in and email delivery settings."] },
        ],
      },
      terms: {
        title: "Terms of Use", description: "The conditions for using the AppRadar private beta.",
        sections: [
          { id: "about", title: "About these terms", paragraphs: [
            brandDescription.en,
            "These draft terms describe how the service is meant to be used. They are not yet an approved agreement. The legal operator's identity and any required address are pending owner confirmation.",
          ] },
          { id: "service", title: "What the service does", paragraphs: [
            "AppRadar is a research tool for exploring mobile app listings, ratings, prices and available rankings, comparing apps and keeping a watchlist. It is a private beta: public registration is closed, store catalog data is not displayed in the live service, and features can change or be unavailable.",
            "Historical, keyword and review sections depend on available data and content controls. Advanced intelligence and alerts are not offered. There are no paid plans, subscriptions or payments.",
          ] },
          { id: "accounts", title: "Your account", list: [
            "You must be at least 18 years old to use AppRadar or hold an account.",
            "Provide an email address you control and keep your password secure.",
            "Do not share your account. Tell us if you believe someone else has used it.",
            "You are responsible for what is done through your account to the extent the law allows.",
          ] },
          { id: "use", title: "Acceptable use", paragraphs: ["Do not:"], list: [
            "access other accounts or data you are not permitted to see;",
            "bypass sign-in, access controls, rate or budget limits;",
            "disrupt the service, probe it without permission or introduce harmful code;",
            "extract data in bulk, resell it or republish third-party store content;",
            "use the service to break the law or infringe others' rights.",
          ] },
          { id: "market-data", title: "Market information and third parties", paragraphs: [
            "Market observations may be obtained through third-party collection providers, including actors hosted on Apify, and reflect App Store and Google Play listings. AppRadar is independent software and is not affiliated with, endorsed by or sponsored by Apple, Google or the developers of listed apps.",
            "Public availability, attribution and payment for a collection service do not create a right to store, display or redistribute store content. AppRadar does not claim that commercial data-use rights have been verified.",
          ] },
          { id: "accuracy", title: "Accuracy and freshness", paragraphs: [
            "Observations can be incomplete, wrong or out of date. Unknown values are shown as unavailable, not zero. Rankings and rating counts are not download, revenue or user figures. Check dates and sources before relying on anything.",
            "AppRadar supports your own research. It does not predict demand or business results and is not financial, legal or investment advice.",
          ] },
          { id: "ip", title: "Intellectual property", paragraphs: [
            "The AppRadar software, design and original text belong to their respective rights holders, including the operator and the authors of open-source components under their licences. App names, trademarks, icons, screenshots, descriptions and other store materials belong to their owners. Using AppRadar gives you no rights in them. Where store images are shown, they load from their original external addresses; AppRadar does not permanently host image files.",
          ] },
          { id: "reports", title: "Reporting content or rights concerns", paragraphs: [
            `To report listing content or an intellectual property concern, write to ${CONTACT_EMAIL} using the content report subject on the Contact page. Include the app or page, the content concerned, your relationship to it, the change you ask for and a way to reach you. Content may be hidden while a report is assessed. A formal notice procedure is still under legal review.`,
          ] },
          { id: "termination", title: "Ending use and availability", paragraphs: [
            "You can stop using AppRadar at any time. Account deletion is implemented on the Account page, with verification on the hosted production service still pending; you can also ask by email. Access may be limited or ended if these terms are broken, if needed for security or legal reasons, or if the beta changes or closes. Where reasonable, we will tell you.",
            "The service is not guaranteed to be uninterrupted or error-free, and no support or availability level is committed.",
          ] },
          { id: "liability", title: "Disclaimers and liability", paragraphs: [
            "Subject to legal review: the beta is provided as it is and as available, and to the extent the law allows, no warranty is given about accuracy, fitness for a particular purpose or availability, and liability for indirect loss or for business decisions based on the information is excluded.",
            "Nothing in these terms excludes or limits liability or consumer rights that cannot lawfully be excluded or limited. The final liability wording is not yet approved.",
          ] },
          { id: "privacy", title: "Privacy", paragraphs: ["The Privacy Policy describes how personal data is handled."] },
          { id: "changes", title: "Changes and contact", paragraphs: [`These draft terms may change before approval. Questions: ${CONTACT_EMAIL}.`] },
        ],
        open: [
          { title: "Identity and approval", items: ["Legal operator identity and any required address: pending owner confirmation.", "Effective date, version and how users accept the terms."] },
          { title: "Legal review", items: ["Governing law, courts or dispute process, and mandatory consumer rules for a global audience.", "Liability, warranty, termination and content notice procedures.", "How the 18+ requirement is presented and enforced."] },
          { title: "Data rights", items: ["Recorded permission or other reviewed basis for each data source before real catalog data is offered."] },
        ],
      },
      contact: {
        title: "Contact", description: "Choose a topic. Each button opens an email to AppRadar with a matching subject line.",
        sections: [
          { id: "before", title: "Before you write", paragraphs: [
            brandDescription.en,
            "Replies are sent by email; no response time is guaranteed. Deadlines the law sets for personal data requests are not affected.",
            "Never send passwords, access tokens or payment details. Opening an email does not by itself submit an account deletion.",
          ] },
        ],
        open: [{ title: "Pending owner confirmation", items: ["Legal operator identity and any required postal address.", "Formal procedures for privacy requests and content reports."] }],
      },
    },
  },
  tr: {
    draft: "Taslak · Yayın için onaylanmadı",
    notice: "Bu taslak hukuk incelemesini bekliyor; onaylanmış bir politika veya sözleşme değildir. Sahip bilgileri eksik ve yürürlük tarihi belirlenmedi.",
    updated: "Taslağın son güncellenme tarihi: 28 Kasım 2026",
    onThisPage: "Bu sayfada",
    unresolved: "Onay öncesi açık konular",
    account: "Hesabınızı yönetin",
    accountText: "Giriş yapan kullanıcılar e-posta adresini görebilir, parolasını değiştirebilir veya sıfırlayabilir, çıkış yapabilir ve hesabını silebilir.",
    emailAction: "E-posta gönder",
    categories: {
      support: { title: "Genel destek", text: "AppRadar'ın kullanımı, giriş yapma veya çalışmayan bir şey hakkındaki sorular.", include: "Ne denediğinizi, ne olduğunu ve hangi sayfada olduğunuzu yazın.", subject: "[AppRadar] Genel destek" },
      feedback: { title: "Geri bildirim ve özellik istekleri", text: "Fikirler, eksik bilgiler veya araştırma akışında daha anlaşılır olabilecek yerler.", include: "Hangi kararı vermeye çalıştığınızı ve neyin yardımcı olacağını yazın.", subject: "[AppRadar] Geri bildirim ve özellik isteği" },
      privacy: { title: "Gizlilik ve kişisel veriler", text: "Kişisel verilerinizle ilgili erişim, düzeltme, silme ve diğer talepler.", include: "Talebinizi yazın; hesabınız varsa hesabınızın e-posta adresinden gönderin.", subject: "[AppRadar] Gizlilik ve kişisel veri talebi" },
      report: { title: "İçerik ve fikri mülkiyet", text: "Düzeltilmesi veya kaldırılması gereken mağaza içeriğini ya da bir hak ihlali kaygısını bildirin.", include: "Uygulamayı veya sayfayı, ilgili içeriği, içerikle ilişkinizi ve istediğiniz değişikliği yazın.", subject: "[AppRadar] İçerik veya fikri mülkiyet bildirimi" },
    },
    documents: {
      privacy: {
        title: "Gizlilik Politikası", description: "AppRadar hangi kişisel verileri, neden işler; kimler işler ve hangi seçenekleriniz vardır.",
        sections: [
          { id: "operator", title: "AppRadar'ı kim işletiyor?", paragraphs: [
            brandDescription.tr,
            "Burada anlatılan kişisel verilerden yasal işletmeci sorumludur (KVKK ve GDPR kapsamında veri sorumlusu). İşletmecinin yasal kimliği ve gereken adresi sahip onayını beklemektedir.",
            `Gizlilik soruları ve talepleri için ${CONTACT_EMAIL} adresine yazın.`,
            "AppRadar şu anda özel bir beta aşamasındadır. Herkese açık kayıt kapalıdır ve mağaza katalog verisi canlı hizmette gösterilmez.",
          ] },
          { id: "account", title: "Hesap ve kimlik doğrulama verileri", paragraphs: [
            "Hesaplar Supabase Auth ile yönetilir: e-posta adresiniz, kullanıcı kimliği, giriş yönteminiz, parola bilgileri (Supabase tarafından özetlenmiş biçimde saklanır), oturumlar ve hesap oluşturma, e-posta doğrulama ve son giriş gibi zaman bilgileri. AppRadar ayrı bir profil veritabanı tutmaz.",
            "Google ile giriş sunulur ve siz bu yöntemi seçerseniz Supabase, Google'ın sağladığı kimlik bilgilerini alır. Canlı ortamın giriş ayarları teyit beklemektedir.",
            "AppRadar yalnızca 18 yaş ve üzeri kişiler içindir. 18 yaşından küçüklerden bilerek kişisel veri toplamayız. 18 yaşından küçük birinin hesabı olduğunu düşünüyorsanız incelenmesi için bize yazın.",
          ] },
          { id: "product", title: "Ürünü kullanırken oluşturduklarınız", list: [
            "Takip listesi: mağaza, ülke ve dil bilgisiyle uygulama kimlikleri; kullanıcı kimliğinize bağlıdır. Erişim kuralları her kullanıcıyı kendi kayıtlarıyla sınırlar.",
            "Karşılaştırma seçimi: hesabınızda değil, tarayıcınızdaki bir çerezde tutulur.",
            "Arama sözcükleri ve filtreler: sayfa adreslerinde taşınır, bu nedenle altyapı kayıtlarında görünebilir. Arama alanlarına hassas bilgi yazmayın.",
          ] },
          { id: "technical", title: "Teknik veriler ve kayıtlar", paragraphs: [
            "Barındırma ve veritabanı sağlayıcıları hizmeti sunmak için istekleri işler; IP adresi, tarayıcı bilgisi, istenen adres ve zaman gibi teknik verileri kaydedebilir. AppRadar'ın kendi uygulama kayıtları mesaj içeriği veya parola değil, kısa hata kodları tutar.",
            "AppRadar reklam, analitik veya siteler arası takip araçları kullanmaz.",
          ] },
          { id: "correspondence", title: "Bize e-posta yazdığınızda", paragraphs: [
            "E-posta adresinizi, yazdıysanız adınızı ve mesajınızı alır; yanıt vermek ve talebinizi işlemek için kullanırız. İletişim adresi bir Google e-posta hesabıdır; bu nedenle yazışmaları Google işler. Lütfen parola, erişim anahtarı veya ödeme bilgisi göndermeyin.",
          ] },
          { id: "store-data", title: "Herkese açık uygulama mağazası bilgileri", paragraphs: [
            "AppRadar, üçüncü taraf sağlayıcılar aracılığıyla toplanan herkese açık App Store ve Google Play kayıtlarını araştırır. Bunlar kişileri tanımlayabilecek geliştirici adlarını içerebilir. Yorum yazarlarının kullanıcı adları ve profil görselleri hariç tutulur. Geliştirme değerlendirmesi sırasında toplanan veriler, canlı hizmet göstermese de saklanıyor olabilir. Bu içeriğin ticari kullanım hakları doğrulanmamıştır.",
            "Hakkınızdaki bir mağaza bilgisinin düzeltilmesi veya kaldırılması gerekiyorsa İletişim sayfasındaki gizlilik ya da içerik bildirimi adresini kullanın.",
          ] },
          { id: "purposes", title: "Veriler neden işlenir?", list: [
            "Hesabınızı oluşturmak ve korumak, oturumunuzu sürdürmek ve erişimi kurtarmak.",
            "Takip listesi ve karşılaştırma gibi istediğiniz özellikleri sunmak.",
            "Hizmeti işletmek, korumak ve sorunları gidermek.",
            "Mesajları yanıtlamak ve hukuki veya gizlilik taleplerini işlemek.",
          ], note: ["Her amacın hukuki sebebi hukuk incelemesiyle henüz doğrulanacaktır (açık konulara bakın). Kişisel verileri satmayız, reklam için kullanmayız ve hakkınızda otomatik karar vermeyiz."] },
          { id: "cookies", title: "Çerezler ve tarayıcı depolaması", list: [
            "Oturum çerezleri: zorunlu, HttpOnly; oturumunuzu sürdürür.",
            "appradar_landing_locale: herkese açık sitede İngilizce veya Türkçe tercihini en fazla bir yıl hatırlar.",
            "appradar_compare: karşılaştırma seçiminiz; en fazla 30 gün. Bu çerez sayfa betikleri tarafından okunabilir.",
            "appradar-theme (yerel depolama): Giriş yapılan uygulama, görünüm tercihinizi (Açık, Koyu veya Sistem) bu tarayıcının yerel depolamasında saklar; tercih cihazınızda kalır ve AppRadar sunucularına gönderilmez. Tarayıcı verilerinizi silene kadar kalır.",
            "Dağıtıma erişim kısıtlıyken barındırma sağlayıcısı kendi erişim çerezini kullanabilir.",
          ], note: ["Çerezleri tarayıcınızdan silebilir veya engelleyebilirsiniz; oturum çerezleri olmadan giriş çalışmaz. Analitik veya reklam çerezi kullanılmaz."] },
          { id: "processors", title: "Hizmet sağlayıcılar", list: [
            "Supabase: kimlik doğrulama ve veritabanı; ayrı bir e-posta sağlayıcısı yapılandırılmadıkça hesap doğrulama ve kurtarma e-postalarının gönderimi.",
            "Vercel: web barındırma, isteklerin işlenmesi, barındırma kayıtları ve özel dağıtımın erişim koruması.",
            "Google: iletişim e-posta kutusu; Google ile giriş sunulursa giriş işlemi.",
            "Apify ve veri toplama sağlayıcıları: herkese açık mağaza kayıtlarını toplar. Hesabınızı, parolanızı veya takip listenizi almaz.",
          ], note: ["Bu sağlayıcılar verileri kendi koşulları ve gizlilik bildirimleri kapsamında işler. Canlı hizmetin e-posta gönderim kurulumu teyit beklemektedir."] },
          { id: "transfers", title: "Yurt dışına veri aktarımı", paragraphs: [
            "AppRadar küresel bir kitle için tasarlanmıştır; sağlayıcıları verileri sizin ülkeniz dışında, Türkiye, Avrupa Ekonomik Alanı ve Birleşik Krallık dışı dahil, işleyebilir.",
            "Bağlantı bilgileri, canlı veritabanının eu-west-1 (İrlanda) bölgesinde olduğunu düşündürmektedir. Bu bilgi teyit beklemektedir ve bağımsız olarak doğrulanmamıştır.",
            "KVKK ve GDPR bu aktarımları koşullara bağlar (örneğin yeterlilik kararı, standart sözleşme veya izin verilen başka bir güvence). Her sağlayıcının işleme konumu ve dayanılan güvence henüz doğrulanmadı; doğrulanana kadar bu politika söz konusu koşulların karşılandığını belirtmez.",
          ] },
          { id: "retention", title: "Veriler ne kadar saklanır?", list: [
            "Hesap verileri: hesabınız var olduğu sürece.",
            "Takip listesi kayıtları: siz kaldırana, hesabınızı silene veya ilgili kayıt katalogdan kaldırılana kadar.",
            "Çerezler ve yerel depolama: yukarıda belirtildiği gibi veya siz silene kadar.",
            "Sağlayıcı kayıtları, yedekler ve e-posta yazışmaları: saklama süreleri henüz belirlenmedi.",
          ] },
          { id: "deletion", title: "Hesabınızı silmek", paragraphs: [
            "Hesap silme Hesap sayfasında uygulanmıştır; canlı ortamdaki doğrulaması henüz beklemektedir. Doğrulanmış e-posta, onay metnini yazmak ve parolanızı yeniden girmek gerekir. İşlem, ortak katalog kayıtlarını ve diğer kullanıcıları etkilemeden kimlik doğrulama hesabını ve takip listesini kaldıracak şekilde tasarlanmıştır.",
            "Silme, sağlayıcı yedeklerini veya altyapı kayıtlarını hemen yok etmez. Hesap sayfasını kullanamıyorsanız veya silme çalışmıyorsa hesabınızın adresinden e-postayla talep edin.",
          ] },
          { id: "rights", title: "Haklarınız", paragraphs: [
            "6698 sayılı KVKK'nın 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, buna ilişkin bilgi isteme, işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, düzeltilmesini, silinmesini veya yok edilmesini ve bunun aktarılan kişilere bildirilmesini isteme, yalnızca otomatik analizle aleyhinize çıkan sonuca itiraz etme ve hukuka aykırı işleme nedeniyle zararınızın giderilmesini talep etme haklarına sahipsiniz.",
            "GDPR veya Birleşik Krallık GDPR'ı uygulanıyorsa erişim, düzeltme, silme, kısıtlama, veri taşınabilirliği ve itiraz haklarınız; işleme rızaya dayanıyorsa rızanızı geri çekme ve denetim makamına şikâyet hakkınız vardır. Türkiye'de, kanunun öngördüğü şekilde veri sorumlusuna başvurduktan sonra Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz.",
            `Taleplerinizi ${CONTACT_EMAIL} adresine gönderin. Kimliğinizi doğrulamamız gerekebilir; hesabınıza kayıtlı adresten yazmanız yardımcı olur. Bu hakların kanunda belirlenen sınırları vardır. Resmî başvuru usulü hâlâ hukuk incelemesindedir.`,
          ] },
          { id: "security", title: "Güvenlik", paragraphs: ["Bağlantılar HTTPS kullanır, oturum çerezleri HttpOnly'dir, veritabanı erişim kuralları kullanıcıların verilerini ayırır ve sunucu anahtarları tarayıcıya gönderilmez. Hiçbir sistem tümüyle güvenli değildir."] },
          { id: "changes", title: "Değişiklikler ve iletişim", paragraphs: [`Bu taslak onaydan önce değişebilir. Sorularınız için: ${CONTACT_EMAIL}.`] },
        ],
        open: [
          { title: "İşletmeci kimliği", items: ["Yasal işletmeci kimliği ve gereken adres: sahip onayı bekliyor.", "Yürürlük tarihi ve sürüm."] },
          { title: "Hukuki sebepler", items: ["Her amaç için KVKK (5. ve 6. maddeler) ve GDPR (6. madde) dayanağı doğrulanmalı. Sözleşmenin ifası, meşru menfaat ve hukuki yükümlülük aday dayanaklardır; kesin sonuç değildir."] },
          { title: "Aktarım güvenceleri", items: ["Her sağlayıcının işleme bölgesi kaydedilmeli. Canlı veritabanı bölgesi teyit edilmeli (bağlantı adresi eu-west-1, İrlanda olduğunu düşündürüyor).", "Veri işleme koşulları ve her aktarım için KVKK 9. madde ile GDPR 5. Bölüm mekanizması doğrulanmalı."] },
          { title: "Saklama kararları", items: ["Hesap, kayıt, yedek, e-posta yazışması ve toplanan mağaza verisi için süreler ve silmenin nasıl yapılacağı onaylanmalı."] },
          { title: "KVKK bildirimleri ve yükümlülükleri", items: ["Veri toplama anında gereken aydınlatma metni hazırlanmalı; ayrıca açık rıza gerektiren bir işleme olup olmadığına karar verilmeli.", "Başvuru usulü, yanıt süreleri ve VERBİS kaydının gerekip gerekmediği doğrulanmalı.", "AB veya Birleşik Krallık temsilcisi gerekip gerekmediği değerlendirilmeli."] },
          { title: "Canlı ortam doğrulaması", items: ["Hesap silme canlı hizmette doğrulanmalı.", "Canlı ortamın giriş ve e-posta gönderim ayarları teyit edilmeli."] },
        ],
      },
      terms: {
        title: "Kullanım Koşulları", description: "AppRadar özel betasını kullanma koşulları.",
        sections: [
          { id: "about", title: "Bu koşullar hakkında", paragraphs: [
            brandDescription.tr,
            "Bu taslak, hizmetin nasıl kullanılmasının amaçlandığını anlatır. Henüz onaylanmış bir sözleşme değildir. Yasal işletmecinin kimliği ve gereken adresi sahip onayını beklemektedir.",
          ] },
          { id: "service", title: "Hizmet ne yapar?", paragraphs: [
            "AppRadar; mobil uygulama kayıtlarını, puanları, fiyatları ve mevcut sıralamaları incelemek, uygulamaları karşılaştırmak ve takip listesi tutmak için bir araştırma aracıdır. Özel beta aşamasındadır: herkese açık kayıt kapalıdır, mağaza katalog verisi canlı hizmette gösterilmez; özellikler değişebilir veya kullanılamayabilir.",
            "Tarihçe, anahtar kelime ve yorum bölümleri mevcut verilere ve içerik denetimlerine bağlıdır. İleri analiz ve bildirimler sunulmaz. Ücretli plan, abonelik veya ödeme yoktur.",
          ] },
          { id: "accounts", title: "Hesabınız", list: [
            "AppRadar'ı kullanmak veya hesap sahibi olmak için en az 18 yaşında olmalısınız.",
            "Kontrolünüzde olan bir e-posta adresi kullanın ve parolanızı koruyun.",
            "Hesabınızı paylaşmayın. Başkasının kullandığını düşünüyorsanız bize bildirin.",
            "Kanunun izin verdiği ölçüde, hesabınız üzerinden yapılanlardan siz sorumlusunuz.",
          ] },
          { id: "use", title: "Kabul edilebilir kullanım", paragraphs: ["Şunları yapmayın:"], list: [
            "başka hesaplara veya görme izniniz olmayan verilere erişmek;",
            "girişi, erişim denetimlerini, hız veya bütçe sınırlarını aşmaya çalışmak;",
            "hizmeti aksatmak, izinsiz güvenlik denemesi yapmak veya zararlı kod yerleştirmek;",
            "verileri toplu olarak çekmek, yeniden satmak veya üçüncü taraf mağaza içeriğini yeniden yayımlamak;",
            "hizmeti hukuka aykırı biçimde veya başkalarının haklarını ihlal ederek kullanmak.",
          ] },
          { id: "market-data", title: "Pazar bilgileri ve üçüncü taraflar", paragraphs: [
            "Pazar gözlemleri, Apify üzerinde barındırılan actor'lar dahil üçüncü taraf toplama sağlayıcıları aracılığıyla elde edilebilir ve App Store ile Google Play kayıtlarını yansıtır. AppRadar bağımsız bir yazılımdır; Apple, Google veya listelenen uygulama geliştiricileriyle bağlantılı, onlar tarafından onaylı veya sponsorlu değildir.",
            "Herkese açık olma, atıf ve toplama hizmetine ödeme yapılması; mağaza içeriğini saklama, gösterme veya yeniden dağıtma hakkı doğurmaz. AppRadar ticari veri kullanım haklarının doğrulandığını iddia etmez.",
          ] },
          { id: "accuracy", title: "Doğruluk ve güncellik", paragraphs: [
            "Gözlemler eksik, hatalı veya eski olabilir. Bilinmeyen değerler sıfır değil, kullanılamaz olarak gösterilir. Sıralamalar ve puan sayıları indirme, gelir veya kullanıcı sayısı değildir. Bir bilgiye güvenmeden önce tarih ve kaynağını kontrol edin.",
            "AppRadar kendi araştırmanızı destekler. Talebi veya ticari sonucu tahmin etmez; finansal, hukuki veya yatırım tavsiyesi değildir.",
          ] },
          { id: "ip", title: "Fikri mülkiyet", paragraphs: [
            "AppRadar yazılımı, tasarımı ve özgün metinleri; işletmeci ve lisansları kapsamında açık kaynak bileşenlerin yazarları dahil ilgili hak sahiplerine aittir. Uygulama adları, markalar, ikonlar, ekran görüntüleri, açıklamalar ve diğer mağaza materyalleri sahiplerine aittir. AppRadar'ı kullanmak size bunlar üzerinde hak vermez. Mağaza görselleri gösterildiğinde özgün dış adreslerinden yüklenir; AppRadar görüntü dosyalarını kalıcı olarak barındırmaz.",
          ] },
          { id: "reports", title: "İçerik veya hak ihlali bildirimi", paragraphs: [
            `Mağaza içeriğini veya fikri mülkiyet kaygısını bildirmek için İletişim sayfasındaki içerik bildirimi konusuyla ${CONTACT_EMAIL} adresine yazın. Uygulamayı veya sayfayı, ilgili içeriği, içerikle ilişkinizi, istediğiniz değişikliği ve size nasıl ulaşılacağını belirtin. Bildirim incelenirken içerik gizlenebilir. Resmî bildirim usulü hâlâ hukuk incelemesindedir.`,
          ] },
          { id: "termination", title: "Kullanımın sona ermesi ve erişilebilirlik", paragraphs: [
            "AppRadar'ı istediğiniz zaman kullanmayı bırakabilirsiniz. Hesap silme Hesap sayfasında uygulanmıştır; canlı ortamdaki doğrulaması henüz beklemektedir, e-postayla da talep edebilirsiniz. Bu koşullar ihlal edilirse, güvenlik veya hukuki nedenlerle gerekirse ya da beta değişir veya kapanırsa erişim sınırlanabilir veya sona erdirilebilir. Makul olduğunda sizi bilgilendiririz.",
            "Hizmetin kesintisiz veya hatasız olacağı garanti edilmez; destek veya erişilebilirlik düzeyi taahhüt edilmez.",
          ] },
          { id: "liability", title: "Sorumluluk sınırları", paragraphs: [
            "Hukuk incelemesine tabidir: beta olduğu gibi ve erişilebildiği ölçüde sunulur; kanunun izin verdiği ölçüde doğruluk, belirli bir amaca uygunluk veya erişilebilirlik garantisi verilmez; dolaylı zararlar ve bu bilgilere dayanan ticari kararlar için sorumluluk kabul edilmez.",
            "Bu koşullardaki hiçbir ifade, hukuken kaldırılamayacak veya sınırlanamayacak sorumluluğu ya da tüketici haklarını kaldırmaz veya sınırlamaz. Sorumluluk metni henüz onaylanmadı.",
          ] },
          { id: "privacy", title: "Gizlilik", paragraphs: ["Kişisel verilerin nasıl işlendiği Gizlilik Politikası'nda anlatılır."] },
          { id: "changes", title: "Değişiklikler ve iletişim", paragraphs: [`Bu taslak koşullar onaydan önce değişebilir. Sorularınız için: ${CONTACT_EMAIL}.`] },
        ],
        open: [
          { title: "Kimlik ve onay", items: ["Yasal işletmeci kimliği ve gereken adres: sahip onayı bekliyor.", "Yürürlük tarihi, sürüm ve kullanıcıların koşulları nasıl kabul edeceği."] },
          { title: "Hukuk incelemesi", items: ["Uygulanacak hukuk, mahkeme veya uyuşmazlık süreci ve küresel kitle için emredici tüketici kuralları.", "Sorumluluk, garanti, sona erdirme ve içerik bildirimi usulleri.", "18 yaş şartının nasıl gösterileceği ve uygulanacağı."] },
          { title: "Veri hakları", items: ["Gerçek katalog verisi sunulmadan önce her veri kaynağı için kayıtlı izin veya incelenmiş başka dayanak."] },
        ],
      },
      contact: {
        title: "İletişim", description: "Bir konu seçin. Her düğme, uygun konu satırıyla AppRadar'a bir e-posta açar.",
        sections: [
          { id: "before", title: "Yazmadan önce", paragraphs: [
            brandDescription.tr,
            "Yanıtlar e-postayla gönderilir; yanıt süresi garanti edilmez. Kişisel veri talepleri için kanunun belirlediği süreler bundan etkilenmez.",
            "Parola, erişim anahtarı veya ödeme bilgisi göndermeyin. Bir e-posta açmak tek başına hesap silme talebi göndermez.",
          ] },
        ],
        open: [{ title: "Sahip onayı bekleyenler", items: ["Yasal işletmeci kimliği ve gereken posta adresi.", "Gizlilik talepleri ve içerik bildirimleri için resmî usuller."] }],
      },
    },
  },
};
