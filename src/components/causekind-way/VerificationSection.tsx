"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { UserCheck, Building2, FileCheck2, Clock, CheckCircle, Radio, Sparkles, AlertTriangle, Check } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function VerificationSection() {
  const containerRef = useRef<HTMLElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });

  const individualDocs = [
    "Government ID (Aadhaar / Voter ID / Ration Card)",
    "Proof of address verification",
    "Photo identification and live liveness check",
  ];

  const ngoDocs = [
    "Official registration certificate (Trust / Society / Section 8)",
    "Registered office address documentation",
    "Representative authorisation letter",
    "Official contact verification",
  ];

  const timelineSteps = [
    { label: "Submitted", status: "Step 1", icon: Clock },
    { label: "Under review", sub: "Pending verification", status: "Step 2", icon: Radio },
    { label: "Approved", sub: "Checked & verified", status: "Step 3", icon: CheckCircle, highlight: true },
    { label: "Need goes live", status: "Step 4", icon: Sparkles },
  ];

  useEffect(() => {
    if (typeof window === "undefined" || !lineRef.current || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 65%",
      },
    });

    tl.fromTo(
      lineRef.current,
      { strokeDashoffset: 600 },
      { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" },
      0.2
    );

    if (docRef.current) {
      tl.fromTo(
        docRef.current,
        { left: "10%", opacity: 0 },
        { left: "64%", opacity: 1, duration: 1.4, ease: "power2.inOut" },
        0.3
      );
      tl.fromTo(
        ".ck-stamp-approved",
        { scale: 2.2, opacity: 0, rotation: -25 },
        { scale: 1, opacity: 1, rotation: -12, duration: 0.35, ease: "back.out(2)" },
        1.7
      );
    }

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="verification"
      aria-label="Verification"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-3">
            <span>VERIFICATION</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Every person and NGO is checked before they can post.
          </h2>
        </div>

        {/* Two Columns: Individuals vs NGOs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {/* Column 1: Individuals */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EBF2FA] dark:bg-[#1E3A60]/30 text-[#1E3A60] dark:text-[#7FB0E8] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100">
                Individuals
              </h3>
            </div>
            <ul className="space-y-3">
              {individualDocs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Column 2: NGOs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EBF5EE] dark:bg-[#1F6B3F]/30 text-[#1F6B3F] dark:text-[#52B788] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100">
                NGOs
              </h3>
            </div>
            <ul className="space-y-3">
              {ngoDocs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* 4-Step Horizontal Timeline */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-[#FAF6F0] dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
          <div className="text-3xs sm:text-2xs font-extrabold uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] mb-6 text-center">
            Verification Review Journey
          </div>

          {/* Timeline Line SVG */}
          <div className="relative w-full h-8 flex items-center mb-8 hidden sm:flex">
            <svg className="w-full h-2 overflow-visible" viewBox="0 0 800 8">
              <line
                x1="40"
                y1="4"
                x2="760"
                y2="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="text-stone-300 dark:text-stone-700"
              />
              <line
                ref={lineRef}
                x1="40"
                y1="4"
                x2="760"
                y2="4"
                stroke="#B5480F"
                strokeWidth="2.5"
                strokeDasharray="600"
                strokeDashoffset="600"
              />
            </svg>

            {/* Document icon moving along timeline */}
            <div
              ref={docRef}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-xl bg-white dark:bg-stone-800 shadow-md border border-[#B5480F] flex items-center justify-center z-10 pointer-events-none"
            >
              <FileCheck2 className="w-4 h-4 text-[#B5480F] dark:text-[#F4A25B]" />
            </div>
          </div>

          {/* 4 Steps Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center relative z-20">
            {timelineSteps.map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div
                  key={step.label}
                  className={`p-4 rounded-2xl ${
                    step.highlight
                      ? "bg-[#FBEDE3] dark:bg-[#B5480F]/20 border-2 border-[#B5480F] relative shadow-sm"
                      : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center bg-white dark:bg-stone-800 shadow-2xs">
                    <IconComp
                      className={`w-4 h-4 ${
                        step.highlight
                          ? "text-[#B5480F] dark:text-[#F4A25B]"
                          : "text-stone-600 dark:text-stone-400"
                      }`}
                    />
                  </div>
                  <div className="text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-0.5">
                    {step.status}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    {step.label}
                  </div>
                  {step.sub && (
                    <div className="text-4xs text-stone-500 dark:text-stone-400 font-semibold mt-0.5">
                      {step.sub}
                    </div>
                  )}
                  {step.highlight && (
                    <div className="ck-stamp-approved absolute -top-3 -right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-4xs font-black uppercase tracking-wider shadow-sm rotate-[-12deg] pointer-events-none">
                      VERIFIED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
