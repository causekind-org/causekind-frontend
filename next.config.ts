import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The floating black "N" badge that overlaps the mobile bottom navigation in
  // local dev is Next.js's own development indicator — not a CauseKind element.
  // Hidden here rather than working around it with navbar spacing or CSS, which
  // would distort the real layout to accommodate tooling that never ships.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
