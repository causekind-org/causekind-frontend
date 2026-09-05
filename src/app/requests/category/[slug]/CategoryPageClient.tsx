"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Heart,
  MapPin,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { InKindCategory } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";
// @ts-expect-error — CardGlow is a JSX component without bundled types
import CardGlow from "@/components/CardGlow";
import CategoryNeedsBoard from "@/components/CategoryNeedsBoard";
import CategoryExplorer from "@/components/CategoryExplorer";
import "./CategoryPageClient.css";

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
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

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
  const visual = CATEGORY_VISUALS[cat.name];

  // Interactive Hero hover state
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  
  // Impact Story Carousel state
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const imageKey = cat.name.toLowerCase().replace(' ', '_');
  
  const ALL_IMAGES = [
    "medical_aid",
    "education",
    "livelihood",
    "relief",
    "household",
    "furniture",
    "clothing",
    "electronics",
    "sports"
  ];
  const catIndex = ALL_IMAGES.indexOf(imageKey);
  const getImg = (offset: number) => {
    const idx = catIndex === -1 ? 0 : catIndex;
    const mappedIdx = (idx + offset) % ALL_IMAGES.length;
    return `/images/stories/${ALL_IMAGES[mappedIdx]}.jpg`;
  };

  const IMPACT_STORIES = [
    {
      quote: `The ${cat.name.toLowerCase()} we received changed everything for us. We finally had what we needed, and it gave us so much hope.`,
      author: "Priya Sharma",
      initial: "P",
      image: getImg(0),
    },
    {
      quote: `I can't believe how quickly the community came together to help. The ${cat.name.toLowerCase()} arrived exactly when we needed it the most.`,
      author: "Rahul Verma",
      initial: "R",
      image: getImg(1),
    },
    {
      quote: `This simple donation of ${cat.name.toLowerCase()} made a world of difference. It's a reminder that kindness still exists.`,
      author: "Anjali Gupta",
      initial: "A",
      image: getImg(2),
    }
  ];

  const nextStory = () => setCurrentStoryIndex((i) => (i + 1) % IMPACT_STORIES.length);
  const prevStory = () => setCurrentStoryIndex((i) => (i - 1 + IMPACT_STORIES.length) % IMPACT_STORIES.length);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      {/* ── Back link ── */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition-colors hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] rounded dark:text-stone-400"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          All needs
        </Link>
      </motion.div>

      {/* ── Hero Section (Cinematic + Smooth Frosted Hover Reveal) ── */}
      <motion.header
        className="ck-cat-hero mt-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        {/* Parallax background image */}
        <div
          className="ck-cat-hero__bg"
          style={{ backgroundImage: `url(${visual.fallbackImage})` }}
        />

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
          initial="hidden"
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
        className="mt-12"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Donation Guidelines
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Verified criteria to ensure your items are ready for immediate, dignified use.
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
                  Good to donate
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
                  Please avoid
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
        className="mt-16"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            How donating works
          </h2>
          <p className="text-stone-500 dark:text-stone-400 mt-2 text-base sm:text-lg">
            Giving your {cat.name.toLowerCase()} items is simple, safe, and direct.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-200 dark:via-stone-700 to-transparent hidden md:block -translate-y-1/2 z-0" />
          
          {[
            { step: 1, title: "List your item", desc: "Snap a quick photo and add basic details. It takes less than 2 minutes." },
            { step: 2, title: "We find a match", desc: "We connect you with verified local needs near you." },
            { step: 3, title: "Handover securely", desc: "Meet up safely in a public spot or ship directly to them." },
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

      {/* ── Impact Story Carousel ── */}
      <motion.section
        className="mt-16 ck-cat-impact-story relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-stone-900 border border-stone-200/50 dark:border-white/5 shadow-xl"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="grid md:grid-cols-5 min-h-[400px]">
          <div className="md:col-span-3 p-10 sm:p-14 flex flex-col justify-between relative z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ck-role-accent)]/10 text-[var(--ck-role-accent)] text-xs font-bold uppercase tracking-wider mb-8 w-fit border border-[var(--ck-role-accent)]/20">
                <Sparkles className="w-3.5 h-3.5" /> Impact Stories
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStoryIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <blockquote className="text-2xl sm:text-3xl font-medium text-stone-800 dark:text-stone-100 leading-snug mb-8">
                    "{IMPACT_STORIES[currentStoryIndex].quote}"
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--ck-role-accent)] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {IMPACT_STORIES[currentStoryIndex].initial}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100 text-lg">{IMPACT_STORIES[currentStoryIndex].author}</p>
                      <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Received {cat.name.toLowerCase()}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
              <button 
                onClick={prevStory}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1.5">
                {IMPACT_STORIES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStoryIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStoryIndex ? "bg-[var(--ck-role-accent)] w-6" : "bg-stone-300 dark:bg-stone-700"
                    }`}
                    aria-label={`Go to story ${idx + 1}`}
                  />
                ))}
              </div>
              <button 
                onClick={nextStory}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="md:col-span-2 relative h-64 md:h-auto overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStoryIndex}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${IMPACT_STORIES[currentStoryIndex].image})` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* ── Quick Donate CTA Banner ── */}
      <motion.section
        className="ck-cat-cta-banner mt-16 relative overflow-hidden rounded-[2.5rem] shadow-2xl p-8 sm:p-14 text-center border border-white/20"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
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
            Ready to donate {cat.name.toLowerCase()}?
          </h2>
          
          <p className="text-lg sm:text-xl text-white/90 font-medium mb-10 drop-shadow-sm max-w-lg">
            {cat.preparation.length > 0 ? cat.preparation[0] : "Your contribution can make a huge difference right now."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
            <Link 
              href={`/give?category=${encodeURIComponent(cat.name)}`}
              className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-white text-stone-900 font-bold text-lg hover:scale-[1.03] active:scale-[0.97] transition-all shadow-xl"
            >
              List an item
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href={`/requests?category=${encodeURIComponent(cat.name)}`}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-white/10 text-white font-bold text-lg hover:bg-white/20 border border-white/30 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-xl backdrop-blur-md"
            >
              Browse needs
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Gradient Divider ── */}
      <div className="ck-cat-divider" aria-hidden="true" />

      {/* ── Cross-Navigation ── */}
      <motion.div
        className="mt-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        <CategoryExplorer
          exclude={cat.name}
          heading="Other categories"
          blurb="Each one has its own guidance on what genuinely helps."
        />
      </motion.div>
    </main>
  );
}
