import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { categoryBySlug, IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import CategoryPageClient from "./CategoryPageClient";
import { SeoLinkSection } from "@/components/SeoLinkSection";

// Server-rendered intro + guide links for the two categories that have blog guides.
const CATEGORY_GUIDES: Record<string, { heading?: string; intro: string; links: { name: string; href: string }[] }> = {
  clothing: {
    intro: "Donate clean, wearable clothes for children, women and men directly to verified people and NGOs near you. See the current clothing requests above, or read a guide first.",
    links: [
      { name: "Complete guide to donating clothes in India", href: "/blog/complete-guide-donating-clothes-india" },
      { name: "Where to donate clothes near you", href: "/blog/where-to-donate-clothes-near-me-india" },
      { name: "What clothes should not be donated", href: "/blog/what-clothes-should-not-be-donated-india" },
      { name: "How to prepare clothes for donation", href: "/blog/how-to-prepare-clothes-for-donation-india" },
      { name: "What happens after clothes are donated", href: "/blog/what-happens-after-clothes-are-donated-india" },
    ],
  },
  furniture: {
    heading: "Donating furniture",
    intro: "Donate furniture that still has years of use left, such as chairs, tables, beds and wardrobes. Transport decides everything with furniture, so be clear about size and weight in your listing; it helps a family or NGO near you collect it.",
    links: [],
  },
  electronics: {
    intro: "Donate working laptops, phones and tablets to verified students and NGOs near you. Wipe your personal data first: the guides below show how.",
    links: [
      { name: "How to donate laptops and electronics", href: "/blog/how-to-donate-laptops-electronics-india" },
      { name: "How to erase personal data before donating", href: "/blog/how-to-erase-personal-data-before-donation-india" },
      { name: "Donating laptops to students", href: "/blog/donating-laptops-to-students-india" },
      { name: "Donating versus recycling electronics", href: "/blog/donating-versus-recycling-electronics-india" },
      { name: "What condition donated devices should be in", href: "/blog/acceptable-condition-donated-devices-india" },
    ],
  },
};

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

  return (
    <>
      <CategoryPageClient cat={cat} />
      {CATEGORY_GUIDES[cat.slug] && (
        <SeoLinkSection
          id={`${cat.slug}-guides`}
          heading={CATEGORY_GUIDES[cat.slug]!.heading ?? "Guides"}
          intro={CATEGORY_GUIDES[cat.slug]!.intro}
          links={CATEGORY_GUIDES[cat.slug]!.links}
        />
      )}
    </>
  );
}

