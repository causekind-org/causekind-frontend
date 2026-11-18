import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stagingGate } from "./stagingGate";
import { defaultLocale, locales, type Locale } from "./i18n/config";
import { BLOG_SLUGS, CATEGORY_SLUGS, INITIATIVE_SLUGS } from "./lib/staticSlugs";

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
 * Detail routes whose id is a database Long (Campaign, fundraising campaign,
 * NgoDrive, ItemListing, ItemRequest), with the static children that share the
 * segment. /sahas and /ngos are slug routes and are deliberately absent.
 */
const NUMERIC_ID_ROUTES: Record<string, readonly string[]> = {
  campaigns: ["new"],
  fundraisers: ["donations", "my-donations", "reports"],
  drives: [],
  items: ["new"],
  requests: ["new", "category"],
};

/**
 * True when the URL names a numeric-id page with an id that cannot exist, such
 * as /campaigns/nope-000. Those pages decide "not found" after the response has
 * started streaming, so without this they answer 200. No backend call is made;
 * a well-formed id that does not exist is not caught here.
 */
function isImpossibleId(pathname: string): boolean {
  const [, section, id] = pathname.split("/");
  if (!section || !id) return false;
  const staticChildren = NUMERIC_ID_ROUTES[section];
  if (!staticChildren) return false;
  return !/^\d+$/.test(id) && !staticChildren.includes(id);
}

/**
 * Serves each page from its locale's copy under src/app/[locale] without the
 * locale ever showing in the URL: /about is /en/about or /hi/about inside.
 * Each copy is cached on its own, so pages no longer render per request just
 * to find out the visitor's language.
 */
/**
 * True for /blog/<slug>, /initiatives/<slug> or /requests/category/<slug> with
 * a slug that has no page. These routes know their full slug list, but their
 * notFound() runs inside the root layout's <Suspense>, after the 200 is sent.
 * (dynamicParams = false was tried first: it also 404s every valid slug in a
 * non-English locale, because only the "en" copies are pre-generated.)
 */
function isUnknownStaticSlug(pathname: string): boolean {
  const parts = pathname.split("/");
  if (parts.length === 3 && parts[1] === "blog") return !BLOG_SLUGS.includes(parts[2]!);
  if (parts.length === 3 && parts[1] === "initiatives") return !INITIATIVE_SLUGS.includes(parts[2]!);
  if (parts.length === 4 && parts[1] === "requests" && parts[2] === "category") return !CATEGORY_SLUGS.includes(parts[3]!);
  return false;
}

/**
 * Public detail pages whose existence the backend decides. A well-formed id
 * that does not exist (/campaigns/999999) passes isImpossibleId, and the
 * page's own notFound() runs after the 200 has been sent. So the proxy asks
 * the same public endpoint the page uses, and only a definite 404 from it
 * becomes a 404 here: a timeout, network error or 5xx falls through to the
 * page, so a backend hiccup never turns a real page into "not found".
 */
const DETAIL_ENDPOINTS: Record<string, (id: string) => string> = {
  campaigns: (id) => `/api/v1/campaigns/${id}`,
  fundraisers: (id) => `/api/v1/fundraising/public/campaigns/${id}`,
  drives: (id) => `/api/v1/drives/${id}`,
};
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function isMissingDetail(pathname: string): Promise<boolean> {
  const parts = pathname.split("/");
  if (parts.length !== 3) return false;
  const endpoint = DETAIL_ENDPOINTS[parts[1]!];
  if (!endpoint || !/^\d+$/.test(parts[2]!)) return false;
  try {
    const res = await fetch(API_ORIGIN + endpoint(parts[2]!), {
      signal: AbortSignal.timeout(1500),
      headers: { accept: "application/json" },
    });
    return res.status === 404;
  } catch {
    return false;
  }
}

function localeResponse(request: NextRequest, missingDetail = false): NextResponse {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") || /\.[^/]+$/.test(pathname)) return NextResponse.next();
  const cookie = request.cookies.get("ck_locale")?.value;
  const locale = locales.includes(cookie as Locale) ? cookie : defaultLocale;
  const url = request.nextUrl.clone();
  if (missingDetail || isImpossibleId(pathname) || isUnknownStaticSlug(pathname)) {
    // No route matches this path, so Next answers with a real 404.
    url.pathname = `/${locale}/__not-found__`;
    return NextResponse.rewrite(url);
  }
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  const gated = await stagingGate(request, getClientIp(request));
  if (gated) return gated;

  const response = localeResponse(request, await isMissingDetail(request.nextUrl.pathname));

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
