import type { Metadata } from "next";
import { Suspense } from "react";

// The page is a client component, so its title and description live here.
// noindex comes from the X-Robots-Tag header in next.config.ts (/items/*);
// robots below says the same in the HTML.
export const metadata: Metadata = {
  title: "List an item to donate",
  description: "List an item you want to give away on CauseKind: add photos, choose a category and pickup area, and match with verified requests near you.",
  alternates: { canonical: "/items/new" },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  // Server-rendered h1: the wizard renders client-side, so crawlers reading raw
  // HTML saw none. The wizard's step title is an h2 on this route.
  // The Suspense boundary matters: the page reads useSearchParams, and without
  // a boundary of its own its client-only rendering bailed out from higher up,
  // which took this h1 out of the server HTML too (Report 3, 23 Nov). The
  // fallback is empty, as before: the page shows its own loading skeleton.
  return (
    <>
      <h1 className="sr-only">List an item to donate</h1>
      <Suspense>{children}</Suspense>
    </>
  );
}
