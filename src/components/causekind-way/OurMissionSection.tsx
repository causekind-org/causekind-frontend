"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, ArrowRightLeft, ShieldCheck } from "lucide-react";

export function OurMissionSection() {
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  const missionPoints = [
    {
      title: "Local",
      tagline: "Every match is within 10 km, so help stays in your neighbourhood.",
      icon: MapPin,
      accentBg: "bg-[#FBEDE3] dark:bg-[#B5480F]/20",
      accentText: "text-[#B5480F] dark:text-[#F4A25B]",
      borderColor: "border-[#B5480F]/30 dark:border-[#B5480F]/40",
    },
    {
      title: "Direct",
      tagline: "Items go straight from donor to the person or NGO who asked. No warehouses, no middlemen.",
      icon: ArrowRightLeft,
      accentBg: "bg-[#EBF2FA] dark:bg-[#1E3A60]/30",
      accentText: "text-[#1E3A60] dark:text-[#7FB0E8]",
      borderColor: "border-[#1E3A60]/30 dark:border-[#7FB0E8]/40",
    },
    {
      title: "Dignified",
      tagline: "People ask for exactly what they need, without public begging or sharing their story.",
      icon: ShieldCheck,
      accentBg: "bg-[#EBF5EE] dark:bg-[#1F6B3F]/30",
      accentText: "text-[#1F6B3F] dark:text-[#52B788]",
      borderColor: "border-[#1F6B3F]/30 dark:border-[#52B788]/40",
    },
  ];

  return (
    <section
      ref={containerRef}
      id="our-mission"
      aria-label="Our Mission"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-3">
            <span>WHY WE EXIST</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Giving should be local, direct and dignified.
          </h2>
        </div>

        {/* 3 Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {missionPoints.map((point, i) => {
            const IconComp = point.icon;
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.18, ease: "easeOut" }}
                className={`p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900/90 border ${point.borderColor} shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group`}
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl ${point.accentBg} ${point.accentText} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 mb-2">
                    {point.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                    {point.tagline}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
