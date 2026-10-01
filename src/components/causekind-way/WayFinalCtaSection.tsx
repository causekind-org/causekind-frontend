"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Heart, HandHeart, Building2, ArrowRight, Sparkles } from "lucide-react";
import { LANDING_ROUTES, HOME_ROLE_COLORS } from "@/lib/landingConstants";

export function WayFinalCtaSection() {
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  return (
    <section
      ref={containerRef}
      id="way-final-cta"
      aria-label="Ready to Join CauseKind"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] overflow-hidden"
    >
      <div className="relative max-w-5xl mx-auto w-full">
        {/* Aurora Card */}
        <div className="relative rounded-[36px] bg-[#1C1410] dark:bg-[#1E1713] border border-stone-800 shadow-2xl p-8 sm:p-12 lg:p-14 text-center overflow-hidden">
          {/* Aurora Glow Blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute top-[-20%] left-[15%] w-[380px] h-[380px] rounded-full bg-[#B5480F]/30 blur-3xl" />
            <div className="absolute bottom-[-20%] right-[15%] w-[380px] h-[380px] rounded-full bg-[#F4A25B]/25 blur-3xl" />
            <div className="absolute top-[35%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[#1E3A60]/30 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            {/* Sparkle Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs sm:text-2xs font-bold tracking-widest uppercase bg-white/10 text-amber-200 border border-white/15 mb-4 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A25B]" />
              <span>DIRECT GIVING IN INDIA</span>
            </div>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-4">
              Ready to give, ask, or help your community?
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 font-medium leading-relaxed max-w-lg mb-8">
              Join free in a minute. Connect with verified people and NGOs near you. No cash. No middlemen.
            </p>

            {/* 3 Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-6">
              {/* Button 1: Donor */}
              <Link
                href={LANDING_ROUTES.donorRegister}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#B5480F] hover:bg-[#C95413] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 group"
              >
                <Heart className="w-4 h-4" />
                <span>Join as Donor</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Button 2: Donee */}
              <Link
                href={LANDING_ROUTES.doneeRegister}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#1E3A60] hover:bg-[#2D5A96] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 group"
              >
                <HandHeart className="w-4 h-4" />
                <span>Join as a Donee</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Button 3: NGO */}
              <Link
                href={LANDING_ROUTES.ngoRegister}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#1F6B3F] hover:bg-[#27824D] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 group"
              >
                <Building2 className="w-4 h-4" />
                <span>Register your NGO</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* FAQ Text Link */}
            <Link
              href={LANDING_ROUTES.faq}
              className="text-xs sm:text-sm font-bold text-amber-200 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>Have questions? Read our FAQ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
