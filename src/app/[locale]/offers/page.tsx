import type { Metadata } from "next";
import OffersClient from "./OffersClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Offers — CauseKind",
  description: "Track the donation offers you have made and their progress from match through to confirmed handover.",
  alternates: { canonical: "/offers" },
};

export default function Page() {
  return <OffersClient />;
}
