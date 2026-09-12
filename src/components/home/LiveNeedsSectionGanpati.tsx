"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { NewRequestLink } from "@/components/NewRequestLink";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { loginUrlFor } from "@/lib/safeRedirect";
import type { PlatformStats, PublicItemRequest } from "@/lib/api";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { useAuth } from "@/hooks/useAuth";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";
import { ModakIcon, GanpatiToran, FloatingFestiveBadge } from "@/components/home/GanpatiVisuals";

const NEEDS_SHOWN = 6;

const MOBILE_CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education:  ["/images/hero-7.webp"],
  Livelihood: ["/images/hero-3.webp"],
  Community:  ["/images/hero-6.webp"],
};

function getCardImage(category: string, id: number): string {
  const imgs = MOBILE_CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.webp";
}

/**
 * LiveNeedsSectionGanpati — Festive Ganpati skin for the "Real people, real needs" section.
 * Retains exact same props signature and functional card logic,
 * layered with warm festive accents (toran motif, marigold/saffron badges, modak accents).
 */
export function LiveNeedsSectionGanpati({
  initialRequests = [],
}: {
  initialRequests?: PublicItemRequest[];
  stats?: PlatformStats | null;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const reduceMotion = useReducedMotion();

  const { user, isLoading: authLoading } = useAuth();
  const role = (user?.role ?? "").toUpperCase().replace(/^ROLE_/, "");
  const emptyStateCta = authLoading
    ? null
    : user === null
      ? { href: loginUrlFor("/requests/new"), label: "Post a need" }
      : role === "DONEE"
        ? { href: "/requests/new", label: "Post a need" }
        : null;

  const allNeeds = initialRequests ?? [];

  const filteredNeeds = useMemo(
    () =>
      selectedCategory === "All"
        ? allNeeds
        : allNeeds.filter((n) => n.category === selectedCategory),
    [allNeeds, selectedCategory],
  );
  const displayedNeeds = filteredNeeds.slice(0, NEEDS_SHOWN);
  const hiddenCount = filteredNeeds.length - displayedNeeds.length;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const need of allNeeds) {
      counts.set(need.category, (counts.get(need.category) ?? 0) + 1);
    }
    return counts;
  }, [allNeeds]);

  return (
    <section
      ref={sectionRef}
      aria-label="Verified community needs — Ganeshotsav"
      // One gutter and one ground below lg, matching LiveNeedsSection.
      //
      // This carried px-4 and its own full background at every width. In the
      // mobile tree it is a child of a column that already pads px-5, so the
      // board sat on a 36px gutter while every other section on that column sat
      // on 20px, and its gradient read as a panel inset from both edges rather
      // than as the page. Below lg it now drops both and inherits the column.
      // The desktop tree is hidden below lg, so nothing there changes.
      className="relative isolate overflow-hidden px-0 pt-10 pb-2 sm:pt-12 lg:bg-gradient-to-b lg:from-[#fffcf7] lg:via-[#fff8ed] lg:to-[#fffcf7] lg:px-8 lg:py-24 lg:dark:from-[#140803] lg:dark:via-[#1c0c05] lg:dark:to-[#140803]"
    >
      {/* Festive toran border at the top of the section */}
      <div className="absolute top-0 inset-x-0 z-10 pointer-events-none select-none overflow-visible">
        <GanpatiToran />
      </div>

      <div className="mx-auto max-w-7xl pt-4">
        {/* Section Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
              <ModakIcon className="size-4 text-amber-600" />
              <span>Ganeshotsav Giving</span>
              <ModakIcon className="size-3.5 text-amber-600" />
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl font-serif">
              <span className="text-stone-900 dark:text-white">Real people. Real needs.</span>
              <br />
              <span className="text-[#ea580c] dark:text-[#f59e0b]">This Ganeshotsav.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-stone-600 sm:text-base dark:text-stone-300">
              Every request here is posted by a verified individual or community school in India.
              This festive season, offer the exact item they&apos;re waiting for — no cash, no guesswork, no middlemen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FloatingFestiveBadge
              icon={<span className="text-sm">🪔</span>}
              text="11 Days of Giving"
              delay={0.7}
            />
            {emptyStateCta && (
              <NewRequestLink
                href={emptyStateCta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="size-3.5" />
                {emptyStateCta.label}
              </NewRequestLink>
            )}
            <Link
              href="/requests"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-900 shadow-xs transition-all hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              Browse all needs <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-all ${
              selectedCategory === "All"
                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20"
                : "bg-white/80 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            }`}
          >
            All Categories ({allNeeds.length})
          </button>
          {ALL_REQUEST_CATEGORIES.map((cat) => {
            const count = categoryCounts.get(cat) ?? 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20"
                    : "bg-white/80 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-3xs font-black ${isSelected ? "text-amber-200" : "text-stone-400"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayedNeeds.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-amber-300/60 bg-amber-50/30 p-12 text-center dark:border-amber-800/40 dark:bg-amber-950/20">
              <ModakIcon className="mx-auto size-10 text-amber-500" />
              <h3 className="mt-3 text-lg font-bold text-stone-900 dark:text-stone-100">
                No active requests in this category right now
              </h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Check back soon or explore other urgent requests near you.
              </p>
              <Link
                href="/requests"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-orange-700"
              >
                Browse All Requests
              </Link>
            </div>
          ) : (
            displayedNeeds.map((need, index) => {
              const visual = CATEGORY_VISUALS[need.category];
              const isUrgent = need.urgency === "CRITICAL" || need.urgency === "HIGH";

              return (
                <motion.div
                  key={need.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : false}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-white/95 border border-amber-200/70 shadow-[0_4px_20px_rgba(217,119,6,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-[0_12px_30px_rgba(217,119,6,0.18)] dark:bg-stone-900/90 dark:border-amber-900/40 dark:hover:border-amber-600"
                >
                  {/* Decorative card corner leaf flourish */}
                  <div className="absolute top-0 right-0 size-8 pointer-events-none overflow-hidden" aria-hidden="true">
                    <div className="absolute -top-4 -right-4 size-8 bg-amber-400/20 rotate-45" />
                  </div>

                  {/* Need Image */}
                  <div className="relative h-44 w-full overflow-hidden bg-amber-100/50 dark:bg-stone-950">
                    <Image
                      src={need.imageUrl || getCardImage(need.category, need.id)}
                      alt={need.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Category pill on image */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-3xs font-black uppercase tracking-wider text-amber-200 border border-amber-300/30">
                      {visual && <visual.Icon className="size-3" />}
                      <span>{need.category}</span>
                    </div>

                    {/* Urgency Badge */}
                    {isUrgent && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-rose-600/90 backdrop-blur-sm px-2.5 py-1 text-4xs font-black uppercase tracking-wider text-white shadow-xs">
                        <span>Urgent need</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-1.5 text-3xs font-bold text-amber-800 dark:text-amber-400">
                      <MapPin className="size-3 shrink-0" />
                      <span>{need.city || "Near you"}</span>
                      {need.doneeFirstName && (
                        <>
                          <span>·</span>
                          <span>For {need.doneeFirstName}</span>
                        </>
                      )}
                    </div>

                    <h3 className="mt-2 text-base font-bold text-stone-900 line-clamp-2 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                      <TranslatedText text={need.title} />
                    </h3>

                    {need.description && (
                      <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 dark:text-stone-400 leading-relaxed">
                        <TranslatedText text={need.description} />
                      </p>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-amber-100 dark:border-stone-800">
                      <div className="flex items-center gap-1 text-xs font-black text-stone-700 dark:text-stone-300">
                        <span className="text-amber-600 font-extrabold">Qty:</span> {need.quantity}
                      </div>

                      <Link
                        href={`/requests`}
                        className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-orange-700 hover:text-orange-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                      >
                        <span>Fulfill Need</span>
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Browse more banner */}
        {hiddenCount > 0 && (
          <div className="mt-10 text-center">
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-700 hover:to-orange-700 px-7 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-600/25 transition-all hover:-translate-y-0.5"
            >
              <span>View all {allNeeds.length} verified community needs</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
