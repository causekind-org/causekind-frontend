import type { Metadata } from "next";
import { ScanDonation } from "@/features/scan-donation/ScanDonation";

export const metadata: Metadata = {
  title: "Feed a hungry person this Diwali | CauseKind",
  robots: { index: false, follow: false },
};

/** Reached only from the QR code in the Diwali video ad, so it stays out of search and the sitemap. */
export default function Page() {
  return <ScanDonation />;
}
