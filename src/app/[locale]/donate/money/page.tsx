import type { Metadata } from "next";
import MoneyDonateClient from "./MoneyDonateClient";

// Server wrapper so the route carries its own metadata — a "use client" module
// cannot export it. Mirrors src/app/donate/page.tsx; the canonical is relative
// and resolves against metadataBase in src/app/layout.tsx.
export const metadata: Metadata = {
  title: "Donate Money — CauseKind",
  description:
    "Fund education, healthcare and social welfare through Sahas Charitable Trust. 12AA and 80G certified, with every rupee accounted for.",
  alternates: { canonical: "/donate/money" },
};

export default function Page() {
  return <MoneyDonateClient />;
}
