"use client";

import Image from "next/image";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { ArrowRight, Heart, MapPin, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { CategoryStrip } from "@/components/home/CategoryStrip";
import { TrustBand } from "@/components/home/TrustBand";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving } from "@/lib/postAuthDestination";

const HERO_IMAGE = "/images/causekind-hero-handoff.webp";
const HERO_FOREGROUND = "/images/causekind-hero-foreground.png";

/**
 * Keep the reference's primary orange CTA useful for every auth state. During
 * hydration it keeps its space but is deliberately inert, preventing a guest
 * registration link from flashing for someone who is already signed in.
 */
function usePrimaryAction() {
  const t = useTranslations("hero");
  const { user, isLoading } = useAuth();
  const role = user?.role.replace(/^ROLE_/, "");

  if (isLoading) {
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

function LocationMarker() {
  return (
    <svg viewBox="0 0 36 44" className="h-10 w-9" aria-hidden>
      <path
        d="M18 42S33 28.2 33 15.8C33 7.6 26.3 1 18 1S3 7.6 3 15.8C3 28.2 18 42 18 42Z"
        fill="#c54805"
        stroke="#fff"
        strokeWidth="2"
      />
      <circle cx="18" cy="15.5" r="6" fill="#fff" />
    </svg>
  );
}

/** The two live callouts and their animated dotted connection over the photo. */
function ConnectionPins() {
  const t = useTranslations("hero");
  const callouts = [
    {
      lead: t("connectionItemLead"),
      rest: t("connectionItemRest"),
      // Both cards float in the open background between the two people, above
      // the box — the composition in the approved reference board.
      //
      // Measured against the reframed photo at 1536×776: at this height the gap
      // runs from the man's shoulder (~34%) to the woman's shawl (~70%). The
      // cards are ~10% of the photo wide, so 38–48% and 57–67% leaves roughly
      // 4% of clearance on the outside of each and a 9% channel between them
      // for the connector to arc through. Neither lands on a person.
      //
      // Positioned from the TOP, not the bottom: the reference places them
      // against the heads and shoulders, which sit at a fixed fraction down the
      // frame, while the bottom edge moves with the clip box's aspect ratio.
      className: "top-[30%] left-[38%]",
      delay: 0,
    },
    {
      lead: t("connectionNeedLead"),
      rest: t("connectionNeedRest"),
      className: "top-[30%] left-[57%]",
      delay: 0.45,
    },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      aria-label={t("connectionLabel")}
      role="group"
    >
      <svg
        viewBox="0 0 1000 520"
        preserveAspectRatio="none"
        className="absolute inset-0 hidden size-full overflow-visible lg:block"
        aria-hidden
      >
        <path
          className="ck-hero-route"
          /* Arcs up and over the channel between the two cards, as the
             reference board draws it.

             HAND-DERIVED FROM THE CARD POSITIONS ABOVE — nothing links the two.
             The cards sit at left 38% and 57% and are ~10% wide, so their
             marker centres are at 43% and 62% across. `preserveAspectRatio` is
             `none` on a 1000×520 viewBox, so x is simply percent×10: 430 and
             620. The control points lift the curve to y≈82, clear of both card
             tops, so it reads as a connection between them rather than a line
             through them.

             If the cards move again, move these endpoints with them. */
          d="M430 125 C472 82 578 82 620 125"
          fill="none"
          stroke="#d75a17"
          strokeLinecap="round"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {callouts.map(({ lead, rest, className, delay }) => (
        <motion.div
          key={lead}
          className={`ck-hero-callout absolute hidden w-[clamp(5.6rem,6.4vw,6.9rem)] text-center lg:block ${className}`}
          initial={false}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity, delay }}
        >
          <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_5px_8px_rgba(114,43,8,0.25)]">
            <LocationMarker />
          </span>
          <div className="relative rounded-[0.9rem] bg-[#fffdf9]/96 px-2.5 py-3 shadow-[0_10px_26px_rgba(75,42,19,0.18),0_0_0_1px_rgba(103,58,27,0.05)] backdrop-blur-[2px] dark:bg-stone-900/96">
            <p className="text-[clamp(0.64rem,0.8vw,0.82rem)] font-extrabold leading-tight text-[#c54805] dark:text-[#f29a65]">
              {lead}
            </p>
            <p className="mt-0.5 text-[clamp(0.61rem,0.76vw,0.78rem)] font-bold leading-[1.28] text-[#231d18] dark:text-stone-100">
              {rest}
            </p>
            <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-[#fffdf9] dark:bg-stone-900" aria-hidden />
          </div>
        </motion.div>
      ))}

      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 lg:hidden">
        {callouts.map(({ lead, rest }) => (
          <div
            key={lead}
            className="relative w-[8.2rem] rounded-xl bg-[#fffdf9]/94 px-3 py-2.5 text-center shadow-[0_8px_22px_rgba(75,42,19,0.18)] backdrop-blur-[2px] dark:bg-stone-900/94"
          >
            <MapPin className="absolute -top-3 left-1/2 size-5 -translate-x-1/2 fill-[#c54805] text-white" aria-hidden />
            <p className="text-[0.65rem] font-extrabold leading-tight text-[#c54805] dark:text-[#f29a65]">{lead}</p>
            <p className="mt-0.5 text-[0.62rem] font-bold leading-tight text-stone-800 dark:text-stone-100">{rest}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One responsive DOM tree keeps routes, tour anchors and auth behavior aligned. */
export function HeroSection() {
  const t = useTranslations("hero");
  const primaryAction = usePrimaryAction();

  return (
    <MotionConfig reducedMotion="user">
      <section
        data-tour="guest-hero"
        aria-labelledby="causekind-hero-title"
        className="ck-showcase-hero relative isolate overflow-hidden bg-[#fdf5ed] px-3 pb-3 pt-3 text-[#100c06] dark:bg-[#15110f] dark:text-stone-100 sm:px-5 sm:pb-4 sm:pt-4 lg:px-[clamp(2rem,3.4vw,5.5rem)] lg:pt-0"
      >
        <div className="ck-hero-dot-field pointer-events-none absolute inset-x-0 bottom-0 h-[42%] opacity-55 dark:opacity-15" aria-hidden />

        <div className="ck-hero-frame relative z-10 mx-auto min-w-0 w-full max-w-[1920px]">
          <div className="ck-lead-hero-stage relative grid min-w-0 bg-[#fdf5ed] dark:bg-[#1a1512] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="ck-hero-copy relative z-10 flex min-w-0 flex-col justify-center px-3 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6 lg:px-0 lg:pb-[clamp(2.6rem,5vh,5.5rem)] lg:pl-[clamp(0.75rem,1.2vw,1.75rem)] lg:pr-[clamp(3rem,6vw,8rem)] lg:pt-[clamp(1.2rem,2.4vh,2.5rem)]">
              <div className="flex items-center gap-3 text-[#c54805] dark:text-[#f29a65]">
                <span className="h-px w-8 bg-current opacity-55 sm:w-12" aria-hidden />
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] sm:text-xs lg:text-[clamp(0.68rem,0.78vw,0.92rem)]">
                  {t("eyebrow")}
                </p>
                <span className="h-px w-8 bg-current opacity-55 sm:w-12" aria-hidden />
              </div>

              <h1
                id="causekind-hero-title"
                className="ck-hero-headline mt-[clamp(0.8rem,2vh,1.65rem)] text-[#100c06] dark:text-stone-50"
              >
                <span className="block whitespace-nowrap">{t("headlineTop")}</span>
                <span className="block whitespace-nowrap text-[#c54805] dark:text-[#ef8f54]">
                  {t("headlineAccent")}
                </span>
              </h1>

              <div className="mt-[clamp(0.75rem,2.1vh,1.55rem)] flex items-center gap-3 text-[#c54805] dark:text-[#f29a65]" aria-hidden>
                <span className="h-px w-[clamp(3.5rem,8vw,8.5rem)] bg-current opacity-55" />
                <Heart className="size-4 fill-current sm:size-5" strokeWidth={0} />
                <span className="h-px w-[clamp(3.5rem,8vw,8.5rem)] bg-current opacity-55" />
              </div>

              <p className="mt-[clamp(0.7rem,1.8vh,1.4rem)] max-w-[34rem] text-sm font-medium leading-relaxed text-[#34322f] [text-wrap:pretty] dark:text-stone-300 sm:text-base lg:max-w-[25rem] lg:text-[clamp(0.98rem,1.2vw,1.32rem)] lg:leading-[1.55]">
                {t("subtext")}
              </p>

              <div className="ck-hero-actions mt-[clamp(1rem,2.6vh,2.2rem)] grid w-full grid-cols-[minmax(0,0.82fr)_minmax(0,1.35fr)] gap-2 sm:flex sm:w-max sm:flex-row sm:flex-nowrap sm:gap-3">
                {primaryAction.href ? (
                  <Link
                    href={primaryAction.href}
                    className="ck-hero-primary-cta group relative isolate inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-[#b04a15] px-2 text-[0.58rem] font-extrabold uppercase leading-tight tracking-[0.035em] text-white shadow-[0_11px_25px_rgba(176,74,21,0.27)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#c45520] hover:shadow-[0_15px_30px_rgba(176,74,21,0.33)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a60] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf5ed] dark:focus-visible:ring-[#f29a65] dark:focus-visible:ring-offset-[#1a1512] sm:min-h-14 sm:w-auto sm:shrink-0 sm:gap-3 sm:whitespace-nowrap sm:rounded-[0.9rem] sm:px-6 sm:text-xs sm:tracking-[0.045em]"
                  >
                    <MapPin className="ck-hero-cta-icon relative z-[1] size-4 shrink-0 sm:size-5" strokeWidth={2} aria-hidden />
                    <span className="relative z-[1] min-w-0 text-center">{primaryAction.label}</span>
                    <ArrowRight className="ck-hero-action-arrow relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden />
                  </Link>
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-[#b04a15]/70 px-2 text-[0.58rem] font-extrabold uppercase leading-tight tracking-[0.035em] text-white/80 sm:min-h-14 sm:w-auto sm:shrink-0 sm:gap-3 sm:whitespace-nowrap sm:rounded-[0.9rem] sm:px-6 sm:text-xs sm:tracking-[0.045em]"
                  >
                    <MapPin className="size-4 shrink-0 sm:size-5" />
                    <span className="min-w-0 text-center">{primaryAction.label}</span>
                    <ArrowRight className="ck-hero-action-arrow size-4 shrink-0 sm:size-5" />
                  </span>
                )}

                <Link
                  href="/requests"
                  className="ck-hero-secondary-cta group relative isolate inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] px-2 text-[0.56rem] font-extrabold uppercase leading-tight tracking-[0.02em] text-[#b04a15] shadow-[inset_0_0_0_1.5px_rgba(176,74,21,0.62)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/55 hover:shadow-[inset_0_0_0_1.5px_rgba(176,74,21,0.82),0_10px_22px_rgba(176,74,21,0.11)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf5ed] dark:text-[#e07b3a] dark:hover:bg-white/5 dark:focus-visible:ring-offset-[#1a1512] sm:min-h-14 sm:w-auto sm:shrink-0 sm:gap-3 sm:whitespace-nowrap sm:rounded-[0.9rem] sm:px-6 sm:text-xs sm:tracking-[0.04em]"
                >
                  <UsersRound className="ck-hero-cta-icon relative z-[1] size-4 shrink-0 sm:size-5" strokeWidth={2} aria-hidden />
                  <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                  <ArrowRight className="ck-hero-action-arrow relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="ck-hero-photo-shell relative min-h-[clamp(10.5rem,24vh,14rem)] min-w-0">
              <div className="ck-hero-photo-clip absolute inset-0 overflow-hidden bg-[#e9c69d]">
                <Image
                  src={HERO_IMAGE}
                  alt={t("photoAlt")}
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, (max-width: 1919px) 62vw, 1180px"
                  className="ck-hero-photo-image object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[12%] bg-gradient-to-r from-[#fdf5ed]/65 to-transparent lg:block dark:from-[#1a1512]/78" aria-hidden />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[17%] bg-gradient-to-t from-[#5d2608]/18 to-transparent" aria-hidden />
              </div>
              <div
                className="ck-hero-photo-breakout pointer-events-none absolute inset-0 z-[5] hidden lg:block"
                aria-hidden
              >
                <Image
                  src={HERO_FOREGROUND}
                  alt=""
                  fill
                  sizes="(min-width: 1920px) 1180px, 62vw"
                  className="ck-hero-photo-image object-cover object-center"
                />
              </div>
              <ConnectionPins />
            </div>
          </div>

          <div className="relative z-30 -mt-3 lg:-mt-[clamp(1.75rem,3.7vh,2.75rem)]">
            <CategoryStrip />
          </div>

          <div className="relative z-20 mt-2 lg:mt-[clamp(1.25rem,2.4vh,1.65rem)]">
            <TrustBand />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
