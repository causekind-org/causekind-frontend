"use client";

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
    shortLine: "Every upload screened for fraud first.",
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
    shortLine: "Matched within 10 km, down to the neighbourhood.",
  },
  {
    id: "safe-dropoffs",
    step: "04",
    icon: Handshake,
    title: "Safe Drop-offs",
    shortLine: "Donors get the address only after pledging.",
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
  const { isVerified, ngoName } = useNgoStatus();
  const [activeFlippedCardId, setActiveFlippedCardId] = useState<string | null>(null);

  const shareText = encodeURIComponent(
    `Check out ${ngoName} on CauseKind! We are verified to receive in-kind contributions directly from givers nearby: `
  );
  const shareUrl = typeof window !== "undefined" ? encodeURIComponent(`${window.location.origin}/profile`) : "";
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}${shareUrl}`;

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

        {/* ─────────────────────────────────────────────────────────────
            NGO SCORECARD SECTION
            ───────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="text-center sm:text-left">
            <h3
              className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-1"
              style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
            >
              {isVerified ? "Your Verified CauseKind Scorecard" : "This is how donors will see you"}
            </h3>
          </div>

          {!isVerified ? (
            /* Before Verification: Locked Preview Scorecard */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl border border-stone-300 dark:border-zinc-700 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white p-6 sm:p-10 shadow-2xl overflow-hidden"
            >
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Scorecard Left Details (locked behind blur) */}
                <div className="lg:col-span-7 space-y-4 filter blur-[1.5px] opacity-70 select-none">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-4xs font-black uppercase tracking-wider backdrop-blur-md">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Partner Scorecard</span>
                  </div>

                  <div>
                    <h3
                      className="text-2xl sm:text-3xl font-bold leading-tight"
                      style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                    >
                      {ngoName || "Your Organization"}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 mt-1">
                      Registered Non-Profit · Verified Partner
                    </p>
                  </div>

                  {/* Metrics Pills */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold border border-white/10">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Verified Impact Score</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold border border-white/10">
                      <span>0 Requests Fulfilled</span>
                    </div>
                  </div>
                </div>

                {/* Scorecard Right: Lock Overlay Message */}
                <div className="lg:col-span-5 bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-2.5">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Preview Mode · Verification Pending
                  </h4>
                  <p className="text-2xs sm:text-xs text-stone-300 leading-relaxed max-w-xs">
                    Once verified, this live trust badge and scorecard becomes visible to all donors within 10 km.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Verified State: Real Card */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl border border-ngo-700/40 bg-gradient-to-br from-ngo-950 via-ngo-900 to-ngo-950 text-white p-6 sm:p-10 shadow-2xl overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-ngo-700/20 blur-3xl" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Scorecard Left Details */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-4xs font-black uppercase tracking-wider backdrop-blur-md">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Partner Scorecard</span>
                  </div>

                  <div>
                    <h3
                      className="text-2xl sm:text-3xl font-bold leading-tight"
                      style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                    >
                      {ngoName}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 mt-1">
                      Legally Verified Partner · Direct Handover Network
                    </p>
                  </div>

                  {/* Metrics Pills */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold border border-white/10">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>New — builds after your first fulfilled request</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold border border-white/10">
                      <span>0 requests fulfilled</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                      <span>100% Photo Proof Standard</span>
                    </div>
                  </div>
                </div>

                {/* Scorecard Right: Share on WhatsApp */}
                <div className="lg:col-span-5 bg-white/10 border border-white/15 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      Share Your Verified Status
                    </p>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      Let your supporters and donors know that your NGO is verified for direct in-kind handovers on CauseKind.
                    </p>
                  </div>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-4 py-2.5 text-xs shadow-md transition-all duration-200"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share on WhatsApp</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </section>
  );
}

export default NgoTrustSection;
