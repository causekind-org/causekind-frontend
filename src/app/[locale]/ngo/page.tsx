import type { Metadata } from "next";
import { NgoLandingView } from "@/components/ngo-landing/NgoLandingView";

export const metadata: Metadata = {
  title: "Donate to Verified NGOs in India",
  description:
    "Donate items or money to legally verified NGOs in India. Every NGO is checked, and every donation comes with proof of delivery.",
  alternates: { canonical: "/ngo" },
};

export default function NgoLandingPage() {
  return <NgoLandingView />;
}
