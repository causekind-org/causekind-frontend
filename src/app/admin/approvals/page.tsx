"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, type ItemMatch,
  adminGetListingAiReview, type AiModerationResult,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Bot, Check, CheckCircle2, ChevronRight, Loader2, Package, X, XCircle, ZoomIn } from "lucide-react";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ── Listing Detail Drawer ───────────────────────────────────────────────────

interface DrawerProps {
  listing: ItemListing | null;
  onClose: () => void;
  processing: number | null;
  rejectId: number | null;
  rejectType: string | null;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onApprove: (id: number) => void;
  openReject: (id: number, type: "campaign" | "listing" | "request" | "match") => void;
  onConfirmReject: (id: number) => void;
  cancelReject: () => void;
}

function ListingDrawer({
  listing, onClose, processing,
  rejectId, rejectType, rejectReason, setRejectReason,
  onApprove, openReject, onConfirmReject, cancelReject,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [aiLog, setAiLog] = useState<AiModerationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch AI analysis whenever a listing is opened
  useEffect(() => {
    if (!listing) { setAiLog(null); return; }
    setAiLog(null);
    setAiLoading(true);
    adminGetListingAiReview(listing.id)
      .then(setAiLog)
      .catch(() => setAiLog(null))
      .finally(() => setAiLoading(false));
  }, [listing?.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = listing ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [listing]);

  const visible = listing !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[520px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${visible ? "translate-x-0" : "translate-x-full"}`}
      >
        {listing && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Listing Review</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Needs Review</Badge>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* Image */}
              <div className="relative bg-stone-100 dark:bg-zinc-800 w-full" style={{ minHeight: 220 }}>
                {listing.imageUrl ? (
                  <a href={listing.imageUrl} target="_blank" rel="noopener noreferrer" className="group block relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      className="w-full object-cover"
                      style={{ maxHeight: 300 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <span className="flex items-center gap-1.5 bg-white/90 text-stone-800 text-xs font-medium px-3 py-1.5 rounded-full shadow">
                        <ZoomIn className="w-3.5 h-3.5" /> Open full image
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center justify-center" style={{ minHeight: 180 }}>
                    <div className="text-center text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No image provided by donor</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-5 space-y-5">

                {/* Title + donor */}
                <div>
                  <h2 className="text-lg font-bold leading-tight">{listing.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submitted by{" "}
                    <span className="font-semibold text-foreground">{listing.donorName}</span>
                    {listing.createdAt && (
                      <>
                        {" · "}
                        {new Date(listing.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </>
                    )}
                  </p>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Category",        value: listing.category },
                    { label: "Condition",        value: listing.condition },
                    { label: "Quantity",         value: String(listing.quantity ?? "—") },
                    { label: "City",             value: listing.city },
                    { label: "Pincode",          value: listing.pincode },
                    { label: "Delivery Radius",  value: listing.maximumDeliveryRadius ? `${listing.maximumDeliveryRadius} km` : null },
                    { label: "Transport",        value: listing.transportPayerPreference?.replace(/_/g, " ").toLowerCase() },
                    { label: "Expires",          value: listing.availabilityExpiry ? new Date(listing.availabilityExpiry).toLocaleDateString("en-IN") : null },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label} className="bg-stone-50 dark:bg-zinc-800/60 rounded-xl px-3 py-2.5">
                        <p className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">{label}</p>
                        <p className="text-sm font-semibold mt-0.5 capitalize">{value}</p>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Description */}
                {listing.description && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Description</p>
                    <p className="text-sm leading-relaxed text-foreground/90 bg-stone-50 dark:bg-zinc-800/60 rounded-xl px-4 py-3 border border-stone-100 dark:border-zinc-700">
                      {listing.description}
                    </p>
                  </div>
                )}

                {/* Previous rejection reason */}
                {listing.rejectionReason && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-4 py-3">
                    <p className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-1">Previous Rejection</p>
                    <p className="text-sm text-red-700 dark:text-red-400">{listing.rejectionReason}</p>
                  </div>
                )}

                {/* ── AI Analysis Log ── */}
                <div className="rounded-xl border border-stone-200 dark:border-zinc-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 dark:bg-zinc-800/80 border-b border-stone-200 dark:border-zinc-700">
                    <Bot className="w-3.5 h-3.5 text-[#b04a15]" />
                    <span className="text-[10px] font-bold tracking-widest text-stone-600 dark:text-stone-300 uppercase">AI Moderation Log</span>
                  </div>

                  <div className="px-4 py-3">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Running AI analysis…
                      </div>
                    ) : aiLog ? (
                      <div className="space-y-3">

                        {/* Decision chip */}
                        <div className="flex items-center gap-2">
                          {aiLog.decision === "APPROVE" && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Would Auto-Approve
                            </span>
                          )}
                          {aiLog.decision === "REJECT" && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Would Auto-Reject
                            </span>
                          )}
                          {aiLog.decision === "REVIEW" && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                              <AlertTriangle className="w-3.5 h-3.5" /> Needs Human Review
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            Confidence: <span className="font-semibold text-foreground">{aiLog.confidence.toFixed(0)}%</span>
                          </span>
                        </div>

                        {/* Confidence bar */}
                        <div className="h-1.5 w-full bg-stone-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              aiLog.decision === "APPROVE" ? "bg-emerald-500" :
                              aiLog.decision === "REJECT"  ? "bg-red-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${aiLog.confidence}%` }}
                          />
                        </div>

                        {/* Reason */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Reason: </span>
                          {aiLog.reason}
                        </p>

                        {/* Labels detected (image only) */}
                        {aiLog.labels && aiLog.labels.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Labels Detected in Image</p>
                            <div className="flex flex-wrap gap-1.5">
                              {aiLog.labels.map((label) => (
                                <span key={label} className="text-[10px] bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full font-medium">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Note about text-only */}
                        {(!listing.imageUrl) && (
                          <p className="text-[10px] text-muted-foreground/70 italic">
                            No image uploaded — AI used title &amp; description text only
                          </p>
                        )}

                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-1">AI analysis unavailable</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky footer — approve / reject */}
            <div className="shrink-0 border-t border-stone-100 dark:border-zinc-800 px-5 py-4 bg-white dark:bg-zinc-900">
              {rejectId === listing.id && rejectType === "listing" ? (
                <div className="space-y-2">
                  <Label htmlFor={`drawer-reason-${listing.id}`} className="text-xs font-semibold">Rejection reason</Label>
                  <Input
                    id={`drawer-reason-${listing.id}`}
                    placeholder="e.g. Image doesn't match description"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => onConfirmReject(listing.id)} disabled={processing === listing.id} className="flex-1">
                      {processing === listing.id ? <Loader2 className="size-4 animate-spin" /> : "Confirm Reject"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelReject}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => onApprove(listing.id)}
                    disabled={processing === listing.id}
                  >
                    {processing === listing.id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="h-4 w-4" /> Approve</>}
                  </Button>
                  <Button
                    className="flex-1 gap-1.5"
                    variant="destructive"
                    onClick={() => openReject(listing.id, "listing")}
                    disabled={processing === listing.id}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const t = useTranslations("adminApprovals");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listings, setListings]   = useState<ItemListing[]>([]);
  const [requests, setRequests]   = useState<ItemRequest[]>([]);
  const [matches, setMatches]     = useState<ItemMatch[]>([]);
  const [loading, setLoading]     = useState(true);

  const [rejectId, setRejectId]       = useState<number | null>(null);
  const [rejectType, setRejectType]   = useState<"campaign" | "listing" | "request" | "match" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing]   = useState<number | null>(null);

  // Selected listing for the detail drawer
  const [selectedListing, setSelectedListing] = useState<ItemListing | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }

    Promise.all([
      adminGetCampaigns("PENDING_APPROVAL"),
      adminGetItemListings("PENDING_REVIEW"),
      adminGetItemRequests("PENDING_VERIFICATION"),
      adminGetMatches("PENDING_APPROVAL"),
    ])
      .then(([c, l, r, m]) => { setCampaigns(c); setListings(l); setRequests(r); setMatches(m); })
      .catch(() => toast.error(t("failedToLoadQueues")))
      .finally(() => setLoading(false));
  }, [user, isLoading, router, t]);

  function openReject(id: number, type: "campaign" | "listing" | "request" | "match") {
    setRejectId(id); setRejectType(type); setRejectReason("");
  }
  function cancelReject() { setRejectId(null); setRejectType(null); setRejectReason(""); }

  async function handleApproveCampaign(id: number) {
    setProcessing(id);
    try {
      await approveCampaign(id);
      setCampaigns((p) => p.filter((c) => c.id !== id));
      toast.success(t("campaignApproved"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleRejectCampaign(id: number) {
    if (!rejectReason.trim()) { toast.error(t("enterRejectionReason")); return; }
    setProcessing(id);
    try {
      await rejectCampaign(id, rejectReason.trim());
      setCampaigns((p) => p.filter((c) => c.id !== id));
      cancelReject();
      toast.success(t("campaignRejected"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleApproveListing(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemListing(id);
      setListings((p) => p.filter((l) => l.id !== id));
      setSelectedListing(null);
      toast.success(t("listingApproved"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleRejectListing(id: number) {
    if (!rejectReason.trim()) { toast.error(t("enterRejectionReason")); return; }
    setProcessing(id);
    try {
      await adminRejectItemListing(id, rejectReason.trim());
      setListings((p) => p.filter((l) => l.id !== id));
      setSelectedListing(null);
      cancelReject();
      toast.success(t("listingRejected"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleApproveRequest(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemRequest(id);
      setRequests((p) => p.filter((r) => r.id !== id));
      toast.success(t("requestApproved"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleRejectRequest(id: number) {
    if (!rejectReason.trim()) { toast.error(t("enterRejectionReason")); return; }
    setProcessing(id);
    try {
      await adminRejectItemRequest(id, rejectReason.trim());
      setRequests((p) => p.filter((r) => r.id !== id));
      cancelReject();
      toast.success(t("requestRejected"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleApproveMatch(id: number) {
    setProcessing(id);
    try {
      await adminApproveMatch(id);
      setMatches((p) => p.filter((m) => m.id !== id));
      toast.success(t("matchApproved"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  async function handleRejectMatch(id: number) {
    if (!rejectReason.trim()) { toast.error(t("enterRejectionReason")); return; }
    setProcessing(id);
    try {
      await adminRejectMatch(id, rejectReason.trim());
      setMatches((p) => p.filter((m) => m.id !== id));
      cancelReject();
      toast.success(t("matchRejected"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("failed")); }
    finally { setProcessing(null); }
  }

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="size-8 animate-spin text-stone-400" />
    </div>
  );
  if (!user) return null;

  return (
    <>
      {/* Detail drawer for listings */}
      <ListingDrawer
        listing={selectedListing}
        onClose={() => { setSelectedListing(null); cancelReject(); }}
        processing={processing}
        rejectId={rejectId}
        rejectType={rejectType}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        onApprove={handleApproveListing}
        openReject={openReject}
        onConfirmReject={handleRejectListing}
        cancelReject={cancelReject}
      />

      <div>
        <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
            <Link href="/admin/dashboard"><Button variant="outline">{t("backToDashboard")}</Button></Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          <Tabs defaultValue="campaigns">
            <TabsList>
              <TabsTrigger value="campaigns">
                {t("tabCampaigns")} {!loading && <Badge className="ml-1.5" variant="secondary">{campaigns.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="requests">
                {t("tabItemRequests")} {!loading && <Badge className="ml-1.5" variant="secondary">{requests.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="items">
                {t("tabItemListings")} {!loading && <Badge className="ml-1.5" variant="secondary">{listings.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="contacts">
                {t("tabContactShares")} {!loading && matches.length > 0 && <Badge className="ml-1.5" variant="secondary">{matches.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ── Campaigns ── */}
            <TabsContent value="campaigns" className="mt-6 space-y-3">
              {loading
                ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
                : campaigns.length === 0
                  ? <p className="py-20 text-center text-muted-foreground">{t("noPendingCampaigns")}</p>
                  : campaigns.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{c.title}</p>
                            <p className="text-sm text-muted-foreground">{c.doneeName} · {c.city}, {c.state} · {t("goal")} {formatINR(c.targetAmount)}</p>
                          </div>
                          <Badge variant="secondary">{t("pending")}</Badge>
                        </div>
                        <p className="line-clamp-2 text-sm text-foreground/80">{c.description}</p>
                        {rejectId === c.id && rejectType === "campaign"
                          ? <RejectForm id={c.id} rejectReason={rejectReason} setRejectReason={setRejectReason} processing={processing} onConfirm={handleRejectCampaign} cancelReject={cancelReject} />
                          : <ActionButtons id={c.id} type="campaign" processing={processing} onApprove={handleApproveCampaign} openReject={openReject} />}
                      </CardContent>
                    </Card>
                  ))}
            </TabsContent>

            {/* ── Item Requests ── */}
            <TabsContent value="requests" className="mt-6 space-y-3">
              {loading
                ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
                : requests.length === 0
                  ? <p className="py-20 text-center text-muted-foreground">{t("noPendingRequests")}</p>
                  : requests.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{r.title}</p>
                            <p className="text-sm text-muted-foreground">{r.doneeName} · {r.city} · {r.category} · {t("qty")} {r.quantity} · {r.urgency} {t("urgency")}</p>
                          </div>
                          <Badge variant="secondary">{t("pending")}</Badge>
                        </div>
                        {r.description && <p className="line-clamp-2 text-sm text-foreground/80">{r.description}</p>}
                        {rejectId === r.id && rejectType === "request"
                          ? <RejectForm id={r.id} rejectReason={rejectReason} setRejectReason={setRejectReason} processing={processing} onConfirm={handleRejectRequest} cancelReject={cancelReject} />
                          : <ActionButtons id={r.id} type="request" processing={processing} onApprove={handleApproveRequest} openReject={openReject} />}
                      </CardContent>
                    </Card>
                  ))}
            </TabsContent>

            {/* ── Item Listings ── */}
            <TabsContent value="items" className="mt-6 space-y-3">
              {loading
                ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
                : listings.length === 0
                  ? <p className="py-20 text-center text-muted-foreground">{t("noPendingListings")}</p>
                  : listings.map((l) => (
                    <Card
                      key={l.id}
                      className="cursor-pointer hover:shadow-md hover:border-stone-300 dark:hover:border-zinc-600 transition-all duration-150 group"
                      onClick={() => setSelectedListing(l)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">

                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-xl shrink-0 bg-stone-100 dark:bg-zinc-800 overflow-hidden border border-stone-200 dark:border-zinc-700">
                            {l.imageUrl
                              ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" />
                              )
                              : <div className="flex items-center justify-center w-full h-full"><Package className="w-6 h-6 text-stone-300" /></div>
                            }
                          </div>

                          {/* Summary */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm leading-tight line-clamp-1">{l.title}</p>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {l.donorName} · {l.city} · {l.category}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {l.condition && (
                                <span className="text-[10px] font-medium bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full">
                                  {l.condition}
                                </span>
                              )}
                              {l.quantity && (
                                <span className="text-[10px] font-medium bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full">
                                  Qty {l.quantity}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {l.createdAt && new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          </div>

                        </div>

                        {/* Subtle hint */}
                        <p className="mt-3 text-[10px] text-muted-foreground/60 text-right group-hover:text-[#b04a15] transition-colors">
                          Click to review full details →
                        </p>
                      </CardContent>
                    </Card>
                  ))}
            </TabsContent>

            {/* ── Contact Shares ── */}
            <TabsContent value="contacts" className="mt-6 space-y-3">
              {loading
                ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
                : matches.length === 0
                  ? <p className="py-20 text-center text-muted-foreground">{t("noPendingMatches")}</p>
                  : matches.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={m.matchType === "DONATE_TO_REQUEST" ? "default" : "secondary"} className="text-xs">
                                {m.matchType === "DONATE_TO_REQUEST" ? "Donate → Request" : "Request → Listing"}
                              </Badge>
                              {m.matchScore != null && (
                                <Badge
                                  variant={m.matchScore >= 60 ? "default" : m.matchScore >= 30 ? "secondary" : "outline"}
                                  className={`text-xs ${m.matchScore >= 60 ? "bg-green-600" : m.matchScore >= 30 ? "" : "text-muted-foreground"}`}
                                >
                                  {t("aiMatch")}: {m.matchScore.toFixed(0)}%
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 font-medium">
                              {m.matchType === "DONATE_TO_REQUEST"
                                ? `${m.donorName} wants to donate for "${m.requestTitle}"`
                                : `${m.doneeName} requested "${m.listingTitle}"`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("matchDonor")}: {m.donorName} ({m.donorCity}) · {t("matchDonee")}: {m.doneeName} ({m.doneeCity})
                            </p>
                          </div>
                          <Badge variant="secondary">{t("pending")}</Badge>
                        </div>
                        {m.matchType === "DONATE_TO_REQUEST" && m.donorImages.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("donorItemPhotos")}</p>
                            <div className="flex gap-2">
                              {m.donorImages.map((url, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={t("itemPhotoAlt", { n: i + 1 })} className="h-20 w-20 rounded-lg border object-cover hover:opacity-80 transition" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.donorItemDescription && (
                          <div className="rounded-md bg-accent/40 px-3 py-2 text-sm">
                            <span className="font-medium">{t("donorDescription")}: </span>{m.donorItemDescription}
                          </div>
                        )}
                        {m.doneeReason && (
                          <div className="rounded-md bg-accent/40 px-3 py-2 text-sm">
                            <span className="font-medium">{t("doneeReason")}: </span>{m.doneeReason}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">{t("approveMatchNote")}</p>
                        {rejectId === m.id && rejectType === "match"
                          ? <RejectForm id={m.id} rejectReason={rejectReason} setRejectReason={setRejectReason} processing={processing} onConfirm={handleRejectMatch} cancelReject={cancelReject} />
                          : <ActionButtons id={m.id} type="match" processing={processing} onApprove={handleApproveMatch} openReject={openReject} />}
                      </CardContent>
                    </Card>
                  ))}
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

interface RejectFormProps {
  id: number;
  rejectReason: string;
  setRejectReason: (val: string) => void;
  processing: number | null;
  onConfirm: (id: number) => void;
  cancelReject: () => void;
}

function RejectForm({ id, rejectReason, setRejectReason, processing, onConfirm, cancelReject }: RejectFormProps) {
  const t = useTranslations("adminApprovals");
  return (
    <div className="space-y-2 pt-1">
      <Label htmlFor={`reason-${id}`}>{t("rejectionReasonLabel")}</Label>
      <Input id={`reason-${id}`} placeholder={t("rejectPlaceholder")} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={() => onConfirm(id)} disabled={processing === id}>
          {processing === id ? <Loader2 className="size-4 animate-spin" /> : t("confirmReject")}
        </Button>
        <Button size="sm" variant="outline" onClick={cancelReject}>{t("cancel")}</Button>
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  id: number;
  type: "campaign" | "listing" | "request" | "match";
  processing: number | null;
  onApprove: (id: number) => void;
  openReject: (id: number, type: "campaign" | "listing" | "request" | "match") => void;
}

function ActionButtons({ id, type, processing, onApprove, openReject }: ActionButtonsProps) {
  const t = useTranslations("adminApprovals");
  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" onClick={() => onApprove(id)} disabled={processing === id} className="gap-1">
        {processing === id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="h-4 w-4" /> {t("approve")}</>}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => openReject(id, type)} className="gap-1">
        <X className="h-4 w-4" /> {t("reject")}
      </Button>
    </div>
  );
}
