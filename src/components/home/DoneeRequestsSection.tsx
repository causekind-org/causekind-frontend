"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { TranslatedText, useDynamicTranslation } from "@/hooks/useDynamicTranslation";
import { DONOR_CATEGORY_EVENT } from "@/components/DonorCategoryModal";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS, readSelectedDonorCategories } from "@/lib/categoryVisuals";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, MapPin, Bell, HandHeart } from "lucide-react";
import type { ItemRequest } from "@/lib/api";
// @ts-expect-error — MagicBento is the JS/CSS React Bits variant (no types shipped)
import MagicBento from "@/components/MagicBento";

/* ── The Need Board ──────────────────────────────────────────────────────────
   Open requests are the headlines — set large on a warm notice-board panel,
   most urgent first, each with an always-ready "I can help" action. The quiet
   categories collapse into one "watching for you" strip instead of eight
   empty sections. ── */

const URGENCY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };

// Tinted icon tiles per category — same warm treatment used across the site
const CAT_TILE: Record<string, string> = {
  "Medical aid": "bg-sky-100 dark:bg-sky-900/30",
  "Education":   "bg-amber-100 dark:bg-amber-900/30",
  "Livelihood":  "bg-emerald-100 dark:bg-emerald-900/30",
  "Relief":      "bg-violet-100 dark:bg-violet-900/30",
  "Household":   "bg-rose-100 dark:bg-rose-900/30",
  "Furniture":   "bg-indigo-100 dark:bg-indigo-900/30",
  "Clothing":    "bg-teal-100 dark:bg-teal-900/30",
  "Electronics": "bg-orange-100 dark:bg-orange-900/30",
  "Sports":      "bg-cyan-100 dark:bg-cyan-900/30",
};

export function DoneeRequestsSection({ itemRequests }: { itemRequests: ItemRequest[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mounted, setMounted] = useState(false);

  function openRequest(id: number) {
    if (!user) { router.push("/login"); return; }
    router.push(`/requests/${id}/offer`);
  }

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

  // Most urgent first, then newest — the board reads top-down by need
  const openRequests = itemRequests
    .filter(r => categoriesToShow.includes(r.category))
    .sort((a, b) =>
      (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const quietCategories = categoriesToShow.filter(
    cat => !openRequests.some(r => r.category === cat)
  );

  // Per-category counts for categories that actually have open requests — the
  // complement of quietCategories within categoriesToShow. Sorted by count
  // desc, then by the same urgency rank the row list below uses, so the
  // strip's order roughly mirrors what's about to appear beneath it.
  const countsByCategory = new Map<string, { count: number; rank: number }>();
  for (const r of openRequests) {
    const entry = countsByCategory.get(r.category) ?? { count: 0, rank: 3 };
    entry.count += 1;
    entry.rank = Math.min(entry.rank, URGENCY_RANK[r.urgency] ?? 3);
    countsByCategory.set(r.category, entry);
  }
  const categoryCounts = categoriesToShow
    .filter(cat => countsByCategory.has(cat))
    .map(cat => ({ cat, ...countsByCategory.get(cat)! }))
    .sort((a, b) => b.count - a.count || a.rank - b.rank);

  return (
    <section className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 py-20 border-t border-stone-200/60 dark:border-stone-800 overflow-hidden">
      {/* Warm ambient glow behind the board */}
      <div className="pointer-events-none absolute -top-32 right-[10%] w-[480px] h-[480px] rounded-full bg-[#e07b3a]/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[5%] w-72 h-72 rounded-full bg-[#f0b97a]/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-10">

        {/* ── Masthead ── */}
        <Reveal className="mb-8">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#b04a15] dark:text-[#e07b3a]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-[#b04a15] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b04a15]" />
                </span>
                Live &middot; your focus areas
              </p>
              <h2 className="mt-3 text-4xl lg:text-5xl tracking-tight leading-[1.02] font-bold text-stone-900 dark:text-white"
                style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                {openRequests.length > 0 ? (
                  <>Someone nearby <span className="text-[#b04a15] dark:text-[#e07b3a]">needs a hand.</span></>
                ) : (
                  <>All quiet <span className="text-[#b04a15] dark:text-[#e07b3a]">on your board.</span></>
                )}
              </h2>
              <p className="text-stone-500 dark:text-stone-400 mt-3 text-sm max-w-xl">
                {openRequests.length > 0
                  ? `${openRequests.length} verified request${openRequests.length !== 1 ? "s" : ""} open in the areas you follow — every one checked by our team before it reached you.`
                  : "No open requests in the areas you follow right now. We keep watch so you don't have to."}
              </p>
            </div>
            <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#b04a15] dark:text-[#e07b3a] hover:underline shrink-0 mb-1">
              Browse all requests <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        {/* ── The board — an editorial notice list, not a boxed card. Hierarchy comes
               from the rule beneath the masthead, per-row left accents and dividers,
               not from a white panel sitting on top of the page. ── */}
        <Reveal delay={120}>
          <div className="h-px w-full mb-2" style={{ background: "linear-gradient(90deg, #b04a15, #e07b3a 45%, transparent)" }} />

          {/* Per-category counts — a compact scanning aid above the flat, urgency-
              interleaved row list below. Static/non-clickable, same reassurance-
              strip philosophy as the quiet-cards block further down. */}
          {categoryCounts.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {categoryCounts.map(({ cat, count }) => {
                const vis = CATEGORY_VISUALS[cat];
                const Icon = vis?.Icon;
                return (
                  <span key={cat}
                    className={`inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-3 py-1 text-xs font-bold ${CAT_TILE[cat] ?? "bg-stone-100 dark:bg-stone-800"} ${vis?.text ?? "text-stone-600 dark:text-stone-300"}`}>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/60 dark:bg-black/20">
                      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
                    </span>
                    <span className="uppercase tracking-[0.08em]"><TranslatedText text={cat} /></span>
                    <span className="opacity-60">&middot;</span>
                    <span>{count}</span>
                  </span>
                );
              })}
            </div>
          )}

          {openRequests.length > 0 && (
            <div className="divide-y divide-stone-200/70 dark:divide-zinc-800">
              {openRequests.map((req, i) => (
                <NoticeRow key={req.id} request={req} index={i} onOpen={openRequest} />
              ))}
            </div>
          )}

          {/* Quiet categories — one slim, non-interactive aside, not a wall of pills
              pretending to be filter buttons (they aren't clickable — this is a
              reassurance strip, not a browse tool; "Browse all requests" above
              already owns that job). */}
          {quietCategories.length > 0 && (
            <div className={`py-6 ${openRequests.length > 0 ? "border-t border-stone-200/70 dark:border-zinc-800" : ""}`}>
              <div className="flex items-center gap-2.5">
                <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#f0b97a]/20">
                  <Bell className="h-3 w-3 text-[#b04a15] dark:text-[#e07b3a]" />
                </span>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">Watching for you</p>
              </div>

              {/* Focus areas as an interactive MagicBento grid — one glowing card
                  per category the donor follows, tinted to the brand orange
                  (176,74,21). Each card's copy is the category's shared blurb. */}
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
                  cards={quietCategories.map((cat) => ({
                    color: "#ffffff",
                    label: "Watching",
                    title: cat,
                    description: CATEGORY_VISUALS[cat]?.blurb ?? "",
                  }))}
                />
              </motion.div>

              <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
                The moment a verified need is posted here, you&apos;ll be first to know.
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* One request pinned to the board: tinted category tile, serif headline,
   urgency accent on the row's own left edge, and an "I can help" action
   that's always present and fills on hover. */
function NoticeRow({ request, index, onOpen }: {
  request: ItemRequest; index: number; onOpen: (id: number) => void;
}) {
  const title = useDynamicTranslation(request.title) ?? request.title;
  const city = useDynamicTranslation(request.city) ?? request.city;
  const col = CATEGORY_VISUALS[request.category] ?? CATEGORY_VISUALS["Medical aid"];
  const critical = request.urgency === "CRITICAL";
  const high = request.urgency === "HIGH";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, delay: Math.min(index, 5) * 0.08 }}
    >
      <button
        type="button"
        onClick={() => onOpen(request.id)}
        className={`group w-full text-left flex items-center gap-4 sm:gap-5 py-5 sm:py-6 pl-4 sm:pl-5 pr-1 border-l-4 transition-colors duration-200
          hover:bg-[#b04a15]/[0.03] dark:hover:bg-orange-500/[0.04] ${
          critical ? "border-red-500" : high ? "border-[#e07b3a]" : "border-transparent"}`}
      >
        {/* Category tile */}
        <span className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${CAT_TILE[request.category] ?? "bg-stone-100"}`}>
          <col.Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${col.text}`} strokeWidth={2} />
        </span>

        {/* Headline + meta */}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${col.text}`}>
              <TranslatedText text={request.category} />
            </span>
            {critical && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" /> Urgent
              </span>
            )}
          </span>
          <span className="block mt-1 text-xl sm:text-2xl text-stone-900 dark:text-stone-50 leading-snug font-bold group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors truncate"
            style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
            {title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-stone-400 dark:text-stone-500">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{city}</span>
            <span>&middot;</span>
            <span>{request.quantity} needed</span>
          </span>
        </span>

        {/* Always-visible action — ghost that fills on hover */}
        <span className="hidden xs:inline-flex sm:inline-flex items-center gap-1.5 rounded-xl border-2 border-[#b04a15]/25 text-[#b04a15] dark:text-[#e07b3a] dark:border-[#e07b3a]/30 text-xs font-extrabold px-3.5 py-2.5 shrink-0 transition-all duration-200
          group-hover:bg-[#b04a15] group-hover:border-[#b04a15] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#b04a15]/25">
          <HandHeart className="h-3.5 w-3.5" /> I can help
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    </motion.div>
  );
}
