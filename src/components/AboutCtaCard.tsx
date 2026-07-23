"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="bg-[#120c04] border border-stone-800 rounded-3xl p-10 flex flex-col justify-between hover:shadow-xl transition-all duration-300 overflow-hidden relative group">
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[280px] h-[280px] rounded-full bg-[#b04a15]/10 blur-3xl" />
      <div className="relative">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-4 block">03</span>
        <h3 className="text-2xl font-extrabold text-white mb-4">
          {t("ctaTitle")}
        </h3>
        <p className="text-stone-400 max-w-xl leading-relaxed text-sm font-medium">
          {t("ctaText")}
        </p>
      </div>
      <div className="flex gap-4 pt-8 mt-8 border-t border-stone-800 flex-wrap relative z-10">
        <Link href="/requests" className="px-6 py-3 rounded-full bg-[#b04a15] hover:bg-[#963c0d] text-white text-xs font-extrabold uppercase tracking-wider transition-colors shadow-md shadow-[#b04a15]/20 flex items-center gap-2">
          {t("becomeDonor")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link href="/contact" className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2">
          {t("receiveSupport")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
