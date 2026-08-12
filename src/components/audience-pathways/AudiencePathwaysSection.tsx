"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Gift, PackageOpen, HandHeart, Boxes, Truck,
  HeartHandshake, Home, Users, ShieldCheck, Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import AudiencePathwayPanel from "./AudiencePathwayPanel";

// WebGL touches `window`, so it cannot server-render. `ssr: false` also keeps
// `ogl` out of the initial bundle — same pattern as HandoverMapPinField.
const LightRays = dynamic(() => import("@/components/LightRays"), { ssr: false });

/**
 * The two-audience introduction: who CauseKind is for, and the one click that
 * puts you on the right side of it.
 *
 * Both panels are fully visible at rest — this is not an accordion or a
 * carousel. Emphasis only shifts once a visitor expresses interest by hovering
 * or tabbing, and returns to balanced the moment they stop.
 *
 * `useInView` on the section is threaded down into both scenes so the orbits,
 * floats and scan lines stop entirely when the section scrolls away. On a long
 * landing page that is the difference between two permanent compositor loops
 * and none.
 */
export default function AudiencePathwaysSection() {
  const t = useTranslations("audiencePathways");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  const reduceMotion = useReducedMotion();

  // null = balanced. Both panels equal, which is the state the section loads in.
  const [focused, setFocused] = useState<"donor" | "donee" | null>(null);

  // Detected in an effect, never during render — `matchMedia` does not exist on
  // the server, and reading it while rendering would desync hydration.
  const [spotlightEnabled, setSpotlightEnabled] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setSpotlightEnabled(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSpotlightEnabled(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const panels = [
    {
      tone: "donor" as const,
      eyebrow: t("donor.eyebrow"),
      heading: t("donor.heading"),
      body: t("donor.body"),
      cta: t("donor.cta"),
      // The signup route is /register, and ?role= preselects the picker there.
      href: "/register?role=DONOR",
      Icon: Gift,
      orbitIcons: [PackageOpen, Boxes, Truck, HandHeart],
    },
    {
      tone: "donee" as const,
      eyebrow: t("donee.eyebrow"),
      heading: t("donee.heading"),
      body: t("donee.body"),
      cta: t("donee.cta"),
      href: "/register?role=DONEE",
      Icon: HeartHandshake,
      orbitIcons: [Home, Users, ShieldCheck, Sparkles],
    },
  ];

  return (
    <section
      ref={ref}
      aria-labelledby="audience-pathways-heading"
      className="relative w-full overflow-hidden bg-[#f7f4f0] py-9 sm:py-12 dark:bg-zinc-950"
    >
      {/* Light rays, behind everything.
          `absolute inset-0` rather than the documented fixed-height wrapper —
          this section is deliberately compact and a 600px block would undo that.

          `multiply` because the ground is cream. The shader inverts its output
          in that mode (white where there is no ray), so multiply tints only the
          shafts instead of painting the section black around them. */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#ff7700"
        raysSpeed={1.2}
        lightSpread={1.5}
        rayLength={1.2}
        followMouse
        mouseInfluence={0.5}
        noiseAmount={0.1}
        distortion={0.05}
        pulsating
        fadeDistance={2}
        saturation={1.5}
        blendMode="multiply"
        opacity={0.5}
        className="z-0"
      />

      {/* Section-level ambience. Decorative, and the only thing bridging the two
          palettes so the shell still reads as one product rather than two. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 30%, rgb(176 74 21 / 0.07) 0%, transparent 60%)," +
            "radial-gradient(60% 50% at 80% 70%, rgb(13 148 136 / 0.07) 0%, transparent 60%)",
        }}
      />

      {/* Spotlight scrim.
          Hovering a panel darkens and blurs *everything else in the section* —
          the heading, the copy, the footnote, the other panel — leaving the
          chosen side lit. This is a sibling of the content rather than a child
          of it so that the active panel can raise itself above it (z-30 vs
          z-20); the content wrapper below deliberately carries no z-index,
          because giving it one would create a stacking context and trap its
          children underneath this layer.

          Only on a fine pointer. On touch there is no hover, and the CTA taking
          focus on tap would black out the whole section a beat before
          navigating away — alarming, and pointing at nothing. */}
      {spotlightEnabled && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-black backdrop-blur-[3px]"
          initial={false}
          animate={{ opacity: focused ? 0.72 : 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-[var(--ck-role-accent)]">
            {t("eyebrow")}
          </p>
          <h2
            id="audience-pathways-heading"
            className="mt-1.5 text-[clamp(1.3rem,1.1rem+1vw,1.85rem)] font-bold leading-tight text-stone-900 dark:text-stone-50"
          >
            {t("heading")}
          </h2>
          <p className="mt-2 text-[clamp(0.85rem,0.83rem+0.12vw,0.95rem)] leading-relaxed text-stone-600 dark:text-stone-300">
            {t("subheading")}
          </p>
        </motion.div>

        {/* Stacks on mobile, side by side from md. Both panels keep equal width —
            the active one grows by 1.5% scale, not by taking the other's space,
            so nothing reflows and there is no layout shift on hover. */}
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:gap-4">
          {panels.map((p) => (
            <AudiencePathwayPanel
              key={p.tone}
              {...p}
              active={focused === p.tone}
              dimmed={focused !== null && focused !== p.tone}
              // Lifted above the scrim so it stays lit while the rest darkens.
              spotlit={spotlightEnabled && focused === p.tone}
              inView={inView}
              onActivate={() => setFocused(p.tone)}
              onDeactivate={() => setFocused(null)}
            />
          ))}
        </div>

        <p className="mt-3.5 text-center text-xs text-stone-500 dark:text-stone-400">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}
