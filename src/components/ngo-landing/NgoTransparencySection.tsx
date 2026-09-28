"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInView } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Camera,
  CheckCircle2,
  Users,
  ArrowRight,
} from "lucide-react";
import { GiftJourneyTracker } from "./GiftJourneyTracker";
import { PROOF_CARDS, ProofCard } from "./proofGalleryData";
import { NgoProofDetailDialog } from "./NgoProofDetailDialog";
import { NgoLiveTicker } from "./NgoLiveTickerSection";

export function NgoTransparencySection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeCarouselIdx, setActiveCarouselIdx] = useState<number>(0);
  const [selectedProofCard, setSelectedProofCard] = useState<ProofCard | null>(null);
  const [isProofDialogOpen, setIsProofDialogOpen] = useState<boolean>(false);

  // Count-up stats on scroll
  const statsRef = useRef<HTMLDivElement>(null);
  const isStatsInView = useInView(statsRef, { once: true, amount: 0.3 });
  const [itemsCount, setItemsCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [proofPercent, setProofPercent] = useState(0);

  useEffect(() => {
    if (!isStatsInView) return;
    let start = 0;
    const duration = 1200; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const itemsTarget = 3180;
    const campaignsTarget = 146;
    const proofTarget = 100;

    const timer = setInterval(() => {
      start++;
      const progress = Math.min(1, start / steps);
      const ease = 1 - Math.pow(1 - progress, 3);
      setItemsCount(Math.round(ease * itemsTarget));
      setCampaignsCount(Math.round(ease * campaignsTarget));
      setProofPercent(Math.round(ease * proofTarget));
      if (progress >= 1) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [isStatsInView]);

  // Open card dialog
  const handleOpenProof = useCallback((card: ProofCard, idx: number) => {
    setActiveCarouselIdx(idx);
    setSelectedProofCard(card);
    setIsProofDialogOpen(true);
  }, []);

  // Close card dialog
  const handleCloseProof = useCallback(() => {
    setIsProofDialogOpen(false);
    // Remove query param cleanly if present
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("proof")) {
        url.searchParams.delete("proof");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  // Check URL query param ?proof=<id> on load
  useEffect(() => {
    const proofIdParam = searchParams.get("proof");
    if (proofIdParam) {
      const matched = PROOF_CARDS.find((c) => c.id === parseInt(proofIdParam, 10));
      if (matched) {
        const idx = PROOF_CARDS.indexOf(matched);
        handleOpenProof(matched, idx >= 0 ? idx : 0);
      }
    }
  }, [searchParams, handleOpenProof]);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 text-stone-900 dark:text-stone-100">
      {/* Background blend */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 40%, rgba(30,107,79,0.07), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        
        {/* 1. Gift Journey Tracker */}
        <GiftJourneyTracker />

        {/* 2. What's been given so far Stat Block */}
        <div ref={statsRef} className="rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-6 sm:p-10 shadow-lg">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
            <h3 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              What&apos;s been given so far
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 items-stretch">
            
            {/* Stat 1: Items Delivered */}
            <div className="flex items-center gap-4 bg-stone-50 dark:bg-zinc-800/60 p-5 sm:p-6 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <Package className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-ngo-700 dark:text-ngo-300 tabular-nums">
                  {itemsCount.toLocaleString("en-IN")}
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Items delivered
                </p>
                <p className="text-3xs text-stone-400">Tracked to verified hands</p>
              </div>
            </div>

            {/* Stat 2: Campaigns Fulfilled */}
            <div className="flex items-center gap-4 bg-stone-50 dark:bg-zinc-800/60 p-5 sm:p-6 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-ngo-700 dark:text-ngo-300 tabular-nums">
                  {campaignsCount}
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Campaigns fulfilled
                </p>
                <p className="text-3xs text-stone-400">100% verified local drives</p>
              </div>
            </div>

            {/* Stat 3: Delivered with Photo Proof */}
            <div className="flex items-center gap-4 bg-stone-50 dark:bg-zinc-800/60 p-5 sm:p-6 rounded-2xl border border-stone-200/70 dark:border-zinc-700/60">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-ngo-700 dark:text-ngo-300 tabular-nums">
                  {proofPercent}%
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Delivered with photo proof
                </p>
                <p className="text-3xs text-stone-400">Photos sent to all donors</p>
              </div>
            </div>

          </div>
        </div>

        {/* 2b. Live Contribution Ticker connected directly under stats */}
        <NgoLiveTicker />

        {/* 3. Proof Carousel ("What great proof looks like") */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100"
                style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
              >
                What great proof looks like
              </h3>
            </div>

            {/* Carousel navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCarouselIdx((prev) => (prev - 1 + PROOF_CARDS.length) % PROOF_CARDS.length)}
                aria-label="Previous proof card"
                className="h-9 w-9 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveCarouselIdx((prev) => (prev + 1) % PROOF_CARDS.length)}
                aria-label="Next proof card"
                className="h-9 w-9 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Carousel Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROOF_CARDS.map((card, idx) => {
              const isActive = idx === activeCarouselIdx;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleOpenProof(card, idx)}
                  aria-label={`View proof details for ${card.requested}`}
                  className={`group text-left rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col bg-white dark:bg-zinc-900 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 hover:-translate-y-1 focus:-translate-y-1 ${
                    isActive
                      ? "ring-2 ring-ngo-700 border-transparent shadow-xl"
                      : "border-stone-200 dark:border-zinc-800 hover:border-ngo-600/60"
                  }`}
                >
                  {/* Photo area with verified stamp */}
                  <div className="relative h-44 w-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                    <Image
                      src={card.deliveredImage}
                      alt={card.requested}
                      fill
                      sizes="(max-width: 768px) 100vw, 280px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none" />
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-4xs uppercase tracking-wider text-white font-bold flex items-center gap-1 border border-white/10">
                      <Camera className="w-3 h-3 text-emerald-400" /> Delivered Photo
                    </span>
                    <span className="absolute bottom-2 left-2.5 text-3xs text-white/95 font-medium flex items-center gap-1">
                      <span>📍</span>
                      <span>{card.location}</span>
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-4xs font-black uppercase tracking-wider text-ngo-700 dark:text-ngo-300">
                        {card.category}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 mt-1 line-clamp-2">
                        {card.requested}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-3xs text-stone-500 dark:text-stone-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-ngo-700" />
                          {card.donorCount} donors confirmed
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>

                      {/* View Proof link line on hover/focus */}
                      <div className="flex items-center gap-1 text-3xs font-bold text-ngo-700 dark:text-ngo-300 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        <span>View proof</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-2xs sm:text-xs text-stone-500 dark:text-stone-400 italic">
            &ldquo;Every fulfilled request ends the same way — a real photo, sent to everyone who helped make it happen.&rdquo;
          </p>
        </div>

      </div>

      {/* Proof Detail Modal */}
      <NgoProofDetailDialog
        card={selectedProofCard}
        isOpen={isProofDialogOpen}
        onClose={handleCloseProof}
      />
    </section>
  );
}

export default NgoTransparencySection;
