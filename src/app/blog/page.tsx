import type { Metadata } from "next";
import BlogIndexClient from "./BlogIndexClient";

/**
 * Server wrapper around the client listing UI, so the blog index can carry its
 * own title, description and canonical rather than inheriting the root
 * layout's generic site-wide metadata. Same reasoning as the per-post wrapper
 * in [slug]/page.tsx.
 */
export const metadata: Metadata = {
  title: "Blog — CauseKind",
  description:
    "Guides and stories on giving in India: how to verify an NGO, what to donate, how in-kind giving works, and the people your donations reach.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Blog — CauseKind",
    description:
      "Guides and stories on giving in India: how to verify an NGO, what to donate, how in-kind giving works, and the people your donations reach.",
    url: "/blog",
  },
};

export default function BlogPage() {
  return <BlogIndexClient />;
}
