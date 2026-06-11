"use client";

import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "Is it free to use Causekind?",
    a: "Yes, completely free. We charge zero platform fees for donors or recipients. 100% of what you give goes directly to the cause you choose.",
  },
  {
    q: "How do you check campaigns before they go live?",
    a: "Every campaign and item request is reviewed by our team before it appears on the site. We verify the person's identity and confirm that the need is genuine. Anything that doesn't pass our checks is rejected.",
  },
  {
    q: "Can I donate physical items like clothes or books?",
    a: "Yes. Browse the In-Kind Requests section to find people nearby who need specific items. Once you pick a request, you can arrange to hand over the items directly or through one of our listed drop points.",
  },
  {
    q: "How does money get to the campaign?",
    a: "Donations are collected and held securely. Once a campaign reaches its target or its deadline passes, funds are transferred directly to the recipient. You receive a confirmation email at each stage.",
  },
  {
    q: "Can I track where my donation goes?",
    a: "Yes. After donating, you can log in to see the status of your donation and get a verified impact certificate once the funds or items are delivered.",
  },
  {
    q: "Who can post a campaign or request?",
    a: "Anyone can register as a Donee and submit a campaign or item request. Every submission goes through our approval process before it becomes visible to donors.",
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIdx((prev) => (prev === i ? null : i));

  return (
    <section className="py-24 bg-[#faf8f5] dark:bg-zinc-950 border-b border-orange-100/60 dark:border-zinc-800">
      <div className="mx-auto max-w-3xl px-6">

        {/* Header */}
        <Reveal className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-orange-50 dark:bg-zinc-800 mb-2">
            <MessageCircleQuestion className="w-5 h-5 text-[#b04a15]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            Common questions
          </h2>
          <p className="text-base text-stone-500 dark:text-stone-400 font-medium">
            Everything you need to know before you give.
          </p>
        </Reveal>

        {/* FAQ accordion */}
        <div className="space-y-2">
          {FAQS.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <Reveal key={i} className="w-full">
                <div
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? "bg-white dark:bg-zinc-900 border-orange-200 dark:border-zinc-700 shadow-sm"
                      : "bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 hover:border-orange-100 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Question row */}
                  <button
                    onClick={() => toggle(i)}
                    className="flex items-center justify-between w-full px-5 py-4 text-left gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className={`text-[15px] font-bold leading-snug transition-colors duration-200 ${isOpen ? "text-[#b04a15]" : "text-stone-800 dark:text-white"}`}>
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-[#b04a15]" : "text-stone-400 dark:text-zinc-500"}`}
                    />
                  </button>

                  {/* Answer — height transition */}
                  <div className={`overflow-hidden transition-all duration-400 ease-in-out ${isOpen ? "max-h-64" : "max-h-0"}`}>
                    <div className={`px-5 pb-5 ${isOpen ? "faq-answer-enter" : ""}`}>
                      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed font-medium">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Footer nudge */}
        <Reveal className="mt-10 text-center">
          <p className="text-sm text-stone-400 dark:text-stone-600 font-medium">
            Still have questions?{" "}
            <a href="mailto:support@causekind.org" className="text-[#b04a15] font-bold hover:underline">
              Email us
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
