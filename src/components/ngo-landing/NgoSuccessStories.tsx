"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { NgoSuccessStory } from "@/lib/api";
import { NgoSectionHeader } from "./NgoSharedComponents";

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
          <ul data-testid={carousel ? "ngo-success-carousel" : undefined}
            className={carousel
              ? "-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]"
              : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"}>
            {list.map((s) => {
              const facts = [
                s.peopleReached ? `${s.peopleReached.toLocaleString("en-IN")} people reached` : null,
                s.quantityDistributed ? `${s.quantityDistributed.toLocaleString("en-IN")} ${unitText(s.unit)} distributed` : null,
              ].filter(Boolean) as string[];
              const where = [s.location?.trim() || null, formatDate(s.distributedOn)].filter(Boolean) as string[];
              return (
                <li key={s.id} className={carousel ? "w-[85%] shrink-0 snap-start sm:w-[calc((100%-3rem)/3)]" : ""}>
                  <Link href={`/drives/${s.id}/proof`} data-testid="ngo-success-story" aria-label={`Open the distribution proof for ${s.title}`}
                    className="ngo-card ngo-card-interactive group !p-0 flex h-full min-w-0 flex-col overflow-hidden">
                    <div className="relative h-56 w-full overflow-hidden bg-stone-100 dark:bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                      <img src={s.photoUrls[0]} alt={`Distribution proof for ${s.title}`} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute left-4 top-4 z-10">
                        <span className="ngo-card-tag !bg-white/90 dark:!bg-[#0F2A20]/90 !backdrop-blur-sm">Proof approved</span>
                      </div>
                      {s.photoUrls.length > 1 && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white">{s.photoUrls.length} photos</span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-6">
                      <h3 className="ngo-heading ck-user-text mb-2 text-xl leading-snug text-[#0B3D2E] dark:text-[#EFEADB]">{s.title}</h3>
                      {facts.length > 0 && <p className="mb-1 text-xs font-semibold text-[#2F8F5B]">{facts.join(" · ")}</p>}
                      {where.length > 0 && <p className="ck-user-text mb-2 text-xs text-stone-500 dark:text-stone-400">{where.join(" · ")}</p>}
                      {s.note?.trim() && <p className="ck-user-text line-clamp-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{s.note.trim()}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
