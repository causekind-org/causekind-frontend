import React from "react";

export function CauseKindWayHero() {
  return (
    <section
      id="way-hero"
      aria-label="What is CauseKind?"
      className="relative w-full min-h-[calc(100svh-3.5rem)] lg:min-h-[760px] flex flex-col justify-between py-10 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-16 xl:px-24 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-800/80 overflow-hidden select-none"
    >
      {/* ── TOP: Editorial Header & Category Tag ── */}
      <div className="w-full flex items-center justify-between border-b border-stone-200/90 dark:border-stone-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B5480F] dark:bg-[#F4A25B]" />
          <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[#B5480F] dark:text-[#F4A25B]">
            WHAT IS CAUSEKIND?
          </span>
        </div>

        <div className="flex items-center gap-3 text-right">
          <span className="font-mono text-2xs sm:text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold">
            DIRECT IN-KIND GIVING
          </span>
        </div>
      </div>

      {/* ── CENTER: Balanced Editorial Typographic Spread ── */}
      <div className="relative w-full my-auto py-8 sm:py-10 lg:py-12">
        <div className="flex flex-col max-w-5xl">
          {/* Main Headline - Bold focal point without overwhelming */}
          <h1 className="font-serif font-black tracking-tight text-stone-950 dark:text-stone-50 text-3xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[4.75rem] leading-[1.08] uppercase">
            <span>USEFUL THINGS </span>
            <span className="block sm:inline">SHOULDN&apos;T GO </span>
            <span className="relative inline-block text-[#B5480F] dark:text-[#F4A25B] whitespace-nowrap mt-1 sm:mt-0">
              <span className="relative z-10 px-1 sm:px-1.5">UNUSED.</span>
              {/* Creative touch: Refined static corner accent brackets */}
              <span
                aria-hidden="true"
                className="absolute -inset-x-1.5 -inset-y-0.5 border border-[#B5480F]/35 dark:border-[#F4A25B]/40 rounded pointer-events-none"
              >
                <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#B5480F] dark:border-[#F4A25B]" />
                <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#B5480F] dark:border-[#F4A25B]" />
                <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#B5480F] dark:border-[#F4A25B]" />
                <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#B5480F] dark:border-[#F4A25B]" />
              </span>
            </span>
          </h1>
        </div>

        {/* ── Secondary Supporting Explanation Block (Prominent & Easy to Read) ── */}
        <div className="mt-8 sm:mt-10 lg:mt-12 max-w-5xl flex flex-col md:flex-row md:items-start justify-between gap-8 md:gap-14">
          <div className="md:w-[62%]">
            <p className="font-serif text-xl sm:text-2xl lg:text-[1.7rem] text-stone-900 dark:text-stone-100 font-medium leading-snug">
              Someone has something they no longer need. Someone else may need exactly that.
            </p>
            <p className="mt-3.5 font-serif text-lg sm:text-xl lg:text-[1.25rem] text-stone-600 dark:text-stone-400 leading-relaxed">
              CauseKind brings them together — simply, safely and with dignity.
            </p>
          </div>

          <div className="md:w-[38%] border-t md:border-t-0 md:border-l border-stone-300/80 dark:border-stone-800 pt-5 md:pt-1 md:pl-8">
            <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] font-bold block mb-2">
              IN-KIND ONLY
            </span>
            <p className="font-serif italic text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
              Books. Clothes. Furniture. Electronics. And more.
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Three Informational Anchors (01 GIVE • 02 FIND • 03 CONNECT) ── */}
      <div className="w-full pt-8 sm:pt-10 border-t border-stone-200/90 dark:border-stone-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-8 lg:gap-14">

          {/* Anchor 01 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-mono text-xs sm:text-sm font-bold text-[#B5480F] dark:text-[#F4A25B]">01</span>
              <span className="w-3 h-px bg-[#B5480F]/40 dark:bg-[#F4A25B]/40" />
              <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-stone-900 dark:text-stone-100">
                GIVE
              </span>
            </div>
            <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed">
              Give things you no longer need directly to someone nearby.
            </p>
          </div>

          {/* Anchor 02 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-mono text-xs sm:text-sm font-bold text-[#B5480F] dark:text-[#F4A25B]">02</span>
              <span className="w-3 h-px bg-[#B5480F]/40 dark:bg-[#F4A25B]/40" />
              <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-stone-900 dark:text-stone-100">
                FIND
              </span>
            </div>
            <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed">
              Find useful everyday items requested by verified people and NGOs.
            </p>
          </div>

          {/* Anchor 03 */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-mono text-xs sm:text-sm font-bold text-[#B5480F] dark:text-[#F4A25B]">03</span>
              <span className="w-3 h-px bg-[#B5480F]/40 dark:bg-[#F4A25B]/40" />
              <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-stone-900 dark:text-stone-100">
                CONNECT
              </span>
            </div>
            <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed">
              Get them straight to the recipient with zero cash and zero middlemen.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
