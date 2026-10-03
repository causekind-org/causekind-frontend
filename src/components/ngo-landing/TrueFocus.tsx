"use client";

/*
 * React Bits - True Focus Text Animation Component
 * Adapted for CauseKind NGO Landing Page under MIT License.
 * Source concept: https://reactbits.dev/text-animations/true-focus
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";

export interface TrueFocusProps {
  sentence?: string;
  items?: string[];
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  isVerified?: boolean;
  onFocusChange?: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function TrueFocus({
  sentence = "Get verified. Post. Deliver.",
  items,
  blurAmount = 2.5,
  borderColor = "#15803d", // ngo-700
  glowColor = "rgba(134, 239, 172, 0.45)", // soft ngo-300 glow
  animationDuration = 0.5,
  isVerified = false,
  onFocusChange,
  className = "",
  style,
}: TrueFocusProps) {
  // If items not provided, parse from sentence (split by dots preserving period or custom split)
  const focusGroups = items || ["Get verified.", "Post.", "Deliver."];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [focusRect, setFocusRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 0, height: 0 });

  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const isInView = useInView(containerRef, { margin: "-20px 0px" });
  const shouldReduceMotion = useReducedMotion();

  // Notify parent of focus index change
  useEffect(() => {
    if (shouldReduceMotion) {
      onFocusChange?.(-1);
      return;
    }
    onFocusChange?.(currentIndex);
  }, [currentIndex, onFocusChange, shouldReduceMotion]);

  // Measure and update the bracket frame around active group
  const updateFocusRect = useCallback(() => {
    if (shouldReduceMotion) return;
    const activeEl = itemRefs.current[currentIndex];
    const container = containerRef.current;

    if (activeEl && container) {
      const activeBounding = activeEl.getBoundingClientRect();
      const containerBounding = container.getBoundingClientRect();

      // Add small padding around text (~6px x, ~4px y)
      const paddingX = 8;
      const paddingY = 4;

      setFocusRect({
        x: activeBounding.left - containerBounding.left - paddingX,
        y: activeBounding.top - containerBounding.top - paddingY,
        width: activeBounding.width + paddingX * 2,
        height: activeBounding.height + paddingY * 2,
      });
    }
  }, [currentIndex, shouldReduceMotion]);

  // Recalculate on mount, index change, or resize
  useEffect(() => {
    updateFocusRect();

    const handleResize = () => {
      updateFocusRect();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateFocusRect]);

  // Auto-advance timer
  useEffect(() => {
    if (shouldReduceMotion || !isInView || isHovered) {
      return;
    }

    // Unverified holds index 0 ("Get verified.") for 1s longer (2500ms vs 1500ms)
    let delay = 1500;
    if (!isVerified && currentIndex === 0) {
      delay = 2500;
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % focusGroups.length);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentIndex, isHovered, isInView, isVerified, shouldReduceMotion, focusGroups.length]);

  // Reduced motion render: clean accessible static heading
  if (shouldReduceMotion) {
    return (
      <h2
        ref={containerRef}
        className={`relative inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${className}`}
        style={style}
        aria-label={focusGroups.join(" ")}
      >
        {focusGroups.map((group, idx) => (
          <span key={idx} className="text-stone-900 dark:text-stone-50">
            {group}
          </span>
        ))}
      </h2>
    );
  }

  return (
    <h2
      ref={containerRef}
      className={`relative inline-flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 gap-y-1.5 ${className}`}
      style={style}
      aria-label={focusGroups.join(" ")}
      onMouseLeave={() => setIsHovered(false)}
    >
      {focusGroups.map((group, idx) => {
        const isActive = idx === currentIndex;
        return (
          <span
            key={idx}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            onMouseEnter={() => {
              setIsHovered(true);
              setCurrentIndex(idx);
            }}
            className="cursor-pointer select-none transition-[filter,opacity] duration-500 will-change-[filter,opacity]"
            style={{
              filter: isActive ? "blur(0px)" : `blur(${blurAmount}px)`,
              opacity: isActive ? 1 : 0.65,
            }}
          >
            {group}
          </span>
        );
      })}

      {/* Bracket Frame Overlay with 4 corners */}
      {focusRect.width > 0 && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-md"
          initial={false}
          animate={{
            x: focusRect.x,
            y: focusRect.y,
            width: focusRect.width,
            height: focusRect.height,
            opacity: isInView ? 1 : 0,
          }}
          transition={{
            duration: animationDuration,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
        >
          {/* Top-Left Corner */}
          <span
            className="absolute left-0 top-0 h-2.5 w-2.5 sm:h-3 sm:w-3 border-l-2 border-t-2"
            style={{ borderColor }}
          />
          {/* Top-Right Corner */}
          <span
            className="absolute right-0 top-0 h-2.5 w-2.5 sm:h-3 sm:w-3 border-r-2 border-t-2"
            style={{ borderColor }}
          />
          {/* Bottom-Left Corner */}
          <span
            className="absolute bottom-0 left-0 h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-l-2"
            style={{ borderColor }}
          />
          {/* Bottom-Right Corner */}
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-r-2"
            style={{ borderColor }}
          />
        </motion.span>
      )}
    </h2>
  );
}

export default TrueFocus;
