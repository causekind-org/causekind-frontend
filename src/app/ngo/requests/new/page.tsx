"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowLeft,
  Package,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

function NgoRequestCreationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const {
    status,
    isVerified,
    isPhotosDue,
    photosDueRequestName,
    lockReason,
  } = useNgoStatus();

  // Route Guard: Non-verified NGOs or NGOs with photos due are redirected back
  useEffect(() => {
    if (!isVerified) {
      if (status === "incomplete") {
        toast.error("Complete your profile to get verified. Continue →");
        router.replace("/profile/ngo-details");
      } else if (status === "under_review") {
        toast.info("Your application is under review. We'll unlock this once you're approved.");
        router.replace("/");
      } else if (status === "changes_requested") {
        toast.error("A few documents need fixing. Fix now →");
        router.replace("/profile/ngo-details");
      }
    } else if (isPhotosDue) {
      toast.error(`Upload handover photos for ${photosDueRequestName} to post your next request.`);
      router.replace("/");
    }
  }, [isVerified, status, isPhotosDue, photosDueRequestName, router]);

  if (!isVerified || isPhotosDue) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] flex items-center justify-center p-6 text-stone-800 dark:text-stone-200">
        <div className="text-center max-w-md space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold">Post a Request is Locked</h1>
          <p className="text-sm text-stone-500">{lockReason}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-ngo-700 dark:text-ngo-300 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-400 hover:text-ngo-700 dark:hover:text-ngo-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to NGO Portal</span>
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-ngo-50 dark:bg-ngo-900/40 border border-ngo-300 text-ngo-800 dark:text-ngo-200 shadow-sm text-3xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-ngo-700 dark:text-ngo-300" />
            <span>Verified Partner Request Creator</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-50"
            style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
          >
            Post what you need.
          </h1>

          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl">
            Post an in-kind request for items your community needs. Givers within 10 km see it, pledge exact quantities, and hand them over directly.
          </p>
        </div>

        {/* Selected Category Notice if any */}
        {categoryParam && (
          <div className="rounded-2xl border border-ngo-300 bg-ngo-50/80 dark:bg-ngo-900/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-ngo-700 dark:text-ngo-300" />
              <div>
                <span className="text-3xs uppercase tracking-wider font-black text-ngo-700 dark:text-ngo-300">
                  Selected Category
                </span>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {categoryParam}
                </p>
              </div>
            </div>
            <span className="text-2xs font-bold text-ngo-700 dark:text-ngo-300">
              Pre-selected ✓
            </span>
          </div>
        )}

        {/* Coming Soon Feature Card */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-ngo-700 dark:text-ngo-300">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              Direct In-Kind Request Engine
            </h2>
          </div>

          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed">
            The direct NGO request posting engine is activating in the next deployment phase. Verified NGOs like yours will be able to publish live wishlists (e.g. 50 blankets, 100 books, 20 ration kits) with automatic 10 km donor radius notifications.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  10 km Radius Reach
                </p>
                <p className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Only nearby donors are notified, minimizing transit time and logistics friction.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Automated Certificates
                </p>
                <p className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Every donor receives a verified CauseKind handover certificate once you confirm receipt.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-6 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-2xs text-stone-400">
              <Clock className="w-4 h-4" />
              <span>Full form launching soon</span>
            </div>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-ngo-700 hover:bg-ngo-600 text-white font-bold px-6 py-3 text-sm shadow-md transition-all"
            >
              <span>Back to NGO Overview</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NgoRequestCreationPage() {
  return (
    <Suspense fallback={null}>
      <NgoRequestCreationContent />
    </Suspense>
  );
}
