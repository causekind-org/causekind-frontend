"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Package } from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import type { ItemListing } from "@/lib/api";

const INTERVAL = 3000;


type ListingSlide = Pick<ItemListing, "id" | "title" | "category" | "city" | "donorName" | "imageUrl">;

export function MockListingsCarousel({ listings }: { listings?: ListingSlide[] }) {
  const items: ListingSlide[] = listings ?? [];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(3);

  useEffect(() => {
    const calc = () => setPerView(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const maxIdx = Math.max(0, items.length - perView);

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
      <div className="overflow-hidden py-4 -my-4">
        <div
          className="flex"
          style={{
            transform: `translateX(-${idx * pct}%)`,
            transition: "transform 0.72s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {items.map((item) => {
            const cardInner = (
              <div className="card-glow flex flex-col h-full overflow-hidden glass-card dark:bg-zinc-900/60 rounded-2xl group border-2 border-orange-200 dark:border-orange-900/60 relative">
                {/* Image Section */}
                <div className="relative w-full aspect-video overflow-hidden bg-stone-100 dark:bg-zinc-950 shrink-0">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width:640px) 100vw, 33vw"
                      className="object-contain object-center bg-stone-100 dark:bg-zinc-950 transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 dark:bg-zinc-900/60 text-stone-400 dark:text-stone-500 gap-2 font-semibold text-xs">
                      <Package className="h-8 w-8 opacity-60" />
                      <span>No Image Uploaded</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent" />

                  {/* Category Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-[#b04a15] text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm tracking-wider uppercase">
                      <TranslatedText text={item.category} />
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold mb-2">
                    <span className="flex items-center gap-1 bg-orange-50/80 dark:bg-zinc-950/50 px-2 py-1 rounded-md border border-orange-100/40 dark:border-stone-800">
                      <MapPin className="size-3.5 text-[#b04a15]" />
                      <TranslatedText text={item.city} />
                    </span>
                    <span className="text-stone-400 dark:text-stone-500">By {item.donorName}</span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-1 mb-2 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors duration-200">
                    <TranslatedText text={item.title} />
                  </h3>

                  <div className="mt-auto pt-3 border-t border-orange-50/50 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400 font-bold">
                    <span>Available to donate</span>
                  </div>
                </div>
              </div>
            );

            return (
            <div
              key={item.id}
              className="flex-shrink-0 px-3"
              style={{ width: `${pct}%` }}
            >
              <Link href={`/items/${item.id}`} className="block h-full">
                {cardInner}
              </Link>
            </div>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      {items.length > perView && (
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
