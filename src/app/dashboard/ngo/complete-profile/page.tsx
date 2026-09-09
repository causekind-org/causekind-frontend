"use client";

import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { NGORegistration } from "@/features/ngo-registration/NGORegistration";
import { Reveal } from "@/components/Reveal";
import { IS_NGO_DEMO_MODE } from "@/features/ngo-registration/ngoRegistrationModel";

export default function NgoCompleteProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Header with return button */}
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <Link
              href="/dashboard/ngo"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#b04a15] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to NGO Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2">
              Complete NGO Profile & Verification
              {IS_NGO_DEMO_MODE && (
                <span className="text-3xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  Demo Mode
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Submit legal documents, representative authorization, and photos to complete verified registration.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Relocated 6-step registration flow */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-stone-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm">
        <NGORegistration />
      </div>
    </div>
  );
}
