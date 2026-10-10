"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNgoDashboardData } from "@/hooks/useNgoDashboardData";
import { DriveQuantityBar } from "@/features/ngo-drives/components/DriveQuantityBar";
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

  // Real NgoDriveStatus values (backend enum), not the old item-request statuses.
  const liveDrives = requests.filter(r => ["LIVE", "FULLY_PLEDGED"].includes(r.status));
  const reviewDrives = requests.filter(r => ["PENDING_REVIEW", "CHANGES_REQUESTED", "REJECTED"].includes(r.status));
  const fulfilledDrives = requests.filter(r => ["FULFILLED", "FULLY_FULFILLED"].includes(r.status));

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

        {/* Sections */}

          {(() => {
            // A rejected proof sends the drive back to COLLECTION_COMPLETE, so this one status covers both.
            const needsAttention = requests.filter(r => r.status === 'COLLECTION_COMPLETE');
            if (needsAttention.length > 0) {
              return (
                <div className="mb-8">
                  <div className="border-b-2 border-red-700/60 dark:border-red-400/50 pb-3 mb-4">
                    <p className="text-3xs font-black uppercase tracking-[0.24em] text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> Needs your attention
                    </p>
                  </div>
                  <div className="space-y-3">
                    {needsAttention.map((drive: any) => (
                      <Link key={drive.id} href={`/ngo/drives/${drive.id}?tab=proof`} className="block">
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-center justify-between hover:bg-red-100 transition-colors">
                          <div>
                            <h4 className="font-bold text-red-900 dark:text-red-100">{drive.title}</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              {drive.adminReason ? `Proof of distribution is due. ${drive.adminReason}` : "Collection complete. Proof of distribution is due."}
                            </p>
                          </div>
                          <Button variant="destructive" size="sm" className="shrink-0">Action needed</Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {reviewDrives.length > 0 && (
            <section aria-labelledby="review-drives-heading" className="mb-8">
              <div className="border-b-2 border-amber-600/60 dark:border-amber-400/50 pb-3 mb-4">
                <p id="review-drives-heading" className="text-3xs font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-400">Waiting or blocked</p>
                <p className="text-xs text-stone-400 mt-1">Drives that are not live yet.</p>
              </div>
              <div className="space-y-3">
                {reviewDrives.map((drive: any) => {
                  const label = drive.status === "PENDING_REVIEW" ? "Under review"
                    : drive.status === "CHANGES_REQUESTED" ? "Changes requested" : "Rejected";
                  return (
                    <Link key={drive.id} href={`/ngo/drives/${drive.id}`} className="block">
                      <div className="bg-white dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 rounded-xl p-4 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 min-w-0 truncate">{drive.title}</h4>
                          <Badge variant={drive.status === "REJECTED" ? "destructive" : "secondary"} className="shrink-0">{label}</Badge>
                        </div>
                        {drive.status !== "PENDING_REVIEW" && drive.adminReason && (
                          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1.5"><strong>Reason:</strong> {drive.adminReason}</p>
                        )}
                        {drive.status === "CHANGES_REQUESTED" && (
                          <p className="text-xs font-bold text-ngo-700 dark:text-ngo-400 mt-2">Open to edit &amp; resubmit →</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section id="live-drives" className="scroll-mt-24">
            <div className="border-b-2 border-ngo-700/60 dark:border-ngo-400/50 pb-3">
              <p className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-400">Live Drives</p>
            <p className="text-xs text-stone-400 mt-1">Drives donors near you can give to right now.</p>
          </div>
          <div className="pt-3.5 sm:pt-5">
            {loadingRequests ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-stone-300 mx-auto" />
              </div>
            ) : isHardError ? (
              <div className="py-12 text-center text-sm text-stone-500">
                <p>We couldn't load your drives.</p>
                <button onClick={refetchRequests} className="text-ngo-700 hover:underline font-bold mt-1">Try again</button>
              </div>
            ) : !showSections ? (
              <div className="py-7 sm:py-12 text-center space-y-3 sm:space-y-4">
                <div className="relative w-16 sm:w-24 h-16 sm:h-24 mx-auto rounded-full border border-ngo-700/20">
                  <div className="absolute inset-3 rounded-full border border-ngo-700/15" />
                  <div className="absolute inset-6 rounded-full border border-ngo-700/10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ngo-50 dark:bg-zinc-900 flex items-center justify-center shadow">
                    <Lock className="w-4 h-4 text-ngo-700 dark:text-ngo-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Drives unlock after verification</p>
                  <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1">Once our team approves your NGO, you can start drives for givers near you.</p>
                </div>
              </div>
            ) : liveDrives.length === 0 ? (
              <div className="py-8 sm:py-14 text-center space-y-3">
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No live drives yet</p>
                <p className="text-xs text-stone-400 max-w-[240px] mx-auto">Start a drive and tell givers exactly what you need.</p>
                {canPostRequest ? (
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
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {liveDrives.sort((a: any, b: any) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime()).map((drive: any) => {
                  const isAwaiting = drive.status === "FULLY_PLEDGED";
                  return (
                    <div key={drive.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200/80 dark:border-zinc-800 shadow-sm overflow-hidden mb-4">
                      <Link href={`/ngo/drives/${drive.id}`} className="block">
                        <div className="p-4 sm:p-5 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className="flex flex-col md:flex-row gap-4 md:gap-5">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  {drive.urgency === "HIGH" && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">High</Badge>
                                  )}
                                  {drive.urgency === "CRITICAL" && (
                                    <Badge variant="outline" className="text-red-600 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">Critical</Badge>
                                  )}
                                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{drive.category}</span>
                                </div>
                                <Badge variant={isAwaiting ? "secondary" : "default"} className={isAwaiting ? "bg-stone-100 text-stone-600" : "bg-green-100 text-green-700"}>{isAwaiting ? "Fully pledged" : "Live"}</Badge>
                              </div>
                              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 mb-1">{drive.title}</h3>
                              <p className="text-sm text-stone-600 dark:text-stone-400 mb-3 font-medium">
                                {drive.quantityNeeded} {getUnitLabel(drive.unit)} of {drive.itemName}
                              </p>
                              
                              <div className="flex flex-wrap gap-4 text-xs text-stone-500 dark:text-stone-400 mb-4">
                                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> For {drive.beneficiaryCount} {drive.beneficiaryGroup}</span>
                                {drive.neededBy && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Needed by {new Date(drive.neededBy).toLocaleDateString()}</span>}
                              </div>
                              
                              <div className="max-w-md">
                                <DriveQuantityBar compact needed={drive.quantityNeeded} received={drive.quantityReceived || 0}
                                  pledged={drive.quantityPledged || 0} unit={getUnitLabel(drive.unit)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="border-b-2 border-ngo-700/60 dark:border-ngo-400/50 pb-3">
            <p className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-400">Fulfilled Drives</p>
            <p className="text-xs text-stone-400 mt-1">Completed drives, with proof for every donor.</p>
          </div>
          <div className="pt-3.5 sm:pt-5">
            {loadingRequests ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-stone-300 mx-auto" />
              </div>
            ) : isHardError ? (
              <div className="py-12 text-center text-sm text-stone-500">
                <p>We couldn't load your drives.</p>
                <button onClick={refetchRequests} className="text-ngo-700 hover:underline font-bold mt-1">Try again</button>
              </div>
            ) : !showSections ? (
              <div className="py-7 sm:py-12 text-center space-y-3 sm:space-y-4">
                <div className="relative w-16 sm:w-24 h-16 sm:h-24 mx-auto rounded-full border border-ngo-700/20">
                  <div className="absolute inset-3 rounded-full border border-ngo-700/15" />
                  <div className="absolute inset-6 rounded-full border border-ngo-700/10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ngo-50 dark:bg-zinc-900 flex items-center justify-center shadow">
                    <Lock className="w-4 h-4 text-ngo-700 dark:text-ngo-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Drives unlock after verification</p>
                  <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1">Your fulfilled drives will appear here after verification.</p>
                </div>
              </div>
            ) : fulfilledDrives.length === 0 ? (
              <div className="py-8 sm:py-14 text-center space-y-3">
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No fulfilled drives yet</p>
                <p className="text-xs text-stone-400 max-w-[240px] mx-auto">When a drive is completed and proof is uploaded, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fulfilledDrives.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((drive: any) => {
                  return (
                    <div key={drive.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200/80 dark:border-zinc-800 shadow-sm overflow-hidden mb-4">
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col md:flex-row gap-4 md:gap-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{drive.category}</span>
                              <Badge className="bg-green-100 text-green-700">Fulfilled</Badge>
                            </div>
                            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 mb-3">{drive.title}</h3>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                                <span className="w-48 font-medium text-stone-700 dark:text-stone-300 shrink-0">{drive.quantityReceived} {getUnitLabel(drive.unit)} of {drive.itemName}</span>
                                <div className="flex-1 max-w-sm h-2 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-green-500 w-full" />
                                </div>
                                <span className="text-xs text-stone-500 shrink-0 whitespace-nowrap">
                                  Delivered to {drive.beneficiaryGroup}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
                              <span className="flex items-center gap-1 font-medium"><Check className="w-3.5 h-3.5 text-green-600" /> Drive Completed</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-stone-50 dark:bg-zinc-950/50 px-4 sm:px-5 py-3 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between">
                        <p className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" /> Proof uploaded and verified
                        </p>
                        <Button variant="ghost" size="sm" asChild className="text-ngo-700 hover:text-ngo-800 font-bold">
                          <Link href={`/drives/${drive.id}/proof`}>View impact report &rarr;</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
