import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { categoryBySlug, IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import CategoryPageClient from "./CategoryPageClient";

type Params = { params: Promise<{ slug: string }> };

// Nine known slugs. Note the app is already dynamically rendered end-to-end
// because src/i18n/request.ts calls cookies(), so this is correctness and
// future-proofing rather than a measurable win today.
export function generateStaticParams() {
  return IN_KIND_CATEGORIES.map((c) => ({ slug: c.slug }));
}

// Metadata is built purely from the editorial registry. No request, donee or
// location data goes anywhere near it — these pages are public and indexable.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const mt = await getTranslations("requestsArea");
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) return { title: mt("metaCategoryNotFound") };
  const title = mt("metaCategoryTitle", { category: cat.name });
  return {
    title,
    description: cat.tagline,
    alternates: { canonical: `/requests/category/${cat.slug}` },
    openGraph: { title, description: cat.tagline, type: "article" },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  return <CategoryPageClient cat={cat} />;
}

