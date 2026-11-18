import type { Metadata } from "next";
import TermsClient from "./TermsClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using CauseKind: eligibility, accounts, campaigns and verification, donations, refunds, item listings and matches, 80G tax certificates and disputes.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <TermsClient />;
}
