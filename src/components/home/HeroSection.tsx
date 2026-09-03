"use client";

import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  HeartHandshake,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";

import { CategoryStrip } from "@/components/home/CategoryStrip";
import { TrustBand } from "@/components/home/TrustBand";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving } from "@/lib/postAuthDestination";

const HERO_IMAGE = "/images/causekind-hero-warm-v2.webp";

/**
 * Turns the second action into the shortest useful next step for the person who
 * is actually looking at it. During auth hydration the button keeps its space
 * but cannot be clicked, so a registration link never flashes for signed-in
 * people.
 */
function useSecondaryAction() {
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

/**
 * The two callouts from the reference: a useful item on one side, a verified
 * need on the other, each pinned to the photograph under a dashed ring.
 *
 * <p>Both are positioned inside the **photo column**, not the stage, and both
 * stay inside its left 45%. That is deliberate. The previous attempt placed
 * them as percentages of a stage whose height and width both move, and a gap
 * that was clear at 1440 collided at 1280. Bounding them to one column and one
 * half of it makes the separation structural rather than something that has to
 * be re-tuned per breakpoint.
 *
 * <p>Below `lg` the two-pin composition has nowhere to go, so the same two
 * labels collapse into the single stacked card the hero used before.
 */
function ConnectionPins() {
  const t = useTranslations("hero");

  const item = {
    Icon: PackageOpen,
    lead: t("connectionItemLead"),
    rest: t("connectionItemRest"),
    chip: "bg-[#f8eee7] text-[#b04a15] dark:bg-[#b04a15]/18 dark:text-[#e98d55]",
    text: "text-[#a34417] dark:text-[#f1a475]",
  };
  const need = {
    Icon: HeartHandshake,
    lead: t("connectionNeedLead"),
    rest: t("connectionNeedRest"),
    chip: "bg-[#edf2f7] text-[#1e3a60] dark:bg-[#1e3a60]/35 dark:text-[#8db1da]",
    text: "text-[#1e3a60] dark:text-[#a9c5e4]",
  };

  return (
    <>
      {/* Phones and tablets: one card, both labels, under the photograph. */}
      <motion.div
        className="absolute -bottom-5 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-[21rem] -translate-x-1/2 items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_10px_28px_rgba(73,42,20,0.16)] dark:bg-stone-900 dark:text-stone-100 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_28px_rgba(0,0,0,0.28)] lg:hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 82, damping: 19, delay: 0.34 }}
        aria-label={t("connectionLabel")}
      >
        {[item, need].map(({ Icon, lead, rest, chip, text }, index) => (
          <Fragment key={lead}>
            {index > 0 ? (
              <ArrowRight className="size-5 shrink-0 text-[#b04a15]" strokeWidth={1.7} aria-hidden />
            ) : null}
            <span className="flex items-center gap-2">
              <span className={`flex size-9 items-center justify-center rounded-full ${chip}`}>
                <Icon className="size-4.5" strokeWidth={1.7} aria-hidden />
              </span>
              <span className={`font-semibold leading-tight ${text}`}>
                {lead} {rest}
              </span>
            </span>
          </Fragment>
        ))}
      </motion.div>

      {/* Desktop: the reference composition — a filled marker overlapping the
          top-left corner of a plain white card, its first line in terra and the
          rest in ink. No icon inside the card: the reference has none, and the
          marker already says "here". */}
      <div
        className="pointer-events-none absolute inset-0 z-20 hidden lg:block"
        aria-label={t("connectionLabel")}
        role="group"
      >
        {[
          { ...item, pos: "left-[25%] top-[17%]", ring: "-left-7 -top-6" },
          // A top percentage on both, and they can only ever converge
          // vertically — they are on opposite sides of the column, so the
          // separation that matters is horizontal and does not move with the
          // stage height.
          { ...need, pos: "right-[6%] top-[35%]", ring: "-right-7 -bottom-6" },
        ].map(({ lead, rest, pos, ring }) => (
          <motion.div
            key={lead}
            // Narrow on purpose. In the reference the label WRAPS — "Something
            // Useful" and "Nearby Needs It" each break over two lines — so the
            // card is sized so the lead holds one line and the rest breaks
            // between its two words, and it grows downwards. A
            // long translation adds lines rather than width, which is why the
            // paragraphs below break anywhere.
            className={`absolute w-[6.25rem] ${pos}`}
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 82, damping: 19, delay: 0.34 }}
          >
            <span
              className={`absolute size-[9.5rem] rounded-full border border-dashed border-[#b04a15]/30 dark:border-[#ee9b69]/25 ${ring}`}
              aria-hidden
            />

            <div className="relative rounded-[0.85rem] bg-white px-3 pb-2.5 pt-3 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_10px_26px_rgba(73,42,20,0.16)] dark:bg-stone-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_26px_rgba(0,0,0,0.3)]">
              {/* Drawn rather than lucide’s MapPin: the reference marker is a
                  solid terra teardrop with a punched-out dot, and filling the
                  lucide path fills the hole too. */}
              <svg
                viewBox="0 0 24 24"
                className="absolute -top-6 left-[22%] size-8 drop-shadow-[0_3px_6px_rgba(176,74,21,0.32)]"
                aria-hidden
              >
                <path
                  d="M12 22.5s7.2-6.6 7.2-12.4a7.2 7.2 0 1 0-14.4 0C4.8 15.9 12 22.5 12 22.5Z"
                  fill="#b04a15"
                />
                <circle cx="12" cy="9.8" r="2.7" fill="#fff" />
              </svg>

              <p className="text-[0.82rem] font-extrabold leading-[1.22] text-[#b04a15] [overflow-wrap:anywhere] dark:text-[#f1a475]">
                {lead}
              </p>
              <p className="mt-0.5 text-[0.82rem] font-bold leading-[1.22] text-stone-800 [overflow-wrap:anywhere] dark:text-stone-200">
                {rest}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

/**
 * The two assurances, in the copy column rather than floating on the
 * photograph.
 *
 * <p>It reads in the same downward pass as the headline and the buttons, and it
 * cannot collide with anything — which the floating card managed twice. It also
 * gives the photograph back: nothing of ours sits on it now.
 */
function AssuranceList() {
  const t = useTranslations("hero");
  const assurances = [
    {
      Icon: ShieldCheck,
      title: t("assuranceVerifiedTitle"),
      body: t("assuranceVerifiedBody"),
    },
    {
      Icon: Check,
      title: t("assuranceHandoverTitle"),
      body: t("assuranceHandoverBody"),
    },
  ];

  return (
    <ul aria-label={t("assuranceLabel")} className="flex list-none flex-col gap-3">
      {assurances.map(({ Icon, title, body }) => (
        <li key={title} className="flex items-start gap-[11px]">
          <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#f8eee7] text-[#b04a15] dark:bg-[#b04a15]/18 dark:text-[#e98d55]">
            <Icon className="size-[15px]" strokeWidth={1.8} aria-hidden />
          </span>
          <span className="block pt-px">
            <span className="block text-sm font-bold leading-tight">{title}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              {body}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The shared, responsive homepage front door.
 *
 * One DOM tree serves every viewport so the tour anchor, CTA logic and image
 * cannot drift between separate desktop/mobile versions. The category registry
 * remains the source of truth; this component only composes the pieces.
 */
export function HeroSection() {
  const t = useTranslations("hero");
  const secondaryAction = useSecondaryAction();

  return (
    <MotionConfig reducedMotion="user">
      <section
        data-tour="guest-hero"
        aria-labelledby="causekind-hero-title"
        className="relative isolate overflow-hidden bg-[#f7f1e7] px-4 pb-9 pt-4 text-[#171714] dark:bg-[#15110f] dark:text-stone-100 sm:px-6 sm:pb-11 sm:pt-6 lg:px-10 lg:pb-10 lg:pt-5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 13% 16%, rgba(224,123,58,0.13), transparent 24%), radial-gradient(circle at 88% 8%, rgba(255,255,255,0.72), transparent 23%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1440px]">
          <div className="ck-lead-hero-stage relative grid overflow-hidden rounded-[1.75rem] bg-[#f8f2e8] shadow-[0_0_0_1px_rgba(63,39,23,0.06),0_24px_70px_rgba(105,62,30,0.09)] dark:bg-[#1a1512] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.28)] lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div className="relative z-10 flex flex-col justify-center px-6 pb-8 pt-9 sm:px-9 sm:pb-10 sm:pt-11 lg:px-[clamp(2.5rem,4vw,4.5rem)] lg:py-[clamp(2rem,4vh,4rem)]">
              <motion.p
                className="text-[0.65rem] font-bold uppercase tracking-[0.21em] text-[#a84417] sm:text-xs dark:text-[#ef9a67]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, ease: [0.2, 0, 0, 1] }}
              >
                {t("eyebrow")}
              </motion.p>

              <motion.h1
                id="causekind-hero-title"
                className="font-hero-display mt-4 max-w-[11ch] text-[clamp(2.65rem,11.8vw,4rem)] font-bold leading-[0.96] tracking-[-0.045em] [text-wrap:balance] sm:max-w-[13ch] lg:mt-5 lg:max-w-[11.5ch] lg:text-[clamp(3.25rem,4.45vw,5rem)]"
                initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.52, ease: [0.2, 0, 0, 1], delay: 0.05 }}
              >
                {t("headline")}
                <span className="text-[#b04a15]" aria-hidden>
                  .
                </span>
              </motion.h1>

              <motion.p
                className="mt-5 max-w-[34rem] text-sm font-medium leading-relaxed text-stone-600 [text-wrap:pretty] dark:text-stone-300 sm:text-base lg:mt-6 lg:text-[1.02rem]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: [0.2, 0, 0, 1], delay: 0.13 }}
              >
                {t("subtext")}
              </motion.p>

              <motion.div
                className="mt-[22px]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: [0.2, 0, 0, 1], delay: 0.18 }}
              >
                <AssuranceList />
              </motion.div>

              <motion.div
                className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:mt-7"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: [0.2, 0, 0, 1], delay: 0.21 }}
              >
                <Link
                  href="/requests"
                  className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#b04a15] pl-5 pr-[1.125rem] text-xs font-bold uppercase tracking-[0.06em] text-white shadow-[0_10px_24px_rgba(176,74,21,0.22)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#963c0d] hover:shadow-[0_14px_28px_rgba(176,74,21,0.26)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a60] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f2e8] dark:focus-visible:ring-[#ef9a67] dark:focus-visible:ring-offset-[#1a1512] sm:min-h-13"
                >
                  {t("ctaBrowse")}
                  <ArrowRight className="size-4.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
                </Link>

                {secondaryAction.href ? (
                  <Link
                    href={secondaryAction.href}
                    className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl pl-5 pr-[1.125rem] text-xs font-bold uppercase tracking-[0.06em] text-[#1e3a60] shadow-[inset_0_0_0_1.5px_#1e3a60] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/65 hover:shadow-[inset_0_0_0_1.5px_#1e3a60,0_10px_22px_rgba(30,58,96,0.1)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f2e8] dark:text-[#a9c5e4] dark:shadow-[inset_0_0_0_1.5px_#759bc7] dark:hover:bg-white/5 dark:focus-visible:ring-offset-[#1a1512] sm:min-h-13"
                  >
                    {secondaryAction.label}
                    <ArrowRight className="size-4.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-5 text-xs font-bold uppercase tracking-[0.06em] text-[#1e3a60]/55 shadow-[inset_0_0_0_1px_rgba(30,58,96,0.28)] dark:text-[#a9c5e4]/55 dark:shadow-[inset_0_0_0_1px_rgba(117,155,199,0.3)] sm:min-h-13"
                  >
                    {secondaryAction.label}
                    <ArrowRight className="size-4.5" aria-hidden />
                  </span>
                )}
              </motion.div>
            </div>

            <div className="relative min-h-[19.5rem] overflow-visible sm:min-h-[23rem] lg:min-h-0">
              <Image
                src={HERO_IMAGE}
                alt={t("photoAlt")}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, (max-width: 1535px) 56vw, 806px"
                // The subject sits at ~72% across the source, and the crop is
                // narrower than the source, so object-position picks which slice
                // shows. **A LOWER percentage moves her RIGHT in the frame**, not
                // left: it slides the crop window leftwards while she stays put.
                // I got that backwards once — 80% pushed her to the far edge.
                // 100% (object-right) lands her dead centre; 90% is centre and a
                // little right, which is what was asked for, and it leaves the
                // plain sunlit wall free on the left for the message popups.
                className="object-cover object-[90%_center]"
              />
              {/* The reference has no hard edge on the photograph — it dissolves
                  into the ground on every side. Overlay gradients rather than a
                  mask: the stage colour is a known solid, and fading two axes
                  with mask-image needs mask-composite for no gain here. */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-[22%] bg-gradient-to-r from-[#f8f2e8] to-transparent lg:block dark:from-[#1a1512]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 hidden h-[16%] bg-gradient-to-b from-[#f8f2e8] to-transparent lg:block dark:from-[#1a1512]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[16%] bg-gradient-to-t from-[#f8f2e8] to-transparent lg:block dark:from-[#1a1512]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-[10%] bg-gradient-to-l from-[#f8f2e8] to-transparent lg:block dark:from-[#1a1512]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/12 to-transparent lg:hidden"
                aria-hidden
              />
              <ConnectionPins />
            </div>
          </div>

          <div className="relative z-30 -mt-1 pt-7 lg:-mt-7 lg:pt-0">
            <CategoryStrip />
          </div>

          <div className="relative z-20 mt-3.5 lg:mt-4">
            <TrustBand />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
