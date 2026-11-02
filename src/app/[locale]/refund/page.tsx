import type { Metadata } from "next";
import RefundClient from "./RefundClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Refund Policy — CauseKind",
  description: "CauseKind's refund policy for monetary contributions, including eligibility and how to raise a request.",
  alternates: { canonical: "/refund" },
};

export default function Page() {
  return <RefundClient />;
}
