import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Privacy Policy — CauseKind",
  description: "How CauseKind collects, uses, stores and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <PrivacyClient />;
}
