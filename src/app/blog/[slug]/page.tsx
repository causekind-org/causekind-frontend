import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/data/blogData";
import BlogPostClient from "./BlogPostClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * This route is a thin server component wrapping the client UI in
 * BlogPostClient, purely so it can export generateMetadata — a `"use client"`
 * module cannot.
 *
 * <p>Without it every post inherited the root layout's metadata, so all
 * thirteen articles served the identical `<title>` "CauseKind — Give With
 * Purpose" and the same meta description. To a crawler that reads as thirteen
 * duplicates of one page, which is why so few of them were being indexed. Each
 * post now carries its own title, description and self-referencing canonical.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return { title: "Post Not Found - CauseKind" };
  }

  // Relative canonical/openGraph URLs resolve against metadataBase in
  // src/app/layout.tsx (https://www.causekind.com), which keeps every emitted
  // absolute URL on the www host the apex domain redirects to.
  // Relative image paths resolve against metadataBase too, so post.image can
  // be passed through as-is whether it is a local /foo.webp or a remote URL.
  const path = `/blog/${post.slug}`;

  return {
    title: `${post.title} - CauseKind`,
    description: post.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: path,
      images: [post.image],
      publishedTime: post.publishedDate,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.image],
    },
  };
}

/**
 * Pre-renders every post at build time and — just as importantly — tells Next
 * the complete set of valid slugs, so an unknown one 404s instead of being
 * served as a soft-404 with a 200 status that Google would try to index.
 */
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  // FAQPage markup for the guides that carry Q&A. Emitted here rather than in
  // BlogPostClient so it is in the server-rendered document; the questions
  // themselves are also in the article body, which Google requires — FAQ
  // structured data must reflect content visible on the page.
  const faqSchema = post.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <BlogPostClient slug={slug} />
    </>
  );
}
