"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminGetAllAiAssessments, type AiAssessmentResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, ArrowLeft, Search, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { PhotoStrip } from "@/components/admin/PhotoStrip";

const REC_BADGE: Record<string, string> = {
  APPROVE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-700",
  REJECT: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-700",
  MANUAL_REVIEW: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-700",
  REQUEST_INFORMATION: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700",
};
const FRAUD_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-300",
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-300",
};
const REC_FILTERS = ["ALL", "APPROVE", "REJECT", "MANUAL_REVIEW", "REQUEST_INFORMATION"];

export default function AiLogsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [assessments, setAssessments] = useState<AiAssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recFilter, setRecFilter] = useState("ALL");
  const [fraudFilter, setFraudFilter] = useState("ALL");

  async function load() {
    setLoading(true);
    try {
      const data = await adminGetAllAiAssessments();
      setAssessments(data);
    } catch {
      toast.error("Failed to load AI assessment logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, isLoading, router]);

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (recFilter !== "ALL" && a.recommendation !== recFilter) return false;
      if (fraudFilter !== "ALL" && a.fraudRisk !== fraudFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.listingTitle?.toLowerCase().includes(q) ||
          a.recommendation?.toLowerCase().includes(q) ||
          a.evidenceNotes?.toLowerCase().includes(q) ||
          a.detectedLabels?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assessments, recFilter, fraudFilter, search]);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="size-8 animate-spin text-stone-400" />
    </div>
  );
  if (!user) return null;

  const approveCount = assessments.filter((a) => a.recommendation === "APPROVE").length;
  const rejectCount = assessments.filter((a) => a.recommendation === "REJECT").length;
  const manualCount = assessments.filter((a) => a.recommendation === "MANUAL_REVIEW").length;
  const highFraudCount = assessments.filter((a) => a.fraudRisk === "HIGH").length;

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-violet-50/60 to-transparent dark:from-violet-950/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 shrink-0 mt-0.5">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Screening Logs</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                All AI assessments across listings · {assessments.length} total
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Link href="/admin/approvals">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Approvals
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Approve" value={approveCount} color="emerald" />
          <StatCard label="Reject" value={rejectCount} color="red" />
          <StatCard label="Manual Review" value={manualCount} color="orange" />
          <StatCard label="High Fraud Risk" value={highFraudCount} color="rose" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search listing, notes, labels…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {REC_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setRecFilter(f)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  recFilter === f
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-stone-300 text-stone-600 hover:border-violet-400 hover:text-violet-700"
                }`}
              >
                {f === "ALL" ? "All" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((f) => (
              <button
                key={f}
                onClick={() => setFraudFilter(f)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  fraudFilter === f
                    ? "bg-stone-800 text-white border-stone-800"
                    : "border-stone-300 text-stone-600 hover:border-stone-500"
                }`}
              >
                {f === "ALL" ? "Any Fraud" : `Fraud: ${f}`}
              </button>
            ))}
          </div>

          {(recFilter !== "ALL" || fraudFilter !== "ALL" || search) && (
            <button
              className="text-xs text-stone-400 hover:text-stone-600 underline"
              onClick={() => { setRecFilter("ALL"); setFraudFilter("ALL"); setSearch(""); }}
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-stone-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No AI assessments found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <AiLogCard key={a.id} assessment={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300",
    red: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300",
    orange: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-300",
    rose: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300",
  };
  return (
    <div className={`rounded-xl border backdrop-blur-sm px-4 py-3 ${styles[color] ?? ""}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function AiLogCard({ assessment: a }: { assessment: AiAssessmentResponse }) {
  const [expanded, setExpanded] = useState(false);
  const recBadge = REC_BADGE[a.recommendation] ?? "bg-stone-100 text-stone-700 border-stone-300";
  const fraudBadge = a.fraudRisk ? (FRAUD_BADGE[a.fraudRisk] ?? "") : "";

  return (
    <Card className="overflow-hidden bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-200/60 dark:border-zinc-700/40 shadow-sm">
      <CardContent className="p-0">
        {/* Summary row */}
        <button
          className="w-full text-left p-4 hover:bg-stone-50 dark:hover:bg-zinc-900 transition"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="font-medium text-sm truncate">{a.listingTitle || `Listing #${a.listingId}`}</span>
              <span className="text-xs text-stone-400">#{a.listingId}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${recBadge}`}>
                {a.recommendation.replace(/_/g, " ")}
              </span>
              {a.fraudRisk && (
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${fraudBadge}`}>
                  Fraud: {a.fraudRisk}
                </span>
              )}
              <span className="text-[11px] text-stone-400">{Math.round(a.confidence)}% conf</span>
              <span className="text-[11px] text-stone-400">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {a.evidenceNotes && (
            <p className="mt-1.5 text-xs text-stone-500 line-clamp-1 text-left">{a.evidenceNotes}</p>
          )}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t px-4 py-3 bg-stone-50/50 dark:bg-zinc-900/50 space-y-3">
            {/* Score bars */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <MiniBar label="Confidence" value={a.confidence} color="bg-violet-500" />
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {a.eligibilityResult && <Cell label="Eligibility" value={a.eligibilityResult} />}
              {a.conditionGrade && <Cell label="Condition Grade" value={a.conditionGrade} />}
              {a.modelVersion && <Cell label="Model" value={a.modelVersion} />}
              {a.listingStatus && <Cell label="Listing Status" value={a.listingStatus.replace(/_/g, " ")} />}
            </div>

            {/* Donor + origin */}
            <div className="rounded-xl border border-stone-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Submitted by</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b04a15]/10 text-sm font-black text-[#b04a15]">
                    {a.donorName?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{a.donorName ?? "Unknown donor"}</span>
                    <span className="block truncate text-[11px] text-stone-500">{a.donorEmail ?? "—"}</span>
                  </span>
                </div>
                <div className="text-right text-[11px] text-stone-500">
                  <span className="block">{[a.locality, a.city].filter(Boolean).join(", ") || "Location not given"}</span>
                  {a.pincode && <span className="block">PIN {a.pincode}</span>}
                </div>
              </div>
              {a.donorId && (
                <Link
                  href={`/admin/dashboard?journeyUser=${a.donorId}`}
                  className="mt-2 inline-block text-[11px] font-semibold text-[#b04a15] hover:underline"
                >
                  View donor&apos;s full journey →
                </Link>
              )}
            </div>

            {/* What the donor submitted */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {a.category && <Cell label="Category" value={a.subcategory ? `${a.category} / ${a.subcategory}` : a.category} />}
              {a.condition && <Cell label="Condition (stated)" value={a.condition} />}
              {a.workingStatus && <Cell label="Working Status" value={a.workingStatus} />}
            </div>
            {a.knownDefects && (
              <p className="text-xs text-stone-600 dark:text-stone-400"><span className="text-stone-400">Known defects: </span>{a.knownDefects}</p>
            )}
            {a.description && (
              <p className="text-xs text-stone-600 dark:text-stone-400"><span className="text-stone-400">Description: </span>{a.description}</p>
            )}

            {/* Photos the AI assessed — click any thumbnail for a full-size preview */}
            {a.images && a.images.length > 0 && <PhotoStrip images={a.images} label="Photos assessed" />}

            {/* Evidence */}
            {a.evidenceNotes && (
              <p className="text-xs italic text-stone-600 dark:text-stone-400">{a.evidenceNotes}</p>
            )}

            {/* Detected labels */}
            {a.detectedLabels && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Detected labels</p>
                <div className="flex flex-wrap gap-1">
                  {a.detectedLabels.split(",").map((lbl, i) => (
                    <span key={i} className="rounded-full bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-stone-600 dark:text-stone-400">
                      {lbl.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Moderation labels */}
            {a.moderationLabels && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-1">Moderation labels</p>
                <div className="flex flex-wrap gap-1">
                  {a.moderationLabels.split(",").map((lbl, i) => (
                    <span key={i} className="rounded-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-2 py-0.5 text-[11px] text-red-600 dark:text-red-400">
                      {lbl.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {a.missingInfoFlags && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Missing info: </span>{a.missingInfoFlags}
              </p>
            )}
            {a.safetyWarnings && (
              <p className="text-xs text-red-700 dark:text-red-400">
                <span className="font-semibold">Safety: </span>{a.safetyWarnings}
              </p>
            )}

            <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
              <span>Assessed {new Date(a.createdAt).toLocaleString()}</span>
              <Link href="/admin/approvals" className="underline hover:text-stone-600">Go to approvals →</Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-stone-400">{label}: </span>
      <span className="font-medium text-stone-700 dark:text-stone-300">{value}</span>
    </div>
  );
}
