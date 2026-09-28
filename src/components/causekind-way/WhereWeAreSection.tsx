"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { OPERATING_CITIES, CONTACT_INFO } from "@/lib/landingConstants";

export function WhereWeAreSection() {
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });

  // Map coordinates (relative SVG viewBox 0 0 400 450)
  const cityPinCoordinates: Record<string, { x: number; y: number }> = {
    "Delhi NCR": { x: 175, y: 125 },
    "Mumbai": { x: 125, y: 245 },
    "Pune": { x: 142, y: 265 },
    "Bengaluru": { x: 165, y: 345 },
  };

  const whatsappLink = `${CONTACT_INFO.whatsappUrl}?text=${encodeURIComponent(
    "Hi CauseKind! I'd love to see CauseKind in my city: "
  )}`;

  return (
    <section
      ref={containerRef}
      id="where-we-are"
      aria-label="Where We Are"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-3">
            <span>WHERE WE ARE</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Live in {OPERATING_CITIES.join(", ")}, with more cities coming soon.
          </h2>
        </div>

        {/* Content: Left City Cards + WhatsApp Button, Right Simplified India Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
              {OPERATING_CITIES.map((city, idx) => (
                <motion.div
                  key={city}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + idx * 0.1 }}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 shadow-sm flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FBEDE3] dark:bg-[#B5480F]/20 text-[#B5480F] dark:text-[#F4A25B] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                      {city}
                    </h4>
                    <span className="text-4xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active matching
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* WhatsApp City Request CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="p-6 rounded-3xl bg-[#FAF6F0] dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 mb-1">
                  Want CauseKind in your city?
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                  Tell us where you are and help bring direct giving to your community.
                </p>
              </div>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Tell us on WhatsApp</span>
              </a>
            </motion.div>
          </div>

          {/* Right Column: Simplified Map of India */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-[380px] aspect-[400/450] bg-white dark:bg-stone-900/80 rounded-3xl p-4 border border-stone-200/90 dark:border-stone-800 shadow-md flex items-center justify-center">
              <svg
                viewBox="0 0 400 450"
                className="w-full h-full overflow-visible fill-none"
              >
                {/* Simplified India Outline Shape */}
                <path
                  d="M 175 40 
                     C 195 45, 220 70, 230 100 
                     C 255 110, 310 135, 330 155 
                     C 350 175, 330 200, 305 200 
                     C 290 200, 275 220, 270 240 
                     C 260 270, 240 310, 220 345 
                     C 200 380, 185 410, 175 425 
                     C 165 410, 150 370, 135 340 
                     C 115 300, 95 260, 95 225 
                     C 95 200, 60 170, 65 140 
                     C 70 110, 120 85, 145 65 Z"
                  className="fill-stone-100 dark:fill-stone-800/60 stroke-[#B5480F]/30 dark:stroke-[#F4A25B]/30"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* City Pins & Pulsing Rings */}
                {OPERATING_CITIES.map((city, idx) => {
                  const coords = cityPinCoordinates[city];
                  if (!coords) return null;

                  return (
                    <g key={city} transform={`translate(${coords.x}, ${coords.y})`}>
                      {/* Pulsing Outer Rings */}
                      <circle
                        cx="0"
                        cy="0"
                        r="14"
                        className="stroke-[#B5480F] dark:stroke-[#F4A25B] fill-none animate-ping opacity-75"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r="7"
                        className="fill-[#B5480F] dark:fill-[#F4A25B]"
                      />

                      {/* City Name Label */}
                      <text
                        x="12"
                        y="4"
                        className="text-[11px] font-extrabold fill-stone-900 dark:fill-stone-100 select-none"
                      >
                        {city}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
