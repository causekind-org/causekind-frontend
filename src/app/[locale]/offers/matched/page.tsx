import type { Metadata } from "next";
import MatchedDonationsClient from "./MatchedDonationsClient";

export const metadata: Metadata = {
  title: "My Matched Donations — CauseKind",
  description: "Your listed items that were matched and donated.",
  alternates: { canonical: "/offers/matched" },
};

export default function Page() {
  return <MatchedDonationsClient />;
}
