import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

export interface ScrollStackProps {
  children: React.ReactNode;
  peek?: number;
  scaleStep?: number;
  minScale?: number;
  dim?: number;
  className?: string;
}

interface StackCardProps {
  index: number;
  total: number;
  child: React.ReactNode;
  peek: number;
  scaleStep: number;
  minScale: number;
  dim: number;
  reduce: boolean;
}

function StackCard({ child, index, total, peek, scaleStep, minScale, dim, reduce }: StackCardProps) {
  const trackerRef = useRef<HTMLDivElement>(null);
  
  // The sticky top position. 80px accounts for a standard sticky navbar/header.
  const pinTop = peek * index + 80;
  
  // The tracker is a 1px invisible div in the normal document flow right above this card.
  // When this tracker reaches pinTop, the card right beneath it becomes sticky.
  // As the user continues scrolling, the tracker moves up out of the viewport.
  // We use this continuous movement to drive the depth scaling animation.
  const { scrollYProgress } = useScroll({
    target: trackerRef,
    // Start when tracker hits the sticky position.
    // End when tracker has scrolled 400px past it (creating a gradual depth sink).
    offset: [`start ${pinTop}px`, `start ${pinTop - 400}px`] 
  });

  const depthScale = Math.max(minScale, 1 - scaleStep * (total - 1 - index) * 1.5);
  
  const scale = useTransform(scrollYProgress, [0, 1], [1, depthScale], { clamp: true });
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 1 - dim], { clamp: true });

  return (
    <>
      <div ref={trackerRef} className="w-full h-px -mb-px opacity-0 pointer-events-none shrink-0" aria-hidden="true" />
      <motion.div
        className="sticky w-full origin-top mb-6 shrink-0"
        style={{
          top: pinTop,
          zIndex: index,
          scale: reduce ? 1 : scale,
          opacity: reduce ? 1 : opacity,
        }}
      >
        {child}
      </motion.div>
    </>
  );
}

export default function ScrollStack({
  children,
  peek = 18,
  scaleStep = 0.04,
  minScale = 0.82,
  dim = 0.35,
  className = '',
}: ScrollStackProps) {
  const reduce = !!useReducedMotion();
  const items = React.Children.toArray(children);
  const total = items.length;

  return (
    <div className={`relative w-full flex flex-col ${className}`}>
        {items.map((child, i) => (
          <StackCard
            key={i}
            index={i}
            total={total}
            child={child}
            peek={peek}
            scaleStep={scaleStep}
            minScale={minScale}
            dim={dim}
            reduce={reduce}
          />
        ))}
        {/* Spacer so the user can scroll fully past the last pinned item before it un-pins */}
        <div className="h-[30vh] w-full shrink-0" aria-hidden="true" />
    </div>
  );
}
