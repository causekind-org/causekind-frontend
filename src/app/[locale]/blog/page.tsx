import type { Metadata } from "next";
import BlogIndexClient from "./BlogIndexClient";

// Static (no force-dynamic): the listing reads ?category= in the browser, so
// the page can be cached and use the back/forward cache. Every post is still
// in the HTML for search engines.

/**
 * Server wrapper around the client listing UI, so the blog index can carry its
 * own title, description and canonical rather than inheriting the root
 * layout's generic site-wide metadata. Same reasoning as the per-post wrapper
 * in [slug]/page.tsx.
 */
export const metadata: Metadata = {
  title: "Donation Guides & Giving Tips in India",
  description:
    "Guides and stories on giving in India: how to verify an NGO, what to donate, how in-kind giving works, and the people your donations reach.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Donation Guides & Giving Tips in India | CauseKind",
    description:
      "Guides and stories on giving in India: how to verify an NGO, what to donate, how in-kind giving works, and the people your donations reach.",
    url: "/blog",
    images: ["/og-default.png"],
  },
};

export default function BlogPage() {
  return <BlogIndexClient />;
}
