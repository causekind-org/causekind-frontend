"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import { SplitHeadline } from "./motion/SplitHeadline";
import { Reveal } from "./motion/Reveal";
import { LockedCta } from "./LockedCta";
import { Button } from "@/components/ui/button";
import { NgoStatusType } from "./useNgoStatus";
import { HeroMedia } from "./HeroMedia";
import Link from "next/link";
import { CheckCircle2, FileText, UploadCloud, Clock, ShieldCheck } from "lucide-react";

interface NgoHeroStateAProps {
  status: NgoStatusType;
  stepNumber: number;
  totalSteps: number;
  wizardHref: string;
}

export function NgoHeroStateA({ status, stepNumber, totalSteps, wizardHref }: NgoHeroStateAProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const trustStripRef = useRef<HTMLDivElement>(null);

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Subtle zoom on the background image
      gsap.to(parallaxRef.current, {
        scale: 1.05,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Trust strip docking effect
      gsap.fromTo(trustStripRef.current, 
        { y: 50, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 1, 
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          }
        }
      );
    });
  });

  const getPrimaryCta = () => {
    switch (status) {
      case "under_review":
        return { label: "View application status", href: "/profile/ngo-details" };
      case "changes_requested":
        return { label: "Fix your documents", href: "/profile/ngo-details" };
      case "incomplete":
      default:
        return { label: "Start your application", href: wizardHref };
    }
  };

  const primaryCta = getPrimaryCta();

  return (
    <section ref={containerRef} className="relative w-full h-[90vh] min-h-[600px] flex flex-col justify-end overflow-hidden pt-[var(--ck-nav-h,64px)]">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 z-0">
        <div ref={parallaxRef} className="absolute inset-0 origin-center scale-100">
          <HeroMedia 
            src="/images/ngo-hero-landing.webp" 
            alt="NGO working with community" 
            priority 
          />
        </div>
      </div>

      {/* Gradient Scrim for Text Readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-stone-900/80 via-stone-900/50 to-transparent dark:from-black/90 dark:via-black/60" />

      {/* Content Container */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pb-24 md:pb-32 flex flex-col items-start justify-end h-full">
        <div className="max-w-2xl">
          <SplitHeadline 
            text="Post what you need." 
            className="text-5xl md:text-6xl lg:text-7xl font-serif text-white font-bold leading-tight tracking-tight mb-2" 
          />
          <Reveal delay={0.4}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white font-bold leading-tight tracking-tight mb-8">
              <span className="text-[var(--color-ngo-400)] italic">Connect with givers nearby.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.6} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-2 pr-6 rounded-full">
              {/* Progress Ring / Status Chip */}
              <div className="w-12 h-12 relative flex items-center justify-center bg-white rounded-full shrink-0">
                {status === "incomplete" ? (
                  <div className="relative w-full h-full flex items-center justify-center text-stone-900 font-bold text-sm">
                    {stepNumber}/{totalSteps}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 text-[var(--color-ngo-500)]" viewBox="0 0 36 36">
                      <path
                        className="text-stone-200"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        strokeWidth="3"
                        strokeDasharray={`${(stepNumber / totalSteps) * 100}, 100`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                ) : status === "under_review" ? (
                  <Clock className="w-6 h-6 text-amber-500" />
                ) : (
                  <FileText className="w-6 h-6 text-red-500" />
                )}
              </div>
              
              <Button asChild className="rounded-full bg-[var(--color-ngo-500)] hover:bg-[var(--color-ngo-600)] text-white border-0 h-10 px-6 font-semibold">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.8} className="pl-4">
            <LockedCta variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 px-0">
              Start a Drive
            </LockedCta>
          </Reveal>
        </div>
      </div>

      {/* Trust Strip Docking */}
      <div className="absolute bottom-0 left-0 w-full z-20">
        <div ref={trustStripRef} className="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-stone-200 dark:border-zinc-800 py-4">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4 text-sm font-medium text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[var(--color-ngo-600)]" /> Legally Verified</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[var(--color-ngo-600)]" /> Agreed Handover</div>
            <div className="flex items-center gap-2"><UploadCloud className="w-4 h-4 text-[var(--color-ngo-600)]" /> Receipt Photos</div>
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[var(--color-ngo-600)]" /> Matched Near You</div>
          </div>
        </div>
      </div>
    </section>
  );
}
