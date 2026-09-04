'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-20 pb-16">

      {/* Background Image Carousel */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col items-center mt-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl text-center flex flex-col items-center"
        >
          {/* Eyebrow text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-3 text-xs font-bold tracking-widest uppercase text-brand-200 mb-8 bg-brand-900/60 border border-brand-500/30 pl-2 pr-5 py-2 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(176,74,21,0.3)]"
          >
            <Image 
              src="/images/money-donation/sahas-logo.webp" 
              alt="Sahas Logo" 
              width={28} 
              height={28}
              className="object-contain drop-shadow-sm"
            />
            An initiative of Sahas Charitable Trust
          </motion.div>

          {/* Centered headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-extrabold tracking-tight text-white mb-8 leading-[1.05] drop-shadow-2xl">
            Fund real impact. <br className="hidden sm:block" /> Shape better futures.
          </h1>

          {/* Explanation */}
          <p className="text-lg sm:text-xl text-stone-200 mb-12 leading-relaxed max-w-2xl mx-auto drop-shadow-md">
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
              className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white dark:bg-zinc-900 px-10 py-5 text-lg font-bold text-stone-900 shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-all duration-300 hover:scale-105 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 active:scale-[0.98]"
            >
              Donate Now
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Carousel Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {images.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-8 bg-brand-400' : 'w-2 bg-white/40'}`}
          />
        ))}
      </div>

    </section>
  );
}
