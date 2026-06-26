"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  getMyItemListings, getMyItemRequests, getMyMatches, getMyProfile,
  donorAcceptMatch, donorRejectMatch, doneeAcceptMatch, doneeRejectMatch, donorConfirmMatch,
  saveMatchLogistics, generateDeliveryOtp, verifyDeliveryMatch, confirmReceiptMatch, requestCallMasking,
  type ItemListing, type ItemRequest, type ItemMatch, type UserProfile
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Award, HandCoins, Loader2, Package, Pencil, Plus, ShieldCheck, X, Check,
  User, MapPin, Calendar, CircleDot, EyeOff, Info, ExternalLink, RefreshCw,
  Phone, Mail, Handshake, CheckCircle2, Heart, AlertTriangle, ThumbsUp, ThumbsDown
} from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "U";
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "U";
  return ((words[0][0] ?? "") + (words[words.length - 1][0] ?? "")).toUpperCase();
}


function getFulfilmentStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    DONOR_REVIEW: { label: "⚠ Awaiting Your Confirmation", variant: "outline" },
    DONOR_REJECTED: { label: "Donor Declined", variant: "destructive" },
    PENDING_APPROVAL: { label: "Pending Admin Approval", variant: "outline" },
    TRANSPORT_DISCUSSION: { label: "Discussion Enabled", variant: "secondary" },
    ARRANGEMENT_AGREED: { label: "Delivery Agreed", variant: "secondary" },
    PICKUP_SCHEDULED: { label: "Pickup Scheduled", variant: "secondary" },
    PICKED_UP: { label: "Picked Up", variant: "secondary" },
    IN_TRANSIT: { label: "In Transit", variant: "secondary" },
    DELIVERED_PENDING_CONFIRMATION: { label: "Delivered (Pending)", variant: "secondary" },
    FULFILLED: { label: "Completed & Closed", variant: "default" },
    FAILED: { label: "Delivery Failed", variant: "destructive" },
    CANCELLED: { label: "Match Cancelled", variant: "destructive" },
    REJECTED: { label: "Match Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

function getRequestStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    DRAFT: { label: "Draft", variant: "outline" },
    PENDING_VERIFICATION: { label: "Under Verification", variant: "outline" },
    VERIFIED_PRIVATE_MATCHING: { label: "Matching Privately", variant: "secondary" },
    POTENTIAL_MATCH_FOUND: { label: "Match Found", variant: "secondary" },
    AWAITING_MATCH_APPROVAL: { label: "Match Pending Approval", variant: "secondary" },
    PUBLICATION_CONSENT_REQUIRED: { label: "Consent Needed", variant: "secondary" },
    PUBLIC_REQUEST: { label: "Public Appeal", variant: "default" },
    RESERVED: { label: "Reserved", variant: "outline" },
    FULFILMENT_IN_PROGRESS: { label: "Fulfilment In Progress", variant: "secondary" },
    FULFILLED: { label: "Completed", variant: "default" },
    EXPIRED: { label: "Expired", variant: "outline" },
    REJECTED: { label: "Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

/* ─────────────────────────────────────────────────────────────────────────
   Dedicated Donee Dashboard — shown instead of the donor layout for DONEE role
───────────────────────────────────────────────────────────────────────────── */
function DoneeDashboard({
  user,
  myProfile,
  itemRequests,
  doneeMatches,
  onRefresh,
}: {
  user: { email: string; role: string };
  myProfile: UserProfile;
  itemRequests: ItemRequest[];
  doneeMatches: ItemMatch[];
  onRefresh: () => Promise<void>;
}) {
  const [matchActionLoading, setMatchActionLoading] = useState<number | null>(null);
  const [verifyMatchId, setVerifyMatchId] = useState<number | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleDoneeAccept = async (id: number) => {
    setMatchActionLoading(id);
    try {
      await doneeAcceptMatch(id);
      toast.success("Match accepted! Logistics will be arranged next.");
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to accept match");
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handleDoneeReject = async (id: number) => {
    setMatchActionLoading(id);
    try {
      await doneeRejectMatch(id);
      toast.success("Match declined.");
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to decline match");
    } finally {
      setMatchActionLoading(null);
    }
  };

  const activeRequests = itemRequests.filter(
    r => !["FULFILLED", "REJECTED", "EXPIRED"].includes(r.status)
  );
  const fulfilledRequests = itemRequests.filter(r => r.status === "FULFILLED");
  const activeMatches = doneeMatches.filter(
    m => !["FULFILLED", "CANCELLED", "REJECTED", "FAILED"].includes(m.status)
  );

  return (
    <div className="min-h-screen bg-[#eef3f9] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-16">

      {/* ── Hero header — ink/blue theme ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1e36] via-[#1e3a60] to-[#0a2040] text-white py-12 px-4 shadow-lg">
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-[#f0b97a]/6 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b97a]/25 to-transparent" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-[#f0b97a]/15 border border-[#f0b97a]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Donee
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Your Needs
              </h1>
              <p className="text-white/55 text-sm">
                {activeRequests.length > 0
                  ? `${activeRequests.length} active request${activeRequests.length !== 1 ? "s" : ""} · Scanning for matches near you`
                  : `Hello, ${myProfile.fullName?.split(" ")[0] || user.email.split("@")[0]} — start by posting a need`}
              </p>
            </div>
            <Link href="/requests/new">
              <Button className="bg-[#f0b97a] hover:bg-[#e0a86a] text-stone-950 font-extrabold rounded-2xl px-6 py-3 h-auto text-sm flex items-center gap-2 shadow-xl shadow-[#f0b97a]/20 shrink-0">
                <Plus className="w-4 h-4" /> Post a Need
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Profile strip ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#1e3a60]/10 dark:bg-zinc-800 flex items-center justify-center font-black text-lg text-[#1e3a60] dark:text-blue-400 shrink-0">
            {getInitials(myProfile.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 dark:text-white truncate">{myProfile.fullName}</p>
            <p className="text-xs text-stone-400 truncate">{user.email}</p>
          </div>
          {myProfile.city && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#1e3a60]" />
              {myProfile.city}
            </div>
          )}
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-[#1e3a60] dark:hover:text-blue-400 shrink-0">
              Edit Profile
            </Button>
          </Link>
        </div>

        {/* ── Stats row ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-5 shadow-sm flex items-center gap-4"
            style={{ borderLeft: "3px solid #1e3a60" }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#1e3a60]/10 flex items-center justify-center text-[#1e3a60] shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Needs Posted</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{itemRequests.length}</p>
            </div>
          </div>

          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-5 shadow-sm flex items-center gap-4"
            style={{ borderLeft: "3px solid #f0b97a" }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0b97a]/15 flex items-center justify-center text-[#b04a15] shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Active Matches</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{activeMatches.length}</p>
            </div>
          </div>

          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800 p-5 shadow-sm flex items-center gap-4"
            style={{ borderLeft: "3px solid #10b981" }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Needs Fulfilled</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{fulfilledRequests.length}</p>
            </div>
          </div>
        </div>

        {/* ── Requests + Matches grid ── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* My Requests */}
          <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1e3a60]" />
            <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none leading-none">01</div>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 relative z-10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1e3a60]" /> My Requests
              </CardTitle>
              <Link href="/requests/new">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-[#1e3a60] hover:text-[#1e3a60]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              {itemRequests.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 bg-[#1e3a60]/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6 text-[#1e3a60]" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No needs posted yet</p>
                  <p className="text-xs text-stone-400 max-w-[220px] mx-auto">Tell us what you need — books, clothes, medical supplies — and we&apos;ll find donors nearby.</p>
                  <Link href="/requests/new">
                    <Button size="sm" className="bg-[#1e3a60] hover:bg-[#162d4a] text-white mt-2">Post your first need</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y dark:divide-zinc-800">
                  {itemRequests.map(r => {
                    const badge = getRequestStatusBadge(r.status);
                    return (
                      <div key={r.id} className="py-3 flex items-start justify-between gap-3 group hover:bg-stone-50 dark:hover:bg-zinc-800/40 px-1 rounded-xl transition-all">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#1e3a60] dark:group-hover:text-blue-400 transition-colors truncate">
                            <TranslatedText text={r.title} />
                          </p>
                          <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5 flex-wrap">
                            <span><TranslatedText text={r.category} /></span>
                            <span>·</span>
                            <span>Qty: {r.quantity}</span>
                            <span>·</span>
                            <span className="capitalize">{r.urgency.toLowerCase()}</span>
                          </div>
                        </div>
                        <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap shrink-0">{badge.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match Status */}
          <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f0b97a]" />
            <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none leading-none">02</div>
            <CardHeader className="border-b pb-4 relative z-10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Handshake className="w-4 h-4 text-[#b04a15]" /> Match Status
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              {doneeMatches.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 bg-[#f0b97a]/15 rounded-2xl flex items-center justify-center mx-auto">
                    <Handshake className="w-6 h-6 text-[#b04a15]" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No matches yet</p>
                  <p className="text-xs text-stone-400 max-w-[240px] mx-auto">Our system is scanning donor inventories for items that match your needs. Check back soon.</p>
                </div>
              ) : (
                <div className="divide-y dark:divide-zinc-800 space-y-3">
                  {doneeMatches.map(m => {
                    const badge = getFulfilmentStatusBadge(m.status);
                    return (
                      <div key={m.id} className="pt-3 first:pt-0 space-y-2 group px-1 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#b04a15] transition-colors truncate">
                              <TranslatedText text={m.listingTitle || "Matched item"} />
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5 truncate">For: <TranslatedText text={m.requestTitle || ""} /></p>
                          </div>
                          <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap shrink-0">{badge.label}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs bg-stone-50 dark:bg-zinc-950 p-2.5 rounded-xl">
                          <div><p className="text-stone-400">Donor</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                          {m.matchScore && (<div className="text-right"><p className="text-stone-400">AI Match</p><p className="font-bold text-[#1e3a60] dark:text-blue-400">{m.matchScore}%</p></div>)}
                        </div>
                        {m.status === "AWAITING_DONEE_CONFIRMATION" && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                              disabled={matchActionLoading === m.id}
                              onClick={() => handleDoneeAccept(m.id)}
                            >
                              {matchActionLoading === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Accept</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg"
                              disabled={matchActionLoading === m.id}
                              onClick={() => handleDoneeReject(m.id)}
                            >
                              {matchActionLoading === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Decline</>}
                            </Button>
                          </div>
                        )}
                        {m.status === "TRANSPORT_DISCUSSION" && (
                          <div className="flex justify-end pt-1">
                            <Button size="sm" onClick={async () => { try { await requestCallMasking(m.id); toast.success("Call request sent!"); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } }} className="bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold rounded-lg"><Phone className="w-3 h-3 mr-1" />Contact Donor (Masked)</Button>
                          </div>
                        )}
                        {(m.status === "DELIVERED_PENDING_CONFIRMATION" || m.status === "IN_TRANSIT" || m.status === "PICKED_UP") && (
                          <div className="pt-1 space-y-2">
                            <p className="text-xs font-semibold text-emerald-700">Item is on the way — enter the OTP from the donor to confirm receipt</p>
                            {verifyMatchId === m.id ? (
                              <div className="space-y-2">
                                <input type="text" maxLength={6} placeholder="Enter 6-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ""))} className="w-full text-center text-lg font-bold tracking-widest border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                <div className="flex gap-2">
                                  <button disabled={verifyLoading || otpInput.length !== 6} onClick={async () => { setVerifyLoading(true); try { await verifyDeliveryMatch(m.id, { verificationMethod: "OTP", otp: otpInput }); toast.success("Delivery confirmed! Match completed."); setVerifyMatchId(null); setOtpInput(""); await onRefresh(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "OTP verification failed"); } finally { setVerifyLoading(false); } }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                    {verifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Confirm Receipt"}
                                  </button>
                                  <button onClick={() => { setVerifyMatchId(null); setOtpInput(""); }} className="px-3 text-xs text-stone-500 border border-stone-200 dark:border-zinc-700 rounded-lg">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setVerifyMatchId(m.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                Enter OTP to Confirm Receipt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"donor" | "donee">("donor");

  // Donor review state
  const [declineMatchId, setDeclineMatchId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState<number | null>(null);

  // Logistics form state
  const [logisticsMatchId, setLogisticsMatchId] = useState<number | null>(null);
  const [logisticsForm, setLogisticsForm] = useState({ handoverMethod: "IN_PERSON", pickupDateTime: "", handoverAddress: "", notes: "" });
  const [logisticsLoading, setLogisticsLoading] = useState(false);

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState<{ matchId: number; otp: string } | null>(null);
  const [otpLoading, setOtpLoading] = useState<number | null>(null);


  const refreshMatches = async () => {
    try { const fresh = await getMyMatches(); setMatches(fresh); } catch { /* silent */ }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }

    Promise.all([
      getMyProfile().then((p) => {
        setMyProfile(p);
        if (p.role === "DONEE") setActiveTab("donee");
      }).catch(() => {}),
      getMyItemListings().then(setItemListings).catch(() => setItemListings([])),
      getMyItemRequests().then(setItemRequests).catch(() => setItemRequests([])),
      getMyMatches().then(setMatches).catch(() => setMatches([])),
    ])
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  const donorMatches = useMemo(() => {
    if (!myProfile) return [];
    return matches.filter(m => m.donorName === myProfile.fullName);
  }, [matches, myProfile]);

  const doneeMatches = useMemo(() => {
    if (!myProfile) return [];
    return matches.filter(m => m.doneeName === myProfile.fullName);
  }, [matches, myProfile]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Dedicated donee UI
  if (myProfile?.role === "DONEE") {
    return (
      <DoneeDashboard
        user={user}
        myProfile={myProfile}
        itemRequests={itemRequests}
        doneeMatches={doneeMatches}
        onRefresh={refreshMatches}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-12">
      {/* Header and Welcome */}
      <div className="bg-[#1e2d10] bg-gradient-to-r from-[#0f1d30] via-[#1c0905] to-[#1e2d10] text-white py-10 px-4 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-2xl pointer-events-none" />
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#b04a15]/20 border border-[#b04a15]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> India verified setup
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Your Dashboard</h1>
              <p className="text-white/60 text-sm mt-1">Logged in as {user.email}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new">
                  <Button className="bg-[#b04a15] hover:bg-[#943e11] text-white font-bold rounded-xl px-5 py-2.5 h-auto btn-shine flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> List Item Privately
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <Link href="/requests/new">
                  <Button className="bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl px-5 py-2.5 h-auto flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> Post a Need
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* LEFT: Sticky Sidebar */}
          <aside className="lg:sticky lg:top-24 bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 space-y-6 relative overflow-hidden">
            {/* Left accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#b04a15]" />
            
            {/* Avatar & Initials */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#b04a15]/10 text-[#b04a15] dark:bg-zinc-850 flex items-center justify-center shadow-inner font-black text-xl">
                {myProfile ? getInitials(myProfile.fullName) : "U"}
              </div>
              <div>
                <h2 className="text-lg font-black text-stone-900 dark:text-white leading-tight">
                  {myProfile?.fullName || user.email?.split("@")[0]}
                </h2>
                <div className="inline-block mt-1 bg-[#b04a15]/10 text-[#b04a15] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {myProfile?.role ?? "DONOR"}
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <Mail className="w-3.5 h-3.5 text-[#b04a15]" />
                <span className="truncate">{user.email}</span>
              </div>
              {myProfile?.phone && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <Phone className="w-3.5 h-3.5 text-[#b04a15]" />
                  <span>{myProfile.phone}</span>
                </div>
              )}
              {myProfile?.city && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-[#b04a15]" />
                  <span>{myProfile.city}</span>
                </div>
              )}
            </div>

            {/* Quick Actions inside sidebar */}
            <div className="border-t border-stone-100 dark:border-zinc-850 pt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">Quick Actions</p>
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new" className="block w-full">
                  <Button className="w-full bg-[#b04a15] hover:bg-[#943e11] text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> List Item
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <Link href="/requests/new" className="block w-full">
                  <Button className="w-full bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Post a Need
                  </Button>
                </Link>
              )}
            </div>

            {/* Admin Switcher inside sidebar */}
            {myProfile?.role === "ADMIN" && (
              <div className="border-t border-stone-100 dark:border-zinc-800 pt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">View Mode</p>
                <div className="grid grid-cols-2 gap-1 bg-stone-50 dark:bg-zinc-950 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("donor")}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === "donor" ? "bg-[#b04a15] text-white" : "text-stone-500"
                    }`}
                  >
                    Donor
                  </button>
                  <button
                    onClick={() => setActiveTab("donee")}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === "donee" ? "bg-[#b04a15] text-white" : "text-stone-500"
                    }`}
                  >
                    Donee
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT: Main Dashboard Content */}
          <div className="space-y-6">
            
            {/* Tab Content */}
            {activeTab === "donor" ? (
              /* DONOR DASHBOARD VIEW */
              <div className="space-y-6">
                
                {/* Stats Row */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b04a15]" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-orange-100 text-[#b04a15] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Private Inventory Items</p>
                        <p className="text-xl font-bold">{itemListings.length}</p>
                      </div>
                    </CardContent>
                  </Card>


                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Active Match Handovers</p>
                        <p className="text-xl font-bold">{donorMatches.filter(m => m.status === "FULFILLED").length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Reliability Score</p>
                        <p className="text-xl font-bold">100%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Donor Listings & Donor Matches Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  
                  {/* Private Inventory */}
                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-[#b04a15]" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">01</div>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-stone-400" /> My Private Inventory
                      </CardTitle>
                      <Link href="/items/new">
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {itemListings.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">You haven&apos;t listed any items to donate yet.</p>
                          <Link href="/items/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[#b04a15] text-white">List your first item</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y space-y-3">
                          {itemListings.map((l) => (
                            <div key={l.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 group hover:bg-stone-50 dark:hover:bg-zinc-800/40 p-2 rounded-xl transition-all">
                              <div>
                                <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#b04a15] transition-colors"><TranslatedText text={l.title} /></p>
                                <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
                                  <span><TranslatedText text={l.city} /></span>
                                  <span>•</span>
                                  <span>Qty: {l.quantity}</span>
                                  {l.maximumDeliveryRadius && (
                                    <>
                                      <span>•</span>
                                      <span>Radius: {l.maximumDeliveryRadius}km</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant={l.status === "AVAILABLE" ? "default" : "secondary"} className="text-[10px]">
                                {l.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>


                  {/* Donor Matches */}
                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-emerald-500" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">02</div>
                    <CardHeader className="border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold">Donation Match Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {donorMatches.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">No active match proposals for your items yet.</p>
                          <p className="text-xs text-stone-400/80 mt-1">When matching needs are submitted, matches will appear here.</p>
                        </div>
                      ) : (
                        <div className="divide-y space-y-4">
                          {donorMatches.map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            const isDonorReview = m.status === "DONOR_REVIEW";
                            const isDeclining = declineMatchId === m.id;
                            return (
                              <div key={m.id} className={`pt-4 first:pt-0 space-y-2 group p-2 rounded-xl transition-all ${isDonorReview ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "hover:bg-stone-50 dark:hover:bg-zinc-800/40"}`}>
                                {isDonorReview && (
                                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold pb-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Action Required — Please confirm this donation
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className={`font-bold text-sm text-stone-900 dark:text-stone-100 transition-colors ${isDonorReview ? "" : "group-hover:text-emerald-500"}`}>
                                      Matched need for: <TranslatedText text={m.requestTitle || "Requested Need"} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5">Matched with item: <TranslatedText text={m.listingTitle || ""} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500">Recipient Donee</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.doneeName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500">AI Score</p><p className="font-bold text-[#b04a15]">{m.matchScore}%</p></div>)}
                                </div>
                                {isDonorReview && (
                                  <div className="space-y-2 pt-1">
                                    {!isDeclining ? (
                                      <div className="flex gap-2">
                                        <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorAcceptMatch(m.id); toast.success("Match accepted! Admin will review shortly."); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to accept match"); } finally { setReviewLoading(null); }}} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          {reviewLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />} Accept
                                        </button>
                                        <button disabled={reviewLoading === m.id} onClick={() => { setDeclineMatchId(m.id); setDeclineReason(""); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          <ThumbsDown className="w-3.5 h-3.5" /> Decline
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <input type="text" placeholder="Optional reason for declining..." value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
                                        <div className="flex gap-2">
                                          <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorRejectMatch(m.id, declineReason || undefined); toast.success("Match declined. We're finding the next best donor."); setDeclineMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to decline match"); } finally { setReviewLoading(null); }}} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                            {reviewLoading === m.id ? "Declining..." : "Confirm Decline"}
                                          </button>
                                          <button onClick={() => setDeclineMatchId(null)} className="px-3 py-2 text-xs text-stone-500 hover:text-stone-800 rounded-lg border border-stone-200 dark:border-zinc-700">Cancel</button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {m.status === "DONEE_ACCEPTED" && (
                                  <div className="space-y-1 pt-1">
                                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Donee confirmed — please give your final confirmation
                                    </p>
                                    <button
                                      disabled={reviewLoading === m.id}
                                      onClick={async () => {
                                        setReviewLoading(m.id);
                                        try {
                                          await donorConfirmMatch(m.id);
                                          toast.success("Donation confirmed! Logistics will be arranged next.");
                                          await refreshMatches();
                                        } catch (e: unknown) {
                                          toast.error(e instanceof Error ? e.message : "Failed to confirm");
                                        } finally { setReviewLoading(null); }
                                      }}
                                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      {reviewLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Confirm Donation</>}
                                    </button>
                                  </div>
                                )}
                                {m.status === "BOTH_PARTIES_ACCEPTED" && (
                                  <div className="pt-1 space-y-2">
                                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Calendar className="w-3 h-3" /> Set pickup details to confirm logistics</p>
                                    {logisticsMatchId === m.id ? (
                                      <div className="space-y-2 bg-blue-50 dark:bg-zinc-800 p-3 rounded-xl">
                                        <select value={logisticsForm.handoverMethod} onChange={e => setLogisticsForm(f => ({ ...f, handoverMethod: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900">
                                          <option value="IN_PERSON">In Person</option>
                                          <option value="COURIER">Courier</option>
                                          <option value="THIRD_PARTY">Third Party</option>
                                        </select>
                                        <input type="datetime-local" value={logisticsForm.pickupDateTime} onChange={e => setLogisticsForm(f => ({ ...f, pickupDateTime: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                        <input type="text" placeholder="Pickup address (optional)" value={logisticsForm.handoverAddress} onChange={e => setLogisticsForm(f => ({ ...f, handoverAddress: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                        <input type="text" placeholder="Notes (optional)" value={logisticsForm.notes} onChange={e => setLogisticsForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                        <div className="flex gap-2">
                                          <button disabled={logisticsLoading || !logisticsForm.pickupDateTime} onClick={async () => { setLogisticsLoading(true); try { await saveMatchLogistics(m.id, { handoverMethod: logisticsForm.handoverMethod, pickupDateTime: logisticsForm.pickupDateTime, handoverAddress: logisticsForm.handoverAddress || undefined, notes: logisticsForm.notes || undefined }); toast.success("Logistics saved!"); setLogisticsMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to save logistics"); } finally { setLogisticsLoading(false); } }} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                            {logisticsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Save Logistics"}
                                          </button>
                                          <button onClick={() => setLogisticsMatchId(null)} className="px-3 text-xs text-stone-500 border border-stone-200 dark:border-zinc-700 rounded-lg">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setLogisticsMatchId(m.id); setLogisticsForm({ handoverMethod: "IN_PERSON", pickupDateTime: "", handoverAddress: "", notes: "" }); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                        Set Pickup Details
                                      </button>
                                    )}
                                  </div>
                                )}
                                {(m.status === "LOGISTICS_CONFIRMED" || m.status === "PICKUP_SCHEDULED" || m.status === "PICKED_UP" || m.status === "IN_TRANSIT" || m.status === "DELIVERED_PENDING_CONFIRMATION") && (
                                  <div className="pt-1 space-y-2">
                                    {m.pickupDateTime && <p className="text-xs text-stone-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Pickup: {new Date(m.pickupDateTime).toLocaleString()}</p>}
                                    {generatedOtp?.matchId === m.id ? (
                                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl p-3 text-center">
                                        <p className="text-xs text-stone-500 mb-1">Share this OTP with the recipient for delivery confirmation</p>
                                        <p className="text-3xl font-black tracking-widest text-emerald-700">{generatedOtp.otp}</p>
                                        <button onClick={() => setGeneratedOtp(null)} className="mt-2 text-xs text-stone-400 underline">Hide OTP</button>
                                      </div>
                                    ) : (
                                      <button disabled={otpLoading === m.id} onClick={async () => { setOtpLoading(m.id); try { const res = await generateDeliveryOtp(m.id); setGeneratedOtp({ matchId: m.id, otp: res.otp }); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to generate OTP"); } finally { setOtpLoading(null); } }} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5">
                                        {otpLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Generate Delivery OTP"}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {(m.status === "TRANSPORT_DISCUSSION" || m.status === "BOTH_PARTIES_ACCEPTED" || m.status === "LOGISTICS_CONFIRMED") && (
                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button size="sm" onClick={async () => { try { await requestCallMasking(m.id); toast.success("Call request sent — recipient will be notified."); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } }} className="bg-[#b04a15] text-white text-xs font-bold rounded-lg flex items-center gap-1"><Phone className="w-3 h-3" /> Call Recipient (Masked)</Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

              </div>
            ) : (
              /* DONEE DASHBOARD VIEW */
              <div className="space-y-6">
                
                {/* Stats Row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b04a15]" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-orange-100 text-[#b04a15] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Total Needs Posted</p>
                        <p className="text-xl font-bold">{itemRequests.length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Fulfilled Needs</p>
                        <p className="text-xl font-bold">{itemRequests.filter(r => r.status === "FULFILLED").length}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Donee Requests & Donee Matches Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  
                  {/* Requests list */}
                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-[#b04a15]" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">01</div>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold">My Needs & Requests</CardTitle>
                      <Link href="/requests/new">
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">
                          <Plus className="w-3.5 h-3.5 mr-1" /> New Need
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {itemRequests.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">You haven&apos;t posted any needs yet.</p>
                          <Link href="/requests/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[#b04a15] text-white">Post your first need</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y space-y-3">
                          {itemRequests.map((r) => {
                            const badge = getRequestStatusBadge(r.status);
                            return (
                              <div key={r.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
                                <div>
                                  <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#b04a15] transition-colors"><TranslatedText text={r.title} /></p>
                                  <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
                                    <span><TranslatedText text={r.category} /></span>
                                    <span>•</span>
                                    <span>Qty: {r.quantity}</span>
                                    <span>•</span>
                                    <span className="capitalize">{r.urgency.toLowerCase()} urgency</span>
                                  </div>
                                </div>
                                <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">
                                  {badge.label}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Donee Matches */}
                  <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-emerald-500" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">02</div>
                    <CardHeader className="border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold">Matches &amp; Handover Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {doneeMatches.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">No active matches found for your requests yet.</p>
                          <p className="text-xs text-stone-400/80 mt-1">We are actively checking private inventory to find matching items.</p>
                        </div>
                      ) : (
                        <div className="divide-y space-y-4">
                          {doneeMatches.map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            return (
                              <div key={m.id} className="pt-4 first:pt-0 space-y-2 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-550 transition-colors">
                                      Matched item: <TranslatedText text={m.listingTitle || "Donated Item"} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5">For your need: <TranslatedText text={m.requestTitle || ""} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500">Donor</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500">AI Score</p><p className="font-bold text-[#b04a15]">{m.matchScore}%</p></div>)}
                                </div>
                                {m.status === "TRANSPORT_DISCUSSION" && (
                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button size="sm" className="bg-[#b04a15] text-white text-xs font-bold rounded-lg flex items-center gap-1">Call Donor (Masked)</Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
