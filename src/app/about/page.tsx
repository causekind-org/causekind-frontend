import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, Shield, Milestone, Compass, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Interactive3dHero } from "@/components/Interactive3dHero";

export const metadata = {
  title: "About Us — CauseKind",
  description: "Learn about CauseKind's mission, story, and how we facilitate verified in-kind donations.",
};

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen text-stone-800 dark:text-stone-200">
      
      {/* ── Hero / Header with Interactive 3D Background ── */}
      <div className="relative overflow-hidden bg-[#120c04] border-b border-stone-850 h-[280px] sm:h-[340px] flex items-center justify-center">
        
        {/* 3D Interactive Canvas Background */}
        <Interactive3dHero className="opacity-95" />
        
        {/* Warm radial glows on top of canvas for color richness */}
        <div className="pointer-events-none absolute inset-0 bg-radial-at-c from-transparent via-[#120c04]/40 to-[#120c04] z-10" />

        <div className="relative mx-auto max-w-3xl px-6 text-center z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold mb-6 transition-all duration-300 hover:translate-x-[-2px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToHome")}
          </Link>
          <p className="text-xs font-black uppercase tracking-widest text-[#b04a15] mb-3 animate-pulse">
            {t("aboutUs")}
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            {t("headline")}
          </h1>
          <p className="text-sm sm:text-base text-stone-300 font-medium leading-relaxed max-w-xl mx-auto opacity-90">
            {t("subheadline")}
          </p>
        </div>
      </div>

      {/* ── Section 1: Our Story (Asymmetric Layout with Photo) ── */}
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          
          {/* Photo Container on the Left (lg:col-span-5) */}
          <div className="lg:col-span-5 relative group">
            {/* Themed background decorative card */}
            <div className="absolute -inset-2 bg-gradient-to-r from-[#b04a15] to-[#1e3a60] rounded-3xl blur-md opacity-25 group-hover:opacity-40 transition duration-500" />
            <div className="relative bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-[#e5e2d5]/60 dark:border-stone-800 shadow-xl overflow-hidden">
              <Image
                src="/local_handover.png"
                alt="Local handover donation"
                width={600}
                height={450}
                className="rounded-xl object-cover w-full h-[320px] sm:h-[380px] hover:scale-[1.02] transition-transform duration-500"
                priority
              />
            </div>
            
            {/* Float badge */}
            <div className="absolute -bottom-4 -right-4 bg-[#b04a15] text-white px-5 py-2.5 rounded-2xl shadow-lg border border-orange-400/20 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 animate-bounce">
              <Heart className="w-4 h-4 fill-white" />
              Verified Safe
            </div>
          </div>

          {/* Story Text on the Right (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6 lg:pl-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b04a15]/10 text-[#b04a15] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Direct Support Model
            </div>
            <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white leading-tight">
              {t("storyTitle")}
            </h2>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-base sm:text-lg">
              {t("storyText")}
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-stone-200 dark:border-zinc-800">
              <div>
                <p className="text-3xl font-black text-[#b04a15]">100%</p>
                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">Verified Handovers</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[#1e3a60] dark:text-blue-400">10-25km</p>
                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">Local Proximity Match</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Section 2: Vision & Mission (Asymmetric Staggered Cards) ── */}
      <div className="bg-[#f5f2eb]/40 dark:bg-zinc-950/60 border-y border-[#e5e2d5]/60 dark:border-stone-900/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white mb-3">
              Where We Are Heading
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
              Building a transparent platform for community-centered philanthropy.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-12 items-stretch">
            
            {/* Vision card (Shorter heights/alignment, md:col-span-5) */}
            <div className="md:col-span-5 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-3xl p-8 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#b04a15] group-hover:scale-y-110 transition-transform duration-300" />
              <div>
                <div className="p-3 w-fit rounded-xl bg-[#b04a15]/10 text-[#b04a15] mb-6">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-extrabold text-stone-900 dark:text-white mb-4">
                  {t("visionHeadline")}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm">
                  {t("visionText")}
                </p>
              </div>
              <div className="mt-8 text-xs font-bold text-[#b04a15] uppercase tracking-wider">
                Transparent Ecosystem &rarr;
              </div>
            </div>

            {/* Mission card (Taller height/larger sizing, md:col-span-7) */}
            <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-3xl p-10 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#1e3a60] group-hover:scale-y-110 transition-transform duration-300" />
              <div>
                <div className="p-3 w-fit rounded-xl bg-[#1e3a60]/10 text-[#1e3a60] dark:text-blue-400 mb-6">
                  <Milestone className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-extrabold text-stone-900 dark:text-white mb-4">
                  {t("missionHeadline")}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-base">
                  {t("missionText")}
                </p>
              </div>
              <div className="mt-12 text-xs font-bold text-[#1e3a60] dark:text-blue-400 uppercase tracking-wider">
                Direct Resource Distribution &rarr;
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Section 3: Asymmetric Grid / Masonry Core Values ── */}
      <div className="mx-auto max-w-6xl px-6 py-20">
        
        <div className="grid gap-8 lg:grid-cols-12 items-stretch">
          
          {/* Main Large Showcase Card (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 grid sm:grid-cols-12">
            
            {/* Image Column */}
            <div className="sm:col-span-5 relative min-h-[220px]">
              <Image
                src="/community_donation.png"
                alt="Community donation packing"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent to-white dark:to-zinc-900 z-10" />
            </div>

            {/* Content Column */}
            <div className="sm:col-span-7 p-8 sm:p-10 flex flex-col justify-center relative z-20">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#b04a15] mb-2 block">
                Local Focus
              </span>
              <h3 className="text-2xl font-extrabold text-stone-900 dark:text-white mb-4">
                {t("communityTitle")}
              </h3>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm">
                {t("communityText")}
              </p>
            </div>

          </div>

          {/* Small Card 1 (lg:col-span-4) */}
          <div className="lg:col-span-4 p-8 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-3xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="w-12 h-12 rounded-2xl bg-[#1e3a60]/10 flex items-center justify-center text-[#1e3a60] dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-stone-900 dark:text-white mb-2">
                Secure Platform
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                We facilitate direct connections under strict administrative moderation and location matching.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Razorpay Secured
            </div>
          </div>

          {/* Small Card 2 (lg:col-span-4) */}
          <div className="lg:col-span-4 p-8 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800/80 rounded-3xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="w-12 h-12 rounded-2xl bg-[#b04a15]/10 flex items-center justify-center text-[#b04a15] mb-6 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 fill-[#b04a15]" />
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-stone-900 dark:text-white mb-2">
                Verified Needs Only
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                Our team reviews every listing, campaign, and request manually. Safe, verified, direct support.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Admin Audited
            </div>
          </div>

          {/* Showcase Large Card 2 (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#120c04] border border-stone-800 rounded-3xl p-10 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-[280px] h-[280px] rounded-full bg-[#b04a15]/10 blur-3xl group-hover:bg-[#b04a15]/15 transition-all duration-500" />
            <div>
              <h3 className="text-2xl font-extrabold text-white mb-4">
                Want to join the movement?
              </h3>
              <p className="text-stone-400 max-w-xl leading-relaxed text-sm font-medium">
                Register as a Donor to start listing spare supplies and funding verified local campaigns, or sign up as a Donee to seek support for your educational, medical, or family causes.
              </p>
            </div>
            <div className="flex gap-4 pt-8 mt-8 border-t border-stone-800 flex-wrap">
              <Link href="/requests" className="px-6 py-3 rounded-full bg-[#b04a15] hover:bg-[#963c0d] text-white text-xs font-extrabold uppercase tracking-wider transition-colors shadow-md shadow-[#b04a15]/20">
                Become a Donor
              </Link>
              <Link href="/help" className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-extrabold uppercase tracking-wider transition-colors">
                Receive Support
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
