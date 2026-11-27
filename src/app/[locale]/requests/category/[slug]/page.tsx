import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { categoryBySlug, IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import CategoryPageClient from "./CategoryPageClient";
import { SeoLinkSection } from "@/components/SeoLinkSection";

// Server-rendered intro + guide links. Every category with blog guides has an
// entry, so the page has its own text even when few requests are live.
const CATEGORY_GUIDES: Record<string, { heading?: string; intro: string; links: { name: string; href: string }[] }> = {
  clothing: {
    intro: "Want to donate old clothes near you? Give clean, wearable clothes for children, women and men directly to verified people and NGOs nearby. You and the receiver agree a handover time and place in the app. See the current clothing requests above, or read a guide first.",
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
    intro: "Donate a sofa or couch, bed frame, dining table or chairs that still have years of use left. Transport decides everything with furniture, so be clear about size and weight in your listing; it helps a family or NGO near you collect it.",
    links: [
      { name: "How to donate furniture in India", href: "/blog/how-to-donate-furniture-india" },
      { name: "What to do with old items", href: "/blog/what-to-do-with-old-items-india" },
    ],
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
  household: {
    intro: "Donate utensils, bedding, fans and everyday household items to families and NGOs near you. Complete sets and items that work today help most: a family setting up a home needs a pressure cooker that seals, not one missing its whistle.",
    links: [
      { name: "How to donate kitchen utensils", href: "/blog/how-to-donate-kitchen-utensils-india" },
      { name: "What to do with old items", href: "/blog/what-to-do-with-old-items-india" },
      { name: "5 things you can donate right now", href: "/blog/5-things-you-can-donate-right-now" },
    ],
  },
  relief: {
    intro: "Relief requests come after floods, fires and cold waves, when families need blankets, clean clothes, bedding and basic supplies quickly. Give items that are ready to use straight away, and check the requests above for what is needed in each place right now.",
    links: [
      { name: "How to donate blankets", href: "/blog/how-to-donate-blankets-india" },
      { name: "Monsoon giving: the most neglected season", href: "/blog/monsoon-giving-most-neglected-season" },
      { name: "How to organise an item donation drive", href: "/blog/how-to-organise-item-donation-drive-india" },
      { name: "What to donate each month", href: "/blog/what-to-donate-each-month-india" },
    ],
  },
  education: {
    intro: "Donate books, textbooks, stationery and school bags to students and schools near you. The best time is just before a new school year, when families buy everything at once; current-syllabus textbooks and complete stationery kits help most.",
    links: [
      { name: "How to donate books in India", href: "/blog/how-to-donate-books-india" },
      { name: "What students need in January and February", href: "/blog/what-students-need-in-january-and-february" },
      { name: "The ripple effect of opportunity", href: "/blog/the-ripple-effect-of-opportunity" },
    ],
  },
  sports: {
    intro: "Donate cricket kits, footballs, badminton sets and shoes to schools, clubs and NGOs that run sports for children. Kit in the right size and in safe condition matters most, so list the sizes clearly.",
    links: [
      { name: "How to donate sports equipment", href: "/blog/how-to-donate-sports-equipment-india" },
    ],
  },
  "medical-aid": {
    intro: "Donate wheelchairs, walkers, hospital beds and health devices to people and NGOs near you. Safety comes first with medical aid: check every part works under real weight before you list it.",
    links: [
      { name: "How to donate wheelchairs and mobility aids", href: "/blog/how-to-donate-wheelchairs-india" },
      { name: "How to donate a loved one's belongings", href: "/blog/how-to-donate-loved-ones-belongings-india" },
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

  // CollectionPage JSON-LD from the same title/description as the metadata.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${cat.seoTitle} | CauseKind`,
    description: cat.seoDescription,
    url: `https://www.causekind.com/requests/category/${cat.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd).replace(/</g, "\\u003c") }}
      />
      <CategoryPageClient cat={cat} />
      {CATEGORY_GUIDES[cat.slug] && (
        <SeoLinkSection
          id={`${cat.slug}-guides`}
          heading={CATEGORY_GUIDES[cat.slug]!.heading ?? "Guides"}
          intro={CATEGORY_GUIDES[cat.slug]!.intro}
          links={CATEGORY_GUIDES[cat.slug]!.links}
          card
        />
      )}
    </>
  );
}

