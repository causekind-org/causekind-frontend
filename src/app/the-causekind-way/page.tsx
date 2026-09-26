import { Metadata } from "next";
import { TheCauseKindWayClient } from "./TheCauseKindWayClient";

export const metadata: Metadata = {
  description:
    "Discover how CauseKind connects generous donors with verified people and NGOs nearby for direct, dignified, in-kind giving with zero cash and zero middlemen.",
  alternates: {
    canonical: "/the-causekind-way",
  },
  openGraph: {
    description:
      "Discover how CauseKind connects generous donors with verified people and NGOs nearby for direct, dignified, in-kind giving with zero cash and zero middlemen.",
    url: "https://www.causekind.com/the-causekind-way",
    siteName: "CauseKind",
    type: "website",
    locale: "en_IN",
  },
};

export default function TheCauseKindWayPage() {
  return <TheCauseKindWayClient />;
}
