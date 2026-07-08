"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing, adminMarkListingNeedsInformation, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, adminGetMatchHistory, type ItemMatch, type StatusHistoryEntry,
  adminGetAllOffers,
  adminGetAllAiAssessments, type AiAssessmentResponse,
  adminGetListingAiReview, adminGetItemRequestAiReview, type AdminAiReviewResponse,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { OffersQueuePanel } from "../offers/OffersQueuePanel";
import {
  Bot, Check, ChevronDown, ChevronUp, ClipboardList, Clock, Gift, Handshake,
  Image as ImageIcon, Loader2, LogOut, MapPin, Megaphone, MessageSquare,
  Package, Phone, RefreshCw, Search, ShieldCheck, Tag, Truck, UserRound, X,
  type LucideIcon,
} from "lucide-react";

type TabKey = "campaigns" | "requests" | "listings" | "matches" | "offers" | "match-history" | "ai-logs";
type RejectType = "campaign" | "request" | "listing" | "match";
type DetailSelection =
  | { type: "request"; item: ItemRequest }
  | { type: "listing"; item: ItemListing }
  | { type: "match"; item: ItemMatch };

const STATUS_COLORS: Record<string, string> = {
  DONOR_REVIEW: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  AWAITING_DONEE_CONFIRMATION: "bg-blue-100 text-blue-800",
  DONEE_ACCEPTED: "bg-cyan-100 text-cyan-800",
  BOTH_PARTIES_ACCEPTED: "bg-indigo-100 text-indigo-800",
  LOGISTICS_CONFIRMED: "bg-violet-100 text-violet-800",
  TRANSPORT_DISCUSSION: "bg-purple-100 text-purple-800",
  PICKUP_SCHEDULED: "bg-orange-100 text-orange-800",
  PICKED_UP: "bg-lime-100 text-lime-800",
  IN_TRANSIT: "bg-teal-100 text-teal-800",
  DELIVERED_PENDING_CONFIRMATION: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  FULFILLED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  DONOR_REJECTED: "bg-red-100 text-red-800",
};

const ALL_MATCH_STATUSES = [
  "ALL", "PENDING_APPROVAL", "AWAITING_DONEE_CONFIRMATION", "DONEE_ACCEPTED",
  "BOTH_PARTIES_ACCEPTED", "LOGISTICS_CONFIRMED", "IN_TRANSIT", "COMPLETED",
  "REJECTED", "CANCELLED",
];

const AI_REC_FILTERS = ["ALL", "APPROVE", "REJECT", "MANUAL_REVIEW", "REQUEST_INFORMATION"];
const REC_BADGE: Record<string, string> = {
  APPROVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECT: "bg-red-100 text-red-800 border-red-300",
  MANUAL_REVIEW: "bg-orange-100 text-orange-800 border-orange-300",
  REQUEST_INFORMATION: "bg-amber-100 text-amber-800 border-amber-300",
};
const FRAUD_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-300",
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

function formatEnum(value?: string | null) {
  if (!value) return null;
  return value.replace(/[_|]/g, " ").replace(/\s+/g, " ").trim();
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCoordinates(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function splitValues(value?: string | null, separator: "," | "|" = ",") {
  if (!value) return [];
  return value.split(separator).map(v => v.trim()).filter(Boolean);
}

function listingPhotos(listing: ItemListing) {
  return [listing.imageUrl, ...(listing.imageUrls ? listing.imageUrls.split("|") : [])]
    .filter(Boolean) as string[];
}

function matchListingPhotos(match: ItemMatch) {
  return [match.listingImageUrl, ...(match.listingImageUrls ? match.listingImageUrls.split("|") : [])]
    .filter(Boolean) as string[];
}

export default function AdminDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEntityUpdates(["CAMPAIGN", "REQUEST", "LISTING", "MATCH", "OFFER"], () => {
    loadData();
  });

  // ── Approval queue state ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [listings, setListings] = useState<ItemListing[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [offersNeedingAction, setOffersNeedingAction] = useState(0);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("campaigns");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectType, setRejectType] = useState<RejectType | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [needsInfoId, setNeedsInfoId] = useState<number | null>(null);
  const [needsInfoNote, setNeedsInfoNote] = useState("");
  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(null);

  // ── Match History state ──
  const [allMatches, setAllMatches] = useState<ItemMatch[]>([]);
  const [allMatchesLoaded, setAllMatchesLoaded] = useState(false);
  const [allMatchesLoading, setAllMatchesLoading] = useState(false);
  const [matchHistoryStatus, setMatchHistoryStatus] = useState("ALL");
  const [matchExpandedId, setMatchExpandedId] = useState<number | null>(null);
  const [matchStatusHistory, setMatchStatusHistory] = useState<Record<number, StatusHistoryEntry[]>>({});
  const [matchHistoryLoadingId, setMatchHistoryLoadingId] = useState<number | null>(null);

  // ── AI Logs state ──
  const [assessments, setAssessments] = useState<AiAssessmentResponse[]>([]);
  const [assessmentsLoaded, setAssessmentsLoaded] = useState(false);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [aiSearch, setAiSearch] = useState("");
  const [aiRecFilter, setAiRecFilter] = useState("ALL");
  const [aiFraudFilter, setAiFraudFilter] = useState("ALL");
  const [aiExpandedId, setAiExpandedId] = useState<number | null>(null);

  // ── Data loading ──
  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminGetCampaigns("PENDING_APPROVAL"),
      adminGetItemRequests("PENDING_VERIFICATION"),
      Promise.all([
        adminGetItemListings("SUBMITTED"),
        adminGetItemListings("MANUAL_REVIEW"),
      ]).then(([submitted, manual]) => [...submitted, ...manual]),
      adminGetMatches("PENDING_APPROVAL"),
      // Offers tab manages its own list/loading inside OffersQueuePanel — just need the
      // count here for the tab badge, matching that panel's own "Needs Action" filter.
      Promise.all([
        adminGetAllOffers("DONOR_RECONFIRMED"),
        adminGetAllOffers("PENDING_ADMIN_APPROVAL"),
      ]).then(([a, b]) => a.length + b.length),
    ]).then(([c, r, l, m, offerCount]) => {
      setCampaigns(c); setRequests(r); setListings(l as ItemListing[]); setMatches(m);
      setOffersNeedingAction(offerCount);
    }).catch(() => toast.error("Failed to load approval queue"))
      .finally(() => setLoading(false));
  }, []);

  async function loadAllMatches(status?: string) {
    setAllMatchesLoading(true);
    try {
      const data = await adminGetMatches(status === "ALL" || !status ? undefined : status);
      setAllMatches(data);
      setAllMatchesLoaded(true);
    } catch { toast.error("Failed to load match history"); }
    finally { setAllMatchesLoading(false); }
  }

  async function loadAiLogs() {
    setAssessmentsLoading(true);
    try {
      const data = await adminGetAllAiAssessments();
      setAssessments(data);
      setAssessmentsLoaded(true);
    } catch { toast.error("Failed to load AI assessment logs"); }
    finally { setAssessmentsLoading(false); }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    loadData();
  }, [user, isLoading, router, loadData]);

  useEffect(() => {
    if (tab === "match-history" && !allMatchesLoaded) loadAllMatches();
    if (tab === "ai-logs" && !assessmentsLoaded) loadAiLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Match history helpers ──
  async function handleMatchHistoryFilter(status: string) {
    setMatchHistoryStatus(status);
    await loadAllMatches(status);
  }

  async function toggleMatchExpand(id: number) {
    if (matchExpandedId === id) { setMatchExpandedId(null); return; }
    setMatchExpandedId(id);
    if (!matchStatusHistory[id]) {
      setMatchHistoryLoadingId(id);
      try {
        const h = await adminGetMatchHistory(id);
        setMatchStatusHistory(prev => ({ ...prev, [id]: h }));
      } catch { toast.error("Failed to load history"); }
      finally { setMatchHistoryLoadingId(null); }
    }
  }

  // ── AI logs filtering ──
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      if (aiRecFilter !== "ALL" && a.recommendation !== aiRecFilter) return false;
      if (aiFraudFilter !== "ALL" && a.fraudRisk !== aiFraudFilter) return false;
      if (aiSearch.trim()) {
        const q = aiSearch.toLowerCase();
        return (
          a.listingTitle?.toLowerCase().includes(q) ||
          a.recommendation?.toLowerCase().includes(q) ||
          a.evidenceNotes?.toLowerCase().includes(q) ||
          a.detectedLabels?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assessments, aiRecFilter, aiFraudFilter, aiSearch]);

  // ── Approval queue handlers ──
  function openReject(id: number, type: RejectType) {
    setRejectId(id); setRejectType(type); setRejectReason("");
    setNeedsInfoId(null);
  }
  function cancelReject() { setRejectId(null); setRejectType(null); setRejectReason(""); }

  async function handleNeedsInformation(id: number) {
    if (!needsInfoNote.trim()) { toast.error("Please enter the information needed from the donor."); return; }
    setProcessing(id);
    try {
      await adminMarkListingNeedsInformation(id, needsInfoNote.trim());
      setListings(p => p.filter(l => l.id !== id));
      setNeedsInfoId(null); setNeedsInfoNote("");
      toast.success("Listing returned to donor for more information.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveCampaign(id: number) {
    setProcessing(id);
    try {
      await approveCampaign(id);
      setCampaigns(p => p.filter(c => c.id !== id));
      toast.success("Campaign approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectCampaign(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await rejectCampaign(id, rejectReason.trim());
      setCampaigns(p => p.filter(c => c.id !== id));
      cancelReject(); toast.success("Campaign rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveRequest(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemRequest(id);
      setRequests(p => p.filter(r => r.id !== id));
      toast.success("Request approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectRequest(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectItemRequest(id, rejectReason.trim());
      setRequests(p => p.filter(r => r.id !== id));
      cancelReject(); toast.success("Request rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveListing(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemListing(id);
      setListings(p => p.filter(l => l.id !== id));
      toast.success("Listing approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectListing(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectItemListing(id, rejectReason.trim());
      setListings(p => p.filter(l => l.id !== id));
      cancelReject(); toast.success("Listing rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveMatch(id: number) {
    setProcessing(id);
    try {
      await adminApproveMatch(id);
      setMatches(p => p.filter(m => m.id !== id));
      toast.success("Match approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectMatch(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectMatch(id, rejectReason.trim());
      setMatches(p => p.filter(m => m.id !== id));
      cancelReject(); toast.success("Match rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#12101a]">
        <Loader2 className="w-7 h-7 animate-spin text-[#b04a15]" />
      </div>
    );
  }
  if (!user) return null;

  const total = campaigns.length + requests.length + listings.length + matches.length + offersNeedingAction;
  const isReportTab = tab === "match-history" || tab === "ai-logs";

  const TABS = [
    { key: "campaigns" as TabKey, label: "Campaigns",    count: campaigns.length,   icon: Megaphone,     color: "#e07b3a" },
    { key: "requests"  as TabKey, label: "Requests",     count: requests.length,    icon: ClipboardList,  color: "#60a5fa" },
    { key: "listings"  as TabKey, label: "Listings",     count: listings.length,    icon: Package,        color: "#a78bfa" },
    { key: "matches"   as TabKey, label: "Matches",      count: matches.length,     icon: Handshake,      color: "#34d399" },
    { key: "offers"    as TabKey, label: "Offers",       count: offersNeedingAction, icon: Gift,          color: "#f472b6" },
  ];

  const headerTitle = tab === "match-history" ? "Match History"
    : tab === "ai-logs" ? "AI Screening Logs"
    : "Approval Queue";

  const headerSubtitle = tab === "match-history"
    ? `${allMatches.length} match${allMatches.length !== 1 ? "es" : ""} · complete lifecycle view`
    : tab === "ai-logs"
    ? `${assessments.length} assessment${assessments.length !== 1 ? "s" : ""} across all listings`
    : loading ? "Loading..." : total > 0
      ? `${total} item${total !== 1 ? "s" : ""} awaiting your review`
      : "All clear — nothing pending";

  return (
    <div className="min-h-screen flex bg-[#12101a]">
      {/* ── DARK LEFT SIDEBAR ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[296px] shrink-0 flex-col min-h-screen fixed left-0 top-0 bottom-0 z-10 border-r border-white/[0.07]"
        style={{ background: "linear-gradient(180deg, #17141f 0%, #12101a 100%)" }}>

        {/* Brand strip */}
        <div className="px-7 pt-8 pb-6 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #b04a15 0%, #e07b3a 100%)" }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-black text-white leading-none tracking-tight">CauseKind</p>
              <p className="text-[11px] text-[#b04a15] font-bold uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Admin identity card */}
        <div className="px-5 pt-5 pb-2">
          <div className="rounded-xl px-4 py-3.5 border border-white/[0.07]"
            style={{ background: "rgba(176,74,21,0.08)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#b04a15]/70 mb-1">Signed in as</p>
            <p className="text-sm font-semibold text-stone-200 truncate">{user.email}</p>
            <div className="inline-flex items-center gap-1.5 mt-2 bg-[#b04a15]/20 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b04a15] animate-pulse" />
              <span className="text-[10px] font-black text-[#b04a15] uppercase tracking-wide">Admin</span>
            </div>
          </div>
        </div>

        {/* Queue count pills */}
        <div className="px-5 pt-5 space-y-2 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-1 pb-1">Pending Review</p>
          {TABS.map(({ key, label, count, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all border ${
                tab === key
                  ? "border-[#b04a15]/40"
                  : "border-white/[0.05] hover:border-white/10"
              }`}
              style={{ background: tab === key ? "rgba(176,74,21,0.12)" : "rgba(255,255,255,0.025)" }}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" style={{ color: tab === key ? "#b04a15" : color }} />
                <span className={`text-sm font-semibold ${tab === key ? "text-white" : "text-stone-400"}`}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                {count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#b04a15] animate-pulse shrink-0" />}
                <span className="text-lg font-black tabular-nums leading-none" style={{ color: count > 0 ? color : "#3d3d52" }}>{count}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Reports */}
        <div className="px-5 pb-3 pt-2 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-1 pb-1">Reports</p>
          <button
            onClick={() => setTab("match-history")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
              tab === "match-history"
                ? "border-[#b04a15]/40 text-white"
                : "border-white/[0.05] text-stone-400 hover:text-white hover:bg-white/5"
            }`}
            style={{ background: tab === "match-history" ? "rgba(176,74,21,0.12)" : undefined }}
          >
            <Handshake className={`w-4 h-4 shrink-0 ${tab === "match-history" ? "text-[#b04a15]" : "text-teal-400"}`} />
            Match History
          </button>
          <button
            onClick={() => setTab("ai-logs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
              tab === "ai-logs"
                ? "border-[#b04a15]/40 text-white"
                : "border-white/[0.05] text-stone-400 hover:text-white hover:bg-white/5"
            }`}
            style={{ background: tab === "ai-logs" ? "rgba(176,74,21,0.12)" : undefined }}
          >
            <Bot className={`w-4 h-4 shrink-0 ${tab === "ai-logs" ? "text-[#b04a15]" : "text-violet-400"}`} />
            AI Screening Logs
          </button>
        </div>

        {/* Sign out */}
        <div className="px-5 pb-7 pt-5 border-t border-white/[0.07] mt-auto">
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── CREAM RIGHT PANEL ────────────────────────────────────────────────── */}
      <main className="flex-1 lg:pl-[296px] min-w-0 flex flex-col bg-[#faf7f2]">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]"
          style={{ background: "#17141f" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #b04a15, #e07b3a)" }}>
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">Admin Panel</p>
              <p className="text-[9px] text-[#b04a15] font-bold uppercase tracking-widest mt-0.5">CauseKind</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Sticky content header */}
        <div className="sticky top-0 lg:top-0 z-10 border-b border-stone-200 bg-[#faf7f2]/96 backdrop-blur-sm">
          <div className="px-7 lg:px-10 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-black text-stone-900 tracking-tight leading-none">{headerTitle}</h1>
              <p className="text-sm text-stone-500 mt-1.5">{headerSubtitle}</p>
            </div>

            {/* Approval queue tab pills (desktop) */}
            {!isReportTab && (
              <div className="hidden sm:flex gap-1.5 flex-wrap">
                {TABS.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      tab === key
                        ? "bg-[#b04a15] text-white shadow-sm shadow-[#b04a15]/30"
                        : "bg-white text-stone-500 hover:text-stone-900 border border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`text-xs font-black rounded-full min-w-[18px] px-1 text-center ${
                        tab === key ? "bg-white/20 text-white" : "bg-[#b04a15]/10 text-[#b04a15]"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* AI logs refresh button */}
            {tab === "ai-logs" && (
              <button
                onClick={loadAiLogs}
                disabled={assessmentsLoading}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-stone-200 rounded-xl bg-white text-stone-600 hover:text-stone-900 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${assessmentsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>

          {/* Mobile tab strip — approval queue only */}
          {!isReportTab && (
            <div className="sm:hidden flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
              {TABS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tab === key
                      ? "bg-[#b04a15] text-white"
                      : "bg-white text-stone-500 border border-stone-200"
                  }`}
                >
                  {label}
                  {count > 0 && <span className="opacity-80">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Mobile report links */}
          {isReportTab && (
            <div className="sm:hidden flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setTab("match-history")}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "match-history" ? "bg-[#b04a15] text-white" : "bg-white text-stone-500 border border-stone-200"}`}
              >
                Match History
              </button>
              <button
                onClick={() => setTab("ai-logs")}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "ai-logs" ? "bg-[#b04a15] text-white" : "bg-white text-stone-500 border border-stone-200"}`}
              >
                AI Screening Logs
              </button>
            </div>
          )}
        </div>

        {/* ── Cards feed ── */}
        <div className="flex-1 px-7 lg:px-10 py-8 max-w-4xl space-y-4">

          {/* ── DONATION OFFERS TAB — reuses the same panel as the standalone /admin/offers page ── */}
          {tab === "offers" && <OffersQueuePanel />}

          {/* ── APPROVAL QUEUE TABS ── */}
          {!isReportTab && tab !== "offers" && (
            loading ? (
              <div className="flex flex-col items-center justify-center py-28">
                <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
                <p className="text-sm text-stone-400 mt-3">Loading queue...</p>
              </div>
            ) : (
              <>
                {tab === "campaigns" && (
                  campaigns.length === 0
                    ? <AllClearState label="No pending campaigns" />
                    : campaigns.map(c => (
                      <ApprovalCard
                        key={c.id} id={c.id}
                        title={c.title}
                        meta={[c.doneeName, `${c.city}${c.state ? `, ${c.state}` : ""}`, c.category, `Goal ${formatINR(c.targetAmount)}`].filter(Boolean).join(" · ")}
                        description={c.description}
                        isRejecting={rejectId === c.id && rejectType === "campaign"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        onApprove={() => handleApproveCampaign(c.id)}
                        onOpenReject={() => openReject(c.id, "campaign")}
                        onConfirmReject={() => handleRejectCampaign(c.id)}
                        onCancelReject={cancelReject}
                      />
                    ))
                )}

                {tab === "requests" && (
                  requests.length === 0
                    ? <AllClearState label="No pending item requests" />
                    : requests.map(r => (
                      <ApprovalCard
                        key={r.id} id={r.id}
                        title={r.title}
                        meta={[r.doneeName, r.city, r.category, `Qty ${r.quantity}`, r.urgency].filter(Boolean).join(" · ")}
                        description={r.description}
                        isRejecting={rejectId === r.id && rejectType === "request"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        onApprove={() => handleApproveRequest(r.id)}
                        onOpenReject={() => openReject(r.id, "request")}
                        onConfirmReject={() => handleRejectRequest(r.id)}
                        onCancelReject={cancelReject}
                        onOpenDetails={() => setDetailSelection({ type: "request", item: r })}
                        reviewSlot={
                          <AiReviewPanel
                            entity="request"
                            id={r.id}
                            onUseReason={(reason) => {
                              setRejectId(r.id);
                              setRejectType("request");
                              setRejectReason(reason);
                              setNeedsInfoId(null);
                            }}
                          />
                        }
                      />
                    ))
                )}

                {tab === "listings" && (
                  listings.length === 0
                    ? <AllClearState label="No pending item listings" />
                    : listings.map(l => (
                      <ListingApprovalCard
                        key={l.id}
                        listing={l}
                        isRejecting={rejectId === l.id && rejectType === "listing"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        needsInfoId={needsInfoId} needsInfoNote={needsInfoNote}
                        setNeedsInfoNote={setNeedsInfoNote}
                        onApprove={() => handleApproveListing(l.id)}
                        onOpenReject={() => openReject(l.id, "listing")}
                        onConfirmReject={() => handleRejectListing(l.id)}
                        onCancelReject={cancelReject}
                        onOpenNeedsInfo={() => { setNeedsInfoId(l.id); setNeedsInfoNote(""); setRejectId(null); }}
                        onConfirmNeedsInfo={() => handleNeedsInformation(l.id)}
                        onCancelNeedsInfo={() => { setNeedsInfoId(null); setNeedsInfoNote(""); }}
                        onOpenDetails={() => setDetailSelection({ type: "listing", item: l })}
                        reviewSlot={
                          <AiReviewPanel
                            entity="listing"
                            id={l.id}
                            onUseReason={(reason) => {
                              setRejectId(l.id);
                              setRejectType("listing");
                              setRejectReason(reason);
                              setNeedsInfoId(null);
                            }}
                            onUseNeedsInfo={(reason) => {
                              setNeedsInfoId(l.id);
                              setNeedsInfoNote(reason);
                              setRejectId(null);
                              setRejectType(null);
                            }}
                          />
                        }
                      />
                    ))
                )}

                {tab === "matches" && (
                  matches.length === 0
                    ? <AllClearState label="No pending contact share requests" />
                    : matches.map(m => (
                      <ApprovalCard
                        key={m.id} id={m.id}
                        title={
                          m.matchType === "DONATE_TO_REQUEST"
                            ? `${m.donorName} wants to donate for "${m.requestTitle ?? ""}"`
                            : `${m.doneeName ?? ""} requested "${m.listingTitle ?? ""}"`
                        }
                        meta={`Donor: ${m.donorName} (${m.donorCity ?? "—"}) · Donee: ${m.doneeName ?? "—"} (${m.doneeCity ?? "—"})`}
                        description={m.donorItemDescription ?? m.doneeReason}
                        badge={m.matchScore != null ? `AI ${m.matchScore.toFixed(0)}%` : undefined}
                        isRejecting={rejectId === m.id && rejectType === "match"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        onApprove={() => handleApproveMatch(m.id)}
                        onOpenReject={() => openReject(m.id, "match")}
                        onConfirmReject={() => handleRejectMatch(m.id)}
                        onCancelReject={cancelReject}
                        onOpenDetails={() => setDetailSelection({ type: "match", item: m })}
                      />
                    ))
                )}
              </>
            )
          )}

          {/* ── MATCH HISTORY TAB ── */}
          {tab === "match-history" && (
            <div className="space-y-4">
              {/* Status filter */}
              <div className="flex flex-wrap gap-2">
                {ALL_MATCH_STATUSES.map(s => (
                  <button key={s} onClick={() => handleMatchHistoryFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      matchHistoryStatus === s
                        ? "bg-[#b04a15] text-white border-[#b04a15]"
                        : "bg-white border-stone-200 text-stone-600 hover:border-[#b04a15]/50"
                    }`}>
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              {allMatchesLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-stone-400" /></div>
              ) : allMatches.length === 0 ? (
                <p className="text-center py-20 text-stone-400">No matches found for this filter.</p>
              ) : (
                allMatches.map(m => (
                  <MatchHistoryCard
                    key={m.id}
                    match={m}
                    expanded={matchExpandedId === m.id}
                    onToggle={() => toggleMatchExpand(m.id)}
                    history={matchStatusHistory[m.id]}
                    historyLoading={matchHistoryLoadingId === m.id}
                  />
                ))
              )}
            </div>
          )}

          {/* ── AI LOGS TAB ── */}
          {tab === "ai-logs" && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Approve", value: assessments.filter(a => a.recommendation === "APPROVE").length, color: "emerald" },
                  { label: "Reject", value: assessments.filter(a => a.recommendation === "REJECT").length, color: "red" },
                  { label: "Manual Review", value: assessments.filter(a => a.recommendation === "MANUAL_REVIEW").length, color: "orange" },
                  { label: "High Fraud Risk", value: assessments.filter(a => a.fraudRisk === "HIGH").length, color: "rose" },
                ].map(({ label, value, color }) => (
                  <AiStatCard key={label} label={label} value={value} color={color} />
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    placeholder="Search listing, notes, labels…"
                    value={aiSearch}
                    onChange={e => setAiSearch(e.target.value)}
                    className="pl-8 pr-3 h-8 w-56 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#b04a15]/30 focus:border-[#b04a15]/50"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {AI_REC_FILTERS.map(f => (
                    <button key={f} onClick={() => setAiRecFilter(f)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        aiRecFilter === f ? "bg-[#b04a15] text-white border-[#b04a15]" : "border-stone-300 text-stone-600 hover:border-[#b04a15]/50"
                      }`}>
                      {f === "ALL" ? "All" : f.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => (
                    <button key={f} onClick={() => setAiFraudFilter(f)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        aiFraudFilter === f ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600 hover:border-stone-500"
                      }`}>
                      {f === "ALL" ? "Any Fraud" : `Fraud: ${f}`}
                    </button>
                  ))}
                </div>
                {(aiRecFilter !== "ALL" || aiFraudFilter !== "ALL" || aiSearch) && (
                  <button className="text-xs text-stone-400 hover:text-stone-600 underline"
                    onClick={() => { setAiRecFilter("ALL"); setAiFraudFilter("ALL"); setAiSearch(""); }}>
                    Clear filters
                  </button>
                )}
                <span className="ml-auto text-xs text-stone-400">{filteredAssessments.length} result{filteredAssessments.length !== 1 ? "s" : ""}</span>
              </div>

              {assessmentsLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-stone-400" /></div>
              ) : filteredAssessments.length === 0 ? (
                <p className="py-20 text-center text-stone-400">No AI assessments found.</p>
              ) : (
                filteredAssessments.map(a => (
                  <AiLogCard
                    key={a.id}
                    assessment={a}
                    expanded={aiExpandedId === a.id}
                    onToggle={() => setAiExpandedId(id => id === a.id ? null : a.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        <ApprovalDetailDrawer
          selection={detailSelection}
          onClose={() => setDetailSelection(null)}
        />
      </main>
    </div>
  );
}

// ── Match History Card ────────────────────────────────────────────────────────

function MatchHistoryCard({ match: m, expanded, onToggle, history, historyLoading }: {
  match: ItemMatch;
  expanded: boolean;
  onToggle: () => void;
  history?: StatusHistoryEntry[];
  historyLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-stone-50 transition" onClick={onToggle}>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? "bg-stone-100 text-stone-700"}`}>
              {m.status.replace(/_/g, " ")}
            </span>
            {m.matchScore != null && <span className="text-xs text-stone-500">AI Score: <strong>{m.matchScore}%</strong></span>}
            <span className="text-xs text-stone-400">#{m.id}</span>
            {m.deliveryOtpVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">OTP Verified</span>}
          </div>
          <p className="font-semibold text-sm">{m.requestTitle || m.listingTitle || "Unnamed match"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500">
            <span>Donor: <strong className="text-stone-700">{m.donorName}</strong>{m.donorCity && ` · ${m.donorCity}`}</span>
            <span>Donee: <strong className="text-stone-700">{m.doneeName}</strong>{m.doneeCity && ` · ${m.doneeCity}`}</span>
            <span>Created: {new Date(m.createdAt).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 mt-1" />}
      </div>

      {expanded && (
        <div className="border-t p-4 space-y-4 bg-stone-50">
          {/* Contacts */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Donor Contact", name: m.donorName, contact: m.donorContact, city: m.donorCity },
              { label: "Donee Contact", name: m.doneeName, contact: m.doneeContact, city: m.doneeCity },
            ].map(({ label, name, contact, city }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-xs space-y-1 border border-stone-100">
                <p className="font-bold text-stone-700 flex items-center gap-1"><Phone className="w-3 h-3" /> {label}</p>
                <p>{name}</p>
                <p className="font-semibold text-[#b04a15]">{contact ?? "—"}</p>
                <p className="text-stone-400">{city}</p>
              </div>
            ))}
          </div>

          {/* Item description */}
          {m.donorItemDescription && (
            <div className="bg-white rounded-xl p-3 text-xs border border-stone-100">
              <p className="font-bold mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Item Description</p>
              <p className="text-stone-600">{m.donorItemDescription}</p>
              {m.doneeReason && <p className="mt-2 text-stone-500"><span className="font-semibold">Donee reason:</span> {m.doneeReason}</p>}
            </div>
          )}

          {/* Logistics */}
          {m.handoverMethod && (
            <div className="bg-white rounded-xl p-3 text-xs border border-stone-100">
              <p className="font-bold mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Logistics</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-stone-600">
                <div><span className="text-stone-400">Method: </span><strong>{m.handoverMethod.replace(/_/g, " ")}</strong></div>
                {m.pickupDateTime && <div><span className="text-stone-400">Pickup: </span><strong>{new Date(m.pickupDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></div>}
                {m.handoverAddress && <div className="col-span-2"><span className="text-stone-400">Pickup address: </span><strong>{m.handoverAddress}</strong></div>}
                {m.deliveryAddress && <div className="col-span-2"><span className="text-stone-400">Delivery address: </span><strong>{m.deliveryAddress}</strong></div>}
                {m.allocatedQuantity && <div><span className="text-stone-400">Quantity: </span><strong>{m.allocatedQuantity}</strong></div>}
              </div>
            </div>
          )}

          {/* Status history timeline */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Status History</p>
            {historyLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-stone-400">No history recorded yet.</p>
            ) : (
              <ol className="relative border-l border-stone-200 ml-2 space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[#b04a15]" />
                    <p className="text-xs text-stone-400">{new Date(h.changedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="text-xs font-semibold">
                      <span className="text-stone-400">{h.fromStatus?.replace(/_/g, " ")} → </span>
                      <span className={`${STATUS_COLORS[h.toStatus] ?? ""} px-1.5 py-0.5 rounded`}>{h.toStatus.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-xs text-stone-400">{h.changedByEmail}{h.note ? ` · ${h.note}` : ""}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Log Card ───────────────────────────────────────────────────────────────

function AiLogCard({ assessment: a, expanded, onToggle }: {
  assessment: AiAssessmentResponse;
  expanded: boolean;
  onToggle: () => void;
}) {
  const recBadge = REC_BADGE[a.recommendation] ?? "bg-stone-100 text-stone-700 border-stone-300";
  const fraudBadge = a.fraudRisk ? (FRAUD_BADGE[a.fraudRisk] ?? "") : "";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-stone-50 transition" onClick={onToggle}>
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
            <span className="text-[11px] text-stone-400">{Math.round(a.confidence * 100)}% conf</span>
            <span className="text-[11px] text-stone-400">{new Date(a.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {a.evidenceNotes && (
          <p className="mt-1.5 text-xs text-stone-500 line-clamp-1 text-left">{a.evidenceNotes}</p>
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 bg-stone-50 space-y-3">
          {/* Score bars */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <MiniBar label="Confidence" value={a.confidence} color="bg-violet-500" />
            <MiniBar label="Image ↔ Description" value={a.imageDescriptionScore}
              color={a.imageDescriptionScore > 0.6 ? "bg-emerald-500" : a.imageDescriptionScore > 0.3 ? "bg-amber-500" : "bg-red-500"}
            />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {a.eligibilityResult && <InfoCell label="Eligibility" value={a.eligibilityResult} />}
            {a.conditionGrade && <InfoCell label="Condition Grade" value={a.conditionGrade} />}
            {a.modelVersion && <InfoCell label="Model" value={a.modelVersion} />}
          </div>

          {a.evidenceNotes && <p className="text-xs italic text-stone-600">{a.evidenceNotes}</p>}

          {a.detectedLabels && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Detected labels</p>
              <div className="flex flex-wrap gap-1">
                {a.detectedLabels.split(",").map((lbl, i) => (
                  <span key={i} className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600">{lbl.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {a.moderationLabels && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-1">Moderation labels</p>
              <div className="flex flex-wrap gap-1">
                {a.moderationLabels.split(",").map((lbl, i) => (
                  <span key={i} className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] text-red-600">{lbl.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {a.missingInfoFlags && (
            <p className="text-xs text-amber-700"><span className="font-semibold">Missing info: </span>{a.missingInfoFlags}</p>
          )}
          {a.safetyWarnings && (
            <p className="text-xs text-red-700"><span className="font-semibold">Safety: </span>{a.safetyWarnings}</p>
          )}

          <p className="text-[10px] text-stone-400 pt-1">Assessed {new Date(a.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-stone-400">{label}: </span>
      <span className="font-medium text-stone-700">{value}</span>
    </div>
  );
}

function AiStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[color] ?? ""}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ── Structured AI review panel ────────────────────────────────────────────────

function AiReviewPanel({
  entity,
  id,
  onUseReason,
  onUseNeedsInfo,
}: {
  entity: "request" | "listing";
  id: number;
  onUseReason: (reason: string) => void;
  onUseNeedsInfo?: (reason: string) => void;
}) {
  const [review, setReview] = useState<AdminAiReviewResponse | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingReview(true);
    setReview(null);
    const loader = entity === "listing" ? adminGetListingAiReview : adminGetItemRequestAiReview;
    loader(id)
      .then(data => { if (active) setReview(data); })
      .catch(() => { if (active) setReview(null); })
      .finally(() => { if (active) setLoadingReview(false); });
    return () => { active = false; };
  }, [entity, id]);

  if (loadingReview) {
    return (
      <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-violet-500" onClick={event => event.stopPropagation()}>
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI reviewing...
        </span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-400" onClick={event => event.stopPropagation()}>
        AI review unavailable. Manual review still works.
      </div>
    );
  }

  const badgeClass = reviewBadgeClass(review.recommendation);
  const riskClass = riskBadgeClass(review.riskLevel);
  const canUseNeedsInfo = review.recommendation === "NEEDS_INFORMATION" && onUseNeedsInfo;
  const canUseReject = review.recommendation === "REJECT" || (review.recommendation === "NEEDS_INFORMATION" && !onUseNeedsInfo);

  return (
    <div
      className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5"
      onClick={event => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
            <Bot className="h-3.5 w-3.5" /> AI Review
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${badgeClass}`}>
            {review.recommendation.replace(/_/g, " ")}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskClass}`}>
            {review.riskLevel} risk
          </span>
        </div>
        <span className="text-[10px] font-bold text-stone-400">{Math.round(review.confidence)}% confidence</span>
      </div>

      <p className="mt-1.5 text-xs font-medium leading-relaxed text-stone-700">{review.summary}</p>

      {review.evidence.length > 0 && (
        <div className="mt-2 space-y-1">
          {review.evidence.slice(0, 2).map((item, index) => (
            <p key={index} className="text-[11px] leading-relaxed text-stone-500">- {item}</p>
          ))}
        </div>
      )}

      {(canUseReject || canUseNeedsInfo) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canUseReject && (
            <button
              type="button"
              onClick={() => onUseReason(review.suggestedAdminReason)}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 transition hover:bg-red-50"
            >
              {review.recommendation === "REJECT" ? "Use reject reason" : "Use AI note"}
            </button>
          )}
          {canUseNeedsInfo && (
            <button
              type="button"
              onClick={() => canUseNeedsInfo(review.suggestedAdminReason)}
              className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-700 transition hover:bg-amber-50"
            >
              Use needs-info note
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function reviewBadgeClass(recommendation: string) {
  switch (recommendation) {
    case "APPROVE": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECT": return "border-red-200 bg-red-50 text-red-700";
    case "NEEDS_INFORMATION": return "border-amber-200 bg-amber-50 text-amber-700";
    default: return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function riskBadgeClass(riskLevel: string) {
  switch (riskLevel) {
    case "LOW": return "border-emerald-200 bg-white text-emerald-700";
    case "HIGH": return "border-red-200 bg-white text-red-700";
    default: return "border-amber-200 bg-white text-amber-700";
  }
}

// ── Reusable approval card ────────────────────────────────────────────────────

interface ApprovalCardProps {
  id: number;
  title: string;
  meta: string;
  description?: string | null;
  badge?: string;
  isRejecting: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  processing: number | null;
  onApprove: () => void;
  onOpenReject: () => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onOpenDetails?: () => void;
  reviewSlot?: ReactNode;
}

function ApprovalCard({
  id, title, meta, description, badge,
  isRejecting, rejectReason, setRejectReason,
  processing, onApprove, onOpenReject, onConfirmReject, onCancelReject,
  onOpenDetails, reviewSlot,
}: ApprovalCardProps) {
  const clickable = Boolean(onOpenDetails);

  return (
    <div
      className={`group bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all overflow-hidden ${
        clickable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 focus-visible:ring-offset-2" : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={clickable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails?.();
        }
      } : undefined}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg, #b04a15 0%, #e07b3a 60%, #f0b97a 100%)" }} />
        <div className="flex-1 min-w-0 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-stone-900 leading-snug">{title}</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{meta}</p>
            </div>
            {badge && (
              <span className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                {badge}
              </span>
            )}
          </div>

          {description && <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{description}</p>}

          {reviewSlot}

          {isRejecting ? (
            <div className="space-y-2.5 pt-1" onClick={event => event.stopPropagation()}>
              <input
                autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === "Enter") onConfirmReject();
                }}
                placeholder="Reason for rejection..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={onConfirmReject} disabled={processing === id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                  {processing === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Confirm Reject</>}
                </button>
                <button onClick={onCancelReject}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1" onClick={event => event.stopPropagation()}>
              <button onClick={onApprove} disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm text-white"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                {processing === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
              </button>
              <button onClick={onOpenReject} disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Full listing card ─────────────────────────────────────────────────────────

interface ListingApprovalCardProps {
  listing: ItemListing;
  isRejecting: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  processing: number | null;
  needsInfoId: number | null;
  needsInfoNote: string;
  setNeedsInfoNote: (v: string) => void;
  onApprove: () => void;
  onOpenReject: () => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onOpenNeedsInfo: () => void;
  onConfirmNeedsInfo: () => void;
  onCancelNeedsInfo: () => void;
  onOpenDetails?: () => void;
  reviewSlot?: ReactNode;
}

function ListingApprovalCard({
  listing: l,
  isRejecting, rejectReason, setRejectReason,
  processing, needsInfoId, needsInfoNote, setNeedsInfoNote,
  onApprove, onOpenReject, onConfirmReject, onCancelReject,
  onOpenNeedsInfo, onConfirmNeedsInfo, onCancelNeedsInfo,
  onOpenDetails, reviewSlot,
}: ListingApprovalCardProps) {
  const photos = listingPhotos(l);
  const clickable = Boolean(onOpenDetails);

  return (
    <div
      className={`group bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all overflow-hidden ${
        clickable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 focus-visible:ring-offset-2" : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={clickable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails?.();
        }
      } : undefined}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg, #b04a15 0%, #e07b3a 60%, #f0b97a 100%)" }} />
        <div className="flex-1 min-w-0 p-5 space-y-3">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-stone-900 leading-snug">{l.title}</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                {[l.donorName, l.city, l.category, l.subcategory && `/ ${l.subcategory}`, l.condition, l.brand, l.model && l.model, `Qty ${l.quantity}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full whitespace-nowrap border ${
              l.status === "MANUAL_REVIEW"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-stone-100 text-stone-500 border-stone-200"
            }`}>
              {l.status === "MANUAL_REVIEW" ? "⚠ Manual Review" : "Submitted"}
            </span>
          </div>

          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-24 rounded-xl border object-cover hover:opacity-80 transition" />
                </a>
              ))}
            </div>
          )}

          {(l.approximateAge || l.workingStatus || l.dimensions || l.approximateWeight || l.locality || l.pincode) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-stone-50 rounded-xl p-3">
              {l.approximateAge    && <div><span className="text-stone-400">Age: </span><span className="font-semibold text-stone-700">{l.approximateAge}</span></div>}
              {l.workingStatus     && <div><span className="text-stone-400">Working: </span><span className="font-semibold text-stone-700">{l.workingStatus.replace(/_/g, " ")}</span></div>}
              {l.dimensions        && <div><span className="text-stone-400">Size: </span><span className="font-semibold text-stone-700">{l.dimensions}</span></div>}
              {l.approximateWeight && <div><span className="text-stone-400">Weight: </span><span className="font-semibold text-stone-700">{l.approximateWeight}</span></div>}
              {l.locality          && <div><span className="text-stone-400">Locality: </span><span className="font-semibold text-stone-700">{l.locality}</span></div>}
              {l.pincode           && <div><span className="text-stone-400">PIN: </span><span className="font-semibold text-stone-700">{l.pincode}</span></div>}
            </div>
          )}

          {l.knownDefects && l.knownDefects !== "NONE" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
              <span className="font-bold text-amber-700">Known defects: </span>
              <span className="text-stone-700">{l.knownDefects}</span>
            </div>
          )}

          {l.description && <p className="text-sm text-stone-500 leading-relaxed">{l.description}</p>}

          {l.declarationsAccepted && (
            <p className="text-xs text-emerald-600 font-bold">✓ All mandatory declarations accepted by donor</p>
          )}

          {reviewSlot}

          {isRejecting ? (
            <div className="space-y-2.5 pt-1" onClick={event => event.stopPropagation()}>
              <input
                autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === "Enter") onConfirmReject();
                }}
                placeholder="Reason for rejection..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={onConfirmReject} disabled={processing === l.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                  {processing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Confirm Reject</>}
                </button>
                <button onClick={onCancelReject}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : needsInfoId === l.id ? (
            <div className="space-y-2.5 pt-1" onClick={event => event.stopPropagation()}>
              <input
                autoFocus value={needsInfoNote} onChange={e => setNeedsInfoNote(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                placeholder="e.g. Please upload clearer photos of the defect area"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={onConfirmNeedsInfo} disabled={processing === l.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm">
                  {processing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageSquare className="w-4 h-4" /> Send to Donor</>}
                </button>
                <button onClick={onCancelNeedsInfo}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1" onClick={event => event.stopPropagation()}>
              <button onClick={onApprove} disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm text-white"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                {processing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
              </button>
              <button onClick={onOpenNeedsInfo} disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-bold rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors">
                <MessageSquare className="w-4 h-4" /> Needs Info
              </button>
              <button onClick={onOpenReject} disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Approval detail drawer ───────────────────────────────────────────────────

function ApprovalDetailDrawer({
  selection,
  onClose,
}: {
  selection: DetailSelection | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!selection) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [selection, onClose]);

  if (!selection) return null;

  const title = selection.type === "match"
    ? (selection.item.requestTitle ?? selection.item.listingTitle ?? `Match #${selection.item.id}`)
    : selection.item.title;
  const ownerLabel = selection.type === "request"
    ? selection.item.doneeName
    : selection.type === "listing"
      ? selection.item.donorName
      : `${selection.item.donorName ?? "Donor"} → ${selection.item.doneeName ?? "Donee"}`;
  const kindLabel = selection.type === "request"
    ? "Item Request"
    : selection.type === "listing"
      ? "Item Listing"
      : "Match Details";
  const drawerWidth = selection.type === "match" ? "sm:w-[680px]" : "sm:w-[520px]";

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <aside
        className={`absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-full ${drawerWidth} sm:rounded-none`}
        onClick={event => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
        aria-labelledby="approval-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#b04a15]">{kindLabel}</p>
            <h2 id="approval-detail-title" className="mt-1 truncate text-lg font-black leading-tight text-stone-900">
              {title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill value={selection.item.status} />
              <span className="text-xs font-semibold text-stone-400">{ownerLabel}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selection.type === "request" && <RequestDetailContent request={selection.item} />}
          {selection.type === "listing" && <ListingDetailContent listing={selection.item} />}
          {selection.type === "match" && <MatchDetailContent match={selection.item} />}
        </div>
      </aside>
    </div>
  );
}

function RequestDetailContent({ request: r }: { request: ItemRequest }) {
  const photos = r.imageUrl ? [r.imageUrl] : [];

  return (
    <>
      <PhotoStrip photos={photos} />

      <DetailSection icon={UserRound} title="Requester">
        <DetailGrid
          items={[
            { label: "Name", value: r.doneeName },
            { label: "Donee ID", value: r.doneeId },
            { label: "Created", value: formatDateTime(r.createdAt) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Package} title="Request Details">
        <DetailGrid
          items={[
            { label: "Category", value: r.category },
            { label: "Quantity", value: r.quantity },
            { label: "Urgency", value: formatEnum(r.urgency) },
            { label: "Status", value: formatEnum(r.status) },
          ]}
        />
        <DetailTextBlock label="Need description" value={r.description} />
      </DetailSection>

      <DetailSection icon={MapPin} title="Location">
        <DetailGrid
          items={[
            { label: "City", value: r.city },
            { label: "PIN Code", value: r.pincode },
            { label: "Pickup radius", value: r.pickupRadiusKm != null ? `${r.pickupRadiusKm} km` : null },
            { label: "Coordinates", value: formatCoordinates(r.latitude, r.longitude) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={ShieldCheck} title="Review">
        <DetailGrid
          items={[
            { label: "Request ID", value: r.id },
            { label: "Rejection reason", value: r.rejectionReason },
          ]}
        />
      </DetailSection>
    </>
  );
}

function ListingDetailContent({ listing: l }: { listing: ItemListing }) {
  const photos = listingPhotos(l);

  return (
    <>
      <PhotoStrip photos={photos} />

      <DetailSection icon={UserRound} title="Donor">
        <DetailGrid
          items={[
            { label: "Name", value: l.donorName },
            { label: "Donor ID", value: l.donorId },
            { label: "Created", value: formatDateTime(l.createdAt) },
            { label: "Submitted", value: formatDateTime(l.submittedAt) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Tag} title="Item Details">
        <DetailGrid
          items={[
            { label: "Category", value: l.category },
            { label: "Subcategory", value: l.subcategory },
            { label: "Quantity", value: l.quantity },
            { label: "Condition", value: l.condition },
            { label: "Brand", value: l.brand },
            { label: "Model", value: l.model },
            { label: "Age", value: l.approximateAge },
            { label: "Working status", value: formatEnum(l.workingStatus) },
            { label: "Dimensions", value: l.dimensions },
            { label: "Weight", value: l.approximateWeight },
          ]}
        />
        <DetailTextBlock label="Description" value={l.description} />
        <DetailTextBlock
          label="Known defects"
          value={l.knownDefects === "NONE" ? "No known defects declared" : l.knownDefects}
          tone={l.knownDefects && l.knownDefects !== "NONE" ? "amber" : "neutral"}
        />
        <DetailTextBlock label="Accessories included" value={l.accessoriesIncluded} />
        <DetailTextBlock label="Recipient restrictions" value={l.recipientRestrictions} />
      </DetailSection>

      <DetailSection icon={MapPin} title="Location">
        <DetailGrid
          items={[
            { label: "City", value: l.city },
            { label: "Locality", value: l.locality },
            { label: "PIN Code", value: l.pincode },
            { label: "Coordinates", value: formatCoordinates(l.latitude, l.longitude) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Truck} title="Delivery">
        <DetailGrid
          items={[
            { label: "Pickup availability", value: l.pickupAvailability },
            { label: "Pickup days", value: splitValues(l.pickupDays).join(", ") },
            { label: "Pickup time slots", value: splitValues(l.pickupTimeSlots).join(", ") },
            { label: "Donor drop-off", value: l.donorDropOffAvailable },
            { label: "Max travel distance", value: l.maxTravelDistance != null ? `${l.maxTravelDistance} km` : null },
            { label: "Packaging", value: formatEnum(l.packagingAvailable) },
            { label: "Special handling", value: splitValues(l.specialHandling, "|").join(", ") },
            { label: "Preferred handover date", value: formatDate(l.preferredHandoverDate) },
            { label: "Preferred handover slots", value: splitValues(l.preferredHandoverSlots).join(", ") },
            { label: "Maximum delivery radius", value: l.maximumDeliveryRadius != null ? `${l.maximumDeliveryRadius} km` : null },
            { label: "Transport payer", value: formatEnum(l.transportPayerPreference) },
            { label: "Availability expiry", value: formatDateTime(l.availabilityExpiry) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={ShieldCheck} title="Review">
        <DetailGrid
          items={[
            { label: "Listing ID", value: l.id },
            { label: "Status", value: formatEnum(l.status) },
            { label: "Declarations accepted", value: l.declarationsAccepted },
            { label: "Rejected by AI", value: l.rejectedByAi },
            { label: "Policy version", value: l.policyVersion },
            { label: "Rejection reason", value: l.rejectionReason },
          ]}
        />
      </DetailSection>
    </>
  );
}

function MatchDetailContent({ match: m }: { match: ItemMatch }) {
  const donorPhotos = m.donorImages ?? [];
  const requestPhotos = m.requestImageUrl ? [m.requestImageUrl] : [];
  const listingPhotos = matchListingPhotos(m);

  return (
    <>
      <DetailSection icon={ShieldCheck} title="Match Review">
        <DetailGrid
          items={[
            { label: "Match ID", value: m.id },
            { label: "Type", value: formatEnum(m.matchType) },
            { label: "Status", value: formatEnum(m.status) },
            { label: "AI score", value: m.matchScore != null ? `${m.matchScore.toFixed(0)}%` : null },
            { label: "Created", value: formatDateTime(m.createdAt) },
            { label: "Rejection reason", value: m.rejectionReason },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Phone} title="People">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PersonInfoCard
            label="Donor"
            name={m.donorName}
            id={m.donorId}
            email={m.donorEmail}
            phone={m.donorContact}
            city={m.donorCity}
            coordinates={formatCoordinates(m.donorLatitude, m.donorLongitude)}
          />
          <PersonInfoCard
            label="Donee"
            name={m.doneeName}
            id={m.doneeId}
            email={m.doneeEmail}
            phone={m.doneeContact}
            city={m.doneeCity}
            coordinates={formatCoordinates(m.doneeLatitude, m.doneeLongitude)}
          />
        </div>
      </DetailSection>

      {m.requestId && (
        <>
          <PhotoStrip photos={requestPhotos} title="Request Photo" />
          <DetailSection icon={ClipboardList} title="Donee Request Data">
            <DetailGrid
              items={[
                { label: "Request ID", value: m.requestId },
                { label: "Title", value: m.requestTitle },
                { label: "Category", value: m.requestCategory },
                { label: "Quantity", value: m.requestQuantity },
                { label: "Urgency", value: formatEnum(m.requestUrgency) },
                { label: "Status", value: formatEnum(m.requestStatus) },
                { label: "City", value: m.requestCity },
                { label: "PIN Code", value: m.requestPincode },
                { label: "Coordinates", value: formatCoordinates(m.requestLatitude, m.requestLongitude) },
                { label: "Created", value: formatDateTime(m.requestCreatedAt) },
              ]}
            />
            <DetailTextBlock label="Request description" value={m.requestDescription} />
          </DetailSection>
        </>
      )}

      {m.listingId && (
        <>
          <PhotoStrip photos={listingPhotos} title="Listing Photos" />
          <DetailSection icon={Package} title="Donor Listing Data">
            <DetailGrid
              items={[
                { label: "Listing ID", value: m.listingId },
                { label: "Title", value: m.listingTitle },
                { label: "Category", value: m.listingCategory },
                { label: "Subcategory", value: m.listingSubcategory },
                { label: "Quantity", value: m.listingQuantity },
                { label: "Condition", value: m.listingCondition },
                { label: "Status", value: formatEnum(m.listingStatus) },
                { label: "Brand", value: m.listingBrand },
                { label: "Model", value: m.listingModel },
                { label: "Age", value: m.listingApproximateAge },
                { label: "Working status", value: formatEnum(m.listingWorkingStatus) },
                { label: "Dimensions", value: m.listingDimensions },
                { label: "Weight", value: m.listingApproximateWeight },
                { label: "City", value: m.listingCity },
                { label: "Locality", value: m.listingLocality },
                { label: "PIN Code", value: m.listingPincode },
                { label: "Coordinates", value: formatCoordinates(m.listingLatitude, m.listingLongitude) },
                { label: "Created", value: formatDateTime(m.listingCreatedAt) },
              ]}
            />
            <DetailTextBlock label="Listing description" value={m.listingDescription} />
            <DetailTextBlock
              label="Known defects"
              value={m.listingKnownDefects === "NONE" ? "No known defects declared" : m.listingKnownDefects}
              tone={m.listingKnownDefects && m.listingKnownDefects !== "NONE" ? "amber" : "neutral"}
            />
            <DetailTextBlock label="Accessories included" value={m.listingAccessoriesIncluded} />
          </DetailSection>
        </>
      )}

      {(m.donorItemDescription || donorPhotos.length > 0 || m.doneeReason) && (
        <>
          <PhotoStrip photos={donorPhotos} title="Donor Uploaded Match Photos" />
          <DetailSection icon={MessageSquare} title="Match Notes">
            <DetailTextBlock label="Donor item description" value={m.donorItemDescription} />
            <DetailTextBlock label="Donee reason" value={m.doneeReason} />
          </DetailSection>
        </>
      )}

      <DetailSection icon={Truck} title="Logistics and Delivery">
        <DetailGrid
          items={[
            { label: "Handover method", value: formatEnum(m.handoverMethod) },
            { label: "Transport arranged by", value: formatEnum(m.transportArrangedBy) },
            { label: "Transport cost by", value: formatEnum(m.transportCostBornBy) },
            { label: "Pickup date", value: formatDateTime(m.pickupDateTime) },
            { label: "Expected delivery", value: formatDateTime(m.expectedDeliveryDate) },
            { label: "Allocated quantity", value: m.allocatedQuantity },
            { label: "Delivery verified", value: m.deliveryOtpVerified },
            { label: "Verification method", value: formatEnum(m.deliveryVerificationMethod) },
            { label: "Call masking requested", value: m.callMaskingRequested },
          ]}
        />
        <DetailTextBlock label="Packaging responsibility" value={m.packagingResponsibility} />
        <DetailTextBlock label="Handover address" value={m.handoverAddress} />
        <DetailTextBlock label="Delivery address" value={m.deliveryAddress} />
        <DetailTextBlock label="Fulfilment notes" value={m.fulfilmentNotes} />
        {m.deliveryProofUrl && (
          <a href={m.deliveryProofUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-bold text-[#b04a15] hover:underline">
            Open delivery proof
          </a>
        )}
      </DetailSection>
    </>
  );
}

function PersonInfoCard({
  label,
  name,
  id,
  email,
  phone,
  city,
  coordinates,
}: {
  label: string;
  name?: string | null;
  id?: number | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  coordinates?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#b04a15]">{label}</p>
      <p className="mt-1 text-sm font-black text-stone-900">{name ?? "Unknown"}</p>
      <div className="mt-2 space-y-1 text-xs text-stone-500">
        {hasDetailValue(id) && <p><span className="font-bold text-stone-400">ID:</span> {id}</p>}
        {hasDetailValue(email) && <p><span className="font-bold text-stone-400">Email:</span> {email}</p>}
        {hasDetailValue(phone) && <p><span className="font-bold text-stone-400">Phone:</span> {phone}</p>}
        {hasDetailValue(city) && <p><span className="font-bold text-stone-400">City:</span> {city}</p>}
        {hasDetailValue(coordinates) && <p><span className="font-bold text-stone-400">GPS:</span> {coordinates}</p>}
      </div>
    </div>
  );
}

function PhotoStrip({ photos, title = "Photos" }: { photos: string[]; title?: string }) {
  if (photos.length === 0) return null;

  return (
    <div className="border-b border-stone-100 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-[#b04a15]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{title}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((src, index) => (
          <a
            key={`${src}-${index}`}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Uploaded photo ${index + 1}`} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-stone-100 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#b04a15]" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400">{title}</h3>
      </div>
      {children}
    </section>
  );
}

type DetailValue = string | number | boolean | null | undefined;

function hasDetailValue(value: DetailValue) {
  if (value == null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

function renderDetailValue(value: DetailValue) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function DetailGrid({ items }: { items: Array<{ label: string; value: DetailValue }> }) {
  const visible = items.filter(item => hasDetailValue(item.value));

  if (visible.length === 0) {
    return <p className="text-sm text-stone-400">No details provided.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {visible.map(item => (
        <div key={item.label} className="rounded-xl bg-stone-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{item.label}</p>
          <p className="mt-0.5 break-words text-sm font-semibold text-stone-800">{renderDetailValue(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

function DetailTextBlock({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value?: string | null;
  tone?: "neutral" | "amber";
}) {
  if (!hasDetailValue(value)) return null;

  const color = tone === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-stone-200 bg-white text-stone-700";

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function StatusPill({ value }: { value?: string | null }) {
  const normalized = formatEnum(value) ?? "Unknown";
  const color = value === "MANUAL_REVIEW"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : value === "PENDING_VERIFICATION" || value === "SUBMITTED"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-stone-200 bg-stone-100 text-stone-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${color}`}>
      {normalized}
    </span>
  );
}

function AllClearState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
        style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}>
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      <p className="text-stone-700 font-bold">{label}</p>
      <p className="text-sm text-stone-400 mt-1">All caught up — great work!</p>
    </div>
  );
}
