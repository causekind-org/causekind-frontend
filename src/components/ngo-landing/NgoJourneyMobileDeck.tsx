"use client";

import React from "react";
import Image from "next/image";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";
import m from "@/components/home/TrustSafetyMobile.module.css";

export type JourneyDeckStep = { title: string; desc: string; photo: string; alt: string; objectPosition?: string };

/**
 * Phones (< 768px): the drive journey as the donor landing's Trust & safety deck
 * (same classes, sticky stacking and reveal). Each card: step tab, photo, title once, text.
 */
export function NgoJourneyMobileDeck({ steps, label }: { steps: readonly JourneyDeckStep[]; label: string }) {
  const ref = useRevealOnce<HTMLOListElement>();
  const total = String(steps.length).padStart(2, "0");
  return (
    <ol ref={ref} className={`${m.stack} min-[861px]:!hidden`} aria-label={label} data-testid="ngo-journey-deck">
      {steps.map((step, idx) => (
        <li key={step.title} className={m.slot}
          style={{ ["--k" as string]: idx, ["--role" as string]: "#1F6B3F" } as React.CSSProperties}>
          <article data-reveal-item style={stagger(idx)} className={m.card}>
            <header className={m.head}>
              <span className={m.headIcon} aria-hidden="true">{idx + 1}</span>
              <span className={m.headLabel}>STEP {idx + 1}</span>
              <span className={m.headNum} aria-hidden="true">{String(idx + 1).padStart(2, "0")}</span>
            </header>
            <div className={m.body}>
              <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image src={step.photo} alt={step.alt} fill sizes="100vw" className="object-cover"
                  style={{ objectPosition: step.objectPosition }} loading="lazy" />
              </div>
              <h3 className={m.cardTitle}>{step.title}</h3>
              <p className={`${m.point} mt-1.5`}>{step.desc}</p>
            </div>
            <footer className={m.foot}>
              <span className={m.footLabel}>Drive journey</span>
              <span className={m.footIndex}>{String(idx + 1).padStart(2, "0")} / {total}</span>
            </footer>
          </article>
        </li>
      ))}
    </ol>
  );
}
