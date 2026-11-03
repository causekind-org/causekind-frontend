import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { categoryBySlug, IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import CategoryPageClient from "./CategoryPageClient";

type Params = { params: Promise<{ slug: string; locale: string }> };

// Nine known slugs, built ahead of time.
export function generateStaticParams() {
  return IN_KIND_CATEGORIES.map((c) => ({ slug: c.slug }));
}

// Metadata is built purely from the editorial registry. No request, donee or
// location data goes anywhere near it — these pages are public and indexable.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const mt = await getTranslations("requestsArea");
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
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  return <CategoryPageClient cat={cat} />;
}

