"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, type ItemMatch,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Check, ClipboardList, Handshake, Loader2, LogOut, Megaphone, Package, ShieldCheck, X,
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

  const total = campaigns.length + requests.length + listings.length + matches.length;

  const TABS = [
    { key: "campaigns" as TabKey, label: "Campaigns",    count: campaigns.length, icon: Megaphone,     color: "#e07b3a" },
    { key: "requests"  as TabKey, label: "Requests",     count: requests.length,  icon: ClipboardList,  color: "#60a5fa" },
    { key: "listings"  as TabKey, label: "Listings",     count: listings.length,  icon: Package,        color: "#a78bfa" },
    { key: "matches"   as TabKey, label: "Matches",      count: matches.length,   icon: Handshake,      color: "#34d399" },
  ];

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

        {/* Quick links */}
        <div className="px-5 pb-3 pt-2 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-1 pb-1">Reports</p>
          <a href="/admin/matches"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-stone-400 hover:text-white hover:bg-white/5 transition-all border border-white/[0.05]">
            <Handshake className="w-4 h-4 shrink-0 text-teal-400" />
            Match History
          </a>
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
                    <ApprovalCard
                      key={l.id} id={l.id}
                      title={l.title}
                      meta={[l.donorName, l.city, l.category, l.condition, `Qty ${l.quantity}`].filter(Boolean).join(" · ")}
                      description={l.description}
                      isRejecting={rejectId === l.id && rejectType === "listing"}
                      rejectReason={rejectReason} setRejectReason={setRejectReason}
                      processing={processing}
                      onApprove={() => handleApproveListing(l.id)}
                      onOpenReject={() => openReject(l.id, "listing")}
                      onConfirmReject={() => handleRejectListing(l.id)}
                      onCancelReject={cancelReject}
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
                    />
                  ))
              )}
            </>
          )}
        </div>
      </main>
    </div>
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
