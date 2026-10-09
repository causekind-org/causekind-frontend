"use client";

import React from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { Reveal } from "./motion/Reveal";

export function NgoFaqSection() {
  const faqs = [
    {
      q: "How long does verification take?",
      a: "Our team reviews applications within 24-48 business hours. If any documents are unclear, we will request changes, which you can track in your dashboard."
    },
    {
      q: "Is there any fee to join?",
      a: "No. CauseKind is completely free for verified NGOs. We do not charge any commission or onboarding fees."
    },
    {
      q: "What items can I ask for?",
      a: "You can request physical goods—blankets, books, medical supplies, food packets, etc. CauseKind does not facilitate direct monetary donations for drives."
    },
    {
      q: "Who drops off the items?",
      a: "Donors will securely hand over the items at your registered address or a designated drop-off point. You will exchange a secure OTP to verify the handover."
    }
  ];

  return (
    <section className="py-24 bg-[#FBF9F4] dark:bg-[#09090b] relative">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal>
          <h2 className="text-4xl font-serif font-bold text-center mb-12">Frequently Asked Questions</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <Accordion.Root type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <Accordion.Item key={i} value={`item-${i}`} className="border-b border-stone-200 dark:border-zinc-800">
                <Accordion.Header className="flex">
                  <Accordion.Trigger className="flex flex-1 items-center justify-between py-4 text-left text-lg font-medium transition-all hover:text-[var(--color-ngo-600)] [&[data-state=open]>svg]:rotate-180">
                    {faq.q}
                    <svg className="h-4 w-4 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="pb-4 pt-0 text-stone-600 dark:text-stone-400 text-base leading-relaxed">
                    {faq.a}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Reveal>
      </div>
    </section>
  );
}
