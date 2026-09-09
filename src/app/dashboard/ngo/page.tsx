"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IS_NGO_DEMO_MODE } from "@/features/ngo-registration/ngoRegistrationModel";

export default function NgoDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Application verification state tracked in localStorage or set via complete-profile
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<"NOT_SUBMITTED" | "PENDING_VERIFICATION" | "UNDER_REVIEW">("NOT_SUBMITTED");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?next=/dashboard/ngo");
      return;
    }

    // Check if application was already submitted in this browser session
    try {
      const storedAppId = localStorage.getItem("ck_ngo_application_id");
      const storedStatus = localStorage.getItem("ck_ngo_status");
      const storedTime = localStorage.getItem("ck_ngo_submitted_at");

      if (storedAppId) {
        setApplicationId(storedAppId);
        setSubmissionStatus(storedStatus === "UNDER_REVIEW" ? "UNDER_REVIEW" : "PENDING_VERIFICATION");
        setSubmittedAt(storedTime || new Date().toLocaleDateString());
      }
    } catch {
      // ignore
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[#b04a15]" />
      </div>
    );
  }

  const isProfileComplete = submissionStatus === "PENDING_VERIFICATION" || submissionStatus === "UNDER_REVIEW";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Top Banner / Welcome */}
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-zinc-800 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15] bg-[#b04a15]/10 px-2.5 py-0.5 rounded-full">
                NGO Partner Portal
              </span>
              {IS_NGO_DEMO_MODE && (
                <span className="text-3xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  Demo Mode Active
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              Welcome, {user.email.split("@")[0]} 🏛️
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Manage your verified NGO profile, track in-kind donation needs, and run public campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                isProfileComplete
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold px-3 py-1"
                  : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-bold px-3 py-1"
              }
            >
              {isProfileComplete ? "Verification Pending" : "Action Required: Complete Profile"}
            </Badge>
          </div>
        </div>
      </Reveal>

      {/* Prominent Complete Profile / Verification Status Card */}
      <Reveal delay={60}>
        {!isProfileComplete ? (
          <div className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-[#b04a15]/40 bg-gradient-to-br from-[#b04a15]/[0.03] to-amber-500/[0.04] dark:from-zinc-900 dark:to-zinc-900/60 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#b04a15]">
                  <Sparkles className="h-4 w-4" /> Next Step for Your Organization
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-50">
                  Complete Your Profile to Unlock NGO Verification
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  Your lightweight account has been created. To start requesting items, receiving donor matches, and launching campaigns, submit your legal documents (80G, 12A, FCRA), representative authorization, and organization photos.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#b04a15]" />
                    <span>Legal structure & registration certificates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#b04a15]" />
                    <span>Authorized representative identification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#b04a15]" />
                    <span>Office & on-ground activity photos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#b04a15]" />
                    <span>Representative OTP email confirmation</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-3">
                <Link href="/dashboard/ngo/complete-profile">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-[#b04a15] hover:bg-[#963c0d] text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-[#b04a15]/20 flex items-center gap-2 text-base transition-all"
                  >
                    Complete Profile Now
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <span className="text-3xs text-center text-stone-400">Takes approximately 3-5 minutes</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-50">
                      Application Submitted & Under Verification
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 px-2 py-0.5 text-3xs font-black uppercase text-amber-800 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Review
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Reference ID: <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{applicationId}</span> • Submitted: {submittedAt}
                  </p>
                </div>
              </div>

              <Link href="/dashboard/ngo/complete-profile">
                <Button variant="outline" size="sm" className="text-xs font-semibold">
                  Review Submission
                </Button>
              </Link>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  1. Application Received
                </div>
                <p className="text-3xs text-emerald-700/80 dark:text-emerald-400/70">
                  All 6 registration steps completed and submitted.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                  2. Document Screening
                </div>
                <p className="text-3xs text-amber-700/80 dark:text-amber-400/70">
                  ClamAV safety scan and AI document validity checks in progress.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200 dark:border-zinc-800 space-y-1 opacity-70">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-400">
                  <ShieldAlert className="h-3.5 w-3.5 text-stone-400" />
                  3. Admin Review
                </div>
                <p className="text-3xs text-stone-500">
                  CauseKind team validates legal status & DARPAN registration.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-200 dark:border-zinc-800 space-y-1 opacity-70">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-400">
                  <HeartHandshake className="h-3.5 w-3.5 text-stone-400" />
                  4. Partner Active
                </div>
                <p className="text-3xs text-stone-500">
                  Verified badge issued and campaign creation unlocked.
                </p>
              </div>
            </div>
          </div>
        )}
      </Reveal>

      {/* Overview Stat Cards */}
      <Reveal delay={120}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-bold text-stone-400 tracking-wider">
                In-Kind Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">0</div>
              <p className="text-3xs text-stone-400 mt-1">
                {isProfileComplete ? "Unlocked after verification approval" : "Complete profile to post item requests"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-bold text-stone-400 tracking-wider">
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">0</div>
              <p className="text-3xs text-stone-400 mt-1">
                {isProfileComplete ? "Unlocked after verification approval" : "Complete profile to run campaigns"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-bold text-stone-400 tracking-wider">
                Matched Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">0</div>
              <p className="text-3xs text-stone-400 mt-1">
                Direct item matching with verified donors nearby
              </p>
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  );
}
