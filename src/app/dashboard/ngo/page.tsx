"use client";

import { serverDate } from "@/lib/serverTime";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNgoDashboardData } from "@/hooks/useNgoDashboardData";
import { NgoDashboardSections } from "@/features/ngo-drives/components/manage/NgoDashboardSections";
import { NgoReadinessRail } from "@/components/profile/NgoReadinessRail";
import { useAuth } from "@/hooks/useAuth";
import { getMyMatches, type ItemMatch } from "@/lib/api";
import { isNgoRole } from "@/lib/isNgoRole";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton, PageSkeleton } from "@/components/skeletons";
import {
  ShieldCheck,
  Plus,
  Heart,
  MapPin,
  Loader2,
  Lock,
  AlertTriangle,
  Clock,
  EyeOff,
  Check,
  Calendar,
  X,
  History,
  Info,
  FileText
} from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "U";
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "U";
  return ((words[0][0] ?? "") + (words[words.length - 1][0] ?? "")).toUpperCase();
}

function getUnitLabel(u: string) {
  const map: Record<string, string> = { PIECES: "Pieces", SETS: "Sets", PAIRS: "Pairs", KG: "Kg", BOXES: "Boxes", PACKETS: "Packets" };
  return map[u] || u;
}

function getDayLabel(d: string) {
  const map: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
  return map[d] || d;
}

export default function NgoDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [matches, setMatches] = useState<ItemMatch[]>([]);

  
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (!isNgoRole(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const {
    status,
    ngoName,
    stepNumber,
    totalSteps,
    isVerified,
    lockReason,
    canPostRequest,
    nextIncompleteStep,
    wizardHref,
    activeRequests,
    requests,
    loadingRequests,
    errorRequests,
    refetchRequests,
    documents,
    myProfile
  } = useNgoDashboardData();

  useEffect(() => {
    if (isVerified) {
      getMyMatches().then(setMatches).catch(() => setMatches([]));
    }
  }, [isVerified]);

  if (authLoading || status === "loading" || !user || (!isNgoRole(user.role))) {
    return (
      <PageSkeleton>
        <DashboardSkeleton tiles={3} label="Loading your dashboard" />
      </PageSkeleton>
    );
  }

  const resolvedFulfilledCount = requests.filter(r => ["FULFILLED", "FULLY_FULFILLED"].includes(r.status)).length;
  const resolvedActiveMatches = matches.filter(m => !["FULFILLED", "CANCELLED", "REJECTED", "FAILED"].includes(m.status)).length;
  const resolvedRequestsCount = requests.length;


  const showSections = isVerified;

  const isHardError = errorRequests;

  return (
    <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-[calc(var(--ck-bottom-chrome)+1.5rem)]">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-ngo-950 via-ngo-900 to-ngo-950 text-white py-7 sm:py-12 px-4 shadow-lg">
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-ngo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ngo-500/25 to-transparent" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-ngo-950/50 border border-ngo-800/50 rounded-full px-2.5 py-0.5 text-2xs sm:px-3 sm:py-1 sm:text-xs text-ngo-300 font-bold uppercase tracking-wider">
                {status === "incomplete" ? (
                  <><AlertTriangle className="w-3.5 h-3.5" /> Profile incomplete</>
                ) : status === "under_review" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Under review</>
                ) : status === "changes_requested" ? (
                  <><AlertTriangle className="w-3.5 h-3.5" /> Changes requested</>
                ) : (
                  <><ShieldCheck className="w-3.5 h-3.5" /> Verified NGO</>
                )}
              </div>
              <h1 className="text-xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                Namaste, {ngoName || user.email?.split("@")[0]}.
              </h1>
              <p className="text-white/70 text-sm max-w-md">
                {status === "incomplete" ? "Complete your application to start posting donation drives to givers near you."
                 : status === "under_review" ? "Your application is with our team. You can start drives once you're verified."
                 : status === "changes_requested" ? "A few things need fixing before we can verify you."
                 : requests.length === 0 ? "Start your first drive and we'll bring it to givers near you."
                 : "Here's how your donation drives are doing."}
              </p>
              {status === "incomplete" && (
                <Link href={wizardHref} className="inline-block mt-1 text-sm font-bold text-ngo-300 hover:text-ngo-200 hover:underline">
                  Continue application &rarr;
                </Link>
              )}
              {status === "changes_requested" && (
                <Link href="/profile" className="inline-block mt-1 text-sm font-bold text-ngo-300 hover:text-ngo-200 hover:underline">
                  See what needs fixing &rarr;
                </Link>
              )}
            </motion.div>
            
            {canPostRequest ? (
              <Link href="/ngo/drives/new" data-tour="primary-cta">
                <Button className="bg-ngo-300 hover:bg-ngo-400 text-ngo-950 font-extrabold rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-2 sm:py-3 h-auto text-sm sm:text-sm flex items-center gap-2 shadow-xl shrink-0 transition-all hover:-translate-y-0.5 w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4" /> Start a Drive
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col gap-1 items-start sm:items-end w-full sm:w-auto">
                <Button disabled className="bg-transparent text-ngo-100/70 border border-ngo-300/50 font-extrabold rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-2 sm:py-3 h-auto text-sm sm:text-sm flex items-center gap-2 shrink-0 w-full justify-center opacity-100 cursor-not-allowed">
                  <Lock className="w-4 h-4 opacity-70" /> Start a Drive
                </Button>
                <p className="text-xs text-ngo-100/70 w-full text-center sm:text-right">{lockReason || "Available once CauseKind verifies your NGO."}</p>
              </div>
            )}
          </div>

          {/* Stats ledger */}
          <div data-tour="ledger" className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: resolvedRequestsCount, label: "DRIVES STARTED" },
              { n: resolvedActiveMatches, label: "ACTIVE MATCHES" },
              { n: resolvedFulfilledCount, label: "DRIVES COMPLETED" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className={`py-3.5 sm:py-5 ${i > 0 ? "border-l border-white/10 pl-3.5 sm:pl-8" : ""}`}>
                <p className="text-xl sm:text-5xl tabular-nums leading-none" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>{stat.n}</p>
                <p className="text-3xs uppercase tracking-[0.22em] text-white/45 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">

        {/* ── Identity line ── */}
        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200/80 dark:border-zinc-800 pb-3 sm:pb-4">
          <div className="w-9 h-9 rounded-full bg-ngo-900/10 dark:bg-zinc-800 flex items-center justify-center font-black text-sm text-ngo-700 dark:text-ngo-400 shrink-0">
            {getInitials(ngoName || user.email)}
          </div>
          <p className="font-bold text-stone-800 dark:text-stone-200 truncate">{ngoName || "NGO Name"}</p>
          <span className="text-stone-300 dark:text-zinc-700 hidden sm:inline">&middot;</span>
          <p className="truncate hidden sm:block">{user?.email}</p>
          {myProfile?.city && (
            <>
              <span className="text-stone-300 dark:text-zinc-700 hidden md:inline">&middot;</span>
              <p className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3 text-ngo-700 dark:text-ngo-400" />{myProfile.city}</p>
            </>
          )}
          <Link href="/profile" className="ml-auto shrink-0 font-bold text-ngo-700 dark:text-ngo-400 hover:underline">Edit profile</Link>
        </div>

        {/* Target of every "/dashboard/ngo#live-drives" link. */}
        <div id="live-drives" className="scroll-mt-24">
          <Suspense fallback={null}>
            <NgoDashboardSections drives={requests} verified={showSections} loading={loadingRequests} error={!!isHardError}
              onRetry={refetchRequests} startDrive={canPostRequest ? (
                <Link href="/ngo/drives/new">
                  <Button size="sm" className="bg-ngo-700 hover:bg-ngo-800 text-white mt-2">Start a Drive</Button>
                </Link>
              ) : (
                <div className="space-y-1">
                  <Button size="sm" disabled className="mt-2 bg-stone-200 text-stone-500 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5 mr-1" /> Start a Drive
                  </Button>
                  <p className="text-2xs text-stone-500 max-w-[260px] mx-auto">{lockReason}</p>
                </div>
              )} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
