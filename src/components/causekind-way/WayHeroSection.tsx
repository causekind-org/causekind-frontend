"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Heart, ChevronDown } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function WayHeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const roadPathRef = useRef<SVGPathElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  const headingWords = "How what you have becomes what someone needs.".split(" ");

  useEffect(() => {
    if (typeof window === "undefined" || !roadPathRef.current || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const path = roadPathRef.current;
    const length = path.getTotalLength();

    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
      },
    });

    tl.to(path, {
      strokeDashoffset: 0,
      duration: 1.8,
      ease: "power2.out",
    }, 0.3);

    if (heartRef.current) {
      tl.fromTo(
        heartRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.5)" },
        1.8
      );
    }

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="way-hero"
      aria-label="The CauseKind Way Hero"
      className="relative w-full min-h-[calc(100svh-3.5rem)] flex flex-col justify-center items-center py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none opacity-35 dark:opacity-20" aria-hidden="true">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(127,176,232,0.18)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto w-full text-center flex flex-col items-center z-10">
        {/* Eyebrow Label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-5">
          <span>THE CAUSEKIND WAY</span>
        </div>

        {/* Heading Word-by-Word Reveal */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-stone-900 dark:text-stone-100 max-w-3xl">
          {headingWords.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block mr-2 sm:mr-3"
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.4,
                delay: 0.1 + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word === "becomes" || word === "needs." ? (
                <span className="text-[#B5480F] dark:text-[#F4A25B]">{word}</span>
              ) : (
                word
              )}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle Text */}
        <motion.p
          className="mt-6 text-base sm:text-lg md:text-xl text-stone-600 dark:text-stone-300 font-medium leading-relaxed max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          CauseKind connects people who have extra things with verified people and NGOs nearby who need them — simply, safely and with dignity.
        </motion.p>

        {/* Animated Dashed Road SVG across hero ending in Heart */}
        <div className="relative w-full max-w-xl h-16 sm:h-20 my-6 sm:my-8 flex items-center justify-center pointer-events-none">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 500 80"
            fill="none"
          >
            <path
              ref={roadPathRef}
              id="hero-road"
              d="M 20 40 Q 140 10, 250 40 T 460 40"
              stroke="#B5480F"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
            />
          </svg>
          <div
            ref={heartRef}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FBEDE3] dark:bg-[#25150E] border border-[#B5480F] flex items-center justify-center shadow-md"
          >
            <Heart className="w-4 h-4 fill-[#B5480F] text-[#B5480F] dark:fill-[#F4A25B] dark:text-[#F4A25B] animate-pulse" />
          </div>
        </div>

        {/* Scroll to explore indicator */}
        <motion.div
          className="flex flex-col items-center gap-1.5 text-stone-400 dark:text-stone-500 mt-2 cursor-pointer select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          onClick={() => {
            const el = document.getElementById("our-mission");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span className="text-4xs font-bold uppercase tracking-[0.25em]">Scroll to explore</span>
          <ChevronDown className="w-4 h-4 animate-bounce text-[#B5480F] dark:text-[#F4A25B]" />
        </motion.div>
      </div>
    </section>
  );
}
