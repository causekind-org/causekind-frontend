import type { Metadata } from "next";

import GiveSafelyClient from "./GiveSafelyClient";

// Server wrapper so this route carries its own metadata — a "use client" module
// cannot export it, and without this the page would inherit the root layout's
// site-wide title and canonical. Same split every indexable route here uses.
export const metadata: Metadata = {
  title: "How to check a charity before you donate — CauseKind",
  description:
    "A short checklist for giving safely: how to verify an organisation, what to ask before handing anything over, and what proof to keep afterwards.",
  alternates: { canonical: "/give-safely" },
};

export default function Page() {
  return <GiveSafelyClient />;
}
