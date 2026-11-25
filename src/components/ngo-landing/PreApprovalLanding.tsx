"use client";

import Image from "next/image";

import React from "react";
import {
  Eye, Handshake, Repeat, Users, Megaphone, HeartHandshake, ShieldCheck,
  FileText, CreditCard, Award, MapPin, IdCard, ScrollText,
} from "lucide-react";
import { NgoStepsScrollSection } from "./NgoStepsScrollSection";
import type { NgoStatusData } from "./useNgoStatus";
import { NgoHeroRedesign } from "./NgoHeroRedesign";
import { NgoCard, NgoSectionHeader, NgoMarquee, NgoFinalCtaBand } from "./NgoSharedComponents";
import { RevealGroup, SwipeRow, NgoStackCards, NgoPhotoPanel } from "./NgoMotion";
import { ArchPhoto, FadeUp, GlassPhotoCard, IconBubble, IMG } from "./NgoShowcase";

const WHY_JOIN = [
  { n: "01", title: "Better visibility", body: "Get your cause in front of donors actively looking to help.", Icon: Eye },
  { n: "02", title: "Trusted connections", body: "Verified status shows donors you are the real thing.", Icon: Handshake },
  { n: "03", title: "Transparent giving", body: "Every offer and delivery is tracked from start to finish.", Icon: Repeat },
];

const REGISTRATION = [
  { n: "1", title: "Create an account", body: "Sign up with your organisation email." },
  { n: "2", title: "Add organisation details", body: "Name, mission, location and contact person." },
  { n: "3", title: "Submit for review", body: "Upload documents and send your application." },
];

const DOCUMENTS = [
  { title: "Registration certificate", body: "Trust, society or Section 8 proof.", Icon: ScrollText },
  { title: "PAN of the organisation", body: "Tax identity document.", Icon: CreditCard },
  { title: "12A / 80G certificates", body: "If your NGO holds them.", Icon: Award },
  { title: "Address proof", body: "Office or premises proof.", Icon: MapPin },
  { title: "Authorised person ID", body: "Government ID of your representative.", Icon: IdCard },
  { title: "Mission and activities", body: "A short description of your work.", Icon: FileText },
];

export function PreApprovalLanding({ status }: { status: NgoStatusData }) {
  const registerHref = status.wizardHref || "/profile/ngo-details";

  return (
    <div className="w-full flex flex-col overflow-x-clip">
      {/* 1. HERO */}
      <NgoHeroRedesign status={status} />

      {/* 2. MARQUEE CHIPS */}
      <NgoMarquee />

      {/* 3. WHY JOIN: arch photo collage + feature list */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <FadeUp className="relative mx-auto w-full max-w-[460px] lg:col-span-5">
            <div className="ngo-blob -left-10 -top-8 h-56 w-56" aria-hidden />
            <div className="ngo-ring -right-6 bottom-10 h-40 w-40" aria-hidden />
            <ArchPhoto src={IMG + "ngo-school-supplies-girl-portrait.webp"} alt="A volunteer handing notebooks and a pencil box to a smiling schoolgirl"
              className="aspect-[4/5] w-[82%]" />
            <div className="absolute -bottom-8 right-0 w-[48%] overflow-hidden rounded-[28px] border-[6px] border-[var(--ngo-bg)] shadow-2xl">
              <ArchPhoto src={IMG + "ngo-children-school-bags-portrait.webp"} alt="Village children smiling with their new school bags"
                className="aspect-square !rounded-none !shadow-none" sizes="240px" />
            </div>
            <span className="absolute left-4 top-[58%] inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ngo-gold)] text-[var(--ngo-darkest)] shadow-xl" aria-hidden>
              <ShieldCheck className="h-8 w-8" />
            </span>
          </FadeUp>

          <div className="lg:col-span-7">
            <NgoSectionHeader eyebrow="Why join CauseKind" h2="Visibility, trust and transparency, built in." className="!mb-10" />
            <SwipeRow label="Why join CauseKind" className="flex flex-col gap-4" stack>
              {WHY_JOIN.map(({ n, title, body, Icon }) => (
                <div key={n} className="ngo-card ngo-card-interactive !flex-row items-center gap-5 !p-6 md:!p-7">
                  <IconBubble><Icon className="h-6 w-6" strokeWidth={1.8} /></IconBubble>
                  <div className="min-w-0 flex-1">
                    <h3 className="ngo-heading text-2xl md:text-[28px]">{title}</h3>
                    <p className="mt-1 text-[15px] opacity-75 md:text-base">{body}</p>
                  </div>
                  <span className="ngo-heading hidden text-5xl text-[var(--ngo-accent)] opacity-25 sm:block">{n}</span>
                </div>
              ))}
            </SwipeRow>
          </div>
        </div>
      </section>

      {/* 4. HOW CAUSEKIND WORKS (scroll-driven steps) */}
      <NgoStepsScrollSection />

      {/* 5. CHALLENGES: bento mosaic of photo and colour tiles */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader eyebrow="The challenges NGOs face" h2="Doing good is hard enough." />
          <SwipeRow label="The challenges NGOs face" className="ngo-bento" reveal={false}>
            <GlassPhotoCard src={IMG + "ngo-winter-blankets-elderly-landscape.webp"} alt="Volunteers giving warm blankets to elderly villagers seated on charpais"
              className="h-full" sizes="(max-width: 768px) 100vw, 480px">
              <span className="ngo-tile-tag">Resources</span>
              <h3 className="ngo-heading mt-2 text-3xl md:text-4xl">Limited resources</h3>
              <p className="mt-1 text-[15px] text-white/85">Small teams stretch to cover every need.</p>
            </GlassPhotoCard>
            <div className="ngo-tile ngo-tile-deep h-full">
              <div className="flex items-center justify-between">
                <span className="ngo-tile-tag text-[var(--ngo-gold-light)]">Reach</span>
                <IconBubble tone="dark"><Megaphone className="h-6 w-6" strokeWidth={1.8} /></IconBubble>
              </div>
              <div>
                <h3 className="ngo-tile-title">Low visibility</h3>
                <p className="mt-2 max-w-sm text-[#EFEADB]/80">Great work often goes unseen.</p>
              </div>
            </div>
            <div className="ngo-tile ngo-tile-gold h-full">
              <span className="ngo-tile-tag">Donors</span>
              <div>
                <Users className="mb-3 h-8 w-8" strokeWidth={1.8} aria-hidden />
                <h3 className="ngo-heading text-[28px] leading-tight">Finding donors</h3>
                <p className="mt-1 text-[15px] opacity-80">Reaching the right givers takes time.</p>
              </div>
            </div>
            <div className="ngo-tile ngo-tile-card h-full">
              <div className="flex items-center justify-between">
                <span className="ngo-tile-tag">Trust</span>
                <IconBubble><HeartHandshake className="h-6 w-6" strokeWidth={1.8} /></IconBubble>
              </div>
              <div>
                <h3 className="ngo-heading text-[28px] leading-tight">Proving credibility</h3>
                <p className="mt-1 text-[15px] opacity-75">Donors need confidence before they give.</p>
              </div>
            </div>
          </SwipeRow>
        </div>
      </section>

      {/* 6. REGISTRATION PROCESS: dashed timeline */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <NgoSectionHeader eyebrow="NGO registration process" h2="Create your account in minutes." align="center" />
          <SwipeRow label="NGO registration process" className="ngo-timeline">
            {REGISTRATION.map((s) => (
              <div key={s.n} className="flex h-full flex-col items-center text-center">
                <span className="ngo-timeline-dot">{s.n}</span>
                <div className="ngo-card mt-8 w-full flex-1 items-center justify-center !p-8">
                  <h3 className="ngo-heading text-2xl md:text-[28px]">{s.title}</h3>
                  <p className="mt-2 opacity-75">{s.body}</p>
                </div>
              </div>
            ))}
          </SwipeRow>
        </div>
      </section>

      {/* 7. VERIFICATION STEPS: sticky heading + photo, stacking cards */}
      <section className="ngo-section ngo-band-dark">
        <div className="ngo-container grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <NgoSectionHeader eyebrow="Verification steps" h2="Four checks. One trusted badge." isDark className="!mb-8" />
              <FadeUp>
                <ArchPhoto src={IMG + "ngo-ration-distribution-landscape.webp"} alt="Volunteers handing a grain sack and ration box to villagers waiting in line"
                  className="aspect-[4/5] w-full max-w-[380px] max-lg:hidden" sizes="380px" />
              </FadeUp>
            </div>
          </div>
          <div className="lg:col-span-7">
            <NgoStackCards label="Verification steps">
              <NgoCard number="1" title="Document submission" body="Upload your registration papers." isDarkBand className="ngo-stack-card" />
              <NgoCard number="2" title="Legal checks" body="We confirm your legal standing." isDarkBand className="ngo-stack-card" />
              <NgoCard number="3" title="AI screening" body="Automated checks flag inconsistencies." isDarkBand className="ngo-stack-card" />
              <NgoCard number="4" title="Team review" body="A person reviews and decides." isDarkBand className="ngo-stack-card" />
            </NgoStackCards>
          </div>
        </div>
      </section>

      {/* 8. DOCUMENTS REQUIRED: photo + checklist */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <NgoSectionHeader eyebrow="Documents required" h2="Keep these ready." className="!mb-8" />
            {/* A plain photo (the ArchPhoto here collapsed to 0 height, leaving an empty card and a big blob). */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] shadow-2xl">
              <Image src={IMG + "ngo-classroom-notebooks-landscape.webp"} alt="A teacher handing notebooks to children seated on a mat in a village classroom"
                fill sizes="(max-width: 1024px) 90vw, 460px" className="object-cover" loading="lazy" />
            </div>
          </div>
          <div className="lg:col-span-7 min-w-0"><SwipeRow label="Documents required" reveal={false} className="ngo-docs-grid grid grid-cols-1 sm:grid-cols-2 gap-x-10">
            {DOCUMENTS.map(({ title, body, Icon }) => (
              <div key={title} className="ngo-check-row !border-t-0">
                <IconBubble><Icon className="h-6 w-6" strokeWidth={1.8} /></IconBubble>
                <div className="min-w-0">
                  <h3 className="ngo-heading text-xl md:text-2xl">{title}</h3>
                  <p className="mt-1 text-[15px] opacity-70">{body}</p>
                </div>
              </div>
            ))}
          </SwipeRow></div>
        </div>
      </section>

      {/* 9. WHY VERIFICATION MATTERS: cinematic photo + blurred text box */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <span className="ngo-eyebrow">Why verification matters</span>
          <NgoPhotoPanel src={IMG + "ngo-children-school-bags-portrait.webp"} alt="Village children smiling with their new school bags">
            <h2 className="ngo-heading text-[clamp(30px,4.4vw,56px)] mb-5 leading-[1.04] tracking-[-0.03em]">
              Donors give faster when they know you are genuine.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-[#EFEADB]/90 leading-relaxed font-light">
              A verified badge tells donors your organisation was checked by documents, AI screening and a real person, so every need you post is taken seriously.
            </p>
          </NgoPhotoPanel>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <NgoFinalCtaBand
        headline={
          status.status === "under_review" ? (
            <>
              Your application is{" "}
              <span className="ngo-gold-underline">under review.</span>
            </>
          ) : (
            <>
              Ready to get{" "}
              <span className="ngo-gold-underline">verified?</span>
            </>
          )
        }
        primaryButton={status.status === "under_review"
          ? { label: "View application status", href: registerHref, showArrow: true }
          : { label: "Complete registration", href: registerHref, showArrow: true }}
        photos={[
          // A landscape photo: the portrait one was cut off in this wide band (the girl and the giving were lost).
          { src: "/images/ngo-landing/ngo-ration-distribution-landscape.webp", alt: "Volunteers handing a grain sack and ration box to villagers waiting in line" },
          { src: "/images/ngo-landing/ngo-children-school-bags-portrait.webp", alt: "Village children smiling with their new school bags" },
        ]}
      />
    </div>
  );
}

export default PreApprovalLanding;
