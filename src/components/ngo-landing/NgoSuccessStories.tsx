"use client";

import type { NgoSuccessStory } from "@/lib/api";
import { NgoSectionHeader } from "./NgoSharedComponents";

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Approved landing: the NGO's own drives whose distribution proof an admin approved (from /ngo/overview). Hidden when none. */
export function NgoSuccessStories({ stories }: { stories?: NgoSuccessStory[] | null }) {
  const list = (stories ?? []).filter((s) => s.photoUrls?.length);
  if (list.length === 0) return null;
  return (
    <section className="ngo-section ngo-band-cream" data-testid="ngo-success-stories">
      <div className="ngo-container">
        <NgoSectionHeader eyebrow="Success stories" h2="Stories of help, delivered." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const facts = [
              s.peopleReached ? `${s.peopleReached.toLocaleString("en-IN")} people reached` : null,
              s.quantityDistributed ? `${s.quantityDistributed.toLocaleString("en-IN")} items distributed` : null,
              formatDate(s.distributedOn),
              s.location?.trim() || null,
            ].filter(Boolean) as string[];
            return (
              <article key={s.id} data-testid="ngo-success-story" className="ngo-card ngo-card-interactive group !p-0 flex flex-col overflow-hidden">
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
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="ngo-heading mb-2 text-xl leading-snug text-[#0B3D2E] dark:text-[#EFEADB]">{s.title}</h3>
                  {facts.length > 0 && <p className="mb-2 text-xs font-semibold text-[#2F8F5B]">{facts.join(" · ")}</p>}
                  {s.note?.trim() && <p className="line-clamp-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{s.note.trim()}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
