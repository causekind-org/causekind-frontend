import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
    qualities: [75, 95],
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
  async redirects() {
    return [
      {
        source: "/dashboard/ngo",
        destination: "/",
        permanent: false,
      },
      {
        source: "/dashboard/ngo/complete-profile",
        destination: "/dashboard/ngo/profile",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
