"use client";

import { motion } from "framer-motion";
import { XCircle, CheckCircle2 } from "lucide-react";
import { useNgoStatus } from "./useNgoStatus";
import { NgoSectionLabel } from "./NgoSectionLabel";

interface ContrastRow {
  usual: string;
  causeKind: string;
}

const CONTRAST_ROWS: ContrastRow[] = [
  {
    usual: "Post on WhatsApp groups and hope",
    causeKind: "Donors within 10 km see your request",
  },
  {
    usual: "Donors aren't sure you're real",
    causeKind: "Your Verified badge proves it",
  },
  {
    usual: "You get things you didn't ask for",
    causeKind: "Donors give exactly what you listed",
  },
  {
    usual: "No record of who gave what",
    causeKind: "Every handover logged, with a certificate",
  },
];

export function NgoProblemSolutionSection() {
  const { isVerified } = useNgoStatus();

  // Hidden once verified (before verification ONLY)
  if (isVerified) return null;

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 text-stone-900 dark:text-stone-100">
      {/* Background color bleed transition */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,240,232,0.3) 0%, rgba(238,248,242,0.4) 50%, rgba(247,240,232,0.2) 100%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <NgoSectionLabel align="center">Sound familiar?</NgoSectionLabel>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-tight mb-4"
            style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
          >
            You post your needs. <span className="italic text-ngo-700 dark:text-ngo-300">Then what?</span>
          </h2>

          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed">
            Most community outreach gets lost in noise. You share wishlists on social groups with zero transparency, vague drop-offs, and no official record of who gave what.
          </p>
        </motion.div>

        {/* Contrast Comparison Grid */}
        <div className="relative rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 shadow-xl overflow-hidden backdrop-blur-sm p-4 sm:p-8 lg:p-10 mb-8">
          
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-stone-200/80 dark:border-zinc-800 text-center md:text-left font-black uppercase text-xs sm:text-sm tracking-wider">
            <div className="flex items-center justify-center md:justify-start gap-2 text-stone-500 dark:text-stone-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>The Usual Way</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-ngo-700 dark:text-ngo-300">
              <span className="h-2 w-2 rounded-full bg-ngo-700 dark:bg-ngo-300" />
              <span>The CauseKind Way</span>
            </div>
          </div>

          {/* Staggered Rows */}
          <div className="divide-y divide-stone-100 dark:divide-zinc-800/80">
            {CONTRAST_ROWS.map((row, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 sm:py-5 items-center hover:bg-stone-50/60 dark:hover:bg-zinc-800/30 rounded-xl px-2 sm:px-3 transition-colors"
              >
                {/* ❌ Left Column: The Usual Way */}
                <div className="flex items-start gap-3 text-stone-500 dark:text-stone-400">
                  <XCircle className="w-5 h-5 text-red-500/80 shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base font-medium leading-snug">
                    {row.usual}
                  </span>
                </div>

                {/* ✅ Right Column: The CauseKind Way */}
                <div className="flex items-start gap-3 text-stone-900 dark:text-stone-100 font-semibold bg-ngo-50/70 dark:bg-ngo-900/30 p-2.5 sm:p-3 rounded-xl border border-ngo-300/40 dark:border-ngo-700/40">
                  <CheckCircle2 className="w-5 h-5 text-ngo-700 dark:text-ngo-300 shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base leading-snug">
                    {row.causeKind}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* Closing Line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm sm:text-base font-medium text-stone-600 dark:text-stone-300 italic">
            "We built CauseKind so verified organizations get exactly what they need, delivered right to their doorstep."
          </p>
        </motion.div>

      </div>
    </section>
  );
}

export default NgoProblemSolutionSection;
