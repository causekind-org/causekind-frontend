"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { DONOR_CATEGORY_EVENT } from "@/components/DonorCategoryModal";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS, readSelectedDonorCategories } from "@/lib/categoryVisuals";
import { Bell } from "lucide-react";
import type { ItemRequest } from "@/lib/api";
// @ts-expect-error — MagicBento is the JS/CSS React Bits variant (no types shipped)
import MagicBento from "@/components/MagicBento";

/* ── Watching for you — the quiet categories a donee follows, each collapsed
   into one glowing card instead of an empty section. ── */

export function DoneeRequestsSection({ itemRequests }: { itemRequests: ItemRequest[] }) {
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSelected(readSelectedDonorCategories());
    setMounted(true);
    function onChange(e: Event) {
      // The modal always dispatches an array (possibly empty = "all"), never null —
      // this event only fires after an explicit apply(), so there's no ambiguity here.
      setSelected((e as CustomEvent<string[]>).detail ?? []);
    }
    window.addEventListener(DONOR_CATEGORY_EVENT, onChange);
    return () => window.removeEventListener(DONOR_CATEGORY_EVENT, onChange);
  }, []);

  // Avoid an SSR/client mismatch — localStorage only exists client-side
  if (!mounted) return null;

  // Never chosen anything → nothing to personalize, hide the section.
  // Explicitly chose "all" (empty array from an actual apply()) → show every category.
  // Chose specific categories → show only those.
  const categoriesToShow = selected === null
    ? []
    : selected.length > 0
      ? selected.filter(c => ALL_REQUEST_CATEGORIES.includes(c))
      : ALL_REQUEST_CATEGORIES;
  if (categoriesToShow.length === 0) return null;

  // Open-request count per followed category — shown as a badge on its card.
  const countByCategory = new Map<string, number>();
  for (const r of itemRequests) {
    if (!categoriesToShow.includes(r.category)) continue;
    countByCategory.set(r.category, (countByCategory.get(r.category) ?? 0) + 1);
  }

  return (
    <section className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 py-20 border-t border-stone-200/60 dark:border-stone-800 overflow-hidden">
      {/* Warm ambient glow behind the board */}
      <div className="pointer-events-none absolute -top-32 right-[10%] w-[480px] h-[480px] rounded-full bg-[#e07b3a]/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[5%] w-72 h-72 rounded-full bg-[#f0b97a]/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-10">
        <Reveal>
          <div className="flex items-center gap-2.5">
            <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#f0b97a]/20">
              <Bell className="h-3 w-3 text-[#b04a15] dark:text-[#e07b3a]" />
            </span>
            <p className="text-3xs font-black uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">Watching for you</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <MagicBento
              glowColor="176, 74, 21"
              enableTilt
              enableStars
              enableSpotlight
              enableBorderGlow
              enableMagnetism
              clickEffect
              cards={categoriesToShow.map((cat) => {
                const count = countByCategory.get(cat) ?? 0;
                return {
                  color: "#ffffff",
                  label: "Watching",
                  badge: count > 0 ? `${count} open` : undefined,
                  title: cat,
                  description: CATEGORY_VISUALS[cat]?.blurb ?? "",
                };
              })}
            />
          </motion.div>

          <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
            The moment a verified need is posted in a quiet category, you&apos;ll be first to know.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
