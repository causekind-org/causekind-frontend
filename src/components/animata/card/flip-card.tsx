"use client";

/* Based on Animata Flip Card (MIT) by Bibek Bhattarai */
/* Adapted for CauseKind with accessible keyboard, touch, and reduced-motion support */

import React, { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FlipCardProps extends React.HTMLAttributes<HTMLDivElement> {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  className?: string;
  cardClassName?: string;
  ariaLabel?: string;
}

export function FlipCard({
  front,
  back,
  isFlipped: controlledFlipped,
  onFlipChange,
  className,
  cardClassName,
  ariaLabel,
  ...props
}: FlipCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // If controlled, use controlledFlipped; otherwise combine internal state with hover/focus
  const isControlled = controlledFlipped !== undefined;
  const isFlipped = isControlled
    ? controlledFlipped || isHovered || isFocused
    : internalFlipped || isHovered || isFocused;

  const toggleFlip = () => {
    const nextState = !isFlipped;
    if (!isControlled) {
      setInternalFlipped(nextState);
    }
    onFlipChange?.(nextState);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFlip();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={ariaLabel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/card relative block w-full text-left cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ngo-600 dark:focus-visible:ring-ngo-400 rounded-2xl",
        className
      )}
      style={{
        perspective: "1000px",
      }}
      {...props}
    >
      {/* Flip Inner Container */}
      <div
        className={cn(
          "relative w-full h-full rounded-2xl",
          cardClassName
        )}
        style={
          shouldReduceMotion
            ? {
                transition: "opacity 200ms ease",
              }
            : {
                transformStyle: "preserve-3d",
                WebkitTransformStyle: "preserve-3d",
                transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }
        }
      >
        {/* Front Face */}
        <div
          aria-hidden={ariaLabel ? "true" : undefined}
          className={cn(
            "w-full h-full rounded-2xl overflow-hidden",
            shouldReduceMotion
              ? isFlipped
                ? "hidden opacity-0"
                : "block opacity-100"
              : "absolute inset-0"
          )}
          style={
            shouldReduceMotion
              ? undefined
              : {
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }
          }
        >
          {front}
        </div>

        {/* Back Face */}
        <div
          aria-hidden={ariaLabel ? "true" : undefined}
          className={cn(
            "w-full h-full rounded-2xl overflow-hidden",
            shouldReduceMotion
              ? isFlipped
                ? "block opacity-100"
                : "hidden opacity-0"
              : "absolute inset-0"
          )}
          style={
            shouldReduceMotion
              ? undefined
              : {
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }
          }
        >
          {back}
        </div>
      </div>
    </div>
  );
}

export default FlipCard;
