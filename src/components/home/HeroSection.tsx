"use client";

/**
 * HeroSection — Desktop hero with cycling background images + quote slideshow.
 * Extracted from HomeClient.tsx for maintainability.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { getHeroImages } from "@/app/actions/getHeroImages";
import type { Campaign } from "@/lib/api";
import { FEATURES } from "@/lib/features";

/* ── Quotes cycle ─────────────────────────────────────────────────────────── */
const HERO_QUOTES = [
  { text: "The smallest act of kindness is worth more than the grandest intention.", author: "Oscar Wilde" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
  { text: "No one has ever become poor by giving.", author: "Anne Frank" },
  { text: "Give, but give until it hurts.", author: "Mother Teresa" },
  { text: "The purpose of life is not to be happy — it is to be useful.", author: "Ralph Waldo Emerson" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
];

export function HeroQuoteSlider() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    const t = setTimeout(() => setPhase("visible"), 900);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    if (phase !== "visible") return;
    const t = setTimeout(() => setPhase("exit"), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const t = setTimeout(() => { setIdx(i => (i + 1) % HERO_QUOTES.length); setPhase("enter"); }, 600);
    return () => clearTimeout(t);
  }, [phase]);

  const q   = HERO_QUOTES[idx];
  const cls = phase === "enter" ? "hero-quote-enter" : phase === "exit" ? "hero-quote-exit" : "";

  return (
    <div className="relative h-[96px] sm:h-[76px] overflow-hidden">
      <div key={idx} className={`absolute inset-0 flex flex-col justify-center ${cls}`}>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed font-medium italic line-clamp-3">
          &ldquo;{q.text}&rdquo;
        </p>
        <span className="mt-1 flex items-center gap-2 text-[#f0b97a] text-[11px] font-black uppercase tracking-wider">
          <span className="block h-px w-5 bg-[#e07b3a]" />
          {q.author}
        </span>
      </div>
    </div>
  );
}

/* ── Background image slider ─────────────────────────────────────────────── */
export function HeroImageSlider() {
  const [images, setImages]   = useState<string[]>(["/images/hero-4.webp"]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    getHeroImages().then(imgs => {
      if (imgs?.length) {
        const others = imgs.filter(i => !i.includes("hero-4.webp"));
        setImages(["/images/hero-4.webp", ...others]);
      }
    });
  }, []);

  useEffect(() => {
    if (!images.length) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {images.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out" style={{ opacity: i === current ? 0.95 : 0 }}>
          <div className={i === current ? (i % 2 === 0 ? "hero-slide-active" : "hero-slide-active-alt") : ""} style={{ position: "absolute", inset: 0 }}>
            <Image src={src} alt="" fill className="object-cover brightness-[0.85] contrast-[1.05]" style={{ objectPosition: "center 30%" }} priority={i === 0} sizes="100vw" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Desktop hero section ────────────────────────────────────────────────── */
export function HeroSection({
  currentCampaign,
  translatedTitle,
  translatedDesc,
}: {
  currentCampaign: Campaign | null;
  translatedTitle: string | null;
  translatedDesc: string | null;
}) {
  const tHero = useTranslations("hero");

  const urgency = currentCampaign?.urgency ?? "NORMAL";
  const urgencyConfig = {
    CRITICAL: { label: "Critical — Urgent Action Needed", dot: "urgency-dot-critical", badge: "bg-red-500/15 border-red-400/40 text-red-300" },
    HIGH:     { label: "High Priority", dot: "urgency-dot-high", badge: "bg-amber-500/15 border-amber-400/40 text-amber-300" },
    NORMAL:   { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" },
  }[urgency] ?? { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" };

  return (
    <section className="relative w-full max-w-[1440px] mx-auto px-0 sm:px-10 pt-0 sm:pt-8 pb-0">
      <div className="relative w-full min-h-[520px] sm:min-h-[640px] lg:min-h-[720px] rounded-t-[3rem] rounded-b-none overflow-hidden bg-stone-900 shadow-xl border-x border-t border-[#e5e2d5]/60 animate-scale anim-d1">
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <HeroImageSlider />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>

        <div className="relative z-10 w-full h-full min-h-[520px] sm:min-h-[640px] lg:min-h-[720px] px-6 sm:px-12 py-10 sm:py-16 flex flex-col justify-between">
          <div className="w-full flex items-start justify-between gap-4 lg:gap-6">
            <div className="self-start inline-flex items-center gap-2 bg-white/65 backdrop-blur-md rounded-full px-5 py-2 border border-white/40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#f0b97a] animate-pulse shrink-0" />
              <span className="text-[#b04a15] text-xs font-extrabold uppercase tracking-wider">{tHero("badge")}</span>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-2">
              {[tHero("transparent"), tHero("fastDistribution")].map(label => (
                <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#f0b97a]" />
                  <span className="text-white text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mt-auto">
            <div className="lg:col-span-7 flex flex-col items-start gap-5 relative">
              <h1 className="text-white font-extrabold leading-[1.08] tracking-tight text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] max-w-2xl font-jakarta">
                {tHero("headline")}
              </h1>
              <div className="max-w-lg w-full">
                <HeroQuoteSlider />
              </div>
            </div>

            {FEATURES.money && (
              <div className="lg:col-span-5 flex justify-end">
                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl w-full max-w-[320px] border border-white/50 dark:border-white/10 animate-card-3d-enter sm:min-h-[350px] flex flex-col justify-between transition-all duration-500">
                  <div>
                    <div className="mb-0 lg:mb-4">
                      <div className={`lg:hidden inline-flex items-center gap-1.5 rounded-full border px-3 py-1 mb-3 ${urgencyConfig.badge}`}>
                        {urgencyConfig.dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${urgencyConfig.dot}`} />}
                        <span className="text-[10px] font-black uppercase tracking-wider">{urgencyConfig.label}</span>
                      </div>
                      <div className="hidden lg:flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z" stroke="white" strokeWidth="1.8" /></svg>
                          </div>
                          <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">CauseKind</span>
                        </div>
                        <span className="text-xs text-stone-400 font-bold">· {currentCampaign ? <TranslatedText text={currentCampaign.city} /> : "2026"}</span>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white leading-snug mb-2 font-jakarta line-clamp-2 transition-all duration-300">
                      {translatedTitle ?? "Make an Immediate Impact"}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed font-medium line-clamp-2 transition-all duration-300">
                      {translatedDesc ?? "Every donation directly supports frontline community programs."}
                    </p>
                  </div>
                  <Link href={currentCampaign ? `/campaigns/${currentCampaign.id}` : "/campaigns"} className="block w-full">
                    <button className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold py-3.5 rounded-xl text-xs tracking-wide uppercase transition-all duration-300 shadow-md shadow-orange-900/20 active:scale-95">
                      {tHero("donateNow")}
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
