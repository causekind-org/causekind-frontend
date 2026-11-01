"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { PublicNgoActivity } from "@/lib/api";
import { formatActivityDate } from "./PastActivity";
import { ActivityDetailDialog, ActivityLightbox, photosOf } from "@/features/ngo-drives/components/PastWorkSection";

export const PHOTO_ROTATE_MS = 3000;
const SWIPE_PX = 40;

/**
 * Past activity, one per slide like a hero carousel: a large photo area (the activity's own photos
 * rotate every 3 s, paused on hover or focus and under reduced motion), arrows over the image and
 * dots move between activities, then title, date, 3 lines of text and Read more. Keyboard and swipe work.
 */
export function ActivityHeroCarousel({ activities, label, chip, actions, notice }: {
  activities: PublicNgoActivity[];
  label: string;
  /** Beside the title (e.g. "Under review"). */
  chip?: (a: PublicNgoActivity) => ReactNode;
  /** Under the text (the owner's Edit / Delete). */
  actions?: (a: PublicNgoActivity) => ReactNode;
  /** Above the actions (the owner's "Edit not approved" note). */
  notice?: (a: PublicNgoActivity) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [paused, setPaused] = useState(false);
  const [detail, setDetail] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const swipe = useRef<number | null>(null);

  const active = Math.min(index, Math.max(0, activities.length - 1));
  const a = activities[active];
  const photos = a ? photosOf(a) : [];
  const count = activities.length;
  const go = (next: number) => { setIndex((next + count) % count); setPhoto(0); };

  const rotating = !paused && !reduce && !detail && lightbox == null && photos.length > 1;
  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setPhoto((p) => (p + 1) % photos.length), PHOTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, photos.length]);

  if (!a) return null;
  const shown = Math.min(photo, Math.max(0, photos.length - 1));
  const arrow = "absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} data-testid="activity-carousel" tabIndex={0}
      className="min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (count < 2 || detail || lightbox != null) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
      }}>
      <div data-testid="activity-slide" aria-roledescription="slide" aria-label={`${active + 1} of ${count}`}
        className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative aspect-[16/9] w-full bg-stone-100 dark:bg-zinc-800"
          onTouchStart={(e) => { swipe.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => {
            if (swipe.current == null || count < 2) return;
            const delta = (e.changedTouches[0]?.clientX ?? swipe.current) - swipe.current;
            swipe.current = null;
            if (delta < -SWIPE_PX) go(active + 1);
            if (delta > SWIPE_PX) go(active - 1);
          }}>
          {photos.length > 0 ? (
            <button type="button" onClick={() => setLightbox(shown)} aria-label={`View photos of ${a.title}`} className="block h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage links */}
              <img data-testid="activity-slide-photo" src={photos[shown]} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-emerald-700 dark:text-emerald-400"><ImageIcon className="size-8" aria-hidden /></div>
          )}
          {count > 1 && (
            <>
              <button type="button" aria-label="Previous activity" onClick={() => go(active - 1)} className={`${arrow} left-2`}><ChevronLeft className="size-5" aria-hidden /></button>
              <button type="button" aria-label="Next activity" onClick={() => go(active + 1)} className={`${arrow} right-2`}><ChevronRight className="size-5" aria-hidden /></button>
              <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
                {activities.map((x, i) => (
                  <button key={x.id} type="button" aria-label={`Activity ${i + 1}`} aria-current={i === active ? "true" : undefined} onClick={() => go(i)}
                    className="flex h-11 w-7 items-center justify-center">
                    <span className={`h-2 w-2 rounded-full bg-white shadow ${i === active ? "opacity-100" : "opacity-50"}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words font-serif text-lg font-semibold leading-snug text-stone-900 dark:text-stone-100">{a.title}</h3>
            {chip?.(a)}
          </div>
          {a.activityDate && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CalendarDays className="size-3.5" aria-hidden /> Activity date: {formatActivityDate(a.activityDate)}
            </p>
          )}
          {a.description && <p data-testid="past-work-text" className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm text-stone-700 dark:text-stone-300">{a.description}</p>}
          {notice?.(a)}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => setDetail(true)} aria-haspopup="dialog" aria-label={`Read more about ${a.title}`}
              className="min-h-11 text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">Read more</button>
            {actions?.(a)}
          </div>
        </div>
      </div>
      {detail && <ActivityDetailDialog a={a} photos={photos} onClose={() => setDetail(false)} onPhoto={(i) => { setDetail(false); setLightbox(i); }} />}
      {lightbox != null && <ActivityLightbox photos={photos} start={lightbox} title={a.title} onClose={() => setLightbox(null)} />}
    </div>
  );
}
