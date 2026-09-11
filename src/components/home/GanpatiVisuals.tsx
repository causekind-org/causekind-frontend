"use client";

import React, { useMemo } from "react";

/**
 * Embedded CSS Keyframe Styles for Ganpati Theme
 * Guarantees 60fps GPU acceleration across all browsers without hydration delays
 * or reduced-motion lockouts.
 */
export function GanpatiAnimationStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
      @keyframes toranGentleSway {
        0%, 100% {
          transform: rotate(-4.5deg);
        }
        50% {
          transform: rotate(4.5deg);
        }
      }

      @keyframes divineFloat {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-8px);
        }
      }

      @keyframes haloBreathing {
        0%, 100% {
          transform: scale(0.97);
          opacity: 0.65;
        }
        50% {
          transform: scale(1.04);
          opacity: 0.95;
        }
      }

      @keyframes trunkSwayLoop {
        0%, 100% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(2.8deg);
        }
        75% {
          transform: rotate(-2.2deg);
        }
      }

      @keyframes mushakIdleBob {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-3px);
        }
      }

      @keyframes mushakTailTwitch {
        0%, 100% {
          transform: rotate(0deg);
        }
        28% {
          transform: rotate(8deg);
        }
        70% {
          transform: rotate(-5deg);
        }
      }

      @keyframes diyaFlameFlicker {
        0%, 100% {
          transform: scale(1) rotate(0deg);
          opacity: 0.92;
        }
        33% {
          transform: scale(1.08, 0.95) rotate(2deg);
          opacity: 1;
        }
        66% {
          transform: scale(0.96, 1.05) rotate(-2deg);
          opacity: 0.88;
        }
      }

      .ck-toran-leaf-sway {
        transform-box: fill-box;
        transform-origin: 50% 0%;
        animation: toranGentleSway 2s ease-in-out infinite;
        will-change: transform;
      }
      .ck-divine-float {
        animation: divineFloat 5.2s ease-in-out infinite;
      }
      .ck-halo-pulse {
        transform-origin: center center;
        animation: haloBreathing 4.5s ease-in-out infinite;
      }
      .ck-trunk-sway {
        transform-box: fill-box;
        transform-origin: 270px 218px;
        animation: trunkSwayLoop 3.8s ease-in-out infinite;
      }
      .ck-mushak-bob {
        animation: mushakIdleBob 2.4s ease-in-out infinite;
      }
      .ck-mushak-tail {
        transform-box: fill-box;
        transform-origin: 435px 432px;
        animation: mushakTailTwitch 1.8s ease-in-out infinite;
      }
      .ck-flame-flicker {
        transform-origin: 16px 17px;
        animation: diyaFlameFlicker 1.8s ease-in-out infinite;
      }
    `}} />
  );
}

/**
 * Animated Drifting Marigold Flower Petals for the Hero background.
 * Creates a serene, divine, temple-celebration atmosphere.
 */
export function DriftingPetals() {
  const petals = useMemo(
    () => [
      { id: 1, left: "6%", size: 14, delay: "0s", duration: "13s" },
      { id: 2, left: "20%", size: 18, delay: "3.5s", duration: "16s" },
      { id: 3, left: "36%", size: 12, delay: "7s", duration: "14s" },
      { id: 4, left: "52%", size: 16, delay: "2s", duration: "18s" },
      { id: 5, left: "68%", size: 20, delay: "5s", duration: "15s" },
      { id: 6, left: "82%", size: 13, delay: "8.5s", duration: "17s" },
      { id: 7, left: "94%", size: 15, delay: "4s", duration: "14s" },
    ],
    []
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      <GanpatiAnimationStyles />
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute -top-6"
          style={{
            left: p.left,
            animation: `petalDriftDown ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        >
          <svg width={p.size} height={p.size * 1.3} viewBox="0 0 20 26" fill="none">
            <defs>
              <linearGradient id={`petalGrad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="85%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
            </defs>
            <path
              d="M10 0 C4 5, 0 13, 3 20 C6 26, 14 26, 17 20 C20 13, 16 5, 10 0 Z"
              fill={`url(#petalGrad-${p.id})`}
              opacity="0.9"
            />
            <path d="M10 3 Q10 14 10 23" stroke="#fed7aa" strokeWidth="0.8" opacity="0.6" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/**
 * Traditional Living Toran (Mango Leaf & Layered Marigold Garland with Golden Bells)
 * 
 * Guaranteed edge-to-edge span:
 * - viewBox 0 0 1440 95 with preserveAspectRatio="none"
 * - 12 hanging botanical leaf & marigold clusters spaced evenly across the full width
 * - Outer <g transform="translate(x, y)"> keeps coordinate lock
 * - Inner <g className="ck-toran-sway-..."> applies staggered independent breeze sway
 * - Alternating hanging brass temple bells and red/gold silk tassels
 */
export function GanpatiToran({ className = "" }: { className?: string }) {
  // 12 garland segments spaced every 120 units across 1440 width:
  // Center dips of catenary swags at x = 60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140, 1260, 1380
  const segments = useMemo(
    () => [
      { x: 60, delay: 0.00, hasBell: true },
      { x: 180, delay: 0.12, hasBell: false },
      { x: 300, delay: 0.24, hasBell: true },
      { x: 420, delay: 0.36, hasBell: false },
      { x: 540, delay: 0.48, hasBell: true },
      { x: 660, delay: 0.60, hasBell: false },
      { x: 780, delay: 0.72, hasBell: true },
      { x: 900, delay: 0.84, hasBell: false },
      { x: 1020, delay: 0.96, hasBell: true },
      { x: 1140, delay: 1.08, hasBell: false },
      { x: 1260, delay: 1.20, hasBell: true },
      { x: 1380, delay: 1.32, hasBell: false },
    ],
    []
  );

  // Tie knots at anchor peaks (x = 0, 120, 240, ... 1440)
  const tieKnots = [0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440];

  return (
    <div
      className={`relative w-full overflow-visible pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <GanpatiAnimationStyles />
      <svg
        viewBox="0 0 1440 130"
        preserveAspectRatio="none"
        className="w-full h-14 sm:h-20 md:h-24 block overflow-visible drop-shadow-[0_4px_12px_rgba(217,119,6,0.18)]"
      >
        <defs>
          {/* Mango Leaf botanical gradient: rich emerald outer, spring green midrib */}
          <linearGradient id="botanicalMangoLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="35%" stopColor="#16a34a" />
            <stop offset="70%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>

          {/* Leaf glossy sunny highlight */}
          <linearGradient id="leafGloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#4ade80" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>

          {/* Layered Marigold outer petal ring */}
          <radialGradient id="marigoldOuter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="60%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Layered Marigold inner petals */}
          <radialGradient id="marigoldInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>

          {/* Golden rope shimmer */}
          <linearGradient id="goldenRopeShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="25%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#fffbeb" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Temple bell brass gradient */}
          <linearGradient id="bellBrass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="80%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          {/* Filter for realistic leaf drop shadow */}
          <filter id="leafShadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor="#1e3a1e" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 1. Full-Width Edge-to-Edge Golden Catenary Cord with 12 swags */}
        <path
          d="M0,6 Q60,20 120,6 Q180,20 240,6 Q300,20 360,6 Q420,20 480,6 Q540,20 600,6 Q660,20 720,6 Q780,20 840,6 Q900,20 960,6 Q1020,20 1080,6 Q1140,20 1200,6 Q1260,20 1320,6 Q1380,20 1440,6"
          fill="none"
          stroke="url(#goldenRopeShimmer)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Shimmer thread highlight running along the rope */}
        <path
          d="M0,5 Q60,19 120,5 Q180,19 240,5 Q300,19 360,5 Q420,19 480,5 Q540,19 600,5 Q660,19 720,5 Q780,19 840,5 Q900,19 960,5 Q1020,19 1080,5 Q1140,19 1200,5 Q1260,19 1320,5 Q1380,19 1440,5"
          fill="none"
          stroke="#fffbeb"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Tie Knots at Swag Anchor Peaks */}
        {tieKnots.map((knotX) => (
          <g key={knotX} transform={`translate(${knotX}, 6)`}>
            <circle cx="0" cy="0" r="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.6" fill="#fef08a" />
          </g>
        ))}

        {/* 2. 12 Staggered Hanging Leaf & Blossom Clusters spanning full edge-to-edge */}
        {segments.map((seg, i) => (
          <g
            key={i}
            transform={`translate(${seg.x}, 18)`}
            filter="url(#leafShadow)"
          >
            {/* Inner Animated Group: gentle wind-sway like a pendulum with staggered breeze delay */}
            <g
              className="ck-toran-leaf-sway"
              style={{
                animationDelay: `${seg.delay}s`,
              }}
            >
              {/* Hanging loop cord */}
              <path d="M0,-8 L0,2" stroke="#ca8a04" strokeWidth="2.2" />

              {/* Left Botanical Mango Leaf */}
              <path
                d="M0,2 C-14,8 -24,24 -20,44 C-17,56 -6,64 -1,68 C-3,50 -6,26 0,2 Z"
                fill="url(#botanicalMangoLeaf)"
                stroke="#14532d"
                strokeWidth="0.8"
              />
              <path d="M0,2 Q-12,38 -1,68" stroke="#86efac" strokeWidth="1" opacity="0.65" fill="none" />
              <path d="M-5,16 Q-12,22 -16,28 M-4,28 Q-12,36 -14,44" stroke="#86efac" strokeWidth="0.6" opacity="0.4" fill="none" />

              {/* Right Botanical Mango Leaf */}
              <path
                d="M0,2 C14,8 24,24 20,44 C17,56 6,64 1,68 C3,50 6,26 0,2 Z"
                fill="url(#botanicalMangoLeaf)"
                stroke="#14532d"
                strokeWidth="0.8"
              />
              <path d="M0,2 Q12,38 1,68" stroke="#86efac" strokeWidth="1" opacity="0.65" fill="none" />
              <path d="M5,16 Q12,22 16,28 M4,28 Q12,36 14,44" stroke="#86efac" strokeWidth="0.6" opacity="0.4" fill="none" />

              {/* Center Botanical Mango Leaf (Primary, lanceolate shape) */}
              <path
                d="M0,0 C-11,14 -13,42 -6,64 C-3,72 0,78 0,80 C0,78 3,72 6,64 C13,42 11,14 0,0 Z"
                fill="url(#botanicalMangoLeaf)"
                stroke="#0f3d1e"
                strokeWidth="0.9"
              />
              {/* Center leaf glossy highlight edge */}
              <path
                d="M-1,4 C-8,16 -9,40 -4,58 C-1,66 0,74 0,78"
                stroke="url(#leafGloss)"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
              {/* Central Vein */}
              <path d="M0,1 L0,78" stroke="#bbf7d0" strokeWidth="1.2" opacity="0.75" />
              {/* Lateral Veins */}
              <path d="M0,16 Q-6,22 -8,28 M0,30 Q-7,36 -8,44 M0,44 Q-5,50 -5,58" stroke="#bbf7d0" strokeWidth="0.65" opacity="0.5" fill="none" />
              <path d="M0,16 Q6,22 8,28 M0,30 Q7,36 8,44 M0,44 Q5,50 5,58" stroke="#bbf7d0" strokeWidth="0.65" opacity="0.5" fill="none" />

              {/* Layered Marigold Flower (Genda Phool) */}
              <g transform="translate(0, 4)">
                <circle cx="0" cy="0" r="13" fill="url(#marigoldOuter)" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const cx = Math.round(10 * Math.cos(rad) * 100) / 100;
                  const cy = Math.round(10 * Math.sin(rad) * 100) / 100;
                  return (
                    <circle
                      key={deg}
                      cx={cx}
                      cy={cy}
                      r="4"
                      fill="#ea580c"
                      opacity="0.9"
                    />
                  );
                })}
                <circle cx="0" cy="0" r="9" fill="url(#marigoldInner)" />
                {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const cx = Math.round(6.5 * Math.cos(rad) * 100) / 100;
                  const cy = Math.round(6.5 * Math.sin(rad) * 100) / 100;
                  return (
                    <circle
                      key={deg}
                      cx={cx}
                      cy={cy}
                      r="3"
                      fill="#f59e0b"
                    />
                  );
                })}
                <circle cx="0" cy="0" r="5" fill="#fef08a" />
                <circle cx="0" cy="0" r="2.5" fill="#f97316" />
              </g>

              {/* Alternating Hanging Brass Bell (Ghanti) or Silk Tassel */}
              {seg.hasBell ? (
                <g transform="translate(0, 78)">
                  <line x1="0" y1="0" x2="0" y2="7" stroke="#ca8a04" strokeWidth="1.5" />
                  <path
                    d="M0,7 C-3,9 -5,13 -4,18 L4,18 C5,13 3,9 0,7 Z"
                    fill="url(#bellBrass)"
                    stroke="#854d0e"
                    strokeWidth="0.8"
                  />
                  <circle cx="0" cy="19.5" r="1.5" fill="#ca8a04" />
                </g>
              ) : (
                <g transform="translate(0, 78)">
                  <circle cx="0" cy="4" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
                  <path d="M-2,6 L2,6 L3,14 L-3,14 Z" fill="#b91c1c" />
                  <circle cx="0" cy="15" r="1.2" fill="#fbbf24" />
                </g>
              )}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Sacred Rangoli / Mandala Watermark Backdrop Pattern
 * Designed with 8-fold radial symmetry and sacred lotus motifs.
 * Rendered at 6-8% opacity to fill dead space intentionally without competing with text.
 */
export function RangoliBackdrop({ className = "opacity-[0.07]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="rangoliGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ea580c" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.85">
        {/* Concentric rings */}
        <circle cx="300" cy="300" r="280" strokeDasharray="6 6" />
        <circle cx="300" cy="300" r="250" />
        <circle cx="300" cy="300" r="210" strokeDasharray="4 4" />
        <circle cx="300" cy="300" r="160" />
        <circle cx="300" cy="300" r="110" strokeDasharray="3 3" />
        <circle cx="300" cy="300" r="60" />
        <circle cx="300" cy="300" r="20" fill="currentColor" opacity="0.3" />

        {/* 8-fold radial lotus petals */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 300 300)`}>
            {/* Inner petal */}
            <path d="M300 240 C285 200, 285 150, 300 130 C315 150, 315 200, 300 240 Z" fill="currentColor" opacity="0.12" />
            {/* Outer petal */}
            <path d="M300 130 C270 90, 280 40, 300 20 C320 40, 330 90, 300 130 Z" />
            <circle cx="300" cy="18" r="4" fill="currentColor" />
            <line x1="300" y1="300" x2="300" y2="40" strokeDasharray="2 4" />
            {/* Paisley curve accents */}
            <path d="M280 180 Q250 150 270 120" />
            <path d="M320 180 Q350 150 330 120" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * RangoliBorderStrip — A thin (14-16px tall) repeating geometric rangoli/toran motif strip.
 * Features repeating golden beads, sacred marigold diamond florets, and delicate scalloped arches.
 * Used to frame sections with warm saffron/gold festive boundaries.
 */
export function RangoliBorderStrip({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none w-full h-3.5 sm:h-4 overflow-hidden select-none ${className} ${flip ? "rotate-180" : ""
        }`}
    >
      <svg
        className="w-full h-full block"
        viewBox="0 0 1200 14"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="rangoliStripGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <pattern id="rangoliMotifPattern" width="32" height="14" patternUnits="userSpaceOnUse">
            {/* Upper continuous golden cord */}
            <line x1="0" y1="1.5" x2="32" y2="1.5" stroke="#f59e0b" strokeWidth="1.2" />
            {/* Small golden bead */}
            <circle cx="16" cy="3.5" r="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
            {/* Sacred diamond rangoli floret */}
            <path d="M16 5 L20 8.5 L16 12 L12 8.5 Z" fill="#ea580c" stroke="#f59e0b" strokeWidth="0.6" />
            <circle cx="16" cy="8.5" r="1.1" fill="#fffbeb" />
            {/* Small side florets */}
            <circle cx="4" cy="4.5" r="1.2" fill="#ca8a04" />
            <circle cx="28" cy="4.5" r="1.2" fill="#ca8a04" />
            {/* Delicate scalloped arches */}
            <path d="M0 1.5 Q8 6 16 1.5 Q24 6 32 1.5" fill="none" stroke="#d97706" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="14" fill="url(#rangoliMotifPattern)" />
        <line x1="0" y1="13.5" x2="1200" y2="13.5" stroke="url(#rangoliStripGrad)" strokeWidth="0.75" opacity="0.8" />
      </svg>
    </div>
  );
}

/**
 * Sacred Lotus Icon — Blooming auspicious pink/gold lotus flower for harmony & community.
 * Replaces the pointed modak icon in the trust stats band so it never resembles a hazard triangle.
 */
export function LotusIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lotusPinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="55%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#9d174d" />
        </linearGradient>
        <linearGradient id="lotusGoldCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Green calyx water base leaf */}
      <path d="M6 24 C10 22, 22 22, 26 24 C22 27, 10 27, 6 24 Z" fill="#15803d" opacity="0.85" />
      {/* Outer side petals */}
      <path d="M16 23 C10 19, 5 15, 6 11 C10 11, 13 16, 16 23 Z" fill="url(#lotusPinkGrad)" opacity="0.85" />
      <path d="M16 23 C22 19, 27 15, 26 11 C22 11, 19 16, 16 23 Z" fill="url(#lotusPinkGrad)" opacity="0.85" />
      {/* Mid side petals */}
      <path d="M16 23 C11 17, 8 10, 11 7 C14 8, 16 15, 16 23 Z" fill="url(#lotusPinkGrad)" />
      <path d="M16 23 C21 17, 24 10, 21 7 C18 8, 16 15, 16 23 Z" fill="url(#lotusPinkGrad)" />
      {/* Central dominant blooming petal */}
      <path
        d="M16 4 C13.5 9, 13 18, 16 23.5 C19 18, 18.5 9, 16 4 Z"
        fill="url(#lotusPinkGrad)"
        stroke="#fbcfe8"
        strokeWidth="0.6"
      />
      {/* Golden pericarp core */}
      <circle cx="16" cy="18" r="2.2" fill="url(#lotusGoldCore)" />
    </svg>
  );
}

/**
 * Modak Icon — Auspicious golden sweet offered to Lord Ganesha.
 */
export function ModakIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="modakGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="35%" stopColor="#fde68a" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="28" rx="10" ry="2.5" fill="#78350f" opacity="0.25" />
      <path
        d="M16 3 C15 7, 6 15, 6 22 C6 26.5, 10.5 28, 16 28 C21.5 28, 26 26.5, 26 22 C26 15, 17 7, 16 3 Z"
        fill="url(#modakGrad)"
        stroke="#d97706"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M16 4 Q13 16 11 27" stroke="#b45309" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
      <path d="M16 4 Q19 16 21 27" stroke="#b45309" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
      <path d="M16 4 L16 28" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <circle cx="16" cy="4.5" r="1.5" fill="#ea580c" />
    </svg>
  );
}

/**
 * DiyaIcon — Aliased to ModakIcon for page-wide consistency (only modak icon/emoji used).
 */
export function DiyaIcon({ className = "size-5" }: { className?: string }) {
  return <ModakIcon className={className} />;
}

/**
 * Ghanti (Temple Bell) Icon
 */
export function GhantiIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="brassBell" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="85%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="5" rx="3.5" ry="3" stroke="#a16207" strokeWidth="1.5" />
      <path
        d="M16 7 C14 10, 11 15, 9 21 C8 24, 7 25, 6 26 L26 26 C25 25, 24 24, 23 21 C21 15, 18 10, 16 7 Z"
        fill="url(#brassBell)"
        stroke="#713f12"
        strokeWidth="1.2"
      />
      <rect x="5" y="25" width="22" height="2.5" rx="1.2" fill="#ca8a04" stroke="#713f12" strokeWidth="1" />
      <circle cx="16" cy="28.5" r="2.2" fill="#854d0e" />
    </svg>
  );
}

/**
 * Animated Seated Ganpati Illustration on Lotus with Banana Leaf & Grounded Mushak
 * 
 * Features:
 * - Substantial size filling the right column stage (max-w-[560px], vertically centered)
 * - Radiant pulsating divine halo (Prabhavali) with breathing animation
 * - Continuous peaceful floating animation loop (ck-divine-float)
 * - Gentle swaying trunk (Vakratunda) loop (ck-trunk-sway)
 * - Grounded Mushak (mouse) sitting at Ganesha's base, slightly in front, facing Ganesha,
 *   with playful tail twitch & idle bobbing loop
 */
/**
 * GanpatiDivineIllo — Dignified, reverent, temple-grade illustration of Lord Ganesha & Mushak.
 *
 * Classical Indian festival iconography features:
 * 1. Proper depth with multi-tone light & shadow gradients (no flat clipart).
 * 2. Serene, compassionate, meditative lotus-petal eyes (Karuna Drishti) with defined kohl and catchlights.
 * 3. Intricate tiered temple Shikhara crown (Mukut) with filigree, cabochon rubies, emeralds, and pearls.
 * 4. Draped saffron silk dhoti with realistic fold lines, central cascading patka, and golden zari borders.
 * 5. Grounded, reverent, anatomically refined Mushak (mouse companion) holding a modak sweet.
 * 6. Layered soft divine radiance halo with subtle sacred solar geometry.
 * 7. Supports 'cta' variant with enhanced golden rim-lighting, glow, and presence for dark backgrounds.
 */
export function GanpatiDivineIllo({
  variant = "hero",
  className = "",
}: {
  variant?: "hero" | "cta";
  className?: string;
}) {
  const isCta = variant === "cta";

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center p-2 select-none ${
        isCta
          ? "min-h-[340px] sm:min-h-[400px] lg:min-h-[440px]"
          : "min-h-[380px] sm:min-h-[460px] lg:min-h-[540px]"
      } ${className}`}
    >
      <GanpatiAnimationStyles />

      {/* 1. Divine Pulsing Radiance / Halo behind Ganesha */}
      <div
        className={`ck-halo-pulse absolute rounded-full bg-radial from-[#fef08a]/70 via-[#f59e0b]/40 to-transparent blur-3xl pointer-events-none ${
          isCta
            ? "size-[380px] sm:size-[460px] lg:size-[520px] from-[#fef08a]/85 via-[#f59e0b]/55"
            : "size-[420px] sm:size-[520px] lg:size-[600px]"
        }`}
      />

      {/* 2. Main Seated Lord Ganesha & Grounded Mushak SVG */}
      <div
        className={`ck-divine-float relative z-10 w-full flex items-center justify-center ${
          isCta
            ? "max-w-[420px] lg:max-w-[460px]"
            : "max-w-[640px] lg:max-w-[700px]"
        }`}
      >
        <svg
          viewBox="0 0 540 500"
          fill="none"
          className={`w-full h-auto ${
            isCta
              ? "drop-shadow-[0_0_35px_rgba(251,191,36,0.45)] drop-shadow-[0_18px_36px_rgba(0,0,0,0.85)]"
              : "drop-shadow-[0_25px_50px_rgba(114,43,8,0.28)]"
          }`}
          aria-label="Lord Ganesha with Mushak seated in divine dignity and grace"
        >
          <defs>
            {/* Sacred Divine Aura */}
            <radialGradient id="sacredHaloSoft" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.96" />
              <stop offset="35%" stopColor="#fef08a" stopOpacity="0.75" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="88%" stopColor="#ea580c" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
            </radialGradient>

            {/* Banana Leaf Base */}
            <linearGradient id="bananaLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="30%" stopColor="#16a34a" />
              <stop offset="70%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Lotus Petals */}
            <linearGradient id="lotusPetalGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#fff1f2" />
              <stop offset="25%" stopColor="#f472b6" />
              <stop offset="60%" stopColor="#db2777" />
              <stop offset="88%" stopColor="#9d174d" />
              <stop offset="100%" stopColor="#4c0519" />
            </linearGradient>

            {/* Sculpted Divine Skin with Highlights & Shadows */}
            <linearGradient id="skinSculptGrad" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="20%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#fdba74" />
              <stop offset="80%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Ambient Occlusion Skin Shadow */}
            <linearGradient id="skinShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2410c" stopOpacity="0" />
              <stop offset="50%" stopColor="#9a3412" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.75" />
            </linearGradient>

            {/* Royal Temple Shikhara Crown Gold */}
            <linearGradient id="royalMukutGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="18%" stopColor="#fef08a" />
              <stop offset="42%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="90%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Golden Filigree & Jewelry */}
            <linearGradient id="goldJewelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#fffbeb" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Draped Saffron Silk Dhoti */}
            <linearGradient id="dhotiSilkGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="20%" stopColor="#facc15" />
              <stop offset="55%" stopColor="#eab308" />
              <stop offset="85%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>

            {/* Royal Crimson Sash / Central Pleat Drape */}
            <linearGradient id="sashCrimsonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Sacred Ivory Tusk */}
            <linearGradient id="ivoryTuskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#fefce8" />
              <stop offset="88%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Shaded Mushak (Mouse) Anatomy */}
            <linearGradient id="mushakGrad" x1="20%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#e7e5e4" />
              <stop offset="35%" stopColor="#a8a29e" />
              <stop offset="70%" stopColor="#78716c" />
              <stop offset="90%" stopColor="#57534e" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>

            {/* Gems */}
            <radialGradient id="rubyCabochon" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            <radialGradient id="emeraldCabochon" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="40%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>

            <radialGradient id="pearlShine" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
          </defs>

          {/* 1. DIVINE HALO (Prabhavali Radiance) */}
          <g id="divine-halo">
            {/* Outer soft glow aura */}
            <circle cx="270" cy="180" r="148" fill="url(#sacredHaloSoft)" />
            
            {/* Sacred rays (16 radiating solar lines with tiny diamond star terminals) */}
            {[...Array(16)].map((_, i) => {
              const deg = i * 22.5;
              const rad = (deg * Math.PI) / 180;
              const x1 = 270 + Math.cos(rad) * 116;
              const y1 = 180 + Math.sin(rad) * 116;
              const x2 = 270 + Math.cos(rad) * 138;
              const y2 = 180 + Math.sin(rad) * 138;
              return (
                <g key={i} opacity="0.32">
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1.4" />
                  <circle cx={x2} cy={y2} r="1.5" fill="#fef08a" />
                </g>
              );
            })}

            {/* Concentric sacred halo rings */}
            <circle cx="270" cy="180" r="126" stroke="#fef08a" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.75" />
            <circle cx="270" cy="180" r="114" stroke="#fbbf24" strokeWidth="2.2" opacity="0.65" />
            <circle cx="270" cy="180" r="98" stroke="#f59e0b" strokeWidth="1.2" opacity="0.45" />
          </g>

          {/* 2. SACRED BASE: BANANA LEAF & LOTUS THRONE */}
          {/* Banana Leaf Base with Rib Veins */}
          <g id="banana-leaf-throne">
            <path
              d="M50 420 C130 380, 410 380, 490 420 C420 480, 120 480, 50 420 Z"
              fill="url(#bananaLeafGrad)"
              stroke="#14532d"
              strokeWidth="2.2"
            />
            {/* Central stem */}
            <path d="M68 420 Q270 442 472 420" stroke="#86efac" strokeWidth="2.2" opacity="0.65" />
            {/* Fine leaf veins */}
            <path d="M120 424 Q135 438 150 446 M180 428 Q200 444 220 452 M320 452 Q340 444 360 428 M390 446 Q405 438 420 424" stroke="#4ade80" strokeWidth="1.1" opacity="0.45" />
          </g>

          {/* Lotus Throne Petals (Layered for 3D depth) */}
          <g id="lotus-throne">
            {/* Under-throne ground shadow */}
            <ellipse cx="270" cy="422" rx="150" ry="24" fill="#3b071a" opacity="0.45" />

            {/* Back row of blooming petals */}
            {[-68, -46, -24, 0, 24, 46, 68].map((deg, i) => (
              <path
                key={`lotus-back-${i}`}
                d="M270 424 C242 396, 252 355, 270 342 C288 355, 298 396, 270 424 Z"
                fill="url(#lotusPetalGrad)"
                transform={`rotate(${deg} 270 420)`}
                stroke="#fbcfe8"
                strokeWidth="0.9"
              />
            ))}

            {/* Front row of curved supporting petals */}
            {[-54, -30, -10, 10, 30, 54].map((deg, i) => (
              <path
                key={`lotus-front-${i}`}
                d="M270 430 C248 408, 256 376, 270 366 C284 376, 292 408, 270 430 Z"
                fill="url(#lotusPetalGrad)"
                transform={`rotate(${deg} 270 424)`}
                stroke="#fce7f3"
                strokeWidth="0.75"
                opacity="0.95"
              />
            ))}

            {/* Golden pericarp seat (throne cushion) */}
            <ellipse cx="270" cy="412" rx="108" ry="18" fill="url(#royalMukutGold)" stroke="#92400e" strokeWidth="1.5" />
            <ellipse cx="270" cy="410" rx="98" ry="14" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
            {/* Beaded rim around throne cushion */}
            <ellipse cx="270" cy="411" rx="102" ry="15" fill="none" stroke="#fffbeb" strokeWidth="1.8" strokeDasharray="3 4" opacity="0.8" />
          </g>

          {/* 3. LORD GANESHA SEATED BODY & DHOTI */}
          <g id="seated-ganesha-body">
            {/* Seated legs / Dhoti base in Padmasana */}
            <path
              d="M152 392 C168 325, 372 325, 388 392 C350 422, 190 422, 152 392 Z"
              fill="url(#dhotiSilkGrad)"
              stroke="#854d0e"
              strokeWidth="2"
            />
            {/* Realistic fabric pleat creases and highlights */}
            <path d="M165 385 Q210 365 245 395" stroke="#ca8a04" strokeWidth="2.5" fill="none" />
            <path d="M178 398 Q220 378 255 408" stroke="#a16207" strokeWidth="1.8" fill="none" />
            <path d="M375 385 Q330 365 295 395" stroke="#ca8a04" strokeWidth="2.5" fill="none" />
            <path d="M362 398 Q320 378 285 408" stroke="#a16207" strokeWidth="1.8" fill="none" />

            {/* Central cascading pleats (Patka) with golden zari borders */}
            <path
              d="M252 360 L288 360 L294 425 L246 425 Z"
              fill="url(#sashCrimsonGrad)"
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            {/* Golden zari border on central pleat */}
            <path d="M252 360 L246 425 M288 360 L294 425" stroke="#fbbf24" strokeWidth="2" />
            <path d="M246 422 L294 422" stroke="#fef08a" strokeWidth="3" />
            <path d="M248 416 L292 416" stroke="#ca8a04" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Divine Feet with Golden Anklets & Alta Dye */}
            {/* Left Foot */}
            <ellipse cx="230" cy="415" rx="16" ry="9" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.2" />
            <path d="M220 417 C225 422, 235 422, 240 417" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="230" cy="410" rx="14" ry="4" fill="none" stroke="#f59e0b" strokeWidth="2" />
            {/* Right Foot */}
            <ellipse cx="310" cy="415" rx="16" ry="9" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.2" />
            <path d="M300 417 C305 422, 315 422, 320 417" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="310" cy="410" rx="14" ry="4" fill="none" stroke="#f59e0b" strokeWidth="2" />

            {/* Sacred Paunch (Lambodara) with dimensional lighting */}
            <g id="paunch-lambodara">
              <ellipse cx="270" cy="316" rx="76" ry="66" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="2" />
              {/* Subtle ambient shadow under paunch */}
              <path
                d="M202 335 C220 375, 320 375, 338 335 C320 384, 220 384, 202 335 Z"
                fill="url(#skinShadowGrad)"
              />
              {/* Sacred Navel */}
              <ellipse cx="270" cy="336" rx="3.5" ry="4.5" fill="#9a3412" />
              <ellipse cx="270" cy="335" rx="2" ry="2.8" fill="#7c2d12" />
              <circle cx="269" cy="334" r="0.8" fill="#fed7aa" />

              {/* Auspicious Royal Kamarbandh (Waistband) */}
              <path d="M204 330 Q270 378 336 330" stroke="url(#royalMukutGold)" strokeWidth="5.5" fill="none" />
              <path d="M208 332 Q270 380 332 332" stroke="#fffbeb" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
              {/* Central Ruby Clasp on Belt */}
              <circle cx="270" cy="362" r="7" fill="url(#royalMukutGold)" stroke="#78350f" strokeWidth="1.2" />
              <circle cx="270" cy="362" r="4.5" fill="url(#rubyCabochon)" />
              {/* Dangling Golden Tassels */}
              <path d="M266 368 L263 382 M274 368 L277 382" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="263" cy="384" r="2" fill="#fbbf24" />
              <circle cx="277" cy="384" r="2" fill="#fbbf24" />
            </g>

            {/* Sacred Janeu (Yajnopavita / Holy Thread) */}
            <g id="janeu-thread">
              <path d="M226 250 Q260 300 298 360" stroke="#fffbeb" strokeWidth="2.8" fill="none" />
              <path d="M228 252 Q262 302 300 362" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="4 3" fill="none" />
              {/* Golden Janeu bead dividers */}
              <circle cx="242" cy="272" r="2" fill="#f59e0b" />
              <circle cx="268" cy="314" r="2.2" fill="#f59e0b" />
              <circle cx="286" cy="342" r="2" fill="#f59e0b" />
            </g>

            {/* Royal Gold Haar / Choker Necklace on Upper Chest */}
            <path d="M226 238 Q270 270 314 238" stroke="url(#royalMukutGold)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d="M232 242 Q270 272 308 242" stroke="#fffbeb" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
            {/* Center Hanging Ruby Pendant */}
            <circle cx="270" cy="262" r="4.5" fill="url(#rubyCabochon)" stroke="#fef08a" strokeWidth="1.2" />
            <circle cx="270" cy="269" r="2.2" fill="url(#pearlShine)" />
          </g>

          {/* 4. UPPER ARMS & DIVINE IMPLEMENTS */}
          <g id="upper-arms">
            {/* Upper Right Arm holding Ankusha (Golden Goad) */}
            <g id="upper-right-arm">
              <path d="M208 252 C185 240, 175 220, 185 205 C192 195, 204 205, 214 220 Z" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.4" />
              <ellipse cx="194" cy="216" rx="8" ry="4" fill="none" stroke="url(#royalMukutGold)" strokeWidth="2" />
              {/* Golden Ankusha (Goad) */}
              <line x1="172" y1="240" x2="194" y2="175" stroke="url(#royalMukutGold)" strokeWidth="3" strokeLinecap="round" />
              <path d="M194 175 C194 165, 206 168, 206 178 C206 186, 196 188, 192 186" fill="none" stroke="url(#royalMukutGold)" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="194" cy="175" r="2.5" fill="url(#rubyCabochon)" />
            </g>

            {/* Upper Left Arm holding Sacred Pasha / Lotus Bud */}
            <g id="upper-left-arm">
              <path d="M332 252 C355 240, 365 220, 355 205 C348 195, 336 205, 326 220 Z" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.4" />
              <ellipse cx="346" cy="216" rx="8" ry="4" fill="none" stroke="url(#royalMukutGold)" strokeWidth="2" />
              {/* Sacred Golden Pasha (Loop of Detachment) */}
              <ellipse cx="360" cy="185" rx="10" ry="16" fill="none" stroke="url(#royalMukutGold)" strokeWidth="2.8" />
              <circle cx="360" cy="201" r="2.5" fill="url(#emeraldCabochon)" />
              <line x1="360" y1="202" x2="352" y2="225" stroke="url(#royalMukutGold)" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </g>

          {/* 5. FOREARMS, HANDS & ATTRIBUTES */}
          {/* Lower Right Hand in Abhaya Mudra (Blessing & Protection) */}
          <g id="abhaya-mudra-hand">
            {/* Forearm */}
            <path d="M216 278 C198 285, 185 292, 175 285 C168 280, 175 268, 195 264 Z" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.4" />
            {/* Golden Kada on wrist */}
            <rect x="180" y="270" width="7" height="15" rx="3.5" fill="url(#royalMukutGold)" stroke="#b45309" strokeWidth="0.8" transform="rotate(-15 183 277)" />
            {/* Open Blessing Palm with Graceful Classical Fingers */}
            <g transform="translate(164, 255)">
              <path
                d="M12 28 C6 18, 5 6, 16 2 C22 0, 26 8, 26 18 C26 28, 20 34, 12 28 Z"
                fill="url(#skinSculptGrad)"
                stroke="#c2410c"
                strokeWidth="1.4"
              />
              {/* Fingers defined gracefully */}
              <path d="M20 2 C22 -3, 27 -2, 27 6 L27 18" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <path d="M16 2 C17 -4, 21 -4, 22 4" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              {/* Auspicious Vermilion Blessing Medallion on Palm */}
              <circle cx="16" cy="18" r="4.8" fill="#dc2626" />
              <circle cx="16" cy="18" r="2.2" fill="#fffbeb" />
              {/* Gold ring on finger */}
              <circle cx="21" cy="7" r="1.4" fill="#fbbf24" />
            </g>
          </g>

          {/* Lower Left Hand holding Modak Patra (Bowl of Modaks) */}
          <g id="modak-patra-hand">
            {/* Forearm */}
            <path d="M324 278 C342 285, 355 292, 365 285 C372 280, 365 268, 345 264 Z" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.4" />
            {/* Golden Kada on wrist */}
            <rect x="353" y="270" width="7" height="15" rx="3.5" fill="url(#royalMukutGold)" stroke="#b45309" strokeWidth="0.8" transform="rotate(15 356 277)" />
            
            {/* Cupped Hand */}
            <ellipse cx="366" cy="288" rx="16" ry="12" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="1.2" />
            
            {/* Engraved Golden Modak Patra (Katori Bowl) */}
            <g transform="translate(364, 278)">
              {/* Bowl Body */}
              <path
                d="M-2 12 C-2 24, 32 24, 32 12 C32 8, -2 8, -2 12 Z"
                fill="url(#royalMukutGold)"
                stroke="#92400e"
                strokeWidth="1.5"
              />
              <ellipse cx="15" cy="9" rx="17" ry="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
              {/* Repoussé floral rim on bowl */}
              <ellipse cx="15" cy="9" rx="15" ry="4.5" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* Fragrant Golden Modaks with Saffron Crests */}
              {/* Modak 1 (Back Left) */}
              <path d="M5 6 C3 1, 9 -2, 10 5 Z" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
              <circle cx="8" cy="-1" r="0.8" fill="#ea580c" />
              {/* Modak 2 (Back Right) */}
              <path d="M19 6 C17 1, 23 -2, 24 5 Z" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
              <circle cx="22" cy="-1" r="0.8" fill="#ea580c" />
              {/* Modak 3 (Center Foreground - Large) */}
              <path d="M10 7 C8 -1, 19 -1, 18 7 Z" fill="url(#royalMukutGold)" stroke="#92400e" strokeWidth="1" />
              <path d="M14 -2 L14 7" stroke="#fffbeb" strokeWidth="0.9" strokeLinecap="round" />
              <circle cx="14" cy="-2.5" r="1.1" fill="#dc2626" />
              {/* Modak 4 (Left Front) */}
              <circle cx="4" cy="7" r="4.2" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
              {/* Modak 5 (Right Front) */}
              <circle cx="25" cy="7" r="4.2" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
            </g>
          </g>

          {/* 6. DIVINE ELEPHANT HEAD, SURPA EARS & NOBLE BROW */}
          <g id="divine-head-and-face">
            {/* Large Surpa Karna (Ears) with Anatomic Shading & Golden Temple Earrings */}
            {/* Left Ear */}
            <g id="left-ear">
              <path
                d="M216 186 C132 146, 122 248, 208 244 Z"
                fill="url(#skinSculptGrad)"
                stroke="#c2410c"
                strokeWidth="2.2"
              />
              {/* Inner ear warm recess shadow */}
              <path
                d="M202 192 C146 166, 142 234, 198 232"
                stroke="#ea580c"
                strokeWidth="2.8"
                fill="none"
                opacity="0.55"
              />
              <path
                d="M194 200 C158 180, 154 224, 190 222"
                stroke="#c2410c"
                strokeWidth="1.6"
                fill="none"
                opacity="0.4"
              />
              {/* Golden Temple Karnaphool (Earring) with Ruby & Pearl Drop */}
              <g transform="translate(142, 232)">
                <circle cx="0" cy="0" r="4.8" fill="url(#royalMukutGold)" stroke="#92400e" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="2.8" fill="url(#rubyCabochon)" />
                <circle cx="0" cy="8" r="2.6" fill="url(#pearlShine)" stroke="#ca8a04" strokeWidth="0.6" />
                <line x1="0" y1="4.8" x2="0" y2="6.2" stroke="#fbbf24" strokeWidth="1" />
              </g>
            </g>

            {/* Right Ear */}
            <g id="right-ear">
              <path
                d="M324 186 C408 146, 418 248, 332 244 Z"
                fill="url(#skinSculptGrad)"
                stroke="#c2410c"
                strokeWidth="2.2"
              />
              {/* Inner ear warm recess shadow */}
              <path
                d="M338 192 C394 166, 398 234, 342 232"
                stroke="#ea580c"
                strokeWidth="2.8"
                fill="none"
                opacity="0.55"
              />
              <path
                d="M346 200 C382 180, 386 224, 350 222"
                stroke="#c2410c"
                strokeWidth="1.6"
                fill="none"
                opacity="0.4"
              />
              {/* Golden Temple Karnaphool (Earring) with Ruby & Pearl Drop */}
              <g transform="translate(398, 232)">
                <circle cx="0" cy="0" r="4.8" fill="url(#royalMukutGold)" stroke="#92400e" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="2.8" fill="url(#rubyCabochon)" />
                <circle cx="0" cy="8" r="2.6" fill="url(#pearlShine)" stroke="#ca8a04" strokeWidth="0.6" />
                <line x1="0" y1="4.8" x2="0" y2="6.2" stroke="#fbbf24" strokeWidth="1" />
              </g>
            </g>

            {/* Noble Elephant Head */}
            <ellipse cx="270" cy="204" rx="60" ry="56" fill="url(#skinSculptGrad)" stroke="#c2410c" strokeWidth="2.2" />

            {/* Temporal lobe modeling highlights */}
            <ellipse cx="248" cy="180" rx="14" ry="10" fill="#fff7ed" opacity="0.3" />
            <ellipse cx="292" cy="180" rx="14" ry="10" fill="#fff7ed" opacity="0.25" />

            {/* 
              SERENE, COMPASSIONATE LOTUS-PETAL EYES (Padmaksha / Karuna Drishti)
              Classical half-closed meditative gaze with refined kohl linework,
              rich iris, and specular white catchlight — dignified, not cartoonish.
            */}
            <g id="classical-serene-eyes">
              {/* Left Eye */}
              <g id="left-eye">
                {/* Almond eye socket shadow */}
                <path d="M236 200 C244 193, 256 193, 262 201 C254 206, 244 206, 236 200 Z" fill="#fffbeb" stroke="#78350f" strokeWidth="0.7" />
                {/* Upper kohl-lined eyelid curve */}
                <path d="M235 200 C243 192, 257 192, 264 201" stroke="#292524" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                {/* Dark Amber / Kohl Iris */}
                <ellipse cx="250" cy="199" rx="4.2" ry="4" fill="#1c1917" />
                <circle cx="250" cy="199" r="2.2" fill="#78350f" />
                {/* Specular White Catchlight */}
                <circle cx="248.8" cy="198" r="1.1" fill="#ffffff" />
                {/* Lower lid soft shadow */}
                <path d="M238 202 C245 206, 255 206, 261 202" stroke="#a8a29e" strokeWidth="0.8" fill="none" />
              </g>

              {/* Right Eye */}
              <g id="right-eye">
                {/* Almond eye socket shadow */}
                <path d="M278 201 C284 193, 296 193, 304 200 C296 206, 286 206, 278 201 Z" fill="#fffbeb" stroke="#78350f" strokeWidth="0.7" />
                {/* Upper kohl-lined eyelid curve */}
                <path d="M276 201 C283 192, 297 192, 305 200" stroke="#292524" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                {/* Dark Amber / Kohl Iris */}
                <ellipse cx="290" cy="199" rx="4.2" ry="4" fill="#1c1917" />
                <circle cx="290" cy="199" r="2.2" fill="#78350f" />
                {/* Specular White Catchlight */}
                <circle cx="288.8" cy="198" r="1.1" fill="#ffffff" />
                {/* Lower lid soft shadow */}
                <path d="M279 202 C285 206, 295 206, 302 202" stroke="#a8a29e" strokeWidth="0.8" fill="none" />
              </g>

              {/* Dignified Brow Lines */}
              <path d="M234 191 Q248 186 262 192" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
              <path d="M278 192 Q292 186 306 191" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
            </g>

            {/* Sacred Tripundra & Tilak on Forehead */}
            <g id="sacred-tilak">
              {/* Chandan Tripundra (3 Ivory Sandalwood horizontal lines) */}
              <path d="M246 168 L294 168" stroke="#fffbeb" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M249 174 L291 174" stroke="#fffbeb" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M253 179 L287 179" stroke="#fffbeb" strokeWidth="1.8" strokeLinecap="round" />
              {/* Central Kumkum Vermilion Tilak (Urdhva Pundra) */}
              <path d="M266 160 C266 155, 274 155, 274 160 L274 180 C274 184, 266 184, 266 180 Z" fill="#dc2626" />
              <ellipse cx="270" cy="172" rx="3" ry="7" fill="#b91c1c" />
              {/* Golden Auspicious Bindu */}
              <circle cx="270" cy="180" r="2.2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
            </g>

            {/* Tusks (Ekadanta) */}
            <g id="tusks">
              {/* Left Tusk (Viewer's left): Graceful unbroken curving ivory tusk */}
              <path
                d="M248 238 C244 246, 234 254, 238 258 C242 258, 252 248, 254 240 Z"
                fill="url(#ivoryTuskGrad)"
                stroke="#ca8a04"
                strokeWidth="1"
              />
              <circle cx="251" cy="239" r="2" fill="#fbbf24" />

              {/* Right Tusk (Viewer's right): Broken sacred tusk with ornate golden filigree cap */}
              <path
                d="M292 240 L286 248 L294 247 Z"
                fill="url(#ivoryTuskGrad)"
                stroke="#ca8a04"
                strokeWidth="1"
              />
              {/* Engraved golden cap on broken tusk */}
              <path d="M284 247 L296 246" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
              <circle cx="290" cy="247" r="1.2" fill="url(#rubyCabochon)" />
            </g>

            {/* 
              ANIMATED SWAYING TRUNK (Vakratunda)
              Contoured with skin wrinkles, golden trunk valaya ring, and elegant curl toward modak.
            */}
            <g className="ck-trunk-sway">
              <path
                d="M258 218 C258 274, 274 308, 306 308 C328 308, 342 296, 340 286 C338 277, 326 277, 323 286 C318 295, 296 292, 284 258 C278 236, 282 218, 282 218 Z"
                fill="url(#skinSculptGrad)"
                stroke="#c2410c"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Natural elephant skin crease rings along the trunk */}
              <path d="M264 238 Q272 245 280 238" stroke="#ca8a04" strokeWidth="1.5" fill="none" opacity="0.75" />
              <path d="M266 254 Q275 262 284 254" stroke="#ca8a04" strokeWidth="1.5" fill="none" opacity="0.75" />
              <path d="M272 270 Q282 278 292 270" stroke="#ca8a04" strokeWidth="1.5" fill="none" opacity="0.75" />

              {/* Ornate Golden Trunk Ring (Valaya) with Ruby */}
              <g transform="translate(292, 286)">
                <ellipse cx="6" cy="4" rx="10" ry="4" fill="url(#royalMukutGold)" stroke="#92400e" strokeWidth="1" transform="rotate(20 6 4)" />
                <circle cx="6" cy="4" r="2.2" fill="url(#rubyCabochon)" />
              </g>

              {/* Sacred Golden Lotus Blossom at Trunk Tip */}
              <circle cx="334" cy="284" r="5.2" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="1" />
              <circle cx="334" cy="284" r="2.4" fill="#fffbeb" />
            </g>
          </g>

          {/* 7. MAGNIFICENT TEMPLE SHIKHARA CROWN (Mukut) */}
          <g id="royal-shikhara-mukut">
            {/* Crown Base Shadow on Forehead */}
            <path d="M228 162 Q270 172 312 162" stroke="#78350f" strokeWidth="3" opacity="0.4" fill="none" />

            {/* Tier 1: Arched Lower Gold Band with Cabochon Jewels */}
            <path
              d="M226 160 Q270 170 314 160 L318 144 Q270 152 222 144 Z"
              fill="url(#royalMukutGold)"
              stroke="#78350f"
              strokeWidth="1.6"
            />
            {/* Alternating Inlaid Rubies, Emeralds, and Pearls on Base Band */}
            <circle cx="236" cy="154" r="3.2" fill="url(#rubyCabochon)" stroke="#fef08a" strokeWidth="0.8" />
            <circle cx="253" cy="157" r="3.2" fill="url(#emeraldCabochon)" stroke="#fef08a" strokeWidth="0.8" />
            <circle cx="270" cy="158" r="4.2" fill="url(#rubyCabochon)" stroke="#fffbeb" strokeWidth="1" />
            <circle cx="287" cy="157" r="3.2" fill="url(#emeraldCabochon)" stroke="#fef08a" strokeWidth="0.8" />
            <circle cx="304" cy="154" r="3.2" fill="url(#rubyCabochon)" stroke="#fef08a" strokeWidth="0.8" />

            {/* Tier 2: Repoussé Filigree Petal Crest */}
            <path
              d="M224 144 C224 116, 246 102, 270 98 C294 102, 316 116, 316 144 Z"
              fill="url(#royalMukutGold)"
              stroke="#92400e"
              strokeWidth="1.8"
            />
            {/* Golden relief scrolls on Tier 2 */}
            <path d="M240 138 Q255 116 270 114 Q285 116 300 138" stroke="#fffbeb" strokeWidth="1.6" fill="none" opacity="0.8" />
            <path d="M250 142 Q260 126 270 124 Q280 126 290 142" stroke="#d97706" strokeWidth="1.2" fill="none" />
            <circle cx="270" cy="116" r="5" fill="url(#rubyCabochon)" stroke="#fbbf24" strokeWidth="1" />

            {/* Tier 3: Conical Shikhara Spire with Layered Gold Ridges */}
            <path
              d="M246 102 L238 68 L270 46 L302 68 L294 102 Z"
              fill="url(#royalMukutGold)"
              stroke="#78350f"
              strokeWidth="1.8"
            />
            {/* Horizontal stepped gold ridges on spire */}
            <line x1="242" y1="84" x2="298" y2="84" stroke="#fffbeb" strokeWidth="1.8" />
            <line x1="246" y1="74" x2="294" y2="74" stroke="#fbbf24" strokeWidth="1.4" />
            <line x1="254" y1="62" x2="286" y2="62" stroke="#fffbeb" strokeWidth="1.4" />
            {/* Central Emerald on Spire */}
            <circle cx="270" cy="74" r="4.2" fill="url(#emeraldCabochon)" stroke="#fef08a" strokeWidth="0.8" />

            {/* Tier 4: Pinnacle Sacred Kalash Finial */}
            <g transform="translate(270, 46)">
              {/* Kalash Pot */}
              <ellipse cx="0" cy="0" rx="9" ry="5" fill="url(#royalMukutGold)" stroke="#78350f" strokeWidth="1" />
              {/* Spire Tip */}
              <path d="M-4 0 L0 -14 L4 0 Z" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
              {/* Ruby Pinnacle Drop */}
              <circle cx="0" cy="-14" r="2.8" fill="url(#rubyCabochon)" stroke="#fffbeb" strokeWidth="0.8" />
            </g>
          </g>

          {/* 8. OFFERING THALI (BESIDE MUSHAK) */}
          <g transform="translate(372, 428)">
            {/* Brass Thali Platter */}
            <ellipse cx="16" cy="14" rx="20" ry="7" fill="url(#royalMukutGold)" stroke="#78350f" strokeWidth="1.2" />
            <ellipse cx="16" cy="13" rx="17" ry="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            {/* Sweet Modaks on platter */}
            <circle cx="11" cy="9" r="4" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="21" cy="9" r="4" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="16" cy="5" r="3.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            {/* Sacred Red Jaswand (Hibiscus) offering on plate */}
            <circle cx="25" cy="12" r="3" fill="#dc2626" />
            <circle cx="25" cy="12" r="1.2" fill="#fbbf24" />
          </g>

          {/* 
            9. REFINED, DIGNIFIED MUSHAK (MOUSE COMPANION)
            Seated gracefully on folded hind legs, looking reverently toward Ganesha,
            with shaded anatomy, fine whiskers, gentle tail twitch, and front paws holding a modak.
          */}
          <g transform="translate(398, 396)">
            <g className="ck-mushak-bob">
              {/* Soft Ground Contact Shadow */}
              <ellipse cx="26" cy="38" rx="24" ry="6" fill="#451a03" opacity="0.4" />

              {/* Animated Twitching Slender Tail */}
              <g className="ck-mushak-tail">
                <path
                  d="M37 32 C48 30, 56 22, 52 14 C49 10, 44 14, 46 19 C48 24, 43 28, 38 31"
                  stroke="#57534e"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>

              {/* Folded Hind Leg & Haunch (Realistic mouse posture) */}
              <ellipse cx="29" cy="29" rx="14" ry="10" fill="url(#mushakGrad)" stroke="#1c1917" strokeWidth="1.2" />
              {/* Hind paw */}
              <ellipse cx="22" cy="37" rx="6" ry="3" fill="#a8a29e" stroke="#292524" strokeWidth="0.8" />

              {/* Mouse Body & Arched Back */}
              <path
                d="M16 18 C12 24, 14 36, 26 36 C34 36, 38 28, 34 20 C30 14, 20 14, 16 18 Z"
                fill="url(#mushakGrad)"
                stroke="#1c1917"
                strokeWidth="1.3"
              />

              {/* Soft Light Warm Chest / Underbelly Fur Highlight */}
              <ellipse cx="18" cy="27" rx="8" ry="6" fill="#e7e5e4" opacity="0.85" />

              {/* Dignified Head raised reverently facing Ganesha (leftwards) */}
              <path
                d="M16 15 C10 14, 1 18, -2 22 C2 26, 11 26, 17 23 Z"
                fill="url(#mushakGrad)"
                stroke="#1c1917"
                strokeWidth="1.3"
              />

              {/* Delicate Ears with Soft Pink Inner Lining */}
              <ellipse cx="18" cy="10" rx="5.5" ry="7.5" fill="url(#mushakGrad)" stroke="#1c1917" strokeWidth="1.1" />
              <ellipse cx="18" cy="10.5" rx="3.5" ry="5.2" fill="#fbcfe8" />

              {/* Glistening Reverent Eye with Catchlight Glint */}
              <circle cx="7" cy="18" r="2.2" fill="#0c0a09" />
              <circle cx="6.3" cy="17.3" r="0.8" fill="#ffffff" />

              {/* Dark Snout & Nose Tip */}
              <circle cx="-2" cy="21.5" r="1.4" fill="#292524" />

              {/* Fine Delicate Whiskers */}
              <path d="M0 20 L-8 17 M0 21.5 L-9 21.5 M0 23 L-8 25" stroke="#57534e" strokeWidth="0.75" opacity="0.85" strokeLinecap="round" />

              {/* Sacred Golden Bell on Red Neck Ribbon */}
              <path d="M12 21 C14 24, 18 24, 20 20" stroke="#dc2626" strokeWidth="1.4" fill="none" />
              <circle cx="15" cy="24" r="2" fill="#fbbf24" stroke="#b45309" strokeWidth="0.6" />

              {/* Forepaws folded reverently holding a mini golden modak */}
              <ellipse cx="10" cy="25" rx="3.5" ry="2.2" fill="#d6d3d1" stroke="#44403c" strokeWidth="0.8" />
              <circle cx="4" cy="24" r="3.8" fill="url(#goldJewelGrad)" stroke="#b45309" strokeWidth="0.9" />
              <circle cx="4" cy="22" r="1.1" fill="#fffbeb" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * Hero Section Ganpati Illustration (Backwards compatibility wrapper)
 */
export function GanpatiHeroIllo() {
  return <GanpatiDivineIllo variant="hero" />;
}
