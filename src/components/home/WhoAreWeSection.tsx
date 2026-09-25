"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Gift, HeartHandshake, Building2, Heart } from "lucide-react";

export function WhoAreWeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.25 });
  const reduceMotion = useReducedMotion();

  const labelText = "ABOUT CAUSEKIND";
  const headingWords = [
    { text: "We", highlight: false },
    { text: "connect", highlight: false },
    { text: "people", highlight: false },
    { text: "who", highlight: false },
    { text: "have", highlight: false },
    { text: "extra things", highlight: true },
    { text: "with", highlight: false },
    { text: "people", highlight: false },
    { text: "nearby", highlight: false },
    { text: "who", highlight: false },
    { text: "need them.", highlight: true },
  ];

  return (
    <section
      ref={sectionRef}
      id="about-causekind"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex items-center py-10 sm:py-12 lg:py-8 bg-[#F8F6F2] dark:bg-[#140E0B] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden transition-colors duration-300"
    >
      {/* Decorative ambient background subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[radial-gradient(circle,_rgba(244,162,91,0.25)_0%,_transparent_70%)] blur-2xl" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-[radial-gradient(circle,_rgba(15,122,108,0.2)_0%,_transparent_70%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl w-full px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT COLUMN: Eyebrow, Heading, Paragraph */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {/* Eyebrow / Letter-by-letter typing label */}
            <div className="flex items-center gap-2 mb-3">
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F]" />
              <p className="text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] flex overflow-hidden">
                {labelText.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.03,
                      delay: reduceMotion ? 0 : 0.05 + index * 0.025,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </p>
            </div>

            {/* Heading with word-by-word reveal + marker swipe underline (ALL SANS-SERIF) */}
            <h2 className="text-2xl sm:text-3xl lg:text-[clamp(1.75rem,2.1vw+0.25rem,2.5rem)] font-extrabold tracking-tight leading-[1.22] text-stone-900 dark:text-stone-100 text-left">
              {headingWords.map((item, idx) => (
                <span key={idx} className="inline-block mr-1.5 my-0.5 overflow-hidden align-top">
                  <motion.span
                    className={`inline-block relative ${item.highlight
                      ? "text-[#B5480F] dark:text-[#F4A25B] font-extrabold"
                      : ""
                      }`}
                    initial={{ y: "110%", opacity: 0 }}
                    animate={isInView ? { y: "0%", opacity: 1 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: reduceMotion ? 0 : 0.15 + idx * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {item.text}
                    {item.highlight && (
                      <motion.span
                        className="absolute left-0 bottom-0.5 h-[3px] sm:h-1 bg-[#B5480F]/40 dark:bg-[#F4A25B]/50 rounded-full"
                        initial={{ width: 0 }}
                        animate={isInView ? { width: "100%" } : {}}
                        transition={{
                          duration: 0.6,
                          delay: reduceMotion ? 0 : 0.65 + idx * 0.08,
                          ease: "easeOut",
                        }}
                      />
                    )}
                  </motion.span>
                </span>
              ))}
            </h2>

            {/* Description paragraph */}
            <motion.p
              className="text-left text-sm sm:text-base text-stone-600 dark:text-stone-300 font-normal sm:font-medium leading-relaxed mt-4 max-w-lg"
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.35 }}
            >
              CauseKind is a free platform in India where donors give useful items — books, clothes,
              furniture, electronics and more — directly to verified people and NGOs near them. No cash.
              No middlemen. Just real things reaching real people.
            </motion.p>
          </div>

          {/* RIGHT COLUMN: Balanced Connection Diagram */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-[500px] aspect-[520/420] mx-auto select-none">
              {/* SVG Connecting Dashed Lines & Traveling Dots (in matching 520x420 coordinate system) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox="0 0 520 420"
              >
                <defs>
                  <linearGradient id="line-donor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B5480F" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#B5480F" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="line-donee-grad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0F7A6C" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#0F7A6C" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="line-ngo-grad" gradientUnits="userSpaceOnUse" x1="260" y1="326" x2="260" y2="248">
                    <stop offset="0%" stopColor="#1F6B3F" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#1F6B3F" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Left path from Donor to Center Heart */}
                <motion.path
                  d="M 200 84 C 200 130, 215 155, 226 175"
                  fill="none"
                  stroke="url(#line-donor-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 0.9, delay: 0.5 }}
                />
                {/* Right path from Donee to Center Heart */}
                <motion.path
                  d="M 320 84 C 320 130, 305 155, 294 175"
                  fill="none"
                  stroke="url(#line-donee-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 0.9, delay: 0.5 }}
                />
                {/* Bottom path from NGO to Center Heart */}
                <motion.path
                  d="M 260 342 L 260 248"
                  fill="none"
                  stroke="url(#line-ngo-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 0.9, delay: 0.5 }}
                />

                {/* Traveling dots looping smoothly along the exact paths */}
                {!reduceMotion && isInView && (
                  <>
                    <circle r="4.5" fill="#B5480F">
                      <animateMotion
                        path="M 200 84 C 200 130, 215 155, 226 175"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r="4.5" fill="#0F7A6C">
                      <animateMotion
                        path="M 320 84 C 320 130, 305 155, 294 175"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r="4.5" fill="#1F6B3F">
                      <animateMotion
                        path="M 260 342 L 260 248"
                        dur="2.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}
              </svg>

              {/* Top-Left Card: Donors */}
              <motion.div
                className="absolute left-0 top-[2%] w-[45%] flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#FBEDE3]/90 dark:bg-[#B5480F]/15 border border-[#B5480F]/30 dark:border-[#B5480F]/40 backdrop-blur-xs shadow-xs hover:shadow-md transition-all duration-300 z-10"
                initial={{ opacity: 0, x: reduceMotion ? 0 : -35, y: reduceMotion ? 0 : -20, scale: 0.9 }}
                animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: reduceMotion ? 0 : 0.4 }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-stone-900 shadow-2xs shrink-0 text-[#B5480F]">
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight text-[#B5480F] dark:text-[#f4a25b]">
                    Donors
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 font-medium leading-tight mt-0.5">
                    give items they no longer need
                  </p>
                </div>
              </motion.div>

              {/* Top-Right Card: Donees */}
              <motion.div
                className="absolute right-0 top-[2%] w-[45%] flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#E3F2EF]/90 dark:bg-[#0F7A6C]/15 border border-[#0F7A6C]/30 dark:border-[#0F7A6C]/40 backdrop-blur-xs shadow-xs hover:shadow-md transition-all duration-300 z-10"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 35, y: reduceMotion ? 0 : -20, scale: 0.9 }}
                animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: reduceMotion ? 0 : 0.5 }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-stone-900 shadow-2xs shrink-0 text-[#0F7A6C]">
                  <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight text-[#0F7A6C] dark:text-[#5ec7b6]">
                    Donees
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 font-medium leading-tight mt-0.5">
                    ask for what they genuinely need
                  </p>
                </div>
              </motion.div>

              {/* Central CauseKind Heart Hub */}
              <motion.div
                className="absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-auto"
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: reduceMotion ? 0 : 0.3,
                }}
              >
                <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-[#1F1612] shadow-[0_6px_24px_rgba(181,72,15,0.22)] border-2 border-[#B5480F]/30 dark:border-[#B5480F]/50">
                  <motion.div
                    animate={reduceMotion ? {} : { scale: [1, 1.12, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Heart className="w-7 h-7 sm:w-8 sm:h-8 fill-[#B5480F] text-[#B5480F] drop-shadow-xs" />
                  </motion.div>
                  <div className="absolute inset-0 rounded-full bg-[#B5480F]/10 animate-ping pointer-events-none" />
                </div>
                <span className="mt-1.5 text-3xs font-extrabold uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] select-none">
                  CauseKind
                </span>
              </motion.div>

              {/* Bottom Card: NGOs (Centered) */}
              <motion.div
                className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[58%] sm:w-[52%] flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#E5F1E9]/90 dark:bg-[#1F6B3F]/15 border border-[#1F6B3F]/30 dark:border-[#1F6B3F]/40 backdrop-blur-xs shadow-xs hover:shadow-md transition-all duration-300 z-10"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 35, scale: 0.9 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: reduceMotion ? 0 : 0.62 }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-stone-900 shadow-2xs shrink-0 text-[#1F6B3F]">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight text-[#1F6B3F] dark:text-[#6cc98f]">
                    NGOs
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-300 font-medium leading-tight mt-0.5">
                    request items for the people they serve
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

