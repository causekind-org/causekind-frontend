'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
  type Transition,
} from 'framer-motion';

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
/** `as const` is load-bearing: without it `type` widens to `string` and no
 *  longer satisfies framer-motion's `Transition`, which wants the literal
 *  `"spring"`. */
const SPRING_OPTIONS = { type: 'spring', stiffness: 300, damping: 30 } as const;

/** One card in the flow. `originalIndex` is added by this component when it
 *  tags the steps, so it is separate from what callers pass in. */
export type FlowStep = {
  icon: React.ReactNode;
  iconBg: string;
  glowColor: string;
  label: string;
  headline: string;
  description: string;
  detail?: string;
};

type TaggedStep = FlowStep & { originalIndex: number };

type CarouselItemProps = {
  step: TaggedStep;
  index: number;
  itemWidth: number;
  round: boolean;
  trackItemOffset: number;
  x: MotionValue<number>;
  transition: Transition;
};

function CarouselItem({ step, index, itemWidth, trackItemOffset, x, transition }: CarouselItemProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      className="relative flex flex-col justify-start rounded-2xl border border-stone-100 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm shrink-0 overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        width: itemWidth,
        height: '100%',
        rotateY: rotateY,
      }}
      transition={transition}
    >
      {/* Icon + step badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-50"
            style={{ background: step.glowColor }}
          />
          <div className={`relative w-13 h-13 rounded-2xl bg-gradient-to-br ${step.iconBg} text-white flex items-center justify-center shadow-lg`}>
            {step.icon}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 text-foreground text-[10px] font-bold flex items-center justify-center shadow border border-stone-100 dark:border-zinc-700">
              {step.originalIndex + 1}
            </div>
          </div>
        </div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-stone-400 dark:text-stone-500">
          {step.label}
        </span>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-2 flex-1">
        <h3 className="text-lg font-extrabold text-foreground leading-snug">
          {step.headline}
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-2">
          {step.description}
        </p>
        {step.detail && (
          <span className="self-start text-[11px] font-semibold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-white/10 px-3 py-1 rounded-full mt-auto">
            {step.detail}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export type MobileFlowCarousel3DProps = {
  steps?: FlowStep[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
};

export function MobileFlowCarousel3D({
  steps = [],
  baseWidth = 320,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false
}: MobileFlowCarousel3DProps) {
  const containerPadding = 16;
  const itemWidth = baseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;
  
  // Tag original index before looping logic
  const stepsWithOriginalIndex = useMemo(() => {
    return steps.map((s, i): TaggedStep => ({ ...s, originalIndex: i }));
  }, [steps]);

  const itemsForRender = useMemo(() => {
    if (!loop) return stepsWithOriginalIndex;
    if (stepsWithOriginalIndex.length === 0) return [];
    return [
      stepsWithOriginalIndex[stepsWithOriginalIndex.length - 1],
      ...stepsWithOriginalIndex,
      stepsWithOriginalIndex[0]
    ];
  }, [stepsWithOriginalIndex, loop]);

  const [position, setPosition] = useState(loop ? 1 : 0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length]);

  useEffect(() => {
    const startingPosition = loop ? 1 : 0;
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [steps.length, loop, trackItemOffset, x]);

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      setPosition(Math.max(0, itemsForRender.length - 1));
    }
  }, [itemsForRender.length, loop, position]);

  const effectiveTransition: Transition = isJumping ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = itemsForRender.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = steps.length;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = itemsForRender.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    steps.length === 0 ? 0 : loop ? (position - 1 + steps.length) % steps.length : Math.min(position, steps.length - 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden mx-auto md:hidden mb-12 flex flex-col items-center"
      style={{
        width: `${baseWidth}px`,
      }}
    >
      {/* 3D Track */}
      <motion.div
        className="flex"
        drag={isAnimating ? false : 'x'}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x,
          minHeight: '280px', // ensure cards have space to grow
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
      >
        {itemsForRender.map((step, index) => (
          <CarouselItem
            key={`${step?.label ?? index}-${index}`}
            step={step}
            index={index}
            itemWidth={itemWidth}
            round={round}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
          />
        ))}
      </motion.div>

      {/* Indicators */}
      <div className="flex w-full justify-center mt-6">
        <div className="flex gap-2 items-center justify-center">
          {steps.map((_, index) => (
            <motion.button
              type="button"
              key={index}
              className={`h-2 rounded-full cursor-pointer transition-colors ${activeIndex === index ? 'w-5 bg-brand-500' : 'w-2 bg-stone-200 dark:bg-zinc-700'}`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={activeIndex === index}
              onClick={() => setPosition(loop ? index + 1 : index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
