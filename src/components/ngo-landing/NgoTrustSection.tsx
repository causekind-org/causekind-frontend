"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  ShieldCheck,
  MapPin,
  Handshake,
  Camera,
  Star,
  CheckCircle,
  Lock,
  Share2,
} from "lucide-react";
import { FlipCard } from "@/components/animata/card/flip-card";
import { useNgoStatus } from "./useNgoStatus";
import { NgoSectionLabel } from "./NgoSectionLabel";

interface TrustCardItem {
  id: string;
  step: string;
  icon: React.ElementType;
  title: string;
  shortLine: string;
}

const TRUST_CARDS: TrustCardItem[] = [
  {
    id: "ai-screening",
    step: "01",
    icon: Bot,
    title: "AI Screening",
    shortLine: "File checks and AI signals support human review.",
  },
  {
    id: "legal-checks",
    step: "02",
    icon: ShieldCheck,
    title: "Legal Checks",
    shortLine: "Registration and ID checked before any request.",
  },
  {
    id: "local-matching",
    step: "03",
    icon: MapPin,
    title: "Local Matching",
    shortLine: "Nearby matches depend on item availability and location.",
  },
  {
    id: "safe-dropoffs",
    step: "04",
    icon: Handshake,
    title: "Safe Drop-offs",
    shortLine: "Agree the handover details after a match is accepted.",
  },
  {
    id: "proof-required",
    step: "05",
    icon: Camera,
    title: "Proof Required",
    shortLine: "No proof, no next request.",
  },
];

export function NgoTrustSection() {
  const { isVerified, ngoName, isLoading, error } = useNgoStatus();
  const [activeFlippedCardId, setActiveFlippedCardId] = useState<string | null>(null);

  const handleCardFlip = (cardId: string, willFlip: boolean) => {
    setActiveFlippedCardId(willFlip ? cardId : null);
  };

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 text-stone-900 dark:text-stone-100">
      {/* Seamless background gradient transition */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(238,248,242,0.4) 0%, rgba(247,240,232,0.6) 50%, rgba(238,248,242,0.3) 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">

        {/* Section Header (before verification only) */}
        {!isVerified && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-center max-w-3xl mx-auto"
          >
            <NgoSectionLabel align="center">How verification works</NgoSectionLabel>

            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-tight [text-wrap:balance]"
              style={{
                fontFamily: "var(--font-source-serif-4), var(--font-lora), serif",
                textWrap: "balance",
              }}
            >
              What we check{" "}
              <span className="italic text-ngo-700 dark:text-ngo-300">at every step.</span>
            </h2>
          </motion.div>
        )}

        {/* 5-Card Single Row Interactive Flip Grid (before verification ONLY) */}
        {!isVerified && (
          <div className="flex lg:grid lg:grid-cols-5 overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory scrollbar-none gap-3 sm:gap-4 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {TRUST_CARDS.map((card, i) => {
              const Icon = card.icon;
              const isFlipped = activeFlippedCardId === card.id;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="w-[160px] min-w-[160px] lg:w-full lg:min-w-0 shrink-0 lg:shrink snap-start h-[180px]"
                >
                  <FlipCard
                    isFlipped={isFlipped}
                    onFlipChange={(flipped) => handleCardFlip(card.id, flipped)}
                    ariaLabel={`Step ${card.step}: ${card.title}. ${card.shortLine}`}
                    className="h-full"
                    cardClassName="h-full"
                    front={
                      <div className="h-full rounded-2xl border border-ngo-100 dark:border-zinc-800 hover:border-ngo-300 dark:hover:border-ngo-700 bg-white dark:bg-zinc-900 p-4 shadow-xs transition-colors duration-200 flex flex-col items-center justify-center text-center">
                        {/* Step Number */}
                        <span className="text-2xs sm:text-xs font-mono font-bold tracking-widest text-ngo-600 dark:text-ngo-400 mb-1.5 select-none">
                          {card.step}
                        </span>

                        {/* Centered Icon */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ngo-50 dark:bg-ngo-900/40 text-ngo-700 dark:text-ngo-300 mb-2.5 shadow-2xs">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </div>

                        {/* Title */}
                        <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                          {card.title}
                        </h3>
                      </div>
                    }
                    back={
                      <div className="h-full rounded-2xl bg-ngo-900 text-white p-3.5 sm:p-4 shadow-xs flex flex-col items-center justify-center text-center border border-ngo-800">
                        <span className="text-3xs sm:text-2xs font-bold text-ngo-300 uppercase tracking-wider mb-1.5">
                          {card.title}
                        </span>
                        <p className="text-2xs sm:text-xs leading-relaxed text-white text-center font-medium">
                          {card.shortLine}
                        </p>
                      </div>
                    }
                  />
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="rounded-3xl border border-ngo-200 p-6 dark:border-zinc-700">
          <h3 className="text-xl font-bold">Your organization’s verification</h3>
          <p className="mt-3 text-sm">{isLoading ? "Checking your application…" : error ? "We couldn’t check your application. Please retry from your profile." : isVerified ? `${ngoName} has an approved CauseKind application. Each new item request is reviewed separately.` : "Complete your application and email verification. Our team reviews the organization before request posting is enabled."}</p>
          <Link href="/profile/ngo-details" className="mt-4 inline-block text-sm font-semibold underline">View your application</Link>
        </div>
      </div>
    </section>
  );
}

export default NgoTrustSection;
