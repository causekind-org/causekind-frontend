import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicItemRequests } from "@/lib/api";
import RequestsClient from "./RequestsClient";
import Link from "next/link";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  setRequestLocale((await params).locale);
  const mt = await getTranslations("requestsArea");
  return {
    title: mt("metaListTitle"),
    description: mt("metaListDescription"),
    alternates: { canonical: "/requests" },
  };
}

// Matches the homepage. The public board is @Cacheable on the backend and its
// projection carries no per-visitor data, so a shared 60s cache is safe here.
export const revalidate = 60;

/**
 * Fetch the public board on the server so a logged-out visitor gets needs in the
 * HTML.
 *
 * <p>This route used to render nothing but {@code <RequestsClient />}, which
 * meant the board's data request could not even be sent until React had
 * hydrated the whole 1200-line client module. Measured on a production build at
 * 390px, DOM-ready landed at 2.6s and the fetch left at 5.5s — most of the wait
 * a visitor arriving from the hero's "Explore needs near you" actually
 * experiences, and none of it spent on the data.
 *
 * <p>The fetch is unauthenticated by necessity, not by choice: there is no
 * session cookie on a server render, so the authenticated board would 401 here.
 * That is the same reason the homepage uses this endpoint — see the note in
 * src/app/page.tsx.
 *
 * <p>The whole open board is fetched (the same cached list the paged public
 * endpoint is cut from): guests browse it in the same directory donors use,
 * which searches, filters, sorts and pages on the client.
 *
 * <p>Failure is not fatal. A null seed puts the client back on exactly the
 * path it had before: mount, fetch, render. A dead backend must not blank a page
 * that also serves signed-in donors and donees.
 */
export default async function Page({ params }: LocaleParams) {
  setRequestLocale((await params).locale);
  const initialPublicRequests = await getPublicItemRequests().catch((error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[requests] getPublicItemRequests failed; the client will retry:", error);
    }
    return null;
  });

  const tc = await getTranslations("categoryStrip.categories");
  return (
    <>
      <RequestsClient initialPublicRequests={initialPublicRequests} />
      {/* Server-rendered, so it is in the first HTML: the client board above
          renders only in the browser (it waits for the signed-in state). The
          hero's own H1 stays the page heading, so this uses an H2. */}
      <section aria-labelledby="requests-by-category" className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-10">
        <h2 id="requests-by-category" className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          Browse requests by category
        </h2>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-600 dark:text-stone-400">
          Real people nearby need specific items, not cash. Pick a category to see what is needed and offer an item directly.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {IN_KIND_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/requests/category/${c.slug}`}
                className="inline-flex min-h-10 items-center rounded-full border border-stone-300 dark:border-stone-700 px-4 text-sm font-semibold text-stone-700 dark:text-stone-200 hover:border-[#b04a15] hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors"
              >
                {tc(categoryKey(c.slug))}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** URL slug → key under categoryStrip.categories (medical-aid → medicalAid). */
function categoryKey(slug: string) {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
