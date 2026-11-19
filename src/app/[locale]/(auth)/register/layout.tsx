import type { Metadata } from "next";

// The page is a client component, so its title and description live here.
// noindex comes from the X-Robots-Tag header in next.config.ts; robots below
// says the same in the HTML.
export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free CauseKind account to donate items near you, ask for what you need, or register your NGO.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
