import Link from "next/link";
import { ArrowLeft, Heart, Shield, Milestone, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "About Us — CauseKind",
  description: "Learn about CauseKind's mission, story, and how we facilitate zero-fee verified in-kind donations.",
};

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen text-stone-800 dark:text-stone-200">
      {/* ── Hero / Header ── */}
      <div className="relative overflow-hidden bg-[#120c04] border-b border-stone-850">
        {/* Subtle background glows matching the main theme */}
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
            {t("aboutUs")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            {t("headline")}
          </h1>
          <p className="text-base text-stone-400 font-medium leading-relaxed max-w-lg mx-auto">
            {t("subheadline")}
          </p>
        </div>
      </div>

      {/* ── Vision & Mission Block ── */}
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Vision card with elegant theme styles */}
          <div className="bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#b04a15] group-hover:scale-y-110 transition-transform duration-300" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-[#b04a15]/5 text-[#b04a15]">
                <Compass className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 dark:text-white">
                {t("visionHeadline")}
              </h2>
            </div>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm">
              {t("visionText")}
            </p>
          </div>

          {/* Mission card with elegant theme styles */}
          <div className="bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#1e3a60] group-hover:scale-y-110 transition-transform duration-300" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-[#1e3a60]/5 text-[#1e3a60] dark:text-blue-400">
                <Milestone className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 dark:text-white">
                {t("missionHeadline")}
              </h2>
            </div>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm">
              {t("missionText")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Key Values / How We Stand Out ── */}
      <div className="bg-white dark:bg-zinc-900 border-t border-[#e5e2d5]/60 dark:border-zinc-800/80 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white mb-3">
              Why CauseKind?
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
              We focus on speed, local impact, and absolute transparency.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Value 1 */}
            <div className="p-6 border border-[#e5e2d5]/50 dark:border-zinc-800 rounded-xl bg-[#faf8f5]/50 dark:bg-zinc-950/50 hover:border-[#b04a15]/30 hover:scale-[1.01] transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-[#b04a15]/10 flex items-center justify-center text-[#b04a15] mb-4">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-white mb-2">
                Verified Needs Only
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                Every listings, campaign and request is vetted by admin verification processes to prevent abuse.
              </p>
            </div>

            {/* Value 2 */}
            <div className="p-6 border border-[#e5e2d5]/50 dark:border-zinc-800 rounded-xl bg-[#faf8f5]/50 dark:bg-zinc-950/50 hover:border-[#1e3a60]/30 hover:scale-[1.01] transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-[#1e3a60]/10 flex items-center justify-center text-[#1e3a60] dark:text-blue-400 mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-white mb-2">
                100% Platform Free
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                We do not take any cuts. Every single contribution goes directly to the recipient without deductions.
              </p>
            </div>

            {/* Value 3 */}
            <div className="p-6 border border-[#e5e2d5]/50 dark:border-zinc-800 rounded-xl bg-[#faf8f5]/50 dark:bg-zinc-950/50 hover:border-emerald-500/30 hover:scale-[1.01] transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-white mb-2">
                Smart Matching
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                Our local proximity matching pairs donors with nearby seekers to minimize shipping costs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
