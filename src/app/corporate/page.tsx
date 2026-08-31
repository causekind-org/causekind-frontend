import type { Metadata } from "next";

import CorporateClient from "./CorporateClient";

// Server wrapper so this route carries its own metadata — a "use client" module
// cannot export it, and without this the page would inherit the root layout's
// site-wide title and canonical, competing with every other page for the same
// identity. Same split every indexable route here uses.
export const metadata: Metadata = {
  title: "Donate office furniture and electronics — CauseKind for companies",
  description:
    "Clearing an office? Give the furniture and electronics to verified local needs, and get a QR-verifiable certificate for every handover you can put in a CSR report.",
  alternates: { canonical: "/corporate" },
};

export default function Page() {
  return <CorporateClient />;
}
