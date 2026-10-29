"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import type { PublicNgoActivity } from "@/lib/api";
import { formatActivityDate } from "@/features/ngo-profile/PastActivity";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/** Only approved activities with a title; newest first. Activities without a status are treated as approved (public endpoints only send approved ones). */
export function approvedActivities(list?: PublicNgoActivity[] | null): PublicNgoActivity[] {
  return (list ?? [])
    .filter((a) => a && a.title && (!a.status || ["APPROVED", "LIVE"].includes(a.status.toUpperCase())))
    .sort((a, b) => String(b.activityDate ?? "").localeCompare(String(a.activityDate ?? "")));
}

function photosOf(a: PublicNgoActivity): string[] {
  const media = (a.media ?? []).filter((m) => m?.url && (m.mediaType ?? "IMAGE").toUpperCase() === "IMAGE")
    .map((m) => resolveMediaUrl(m.url)).filter((u): u is string => !!u);
  const cover = resolveMediaUrl(a.coverPhotoUrl);
  return cover ? [cover, ...media.filter((u) => u !== cover)] : media;
}

function Lightbox({ photos, start, title, onClose }: { photos: string[]; start: number; title: string; onClose: () => void }) {
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

/** Text longer than this (or with several paragraphs) is clamped to 4 lines with "Read more". */
const CLAMP_CHARS = 220;

/**
 * One past activity: gallery (1 large + up to 2 small, "+N" for more; click opens the lightbox),
 * the title, "Activity date: …" (IST) and the text clamped to 4 lines ("Read more" opens it in place).
 * Equal height in the grid. The same card on the NGO page and the drive page.
 */
function ActivityCard({ a }: { a: PublicNgoActivity }) {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const photos = photosOf(a);
  const video = (a.media ?? []).find((m) => m?.url && (m.mediaType ?? "").toUpperCase() === "VIDEO")?.url ?? null;
  const text = a.description ?? "";
  const long = text.length > CLAMP_CHARS || text.split("\n").length > 4;
  const small = photos.slice(1, 3);
  const more = photos.length - 3;
  return (
    <li data-testid="past-work-item" className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {photos.length > 0 ? (
        <div className="grid gap-1">
          <button type="button" onClick={() => setLightbox(0)} aria-label={`View photos of ${a.title}`}
            className="relative block aspect-[16/10] w-full overflow-hidden bg-stone-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage links */}
            <img src={photos[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
          {small.length > 0 && (
            <div className="grid grid-cols-2 gap-1">
              {small.map((src, i) => (
                <button key={src} type="button" onClick={() => setLightbox(i + 1)} aria-label={`View photo ${i + 2} of ${a.title}`}
                  className="relative block aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage links */}
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {i === small.length - 1 && more > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">+{more}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : video ? (
        <video src={video} controls preload="metadata" className="aspect-[16/10] w-full bg-black object-contain" aria-label={a.title} />
      ) : (
        <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-stone-100 text-emerald-700 dark:from-zinc-900 dark:to-zinc-950 dark:text-emerald-400">
          <ImageIcon className="size-7" aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="break-words font-serif text-lg font-semibold leading-snug text-stone-900 dark:text-stone-100">{a.title}</h3>
        {a.activityDate && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CalendarDays className="size-3.5" aria-hidden="true" /> Activity date: {formatActivityDate(a.activityDate)}
          </p>
        )}
        {text && (
          <p data-testid="past-work-text" className={`mt-2 whitespace-pre-line break-words text-sm text-stone-700 dark:text-stone-300 ${open ? "" : "line-clamp-4"}`}>{text}</p>
        )}
        {long && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="mt-auto self-start pt-1 min-h-11 text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">
            {open ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      {lightbox != null && <Lightbox photos={photos} start={lightbox} title={a.title} onClose={() => setLightbox(null)} />}
    </li>
  );
}

/**
 * "Past work by [NGO]": approved past activities only, newest first. Hidden when empty.
 * `limit` shows the latest N with a "See all" link to the NGO page.
 */
export function PastWorkSection({
  ngoName, activities, limit, seeAllHref, className = "",
}: {
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
    <section data-testid="past-work-section" aria-labelledby="past-work-heading" className={`min-w-0 ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="past-work-heading" className="break-words font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
          Past work by {ngoName || "this NGO"}
        </h2>
        {seeAllHref && limit && (
          <Link href={seeAllHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">
            See all <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {/* The full main-column width: 2 equal-height columns on desktop, 1 on mobile. */}
      <ul className="grid auto-rows-fr gap-4 md:grid-cols-2">
        {shown.map((a) => <ActivityCard key={a.id} a={a} />)}
      </ul>
    </section>
  );
}
