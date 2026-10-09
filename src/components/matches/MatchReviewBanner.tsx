"use client";

import { Loader2 } from "lucide-react";
import { PhotoThumbs } from "@/components/PhotoThumbs";

const TONE = {
  donor: {
    band: "bg-[#fbf1e8] border-[#f0dcc8] dark:bg-[var(--ck-role-accent)]/10 dark:border-[var(--ck-role-accent)]/30",
    badge: "border-[#f0c9a6] text-[#8a300a] dark:text-orange-300",
    accept: "bg-[var(--ck-role-accent)]",
    decline: "border-[#e8c9b0]",
  },
  donee: {
    band: "bg-[#eef2f8] border-[#d5deeb] dark:bg-blue-400/10 dark:border-blue-400/30",
    badge: "border-[#b9c7dc] text-[#1e3a60] dark:text-blue-300",
    accept: "bg-[#1e3a60] dark:bg-blue-500",
    decline: "border-[#c9d3e2]",
  },
} as const;

export type BannerFact = { label: string; value: string };

/**
 * The match banner across the top of a dashboard card, laid out as in the
 * design canvas (Match · A): badge + time, a bold title, label/value chips, the
 * privacy note, and the two actions stacked on the right. Shared by the donor
 * and donee cards so they read the same (owner, 2026-10-09). Square corners.
 */
export function MatchReviewBanner({ tone, photos, title, time, facts, details, note, acceptLabel, declineLabel, busy, onAccept, onDecline }: {
  tone: keyof typeof TONE;
  photos: string[];
  title: React.ReactNode;
  time: string;
  facts: BannerFact[];
  details: (string | null | false | undefined)[];
  note: string;
  acceptLabel: string;
  declineLabel: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = TONE[tone];
  const detailLine = details.filter(Boolean).join(" · ");
  return (
    <div className={`flex flex-col gap-3 border-b px-4 py-2.5 sm:flex-row sm:items-center ${t.band}`}>
      <div className="flex min-w-0 flex-1 gap-3">
        <PhotoThumbs photos={photos} alt={typeof title === "string" ? title : "Matched item"} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border bg-white px-2 py-0.5 text-3xs font-bold dark:bg-zinc-900 ${t.badge}`}>Waiting for you</span>
            <span className="text-2xs text-stone-500 dark:text-stone-400">{time}</span>
          </div>
          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</p>
          <div className="flex flex-wrap gap-1.5">
            {facts.map(f => (
              <span key={f.label} className="bg-white px-2 py-0.5 text-2xs dark:bg-zinc-900">
                <span className="text-stone-500">{f.label}</span>{" "}
                <b className="text-stone-900 dark:text-stone-100">{f.value}</b>
              </span>
            ))}
          </div>
          <p className="text-3xs text-stone-500">{[detailLine, note].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onAccept}
          className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 text-xs font-bold text-white disabled:opacity-60 ${t.accept}`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {acceptLabel}
        </button>
        <button type="button" disabled={busy} onClick={onDecline}
          className={`min-h-[44px] border bg-white px-4 text-xs font-semibold text-stone-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200 ${t.decline}`}>
          {declineLabel}
        </button>
      </div>
    </div>
  );
}
