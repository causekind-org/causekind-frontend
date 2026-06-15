"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Heart, HandCoins, CheckCircle2, ArrowLeft, ChevronRight } from "lucide-react";

const STEP_DURATION = 3400; // ms — mobile auto-play only

const STEPS = [
  {
    number: "01",
    Icon: Search,
    accentBg: "bg-[#b04a15]",
    accentText: "text-[#b04a15]",
    accentRing: "ring-[#b04a15]/30",
    title: "Discover Causes",
    desc: "Browse real campaigns and item requests near you. Every listing is reviewed by our team before it goes live.",
  },
  {
    number: "02",
    Icon: Heart,
    accentBg: "bg-rose-500",
    accentText: "text-rose-500",
    accentRing: "ring-rose-400/30",
    title: "Choose How to Give",
    desc: "Donate money to a campaign, or give physical items like books or clothes to someone nearby.",
  },
  {
    number: "03",
    Icon: HandCoins,
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-600",
    accentRing: "ring-emerald-500/30",
    title: "Give Directly",
    desc: "100% of what you give reaches the person who needs it. We charge nothing — ever.",
  },
  {
    number: "04",
    Icon: CheckCircle2,
    accentBg: "bg-[#1e3a60]",
    accentText: "text-[#1e3a60]",
    accentRing: "ring-[#1e3a60]/30",
    title: "See Your Impact",
    desc: "Get a verified certificate and track your donation all the way to delivery.",
  },
];

/* ─────────────────────────── phone screens ─────────────────────────── */

function DiscoverScreen() {
  return (
    <div className="flex flex-col h-full pt-4 pb-2 px-3 bg-white">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-black text-stone-900">CauseKind</span>
        <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center">
          <Search className="w-2.5 h-2.5 text-[#b04a15]" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        <span className="bg-[#b04a15] text-white text-[7px] px-2 py-0.5 rounded-full font-bold shrink-0">All</span>
        <span className="bg-stone-100 text-stone-500 text-[7px] px-2 py-0.5 rounded-full font-medium shrink-0">Medical</span>
        <span className="bg-stone-100 text-stone-500 text-[7px] px-2 py-0.5 rounded-full font-medium shrink-0">Education</span>
      </div>
      {[
        { cat: "Child Education", city: "Mumbai", pct: 65, color: "from-orange-400 to-amber-300" },
        { cat: "Medical Aid", city: "Delhi", pct: 32, color: "from-rose-400 to-pink-300" },
      ].map((c, i) => (
        <div key={i} className="mb-2 rounded-xl overflow-hidden border border-stone-100 bg-white shadow-sm">
          <div className={`w-full h-10 bg-gradient-to-r ${c.color}`} />
          <div className="p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-bold text-stone-900 truncate">{c.cat} · {c.city}</span>
              <span className="text-[7px] text-[#b04a15] font-black">{c.pct}%</span>
            </div>
            <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#b04a15] to-[#e07b3a] rounded-full" style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        </div>
      ))}
      <div className="mt-auto pt-1">
        <div className="w-full h-7 bg-[#b04a15] rounded-xl flex items-center justify-center">
          <span className="text-white text-[8px] font-black">Donate Now</span>
        </div>
      </div>
    </div>
  );
}

function DetailScreen() {
  return (
    <div className="flex flex-col h-full pb-3 bg-white">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-stone-50">
        <ArrowLeft className="w-3 h-3 text-stone-500" />
        <span className="text-[9px] font-bold text-stone-700">Campaign</span>
      </div>
      <div className="w-full h-[72px] bg-gradient-to-br from-orange-400 via-amber-400 to-orange-600 relative shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-2 left-2">
          <span className="text-[7px] bg-[#b04a15] text-white px-1.5 py-0.5 rounded-md font-bold">Education</span>
        </div>
      </div>
      <div className="px-3 pt-2 flex flex-col flex-1">
        <h3 className="text-[10px] font-black text-stone-900 leading-tight mb-1.5">Child Education Fund · Mumbai</h3>
        <div className="flex items-center justify-between text-[7px] mb-1">
          <span className="text-stone-400 font-medium">Amount Raised</span>
          <span className="font-black text-[#b04a15]">₹32,500</span>
        </div>
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-gradient-to-r from-[#b04a15] to-[#e07b3a] rounded-full" style={{ width: "65%" }} />
        </div>
        <p className="text-[7px] text-stone-400 font-medium mb-auto">Goal: ₹50,000 · 65% funded</p>
        <div className="w-full h-7 mt-2 bg-[#b04a15] rounded-xl flex items-center justify-center gap-1 shadow-md shadow-[#b04a15]/20">
          <span className="text-white text-[8px] font-black">Donate Now</span>
          <ChevronRight className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
    </div>
  );
}

function DonateScreen() {
  return (
    <div className="flex flex-col h-full px-3 py-2.5 bg-white">
      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-stone-50">
        <ArrowLeft className="w-3 h-3 text-stone-500" />
        <span className="text-[9px] font-bold text-stone-700">Select Amount</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        {[
          { label: "₹100", active: false },
          { label: "₹500", active: true },
          { label: "₹1,000", active: false },
          { label: "₹2,500", active: false },
        ].map((a) => (
          <div
            key={a.label}
            className={`h-8 rounded-xl flex items-center justify-center border text-[9px] font-black ${a.active
                ? "bg-[#b04a15] border-[#b04a15] text-white shadow-md shadow-[#b04a15]/25"
                : "bg-white border-stone-200 text-stone-600"
              }`}
          >
            {a.label}
          </div>
        ))}
      </div>
      <div className="flex items-center border border-stone-200 rounded-xl px-2.5 h-7 mb-auto gap-1">
        <span className="text-[8px] text-stone-400 font-medium">₹ Custom amount</span>
      </div>
      <div className="mt-3 w-full h-7 bg-[#b04a15] rounded-xl flex items-center justify-center shadow-md shadow-[#b04a15]/20">
        <span className="text-white text-[8px] font-black">Confirm ₹500</span>
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-4 pb-4 bg-white">
      <div className="w-16 h-16 rounded-full bg-[#b04a15]/8 flex items-center justify-center mb-3">
        <div className="w-11 h-11 rounded-full bg-[#b04a15] flex items-center justify-center shadow-lg shadow-[#b04a15]/30">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-[13px] font-black text-stone-900 mb-1">Thank you!</h3>
      <p className="text-[8px] text-stone-500 text-center leading-relaxed mb-5 max-w-[140px]">
        You just made a real difference in someone&apos;s life.
      </p>
      <div className="w-full space-y-1.5">
        <div className="w-full h-7 bg-[#b04a15] rounded-xl flex items-center justify-center shadow-md shadow-[#b04a15]/20">
          <span className="text-white text-[8px] font-black">View Certificate</span>
        </div>
        <div className="w-full h-7 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center">
          <span className="text-stone-600 text-[8px] font-semibold">Share your impact ↗</span>
        </div>
      </div>
    </div>
  );
}

const SCREENS = [
  <DiscoverScreen key="s0" />,
  <DetailScreen key="s1" />,
  <DonateScreen key="s2" />,
  <SuccessScreen key="s3" />,
];

/* ─────────────────────────── main component ─────────────────────────── */

export function PhoneAnimationSection() {
  const outerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null); // progress fill line
  const phoneRef = useRef<HTMLDivElement>(null); // phone wrapper for parallax
  const rafRef = useRef<number>(0);
  const prevStep = useRef(0);

  const [step, setStep] = useState(0);
  const [screenKey, setScreenKey] = useState(0);
  const [dir, setDir] = useState<"up" | "down">("down");
  const [isDesktop, setIsDesktop] = useState(false);
  const [hinted, setHinted] = useState(false); // scroll hint fades after first scroll

  /* ── breakpoint detection ── */
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── mobile: timer auto-play ── */
  useEffect(() => {
    if (isDesktop) return;
    const t = setInterval(() => {
      setStep((s) => {
        const next = (s + 1) % 4;
        setScreenKey((k) => k + 1);
        return next;
      });
      setDir("down");
    }, STEP_DURATION);
    return () => clearInterval(t);
  }, [isDesktop]);

  /* ── desktop: scroll-driven ── */
  useEffect(() => {
    if (!isDesktop) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = outerRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const sectionH = el.offsetHeight;
        const viewH = window.innerHeight;
        const scrollRange = sectionH - viewH;
        if (scrollRange <= 0) return;

        // progress 0→1 through the scroll track
        const scrolled = Math.max(0, Math.min(scrollRange, -rect.top));
        const progress = scrolled / scrollRange;

        // smooth line fill — direct DOM (no React re-render)
        if (lineRef.current) {
          lineRef.current.style.transform = `scaleY(${progress})`;
        }

        // subtle phone parallax — floats 12px up then returns
        if (phoneRef.current) {
          const floatY = -Math.sin(progress * Math.PI) * 12;
          phoneRef.current.style.transform = `translateY(${floatY}px)`;
        }

        // step activation — React state only on boundary crossing
        const newStep = Math.min(3, Math.floor(progress * 4));
        if (newStep !== prevStep.current) {
          const newDir = newStep > prevStep.current ? "down" : "up";
          prevStep.current = newStep;
          setDir(newDir);
          setStep(newStep);
          setScreenKey((k) => k + 1);
          if (!hinted) setHinted(true);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll(); // initialize line fill + active step on mount / mid-page load
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isDesktop, hinted]);

  /* ── click / tap navigation ── */
  const goTo = useCallback(
    (i: number) => {
      const newDir = i > step ? "down" : "up";
      setDir(newDir);
      setStep(i);
      setScreenKey((k) => k + 1);
      prevStep.current = i;
    },
    [step]
  );

  const enterClass = dir === "down" ? "phone-screen-enter-up" : "phone-screen-enter-down";

  return (
    /*
     * Outer div = scroll track.
     * CSS class `phone-scrollytelling-track` sets height: 480vh on lg+.
     * On mobile the div is auto-height (normal flow).
     */
    <div
      ref={outerRef}
      className="phone-scrollytelling-track relative bg-[#f8f4ee] dark:bg-[#0c0a08] border-b border-orange-100/60 dark:border-zinc-800"
    >
      {/* ── 3D animated background layer ── */}
      <style>{`
        @keyframes ck-orbit-x {
          0%   { transform: perspective(900px) rotateX(0deg)   rotateY(0deg)   translateZ(0px); }
          25%  { transform: perspective(900px) rotateX(6deg)   rotateY(10deg)  translateZ(20px); }
          50%  { transform: perspective(900px) rotateX(0deg)   rotateY(18deg)  translateZ(40px); }
          75%  { transform: perspective(900px) rotateX(-6deg)  rotateY(10deg)  translateZ(20px); }
          100% { transform: perspective(900px) rotateX(0deg)   rotateY(0deg)   translateZ(0px); }
        }
        @keyframes ck-orbit-y {
          0%   { transform: perspective(900px) rotateX(4deg)   rotateY(0deg)   translateZ(10px); }
          33%  { transform: perspective(900px) rotateX(-4deg)  rotateY(-12deg) translateZ(30px); }
          66%  { transform: perspective(900px) rotateX(6deg)   rotateY(8deg)   translateZ(50px); }
          100% { transform: perspective(900px) rotateX(4deg)   rotateY(0deg)   translateZ(10px); }
        }
        @keyframes ck-float-a {
          0%, 100% { transform: translateY(0px)   translateZ(0px); opacity: 0.55; }
          50%       { transform: translateY(-28px) translateZ(18px); opacity: 0.85; }
        }
        @keyframes ck-float-b {
          0%, 100% { transform: translateY(0px)   translateZ(0px); opacity: 0.4; }
          50%       { transform: translateY(-20px) translateZ(12px); opacity: 0.65; }
        }
        @keyframes ck-float-c {
          0%, 100% { transform: translateY(0px)   translateZ(0px) rotate(0deg);   opacity: 0.3; }
          50%       { transform: translateY(-16px) translateZ(8px)  rotate(90deg);  opacity: 0.55; }
        }
        @keyframes ck-float-d {
          0%, 100% { transform: translateY(0px)   translateZ(0px) rotate(0deg);   opacity: 0.35; }
          50%       { transform: translateY(-22px) translateZ(14px) rotate(-60deg); opacity: 0.6; }
        }
        @keyframes ck-pulse-ring {
          0%, 100% { transform: scale(1);    opacity: 0.12; }
          50%       { transform: scale(1.18); opacity: 0.22; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-3d-scene,
          .ck-3d-plane-a,
          .ck-3d-plane-b,
          .ck-3d-orb-a,
          .ck-3d-orb-b,
          .ck-3d-orb-c,
          .ck-3d-orb-d,
          .ck-3d-ring {
            animation: none !important;
          }
        }
      `}</style>
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
        style={{ zIndex: 0 }}
      >
        {/* Perspective scene wrapper */}
        <div
          className="ck-3d-scene absolute inset-0"
          style={{
            perspective: "900px",
            perspectiveOrigin: "50% 40%",
          }}
        >
          {/* Plane A — large warm brand tile rotating in 3D */}
          <div
            className="ck-3d-plane-a absolute"
            style={{
              width: "60%",
              height: "60%",
              left: "5%",
              top: "15%",
              background:
                "radial-gradient(ellipse at 40% 40%, rgba(176,74,21,0.07) 0%, rgba(224,123,58,0.04) 55%, transparent 80%)",
              borderRadius: "40% 60% 55% 45% / 45% 55% 50% 50%",
              animation: "ck-orbit-x 22s ease-in-out infinite",
              willChange: "transform",
            }}
          />
          {/* Plane B — cool deep-blue tile */}
          <div
            className="ck-3d-plane-b absolute"
            style={{
              width: "50%",
              height: "55%",
              right: "4%",
              bottom: "8%",
              background:
                "radial-gradient(ellipse at 60% 55%, rgba(30,58,96,0.06) 0%, rgba(30,58,96,0.03) 55%, transparent 80%)",
              borderRadius: "55% 45% 40% 60% / 50% 60% 40% 50%",
              animation: "ck-orbit-y 28s ease-in-out infinite",
              willChange: "transform",
            }}
          />
        </div>

        {/* Depth orbs — warm brand, various sizes and speeds */}
        <div
          className="ck-3d-orb-a absolute rounded-full"
          style={{
            width: 180,
            height: 180,
            top: "12%",
            left: "8%",
            background:
              "radial-gradient(circle at 35% 35%, rgba(224,123,58,0.18), rgba(176,74,21,0.06) 65%, transparent 85%)",
            filter: "blur(2px)",
            animation: "ck-float-a 14s ease-in-out infinite",
            willChange: "transform, opacity",
          }}
        />
        <div
          className="ck-3d-orb-b absolute rounded-full"
          style={{
            width: 130,
            height: 130,
            bottom: "18%",
            right: "10%",
            background:
              "radial-gradient(circle at 40% 40%, rgba(176,74,21,0.15), rgba(224,123,58,0.05) 65%, transparent 85%)",
            filter: "blur(3px)",
            animation: "ck-float-b 18s ease-in-out infinite 2s",
            willChange: "transform, opacity",
          }}
        />
        <div
          className="ck-3d-orb-c absolute"
          style={{
            width: 64,
            height: 64,
            top: "40%",
            right: "22%",
            border: "1.5px solid rgba(176,74,21,0.14)",
            borderRadius: "50%",
            animation: "ck-float-c 11s ease-in-out infinite 1s",
            willChange: "transform, opacity",
          }}
        />
        <div
          className="ck-3d-orb-d absolute"
          style={{
            width: 48,
            height: 48,
            bottom: "28%",
            left: "18%",
            border: "1.5px solid rgba(30,58,96,0.12)",
            borderRadius: "8px",
            animation: "ck-float-d 16s ease-in-out infinite 3s",
            willChange: "transform, opacity",
          }}
        />

        {/* Soft pulsing ring — center anchor point */}
        <div
          className="ck-3d-ring absolute rounded-full"
          style={{
            width: 340,
            height: 340,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(176,74,21,0.10)",
            animation: "ck-pulse-ring 9s ease-in-out infinite",
            willChange: "transform, opacity",
          }}
        />
        <div
          className="ck-3d-ring absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(176,74,21,0.06)",
            animation: "ck-pulse-ring 13s ease-in-out infinite 2s",
            willChange: "transform, opacity",
          }}
        />

        {/* Stone-warm top gradient wash */}
        <div
          className="absolute inset-x-0 top-0 h-1/3"
          style={{
            background:
              "linear-gradient(to bottom, rgba(240,187,122,0.05) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Background blobs + floating shapes + shimmer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ zIndex: 1 }}>
        <div className="animate-blob-a absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#b04a15]/[0.05] blur-3xl dark:bg-[#b04a15]/[0.08]" />
        <div className="animate-blob-b absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-[#1e3a60]/[0.04] blur-3xl dark:bg-[#1e3a60]/[0.10]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(176,74,21,0.04),transparent)]" />
        {/* Diagonal shimmer sweep */}
        <div className="animate-bg-shimmer absolute inset-0" />
        {/* Tiny floating shapes — rise from bottom */}
        <div className="animate-float-shape-1 absolute bottom-0 left-[8%] w-2 h-2 rounded-full bg-[#b04a15]/[0.08]" />
        <div className="animate-float-shape-2 absolute bottom-0 left-[22%] w-2.5 h-2.5 rounded-full border border-[#e07b3a]/[0.09]" />
        <div className="animate-float-shape-3 absolute bottom-0 left-[41%] w-1.5 h-1.5 rounded-full bg-[#1e3a60]/[0.07]" />
        <div className="animate-float-shape-4 absolute bottom-0 left-[60%] w-2 h-2 rounded-full border border-[#b04a15]/[0.07]" />
        <div className="animate-float-shape-5 absolute bottom-0 left-[76%] w-3 h-3 rounded-full bg-[#e07b3a]/[0.06]" />
        <div className="animate-float-shape-6 absolute bottom-0 left-[90%] w-1.5 h-1.5 rounded-full bg-[#1e3a60]/[0.08]" />
      </div>

      {/*
       * Sticky panel — sticks at top of viewport while outer div scrolls.
       * On mobile: normal padding/flow (no sticky, no fixed height).
       */}
      <div className="lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-hidden py-16 lg:pb-0 lg:pt-20 flex flex-col justify-center relative" style={{ zIndex: 2 }}>
        <div className="relative mx-auto max-w-7xl px-6 w-full">

          {/* ── Section header ── */}
          <div className="text-center mb-10 lg:mb-12 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#b04a15]">
              See it in action
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              From browsing to giving — in minutes
            </h2>
            <p className="text-base text-stone-500 dark:text-stone-400 max-w-xl mx-auto font-medium leading-relaxed">
              Scroll through every step, right here on the page.
            </p>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* ── LEFT: step list ── */}
            <div className="relative order-2 lg:order-1">

              {/* Track line (static background) */}
              <div className="absolute left-5 top-8 bottom-10 w-[1.5px] bg-stone-200/70 dark:bg-black pointer-events-none" />

              {/* Fill line — scaleY driven by direct DOM ref */}
              <div
                ref={lineRef}
                className="absolute left-5 top-8 w-[1.5px] pointer-events-none origin-top"
                style={{
                  height: "calc(100% - 74px)",
                  background: "linear-gradient(to bottom, #b04a15, #1e3a60)",
                  transform: "scaleY(0)",
                  willChange: "transform",
                }}
              />

              {/* Steps */}
              <div className="space-y-1">
                {STEPS.map((s, i) => {
                  const isActive = i === step;
                  const isPast = i < step;
                  return (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Go to step ${i + 1}: ${s.title}`}
                      className="relative flex gap-5 w-full text-left py-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#b04a15] cursor-pointer"
                    >
                      {/* Circle */}
                      <div
                        className={[
                          "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2",
                          "transition-all duration-500",
                          isActive
                            ? `${s.accentBg} border-transparent shadow-lg scale-110 ring-4 ${s.accentRing}`
                            : isPast
                              ? "bg-stone-100 dark:bg-black border-stone-100 dark:border-zinc-700 scale-100"
                              : "bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 scale-100",
                        ].join(" ")}
                      >
                        {isPast ? (
                          <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <s.Icon
                            className={`w-4 h-4 transition-colors duration-300 ${isActive ? "text-white" : "text-stone-400 dark:text-stone-600"
                              }`}
                          />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pt-1">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 transition-colors duration-300 ${isActive ? s.accentText : "text-stone-300 dark:text-zinc-600"
                            }`}
                        >
                          {s.number}
                        </span>
                        <p
                          className={`text-[15px] font-bold leading-snug transition-all duration-300 ${isActive ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-zinc-600"
                            }`}
                        >
                          {s.title}
                        </p>
                        {/* Description — accordion reveal on active */}
                        <div
                          className={`overflow-hidden transition-all duration-500 ease-in-out ${isActive ? "max-h-24 opacity-100 mt-1.5" : "max-h-0 opacity-0"
                            }`}
                        >
                          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed font-medium pr-4">
                            {s.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Scroll hint — desktop only, fades after scrolling starts */}
              <div
                aria-hidden
                className={`hidden lg:flex items-center gap-2.5 mt-7 ml-[60px] transition-all duration-700 ${hinted ? "opacity-0 translate-y-1 pointer-events-none" : "opacity-100"
                  }`}
              >
                <div className="animate-bounce-slow flex flex-col items-center gap-[3px]">
                  <div className="w-px h-3.5 bg-[#b04a15]/35 rounded-full" />
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: "4px solid transparent",
                      borderRight: "4px solid transparent",
                      borderTop: "5px solid rgba(176,74,21,0.35)",
                    }}
                  />
                </div>
                <span className="text-xs text-stone-400 dark:text-zinc-600 font-medium">
                  Scroll to walk through each step
                </span>
              </div>

              {/* Progress dots — mobile only */}
              <div className="mt-5 ml-[60px] flex gap-2 lg:hidden">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Step ${i + 1}`}
                    className={`h-1 rounded-full transition-all duration-500 ${i === step
                        ? "w-8 bg-[#b04a15]"
                        : "w-3 bg-stone-200 dark:bg-zinc-700 hover:bg-stone-300"
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* ── RIGHT: phone mockup ── */}
            <div className="flex justify-center order-1 lg:order-2">
              {/* phoneRef: receives translateY parallax via direct DOM */}
              <div ref={phoneRef} className="relative" style={{ willChange: "transform" }}>
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-black/10 blur-3xl rounded-full scale-y-75 pointer-events-none" />

                {/* Phone outer wrapper — side buttons live here so they're not clipped */}
                <div className="relative w-[248px] h-[496px]">

                  {/* Side buttons */}
                  <div className="absolute -left-[8px] top-[70px] w-[4px] h-6 bg-black rounded-l-full z-10" />
                  <div className="absolute -left-[8px] top-[104px] w-[4px] h-10 bg-black rounded-l-full z-10" />
                  <div className="absolute -left-[8px] top-[148px] w-[4px] h-10 bg-black rounded-l-full z-10" />
                  <div className="absolute -right-[8px] top-[90px] w-[4px] h-14 bg-black rounded-r-full z-10" />

                  {/* Phone body — black bg clipped to rounded corners */}
                  <div className="absolute inset-0 bg-black rounded-[44px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)] overflow-hidden">

                    {/* Screen — explicit 7px inset guarantees the black frame is always visible */}
                    <div className="absolute inset-[7px] overflow-hidden rounded-[37px] bg-stone-50">

                      {/* Status bar */}
                      <div className="relative z-20 flex items-center justify-between px-5 pt-2.5 pb-0.5 bg-white">
                        <span className="text-[9px] font-bold text-stone-800">9:41</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-[2px] items-end h-[10px]">
                            {[3, 5, 7, 9].map((h, i) => (
                              <div key={i} className="w-[2.5px] bg-stone-800 rounded-[1px]" style={{ height: h }} />
                            ))}
                          </div>
                          <div className="w-[18px] h-[9px] border border-stone-800 rounded-[2.5px] relative">
                            <div className="absolute inset-[1.5px] right-[3px] bg-stone-800 rounded-[1px]" />
                            <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-stone-700 rounded-r-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Dynamic island */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-zinc-900 rounded-b-[18px] z-30" />

                      {/* Screen content — transition class is direction-aware */}
                      <div className="absolute inset-0 top-9 overflow-hidden bg-white">
                        {SCREENS.map((screen, i) => (
                          <div
                            key={i === step ? `screen-${step}-${screenKey}` : `screen-idle-${i}`}
                            className={`absolute inset-0 ${i === step ? enterClass : "opacity-0 pointer-events-none"
                              }`}
                          >
                            {screen}
                          </div>
                        ))}
                      </div>

                      {/* Home indicator */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[80px] h-[3px] bg-stone-300 rounded-full" />
                    </div>
                    {/* closes phone body */}
                  </div>

                  {/* Step counter badge — shows which screen is active */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all duration-500 ${i === step
                            ? "w-6 h-1.5 bg-[#b04a15]"
                            : i < step
                              ? "w-1.5 h-1.5 bg-[#b04a15]/40"
                              : "w-1.5 h-1.5 bg-stone-300 dark:bg-zinc-700"
                          }`}
                      />
                    ))}
                  </div>
                  {/* closes outer wrapper */}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
