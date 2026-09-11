"use client";

import Image from "next/image";
import { Anton } from "next/font/google";
import Link from "next/link";
import { NewRequestLink } from "@/components/NewRequestLink";
import { MotionConfig, motion } from "framer-motion";
import { ArrowRight, Heart, MapPin, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { CategoryStrip } from "@/components/home/CategoryStrip";
import { TrustBand } from "@/components/home/TrustBand";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving } from "@/lib/postAuthDestination";

const HERO_IMAGE = "/images/causekind-hero-handoff.webp";
const mobileDisplay = Anton({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-hero-mobile" });
const HERO_FOREGROUND = "/images/causekind-hero-foreground.png";

/**
 * Keep the reference's primary orange CTA useful for every auth state. During
 * hydration it keeps its space but is deliberately inert, preventing a guest
 * registration link from flashing for someone who is already signed in.
 */
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

function LocationMarker() {
  return (
    <svg viewBox="0 0 36 44" className="h-10 w-9" aria-hidden>
      <path
        d="M18 42S33 28.2 33 15.8C33 7.6 26.3 1 18 1S3 7.6 3 15.8C3 28.2 18 42 18 42Z"
        fill="var(--ck-home-accent,#c54805)"
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
          stroke="var(--ck-home-accent,#d75a17)"
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
          <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_5px_8px_rgba(var(--ck-home-shadow-rgb,114,43,8),0.25)]">
            <LocationMarker />
          </span>
          <div className="relative rounded-[0.9rem] bg-[#fffdf9]/96 px-2.5 py-3 shadow-[0_10px_26px_rgba(var(--ck-home-shadow-rgb,75,42,19),0.18),0_0_0_1px_rgba(var(--ck-home-shadow-rgb,103,58,27),0.05)] backdrop-blur-[2px] dark:bg-stone-900/96">
            <p className="text-[clamp(0.64rem,0.8vw,0.82rem)] font-extrabold leading-tight text-[var(--ck-home-ink,#c54805)] dark:text-[var(--ck-home-highlight,#f29a65)]">
              {lead}
            </p>
            <p className="mt-0.5 text-[clamp(0.61rem,0.76vw,0.78rem)] font-bold leading-[1.28] text-[#231d18] dark:text-stone-100">
              {rest}
            </p>
            <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-[#fffdf9] dark:bg-stone-900" aria-hidden />
          </div>
        </motion.div>
      ))}

      {/* Desktop-only now. These were the phone's version of the callouts, sat
          on the photo's bottom edge — but below lg the photo is the whole hero
          ground and that edge is where the CTA lives, so they landed on top of
          it. The desktop pins above are unaffected. */}
      <div className="absolute inset-x-3 bottom-3 hidden items-end justify-between gap-3">
        {callouts.map(({ lead, rest }) => (
          <div
            key={lead}
            className="relative w-[8.2rem] rounded-xl bg-[#fffdf9]/94 px-3 py-2.5 text-center shadow-[0_8px_22px_rgba(var(--ck-home-shadow-rgb,75,42,19),0.18)] backdrop-blur-[2px] dark:bg-stone-900/94"
          >
            <MapPin className="absolute -top-3 left-1/2 size-5 -translate-x-1/2 fill-[var(--ck-home-accent,#c54805)] text-white" aria-hidden />
            <p className="text-[0.65rem] font-extrabold leading-tight text-[var(--ck-home-ink,#c54805)] dark:text-[var(--ck-home-highlight,#f29a65)]">{lead}</p>
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
  const { user, isRestoring } = useAuth();

  return (
    <MotionConfig reducedMotion="user">
      <section
        data-tour="guest-hero"
        style={{ "--font-hero-mobile": mobileDisplay.style.fontFamily } as React.CSSProperties}
        aria-labelledby="causekind-hero-title"
        className="ck-showcase-hero relative isolate overflow-hidden bg-[#fdf5ed] px-3 pb-3 pt-3 text-[#100c06] dark:bg-[#15110f] dark:text-stone-100 sm:px-5 sm:pb-4 sm:pt-4 lg:px-[clamp(2rem,3.4vw,5.5rem)] lg:pt-0"
      >
        <div className="ck-hero-dot-field pointer-events-none absolute inset-x-0 bottom-0 h-[42%] opacity-55 dark:opacity-15" aria-hidden />

        <div className="ck-hero-frame relative z-10 mx-auto min-w-0 w-full max-w-[1920px]">
          {/* Below lg the photograph becomes the hero's ground rather than a
              cell beside the copy: the shell goes absolute, a scrim gives the
              copy a contrast floor, and the copy settles on the bottom edge
              where a thumb is. From lg it is the two-column stage it has always
              been.

              Restyled in place rather than as a second `lg:hidden` block, on
              purpose — this component keeps ONE responsive tree (see the note
              on HeroSection), and a parallel block would put a second copy of
              every CTA in the DOM at every width with only CSS hiding one.

              No height of its own: `.ck-showcase-hero` already stands the
              section at 100svh minus the header, so the stage only has to grow
              into it. Setting a second height here fought that one. */}
          <div className="ck-lead-hero-stage relative flex min-w-0 flex-1 flex-col bg-[#241b14] dark:bg-[#1a1512] lg:grid lg:flex-none lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:bg-[#fdf5ed]">
            {/* Heaviest at the foot where the copy lands, lifted again at the
                top so the header stays legible over a bright frame. */}
            <div
              className="pointer-events-none absolute inset-0 z-[6] bg-[linear-gradient(to_top,rgba(20,14,9,0.93)_0%,rgba(20,14,9,0.66)_38%,rgba(20,14,9,0.12)_70%,rgba(20,14,9,0.38)_100%)] lg:hidden"
              aria-hidden
            />
            <div className="ck-hero-copy relative z-10 mt-auto flex min-w-0 flex-col px-5 pb-[calc(var(--ck-bottom-chrome,5rem)+1rem)] pt-10 sm:px-7 lg:mt-0 lg:justify-center lg:px-0 lg:pb-[clamp(2.6rem,5vh,5.5rem)] lg:pl-[clamp(0.75rem,1.2vw,1.75rem)] lg:pr-[clamp(3rem,6vw,8rem)] lg:pt-[clamp(1.2rem,2.4vh,2.5rem)]">
              {/* The flanking rules here and the heart divider below are
                  desktop ornament: on a phone the two pairs cost roughly 70px
                  of an 844px screen and say nothing. */}
              <div className="hidden items-center gap-3 text-[var(--ck-home-ink,#c54805)] lg:flex dark:text-[var(--ck-home-highlight,#f29a65)]">
                <span className="h-px w-8 bg-current opacity-55 sm:w-12" aria-hidden />
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] sm:text-xs lg:text-[clamp(0.68rem,0.78vw,0.92rem)]">
                  {t("eyebrow")}
                </p>
                <span className="h-px w-8 bg-current opacity-55 sm:w-12" aria-hidden />
              </div>

              <h1
                id="causekind-hero-title"
                className="ck-hero-headline text-[#fdf5ed] lg:mt-[clamp(0.8rem,2vh,1.65rem)] lg:text-[#100c06] dark:text-stone-50"
              >
                {/* Mobile copy wraps naturally with the bundled condensed font;
                    desktop retains the existing two-line composition. */}
                <span className="block lg:whitespace-nowrap">{t("headlineTop")}</span>
                <span className="block text-[var(--ck-home-highlight,#f0a06a)] lg:whitespace-nowrap lg:text-[var(--ck-home-ink,#c54805)] dark:text-[var(--ck-home-highlight,#ef8f54)]">
                  {t("headlineAccent")}
                </span>
              </h1>

              <div className="mt-[clamp(0.75rem,2.1vh,1.55rem)] hidden items-center gap-3 text-[var(--ck-home-ink,#c54805)] lg:flex dark:text-[var(--ck-home-highlight,#f29a65)]" aria-hidden>
                <span className="h-px w-[clamp(3.5rem,8vw,8.5rem)] bg-current opacity-55" />
                <Heart className="size-4 fill-current sm:size-5" strokeWidth={0} />
                <span className="h-px w-[clamp(3.5rem,8vw,8.5rem)] bg-current opacity-55" />
              </div>

              <p className="mt-3.5 max-w-[30ch] text-[0.95rem] font-medium leading-relaxed text-[#fdf5ed]/80 [text-wrap:pretty] lg:mt-[clamp(0.7rem,1.8vh,1.4rem)] lg:text-sm lg:text-[#34322f] dark:text-stone-300 lg:max-w-[25rem] lg:text-[clamp(0.98rem,1.2vw,1.32rem)] lg:leading-[1.55]">
                {t("subtext")}
              </p>

              <div data-guest={!user && !isRestoring ? "true" : undefined} className="ck-hero-actions mt-6 flex w-full flex-col gap-3 lg:mt-[clamp(1rem,2.6vh,2.2rem)] lg:w-max lg:flex-row lg:flex-nowrap lg:gap-3">
                {primaryAction.href ? (
                  <NewRequestLink
                    href={primaryAction.href}
                    className="ck-hero-primary-cta group relative isolate order-2 inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-transparent px-2 text-[0.84rem] font-semibold leading-tight text-[#fdf5ed]/70 shadow-none lg:order-1 lg:min-h-12 lg:bg-[var(--ck-home-accent,#b04a15)] lg:text-[0.58rem] lg:font-extrabold lg:uppercase lg:tracking-[0.035em] lg:text-white lg:shadow-[0_11px_25px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.27)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--ck-home-hover,#c45520)] hover:shadow-[0_15px_30px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.33)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a60] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf5ed] dark:focus-visible:ring-[var(--ck-home-highlight,#f29a65)] dark:focus-visible:ring-offset-[#1a1512] lg:min-h-14 lg:w-auto lg:shrink-0 lg:gap-3 lg:whitespace-nowrap lg:rounded-[0.9rem] lg:px-6 sm:text-xs sm:tracking-[0.045em]"
                  >
                    <MapPin className="ck-hero-cta-icon relative z-[1] hidden size-4 shrink-0 lg:block" strokeWidth={2} aria-hidden />
                    {!user && !isRestoring && <span aria-hidden="true" className="ck-hero-signup-prompt lg:hidden">{t.has("givingPrompt") ? t("givingPrompt") : "Have something to give?"}</span>}
                    <span className="relative z-[1] min-w-0 text-center">{primaryAction.label}</span>
                    <ArrowRight className="ck-hero-action-arrow relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden />
                  </NewRequestLink>
                ) : (
                  <span
                    aria-hidden
                    className="ck-hero-auth-placeholder inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-[var(--ck-home-accent,#b04a15)]/70 px-2 text-[0.58rem] font-extrabold uppercase leading-tight tracking-[0.035em] text-white/80 lg:min-h-14 lg:w-auto lg:shrink-0 lg:gap-3 lg:whitespace-nowrap lg:rounded-[0.9rem] lg:px-6 sm:text-xs sm:tracking-[0.045em]"
                  >
                    <MapPin className="size-4 shrink-0 sm:size-5" />
                    <span className="min-w-0 text-center">{primaryAction.label}</span>
                    <ArrowRight className="ck-hero-action-arrow size-4 shrink-0 sm:size-5" />
                  </span>
                )}

                <Link
                  href="/requests"
                  className="ck-hero-secondary-cta group relative isolate order-1 inline-flex min-h-14 min-w-0 w-full items-center justify-center gap-1.5 rounded-[0.8rem] bg-[#fdf5ed] px-5 text-[0.95rem] font-extrabold leading-tight text-[#1a130d] shadow-none lg:order-2 lg:min-h-12 lg:bg-transparent lg:px-2 lg:text-[0.56rem] lg:uppercase lg:tracking-[0.02em] lg:text-[var(--ck-home-ink,#b04a15)] lg:shadow-[inset_0_0_0_1.5px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.62)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/55 hover:shadow-[inset_0_0_0_1.5px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.82),0_10px_22px_rgba(var(--ck-home-shadow-rgb,176,74,21),0.11)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#b04a15)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf5ed] dark:text-[var(--ck-home-ink,#e07b3a)] dark:hover:bg-white/5 dark:focus-visible:ring-offset-[#1a1512] lg:min-h-14 lg:w-auto lg:shrink-0 lg:gap-3 lg:whitespace-nowrap lg:rounded-[0.9rem] lg:px-6 lg:text-xs lg:tracking-[0.04em]"
                >
                  <UsersRound className="ck-hero-cta-icon relative z-[1] hidden size-4 shrink-0 lg:block" strokeWidth={2} aria-hidden />
                  <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                  <ArrowRight className="ck-hero-action-arrow relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden />
                </Link>
              </div>
              <div className="ck-mobile-hero-trust lg:hidden">
                <TrustBand />
              </div>
            </div>

            <div className="ck-hero-photo-shell absolute inset-0 z-0 min-w-0 lg:relative lg:inset-auto lg:min-h-[clamp(10.5rem,24vh,14rem)]">
              <div className="ck-hero-photo-clip absolute inset-0 overflow-hidden bg-[var(--ck-home-highlight,#e9c69d)]">
                <picture>
                <source media="(max-width: 1023px)" srcSet="/images/causekind-mobile-hero-v1.webp" />
                <Image
                  src={HERO_IMAGE}
                  alt={t("photoAlt")}
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, (max-width: 1919px) 62vw, 1180px"
                  className="ck-hero-photo-image object-cover object-center"
                />
                </picture>
                <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[12%] bg-gradient-to-r from-[#fdf5ed]/65 to-transparent lg:block dark:from-[#1a1512]/78" aria-hidden />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[17%] bg-gradient-to-t from-[var(--ck-home-deep,#5d2608)]/18 to-transparent" aria-hidden />
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

            {/* Melts the hero's bottom edge into the section below it, so the
                photograph and the cream read as one surface rather than two
                stacked blocks with a cut between them. Mobile only — on desktop
                the hero already ends on cream.

                Markup rather than a `::after` on the hero: that was tried, it
                computed correctly and never painted, buried under one of the
                hero's own opaque layers. A real element can be proven to be on
                top. Its height keeps it clear of the trust band — see the note
                in styles.css for why that matters. */}
            <div className="ck-hero-seam-fade pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:hidden" aria-hidden />
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
