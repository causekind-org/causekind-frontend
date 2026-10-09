"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { Reveal } from "./motion/Reveal";
import { useReducedMotion, motion } from "framer-motion";
import {
  FileText,
  Handshake,
  CheckCircle2,
  Camera,
  Award,
  RotateCcw,
  Check,
  MapPin,
  ShieldCheck
} from "lucide-react";
import { NgoSectionLabel } from "./NgoSectionLabel";

gsap.registerPlugin(ScrollTrigger);

export function NgoJourneyPinned() {
  const t = useTranslations("NgoLanding");
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const chapters = [
    { 
      id: 1,
      title: t("Journey.chapter1"), 
      desc: t("Journey.desc1"),
      icon: FileText,
      image: null
    },
    { 
      id: 2,
      title: t("Journey.chapter2"), 
      desc: t("Journey.desc2"),
      icon: MapPin,
      image: null
    },
    { 
      id: 3,
      title: t("Journey.chapter3"), 
      desc: t("Journey.desc3"),
      icon: Handshake,
      image: null
    },
    { 
      id: 4,
      title: t("Journey.chapter4"), 
      desc: t("Journey.desc4"),
      icon: Camera,
      image: "/images/journey/item-proof-blankets.webp"
    },
    { 
      id: 5,
      title: t("Journey.chapter5"), 
      desc: t("Journey.desc5"),
      icon: Award,
      image: "/images/hero-1.webp"
    },
  ];

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const slides = gsap.utils.toArray(".journey-step-desktop");
      const visuals = gsap.utils.toArray(".journey-visual-desktop");
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: "top top",
          end: `+=${slides.length * 800}`,
          pin: true,
          scrub: 1,
        }
      });

      // Initially hide all except first
      gsap.set(slides.slice(1), { opacity: 0.3 });
      gsap.set(visuals.slice(1), { opacity: 0, scale: 0.9 });
      gsap.set(visuals[0] as any, { opacity: 1, scale: 1 });

      slides.forEach((slide: any, i) => {
        if (i === 0) return; // First slide is already visible

        // Progress line fill
        tl.to(".journey-progress-fill", {
          height: `${(i / (slides.length - 1)) * 100}%`,
          ease: "none",
          duration: 1
        }, i * 1);

        // Fade out previous visual, fade in current
        tl.to(visuals[i - 1] as any, { opacity: 0, scale: 0.9, duration: 0.5 }, i * 1 - 0.5);
        tl.to(visuals[i] as any, { opacity: 1, scale: 1, duration: 0.5 }, i * 1);

        // Highlight current text step
        tl.to(slides[i - 1] as any, { opacity: 0.3, duration: 0.5 }, i * 1 - 0.5);
        tl.to(slide, { opacity: 1, duration: 0.5 }, i * 1);
      });
    });
  });

  // Mobile / Reduced Motion Fallback State
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(!shouldReduceMotion);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isMobile && !shouldReduceMotion) return;
    if (!isAutoPlaying) return;

    const stepDuration = 2500;
    const tickInterval = 50;
    const increment = (tickInterval / stepDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStepIndex((prevStep) => {
            if (prevStep < chapters.length - 1) {
              return prevStep + 1;
            } else {
              setIsAutoPlaying(false);
              return prevStep;
            }
          });
          return 0;
        }
        return prev + increment;
      });
    }, tickInterval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, isMobile, shouldReduceMotion, chapters.length]);

  const activeStep = chapters[activeStepIndex];
  const ActiveIcon = activeStep?.icon || FileText;

  // The visual renderers for each step
  const renderVisual = (step: any, index: number) => {
    switch (index) {
      case 0: // Drive card appears
        return (
          <div className="w-full h-full bg-stone-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center p-8 border border-stone-200 dark:border-zinc-700 shadow-inner relative overflow-hidden">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-lg border border-stone-100 dark:border-zinc-800">
              <div className="h-4 w-1/3 bg-stone-200 dark:bg-zinc-700 rounded mb-4"></div>
              <div className="h-6 w-3/4 bg-stone-200 dark:bg-zinc-700 rounded mb-6"></div>
              <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-2 mb-2">
                <div className="bg-[var(--color-ngo-500)] h-2 rounded-full w-0 animate-[fillBar_2s_ease-out_forwards]"></div>
              </div>
            </div>
          </div>
        );
      case 1: // Donor pins pulse inside a 10 km radius ring
        return (
          <div className="w-full h-full bg-[#E5E3DF] dark:bg-[#1A1A1A] rounded-2xl flex items-center justify-center border border-stone-200 dark:border-zinc-700 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            {/* 10km radius ring */}
            <div className="w-64 h-64 border-2 border-[var(--color-ngo-400)] rounded-full absolute bg-green-500/10 flex items-center justify-center">
              <div className="w-4 h-4 bg-[var(--color-ngo-600)] rounded-full animate-ping absolute"></div>
              <MapPin className="w-8 h-8 text-[var(--color-ngo-600)] absolute -top-8 animate-bounce" />
            </div>
          </div>
        );
      case 2: // Handshake + OTP receipt
        return (
          <div className="w-full h-full bg-stone-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-stone-200 dark:border-zinc-700 relative overflow-hidden">
            <div className="flex items-center gap-8">
              <div className="w-24 h-32 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-stone-200 p-4 flex flex-col justify-between">
                <div className="w-8 h-8 rounded-full bg-stone-100 mx-auto"></div>
                <div className="h-2 w-full bg-stone-200 rounded"></div>
              </div>
              <Handshake className="w-16 h-16 text-[var(--color-ngo-500)]" />
              <div className="w-24 h-32 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-stone-200 p-4 flex flex-col justify-center items-center">
                <span className="font-mono text-xl font-bold tracking-widest">****</span>
                <span className="text-[10px] text-stone-400 mt-2">OTP Match</span>
              </div>
            </div>
          </div>
        );
      case 3: // Photo stamped "Received"
        return (
          <div className="w-full h-full bg-stone-100 dark:bg-zinc-800 rounded-2xl border border-stone-200 dark:border-zinc-700 relative overflow-hidden group">
            {step.image ? (
              <Image src={step.image} alt={step.title} fill className="object-cover opacity-80" sizes="(max-width: 768px) 100vw, 400px" />
            ) : (
              <div className="absolute inset-0 bg-stone-200 dark:bg-zinc-700" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-4 border-white/80 text-white/90 text-4xl font-black uppercase tracking-widest p-4 rotate-[-15deg] backdrop-blur-sm bg-white/10 shadow-2xl rounded scale-150 opacity-0 animate-[stamp_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_1s_forwards]">
                Received
              </div>
            </div>
          </div>
        );
      case 4: // Certificate drops in
        return (
          <div className="w-full h-full bg-stone-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-stone-200 dark:border-zinc-700 relative overflow-hidden perspective-1000">
            <div className="w-64 h-80 bg-[#FBF9F4] shadow-2xl rounded-sm p-6 border-8 border-[#F0EBE1] flex flex-col items-center animate-[dropIn_1s_cubic-bezier(0.25,1,0.5,1)_forwards] rotate-y-[-10deg]">
              <ShieldCheck className="w-16 h-16 text-amber-500 mb-4" />
              <h4 className="font-serif font-bold text-lg text-stone-900 mb-2">Impact Certificate</h4>
              <div className="w-full h-1 bg-stone-200 mb-4"></div>
              <div className="h-2 w-3/4 bg-stone-200 rounded mb-2"></div>
              <div className="h-2 w-1/2 bg-stone-200 rounded"></div>
              <div className="mt-auto w-12 h-12 border-4 border-red-500/20 rounded-full flex items-center justify-center self-end">
                <span className="text-red-500/40 text-[8px] font-bold uppercase rotate-[-20deg]">Verified</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section ref={containerRef} className="bg-[#FBF9F4] dark:bg-[#09090b] relative overflow-hidden py-16 md:py-0">
      
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP (PINNED / SCROLL-DRIVEN)
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block w-full h-screen relative" ref={pinRef}>
        <div className="absolute top-16 w-full text-center z-10 px-6">
          <NgoSectionLabel align="center">{t("Journey.illustrativeJourney")}</NgoSectionLabel>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
            {t("Journey.title")}
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CK-REQ-8821 ({t("Journey.sample")})
            </span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto h-full flex items-center px-6 pt-32">
          {/* Left Text Column */}
          <div className="w-1/2 h-full flex flex-col justify-center relative">
            <div className="absolute left-6 top-[20%] bottom-[20%] w-0.5 bg-stone-200 dark:bg-zinc-800 -z-0">
              <div className="journey-progress-fill w-full bg-[var(--color-ngo-700)] transition-all duration-300" style={{ height: "0%" }} />
            </div>

            <div className="space-y-16 relative z-10 pl-16">
              {chapters.map((chapter, i) => {
                const Icon = chapter.icon;
                return (
                  <div key={chapter.id} className="journey-step-desktop">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="h-12 w-12 rounded-full bg-white dark:bg-zinc-900 border border-stone-200 shadow-sm flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-[var(--color-ngo-600)]" />
                      </div>
                      <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{chapter.title}</h3>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 pl-16 text-lg">{chapter.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="w-1/2 h-[60vh] relative">
            {chapters.map((chapter, i) => (
              <div key={chapter.id} className="journey-visual-desktop absolute inset-0 w-full h-full">
                {renderVisual(chapter, i)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE / REDUCED MOTION (CLICK-THROUGH STEPPER)
          ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden px-4">
        <div className="text-center mb-8">
          <NgoSectionLabel align="center">{t("Journey.illustrativeJourney")}</NgoSectionLabel>
          <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
            {t("Journey.title")}
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
              CK-REQ-8821 ({t("Journey.sample")})
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white dark:bg-zinc-900 p-6 shadow-xl flex flex-col min-h-[400px]">
          {/* Active Step Visual */}
          <motion.div
            key={`mobile-visual-${activeStepIndex}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-48 rounded-xl overflow-hidden mb-6 relative"
          >
            {renderVisual(activeStep, activeStepIndex)}
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-ngo-50 text-ngo-700 flex items-center justify-center">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {activeStep?.title}
              </h4>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {activeStep?.desc}
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-ngo-700)] transition-all"
                  style={{
                    width: shouldReduceMotion ? "100%" : isAutoPlaying ? `${progress}%` : "100%",
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setActiveStepIndex(0);
                setProgress(0);
                setIsAutoPlaying(true);
              }}
              className="text-xs font-bold text-[var(--color-ngo-700)] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {t("Journey.replay")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Add these to global CSS or inline styles for the animations
const styles = `
  @keyframes stamp {
    0% { transform: scale(3) rotate(-30deg); opacity: 0; }
    10% { opacity: 1; }
    100% { transform: scale(1) rotate(-15deg); opacity: 1; }
  }
  @keyframes dropIn {
    0% { transform: translateY(-100px) rotateX(-20deg) rotateY(-10deg); opacity: 0; }
    100% { transform: translateY(0) rotateX(0) rotateY(-10deg); opacity: 1; }
  }
  @keyframes fillBar {
    0% { width: 0%; }
    100% { width: 75%; }
  }
`;
