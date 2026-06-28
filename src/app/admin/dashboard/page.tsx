"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, type ItemMatch,
  adminGetListingAiReview, type AiModerationResult,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, Bot, Check, CheckCircle2, ChevronRight,
  ClipboardList, Handshake, Loader2, LogOut, Megaphone,
  Package, ShieldCheck, X, XCircle, ZoomIn,
} from "lucide-react";

type TabKey = "campaigns" | "requests" | "listings" | "matches";
type RejectType = "campaign" | "request" | "listing" | "match";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [listings, setListings] = useState<ItemListing[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("campaigns");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectType, setRejectType] = useState<RejectType | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<ItemListing | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminGetCampaigns("PENDING_APPROVAL"),
      adminGetItemRequests("PENDING_VERIFICATION"),
      adminGetItemListings("PENDING_REVIEW"),
      adminGetMatches("PENDING_APPROVAL"),
    ]).then(([c, r, l, m]) => {
      setCampaigns(c); setRequests(r); setListings(l); setMatches(m);
    }).catch(() => toast.error("Failed to load approval queue"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    loadData();
  }, [user, isLoading, router, loadData]);

  function openReject(id: number, type: RejectType) {
    setRejectId(id); setRejectType(type); setRejectReason("");
  }
  function cancelReject() { setRejectId(null); setRejectType(null); setRejectReason(""); }

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
      setSelectedListing(null);
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
      setSelectedListing(null);
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

  const closeDrawer = () => { setSelectedListing(null); cancelReject(); };

  const total = campaigns.length + requests.length + listings.length + matches.length;

  const TABS = [
    { key: "campaigns" as TabKey, label: "Campaigns",    count: campaigns.length, icon: Megaphone,     color: "#e07b3a" },
    { key: "requests"  as TabKey, label: "Requests",     count: requests.length,  icon: ClipboardList,  color: "#60a5fa" },
    { key: "listings"  as TabKey, label: "Listings",     count: listings.length,  icon: Package,        color: "#a78bfa" },
    { key: "matches"   as TabKey, label: "Matches",      count: matches.length,   icon: Handshake,      color: "#34d399" },
  ];

  return (
    <>
    <ListingDrawer
      listing={selectedListing}
      onClose={closeDrawer}
      processing={processing}
      rejectId={rejectId}
      rejectType={rejectType}
      rejectReason={rejectReason}
      setRejectReason={setRejectReason}
      onApprove={handleApproveListing}
      openReject={(id) => openReject(id, "listing")}
      onConfirmReject={handleRejectListing}
      cancelReject={cancelReject}
    />
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

        {/* Queue count pills — each doubles as tab selector */}
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
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: tab === key ? "#b04a15" : color }}
                />
                <span className={`text-sm font-semibold ${tab === key ? "text-white" : "text-stone-400"}`}>
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b04a15] animate-pulse shrink-0" />
                )}
                <span
                  className="text-lg font-black tabular-nums leading-none"
                  style={{ color: count > 0 ? color : "#3d3d52" }}
                >
                  {count}
                </span>
              </div>
            </button>
          ))}
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
              <h1 className="text-[22px] font-black text-stone-900 tracking-tight leading-none">
                Approval Queue
              </h1>
              <p className="text-sm text-stone-500 mt-1.5">
                {loading
                  ? "Loading..."
                  : total > 0
                    ? `${total} item${total !== 1 ? "s" : ""} awaiting your review`
                    : "All clear — nothing pending"}
              </p>
            </div>

            {/* Tab pill row (desktop) */}
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
          </div>

          {/* Mobile tab strip */}
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
        </div>

        {/* ── Cards feed ── */}
        <div className="flex-1 px-7 lg:px-10 py-8 max-w-3xl space-y-4">
          {loading ? (
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
                    />
                  ))
              )}

              {tab === "listings" && (
                listings.length === 0
                  ? <AllClearState label="No pending item listings" />
                  : listings.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedListing(l)}
                      className="w-full text-left group bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-px hover:border-[#b04a15]/30 transition-all overflow-hidden"
                    >
                      <div className="flex">
                        <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg, #b04a15 0%, #e07b3a 60%, #f0b97a 100%)" }} />
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 p-4">
                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-xl shrink-0 bg-stone-100 border border-stone-200 overflow-hidden">
                            {l.imageUrl
                              ? <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" />
                              : <div className="flex items-center justify-center w-full h-full"><Package className="w-5 h-5 text-stone-300" /></div>
                            }
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-900 leading-snug truncate">{l.title}</p>
                            <p className="text-xs text-stone-400 mt-0.5 truncate">
                              {[l.donorName, l.city, l.category, l.condition, l.quantity != null ? `Qty ${l.quantity}` : null].filter(Boolean).join(" · ")}
                            </p>
                            <p className="text-[10px] text-[#b04a15] font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to review full details →
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-[#b04a15] shrink-0 transition-colors" />
                        </div>
                      </div>
                    </button>
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
                    />
                  ))
              )}
            </>
          )}
        </div>
      </main>
    </div>
    </>
  );
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
}

function ApprovalCard({
  id, title, meta, description, badge,
  isRejecting, rejectReason, setRejectReason,
  processing, onApprove, onOpenReject, onConfirmReject, onCancelReject,
}: ApprovalCardProps) {
  return (
    <div className="group bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all overflow-hidden">
      <div className="flex">
        {/* Left accent stripe — asymmetric visual signature */}
        <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg, #b04a15 0%, #e07b3a 60%, #f0b97a 100%)" }} />

        <div className="flex-1 min-w-0 p-5 space-y-3">
          {/* Header row */}
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

          {description && (
            <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{description}</p>
          )}

          {/* Action area */}
          {isRejecting ? (
            <div className="space-y-2.5 pt-1">
              <input
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onConfirmReject()}
                placeholder="Reason for rejection..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={onConfirmReject}
                  disabled={processing === id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {processing === id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><X className="w-4 h-4" /> Confirm Reject</>}
                </button>
                <button
                  onClick={onCancelReject}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onApprove}
                disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm text-white"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
              >
                {processing === id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Check className="w-4 h-4" /> Approve</>}
              </button>
              <button
                onClick={onOpenReject}
                disabled={processing !== null}
                className="flex items-center gap-1.5 px-5 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Listing detail drawer ─────────────────────────────────────────────────────

function ListingDrawer({
  listing, onClose, processing,
  rejectId, rejectType, rejectReason, setRejectReason,
  onApprove, openReject, onConfirmReject, cancelReject,
}: {
  listing: ItemListing | null; onClose: () => void; processing: number | null;
  rejectId: number | null; rejectType: string | null;
  rejectReason: string; setRejectReason: (v: string) => void;
  onApprove: (id: number) => void; openReject: (id: number) => void;
  onConfirmReject: (id: number) => void; cancelReject: () => void;
}) {
  const [aiLog, setAiLog] = useState<AiModerationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!listing) { setAiLog(null); return; }
    setAiLog(null); setAiLoading(true);
    adminGetListingAiReview(listing.id).then(setAiLog).catch(() => setAiLog(null)).finally(() => setAiLoading(false));
  }, [listing?.id]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = listing ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [listing]);

  const visible = !!listing;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      {/* Panel */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-[500px] bg-[#faf7f2] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}>
        {listing && (<>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#b04a15]" />
              <span className="font-bold text-sm text-stone-800">Listing Review</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Needs Review</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            <div className="bg-stone-200 w-full" style={{ minHeight: 200 }}>
              {listing.imageUrl ? (
                <a href={listing.imageUrl} target="_blank" rel="noopener noreferrer" className="group relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={listing.imageUrl} alt={listing.title} className="w-full object-cover" style={{ maxHeight: 280 }} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <span className="flex items-center gap-1.5 bg-white/90 text-stone-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <ZoomIn className="w-3.5 h-3.5" /> Open full image
                    </span>
                  </div>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center text-stone-400" style={{ minHeight: 160 }}>
                  <Package className="w-10 h-10 opacity-30 mb-2" />
                  <p className="text-xs">No image provided</p>
                </div>
              )}
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Title + donor */}
              <div>
                <h2 className="text-lg font-black text-stone-900 leading-tight">{listing.title}</h2>
                <p className="text-sm text-stone-400 mt-1">
                  by <span className="font-semibold text-stone-600">{listing.donorName}</span>
                  {listing.createdAt && <> · {new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                </p>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Category",       value: listing.category },
                  { label: "Condition",      value: listing.condition },
                  { label: "Quantity",       value: listing.quantity != null ? String(listing.quantity) : null },
                  { label: "City",           value: listing.city },
                  { label: "Pincode",        value: listing.pincode },
                  { label: "Delivery",       value: listing.maximumDeliveryRadius ? `${listing.maximumDeliveryRadius} km` : null },
                  { label: "Transport",      value: listing.transportPayerPreference?.replace(/_/g, " ").toLowerCase() },
                  { label: "Expires",        value: listing.availabilityExpiry ? new Date(listing.availabilityExpiry).toLocaleDateString("en-IN") : null },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="bg-white rounded-xl px-3 py-2.5 border border-stone-200">
                    <p className="text-[9px] font-black tracking-widest text-stone-400 uppercase">{label}</p>
                    <p className="text-sm font-bold text-stone-800 mt-0.5 capitalize">{value}</p>
                  </div>
                ) : null)}
              </div>

              {/* Description */}
              {listing.description && (
                <div>
                  <p className="text-[9px] font-black tracking-widest text-stone-400 uppercase mb-2">Description</p>
                  <p className="text-sm leading-relaxed text-stone-700 bg-white rounded-xl px-4 py-3 border border-stone-200">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* Rejection history */}
              {listing.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-[9px] font-black tracking-widest text-red-500 uppercase mb-1">Previous Rejection</p>
                  <p className="text-sm text-red-700">{listing.rejectionReason}</p>
                </div>
              )}

              {/* ── AI Moderation Log ── */}
              <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border-b border-stone-200">
                  <Bot className="w-3.5 h-3.5 text-[#b04a15]" />
                  <span className="text-[10px] font-black tracking-widest text-stone-500 uppercase">AI Moderation Log</span>
                </div>
                <div className="px-4 py-3">
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-stone-400 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing listing…
                    </div>
                  ) : aiLog ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        {aiLog.decision === "APPROVE" && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Would Auto-Approve
                          </span>
                        )}
                        {aiLog.decision === "REJECT" && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Would Auto-Reject
                          </span>
                        )}
                        {aiLog.decision === "REVIEW" && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> Needs Human Review
                          </span>
                        )}
                        <span className="text-xs text-stone-400">
                          Confidence: <span className="font-bold text-stone-700">{aiLog.confidence.toFixed(0)}%</span>
                        </span>
                      </div>
                      {/* Confidence bar */}
                      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${aiLog.decision === "APPROVE" ? "bg-emerald-500" : aiLog.decision === "REJECT" ? "bg-red-500" : "bg-amber-400"}`}
                          style={{ width: `${aiLog.confidence}%` }}
                        />
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        <span className="font-semibold text-stone-700">Reason: </span>{aiLog.reason}
                      </p>
                      {aiLog.labels && aiLog.labels.length > 0 && (
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-stone-400 uppercase mb-1.5">Image Labels</p>
                          <div className="flex flex-wrap gap-1.5">
                            {aiLog.labels.map(l => (
                              <span key={l} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">{l}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!listing.imageUrl && (
                        <p className="text-[10px] text-stone-400 italic">No image — AI used title &amp; description text only</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 py-1">AI analysis unavailable</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-stone-200 px-5 py-4 bg-[#faf7f2]">
            {rejectId === listing.id && rejectType === "listing" ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onConfirmReject(listing.id)}
                  placeholder="Reason for rejection..."
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
                />
                <div className="flex gap-2">
                  <button onClick={() => onConfirmReject(listing.id)} disabled={processing === listing.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {processing === listing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Confirm Reject</>}
                  </button>
                  <button onClick={cancelReject} className="px-4 py-2.5 text-sm font-semibold text-stone-500 border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => onApprove(listing.id)} disabled={processing !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  {processing === listing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
                </button>
                <button onClick={() => openReject(listing.id)} disabled={processing !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        </>)}
      </div>
    </>
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
