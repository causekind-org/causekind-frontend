import type { Metadata } from "next";
import CampaignsClient from "./CampaignsClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Campaigns — CauseKind",
  description: "Browse active CauseKind campaigns and support verified community needs across India.",
  alternates: { canonical: "/campaigns" },
};

export default function Page() {
  return <CampaignsClient />;
}
