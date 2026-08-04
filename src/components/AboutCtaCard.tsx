"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

/**
 * CTA button with a light sweep.
 *
 * <p>Declared at module scope, NOT inside `AboutCtaCard` — a component defined
 * in a render body gets a fresh identity every render, which would remount both
 * buttons (and restart any in-flight transition) whenever auth state settles.
 *
 * <p>The sweep is a skewed gradient parked off the left edge that slides across
 * on hover, clipped by the button's own `overflow-hidden`. Pure CSS: no motion
 * library, nothing running until the pointer is actually over the button, and
 * `motion-reduce` opts out for anyone who has asked it to.
 */
function CtaButton({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "solid" | "ghost";
}) {
  const skin =
    variant === "solid"
      ? "bg-[#b04a15] hover:bg-[#963c0d] text-white shadow-md shadow-[#b04a15]/20"
      : "bg-white/10 hover:bg-white/15 border border-white/15 text-white";

  return (
    <Link
      href={href}
      className={`group/cta relative overflow-hidden inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 md:px-5 text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 active:scale-95 ${skin}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-full w-full skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[200%] motion-reduce:hidden"
      />
      <span className="relative">{label}</span>
      <ArrowRight
        className="relative w-3 h-3 transition-transform duration-200 group-hover/cta:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export function AboutCtaCard() {
  const { user } = useAuth();
  const t = useTranslations("about");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return placeholder or null on server/hydration to avoid mismatch
  if (!mounted || user) return null;

  return (
    <div className="bg-[#120c04] border border-stone-800 rounded-3xl p-5 md:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 overflow-hidden relative group">
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[280px] h-[280px] rounded-full bg-[#b04a15]/10 blur-3xl" />
      <div className="relative">
        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-2 md:mb-3 block">03</span>
        <h3 className="text-lg md:text-xl font-extrabold text-white mb-2 md:mb-3">
          {t("ctaTitle")}
        </h3>
        <p className="text-stone-400 max-w-xl leading-relaxed text-xs md:text-sm font-medium">
          {t("ctaText")}
        </p>
      </div>
      <div className="flex gap-2.5 md:gap-3 pt-5 mt-5 md:pt-7 md:mt-7 border-t border-stone-800 flex-wrap relative z-10">
        <CtaButton href="/requests" label={t("becomeDonor")} variant="solid" />
        <CtaButton href="/contact" label={t("receiveSupport")} variant="ghost" />
      </div>
    </div>
  );
}
