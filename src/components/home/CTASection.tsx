"use client";

/**
 * CTASection — Bottom "Get started" call-to-action panel.
 * Extracted from HomeClient.tsx. Hidden when user is logged in.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";

export function CTASection() {
  const t    = useTranslations("landing");
  const { user } = useAuth();

  if (user) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 pt-10 sm:pt-14 pb-20">
      <Reveal>
        <div className="relative rounded-3xl overflow-hidden border border-stone-800 shadow-2xl grid lg:grid-cols-[3fr_2fr] min-h-[280px]">

          {/* Left panel */}
          <div className="relative bg-[#120c04] px-10 py-14 flex flex-col justify-between z-10">
            <div className="pointer-events-none absolute -top-20 -left-20 w-[320px] h-[320px] rounded-full bg-[#b04a15]/10 blur-3xl" />
            <div className="relative">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-4 block">Get started</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-4">{t("ctaSection.headline")}</h2>
              <p className="text-stone-400 text-sm leading-relaxed font-medium max-w-sm">{t("ctaSection.subtext")}</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/register">
                <Button size="lg" className="btn-3d btn-shine bg-[#b04a15] hover:bg-[#963c0d] text-white shadow-md shadow-orange-900/25 rounded-xl font-bold px-6">
                  {t("ctaSection.createAccount")}
                </Button>
              </Link>
              {FEATURES.money && (
                <Link href="/campaigns">
                  <Button size="lg" variant="outline" className="btn-3d border-stone-700 bg-transparent text-white hover:text-white hover:bg-stone-900/40 rounded-xl font-bold px-6">
                    {t("ctaSection.browseCampaigns")}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right accent panel */}
          <div className="relative bg-[#b04a15]/90 hidden lg:flex items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#e07b3a]/30 to-[#120c04]/60" />
            <div className="relative z-10 text-center px-8">
              <span className="text-7xl font-black text-white/10 leading-none block">♥</span>
              <p className="text-white font-extrabold text-lg mt-2 leading-tight">Join thousands<br />making a difference</p>
              <p className="text-white/70 text-sm mt-2 font-medium">100% verified · local · direct</p>
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/20" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
