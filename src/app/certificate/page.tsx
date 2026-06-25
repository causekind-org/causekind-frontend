"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Award, Download, Heart, ShieldCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/Reveal";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="group p-4 bg-orange-50/50 dark:bg-zinc-800 border border-orange-100/50 dark:border-zinc-800 rounded-2xl hover:border-[#b04a15]/30 hover:bg-orange-50/80 dark:hover:bg-zinc-800/80 transition-all duration-300">
      <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">{label}</p>
      <p className="mt-1 font-bold text-stone-800 dark:text-stone-200 text-sm group-hover:text-[#b04a15] transition-colors">{value}</p>
    </div>
  );
}

export default function CertificatePage() {
  const t = useTranslations("certificate");
  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* Navigation & Actions */}
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/60 dark:border-zinc-800 pb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("backToDashboard")}
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1.5 rounded-xl text-xs font-bold border-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-900">
                <Download className="h-3.5 w-3.5" />
                {t("downloadPdf")}
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Certificate Frame */}
        <Reveal delay={80}>
          <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white dark:bg-zinc-900 shadow-xl p-8 sm:p-12">
            
            {/* Left Flush Terracotta Accent Stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#b04a15]" />

            {/* Background glows */}
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#b04a15]/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-[#1e3a60]/10 blur-3xl pointer-events-none" />
            
            {/* Fine line details for credentials look */}
            <div className="absolute right-8 top-8 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">
              80G
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-center relative z-10">
              
              {/* Left Column: Details */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-[#b04a15]/10 text-[#b04a15] border border-[#b04a15]/20 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Certificate
                  </div>
                  <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-none mt-2">
                    {t("thankYouName")}
                  </h1>
                  <p className="text-sm font-semibold text-[#b04a15] uppercase tracking-wider">
                    {t("certificateType")}
                  </p>
                </div>

                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-xl">
                  {t("donationDescription")}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Detail label={t("labelItemDonated")} value="Winter jackets x 6" />
                  <Detail label={t("labelDonee")} value="Shelter For Hope (Reshma P.)" />
                  <Detail label={t("labelDeliveredOn")} value="14 May 2026" />
                  <Detail label={t("labelCertificateId")} value="CK-IK-2026-00482" />
                </div>
              </div>

              {/* Right Column: Seal & Brand */}
              <div className="flex flex-col items-center justify-center text-center bg-stone-50 dark:bg-zinc-950 p-8 rounded-3xl border border-stone-100 dark:border-zinc-850/30 relative overflow-hidden">
                {/* Internal gradient blob */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] text-white flex items-center justify-center shadow-lg shadow-[#b04a15]/20 mb-4 animate-pulse">
                  <Award className="h-8 w-8" />
                </div>
                
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#b04a15] dark:text-orange-400">
                  {t("brandName")}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 font-medium mt-1">
                  {t("tagline")}
                </p>

                <div className="w-full border-t border-stone-200/60 dark:border-zinc-800 mt-6 pt-4 space-y-1">
                  <div className="flex justify-center items-center gap-1.5 text-[11px] text-stone-500 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    {t("verifiedNote")}
                  </div>
                  <p className="text-[9px] text-stone-400 font-medium">Secured by Cryptographic Seal</p>
                </div>
              </div>

            </div>

          </div>
        </Reveal>

      </div>
    </div>
  );
}
