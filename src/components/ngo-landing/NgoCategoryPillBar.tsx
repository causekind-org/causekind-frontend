"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { toast } from "@/lib/toast";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { useNgoStatus } from "./useNgoStatus";

const DISPLAY_ORDER = [
  "Medical aid",
  "Education",
  "Livelihood",
  "Clothing",
  "Household",
  "Relief",
  "Electronics",
  "Furniture",
  "Sports",
] as const;

const ORDER_INDEX = new Map<string, number>(
  DISPLAY_ORDER.map((name, index) => [name, index]),
);

const DISPLAY_CATEGORIES = [...IN_KIND_CATEGORIES].sort((a, b) => {
  const aIndex = ORDER_INDEX.get(a.name) ?? DISPLAY_ORDER.length;
  const bIndex = ORDER_INDEX.get(b.name) ?? DISPLAY_ORDER.length;
  return aIndex - bIndex;
});

export function NgoCategoryPillBar() {
  const router = useRouter();
  const { isVerified, isPhotosDue, photosDueRequestName } = useNgoStatus();

  const handleCategoryClick = (e: React.MouseEvent, catName: string) => {
    if (isVerified && isPhotosDue) {
      e.preventDefault();
      toast.warning(
        `Upload handover photos for ${photosDueRequestName} to post your next request.`,
        {
          action: {
            label: "Upload",
            onClick: () => router.push("/dashboard/ngo"),
          },
        }
      );
    }
  };

  return (
    <div className="relative w-full">
      {/* Outer rounded pill container spanning content width */}
      <nav
        aria-label="NGO In-Kind Request Categories"
        className="relative mx-auto max-w-7xl rounded-full bg-white dark:bg-zinc-900 border border-ngo-100 dark:border-zinc-800 shadow-[0_10px_30px_-8px_rgba(18,61,46,0.08)] dark:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-md"
      >
        {/* Horizontal scroll container on mobile, full grid on desktop */}
        <div className="relative min-w-0 w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex items-center justify-between w-max min-w-full lg:w-full lg:grid lg:grid-cols-9 divide-x divide-ngo-100 dark:divide-zinc-800">
            {DISPLAY_CATEGORIES.map((cat) => {
              const visual = CATEGORY_VISUALS[cat.name];
              const targetHref = isVerified
                ? `/ngo/requests/new?category=${encodeURIComponent(cat.name)}`
                : `/requests/category/${cat.slug}`;

              return (
                <li
                  key={cat.slug}
                  className="px-2 sm:px-3 lg:px-1 flex-1 flex justify-center shrink-0 snap-start"
                >
                  <Link
                    href={targetHref}
                    onClick={(e) => handleCategoryClick(e, cat.name)}
                    aria-label={`Category ${cat.name}`}
                    className="group relative flex min-h-[44px] sm:min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 active:scale-95"
                  >
                    {/* Icon on top — lifts 2px on hover */}
                    <span className="flex size-6 sm:size-7 items-center justify-center text-ngo-700 dark:text-ngo-300 transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                      {visual ? (
                        <visual.Icon className="size-4 sm:size-5" aria-hidden="true" />
                      ) : (
                        <Layers className="size-4 sm:size-5" aria-hidden="true" />
                      )}
                    </span>

                    {/* UPPERCASE label below */}
                    <span className="max-w-full text-[0.58rem] sm:text-[0.64rem] lg:text-[0.68rem] font-bold uppercase leading-tight tracking-[0.05em] text-ngo-950 dark:text-stone-200 group-hover:text-ngo-700 dark:group-hover:text-ngo-300 transition-colors">
                      {cat.name}
                    </span>

                    {/* Small ngo-300 underline indicator on hover */}
                    <span
                      aria-hidden="true"
                      className="h-0.5 w-4 rounded-full bg-ngo-400 dark:bg-ngo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Soft edge fade on mobile to indicate scrollability */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1 bottom-1 w-8 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/80 rounded-r-full lg:hidden"
        />
      </nav>
    </div>
  );
}

export default NgoCategoryPillBar;
