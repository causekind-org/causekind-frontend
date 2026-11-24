import type { Metadata } from "next";

// The page is a client component, so its title and description live here.
// noindex comes from the X-Robots-Tag header in next.config.ts; robots below
// says the same in the HTML.
export const metadata: Metadata = {
  title: "Your reports",
  description: "See the reports you have filed about fundraisers on CauseKind and the status of each review.",
  alternates: { canonical: "/fundraisers/reports" },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  // The page itself is a client component behind Suspense, so its heading is
  // not in the server HTML that crawlers read. This h1 is; the page's visible
  // title is an h2 so there is exactly one h1.
  return (
    <>
      <h1 className="sr-only">Your reports</h1>
      {children}
    </>
  );
}
