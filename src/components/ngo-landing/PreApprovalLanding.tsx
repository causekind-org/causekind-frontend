"use client";

import React from "react";
import { NgoStepsScrollSection } from "./NgoStepsScrollSection";
import type { NgoStatusData } from "./useNgoStatus";
import { NgoHeroRedesign } from "./NgoHeroRedesign";
import {
  NgoCard,
  NgoSectionHeader,
  NgoMarquee,
  NgoFinalCtaBand,
} from "./NgoSharedComponents";

export function PreApprovalLanding({ status }: { status: NgoStatusData }) {
  // CTA Links
  const registerHref = status.wizardHref || "/profile/ngo-details";

  return (
    <div className="w-full flex flex-col overflow-x-clip">
      {/* 1. HERO */}
      <NgoHeroRedesign status={status} />

      {/* 2. MARQUEE CHIPS */}
      <NgoMarquee />

      {/* 3. WHY JOIN CAUSEKIND */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Why join CauseKind"
            h2="Visibility, trust and transparency, built in."
          />

          <div className="ngo-grid-3">
            <NgoCard
              number="01"
              title="Better visibility"
              body="Get your cause in front of donors actively looking to help."
            />
            <NgoCard
              number="02"
              title="Trusted connections"
              body="Verified status shows donors you are the real thing."
            />
            <NgoCard
              number="03"
              title="Transparent giving"
              body="Every offer and delivery is tracked from start to finish."
            />
          </div>
        </div>
      </section>

      {/* 4. HOW CAUSEKIND WORKS (scroll-driven steps) */}
      <NgoStepsScrollSection />

      {/* 5. CHALLENGES */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="The challenges NGOs face"
            h2="Doing good is hard enough."
          />

          <div className="ngo-grid-4">
            <NgoCard
              tag="Resources"
              title="Limited resources"
              body="Small teams stretch to cover every need."
            />
            <NgoCard
              tag="Reach"
              title="Low visibility"
              body="Great work often goes unseen."
            />
            <NgoCard
              tag="Donors"
              title="Finding donors"
              body="Reaching the right givers takes time."
            />
            <NgoCard
              tag="Trust"
              title="Proving credibility"
              body="Donors need confidence before they give."
            />
          </div>
        </div>
      </section>

      {/* 6. REGISTRATION PROCESS */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="NGO registration process"
            h2="Create your account in minutes."
          />

          <div className="ngo-grid-3">
            <NgoCard
              number="1"
              title="Create an account"
              body="Sign up with your organisation email."
            />
            <NgoCard
              number="2"
              title="Add organisation details"
              body="Name, mission, location and contact person."
            />
            <NgoCard
              number="3"
              title="Submit for review"
              body="Upload documents and send your application."
            />
          </div>
        </div>
      </section>

      {/* 7. VERIFICATION STEPS (Dark Band) */}
      <section className="ngo-section ngo-band-dark">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Verification steps"
            h2="Four checks. One trusted badge."
            isDark
          />

          <div className="ngo-grid-4">
            <NgoCard
              number="1"
              title="Document submission"
              body="Upload your registration papers."
              isDarkBand
            />
            <NgoCard
              number="2"
              title="Legal checks"
              body="We confirm your legal standing."
              isDarkBand
            />
            <NgoCard
              number="3"
              title="AI screening"
              body="Automated checks flag inconsistencies."
              isDarkBand
            />
            <NgoCard
              number="4"
              title="Team review"
              body="A person reviews and decides."
              isDarkBand
            />
          </div>
        </div>
      </section>

      {/* 8. DOCUMENTS REQUIRED */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Documents required"
            h2="Keep these ready."
          />

          <div className="ngo-grid-3">
            <NgoCard
              title="Registration certificate"
              body="Trust, society or Section 8 proof."
            />
            <NgoCard
              title="PAN of the organisation"
              body="Tax identity document."
            />
            <NgoCard
              title="12A / 80G certificates"
              body="If your NGO holds them."
            />
            <NgoCard
              title="Address proof"
              body="Office or premises proof."
            />
            <NgoCard
              title="Authorised person ID"
              body="Government ID of your representative."
            />
            <NgoCard
              title="Mission and activities"
              body="A short description of your work."
            />
          </div>
        </div>
      </section>

      {/* 9. WHY VERIFICATION MATTERS (Wide gradient card) */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <span className="ngo-eyebrow">Why verification matters</span>
          <div className="rounded-[28px] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#0B3D2E] to-[#1E6B4A]">
            <div className="relative z-10 max-w-3xl">
              <h2 className="ngo-heading text-3xl sm:text-4xl md:text-5xl mb-6 leading-[1.1]">
                Donors give faster when they know you are genuine.
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#EFEADB]/90 leading-relaxed font-normal">
                A verified badge tells donors your organisation was checked by documents, AI screening and a real person, so every need you post is taken seriously.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 rounded-full bg-[#2F8F5B]/30 blur-3xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <NgoFinalCtaBand
        headline={
          <>
            Ready to get{" "}
            <span className="ngo-gold-underline">verified?</span>
          </>
        }
        primaryButton={{
          label: "Complete registration",
          href: registerHref,
          showArrow: true,
        }}
        photos={[
          { src: "/images/ngo-landing/ngo-school-supplies-girl-portrait.webp", alt: "A volunteer handing notebooks and a pencil box to a smiling schoolgirl" },
          { src: "/images/ngo-landing/ngo-children-school-bags-portrait.webp", alt: "Village children smiling with their new school bags" },
        ]}
      />
    </div>
  );
}

export default PreApprovalLanding;
