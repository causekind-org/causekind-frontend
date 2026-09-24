"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Review, SAMPLE_REVIEWS } from "@/data/sampleReviews";
import { ReviewCard } from "./ReviewCard";

interface ReviewsSectionProps {
  reviews?: Review[];
}

export function ReviewsSection({ reviews = SAMPLE_REVIEWS }: ReviewsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { margin: "-50px 0px" });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-16 sm:py-24 text-stone-900 dark:text-stone-100"
    >
      {/* Seamless background gradient transition */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,240,232,0.35) 0%, rgba(238,248,242,0.5) 50%, rgba(247,240,232,0.3) 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-10 text-center">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-tight [text-wrap:balance]"
            style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
          >
            Trusted by Givers and NGOs
          </h3>

          {/* Subheading */}
          <p className="text-xs sm:text-sm md:text-base text-stone-600 dark:text-stone-400 mt-2.5 max-w-2xl mx-auto">
            Real words from the donors, volunteers, and organisations using CauseKind.
          </p>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOVING ROW OF REVIEW CARDS
          Continuous right-to-left marquee with pause on hover/touch and when off-screen
          ───────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden group py-2"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
        }}
      >
        <div
          className="flex w-max items-stretch gap-4 sm:gap-6 animate-reviews-marquee motion-reduce:animate-none motion-reduce:overflow-x-auto motion-reduce:snap-x motion-reduce:snap-mandatory group-hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused]"
          style={{
            animationDuration: "50s",
            animationPlayState: isInView ? "running" : "paused",
          }}
        >
          {/* Primary Set */}
          {reviews.map((review) => (
            <div
              key={`primary-${review.id}`}
              className="flex-[0_0_280px] min-[400px]:flex-[0_0_320px] md:flex-[0_0_380px] h-[240px] shrink-0 motion-reduce:snap-start"
            >
              <ReviewCard review={review} />
            </div>
          ))}

          {/* Duplicated Set for Seamless Infinite Loop */}
          {reviews.map((review) => (
            <div
              key={`duplicate-${review.id}`}
              aria-hidden="true"
              className="flex-[0_0_280px] min-[400px]:flex-[0_0_320px] md:flex-[0_0_380px] h-[240px] shrink-0 motion-reduce:hidden"
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe animation for reviews marquee */}
      <style>{`
        @keyframes ck-reviews-marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-reviews-marquee {
          animation: ck-reviews-marquee linear infinite;
        }
      `}</style>
    </section>
  );
}

export default ReviewsSection;
