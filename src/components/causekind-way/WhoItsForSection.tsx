"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Gift, HeartHandshake, Building2, ArrowRight } from "lucide-react";
import { HOME_ROLE_COLORS } from "@/lib/landingConstants";

export function WhoItsForSection() {
  const containerRef = useRef<HTMLElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });

  const roleCards = [
    {
      role: "DONOR",
      title: "Donors",
      subtitle: "Give items you no longer need",
      points: [
        "Post useful items lying unused at home",
        "Browse verified local needs within 10 km",
        "Receive a verified digital Impact Certificate",
      ],
      btnText: "Join as Donor",
      href: "/register?role=DONOR",
      icon: Gift,
      color: HOME_ROLE_COLORS.donor.main,
      darkColor: HOME_ROLE_COLORS.donor.darkAccent,
      bgSoft: "bg-[#FBEDE3] dark:bg-[#B5480F]/15",
      borderClass: "border-[#B5480F]/40 dark:border-[#B5480F]/50",
      btnClass: "bg-[#B5480F] hover:bg-[#C95413] text-white",
    },
    {
      role: "DONEE",
      title: "Donees",
      subtitle: "Ask for what you genuinely need",
      points: [
        "Request specific physical items with zero cost",
        "Protected privacy — no public begging",
        "Direct handover from verified donors nearby",
      ],
      btnText: "Join as a Donee",
      href: "/register?role=DONEE",
      icon: HeartHandshake,
      color: HOME_ROLE_COLORS.donee.main,
      darkColor: HOME_ROLE_COLORS.donee.darkAccent,
      bgSoft: "bg-[#EBF2FA] dark:bg-[#1E3A60]/20",
      borderClass: "border-[#1E3A60]/40 dark:border-[#7FB0E8]/40",
      btnClass: "bg-[#1E3A60] dark:bg-[#2D5A96] hover:bg-[#2D5A96] dark:hover:bg-[#4A7FC1] text-white",
    },
    {
      role: "NGO",
      title: "NGOs",
      subtitle: "Request items for the people you serve",
      points: [
        "Post bulk or specialized community needs",
        "Connect with local neighbourhood donors",
        "Streamlined handover verification for transparency",
      ],
      btnText: "Register your NGO",
      href: "/register?role=NGO",
      icon: Building2,
      color: HOME_ROLE_COLORS.ngo.main,
      darkColor: HOME_ROLE_COLORS.ngo.darkAccent,
      bgSoft: "bg-[#EBF5EE] dark:bg-[#1F6B3F]/20",
      borderClass: "border-[#1F6B3F]/40 dark:border-[#52B788]/40",
      btnClass: "bg-[#1F6B3F] hover:bg-[#14482A] text-white",
    },
  ];

  return (
    <section
      ref={containerRef}
      id="who-its-for"
      aria-label="Who It's For"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-12 sm:py-16 px-5 sm:px-8 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/30 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] mb-3">
            <span>WHO IT&apos;S FOR</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Three ways to be part of CauseKind.
          </h2>
        </div>

        {/* 3 Role Cards with Dealt-in Stagger */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {roleCards.map((card, idx) => {
            const IconComp = card.icon;
            return (
              <motion.div
                key={card.role}
                initial={{ opacity: 0, y: 40, rotate: (idx - 1) * -3 }}
                animate={isInView ? { opacity: 1, y: 0, rotate: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + idx * 0.18, ease: "easeOut" }}
                className={`relative p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900/90 border-2 ${card.borderClass} shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden`}
              >
                {/* Subtle top role tint */}
                <div className={`absolute top-0 inset-x-0 h-2 ${card.bgSoft}`} />

                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl ${card.bgSoft} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                    style={{ color: card.color }}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-semibold mb-5">
                    {card.subtitle}
                  </p>

                  <ul className="space-y-2.5 mb-8">
                    {card.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: card.color }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={card.href}
                  className={`w-full py-3 px-4 rounded-xl ${card.btnClass} font-extrabold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 group/btn`}
                >
                  <span>{card.btnText}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
