import Link from "next/link";
import { FaqSection } from "@/components/FaqSection";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Help & FAQ — CauseKind",
  description: "Answers to common questions about donating, campaigns, and how CauseKind works.",
};

export default async function HelpPage() {
  const t = await getTranslations("help");

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen">

      {/* ── Hero / Header ── */}
      <div className="relative overflow-hidden bg-[#120c04] border-b border-stone-800">
        {/* Subtle background glows */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-[400px] h-[400px] rounded-full bg-[#b04a15]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/4 w-[300px] h-[300px] rounded-full bg-[#1e3a60]/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-14 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToHome")}
          </Link>
          <p className="text-xs font-black uppercase tracking-widest text-[#b04a15] mb-3">
            {t("helpCenter")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            {t("headline")}
          </h1>
          <p className="text-base text-stone-400 font-medium leading-relaxed max-w-lg mx-auto">
            {t("subheadline")}
          </p>
        </div>
      </div>

      {/* ── FAQ accordion ── */}
      <FaqSection />

      {/* ── Contact strip ── */}
      <div className="bg-white dark:bg-zinc-900 border-t border-orange-100/60 dark:border-zinc-800 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center space-y-4">
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-white">
            {t("stillNeedHelp")}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
            {t("reachOut")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a
              href="mailto:support@causekind.org"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#b04a15] text-white text-sm font-bold hover:bg-[#963c0d] transition-colors shadow-md shadow-[#b04a15]/20"
            >
              <Mail className="w-4 h-4" />
              {t("emailSupport")}
            </a>
            <a
              href="tel:+917719938619"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-300 text-sm font-bold border border-stone-200 dark:border-zinc-700 hover:border-[#b04a15]/40 transition-colors"
            >
              <Phone className="w-4 h-4" />
              +91 77199 38619
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
