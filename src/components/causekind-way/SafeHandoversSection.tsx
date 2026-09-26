"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users, KeyRound, AlertOctagon, CheckCircle2, Award, ShieldCheck, Heart } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function SafeHandoversSection() {
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });

  const points = [
    {
      title: "Meet in person",
      desc: "We recommend meeting in a safe, familiar public place nearby.",
      icon: Users,
    },
    {
      title: "Confirm with a one-time code",
      desc: "A 6-digit code confirms the item reached the right person in real time.",
      icon: KeyRound,
    },
    {
      title: "Report anything",
      desc: "You can report a problem or request assistance at any step of the handover.",
      icon: AlertOctagon,
    },
  ];

  const digits = ["4", "8", "2", "9", "1", "7"];

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
      },
    });

    // Animate OTP entry digit by digit
    digits.forEach((_, i) => {
      tl.to(
        `.ck-otp-digit-${i}`,
        {
          opacity: 1,
          scale: 1,
          duration: 0.2,
          ease: "back.out(2)",
        },
        0.3 + i * 0.22
      );
    });

    // Success checkmark reveal
    tl.to(
      ".ck-phone-otp-box",
      {
        opacity: 0,
        y: -10,
        duration: 0.3,
      },
      1.9
    );

    tl.to(
      ".ck-phone-success",
      {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: "back.out(2)",
      },
      2.1
    );

    // Mini certificate slides up
    tl.to(
      ".ck-phone-cert",
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
      },
      2.4
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="the-handover"
      aria-label="Safe Handovers"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-3">
            <span>THE HANDOVER</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Every handover is confirmed in the app.
          </h2>
        </div>

        {/* Content: Left Points, Right Phone Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: 3 Handover Points */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            {points.map((point, idx) => {
              const IconComp = point.icon;
              return (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, x: -25 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
                  className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 shadow-sm flex items-start gap-4 group hover:border-[#B5480F]/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#FBEDE3] dark:bg-[#B5480F]/20 text-[#B5480F] dark:text-[#F4A25B] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 mb-1">
                      {point.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                      {point.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: Phone Mockup (HTML/CSS) */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div className="relative w-[280px] sm:w-[310px] h-[480px] sm:h-[520px] rounded-[42px] bg-stone-900 p-3 shadow-2xl border-4 border-stone-800 flex flex-col justify-between overflow-hidden">
              {/* Phone Camera Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30" />

              {/* Screen Content */}
              <div className="relative w-full h-full rounded-[32px] bg-[#FAF8F5] dark:bg-[#15110E] p-4 pt-8 flex flex-col justify-between overflow-hidden text-center">
                {/* App Header */}
                <div>
                  <div className="flex items-center justify-center gap-1 text-3xs font-black uppercase tracking-widest text-[#B5480F] mb-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>CauseKind Handover</span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Enter Handover Code
                  </h4>
                </div>

                {/* 6-Digit OTP Box (Animates in) */}
                <div className="ck-phone-otp-box my-auto flex flex-col items-center">
                  <p className="text-4xs text-stone-500 dark:text-stone-400 font-medium mb-3">
                    Enter the 6-digit code given during handover:
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    {digits.map((digit, i) => (
                      <div
                        key={i}
                        className={`w-8 h-10 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 flex items-center justify-center shadow-xs text-sm font-black text-stone-900 dark:text-stone-100`}
                      >
                        <span className={`ck-otp-digit-${i} opacity-0 scale-50`}>{digit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success State Overlay */}
                <div className="ck-phone-success absolute inset-0 bg-[#FAF8F5] dark:bg-[#15110E] flex flex-col items-center justify-center p-4 opacity-0 scale-90 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    Handover Confirmed!
                  </h4>
                  <p className="text-4xs text-stone-500 dark:text-stone-400 mt-1">
                    Matched item successfully transferred.
                  </p>
                </div>

                {/* Mini Impact Certificate Sliding Up */}
                <div className="ck-phone-cert absolute inset-x-3 bottom-3 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-[#B5480F]/30 shadow-lg translate-y-full opacity-0 pointer-events-none text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-4xs font-black uppercase tracking-wider text-[#B5480F]">
                      Impact Certificate
                    </span>
                    <Award className="w-3.5 h-3.5 text-[#B5480F]" />
                  </div>
                  <p className="text-4xs font-bold text-stone-800 dark:text-stone-200">
                    Verified Direct Giving Handover
                  </p>
                  <p className="text-5xs text-stone-400 mt-0.5">
                    ID: CK-VERIFIED-LOCAL
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
