"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal carousel for past-activity cards: 2 visible on desktop, 1 on mobile; swipe and
 * scroll-snap; < and > buttons (disabled at the ends); Left/Right arrow keys when focused.
 */
export function ActivityCarousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);

  function go(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const left = el.scrollLeft + dir * el.clientWidth;
    if (typeof el.scrollTo === "function") el.scrollTo({ left, behavior: "smooth" });
    else el.scrollLeft = left;
    measure();
  }

  const arrow = "inline-flex size-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200";
  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} data-testid="activity-carousel" className="min-w-0"
      onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}>
      <ul ref={track} tabIndex={0} onScroll={measure}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 [&::-webkit-scrollbar]:hidden">
        {items.map((child, i) => (
          <li key={i} aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`}
            className="min-w-0 shrink-0 basis-full snap-start md:basis-[calc(50%-0.5rem)]">
            {child}
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className={arrow} onClick={() => go(-1)} disabled={atStart} aria-label="Previous activities">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" className={arrow} onClick={() => go(1)} disabled={atEnd} aria-label="Next activities">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
