"use client";

import { useState } from "react";
import { ChevronDown, FileCheck2, Megaphone, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollTrigger from "gsap/ScrollTrigger";

export function NgoEducationDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      num: "1",
      icon: FileCheck2,
      title: "Get verified",
      desc: "You've already completed this step! Your documents were reviewed and approved.",
    },
    {
      num: "2",
      icon: Megaphone,
      title: "Post what you need",
      desc: "Describe the items, quantity and intended use. Our team reviews your need before looking for nearby donor matches.",
    },
    {
      num: "3",
      icon: Sparkles,
      title: "Deliver, then prove it",
      desc: "Confirm receipt and upload a handover photo. Certificate eligibility follows the completed handover checks.",
    },
  ];

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    // Refresh ScrollTrigger after animation completes
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 400);
  };

  return (
    <section className="py-12 px-6 max-w-4xl mx-auto w-full">
      <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <button
          onClick={toggleOpen}
          className="w-full flex items-center justify-between p-6 sm:p-8 bg-stone-50 dark:bg-zinc-800/50 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex flex-col text-left">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              How CauseKind Works
            </h2>
            <p className="text-sm text-stone-500 mt-1">Review the steps from posting to delivery</p>
          </div>
          <ChevronDown
            className={`w-6 h-6 text-stone-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-6 sm:p-8 border-t border-stone-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isCompleted = idx === 0;

                    return (
                      <div
                        key={step.num}
                        className={`rounded-2xl p-5 border-2 transition-all duration-300 flex flex-col justify-between ${
                          isCompleted 
                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' 
                            : 'border-stone-100 bg-stone-50/50 dark:border-zinc-800 dark:bg-zinc-800/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono font-black text-sm shadow-sm ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {step.num}
                            </div>
                            {isCompleted && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-4xs font-bold text-emerald-800 dark:text-emerald-300">
                                Completed ✓
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-2">
                            <span>{step.title}</span>
                            <Icon className={`w-4 h-4 shrink-0 ${isCompleted ? 'text-emerald-600' : 'text-ngo-700 dark:text-ngo-300'}`} />
                          </h3>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
