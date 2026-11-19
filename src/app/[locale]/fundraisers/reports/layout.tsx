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
  return children;
}
