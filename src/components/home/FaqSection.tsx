"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  HelpCircle,
  Plus,
  ArrowRight,
  MessageCircle,
  Mail,
} from "lucide-react";
import { OPERATING_CITIES, CONTACT_INFO, LANDING_ROUTES } from "@/lib/landingConstants";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-free",
    question: "Is CauseKind free?",
    answer: "Yes. It's completely free for donors, donees and NGOs.",
  },
  {
    id: "faq-donate",
    question: "What can I donate?",
    answer:
      "Useful items like books, clothes, furniture, electronics, household and sports items, and more. Used items are welcome. Just describe the condition honestly when you list it, including anything that needs repair.",
  },
  {
    id: "faq-money",
    question: "Do you accept money?",
    answer: "Not yet. We're starting with items only. Online donations and fundraising are coming soon.",
  },
  {
    id: "faq-verify",
    question: "How do you verify people?",
    answer:
      "Individuals are checked with ID and address. NGOs are checked with their official registration documents. Every request is reviewed by our team before it goes live.",
  },
  {
    id: "faq-address",
    question: "Will my address be shared?",
    answer:
      "No. Only your area is shown publicly. Handover details are shared only between the donor and the person receiving, once a match is confirmed.",
  },
  {
    id: "faq-handover",
    question: "How does the handover work?",
    answer:
      "You meet in person to hand over the item, and confirm it in the app with a one-time code. We recommend meeting in a public place.",
  },
  {
    id: "faq-cancelled",
    question: "What if the handover doesn't happen?",
    answer: "You can cancel, and the need goes back live for other donors.",
  },
  {
    id: "faq-cities",
    question: "Which cities are you in?",
    answer: `We're currently live in ${OPERATING_CITIES.join(", ")}, with more cities coming soon.`,
  },
];

export function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [typedLabel, setTypedLabel] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // JSON-LD Structured Data for FAQPage Schema
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setTypedLabel("QUESTIONS");
      return;
    }

    const ctx = gsap.context(() => {
      // Typewriter effect for Label
      const fullLabel = "QUESTIONS";
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          let charIdx = 0;
          const interval = setInterval(() => {
            charIdx++;
            setTypedLabel(fullLabel.substring(0, charIdx));
            if (charIdx >= fullLabel.length) clearInterval(interval);
          }, 60);

          // Masked reveal for heading
          if (headingRef.current) {
            gsap.fromTo(
              headingRef.current,
              { y: 25, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.2 }
            );
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
    // Refresh ScrollTrigger as heights recalculate
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 280);
  };

  return (
    <section
      ref={sectionRef}
      id="faq"
      aria-label="Frequently Asked Questions"
      className="relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] border-t border-stone-200/80 dark:border-stone-800/80 min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 overflow-hidden"
    >
      {/* FAQ Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* Ambient background glow */}
      <div
        className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-[#B5480F]/5 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full flex flex-col justify-between h-full gap-5 lg:gap-6">
        {/* Main 2-Column Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ════════ LEFT COLUMN (35% / 4-5 cols): Header + Contact Box ════════ */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 sm:space-y-5 lg:sticky lg:top-24">
            <div>
              {/* Eyebrow Label with Typewriter */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#B5480F]" aria-hidden="true" />
                <span className="font-mono min-w-[70px]">{typedLabel || "\u00A0"}</span>
              </div>

              {/* Heading */}
              <h2
                ref={headingRef}
                className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-stone-900 dark:text-stone-100 tracking-tight leading-tight"
              >
                Good questions. <br className="hidden sm:inline" />
                <span className="text-[#B5480F] dark:text-[#E07A5F]">Simple answers.</span>
              </h2>

              {/* Left description text */}
              <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md leading-relaxed">
                Everything you need to know before you give or ask for help.
              </p>
            </div>

            {/* "Still have questions?" Contact Box */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#181411] border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div
                className="absolute top-0 left-0 w-1 h-full bg-[#B5480F] rounded-l-2xl"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Still have questions?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                We're happy to help.
              </p>

              {/* Quick Contact Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <a
                  href={CONTACT_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-emerald-500/20 transition-all duration-200 active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>WhatsApp us</span>
                </a>

                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition-all duration-200 active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5 text-[#B5480F]" aria-hidden="true" />
                  <span>Email us</span>
                </a>
              </div>

              {/* See all FAQs text link */}
              <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80">
                <Link
                  href={LANDING_ROUTES.faq}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#B5480F] dark:text-[#E07A5F] hover:underline group/link"
                >
                  <span>See all FAQs</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ════════ RIGHT COLUMN (65% / 7 cols): Accordion List ════════ */}
          <div className="lg:col-span-7 flex flex-col space-y-1.5 sm:space-y-2">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              const buttonId = `faq-btn-${item.id}`;
              const panelId = `faq-panel-${item.id}`;

              return (
                <div
                  key={item.id}
                  className={`relative rounded-xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-[#B5480F]/[0.035] dark:bg-[#B5480F]/10 border-[#B5480F]/30 dark:border-[#B5480F]/40 shadow-xs"
                      : "bg-white dark:bg-[#181411] border-stone-200/90 dark:border-stone-800/90 hover:border-stone-300 dark:hover:border-stone-700"
                  }`}
                >
                  {/* Left Orange Border Indicator */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-[#B5480F] transition-all duration-300 ${
                      isOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                    } origin-top`}
                    aria-hidden="true"
                  />

                  {/* Accessible Accordion Button */}
                  <button
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleAccordion(idx)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 text-left transition-all duration-200 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#B5480F] min-h-[44px]"
                  >
                    <span
                      className={`text-xs sm:text-[13px] lg:text-sm font-bold transition-all duration-200 flex-1 ${
                        isOpen
                          ? "text-[#B5480F] dark:text-[#E07A5F]"
                          : "text-stone-850 dark:text-stone-150 group-hover:text-stone-950 dark:group-hover:text-white group-hover:translate-x-0.5"
                      }`}
                    >
                      {item.question}
                    </span>

                    {/* Rotating Plus / Close Icon */}
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isOpen
                          ? "bg-[#B5480F]/15 text-[#B5480F] dark:bg-[#B5480F]/25 dark:text-[#E07A5F] rotate-45"
                          : "text-stone-400 group-hover:text-[#B5480F] group-hover:bg-stone-100 dark:group-hover:bg-stone-800"
                      }`}
                      aria-hidden="true"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </button>

                  {/* Accordion Content Panel */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="grid transition-[grid-template-rows] duration-250 ease-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-[12.5px] lg:text-[13px] text-stone-600 dark:text-stone-300 font-normal leading-relaxed px-3.5 pb-3 sm:px-4 sm:pb-3.5 pt-0.5 border-t border-stone-100/70 dark:border-stone-800/40">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
