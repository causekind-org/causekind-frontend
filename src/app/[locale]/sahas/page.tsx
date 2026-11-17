import type { Metadata } from "next";
import SahasHubClient from "./SahasHubClient";

// Server wrapper so the page has its own title, description and canonical.
export const metadata: Metadata = {
  title: "Sahas Charitable Trust Campaigns",
  description: "Give to campaigns run by Sahas Charitable Trust, a registered non-profit based in Palghar, Maharashtra.",
  alternates: { canonical: "/sahas" },
};

export default function SahasHubPage() {
  return <SahasHubClient />;
}
