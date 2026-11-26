import { NextResponse, type NextRequest } from "next/server";
import { requireViewer, siteOrigin } from "../../../lib/auth/server";
import { COMPARE_COOKIE, Country, Language, addToSelection, parseCompareCookie, parseCompareIds, serializeCompareCookie } from "../../../lib/watchlist/model";

/**
 * GET /compare/add?app=&country=&language= — appends an app to the browser's last comparison in the same
 * country/language (or starts a new one) and redirects to the shareable /compare URL. Never fetches data,
 * never writes to the database. Requires a signed-in viewer (or the development demo).
 */
export async function GET(request: NextRequest) {
  await requireViewer("/compare");
  const url = request.nextUrl;
  const origin = (await siteOrigin()) ?? url.origin;
  const app = parseCompareIds(url.searchParams.get("app"));
  const country = Country.safeParse(url.searchParams.get("country") ?? "US");
  const language = Language.safeParse(url.searchParams.get("language") ?? "en");
  if (!app.ok || app.ids.length !== 1 || !country.success || !language.success) return NextResponse.redirect(new URL("/compare?notice=invalid_id", origin));
  const previous = parseCompareCookie(request.cookies.get(COMPARE_COOKIE)?.value);
  const base = previous && previous.country === country.data && previous.language === language.data ? previous.ids : [];
  const { ids, outcome } = addToSelection(base, app.ids[0]!);
  const target = new URL(`/compare?apps=${ids.join(",")}&country=${country.data}&language=${encodeURIComponent(language.data)}${outcome === "added" ? "" : `&notice=${outcome}`}`, origin);
  const response = NextResponse.redirect(target);
  response.cookies.set(COMPARE_COOKIE, serializeCompareCookie(country.data, language.data, ids), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
