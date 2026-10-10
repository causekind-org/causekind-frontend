"use client";

import Image from "next/image";
import { Anton } from "next/font/google";
import Link from "@/components/AppLink";
import { NewRequestLink } from "@/components/NewRequestLink";
import { DonateNowButton } from "@/components/donate/DonateNowButton";
import { MotionConfig } from "framer-motion";
import { ArrowRight, Heart, MapPin, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { CategoryStrip } from "@/components/home/CategoryStrip";
import { TrustBand } from "@/components/home/TrustBand";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving } from "@/lib/postAuthDestination";

const mobileDisplay = Anton({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-hero-mobile" });

function usePrimaryAction() {
  const t = useTranslations("hero");
  const { user, isRestoring } = useAuth();
  const role = user?.role.replace(/^ROLE_/, "");

  if (isRestoring) {
    return { href: null, label: t("ctaStartGiving") };
  }

  if (role === "DONOR") {
    return { href: "/items/new", label: t("ctaListItem") };
  }

  if (role === "DONEE") {
    return { href: "/requests/new", label: t("ctaRequestItem") };
  }

  if (role === "ADMIN") {
    return { href: "/admin/dashboard", label: t("ctaOpenDashboard") };
  }

  if (role === "SUPER_ADMIN") {
    return { href: "/super-admin", label: t("ctaOpenDashboard") };
  }

  return {
    href: registerUrlPreserving("/items/new"),
    label: t("ctaStartGiving"),
  };
}

export function NavratriHero() {
  const t = useTranslations("hero");
  const primaryAction = usePrimaryAction();
  const { user, isRestoring } = useAuth();

  return (
    <MotionConfig reducedMotion="user">
      <section
        data-tour="guest-hero"
        style={{ "--font-hero-mobile": mobileDisplay.style.fontFamily } as React.CSSProperties}
        aria-labelledby="causekind-hero-title"
        className="ck-showcase-hero relative isolate overflow-hidden bg-[var(--surface-cream)] text-[#100c06] pb-3 sm:pb-4 lg:pb-0"
      >
        <div className="ck-hero-frame relative z-10 mx-auto min-w-0 w-full">
          <div className="ck-lead-hero-stage relative flex min-w-0 flex-col lg:flex-row lg:items-center lg:h-[calc(100vh-var(--ck-nav-h,4.25rem)-110px)] lg:min-h-[440px] lg:max-h-[560px] overflow-hidden bg-[#fdfaf5]">
            
            {/* Background Image (Absolute on Desktop, block on Mobile) */}
            <div className="absolute inset-0 z-0 hidden lg:flex justify-end overflow-hidden bg-[#fdfaf5]">
              <div 
                className="relative h-full w-auto" 
                style={{ 
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 120px)", 
                  maskImage: "linear-gradient(to right, transparent 0%, black 120px)" 
                }}
              >
                <picture>
                  <source media="(max-width: 1279px)" srcSet="/images/navratri-hero-1280.webp" />
                  <Image
                    src="/images/navratri-hero-1920.webp"
                    alt="Illustration of a woman and a man dancing garba with dandiya sticks"
                    width={2752}
                    height={1536}
                    priority
                    className="h-full w-auto object-contain object-right"
                  />
                </picture>
              </div>
            </div>

            {/* Mobile Image (Visible only below LG) */}
            <div className="relative z-0 w-full lg:hidden order-2 mt-4 bg-[#fdfaf5]">
              <picture>
                <source media="(max-width: 767px)" srcSet="/images/navratri-hero-800.webp" />
                <Image
                  src="/images/navratri-hero-1280.webp"
                  alt="Illustration of a woman and a man dancing garba with dandiya sticks"
                  width={1280}
                  height={714}
                  priority
                  className="w-full h-auto object-contain"
                />
              </picture>
            </div>

            {/* Text Content */}
            <div className="ck-hero-copy relative z-10 flex min-w-0 flex-col pt-8 pb-4 px-6 sm:px-8 lg:mt-0 lg:justify-center lg:px-0 lg:pb-0 lg:pl-[clamp(3.5rem,8vw,8rem)] lg:pr-[1rem] lg:pt-0 order-1 lg:w-full lg:max-w-[34rem] xl:max-w-[40rem]">
              
              <div className="hidden w-max items-center gap-2 rounded-full bg-[var(--ck-home-accent,#b04a15)]/[0.07] px-3 py-1 text-[var(--ck-home-ink,#c54805)] ring-1 ring-[var(--ck-home-accent,#b04a15)]/15 lg:flex">
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em]">
                  {t("eyebrow")}
                </p>
              </div>

              <div className="ck-mobile-hero-badge lg:hidden text-[var(--ck-home-ink,#c54805)] flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider">
                <Heart className="size-3 fill-current" strokeWidth={0} aria-hidden />
                <span>{t("badge")}</span>
              </div>

              <h1
                id="causekind-hero-title"
                className="ck-hero-headline text-[#100c06] mt-4 lg:mt-[clamp(0.8rem,2vh,1.65rem)]"
              >
                <span className="block lg:whitespace-nowrap">This Navratri,</span>
                <span className="block text-[var(--ck-home-ink,#c54805)] lg:whitespace-nowrap">
                  Let Kindness Shine.
                </span>
              </h1>

              <p className="mt-3.5 max-w-[30ch] text-[0.95rem] font-medium leading-relaxed text-[#34322f] [text-wrap:pretty] lg:mt-[clamp(0.7rem,1.8vh,1.4rem)] lg:max-w-[25rem] lg:text-[clamp(0.98rem,1.2vw,1.32rem)] lg:leading-[1.55]">
                Celebrate the spirit of giving. Connect with someone nearby and make this festive season brighter through meaningful donations.
              </p>

              <div data-guest={!user && !isRestoring ? "true" : undefined} className="ck-hero-actions mt-6 flex w-full flex-col gap-3 lg:mt-[clamp(1rem,2.6vh,2.2rem)] lg:w-max lg:flex-row lg:flex-nowrap lg:gap-3">
                {primaryAction.href ? (
                  <NewRequestLink
                    href={primaryAction.href}
                    className="ck-hero-primary-cta ck-cta-live group relative isolate order-2 inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-transparent px-2 text-[0.84rem] font-semibold leading-tight text-[#100c06] shadow-none lg:order-1 lg:min-h-12 lg:bg-[var(--ck-home-accent,#b04a15)] lg:text-[0.58rem] lg:font-extrabold lg:uppercase lg:tracking-[0.035em] lg:text-white lg:shadow-[0_11px_25px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.27)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--ck-home-hover,#c45520)] hover:shadow-[0_15px_30px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.33)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf5ed] lg:min-h-14 lg:w-auto lg:shrink-0 lg:gap-3 lg:whitespace-nowrap lg:rounded-full lg:px-6 sm:text-xs sm:tracking-[0.045em]"
                  >
                    <MapPin className="ck-hero-cta-icon relative z-[1] hidden size-4 shrink-0 lg:block" strokeWidth={2} aria-hidden />
                    {!user && !isRestoring && <span aria-hidden="true" className="ck-hero-signup-prompt lg:hidden">{t.has("givingPrompt") ? t("givingPrompt") : "Have something to give?"}</span>}
                    <span className="relative z-[1] min-w-0 text-center">{primaryAction.label}</span>
                    <ArrowRight className="ck-hero-action-arrow relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden />
                  </NewRequestLink>
                ) : (
                  <span
                    aria-hidden
                    className="ck-hero-auth-placeholder inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-[var(--ck-home-accent,#b04a15)]/70 px-2 text-[0.58rem] font-extrabold uppercase leading-tight tracking-[0.035em] text-white/80 lg:min-h-14 lg:w-auto lg:shrink-0 lg:gap-3 lg:whitespace-nowrap lg:rounded-full lg:px-6 sm:text-xs sm:tracking-[0.045em]"
                  >
                    <MapPin className="size-4 shrink-0 sm:size-5" />
                    <span className="min-w-0 text-center">{primaryAction.label}</span>
                    <ArrowRight className="ck-hero-action-arrow size-4 shrink-0 sm:size-5" />
                  </span>
                )}

                {user?.role !== "DONEE" && (
                <Link
                  href="/requests"
                  className="ck-hero-secondary-cta group relative isolate order-1 inline-flex min-h-14 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-[#fdf5ed] px-5 text-[0.95rem] font-extrabold leading-tight text-[#1a130d] shadow-none lg:order-2 lg:min-h-12 lg:bg-transparent lg:px-2 lg:text-[0.56rem] lg:uppercase lg:tracking-[0.02em] lg:text-[var(--ck-home-ink,#b04a15)] lg:shadow-[inset_0_0_0_1.5px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.62)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/55 hover:shadow-[inset_0_0_0_1.5px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.82),0_10px_22px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.11)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#b04a15)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf5ed] lg:min-h-14 lg:w-auto lg:shrink-0 lg:gap-3 lg:whitespace-nowrap lg:rounded-full lg:px-6 lg:text-xs lg:tracking-[0.04em]"
                >
                  <UsersRound className="ck-hero-cta-icon relative z-[1] hidden size-4 shrink-0 lg:block" strokeWidth={2} aria-hidden />
                  <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                  <ArrowRight className="ck-hero-action-arrow relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden />
                </Link>
                )}

                <DonateNowButton
                  size="sm"
                  className="ck-hero-donate-cta order-3 w-full lg:w-auto lg:shrink-0"
                />
              </div>
              <div className="ck-mobile-hero-trust lg:hidden mt-6">
                <TrustBand />
              </div>
            </div>
            
          </div>

          <div className="ck-hero-category-rail relative z-30 -mt-3 lg:-mt-[clamp(1.75rem,3.7vh,2.75rem)]">
            <CategoryStrip />
          </div>

          <div className="ck-hero-trust-rail relative z-20 hidden lg:block lg:mt-[clamp(1.25rem,2.4vh,1.65rem)]">
            <TrustBand />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
