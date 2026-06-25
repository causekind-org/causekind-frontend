import Link from "next/link";
import { FaqSection } from "@/components/FaqSection";
import { ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Help & FAQ — CauseKind",
  description: "Answers to common questions about donating, campaigns, and how CauseKind works.",
};

export default async function HelpPage() {
  const t = await getTranslations("help");

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen">

      {/* ── Hero — ASYMMETRIC: oversized left-flush heading ── */}
      <div className="relative overflow-hidden bg-[#120c04] border-b border-stone-800">
        {/* Off-center background glows */}
        <div className="pointer-events-none absolute -top-24 left-[5%] w-[500px] h-[500px] rounded-full bg-[#b04a15]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-[10%] w-[300px] h-[300px] rounded-full bg-[#1e3a60]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 sm:px-10 pt-16 pb-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToHome")}
          </Link>

          {/* Asymmetric heading grid */}
          <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-3">
                {t("helpCenter")}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
                {t("headline")}
              </h1>
            </div>
            <p className="text-sm text-stone-400 font-medium leading-relaxed max-w-xs lg:text-right lg:pb-1">
              {t("subheadline")}
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ accordion ── */}
      <FaqSection />

      {/* ── Contact strip — ASYMMETRIC SPLIT ── */}
      <div className="border-t border-[#e5e2d5]/60 dark:border-zinc-800 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="grid lg:grid-cols-[3fr_2fr] divide-y lg:divide-y-0 lg:divide-x divide-[#e5e2d5]/60 dark:divide-zinc-800">

            {/* Left: still need help text */}
            <div className="py-16 lg:pr-16">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-3 block">Support</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white mb-3">
                {t("stillNeedHelp")}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium max-w-md">
                {t("reachOut")}
              </p>
            </div>

            {/* Right: contact buttons stacked, left-aligned */}
            <div className="py-16 lg:pl-16 flex flex-col justify-center gap-4">
              <a
                href="mailto:support@causekind.org"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[#b04a15] text-white text-sm font-bold hover:bg-[#963c0d] transition-colors shadow-md shadow-[#b04a15]/20 w-fit"
              >
                <Mail className="w-4 h-4" />
                {t("emailSupport")}
              </a>
              <a
                href="tel:+917719938619"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 text-stone-700 dark:text-stone-300 text-sm font-bold border border-[#e5e2d5] dark:border-zinc-700 hover:border-[#b04a15]/40 transition-colors w-fit"
              >
                <Phone className="w-4 h-4" />
                +91 77199 38619
              </a>
              <a
                href="https://wa.me/917719938619"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 text-stone-700 dark:text-stone-300 text-sm font-bold border border-[#e5e2d5] dark:border-zinc-700 hover:border-[#b04a15]/40 transition-colors w-fit"
              >
                <MessageCircle className="w-4 h-4 text-[#b04a15]" />
                WhatsApp Us
              </a>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
