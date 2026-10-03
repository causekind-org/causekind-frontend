"use client";

import React from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  className?: string;
  starClassName?: string;
}

export function RatingStars({
  rating = 5,
  maxStars = 5,
  className = "flex items-center gap-1",
  starClassName = "w-4 h-4 text-amber-400 fill-amber-400",
}: RatingStarsProps) {
  return (
    <div className={className} aria-label={`${rating} out of ${maxStars} stars`}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const isFilled = index < Math.floor(rating);
        return (
          <Star
            key={`star-${index}`}
            className={`${starClassName} ${
              isFilled ? "text-amber-400 fill-amber-400" : "text-stone-300 dark:text-zinc-700"
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default RatingStars;
