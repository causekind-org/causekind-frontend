'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';

/* The site's festive/display face. GanpatiStrip, RakshaBandhanStrip and the
   home page's warm surfaces all set type in it, and the hero was the one
   headline on this route still falling through to the body sans. */
const SERIF = 'var(--font-source-serif-4), Georgia, serif';

const images = [
  {
    src: '/images/money-donation/education.webp',
    alt: 'Child receiving a backpack in a rural village',
  },
  {
    src: '/images/money-donation/healthcare.webp',
    alt: 'Doctor examining a patient in a medical camp',
  },
  {
    src: '/images/money-donation/empowerment.webp',
    alt: 'Empowered women in a rural Indian village learning skills',
  },
  {
    src: '/images/money-donation/nutrition.webp',
    alt: 'Children receiving warm meals in a village',
  }
];

export function MoneyHero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // ?? false because framer's hook returns boolean | null — same coercion as
  // MoneyFlowStory's TiltCard.
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    // A hero that restarts a Ken Burns zoom every five seconds is exactly the
    // unprompted motion prefers-reduced-motion exists to stop. Hold on the
    // first image; the indicators below are still operable by hand.
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    /* At every width the section is pulled up by the header's own measured
       height so the photograph runs to the top of the screen and the nav
       floats on it — Navbar publishes that height as `--ck-nav-h` (57px on a
       phone, 112px on the desktop bar) and marks itself `data-over-hero` on
       this route so it paints no ground. The top padding gains the same amount
       back, so nothing inside moves; only the image grows upward.

       The offset used to stop at `lg`, where the hero was drawn to sit below a
       solid bar rather than behind one. It runs on desktop now too.

       `min-h-[100svh]` rather than the old `75svh` phone value: the bar no
       longer paints a ground on this route, so a three-quarter hero left a
       band of cream page above a floating nav with nothing behind it. Full
       height is what makes the transparent bar read as deliberate.

       Written as explicit per-breakpoint padding rather than a `max-lg:`
       variant: mixing max-width and min-width variants on one property leaves
       the winner to Tailwind's variant ordering, and this is load-bearing
       enough to state outright. */
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden mt-[calc(-1*var(--ck-nav-h,3.5rem))] pt-[calc(2.5rem+var(--ck-nav-h,3.5rem))] sm:pt-[calc(4rem+var(--ck-nav-h,3.5rem))] lg:pt-[calc(5rem+var(--ck-nav-h,3.5rem))] pb-8 sm:pb-12 lg:pb-16">

      {/* Background Image Carousel.

          The dark base matters. The two slides crossfade by animating opacity
          against each other, so for the 1.5s of the transition neither is
          fully opaque and whatever sits behind them shows through — which was
          the page's cream ground, turning the whole hero milky twice every ten
          seconds and taking the white headline down with it. Painting the
          carousel's own floor the colour the overlay is heading for means the
          dip now goes darker rather than paler. */}
      <div className="absolute inset-0 z-0 bg-[#0f0e0d]">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImageIndex}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.5 } }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentImageIndex].src}
              alt={images[currentImageIndex].alt}
              fill
              className="object-cover"
              priority
            />
            {/* Dark gradient overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0d]/80 via-[#0f0e0d]/60 to-[#0f0e0d]/90 mix-blend-multiply" />
          </motion.div>
        </AnimatePresence>

        {/* Outside the AnimatePresence on purpose: these are properties of the
            frame, not of whichever photograph is showing, and re-mounting them
            on every crossfade made the wash pulse once per slide. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_72%,rgba(234,88,12,0.26),transparent_62%)]"
        />
        {/* Scrim for the floating bar. `data-over-hero` strips the header's
            ground on this route, so its contents have only the photograph
            underneath — and the top of a photograph is the one part of it this
            component does not choose. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/50 via-black/20 to-transparent"
        />
      </div>

      {/* No top margin of its own any more. The section's `pt` already
          exceeds its `pb` by the nav height, which pushes the optical centre
          below the bar; the extra margin on top of that was landing the
          headline low in a hero that is now a full screen tall. */}
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl text-center flex flex-col items-center"
        >
          {/* Eyebrow text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            /* Smaller on a phone: the eyebrow is the least important line in
               the hero and at 10px in a pill with a 28px logo it was taking a
               third of the headline's width off the top of the screen. Every
               step down here is phone-only; `sm:` holds the original. */
            className="inline-flex items-center gap-1.5 sm:gap-3 text-[8px] sm:text-xs font-bold tracking-[0.14em] sm:tracking-[0.2em] uppercase text-brand-200 mb-5 sm:mb-9 bg-brand-900/60 border border-brand-500/30 pl-1.5 pr-2.5 sm:pl-2 sm:pr-5 py-1 sm:py-2 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(176,74,21,0.3)]"
          >
            <Image 
              src="/images/money-donation/sahas-logo-transparent.png"
              alt="Sahas Logo" 
              width={28} 
              height={28}
              className="object-contain drop-shadow-sm w-4 h-4 sm:w-7 sm:h-7"
            />
            An initiative of Sahas Charitable Trust
          </motion.div>

          {/* Centered headline.

              Fluid `clamp()` rather than the four-step `text-4xl sm:text-6xl
              lg:text-7xl xl:text-[5.5rem]` ladder it replaces: the steps put a
              23px jump at the `sm` breakpoint, which on a 640px-wide tablet
              reflowed two balanced lines into three ragged ones. One curve
              covers 360px to 1600px without a visible snap.

              The 2rem floor is set by the longer clause, not by taste: at
              anything above about 2.15rem "Shape better futures." no longer
              holds one line inside a 360px screen, and the headline breaks to
              three with "futures." orphaned on the last.

              The second clause is set in gold rather than white. The two
              imperatives are parallel, so the colour is not doing hierarchy —
              it is the one place the festive palette reaches the hero, whose
              type was otherwise entirely neutral over the photograph. */}
          <h1
            className="text-balance font-bold text-white mb-5 sm:mb-7 drop-shadow-[0_2px_28px_rgba(0,0,0,0.5)]"
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(2rem, 6.1vw, 5.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.021em',
            }}
          >
            Fund real impact.
            <span className="block text-amber-300">Shape better futures.</span>
          </h1>

          {/* Explanation. Measured in `ch` rather than `max-w-2xl`: 42rem of
              Plus Jakarta at this size runs to about 78 characters a line,
              well past the 45-75 a centred paragraph stays readable at. */}
          <p
            className="text-pretty text-stone-200/95 mb-9 sm:mb-12 mx-auto drop-shadow-md"
            style={{
              fontSize: 'clamp(1rem, 0.72vw + 0.83rem, 1.2rem)',
              lineHeight: 1.7,
              maxWidth: '54ch',
            }}
          >
            This is the official CauseKind donation portal. 100% of your contribution goes directly to the trust to fund education, healthcare, and vital social welfare initiatives.
          </p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            {/* Plain button rather than a ported Button component: the source
                project shipped its own, and duplicating a third button API
                here would give the codebase two more variants to keep in step
                with `components/ui/button.tsx` for a single call site. */}
            <button
              type="button"
              onClick={() => {
                document.getElementById('donate-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white dark:bg-zinc-900 px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-bold text-stone-900 shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-all duration-300 hover:scale-105 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 active:scale-[0.98]"
            >
              Donate Now
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Carousel Progress Indicators */}
      <div className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        {images.map((image, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentImageIndex(idx)}
            aria-label={`Show image ${idx + 1} of ${images.length}: ${image.alt}`}
            aria-current={idx === currentImageIndex}
            className="group grid h-11 w-10 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <span
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-8 bg-brand-400' : 'w-2 bg-white/40 group-hover:bg-white/70'}`}
            />
          </button>
        ))}
      </div>

    </section>
  );
}
