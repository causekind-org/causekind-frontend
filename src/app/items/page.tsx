import type { Metadata } from "next";
import ItemsClient from "./ItemsClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Donation Listings — CauseKind",
  description: "List an item you want to donate, or see the listings you have already shared with your local CauseKind community.",
  alternates: { canonical: "/items" },
};

export default function Page() {
  return <ItemsClient />;
}
