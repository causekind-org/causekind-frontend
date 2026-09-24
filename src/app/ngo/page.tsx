import type { Metadata } from "next";
import { NgoLandingView } from "@/components/ngo-landing/NgoLandingView";

export const metadata: Metadata = {
  title: "NGO & Partner Giving | CauseKind",
  description:
    "Give items, give money, or give both to legally verified NGOs and communities in need. Closed-loop proof and AI-screened verification.",
  alternates: { canonical: "/ngo" },
};

export default function NgoLandingPage() {
  return <NgoLandingView />;
}
