"use client";

import React from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { Reveal } from "./motion/Reveal";
import { useTranslations } from "next-intl";

export function NgoFaqSection() {
  const t = useTranslations("NgoLanding");
  
  const faqs = [
    {
      q: t("Faq.q1"),
      a: t("Faq.a1")
    },
    {
      q: t("Faq.q2"),
      a: t("Faq.a2")
    },
    {
      q: t("Faq.q3"),
      a: t("Faq.a3")
    }
  ];

  // Feature flagged slot for CommunityStories (off by default)
  const SHOW_COMMUNITY_STORIES = false;

  return (
    <section className="py-24 bg-[#FBF9F4] dark:bg-[#09090b] relative">
      <div className="max-w-4xl mx-auto px-6">
        
        {SHOW_COMMUNITY_STORIES && (
          <Reveal>
            <div className="mb-24 text-center">
              <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">Community Stories</h2>
              <p className="text-stone-600 dark:text-stone-400 mt-2">Hear from NGOs who have successfully verified and run drives.</p>
              {/* <CommunityStories /> placeholder */}
            </div>
          </Reveal>
        )}

        <Reveal>
          <h2 className="text-4xl font-serif font-bold text-center mb-12">{t("Faq.title")}</h2>
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
