"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import { Reveal } from "./motion/Reveal";
import { useTranslations } from "next-intl";
import { Clock, CheckCircle2, LifeBuoy, ArrowRight } from "lucide-react";
import Link from "next/link";
import { NgoStatusType } from "./useNgoStatus";

interface NgoVerificationFinaleProps {
  status: NgoStatusType;
  wizardHref: string;
}

export function NgoVerificationFinale({ status, wizardHref }: NgoVerificationFinaleProps) {
  const t = useTranslations("NgoLanding");
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Blurred to sharp text highlight (TrueFocus style)
      gsap.fromTo(textRef.current,
        { filter: "blur(10px)", opacity: 0, scale: 0.95 },
        {
          filter: "blur(0px)",
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 60%",
          }
        }
      );
    });
  });

  const getPillData = () => {
    switch (status) {
      case "under_review":
        return { label: t("HeroStateA.viewAppStatus"), href: "/profile/ngo-details" };
      case "changes_requested":
        return { label: t("HeroStateA.fixDocuments"), href: "/profile/ngo-details" };
      case "incomplete":
      default:
        // Use a generic placeholder since we don't have stepNumber here, or "Complete your profile"
        return { label: t("Finale.completePill"), href: wizardHref };
    }
  };

  const pill = getPillData();

  return (
    <section ref={containerRef} className="py-32 bg-[#FBF9F4] dark:bg-[#09090b] relative">
      <div className="max-w-4xl mx-auto px-6 text-center">
        
        <Reveal>
          <div className="relative inline-block mb-16">
            <div className="absolute -inset-4 border border-[var(--color-ngo-300)] dark:border-ngo-700/30 rounded-2xl opacity-50 pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--color-ngo-500)] -translate-x-1 -translate-y-1"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--color-ngo-500)] translate-x-1 -translate-y-1"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--color-ngo-500)] -translate-x-1 translate-y-1"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--color-ngo-500)] translate-x-1 translate-y-1"></div>
            </div>
            
            <h2 ref={textRef} className="text-4xl md:text-6xl font-serif font-black text-stone-900 dark:text-stone-100 tracking-tight px-8 py-4">
              {t("Finale.title")}
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-stone-200 dark:border-zinc-800 shadow-sm mb-12">
          <div>
            <h3 className="font-bold text-xl mb-4">{t("Finale.checklistTitle")}</h3>
            <ul className="space-y-3">
              {[t("Finale.check1"), t("Finale.check2"), t("Finale.check3"), t("Finale.check4")].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-stone-600 dark:text-stone-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center items-start md:items-center bg-stone-50 dark:bg-zinc-950 rounded-2xl p-6 border border-stone-100 dark:border-zinc-800">
            <Clock className="w-10 h-10 text-[var(--color-ngo-400)] mb-4" />
            <p className="font-medium text-lg">{t("Finale.timeEstimate")}</p>
          </div>
        </div>

        {/* Small support strip */}
        <div className="flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400">
          <LifeBuoy className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t("Finale.support")}
          </span>
        </div>

      </div>

      {/* Floating Status-Aware Pill */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Link 
          href={pill.href}
          className="group flex items-center gap-3 bg-[var(--color-ngo-600)] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-ngo-600/30 hover:bg-[var(--color-ngo-700)] transition-all hover:scale-105"
        >
          {pill.label}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
