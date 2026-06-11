"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Heart, HandCoins, CheckCircle2, ArrowLeft, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";

const STEP_DURATION = 3400;

const STEPS = [
  {
    number: "01",
    Icon: Search,
    accentBg: "bg-[#b04a15]",
    accentText: "text-[#b04a15]",
    title: "Discover Causes",
    desc: "Browse real campaigns and item requests near you. Every listing is checked by our team before it's visible.",
  },
  {
    number: "02",
    Icon: Heart,
    accentBg: "bg-rose-500",
    accentText: "text-rose-500",
    title: "Choose How to Give",
    desc: "Donate money to a campaign, or give physical items like books or clothes to someone nearby.",
  },
  {
    number: "03",
    Icon: HandCoins,
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-600",
    title: "Give Directly",
    desc: "100% of what you give reaches the person who needs it. We charge nothing — ever.",
  },
  {
    number: "04",
    Icon: CheckCircle2,
    accentBg: "bg-[#1e3a60]",
    accentText: "text-[#1e3a60]",
    title: "See Your Impact",
    desc: "Get a verified certificate and track your donation all the way to delivery.",
  },
];

/* ── Mini phone screen components ── */
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
            className={`h-8 rounded-xl flex items-center justify-center border text-[9px] font-black ${
              a.active
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

const SCREENS = [<DiscoverScreen key="s0" />, <DetailScreen key="s1" />, <DonateScreen key="s2" />, <SuccessScreen key="s3" />];

/* ── Main section ── */
export function PhoneAnimationSection() {
  const [step, setStep] = useState(0);
  const [screenKey, setScreenKey] = useState(0);

  const goTo = useCallback((i: number) => {
    setStep(i);
    setScreenKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setStep((s) => {
        const next = (s + 1) % 4;
        setScreenKey((k) => k + 1);
        return next;
      });
    }, STEP_DURATION);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative py-24 overflow-hidden bg-[#f8f4ee] dark:bg-[#0c0a08] border-b border-orange-100/60 dark:border-zinc-800">
      {/* Background blobs — sleek, barely-visible */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-blob-a absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#b04a15]/[0.05] blur-3xl dark:bg-[#b04a15]/[0.08]" />
        <div className="animate-blob-b absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-[#1e3a60]/[0.04] blur-3xl dark:bg-[#1e3a60]/[0.10]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(176,74,21,0.04),transparent)]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6">

        {/* Section header */}
        <Reveal className="text-center mb-16 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-[#b04a15]">See it in action</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            From browsing to giving — in minutes
          </h2>
          <p className="text-base text-stone-500 dark:text-stone-400 max-w-xl mx-auto font-medium leading-relaxed">
            Everything happens right inside the app. Simple steps, direct impact.
          </p>
        </Reveal>

        {/* Two-column: steps left, phone right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: step list ── */}
          <div className="relative order-2 lg:order-1">
            {/* vertical connector line */}
            <div className="absolute left-5 top-8 bottom-8 w-px bg-stone-100 dark:bg-zinc-800 pointer-events-none" />

            <div className="space-y-1">
              {STEPS.map((s, i) => {
                const isActive = i === step;
                const isPast = i < step;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="relative flex gap-5 w-full text-left py-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#b04a15] transition-colors"
                  >
                    {/* Step circle */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isActive
                          ? `${s.accentBg} border-transparent shadow-lg`
                          : isPast
                          ? "bg-stone-100 dark:bg-zinc-800 border-stone-100 dark:border-zinc-700"
                          : "bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700"
                      }`}
                    >
                      {isPast ? (
                        <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <s.Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? "text-white" : "text-stone-400 dark:text-stone-600"}`} />
                      )}
                    </div>

                    {/* Step text */}
                    <div className="flex-1 min-w-0 pt-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 transition-colors duration-300 ${isActive ? s.accentText : "text-stone-300 dark:text-zinc-600"}`}>
                        {s.number}
                      </span>
                      <p className={`text-[15px] font-bold leading-snug transition-all duration-300 ${isActive ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-zinc-600"}`}>
                        {s.title}
                      </p>
                      {/* Accordion-style desc reveals when active */}
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isActive ? "max-h-20 opacity-100 mt-1.5" : "max-h-0 opacity-0"}`}>
                        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed font-medium pr-4">{s.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress dots */}
            <div className="mt-5 ml-[60px] flex gap-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Step ${i + 1}`}
                  className={`h-1 rounded-full transition-all duration-500 ${i === step ? "w-8 bg-[#b04a15]" : "w-3 bg-stone-200 dark:bg-zinc-700 hover:bg-stone-300"}`}
                />
              ))}
            </div>
          </div>

          {/* ── Right: phone mockup ── */}
          <div className="flex justify-center order-1 lg:order-2">
            <div className="relative">
              {/* ambient glow */}
              <div className="absolute inset-0 bg-[#b04a15]/6 blur-3xl rounded-full scale-y-75 pointer-events-none" />

              {/* Phone outer frame */}
              <div className="relative w-[248px] h-[496px] bg-zinc-900 rounded-[44px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)] border-[7px] border-zinc-800">

                {/* Side buttons */}
                <div className="absolute -left-[8px] top-[70px] w-[4px] h-6 bg-zinc-700 rounded-l-full" />
                <div className="absolute -left-[8px] top-[104px] w-[4px] h-10 bg-zinc-700 rounded-l-full" />
                <div className="absolute -left-[8px] top-[148px] w-[4px] h-10 bg-zinc-700 rounded-l-full" />
                <div className="absolute -right-[8px] top-[90px] w-[4px] h-14 bg-zinc-700 rounded-r-full" />

                {/* Screen */}
                <div className="absolute inset-0 overflow-hidden rounded-[37px] bg-stone-50">

                  {/* Status bar */}
                  <div className="relative z-20 flex items-center justify-between px-5 pt-2.5 pb-0.5 bg-white">
                    <span className="text-[9px] font-bold text-stone-800">9:41</span>
                    <div className="flex items-center gap-1.5">
                      {/* Signal bars */}
                      <div className="flex gap-[2px] items-end h-[10px]">
                        {[3, 5, 7, 9].map((h, i) => (
                          <div key={i} className="w-[2.5px] bg-stone-800 rounded-[1px]" style={{ height: h }} />
                        ))}
                      </div>
                      {/* Battery */}
                      <div className="w-[18px] h-[9px] border border-stone-800 rounded-[2.5px] relative">
                        <div className="absolute inset-[1.5px] right-[3px] bg-stone-800 rounded-[1px]" />
                        <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-stone-700 rounded-r-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic island */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-zinc-900 rounded-b-[18px] z-30" />

                  {/* Animated screen area */}
                  <div className="absolute inset-0 top-9 overflow-hidden bg-white">
                    {SCREENS.map((screen, i) => (
                      <div
                        key={i === step ? `screen-${step}-${screenKey}` : `screen-idle-${i}`}
                        className={`absolute inset-0 ${i === step ? "phone-screen-enter" : "opacity-0 pointer-events-none"}`}
                      >
                        {screen}
                      </div>
                    ))}
                  </div>

                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[80px] h-[3px] bg-stone-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
