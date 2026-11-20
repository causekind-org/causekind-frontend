import type { Metadata } from "next";
import CampaignsClient from "./CampaignsClient";
import { SeoLinkSection } from "@/components/SeoLinkSection";
import { FEATURES } from "@/lib/features";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Campaigns",
  description: "Browse active CauseKind campaigns and support verified community needs across India.",
  alternates: { canonical: "/campaigns" },
  // While money campaigns are switched off the page only shows "Coming soon":
  // keep it out of the index. Indexable again as soon as FEATURES.money is on.
  ...(FEATURES.money ? {} : { robots: { index: false, follow: true } }),
};

export default function Page() {
  return (
    <>
      <CampaignsClient />
      <SeoLinkSection
        id="campaigns-browse"
        heading="More ways to help"
        intro="Support verified community campaigns on CauseKind, or give items directly to people near you. Browse by category or see every open request."
        withCategories
        links={[{ name: "All requests", href: "/requests" }, { name: "Donate money", href: "/donate/money" }]}
      />
    </>
  );
}
