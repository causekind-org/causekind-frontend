import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The floating black "N" badge that overlaps the mobile bottom navigation in
  // local dev is Next.js's own development indicator — not a CauseKind element.
  // Hidden here rather than working around it with navbar spacing or CSS, which
  // would distort the real layout to accommodate tooling that never ships.
  devIndicators: false,
  /*
   * Barrel-file optimisation. Without this, a named import from a large
   * index can pull far more of the package than the icons actually used —
   * badly so in dev, which does not tree-shake barrels well. lucide-react
   * alone has 115 distinct icons imported across 154 call sites here.
   *
   * Next 16 optimises some packages by default; naming them explicitly is
   * what makes the behaviour intentional rather than incidental, and adds
   * the Radix set, which is not on the default list.
   */
  experimental: {
    // Branded 404 for unmatched URLs (src/app/global-not-found.tsx). The root
    // layout lives under [locale], so a plain not-found.tsx never sees them.
    globalNotFound: true,
    // CSS goes into the HTML as <style> instead of a render-blocking <link>
    // (owner decision, Report 3, 23 Nov: about 105 KiB compressed blocked
    // first paint for 300-600 ms on mobile). Trade-off accepted: every page's
    // HTML carries the CSS and returning visitors cannot reuse a cached file.
    inlineCss: true,
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },
  images: {
    // Every quality any <Image> in the app actually asks for. The optimizer
    // rejects an unlisted one outright — `/_next/image?...&q=100` answers 400,
    // not a downgraded image — so a value missing here is a blank picture, not
    // a slightly heavier one.
    qualities: [75, 90, 95, 100],
    // Optimised images stay cached for 31 days (Lighthouse cache-lifetime audit).
    minimumCacheTTL: 2678400,
    // AVIF first (smaller), WebP fallback; browsers pick via the Accept header.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8080" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Our own buckets only. "**.amazonaws.com" let the optimizer fetch from
      // any S3 bucket, including an attacker's (GHSA-2464-fhr4-w9xw, SVG RCE).
      { protocol: "https", hostname: "causekind-item-images.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "causekind-staging-images.s3.ap-southeast-1.amazonaws.com" },
    ],
  },
  async headers() {
    return [
      {
        // A private link's page: never sent as a referrer, never indexed.
        source: "/volunteer-handover",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Returning visitors skip the download for a day, then revalidate. Not
        // "immutable": file names here can be reused (diwali-hero.mp4 is a
        // seasonal name), and immutable would pin the old clip for a year.
        source: "/videos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      // Other public files (videos, PDFs) in these folders and loose videos at
      // the public root: 7 days (owner decision, Report 2).
      ...[
        "/brand/:path*",
        "/certificates/:path*",
        "/:file([^/]+\.(?:mp4|webm))",
      ].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      })),
      /*
       * Public IMAGES: 1 year, immutable (owner decision, Report 3, 23 Nov).
       * RULE: never replace an image under the same file name. A changed image
       * must get a new name (e.g. hero-v2.webp) and the code must point to it;
       * otherwise returning visitors keep the old picture for up to a year.
       * Listed after the 7-day rules on purpose: for the same header key the
       * later match wins, so images in /brand and /certificates get this one.
       */
      ...[
        "/images/:path*",
        "/categories/:path*",
        "/screenshots/:path*",
        "/brand/:file([^/]+\.(?:webp|avif|png|jpg|jpeg|svg))",
        "/certificates/:file([^/]+\.(?:webp|avif|png|jpg|jpeg|svg))",
        "/:file([^/]+\.(?:webp|avif|png|jpg|jpeg|svg))",
      ].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      })),
      /*
       * Private, auth and utility pages stay out of search. Sources match the
       * URL the visitor requests (no locale prefix; the proxy adds that after).
       * None of these may go into robots.txt Disallow: a crawler has to fetch
       * the page to see the noindex.
       *
       * /ngo itself is public. Only its three private areas are listed, by
       * name, so the landing page and /ngos/<slug> can never match.
       */
      ...[
        "/:section(login|register|forgot-password|reset-password|thank-you|certificate)",
        "/drives/:id/:step(give|proof)",
        "/sahas/:slug/donate",
        "/sahas/:slug/give/:path*",
      ].map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] })),
      ...[
        "/:section(dashboard|profile|admin|super-admin|donee|crm|items|offers|matches|ngo-drive-offers|fundraising)/:path*",
        "/ngo/:area(requests|drives|handovers)/:path*",
        "/requests/new",
        "/requests/:id/offer",
        "/campaigns/new",
        "/fundraisers/:id/:step(donate|report)",
        "/fundraisers/donations/:path*",
        "/fundraisers/:page(my-donations|reports)",
      ].map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/ngo/complete-profile",
        destination: "/profile/ngo-details",
        permanent: false,
      },
      // The "Giving safely" checklist page was removed; old links land on the FAQ.
      { source: "/give-safely", destination: "/faq", permanent: true },
      // /give never existed as a page; old links land on the requests board.
      { source: "/give", destination: "/requests", permanent: true },
      // A real 308 at the edge; the /help page's permanentRedirect stays as a fallback.
      { source: "/help", destination: "/faq", permanent: true },
    ];
  },
};

/**
 * Regenerates src/lib/staticSlugs.ts before anything is compiled.
 *
 * The "prebuild"/"predev" npm scripts already do this, but they only run when
 * the build is started through npm. This config is loaded by every `next build`
 * and `next dev`, however they are started, so the list the proxy 404s against
 * can never be older than the blog, initiative and category data.
 *
 * Only in the build and dev phases: `next start` must not write to the source
 * tree. The generator writes only when the content changed, so running after
 * "prebuild" is a no-op, as are the repeat config loads a build makes. It runs
 * as a child process because it is an ES module and this file may be compiled
 * to CommonJS; a non-zero exit throws here and stops the build.
 */
function regenerateStaticSlugs(phase: string) {
  if (phase !== PHASE_PRODUCTION_BUILD && phase !== PHASE_DEVELOPMENT_SERVER) return;
  execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "generate-static-slugs.mjs")], {
    stdio: "inherit",
  });
}

export default function config(phase: string) {
  regenerateStaticSlugs(phase);
  return withNextIntl(nextConfig);
}
