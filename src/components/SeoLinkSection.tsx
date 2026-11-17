import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

type LinkItem = { name: string; href: string };

/** URL slug → key under categoryStrip.categories (medical-aid → medicalAid). */
function categoryKey(slug: string) {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * A slim, server-rendered "intro + links" block placed at the bottom of a page
 * (above the footer), so it is in the first HTML without touching the hero.
 * Pass `links`, or `withCategories` to list the nine category pages first.
 */
export async function SeoLinkSection({
  id,
  heading,
  intro,
  links = [],
  withCategories = false,
}: {
  id: string;
  heading: string;
  intro: string;
  links?: LinkItem[];
  withCategories?: boolean;
}) {
  const tc = withCategories ? await getTranslations("categoryStrip.categories") : null;
  const all: LinkItem[] = [
    ...(tc ? IN_KIND_CATEGORIES.map((c) => ({ name: tc(categoryKey(c.slug)), href: `/requests/category/${c.slug}` })) : []),
    ...links,
  ];
  return (
    <section aria-labelledby={id} className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10">
      <h2 id={id} className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
        {heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-600 dark:text-stone-400">{intro}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {all.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-10 items-center rounded-full border border-stone-300 dark:border-stone-700 px-4 text-sm font-semibold text-stone-700 dark:text-stone-200 hover:border-[#b04a15] hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors"
            >
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
