"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";

const INTERVAL = 3000;

const MOCK_LISTINGS = [
  { id: 1, title: "NCERT Class 10 Books", donor: "Aarav S.", city: "Mumbai", state: "MH", image: "/images/hero-7.jpg", category: "Education" },
  { id: 2, title: "Warm Winter Blankets", donor: "Priya K.", city: "Delhi", state: "DL", image: "/images/hero-6.jpg", category: "Livelihood" },
  { id: 3, title: "Used School Bags", donor: "Rohan M.", city: "Bangalore", state: "KA", image: "/images/hero-3.jpg", category: "Education" },
  { id: 4, title: "Dell 22\" LCD Monitor", donor: "Sanjay D.", city: "Pune", state: "MH", image: "/images/hero-8.jpg", category: "Livelihood" },
  { id: 5, title: "Baby Clothes (0-6 Months)", donor: "Meera R.", city: "Chennai", state: "TN", image: "/images/hero-2.jpg", category: "Livelihood" },
];

export function MockListingsCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(3);

  useEffect(() => {
    const calc = () => setPerView(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const maxIdx = Math.max(0, MOCK_LISTINGS.length - perView);

  const go = useCallback((next: number) => {
    setIdx(next);
  }, []);

  const next = useCallback(() => {
    setIdx(p => (p >= maxIdx ? 0 : p + 1));
  }, [maxIdx]);

  const prev = useCallback(() => {
    setIdx(p => (p <= 0 ? maxIdx : p - 1));
  }, [maxIdx]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, INTERVAL);
    return () => clearInterval(t);
  }, [paused, next]);

  const pct = 100 / perView;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${idx * pct}%)`,
            transition: "transform 0.72s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {MOCK_LISTINGS.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 px-3"
              style={{ width: `${pct}%` }}
            >
              <div className="card-3d card-glow flex flex-col h-full overflow-hidden glass-card dark:bg-zinc-900/60 rounded-2xl group border-orange-100/60 dark:border-stone-850 relative">
                {/* Image Section */}
                <div className="relative w-full aspect-video overflow-hidden bg-orange-50 dark:bg-zinc-950 shrink-0">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent" />
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <span className="bg-[#b04a15] text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm tracking-wider uppercase">
                      {item.category}
                    </span>
                  </div>

                  {/* Dev Banner */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-amber-500/90 text-stone-900 font-bold text-[9px] px-2 py-0.5 rounded-md shadow-sm border border-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" /> DEVELOPMENT
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold mb-2">
                    <span className="flex items-center gap-1 bg-orange-50/80 dark:bg-zinc-950/50 px-2 py-1 rounded-md border border-orange-100/40 dark:border-stone-800">
                      <MapPin className="size-3.5 text-[#b04a15]" />
                      {item.city}, {item.state}
                    </span>
                    <span className="text-stone-400 dark:text-stone-500">By {item.donor}</span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-1 mb-2 group-hover:text-[#b04a15] dark:group-hover:text-[#ff8a65] transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed font-medium">
                    This item is listed for donation. Direct neighborhood matching will be integrated in the upcoming sprint.
                  </p>

                  <div className="mt-6 pt-2 border-t border-orange-50/50 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400 font-bold">
                    <span>Listed Today</span>
                    <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/5 px-2 py-0.5 rounded-full border border-amber-500/20">Claim Soon</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {MOCK_LISTINGS.length > perView && (
        <>
          <button
            onClick={prev}
            className="absolute top-1/2 -translate-y-8 -left-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-md border border-orange-100/80 dark:border-stone-800 text-stone-500 hover:bg-[#b04a15] hover:text-white hover:border-[#b04a15] hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute top-1/2 -translate-y-8 -right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-md border border-orange-100/80 dark:border-stone-800 text-stone-500 hover:bg-[#b04a15] hover:text-white hover:border-[#b04a15] hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
