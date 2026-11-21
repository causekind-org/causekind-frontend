import type { Metadata } from "next";

// The page is a client component, so its title and description live here.
// Still noindex: the X-Robots-Tag header in next.config.ts covers /login, and
// robots below says the same in the HTML.
export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to CauseKind to offer items to verified requests near you, track your donations and matches, and download your impact certificates.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // The page itself is a client component behind Suspense, so its heading is
  // not in the server HTML that crawlers read. This h1 is; the page's visible
  // title is an h2 so there is exactly one h1.
  return (
    <>
      <h1 className="sr-only">Log in</h1>
      {children}
    </>
  );
}
