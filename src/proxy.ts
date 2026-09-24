import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

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
