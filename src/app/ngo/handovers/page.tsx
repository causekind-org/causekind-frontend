"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  ShieldCheck,
  PackageCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Plus,
  Lock,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";

export default function NgoHandoversPage() {
  const router = useRouter();
  const {
    status,
    ngoName,
    isVerified,
    isPhotosDue,
    photosDueRequestName,
    dropoffsToConfirm,
    photosDue,
  } = useNgoStatus();

  return (
    <div className="min-h-screen bg-[#FAFDFB] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-20 pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Back Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-ngo-700 dark:text-ngo-300 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ngo-100 text-ngo-800 dark:bg-ngo-900/50 dark:text-ngo-200 border border-ngo-200 dark:border-ngo-800">
              {ngoName || "NGO Partner"}
            </span>
          </div>
        </div>

        {/* Header Strip */}
        <div className="rounded-3xl bg-gradient-to-br from-ngo-50 via-white to-ngo-50/50 dark:from-ngo-950/40 dark:via-zinc-900 dark:to-zinc-900 border border-ngo-100 dark:border-zinc-800 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ngo-500/10 text-ngo-800 dark:text-ngo-200 border border-ngo-500/20 text-xs font-bold uppercase tracking-wider mb-3">
                <Camera className="w-3.5 h-3.5 text-ngo-700 dark:text-ngo-300" />
                Handover Hub &amp; Photo Proof
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ngo-950 dark:text-white">
                Handovers &amp; Photos
              </h1>
              <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
                Confirm scheduled drop-offs from local givers, verify delivery OTPs, and upload required handover photographs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/requests">
                <Button
                  variant="outline"
                  className="rounded-full border-ngo-200 hover:bg-ngo-50 text-ngo-900 text-xs font-bold px-4"
                >
                  Active Drives
                </Button>
              </Link>
              <Link href="/ngo/drives/new">
                <Button className="rounded-full bg-ngo-700 hover:bg-ngo-600 text-white text-xs font-bold px-4 shadow-sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Start a Drive
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Unverified Locked Warning Banner */}
        {!isVerified && (
          <div className="mb-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  Verification Required to Confirm Handovers
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {status === "incomplete"
                    ? "Complete your 6-step organization registration to enable donor drop-offs and live matching."
                    : "Your organization application is currently under review by the CauseKind team."}
                </p>
              </div>
            </div>
            <Link href={status === "incomplete" ? "/profile/ngo-details" : "/profile"}>
              <Button size="sm" className="rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold">
                {status === "incomplete" ? "Complete Profile →" : "View Application Status"}
              </Button>
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200/70 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Drop-offs to Confirm
              </span>
              <PackageCheck className="w-4 h-4 text-ngo-700 dark:text-ngo-300" />
            </div>
            <p className="text-2xl font-black text-ngo-950 dark:text-white">
              {dropoffsToConfirm}
            </p>
            <p className="text-3xs text-stone-500 mt-1">Scheduled by donors</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200/70 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Photos Due
              </span>
              <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-900 dark:text-amber-300">
              {photosDue}
            </p>
            <p className="text-3xs text-stone-500 mt-1">Pending handover photo proof</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200/70 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Verified Deliveries
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-300">
              0
            </p>
            <p className="text-3xs text-stone-500 mt-1">Certified completed handovers</p>
          </div>
        </div>

        {/* Handover List Container */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-stone-200/70 dark:border-zinc-800 p-8 shadow-xs text-center">
          <div className="max-w-md mx-auto py-8">
            <div className="w-14 h-14 rounded-2xl bg-ngo-500/10 dark:bg-ngo-500/20 text-ngo-700 dark:text-ngo-300 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
              No Pending Drop-offs
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
              When local givers pledge items to your active donation drives and schedule a physical drop-off, their OTP confirmation and photo upload forms will appear right here.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/ngo/drives/new">
                <Button className="rounded-full bg-ngo-700 hover:bg-ngo-600 text-white text-xs font-bold px-5">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Start a Drive
                </Button>
              </Link>
              <Link href="/requests">
                <Button variant="outline" className="rounded-full text-xs font-bold px-5">
                  Browse Needs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
