"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Stethoscope,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Home,
  Armchair,
  Shirt,
  Laptop,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function WhatYouCanGiveSection() {
  const containerRef = useRef<HTMLElement>(null);
  const scaleBarRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });

  const categories = [
    {
      name: "Medical aid",
      icon: Stethoscope,
      examples: ["Wheelchairs & walkers", "Hospital beds", "BP monitors & nebulisers"],
      color: "#B5480F",
    },
    {
      name: "Education",
      icon: GraduationCap,
      examples: ["Textbooks & guides", "School bags", "Stationery & art sets"],
      color: "#1E3A60",
    },
    {
      name: "Livelihood",
      icon: Briefcase,
      examples: ["Sewing machines", "Hand & power tools", "Commercial scales"],
      color: "#1F6B3F",
    },
    {
      name: "Relief",
      icon: HeartHandshake,
      examples: ["Blankets & bedsheets", "Tarpaulins & mats", "Cooking vessels"],
      color: "#B5480F",
    },
    {
      name: "Household",
      icon: Home,
      examples: ["Cookware & utensils", "Fans & mixers", "Storage containers"],
      color: "#1E3A60",
    },
    {
      name: "Furniture",
      icon: Armchair,
      examples: ["Beds & mattresses", "Study tables & chairs", "Cupboards & racks"],
      color: "#1F6B3F",
    },
    {
      name: "Clothing",
      icon: Shirt,
      examples: ["Clean everyday wear", "Children's clothes", "Sweaters & jackets"],
      color: "#B5480F",
    },
    {
      name: "Electronics",
      icon: Laptop,
      examples: ["Laptops with chargers", "Smartphones (reset)", "Tablets & monitors"],
      color: "#1E3A60",
    },
    {
      name: "Sports & Community",
      icon: Trophy,
      examples: ["Sports gear & racquets", "Musical instruments", "Board games & books"],
      color: "#1F6B3F",
    },
  ];

  const conditions = [
    "Unused",
    "Like New",
    "Good",
    "Fair",
    "Needs Minor Repair",
    "Not Working",
  ];

  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !scaleBarRef.current || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo(
      scaleBarRef.current,
      { width: "0%" },
      {
        width: "100%",
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
        },
      }
    );
  }, []);

  return (
    <section
      ref={containerRef}
      id="what-you-can-give"
      aria-label="What You Can Give"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-3">
            <span>WHAT YOU CAN GIVE</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Useful things, honestly described.
          </h2>
        </div>

        {/* 9 Interactive Flip Category Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {categories.map((cat, i) => {
            const IconComp = cat.icon;
            const isFlipped = flippedIndex === i;

            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                onMouseEnter={() => setFlippedIndex(i)}
                onMouseLeave={() => setFlippedIndex(null)}
                className="relative h-36 sm:h-40 rounded-3xl cursor-pointer perspective-1000 group"
              >
                <div
                  className={`relative w-full h-full rounded-3xl p-5 bg-white dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 shadow-sm transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                    isFlipped ? "border-[#B5480F]/50 shadow-md" : ""
                  }`}
                >
                  {!isFlipped ? (
                    <div className="flex flex-col justify-between h-full">
                      <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                          {cat.name}
                        </h3>
                        <p className="text-4xs text-stone-400 dark:text-stone-500 font-semibold mt-0.5">
                          Hover to view examples →
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center h-full text-left animate-in fade-in zoom-in-95 duration-200">
                      <span className="text-4xs font-black uppercase text-[#B5480F] dark:text-[#F4A25B] mb-1">
                        {cat.name} Examples:
                      </span>
                      <ul className="space-y-1">
                        {cat.examples.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-3xs sm:text-2xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
                          >
                            <span className="w-1 h-1 rounded-full bg-[#B5480F]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Item Condition Scale */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#FAF6F0] dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
          <div className="text-center mb-6">
            <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 mb-1">
              The CauseKind Item Condition Scale
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
              Used items are welcome. Just describe the condition honestly, including anything that needs repair.
            </p>
          </div>

          {/* Condition Progress Scale */}
          <div className="relative w-full mb-6">
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                ref={scaleBarRef}
                className="h-full bg-gradient-to-r from-[#B5480F] via-[#F4A25B] to-emerald-500 rounded-full"
              />
            </div>
          </div>

          {/* Scale Labels */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
            {conditions.map((cond, idx) => (
              <div
                key={cond}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-3xs sm:text-2xs font-extrabold text-stone-800 dark:text-stone-200"
              >
                {cond}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
