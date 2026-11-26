export type Store = "ios" | "play";
export type Country = "TR" | "US";
export type Sort = "rating" | "ratings" | "name";
export const categories = ["Üretkenlik", "Sağlık ve fitness", "Eğitim", "Fotoğraf", "Finans", "Kitaplar"] as const;
export type Category = typeof categories[number];
export interface LiveSnapshot {
  name: string; developer: string | null; category: string | null;
  country: Country; requestedLanguage: string; language: string | null; source: "aurelix" | "subimpact" | "datatrail";
  runId: string; observedAt: string; collectedAt: string; rating: number | null; ratings: number | null;
  price: number | null; currency: string | null; free: boolean | null; version: string | null;
  storeUrl: string; reviewCount: number | null; installsText: string | null;
}
export interface DemoApp {
  id: string; name: string; developer: string; category: string; store: Store;
  icon: "orbit" | "tree" | "languages" | "camera" | "wallet" | "moon" | "check" | "activity" | "book" | "layers" | "pen" | "sun";
  color: string; description: string; tagline: string; rating: number | null; ratings: number | null;
  free: boolean | null; price: { TR: number | null; US: number | null }; version: string | null;
  live?: { observations: Partial<Record<Country, LiveSnapshot>>; history: LiveSnapshot[] };
}

const prototypes: Omit<DemoApp, "id" | "store">[] = [
  { name: "Orbit Notes", developer: "Orbit Studio", category: "Üretkenlik", icon: "orbit", color: "indigo", tagline: "Düşüncelerine biraz alan aç.", description: "Notlarını, fikirlerini ve günlük planlarını sakin bir çalışma alanında bir araya getiren hayali bir not uygulaması.", rating: 4.8, ratings: 12400, free: true, price: { TR: 0, US: 0 }, version: "2.4.1" },
  { name: "Focus Forest", developer: "Little Seed", category: "Üretkenlik", icon: "tree", color: "green", tagline: "Odaklandıkça büyüyen bir dünya.", description: "Odaklanma oturumları ve küçük molalarla daha dengeli çalışma alışkanlıkları kurmak için tasarlanmış hayali bir zamanlayıcı.", rating: 4.9, ratings: 8200, free: false, price: { TR: 129.99, US: 3.99 }, version: "3.1.0" },
  { name: "Lingo Nest", developer: "Nest Learning", category: "Eğitim", icon: "languages", color: "orange", tagline: "Her gün yeni bir kelime.", description: "Kısa alıştırmalar, kelime kartları ve günlük hedeflerle dil öğrenmeyi kolaylaştıran hayali bir eğitim uygulaması.", rating: 4.7, ratings: 24600, free: true, price: { TR: 0, US: 0 }, version: "5.2.0" },
  { name: "Pocket Studio", developer: "Frame Collective", category: "Fotoğraf", icon: "camera", color: "pink", tagline: "Her kareye kendi dokunuşun.", description: "Fotoğraflarını düzenlemek, renklerini keşfetmek ve küçük görsel hikâyeler hazırlamak için hayali bir cep stüdyosu.", rating: 4.6, ratings: 5300, free: true, price: { TR: 0, US: 0 }, version: "1.8.2" },
  { name: "Flow Budget", developer: "Flow Labs", category: "Finans", icon: "wallet", color: "blue", tagline: "Paranın nereye gittiğini gör.", description: "Günlük harcamaları ve kişisel bütçe hedeflerini basit bir görünümde takip etmeye yarayan hayali bir bütçe uygulaması.", rating: 4.5, ratings: 3100, free: true, price: { TR: 0, US: 0 }, version: "2.0.4" },
  { name: "Zen Space", developer: "Quiet Hours", category: "Sağlık ve fitness", icon: "moon", color: "purple", tagline: "Gününe sakin bir ara ver.", description: "Nefes egzersizleri ve rahatlatıcı seslerle kısa dinlenme araları sunan hayali bir uygulama.", rating: 4.8, ratings: 17800, free: false, price: { TR: 89.99, US: 2.99 }, version: "4.3.0" },
  { name: "Habit Loop", developer: "Everyday Co.", category: "Üretkenlik", icon: "check", color: "teal", tagline: "Küçük adımlar, kalıcı alışkanlıklar.", description: "Günlük alışkanlıklarını işaretleyip kendi ritmini oluşturabileceğin hayali bir takip uygulaması.", rating: 4.7, ratings: 6900, free: true, price: { TR: 0, US: 0 }, version: "1.6.3" },
  { name: "Stride Club", developer: "Outside Studio", category: "Sağlık ve fitness", icon: "activity", color: "coral", tagline: "Kendi hızında hareket et.", description: "Yürüyüş ve koşu planlarını sade bir takvimde düzenleyen, kişisel hedeflerini izlemeni sağlayan hayali bir uygulama.", rating: 4.6, ratings: 4200, free: true, price: { TR: 0, US: 0 }, version: "2.2.1" },
  { name: "Pagewise", developer: "Paper & Pixels", category: "Kitaplar", icon: "book", color: "amber", tagline: "Okudukların seninle kalsın.", description: "Okuma listelerini, kitap notlarını ve günlük okuma hedeflerini bir arada tutan hayali bir kitaplık.", rating: 4.9, ratings: 1800, free: false, price: { TR: 69.99, US: 1.99 }, version: "1.3.0" },
  { name: "Task Pilot", developer: "Pilot Works", category: "Üretkenlik", icon: "layers", color: "blue", tagline: "Yapılacaklar biraz hafiflesin.", description: "Projelerini küçük görevlere bölüp gününü planlamana yardımcı olan hayali bir görev yöneticisi.", rating: 4.4, ratings: 2800, free: true, price: { TR: 0, US: 0 }, version: "3.0.2" },
  { name: "Mind Canvas", developer: "Canvas Collective", category: "Eğitim", icon: "pen", color: "purple", tagline: "Fikirlerini birbirine bağla.", description: "Düşüncelerini görsel haritalara ve küçük öğrenme kartlarına dönüştüren hayali bir çalışma alanı.", rating: null, ratings: null, free: true, price: { TR: 0, US: 0 }, version: "1.0.0" },
  { name: "Daylight", developer: "Morning People", category: "Fotoğraf", icon: "sun", color: "orange", tagline: "Işığın peşinden git.", description: "Fotoğraf çekimlerini planlamak ve ilham panoları hazırlamak için hayali bir görsel günlük.", rating: 4.5, ratings: 950, free: false, price: { TR: 149.99, US: 4.99 }, version: "2.1.0" },
];
export const demoApps: DemoApp[] = prototypes.flatMap((app, index) => (["ios", "play"] as const).map(store => ({ ...app, id: `demo-${index + 1}-${store}`, store })));

export function displayStats(app: DemoApp, country: Country): { rating: number | null; ratings: number | null; price: number | null; currency: string | null; free: boolean | null; version: string | null } {
  if (app.live) {
    const observation = app.live.observations[country];
    return { rating: observation?.rating ?? null, ratings: observation?.ratings ?? null, price: observation?.price ?? null, currency: observation?.currency ?? null, free: observation?.free ?? null, version: observation?.version ?? null };
  }
  return { rating: app.rating == null ? null : Number(Math.max(0, app.rating - (country === "US" ? 0.1 : 0) - (app.store === "play" ? 0.1 : 0)).toFixed(1)), ratings: app.ratings == null ? null : Math.round(app.ratings * (country === "US" ? 1.6 : 1) * (app.store === "play" ? 1.2 : 1)), price: app.price[country], currency: country === "TR" ? "TRY" : "USD", free: app.free, version: app.version };
}
export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i").trim();
}
const categoryLabels: Record<string, string> = {
  Productivity: "Üretkenlik", PRODUCTIVITY: "Üretkenlik", Verimlilik: "Üretkenlik", Education: "Eğitim", EDUCATION: "Eğitim",
  "Social Networking": "Sosyal ağ", Social: "Sosyal ağ", SOCIAL: "Sosyal ağ", Sosyal: "Sosyal ağ", Communication: "İletişim", COMMUNICATION: "İletişim", Haberleşme: "İletişim",
  Music: "Müzik", "Music & Audio": "Müzik", MUSIC_AND_AUDIO: "Müzik", "Müzik ve Ses": "Müzik", "Photo & Video": "Fotoğraf", Photography: "Fotoğraf", PHOTOGRAPHY: "Fotoğraf",
  Entertainment: "Eğlence", ENTERTAINMENT: "Eğlence", Finance: "Finans", FINANCE: "Finans", Tools: "Araçlar", TOOLS: "Araçlar",
  "Health & Fitness": "Sağlık ve fitness", HEALTH_AND_FITNESS: "Sağlık ve fitness", Games: "Oyunlar", Arcade: "Oyunlar", GAME_ARCADE: "Oyunlar",
  "Graphics & Design": "Grafik ve tasarım", Personalization: "Kişiselleştirme", PERSONALIZATION: "Kişiselleştirme",
};
export function translateCategory(value: string | null) { return value == null ? "Kategori verisi yok" : categoryLabels[value] ?? value; }
export function displayApp(app: DemoApp, country: Country): DemoApp {
  const observation = app.live?.observations[country];
  return observation ? { ...app, name: observation.name, developer: observation.developer ?? "Geliştirici verisi yok", category: translateCategory(observation.category) } : app;
}
export interface Filters { query: string; store: string; country: Country; category: string; sort: Sort; price: string }
export function filterApps(apps: DemoApp[], filters: Filters): DemoApp[] {
  const query = normalizeSearch(filters.query);
  return apps.map(app => displayApp(app, filters.country)).filter(app => (!app.live || app.live.observations[filters.country] != null) && (!query || normalizeSearch(`${app.name} ${app.developer} ${app.category}`).includes(query)) && (filters.store === "all" || filters.store === app.store) && (filters.category === "all" || filters.category === app.category) && (filters.price === "all" || (filters.price === "free" ? displayStats(app, filters.country).free === true : displayStats(app, filters.country).free === false))).toSorted((a, b) => {
    if (filters.sort === "name") return a.name.localeCompare(b.name, "tr") || a.id.localeCompare(b.id);
    const x = displayStats(a, filters.country)[filters.sort === "rating" ? "rating" : "ratings"];
    const y = displayStats(b, filters.country)[filters.sort === "rating" ? "rating" : "ratings"];
    if (x == null) return y == null ? a.id.localeCompare(b.id) : 1;
    if (y == null) return -1;
    return y - x || a.name.localeCompare(b.name, "tr") || a.id.localeCompare(b.id);
  });
}
export function parseFilters(params: URLSearchParams, allowedCategories: readonly string[] = categories): Filters {
  return { query: (params.get("q") ?? "").slice(0, 100), store: ["ios", "play"].includes(params.get("store") ?? "") ? params.get("store")! : "all", country: params.get("country") === "US" ? "US" : "TR", category: allowedCategories.some(c => c === params.get("category")) ? params.get("category")! : "all", sort: params.get("sort") === "ratings" ? "ratings" : params.get("sort") === "name" ? "name" : "rating", price: ["free", "paid"].includes(params.get("price") ?? "") ? params.get("price")! : "all" };
}
export const formatCount = (value: number | null) => value == null ? "Veri yok" : new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export function formatPrice(app: DemoApp, country: Country) {
  const stats = displayStats(app, country);
  if (stats.free === true) return "Ücretsiz";
  return stats.price == null || stats.currency == null ? "Veri yok" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: stats.currency }).format(stats.price);
}
