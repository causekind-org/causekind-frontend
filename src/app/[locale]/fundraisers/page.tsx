import type { Metadata } from "next";
import FundraisersClient from "./FundraisersClient";

// Server wrapper so the page has its own title, description and canonical;
// the page itself is unchanged in FundraisersClient.
export const metadata: Metadata = {
  title: "Fundraisers",
  description: "Support fundraisers on CauseKind. Each one is reviewed by the CauseKind team before it goes live.",
  alternates: { canonical: "/fundraisers" },
};

export default function FundraisersPage() {
  return <FundraisersClient />;
}
