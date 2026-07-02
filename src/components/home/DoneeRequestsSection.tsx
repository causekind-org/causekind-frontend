"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { DONOR_CATEGORY_EVENT } from "@/components/DonorCategoryModal";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS, readSelectedDonorCategories } from "@/lib/categoryVisuals";
import { ArrowRight } from "lucide-react";
import type { ItemRequest } from "@/lib/api";

function urgencyMarks(urgency: string): string {
  if (urgency === "CRITICAL") return "✱✱✱";
  if (urgency === "HIGH") return "✱✱";
  return "✱";
}

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

  return (
    <section className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 py-20 border-t border-stone-200/60 dark:border-stone-800">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <Reveal className="mb-14">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Field Notes</span>
            <span className="h-px flex-1 bg-[#b04a15]/20" />
          </div>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
                Requests near your focus
              </h2>
              <p className="text-stone-500 dark:text-stone-400 mt-2 max-w-xl">
                {selected && selected.length > 0
                  ? "Scoped to the categories you picked — change them anytime."
                  : "You chose to see everything — narrow this to specific focus areas anytime."}
              </p>
            </div>
            <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#b04a15] dark:text-[#e07b3a] hover:underline shrink-0">
              Browse all requests <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        {/* Narrow reading column — deliberately not the full section width,
            like a magazine's wide masthead over a narrower article column. */}
        <div className="max-w-3xl">
          {categoriesToShow.map((cat, i) => (
            <CategoryEntry
              key={cat}
              category={cat}
              requests={itemRequests.filter(r => r.category === cat)}
              delay={i * 100}
              showDivider={i < categoriesToShow.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryEntry({
  category, requests, delay, showDivider,
}: { category: string; requests: ItemRequest[]; delay: number; showDivider: boolean }) {
  const col    = CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS["Medical aid"];
  const top    = requests[0];
  const others = requests.slice(1);

  return (
    <Reveal delay={delay}>
      <div className="py-7 first:pt-0">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className={`text-sm italic font-semibold ${col.text}`} style={{ fontFamily: "var(--font-lora)" }}>
            <TranslatedText text={category} />
          </h3>
          {top && (
            <span className="text-xs text-stone-400 flex items-center gap-1.5">
              <span className="text-[#b04a15] tracking-tight">{urgencyMarks(top.urgency)}</span>
              {requests.length} {requests.length === 1 ? "request" : "requests"}
            </span>
          )}
        </div>

        {top ? (
          <Link href="/requests" className="group flex items-start gap-5 sm:gap-6">
            <p
              className="flex-1 text-xl sm:text-2xl leading-snug text-stone-800 dark:text-stone-100 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors duration-300"
              style={{ fontFamily: "var(--font-lora)" }}
            >
              &ldquo;<TranslatedText text={top.title} />&rdquo;
              <span className="block text-[11px] not-italic font-sans font-bold text-stone-400 mt-2.5 tracking-wide uppercase">
                — <TranslatedText text={top.city} />
              </span>
              {others.length > 0 && (
                <span className="block text-sm not-italic font-normal text-stone-500 dark:text-stone-400 mt-2.5 leading-relaxed">
                  Also noted:{" "}
                  {others.slice(0, 2).map((r, i) => (
                    <span key={r.id}>
                      {i > 0 && ", "}
                      <TranslatedText text={r.title} />
                    </span>
                  ))}
                  {others.length > 2 && ` — and ${others.length - 2} more`}
                </span>
              )}
            </p>

            <motion.div
              className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 overflow-hidden mt-1"
              initial={{ filter: "grayscale(1) brightness(0.85)" }}
              whileInView={{ filter: "grayscale(0) brightness(1)" }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
            >
              <Image
                src={top.imageUrl ?? col.fallbackImage}
                alt={top.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="96px"
              />
            </motion.div>
          </Link>
        ) : (
          <EmptyEntry category={category} />
        )}

        {showDivider && <SquiggleDivider className={col.text} />}
      </div>
    </Reveal>
  );
}

function EmptyEntry({ category }: { category: string }) {
  return (
    <p className="text-lg italic text-stone-400 dark:text-stone-500" style={{ fontFamily: "var(--font-lora)" }}>
      Nothing logged here yet
      <BlinkingCursor />
      <span className="block text-[11px] not-italic font-sans font-bold text-stone-400 mt-2.5 tracking-wide uppercase">
        You&apos;ll be the first to know about <TranslatedText text={category} />
      </span>
    </p>
  );
}

function BlinkingCursor() {
  return (
    <motion.span
      aria-hidden="true"
      className="inline-block w-[2px] h-[1em] bg-stone-400 dark:bg-stone-500 ml-1 align-middle translate-y-[1px]"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
    />
  );
}

// A hand-drawn-feeling wavy rule between entries, instead of a straight <hr>.
function SquiggleDivider({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 600 12" preserveAspectRatio="none" className={`w-full h-3 mt-7 opacity-[0.18] ${className}`} aria-hidden="true">
      <path
        d="M0,6 Q15,0 30,6 T60,6 T90,6 T120,6 T150,6 T180,6 T210,6 T240,6 T270,6 T300,6 T330,6 T360,6 T390,6 T420,6 T450,6 T480,6 T510,6 T540,6 T570,6 T600,6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
