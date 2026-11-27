import type { Metadata } from "next";
import ItemsClient from "./ItemsClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. No canonical: /items is a
// private, noindex page (X-Robots-Tag in next.config.ts), and a noindex page
// naming itself canonical sends Google mixed signals.
export const metadata: Metadata = {
  title: "Donation Listings",
  description: "List an item you want to donate, or see the listings you have already shared with your local CauseKind community.",
};

export default function Page() {
  return <ItemsClient />;
}
