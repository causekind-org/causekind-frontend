"use client";

import React, { useRef, useEffect, useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { gsap } from 'gsap';
import { PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── video sources ── */
const VIDEOS = [
  "/videos/WhatsApp Video 2026-09-05 at 3.20.14 PM.mp4",
  "/videos/WhatsApp Video 2026-09-05 at 3.23.16 PM.mp4",
  "/videos/WhatsApp Video 2026-09-05 at 3.23.31 PM.mp4",
  "/videos/WhatsApp Video 2026-09-05 at 3.23.40 PM.mp4",
  "/videos/WhatsApp Video 2026-09-05 at 3.25.11 PM.mp4",
  "/videos/WhatsApp Video 2026-09-05 at 3.25.12 PM.mp4",
  "/videos/WhatsApp Video 2026-09-05 at 3.25.13 PM.mp4",
];



/* ── carousel config ── */
const DRAG_SMOOTHING = 14;
const VELOCITY_WINDOW = 90;
const MAX_FLICK = 9;
const STAGGER_LAG_STRENGTH = 0.85;
const MIN_FOLLOW_FRACTION = 0.6;

function usePrefersReducedMotion() {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return matches;
}

export function ImpactCarousel() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reduceMotion = usePrefersReducedMotion();

  const total = VIDEOS.length;

  // Carousel parameters
  const radiusRatio = 0.85;
  const cardRatio = 0.28;
  const minCardWidth = 200;
  const maxCardWidth = 400;
  const cardAspect = 0.62;
  const overlap = -0.04;
  const arcOffset = 0.5;
  const smoothing = 5.5;
  const dragSensitivity = 0.65; // Lowered to make dragging/scrolling less sensitive
  const momentumVal = 0.65; // Lowered to reduce the massive spin after a flick
  const autoRotateSpeed = 0.12;
  const pauseOnHover = true;

  const [slotCount, setSlotCount] = useState(() => Math.max(total, 12));

  const layoutRef = useRef({ radius: 900, cardWidth: 220, cardHeight: 330, step: 0.14, centerX: 0, centerY: 0, maxAngle: 1 });
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const slotOffsetsRef = useRef<number[]>([]);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastXRef = useRef(0);
  const samplesRef = useRef<{ t: number; value: number }[]>([]);
  const revealRef = useRef(reduceMotion ? 1 : 0);
  const revealStartRef = useRef(0);
  const wheelSettleRef = useRef(0);
  const hoveredRef = useRef(false);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !total) return;
    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    
    // Dynamically scale card size based on screen width so it fits mobile
    const isMobile = width < 768;
    const dynamicCardRatio = isMobile ? 0.45 : cardRatio;
    const dynamicMinCardWidth = isMobile ? 120 : minCardWidth;
    
    const cardWidth = gsap.utils.clamp(dynamicMinCardWidth, maxCardWidth, width * dynamicCardRatio);
    const cardHeight = cardWidth / cardAspect;
    const radius = Math.max(width * radiusRatio, cardWidth * 4.2);
    const step = (cardWidth * (1 - gsap.utils.clamp(-0.5, 0.85, overlap))) / radius;
    const centerX = width / 2;
    // Shift the arc slightly higher on mobile so it doesn't clip at the bottom
    const dynamicArcOffset = isMobile ? 0.45 : arcOffset;
    const centerY = height * dynamicArcOffset + radius;
    const discRadius = radius - cardHeight * 0.66;
    const reach = Math.min(1, (width / 2 + cardWidth * 1.2) / radius);
    const maxAngle = Math.asin(reach) + 0.12;
    layoutRef.current = { radius, cardWidth, cardHeight, step, centerX, centerY, maxAngle };
    const disc = discRef.current;
    if (disc) {
      disc.style.width = `${discRadius * 2}px`;
      disc.style.height = `${discRadius * 2}px`;
      disc.style.left = `${centerX}px`;
      disc.style.top = `${centerY - discRadius}px`;
    }
    const needed = Math.ceil((maxAngle * 2) / step) + 2;
    setSlotCount((prev) => {
      const next = Math.max(total, Math.ceil(needed / total) * total);
      return next === prev ? prev : next;
    });
  }, [total]);

  useLayoutEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [measure]);

  // Video playback is now seamlessly integrated into the GSAP draw loop below,
  // eliminating the need for a separate 500ms setInterval polling loop.

  // Render loop
  useEffect(() => {
    if (!total) return;
    const draw = (dt: number) => {
      const { radius, cardWidth, cardHeight, step, centerX, centerY, maxAngle } = layoutRef.current;
      const span = slotCount * step;
      const half = span / 2;
      const reveal = revealRef.current;
      const rate = draggingRef.current ? DRAG_SMOOTHING : reduceMotion ? DRAG_SMOOTHING : smoothing;
      const useUnifiedOffset = reduceMotion;
      const slotOffsets = slotOffsetsRef.current;
      if (slotOffsets.length !== slotCount) { slotOffsets.length = slotCount; slotOffsets.fill(currentRef.current); }

      for (let i = 0; i < slotCount; i += 1) {
        const card = cardRefs.current[i];
        if (!card) continue;
        if (useUnifiedOffset) { slotOffsets[i] = currentRef.current; } else {
          let rankAngle = (i * step - slotOffsets[i]) % span;
          if (rankAngle < -half) rankAngle += span; else if (rankAngle >= half) rankAngle -= span;
          const distanceFactor = gsap.utils.clamp(0, 1, Math.abs(rankAngle) / maxAngle);
          const followRate = Math.max(rate * (1 - distanceFactor * STAGGER_LAG_STRENGTH), rate * MIN_FOLLOW_FRACTION);
          const followLerp = 1 - Math.exp(-followRate * dt);
          slotOffsets[i] += (currentRef.current - slotOffsets[i]) * followLerp;
        }
        let baseAngle = (i * step - slotOffsets[i]) % span;
        if (baseAngle < -half) baseAngle += span; else if (baseAngle >= half) baseAngle -= span;
        
        if (Math.abs(baseAngle) > maxAngle) { 
          if (card.style.visibility !== 'hidden') {
            card.style.visibility = 'hidden'; 
            const vid = videoRefs.current[i];
            if (vid && !vid.paused) vid.pause();
          }
          continue; 
        }
        
        if (card.style.visibility === 'hidden') {
          card.style.visibility = 'visible';
          const vid = videoRefs.current[i];
          if (vid && vid.paused) vid.play().catch(() => {});
        }
        
        const x = centerX + radius * Math.sin(baseAngle) - cardWidth / 2;
        const y = centerY - radius * Math.cos(baseAngle) - cardHeight / 2;
        card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${baseAngle}rad)`;
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
        card.style.zIndex = `${Math.round((baseAngle + half) * 1000)}`;
        const inner = innerRefs.current[i];
        if (inner && reveal < 1) {
          const delay = Math.min(1, Math.abs(baseAngle) / maxAngle) * 0.45;
          const p = gsap.utils.clamp(0, 1, (reveal - delay) / (1 - delay || 1));
          const eased = 1 - Math.pow(1 - p, 3);
          inner.style.opacity = `${eased}`;
          inner.style.transform = `translate3d(0, ${(1 - eased) * cardHeight * 0.35}px, 0)`;
        } else if (inner && inner.style.opacity !== '1') {
          inner.style.opacity = '1';
          inner.style.transform = 'translate3d(0, 0, 0)';
        }
      }
    };
    const tick = (_time: number, deltaTime: number) => {
      const dt = Math.min(deltaTime, 50) / 1000;
      const rate = draggingRef.current ? DRAG_SMOOTHING : reduceMotion ? DRAG_SMOOTHING : smoothing;
      const lerp = 1 - Math.exp(-rate * dt);
      const delta = targetRef.current - currentRef.current;
      currentRef.current += delta * lerp;
      if (Math.abs(delta) < 0.00002) currentRef.current = targetRef.current;
      if (revealRef.current < 1) {
        const now = performance.now();
        if (!revealStartRef.current) revealStartRef.current = now;
        revealRef.current = Math.min(1, (now - revealStartRef.current) / 1100);
      }
      if (autoRotateSpeed && !reduceMotion && !draggingRef.current && !(pauseOnHover && hoveredRef.current)) {
        targetRef.current += autoRotateSpeed * dt;
      }
      draw(dt);
    };
    draw(1);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [reduceMotion, slotCount, total]);

  // Pointer drag + flick
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !total) return;
    

    const pushSample = () => {
      const now = performance.now();
      const samples = samplesRef.current;
      samples.push({ t: now, value: targetRef.current });
      while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW) samples.shift();
    };
    
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      lastXRef.current = e.clientX;
      samplesRef.current = [{ t: performance.now(), value: targetRef.current }];
      targetRef.current = currentRef.current;
      stage.setPointerCapture(e.pointerId);
      stage.style.cursor = 'grabbing';
    };
    
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      targetRef.current -= (dx * dragSensitivity) / layoutRef.current.radius;
      pushSample();
    };
    
    const endDrag = (e: PointerEvent) => {
      if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      stage.style.cursor = 'grab';
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      pushSample();

      let projected = targetRef.current;
      if (!reduceMotion) {
        const samples = samplesRef.current;
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = last && first ? (last.t - first.t) / 1000 : 0;
        if (dt > 0.008) {
          const velocity = (last.value - first.value) / dt;
          const throw_ = gsap.utils.clamp(-MAX_FLICK, MAX_FLICK, velocity / smoothing) * momentumVal;
          projected = targetRef.current + throw_;
        }
      }
      targetRef.current = projected;
      samplesRef.current = [];
    };
    
    const onWheel = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal) return;
      const delta = e.deltaX;
      e.preventDefault();
      targetRef.current += (delta * dragSensitivity) / layoutRef.current.radius;
    };
    
    const onKeyDown = (e: KeyboardEvent) => {
      const { step } = layoutRef.current;
      if (e.key === 'ArrowRight') { e.preventDefault(); targetRef.current += step; }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); targetRef.current -= step; }
    };
    
    const onPointerEnter = () => { hoveredRef.current = true; };
    const onPointerLeave = () => { hoveredRef.current = false; };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerenter', onPointerEnter);
    stage.addEventListener('pointerleave', onPointerLeave);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('keydown', onKeyDown);
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', endDrag);
      stage.removeEventListener('pointercancel', endDrag);
      stage.removeEventListener('pointerenter', onPointerEnter);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(wheelSettleRef.current);
    };
  }, [reduceMotion, total]);

  const slots = Array.from({ length: slotCount }, (_, i) => VIDEOS[i % total]);

  return (
    <section 
      className="relative z-0 bg-background overflow-hidden py-8 lg:py-24" 
      id="stories"
      style={{ isolation: 'isolate', transform: 'translateZ(0)' }}
    >
      {/* Header overlay */}
      <div className="relative z-10 pt-8 sm:pt-16 pb-4 sm:pb-6 text-center pointer-events-none">
        <div className="flex items-center justify-center gap-2 mb-3">
          <PlayCircle className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-bold text-brand-600 tracking-widest uppercase">
            See Sahas in Action
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-3 sm:mb-4 tracking-tight">
          Real stories. Real change.
        </h2>
        <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl mx-auto px-4">
          Our field medical camps, skill workshops, and educational programs work alongside communities across high-need rural India.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative h-[65vh] min-h-[400px] lg:h-[85vh] lg:min-h-[650px] pb-6 lg:pb-24 mt-2 sm:mt-4">
        <div
          ref={stageRef}
          tabIndex={0}
          role="region"
          aria-label="Donation impact video carousel"
          className="absolute inset-0 cursor-grab outline-none"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Disc */}
          <div
            ref={discRef}
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 rounded-full bg-background"
            style={{ boxShadow: 'none' }}
          />

          {slots.map((videoSrc, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="absolute top-0 left-0 will-change-transform"
              style={{ visibility: 'hidden' }}
            >
              <div
                ref={(el) => { innerRefs.current[i] = el; }}
                className="relative h-full w-full overflow-hidden rounded-[10px] bg-stone-200 dark:bg-zinc-800"
                style={{
                  opacity: reduceMotion ? 1 : 0,
                  boxShadow: '0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="pointer-events-none block h-full w-full object-cover select-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
