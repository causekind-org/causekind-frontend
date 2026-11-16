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
const TRANSLATED_TITLE_LOCALES = new Set(["es", "fr", "hi"]);

/** URL slug → key under categoryStrip.categories (medical-aid → medicalAid). */
function categoryMessageKey(slug: string) {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const mt = await getTranslations("requestsArea");
  const cat = categoryBySlug(slug);
  if (!cat) return { title: mt("metaCategoryNotFound") };
  // English gets the search-tuned title. es/fr/hi use their own translated
  // pattern with the translated category name (no English mixed in). Other
  // locales have no metaCategoryTitle of their own, so they keep the English one.
  let title = cat.seoTitle;
  if (TRANSLATED_TITLE_LOCALES.has(locale)) {
    const tc = await getTranslations("categoryStrip.categories");
    title = mt("metaCategoryTitle", { category: tc(categoryMessageKey(cat.slug)) });
  }
  const description = cat.seoDescription;
  return {
    title,
    description,
    alternates: { canonical: `/requests/category/${cat.slug}` },
    openGraph: { title: `${title} | CauseKind`, description, type: "article", images: ["/og-default.png"] },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  return <CategoryPageClient cat={cat} />;
}

