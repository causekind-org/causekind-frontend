import type { Metadata } from "next";
import DonateClient from "./DonateClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Donate — CauseKind",
  description: "Give in kind to verified requests near you. Zero platform fees, matched within 10 km, and tracked through to confirmed delivery.",
  alternates: { canonical: "/donate" },
};

export default function Page() {
  return <DonateClient />;
}
