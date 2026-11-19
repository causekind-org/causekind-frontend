"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/AppLink";
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Heart,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence, useInView, useReducedMotion, type Variants } from "framer-motion";
import type { InKindCategory } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";
// @ts-expect-error — CardGlow is a JSX component without bundled types
import CardGlow from "@/components/CardGlow";
import CategoryNeedsBoard from "@/components/CategoryNeedsBoard";
import CategoryExplorer from "@/components/CategoryExplorer";
import "./CategoryPageClient.css";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useCategoryLabel } from "@/lib/categoryLabel";
/* ── Props ─────────────────────────────────────────────────────────────── */

type Props = {
  cat: InKindCategory;
};

/* ── Animation presets ─────────────────────────────────────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, transition: { duration: 0 } },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeUpBlock: Variants = {
  hidden: { opacity: 0, y: 20, transition: { duration: 0 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/**
 * Same rule as components/Reveal: content is visible in the server HTML and
 * on first render (initial={false}). After hydration, a section that starts
 * clearly below the fold (top > viewport + 100px) is hidden instantly while
 * off screen and animates in when scrolled to. Sections on or near the first
 * screen are never reset. Reduced motion: never hidden.
 */
function useFoldReveal(ref: React.RefObject<HTMLElement | null>): "hidden" | "visible" {
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (reduce || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight + 100) setArmed(true);
  }, [reduce, ref]);
  return armed && !inView ? "hidden" : "visible";
}

/* ── Gradient map per-category accent ──────────────────────────────────── */

const CATEGORY_GRADIENT: Record<string, string> = {
  "Medical aid": "linear-gradient(to top, rgba(14,165,233,0.85) 0%, rgba(14,165,233,0.3) 40%, rgba(0,0,0,0.12) 100%)",
  Education:    "linear-gradient(to top, rgba(217,119,6,0.8) 0%, rgba(217,119,6,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Livelihood:   "linear-gradient(to top, rgba(16,185,129,0.8) 0%, rgba(16,185,129,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Relief:       "linear-gradient(to top, rgba(139,92,246,0.8) 0%, rgba(139,92,246,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Household:    "linear-gradient(to top, rgba(244,63,94,0.8) 0%, rgba(244,63,94,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Furniture:    "linear-gradient(to top, rgba(99,102,241,0.8) 0%, rgba(99,102,241,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Clothing:     "linear-gradient(to top, rgba(20,184,166,0.8) 0%, rgba(20,184,166,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Electronics:  "linear-gradient(to top, rgba(249,115,22,0.8) 0%, rgba(249,115,22,0.25) 40%, rgba(0,0,0,0.12) 100%)",
  Sports:       "linear-gradient(to top, rgba(6,182,212,0.8) 0%, rgba(6,182,212,0.25) 40%, rgba(0,0,0,0.12) 100%)",
};

/* ── Main Component ────────────────────────────────────────────────────── */

export default function CategoryPageClient({ cat }: Props) {
  const rt = useTranslations("requestsArea");
  const ui = useUiText();
  const categoryLabel = useCategoryLabel();
  // Shown inside sentences; the slug/ID stays as data.
  const catName = categoryLabel(cat.name).toLowerCase();
  const visual = CATEGORY_VISUALS[cat.name];

  // Interactive Hero hover state
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  
  // Impact Story Carousel state

  const guidelinesRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const guidelinesAnim = useFoldReveal(guidelinesRef);
  const howAnim = useFoldReveal(howRef);
  const ctaAnim = useFoldReveal(ctaRef);
  const exploreAnim = useFoldReveal(exploreRef);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      {/* ── Back link ── */}
      <motion.div initial={false}>
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition-colors hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] rounded dark:text-stone-400"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <UiText>All needs</UiText>
        </Link>
      </motion.div>

      {/* ── Hero Section (Cinematic + Smooth Frosted Hover Reveal) ── */}
      <motion.header
        className="ck-cat-hero mt-5"
        initial={false}
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        {/* Parallax background image */}
        {/* A real <Image>, not a CSS background: the browser can discover it
            from the HTML and load it with priority. object-position mirrors the old background-position. */}
        <div className="ck-cat-hero__bg">
          <Image
            src={visual.fallbackImage}
            alt=""
            fill
            priority
            // Served as-is: these files are already 22-61 KB at 1600x900, and the
            // optimizer re-encodes them larger (measured: +34 KB on desktop).
            unoptimized
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "center 35%" }}
          />
        </div>

        {/* Gradient overlay */}
        <div
          className="ck-cat-hero__overlay"
          style={{
            background: CATEGORY_GRADIENT[cat.name] || CATEGORY_GRADIENT["Medical aid"],
            opacity: isHeroHovered ? 0.88 : 0.72,
          }}
        />

        {/* Floating animated orbs */}
        <div className="ck-cat-hero__orbs" aria-hidden="true">
          <div className="ck-cat-orb ck-cat-orb--1" />
          <div className="ck-cat-orb ck-cat-orb--2" />
          <div className="ck-cat-orb ck-cat-orb--3" />
        </div>

        {/* Hero Front Content */}
        <motion.div
          className="relative z-10 flex flex-col gap-2.5 max-w-2xl"
          variants={staggerContainer}
          initial={false}
          animate="visible"
        >
          {/* Floating 3D icon */}
          <motion.div className="ck-cat-hero__icon-wrap" variants={fadeUp} custom={0}>
            <span className="ck-cat-hero__icon-inner">
              <AnimatedCategoryIcon category={cat.name} iconClassName="w-7 h-7 text-white" />
            </span>
          </motion.div>

          <motion.h1
            className="text-[clamp(2rem,1.5rem+1.8vw,2.85rem)] font-bold leading-tight text-white drop-shadow-md"
            variants={fadeUp}
            custom={1}
          >
            {cat.name}
          </motion.h1>

          <motion.div variants={fadeUp} custom={2}>
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold text-white/95 backdrop-blur-md bg-white/20 border border-white/25 shadow-sm">
              {cat.tagline}
            </span>
          </motion.div>

          {/* Smooth Frosted Hover Reveal (No black box, pure translucent frosted glass) */}
          <AnimatePresence>
            {isHeroHovered && (
              <motion.div
                key="hero-intro"
                initial={{ opacity: 0, y: 12, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
                className="ck-cat-hero__intro-glass overflow-hidden"
              >
                <p className="text-sm sm:text-base leading-relaxed text-white/95 drop-shadow-sm font-medium">
                  {cat.intro}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.header>

      {/* ── Live Needs Section (Immediately after Hero Image) ── */}
      <section className="mt-8">
        <CategoryNeedsBoard categoryName={cat.name} />
      </section>

      {/* ── Gradient Divider ── */}
      <div className="ck-cat-divider" aria-hidden="true" />


      {/* ── Guidelines Bento Card ── */}
      <motion.section
        ref={guidelinesRef}
        className="mt-12"
        variants={scaleIn}
        initial={false}
        animate={guidelinesAnim}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            <UiText>Donation Guidelines</UiText>
          </h2>
          {/* Body text, not a caption: readable size, darker grey, ~65ch line length. */}
          <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-stone-700 dark:text-stone-300 break-words">
            {cat.guideIntro}
          </p>
        </div>
        
        <div className="ck-cat-guidelines-bento rounded-[2rem] overflow-hidden border border-stone-200/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-lg">
          <div className="grid md:grid-cols-2">
            {/* Good to donate half */}
            <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-stone-200/50 dark:border-white/10 bg-emerald-50/30 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-emerald-200/50 dark:border-emerald-900/50">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                  <UiText>Good to donate</UiText>
                </h3>
              </div>
              <ul className="space-y-3">
                {cat.goodToDonate.map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="mt-0.5 p-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-stone-700 dark:text-stone-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Avoid half */}
            <div className="p-6 sm:p-8 bg-red-50/30 dark:bg-red-950/20">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-red-200/50 dark:border-red-900/50">
                <span className="p-2 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
                  <UiText>Please avoid</UiText>
                </h3>
              </div>
              <ul className="space-y-3">
                {cat.avoid.map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="mt-0.5 p-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-stone-700 dark:text-stone-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── How It Works ── */}
      <motion.section
        ref={howRef}
        className="mt-16"
        variants={scaleIn}
        initial={false}
        animate={howAnim}
      >
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            <UiText>How donating works</UiText>
          </h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2 text-base sm:text-lg">
            {rt("givingSimple", { category: catName })}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-200 dark:via-stone-700 to-transparent hidden md:block -translate-y-1/2 z-0" />
          
          {[
            { step: 1, title: ui("List your item"), desc: ui("Snap a quick photo and add basic details. It takes less than 2 minutes.") },
            { step: 2, title: ui("We find a match"), desc: ui("We connect you with verified local needs near you.") },
            { step: 3, title: ui("Handover securely"), desc: ui("Meet up safely in a public spot or ship directly to them.") },
          ].map((s) => (
            <div key={s.step} className="relative z-10 flex flex-col items-center text-center p-8 bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-3xl border border-stone-200/80 dark:border-white/10 shadow-lg hover:scale-[1.02] transition-transform">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[var(--ck-role-accent)] text-white font-bold text-2xl mb-5 shadow-lg shadow-[var(--ck-role-accent)]/30">
                {s.step}
              </div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-3">{s.title}</h3>
              <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Quick Donate CTA Banner ── */}
      <motion.section
        ref={ctaRef}
        className="ck-cat-cta-banner mt-16 relative overflow-hidden rounded-[2.5rem] shadow-2xl p-8 sm:p-14 text-center border border-white/20"
        variants={scaleIn}
        initial={false}
        animate={ctaAnim}
      >
        {/* Dynamic Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${visual.fallbackImage})` }}
        />
        
        {/* Glassmorphic Blur and Darken */}
        <div className="absolute inset-0 bg-stone-900/80 dark:bg-black/80 backdrop-blur-xl" />
        <div className="absolute inset-0 ck-cat-cta-gradient mix-blend-overlay" />
        
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
          <motion.div 
            className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-[var(--ck-role-accent)] shadow-xl mb-6"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatedCategoryIcon category={cat.name} iconClassName="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
            {rt("readyToDonate", { category: catName })}
          </h2>
          
          <p className="text-lg sm:text-xl text-white/90 font-medium mb-10 drop-shadow-sm max-w-lg">
            {cat.preparation.length > 0 ? cat.preparation[0] : ui("Your contribution can make a huge difference right now.")}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
            <Link 
              href="/items/new"
              className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-white text-stone-900 font-bold text-lg hover:scale-[1.03] active:scale-[0.97] transition-all shadow-xl"
            >
              <UiText>List an item</UiText>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href={`/requests?category=${encodeURIComponent(cat.name)}`}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-white/10 text-white font-bold text-lg hover:bg-white/20 border border-white/30 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-xl backdrop-blur-md"
            >
              <UiText>Browse needs</UiText>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Gradient Divider ── */}
      <div className="ck-cat-divider" aria-hidden="true" />

      {/* ── Cross-Navigation ── */}
      <motion.div
        ref={exploreRef}
        className="mt-2"
        variants={fadeUpBlock}
        initial={false}
        animate={exploreAnim}
      >
        <CategoryExplorer
          exclude={cat.name}
          heading={ui("Other categories")}
          blurb={ui("Each one has its own guidance on what genuinely helps.")}
        />
      </motion.div>
    </div>
  );
}
