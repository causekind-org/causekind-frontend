"use client";

import React from "react";
import { Review } from "@/data/sampleReviews";
import { RatingStars } from "./RatingStars";
import { InitialAvatar } from "./InitialAvatar";

interface ReviewCardProps {
  review: Review;
  className?: string;
}

export function ReviewCard({ review, className = "" }: ReviewCardProps) {
  return (
    <div
      className={`relative flex flex-col justify-between w-[280px] min-[400px]:w-[320px] md:w-[380px] h-[240px] flex-[0_0_280px] min-[400px]:flex-[0_0_320px] md:flex-[0_0_380px] shrink-0 rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 select-none ${className}`}
    >
      {/* Top: Rating Stars */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <RatingStars rating={review.rating} />
      </div>

      {/* Middle: Review Text (clamped to max 4 lines with ellipsis as safety net) */}
      <div className="flex-1 overflow-hidden">
        <p className="text-xs md:text-sm text-stone-700 dark:text-stone-300 leading-snug md:leading-relaxed font-normal line-clamp-4">
          &ldquo;{review.text}&rdquo;
        </p>
      </div>

      {/* Bottom: Divider + Initial Avatar + Name + Role (pinned to bottom with mt-auto) */}
      <div className="mt-auto shrink-0 pt-3 md:pt-3.5 border-t border-stone-100 dark:border-zinc-800/80 flex items-center gap-3">
        <InitialAvatar name={review.name} size="md" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs md:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
            {review.name}
          </h4>
          <p className="text-3xs md:text-2xs text-stone-500 dark:text-stone-400 truncate">
            {review.role}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReviewCard;
