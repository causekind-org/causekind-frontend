import type { Metadata } from "next";
import { NgoLandingView } from "@/components/ngo-landing/NgoLandingView";

export const metadata: Metadata = {
  title: "Donate to Verified NGOs in India",
  description:
    "Find verified NGOs near you and across India. Donate items or money to legally checked NGOs, with proof of delivery for every donation.",
  alternates: { canonical: "/ngo" },
};

export default function NgoLandingPage() {
  return <NgoLandingView />;
}
