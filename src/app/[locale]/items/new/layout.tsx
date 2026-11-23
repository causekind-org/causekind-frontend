import type { Metadata } from "next";

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
  return (
    <>
      <h1 className="sr-only">List an item to donate</h1>
      {children}
    </>
  );
}
