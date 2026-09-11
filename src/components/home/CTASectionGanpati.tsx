"use client";

/**
 * CTASectionGanpati — Bottom "Get started" call-to-action panel with
 * animated Lord Ganesha & Mushak (mouse) illustration.
 *
 * Sibling to CTASection.tsx. Hidden when user is logged in.
 * Uses Framer Motion's whileInView to animate the sacred scene into view
 * upon scrolling, with gentle trunk sway and playful Mushak animation.
 */

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { ModakIcon, LotusIcon, FloatingFestiveBadge } from "@/components/home/GanpatiVisuals";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * CTASectionGanpati — Bottom festive Call to Action section.
 */
export function CTASectionGanpati() {
  const t = useTranslations("landing");
  const { user } = useAuth();

  if (user) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 shadow-[0_20px_50px_rgba(217,119,6,0.25)] grid md:grid-cols-[3fr_2fr] min-h-[320px] bg-[#1a0802]">

          {/* Left panel */}
          <div className="relative bg-gradient-to-br from-[#240c04] via-[#1a0802] to-[#120501] px-8 sm:px-12 py-12 sm:py-16 flex flex-col justify-between z-10">
            {/* Ambient golden glow */}
            <div className="pointer-events-none absolute -top-20 -left-20 w-[320px] h-[320px] rounded-full bg-amber-500/15 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <ModakIcon className="size-4.5 text-amber-400" />
                <span className="text-2xs font-black uppercase tracking-widest text-[#f0b97a]">
                  Ganeshotsav 2026 · Auspicious Beginnings
                </span>
                <ModakIcon className="size-4 text-amber-400" />
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4 font-serif">
                Remove obstacles for someone today.
              </h2>

              <p className="text-amber-100/75 text-sm sm:text-base leading-relaxed font-medium max-w-md">
                Whether it's spare textbooks, notebooks, clothes, or essential home appliances — your act of giving brings joy, dignity, and Bappa's blessings to a family in your neighbourhood.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] hover:from-[#c2410c] hover:to-[#b45309] text-white shadow-lg shadow-orange-900/40 rounded-xl font-black px-7 py-6 text-sm tracking-wide uppercase transition-all hover:-translate-y-0.5"
                >
                  <Sparkles className="size-4 mr-2" />
                  {t("ctaSection.createAccount")}
                </Button>
              </Link>

              <Link href="/requests">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-amber-400/40 bg-white/5 text-amber-200 hover:text-white hover:bg-white/10 rounded-xl font-black px-6 py-6 text-sm tracking-wide uppercase transition-all"
                >
                  Browse verified needs <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </Link>

              {FEATURES.money && (
                <Link href="/campaigns">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-amber-400/40 bg-transparent text-amber-200 hover:text-white hover:bg-stone-900/40 rounded-xl font-bold px-6 py-6 text-sm"
                  >
                    {t("ctaSection.browseCampaigns")}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right accent panel: Filled edge-to-edge with footer.webp image and floating badge */}
          <div className="relative flex h-[260px] md:h-auto min-h-[260px] md:min-h-[320px] bg-gradient-to-br from-[#7f1d1d] via-[#450a0a] to-[#200505] items-center justify-center overflow-hidden border-t md:border-t-0 md:border-l border-amber-500/25">
            <Image
              src="/images/footer.webp"
              alt="Lord Ganesha Festive Blessing"
              fill
              quality={90}
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover object-center"
            />
            {/* Soft dark gradient overlay toward the left edge to blend with the dark left column */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#120501]/85 via-[#120501]/35 to-transparent hidden md:block"
              aria-hidden="true"
            />
            {/* Soft dark gradient overlay from top on mobile */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#120501]/75 via-transparent to-transparent block md:hidden"
              aria-hidden="true"
            />

            {/* Floating festive badge centered over the image with higher z-index */}
            <div className="relative z-20 pointer-events-none">
              <FloatingFestiveBadge
                variant="maroon"
                icon={<LotusIcon className="size-4 text-amber-400" />}
                text="Vighnaharta Blesses You"
                subtext="Remover of Obstacles"
                delay={0.6}
              />
            </div>
          </div>

        </div>
      </motion.div>
    </section>
  );
}
