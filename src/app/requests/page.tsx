import type { Metadata } from "next";
import RequestsClient from "./RequestsClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Verified Requests — CauseKind",
  description: "See admin-verified in-kind requests from families and organisations near you, and donate the specific items they have asked for.",
  alternates: { canonical: "/requests" },
};

export default function Page() {
  return <RequestsClient />;
}
