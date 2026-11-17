import Link from "next/link";

export type Crumb = { name: string; href: string };

const SITE = "https://www.causekind.com";

/**
 * Visible breadcrumb trail plus the matching BreadcrumbList JSON-LD, from one
 * list so the two can never disagree. Server component: both are in the
 * first HTML. The last crumb is the current page (shown as text, not a link).
 * Pages keep their own back links; this sits above them as a slim row.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.href === "/" ? "" : c.href}`,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-7xl px-4 sm:px-6 pt-3 pb-1 text-xs text-stone-500 dark:text-stone-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1.5 min-w-0">
                {last ? (
                  <span aria-current="page" className="truncate max-w-[60vw] text-stone-700 dark:text-stone-300">{c.name}</span>
                ) : (
                  <Link href={c.href} className="hover:text-[#b04a15] dark:hover:text-[#e07b3a] hover:underline underline-offset-2">{c.name}</Link>
                )}
                {!last && <span aria-hidden="true">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
