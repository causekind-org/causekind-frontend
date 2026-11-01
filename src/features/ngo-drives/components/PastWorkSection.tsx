"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PublicNgoActivity } from "@/lib/api";
import { formatActivityDate } from "@/features/ngo-profile/PastActivity";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { ActivityHeroCarousel } from "@/features/ngo-profile/ActivityHeroCarousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Only approved activities with a title; newest first. Activities without a status are treated as approved (public endpoints only send approved ones). */
export function approvedActivities(list?: PublicNgoActivity[] | null): PublicNgoActivity[] {
  return (list ?? [])
    .filter((a) => a && a.title && (!a.status || ["APPROVED", "LIVE"].includes(a.status.toUpperCase())))
    .sort((a, b) => String(b.activityDate ?? "").localeCompare(String(a.activityDate ?? "")));
}

export function photosOf(a: PublicNgoActivity): string[] {
  const media = (a.media ?? []).filter((m) => m?.url && (m.mediaType ?? "IMAGE").toUpperCase() === "IMAGE")
    .map((m) => resolveMediaUrl(m.url)).filter((u): u is string => !!u);
  const cover = resolveMediaUrl(a.coverPhotoUrl);
  return cover ? [cover, ...media.filter((u) => u !== cover)] : media;
}

export function ActivityLightbox({ photos, start, title, onClose }: { photos: string[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % photos.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} photos`} data-testid="past-work-lightbox"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Close photos"
        className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
        <X className="size-5" aria-hidden="true" />
      </button>
      {photos.length > 1 && (
        <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setI((x) => (x - 1 + photos.length) % photos.length); }}
          className="absolute left-2 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage links; the optimizer can't fetch them */}
      <img src={photos[i]} alt={`${title}, photo ${i + 1} of ${photos.length}`} onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-xl object-contain" />
      {photos.length > 1 && (
        <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setI((x) => (x + 1) % photos.length); }}
          className="absolute right-2 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** "Read more": the whole activity in a dialog: photo gallery (opens the lightbox), title, date, full text. */
export function ActivityDetailDialog({ a, photos, onClose, onPhoto }: { a: PublicNgoActivity; photos: string[]; onClose: () => void; onPhoto: (i: number) => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="past-work-detail" className="max-h-[85dvh] max-w-2xl max-sm:left-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
        <div className="shrink-0 border-b border-stone-200 px-5 py-4 pr-12 dark:border-zinc-800">
          <DialogTitle className="break-words font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">{a.title}</DialogTitle>
          {a.activityDate && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CalendarDays className="size-3.5" aria-hidden="true" /> Activity date: {formatActivityDate(a.activityDate)}
            </p>
          )}
        </div>
        <div data-testid="past-work-detail-body" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((src, i) => (
                <button key={src} type="button" onClick={() => onPhoto(i)} aria-label={`Open photo ${i + 1} of ${a.title}`}
                  className="aspect-[4/3] overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage links */}
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {a.description && <p className="whitespace-pre-line break-words text-sm leading-relaxed text-stone-700 dark:text-stone-300">{a.description}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Past work by [NGO]": approved past activities only, newest first. Hidden when empty.
 * `limit` shows the latest N with a "See all" link to the NGO page.
 */
export function PastWorkSection({
  ngoName, activities, limit, seeAllHref, className = "", title, actions,
}: {
  /** The owner's Edit on the NGO's own page. */
  actions?: (a: PublicNgoActivity) => React.ReactNode;
  /** Heading override; with it the section is the page's white card (the NGO page's "Past activity"). */
  title?: string;
  ngoName?: string | null;
  activities?: PublicNgoActivity[] | null;
  limit?: number;
  seeAllHref?: string | null;
  className?: string;
}) {
  const list = approvedActivities(activities);
  if (list.length === 0) return null;
  const shown = limit ? list.slice(0, limit) : list;
  return (
    <section data-testid="past-work-section" aria-labelledby="past-work-heading"
      className={`min-w-0 ${title ? "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6" : ""} ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="past-work-heading" className="break-words font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
          {title ?? `Past work by ${ngoName || "this NGO"}`}
        </h2>
        {seeAllHref && limit && (
          <Link href={seeAllHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">
            See all <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <ActivityHeroCarousel activities={shown} label={title ?? "Past work"} actions={actions} />
    </section>
  );
}
