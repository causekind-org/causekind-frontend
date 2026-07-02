"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { CursorGlowHero } from "@/components/CursorGlowHero";
import { Reveal } from "@/components/Reveal";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

const TERRACOTTA = "#b04a15";

type FaqItem = { q: string; a: string; num: string };

export function FaqPageClient() {
  const t = useTranslations("faq");
  const [activeCategory, setActiveCategory] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  // Real, already-approved FAQ copy (next-intl `faq` namespace) grouped into
  // categories for this page — no invented content, just a new presentation.
  const categories: { label: string; items: FaqItem[] }[] = [
    {
      label: "Trust & Safety",
      items: [
        { num: "01", q: t("q1"), a: t("a1") },
        { num: "02", q: t("q2"), a: t("a2") },
      ],
    },
    {
      label: "Giving & Receiving",
      items: [
        { num: "03", q: t("q3"), a: t("a3") },
        { num: "04", q: t("q6"), a: t("a6") },
      ],
    },
    {
      label: "Money & Tracking",
      items: [
        { num: "05", q: t("q4"), a: t("a4") },
        { num: "06", q: t("q5"), a: t("a5") },
      ],
    },
  ];

  const activeItems = categories[activeCategory].items;

  function selectCategory(i: number) {
    setActiveCategory(i);
    setOpenIdx(0);
  }

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen">
      {/* ── Hero ── */}
      <CursorGlowHero>
        <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
          <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-3">
                Support
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
                Questions, answered directly.
              </h1>
            </div>
            <p className="text-sm text-stone-400 font-medium leading-relaxed max-w-xs lg:text-right lg:pb-1">
              No call centers, no scripts — just the real answers our team gives donors and donees every day.
            </p>
          </div>
        </div>
      </CursorGlowHero>

      {/* ── Category selector — sliding indicator, not pills-as-cards ── */}
      <div className="border-b border-[#e5e2d5]/60 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-6 sm:px-10">
          <div className="relative flex gap-8 overflow-x-auto no-scrollbar">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => selectCategory(i)}
                className={`relative py-6 text-sm font-bold whitespace-nowrap transition-colors ${
                  activeCategory === i
                    ? "text-stone-900 dark:text-white"
                    : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                }`}
              >
                {cat.label}
                {activeCategory === i && (
                  <motion.span
                    layoutId="faq-cat-underline"
                    className="absolute left-0 right-0 -bottom-px h-[2px]"
                    style={{ background: TERRACOTTA }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Question list — numbered rows, grid-rows height animation, no cards ── */}
      <div className="mx-auto max-w-4xl px-6 sm:px-10 py-16 sm:py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeItems.map((item, i) => {
              const isOpen = openIdx === i;
              return (
                <div key={item.q} className="border-b border-[#e5e2d5]/60 dark:border-zinc-800 first:border-t">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full flex items-start gap-5 py-6 text-left group"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="text-xs font-black tabular-nums mt-1 shrink-0 transition-colors"
                      style={{ fontFamily: "var(--font-roboto-mono)", color: isOpen ? TERRACOTTA : "#a8a29e" }}
                    >
                      {item.num}
                    </span>
                    <span className={`flex-1 text-lg sm:text-xl font-extrabold leading-snug transition-colors ${isOpen ? "text-[#b04a15] dark:text-[#e07b3a]" : "text-stone-800 dark:text-stone-100 group-hover:text-stone-600 dark:group-hover:text-stone-300"}`}>
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="shrink-0 mt-1.5"
                    >
                      <Plus className={`w-4 h-4 ${isOpen ? "text-[#b04a15]" : "text-stone-400"}`} />
                    </motion.span>
                  </button>

                  {/* CSS-grid height trick — animates to auto-height without JS measurement */}
                  <div
                    className="grid transition-[grid-template-rows] duration-[400ms] ease-in-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 leading-relaxed font-medium pl-[2.1rem] pb-6 pr-8">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Closing CTA ── */}
      <Reveal className="border-t border-[#e5e2d5]/60 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-6 sm:px-10 py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-white">
              Still stuck?
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Talk to a real person on our team — no chatbot in the way.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm text-white shadow-md hover:opacity-90 active:scale-95 transition-all duration-200 shrink-0"
            style={{ background: TERRACOTTA }}
          >
            Contact us <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
