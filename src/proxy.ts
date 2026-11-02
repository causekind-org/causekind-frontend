import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stagingGate } from "./stagingGate";
import { defaultLocale, locales, type Locale } from "./i18n/config";

/**
 * Marks requests from known internal/office IPs so client trackers (Meta
 * Pixel) can skip them — team traffic must never count as real visitor/donor
 * conversions in ad data.
 *
 * IPs are configured via INTERNAL_TRAFFIC_IPS (comma-separated, server-only
 * env var) so the allowlist can be updated without a code change.
 */
const INTERNAL_IPS = (process.env.INTERNAL_TRAFFIC_IPS ?? "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const INTERNAL_TRAFFIC_COOKIE = "ck_internal_traffic";

function getClientIp(request: NextRequest): string | null {
  // Behind a proxy/CDN (Vercel, etc.) the real client IP is the first entry
  // in x-forwarded-for; x-real-ip is a fallback some setups provide instead.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}

/**
 * Serves each page from its locale's copy under src/app/[locale] without the
 * locale ever showing in the URL: /about is /en/about or /hi/about inside.
 * Each copy is cached on its own, so pages no longer render per request just
 * to find out the visitor's language.
 */
function localeResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  // API routes and public files (anything with an extension) are not pages.
  if (pathname.startsWith("/api/") || /\.[^/]+$/.test(pathname)) return NextResponse.next();
  const cookie = request.cookies.get("ck_locale")?.value;
  const locale = locales.includes(cookie as Locale) ? cookie : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  const gated = await stagingGate(request, getClientIp(request));
  if (gated) return gated;

  const response = localeResponse(request);

  if (INTERNAL_IPS.length === 0) return response;

  const ip = getClientIp(request);
  const isInternal = ip !== null && INTERNAL_IPS.includes(ip);

  if (isInternal) {
    response.cookies.set(INTERNAL_TRAFFIC_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else {
    // A previously-internal visitor (e.g. off a VPN, or IP reassigned) must
    // not stay excluded forever — clear the cookie once the IP no longer matches.
    response.cookies.delete(INTERNAL_TRAFFIC_COOKIE);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
