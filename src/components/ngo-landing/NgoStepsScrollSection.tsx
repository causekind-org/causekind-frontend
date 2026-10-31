"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { NgoSectionHeader } from "./NgoSharedComponents";

const IMG = "/images/ngo-landing/";
export const NGO_STEPS = [
  { title: "Register", desc: "Create your NGO account with your organisation email.", photo: "ngo-classroom-notebooks-landscape.webp", ratio: "16 / 9",
    alt: "A teacher handing notebooks to children seated on a mat in a village classroom", caption: "Your work, on CauseKind" },
  { title: "Get verified", desc: "Submit your documents. A real person reviews them.", photo: "ngo-children-school-bags-portrait.webp", ratio: "4 / 5",
    alt: "Village children smiling with their new school bags", caption: "Verified NGOs earn donor trust" },
  { title: "Create drives", desc: "Post exactly what you need, how many, and by when.", photo: "ngo-winter-blankets-elderly-landscape.webp", ratio: "3 / 2",
    alt: "Volunteers giving warm blankets to elderly villagers seated on charpais", caption: "A blanket drive for elders" },
  { title: "Match donors", desc: "Donors nearby offer the items your drive needs.", photo: "ngo-clothes-toys-doorstep-portrait.webp", ratio: "4 / 5",
    alt: "A volunteer handing a box of folded clothes and a teddy bear to a woman at her door", caption: "Clothes and toys from a donor" },
  { title: "Receive support", desc: "Confirm what arrived and share proof of the handover.", photo: "ngo-ration-distribution-landscape.webp", ratio: "3 / 2",
    alt: "Volunteers handing a grain sack and ration box to villagers waiting in line", caption: "Rations reach families" },
] as const;

function StepPhoto({ step, sizes }: { step: (typeof NGO_STEPS)[number]; sizes: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[24px] border border-white/20 bg-black/30 shadow-2xl" style={{ aspectRatio: step.ratio }}>
      <Image src={IMG + step.photo} alt={step.alt} fill sizes={sizes} className="object-cover" loading="lazy" />
      <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">{step.caption}</span>
    </div>
  );
}

/** Unverified landing: "From registration to receiving support". Desktop: steps reveal on scroll while a sticky photo
 *  follows the active step and a progress line fills. Mobile and reduced motion: plain stacked steps, each with its photo. */
export function NgoStepsScrollSection() {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const animated = !reduce;

  return (
    <section className="ngo-section ngo-band-dark" data-testid="ngo-steps">
      <div className="ngo-container">
        <NgoSectionHeader eyebrow="How CauseKind works" h2="From registration to receiving support." isDark />
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          <ol ref={listRef} className="relative lg:col-span-6">
            <span className="absolute bottom-6 left-6 top-6 w-[3px] rounded-full bg-white/15" aria-hidden />
            <motion.span className="absolute left-6 top-6 w-[3px] origin-top rounded-full bg-[#D9A441]" aria-hidden
              style={{ bottom: 24, scaleY: animated ? fill : 1 }} data-testid="ngo-steps-progress" />
            {NGO_STEPS.map((step, i) => (
              <motion.li key={step.title} data-testid="ngo-step"
                initial={animated ? { opacity: 0, y: 40 } : false}
                whileInView={animated ? { opacity: 1, y: 0 } : undefined}
                viewport={{ amount: 0.6, once: false }}
                onViewportEnter={() => setActive(i)}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className={`relative flex gap-6 pb-10 ${animated ? "lg:min-h-[52vh]" : ""}`}>
                <span className={`ngo-step-bubble relative z-10 shrink-0 transition-transform duration-300 ${animated && active === i ? "scale-110" : ""}`}>{i + 1}</span>
                <div className="min-w-0 flex-1 pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#D9A441]">Step {i + 1}</span>
                  <h3 className="ngo-heading text-3xl text-white sm:text-4xl">{step.title}</h3>
                  <p className="mt-2 max-w-md text-base text-[#EFEADB]/85">{step.desc}</p>
                  <div className={`mt-5 max-w-md ${animated ? "lg:hidden" : ""}`}><StepPhoto step={step} sizes="(max-width: 1024px) 90vw, 448px" /></div>
                </div>
              </motion.li>
            ))}
          </ol>
          {animated && (
            <div className="sticky top-28 hidden lg:col-span-6 lg:block" aria-hidden>
              <div className="relative flex h-[520px] items-center justify-center">
                {NGO_STEPS.map((step, i) => (
                  <motion.div key={step.title} className="absolute inset-x-0 flex justify-center"
                    animate={{ opacity: active === i ? 1 : 0, scale: active === i ? 1 : 0.96 }} transition={{ duration: 0.45 }}>
                    <div style={{ width: step.ratio === "4 / 5" ? "68%" : "100%" }}><StepPhoto step={step} sizes="560px" /></div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
