"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { XCircle, CheckCircle2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function NgoSoundFamiliar() {
  const t = useTranslations("NgoLanding");
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const usualRows = [
    t("SoundFamiliar.usual1"),
    t("SoundFamiliar.usual2"),
    t("SoundFamiliar.usual3"),
    t("SoundFamiliar.usual4"),
  ];

  const causeKindRows = [
    t("SoundFamiliar.causeKind1"),
    t("SoundFamiliar.causeKind2"),
    t("SoundFamiliar.causeKind3"),
    t("SoundFamiliar.causeKind4"),
  ];

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      // Pin the whole section
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: "+=2000", // scroll duration
          pin: true,
          scrub: 1,
        }
      });

      const leftItems = gsap.utils.toArray(".red-x-row");
      const rightItems = gsap.utils.toArray(".green-check-row");

      // Initially hide the right items
      gsap.set(rightItems, { opacity: 0, x: 20 });

      leftItems.forEach((item: any, i) => {
        tl.to(item, { opacity: 0.2, x: -20, duration: 1 }, i * 1);
        tl.to(rightItems[i] as any, { opacity: 1, x: 0, duration: 1 }, i * 1 + 0.5);
      });
    });
  });

  return (
    <section ref={containerRef} className="py-24 bg-stone-50 dark:bg-black overflow-hidden relative">
      <div ref={triggerRef} className="w-full max-w-7xl mx-auto px-6 min-h-screen flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
        
        {/* Left: Chaotic pile / Red X rows */}
        <div ref={leftColRef} className="w-full md:w-1/2 flex flex-col gap-6">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4">
            {t("SoundFamiliar.title")}
          </h2>
          <div className="space-y-6 mt-8">
            {usualRows.map((text, i) => (
              <div key={i} className="red-x-row flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                <p className="text-stone-800 dark:text-stone-200 text-lg font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Clean Verified Card / Green Check rows */}
        <div ref={rightColRef} className="w-full md:w-1/2 flex flex-col gap-6">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 text-left md:text-right">
            {t("SoundFamiliar.theCauseKindWay")}
          </h2>
          <div className="glass-card p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 shadow-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl relative mt-8">
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-[var(--color-ngo-500)] rounded-full flex items-center justify-center text-white shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t("SoundFamiliar.driveTitle")}</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">{t("SoundFamiliar.driveSubtitle")}</p>
            
            <div className="space-y-4">
              {causeKindRows.map((text, i) => (
                <div key={i} className="green-check-row flex items-start gap-3 p-3 bg-ngo-50/70 dark:bg-ngo-900/30 rounded-xl border border-ngo-300/40 dark:border-ngo-700/40">
                  <CheckCircle2 className="w-5 h-5 text-ngo-700 dark:text-ngo-300 shrink-0 mt-0.5" />
                  <p className="text-stone-900 dark:text-stone-100 font-semibold text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}
