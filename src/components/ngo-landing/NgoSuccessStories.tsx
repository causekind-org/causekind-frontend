"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { NgoSuccessStory } from "@/lib/api";
import { NgoSectionHeader } from "./NgoSharedComponents";
import { useFocusFrame, useAutoAdvance, useIsDesktop } from "./NgoMotion";
import { useReducedMotion } from "framer-motion";

const LIMIT = 6;

/** A distribution date (a calendar day) as shown in India. */
function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

const unitText = (unit?: string | null) => (unit ?? "").toLowerCase().replace(/_/g, " ").trim() || "items";

/**
 * Approved landing: the NGO's own drives whose distribution proof an admin approved (from
 * /ngo/overview), newest first, at most 6 (a swipeable row when more than 3). Never sample
 * stories: with none, the section stays with a calm "All caught up" card.
 */
export function NgoSuccessStories({ stories }: { stories?: NgoSuccessStory[] | null }) {
  const list = (stories ?? []).filter((s) => s.photoUrls?.length).slice(0, LIMIT);
  const carousel = list.length > 3;
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const swipe = !desktop && list.length > 1;
  const { rowRef, active } = useFocusFrame<HTMLUListElement>(swipe);
  const auto = useAutoAdvance(rowRef, active, swipe && !reduce);
  return (
    <section className="ngo-section ngo-band-cream" data-testid="ngo-success-stories" aria-labelledby="ngo-success-stories-heading">
      <div className="ngo-container">
        <NgoSectionHeader eyebrow="Success stories" h2="Stories of help, delivered." />
        {list.length === 0 ? (
          <div className="ngo-card" data-testid="ngo-success-stories-empty">
            <div className="flex w-full flex-col items-center gap-3 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2F8F5B]/15 text-[#2F8F5B]"><CheckCircle2 className="h-6 w-6" aria-hidden /></span>
              <h3 className="ngo-heading text-xl text-stone-900 dark:text-stone-100">All caught up: no stories of help delivered yet</h3>
              <p className="max-w-md text-sm text-stone-600 dark:text-stone-300">Stories appear here once your drive proof is approved.</p>
            </div>
          </div>
        ) : (
          <div {...auto}>
          <ul ref={rowRef} data-testid={carousel ? "ngo-success-carousel" : undefined}
            className="ngo-stories-row max-md:-mx-5 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:gap-4 max-md:pb-2 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {list.map((s, idx) => {
              const facts = [
                s.peopleReached ? `${s.peopleReached.toLocaleString("en-IN")} people reached` : null,
                s.quantityDistributed ? `${s.quantityDistributed.toLocaleString("en-IN")} ${unitText(s.unit)} distributed` : null,
              ].filter(Boolean) as string[];
              const where = [s.location?.trim() || null, formatDate(s.distributedOn)].filter(Boolean) as string[];
              return (
                <li key={s.id} data-active={swipe ? String(idx === active) : undefined}
                  className="ngo-stories-item max-md:w-[86%] max-md:shrink-0 max-md:snap-center min-w-0">
                  <Link href={`/drives/${s.id}/proof?from=home`} data-testid="ngo-success-story" aria-label={`Open the distribution proof for ${s.title}`}
                    className="group relative block aspect-[16/10] w-full overflow-hidden rounded-[24px] bg-stone-200 shadow-[0_18px_40px_-22px_rgba(11,61,46,0.45)] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--ngo-accent)] dark:bg-white/5 md:rounded-[28px]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                    <img src={s.photoUrls[0]} alt={`Distribution proof for ${s.title}`} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <span className="rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">Proof approved</span>
                      {s.photoUrls.length > 1 && (
                        <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">{s.photoUrls.length} photos</span>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
                      <h3 className="ngo-heading ck-user-text text-xl leading-snug md:text-2xl">{s.title}</h3>
                      {facts.length > 0 && <p className="mt-1 text-[13px] font-semibold text-[var(--ngo-gold-light)]">{facts.join(" · ")}</p>}
                      {where.length > 0 && <p className="ck-user-text mt-0.5 text-[12px] text-white/75">{where.join(" · ")}</p>}
                      {s.note?.trim() && <p className="ck-user-text mt-1.5 line-clamp-1 text-[13px] text-white/80 max-md:hidden">{s.note.trim()}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          </div>
        )}
      </div>
    </section>
  );
}
