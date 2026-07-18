"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing,
  adminMarkListingNeedsInformation, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, type ItemMatch,
  adminGetListingAiAssessment, adminRunAiAssessment, type AiAssessmentResponse,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Check, ChevronDown, ChevronUp, Loader2, MessageSquare, X } from "lucide-react";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function ApprovalsPage() {
  const t = useTranslations("adminApprovals");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listings, setListings] = useState<ItemListing[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectType, setRejectType] = useState<"campaign" | "listing" | "request" | "match" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [needsInfoId, setNeedsInfoId] = useState<number | null>(null);
  const [needsInfoNote, setNeedsInfoNote] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  function loadQueues() {
    Promise.all([
      adminGetCampaigns("PENDING_APPROVAL"),
      // Load both SUBMITTED (awaiting first screening) and MANUAL_REVIEW (AI flagged for human review)
      Promise.all([
        adminGetItemListings("SUBMITTED"),
        adminGetItemListings("MANUAL_REVIEW"),
      ]).then(([submitted, manual]) => [...submitted, ...manual]),
      adminGetItemRequests("PENDING_VERIFICATION"),
      adminGetMatches("PENDING_APPROVAL"),
    ])
      .then(([c, l, r, m]) => { setCampaigns(c as Campaign[]); setListings(l as ItemListing[]); setRequests(r as ItemRequest[]); setMatches(m as ItemMatch[]); })
      .catch(() => toast.error(t("failedToLoadQueues")))
      .finally(() => setLoading(false));
  }

  useEntityUpdates(["CAMPAIGN", "LISTING", "REQUEST", "MATCH"], () => {
    loadQueues();
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }

    loadQueues();
  }, [user, isLoading, router]);

  function openReject(id: number, type: "campaign" | "listing" | "request" | "match") {
    setRejectId(id); setRejectType(type); setRejectReason("");
    setNeedsInfoId(null);
  }
  function cancelReject() { setRejectId(null); setRejectType(null); setRejectReason(""); }

  async function handleNeedsInformation(id: number) {
    if (!needsInfoNote.trim()) { toast.error("Please enter the information needed from the donor."); return; }
    setProcessing(id);
    try {
      await adminMarkListingNeedsInformation(id, needsInfoNote.trim());
      setListings((p) => p.filter((l) => l.id !== id));
      setNeedsInfoId(null);
      setNeedsInfoNote("");
      toast.success("Listing returned to donor for more information.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

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
    <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950">
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/ai-logs"><Button variant="outline" className="gap-1.5"><Bot className="h-4 w-4" /> AI Logs</Button></Link>
            <Link href="/admin/whatsapp"><Button variant="outline" className="gap-1.5"><MessageSquare className="h-4 w-4" /> WhatsApp</Button></Link>
            <Link href="/admin/dashboard"><Button variant="outline">{t("backToDashboard")}</Button></Link>
          </div>
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

          {/* Campaigns */}
          <TabsContent value="campaigns" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : campaigns.length === 0 ? <p className="py-20 text-center text-muted-foreground">{t("noPendingCampaigns")}</p>
              : campaigns.map((c) => (
                <Card key={c.id} className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-200/60 dark:border-zinc-700/40 shadow-sm">
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

          {/* Item requests */}
          <TabsContent value="requests" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : requests.length === 0 ? <p className="py-20 text-center text-muted-foreground">{t("noPendingRequests")}</p>
              : requests.map((r) => (
                <Card key={r.id} className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-200/60 dark:border-zinc-700/40 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-muted-foreground">{r.doneeName} · {r.city} · {r.category} · {t("qty")} {r.quantity} · {r.urgency} {t("urgency")}</p>
                        {r.doneeId && (
                          <Link href={`/admin/dashboard?journeyUser=${r.doneeId}`} className="mt-0.5 inline-block text-xs font-semibold text-[#b04a15] hover:underline">
                            View donee&apos;s full journey →
                          </Link>
                        )}
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

          {/* Item listings */}
          <TabsContent value="items" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : listings.length === 0 ? <p className="py-20 text-center text-muted-foreground">{t("noPendingListings")}</p>
              : listings.map((l) => (
                <Card key={l.id} className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-200/60 dark:border-zinc-700/40 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{l.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {l.donorName} · {l.city} · {l.category}
                          {l.subcategory && ` / ${l.subcategory}`}
                          {l.condition && ` · ${l.condition}`}
                          {l.brand && ` · ${l.brand}`}
                          {l.model && ` ${l.model}`}
                          {` · Qty ${l.quantity}`}
                        </p>
                        {l.donorId && (
                          <Link href={`/admin/dashboard?journeyUser=${l.donorId}`} className="mt-0.5 inline-block text-xs font-semibold text-[#b04a15] hover:underline">
                            View donor&apos;s full journey →
                          </Link>
                        )}
                      </div>
                      <Badge variant={l.status === "MANUAL_REVIEW" ? "destructive" : "secondary"}>
                        {l.status === "MANUAL_REVIEW" ? "⚠ Manual Review" : "Submitted"}
                      </Badge>
                    </div>

                    {/* Photos */}
                    {(l.imageUrl || l.imageUrls) && (
                      <div className="flex gap-2 flex-wrap">
                        {[l.imageUrl, ...(l.imageUrls ? l.imageUrls.split("|") : [])].filter(Boolean).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <button type="button" key={i} onClick={() => setLightboxUrl(url!)}>
                            <img src={url!} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg border object-cover hover:opacity-80 transition" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-stone-50 dark:bg-zinc-900 rounded-lg p-3">
                      {l.approximateAge && <div><span className="text-stone-400">Age: </span><span className="font-medium">{l.approximateAge}</span></div>}
                      {l.workingStatus && <div><span className="text-stone-400">Working: </span><span className="font-medium">{l.workingStatus.replace(/_/g, " ")}</span></div>}
                      {l.dimensions && <div><span className="text-stone-400">Size: </span><span className="font-medium">{l.dimensions}</span></div>}
                      {l.approximateWeight && <div><span className="text-stone-400">Weight: </span><span className="font-medium">{l.approximateWeight}</span></div>}
                      {l.locality && <div><span className="text-stone-400">Locality: </span><span className="font-medium">{l.locality}</span></div>}
                      {l.pincode && <div><span className="text-stone-400">PIN: </span><span className="font-medium">{l.pincode}</span></div>}
                    </div>

                    {l.knownDefects && l.knownDefects !== "NONE" && (
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Known defects: </span>
                        <span className="text-stone-700 dark:text-stone-300">{l.knownDefects}</span>
                      </div>
                    )}

                    {l.description && <p className="line-clamp-3 text-sm text-foreground/80">{l.description}</p>}

                    {l.declarationsAccepted && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ All mandatory declarations accepted by donor</p>
                    )}

                    <AiPanel listingId={l.id} />

                    {rejectId === l.id && rejectType === "listing"
                      ? <RejectForm id={l.id} rejectReason={rejectReason} setRejectReason={setRejectReason} processing={processing} onConfirm={handleRejectListing} cancelReject={cancelReject} />
                      : needsInfoId === l.id
                      ? (
                        <div className="space-y-2 pt-1">
                          <Label htmlFor={`ni-${l.id}`}>What information does the donor need to provide?</Label>
                          <Input id={`ni-${l.id}`} placeholder="e.g. Please upload clearer photos of the defect area" value={needsInfoNote} onChange={(e) => setNeedsInfoNote(e.target.value)} />
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleNeedsInformation(l.id)} disabled={processing === l.id}>
                              {processing === l.id ? <Loader2 className="size-4 animate-spin" /> : "Send to Donor"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setNeedsInfoId(null); setNeedsInfoNote(""); }}>Cancel</Button>
                          </div>
                        </div>
                      )
                      : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" onClick={() => handleApproveListing(l.id)} disabled={processing === l.id} className="gap-1">
                            {processing === l.id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="h-4 w-4" /> Approve</>}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => { setNeedsInfoId(l.id); setNeedsInfoNote(""); setRejectId(null); }}>
                            <MessageSquare className="h-4 w-4" /> Needs Info
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openReject(l.id, "listing")} className="gap-1">
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )
                    }
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Contact share matches */}
          <TabsContent value="contacts" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : matches.length === 0 ? <p className="py-20 text-center text-muted-foreground">{t("noPendingMatches")}</p>
              : matches.map((m) => (
                <Card key={m.id} className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-200/60 dark:border-zinc-700/40 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={m.matchType === "DONATE_TO_REQUEST" ? "default" : "secondary"} className="text-xs">
                            {m.matchType === "DONATE_TO_REQUEST" ? "Donate → Request" : "Request → Listing"}
                          </Badge>
                          {m.matchScore != null && (
                            <Badge variant={m.matchScore >= 60 ? "default" : m.matchScore >= 30 ? "secondary" : "outline"}
                              className={`text-xs ${m.matchScore >= 60 ? "bg-green-600" : m.matchScore >= 30 ? "" : "text-muted-foreground"}`}>
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
                            <button type="button" key={i} onClick={() => setLightboxUrl(url)}>
                              <img src={url} alt={t("itemPhotoAlt", { n: i + 1 })} className="h-20 w-20 rounded-lg border object-cover hover:opacity-80 transition" />
                            </button>
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

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Full size preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition text-lg font-bold"
            >×</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Assessment inline panel ───────────────────────────────────────────────

const REC_STYLE: Record<string, string> = {
  APPROVE: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-700",
  REJECT: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-700",
  MANUAL_REVIEW: "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-700",
  REQUEST_INFORMATION: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700",
};
const REC_ICON: Record<string, string> = {
  APPROVE: "✓", REJECT: "✗", MANUAL_REVIEW: "⚠", REQUEST_INFORMATION: "?",
};
const FRAUD_STYLE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300",
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300",
};

function AiPanel({ listingId }: { listingId: number }) {
  const [panelState, setPanelState] = useState<"idle" | "loading" | "loaded" | "none">("idle");
  const [expanded, setExpanded] = useState(false);
  const [ai, setAi] = useState<AiAssessmentResponse | null>(null);
  const [running, setRunning] = useState(false);

  async function loadAi() {
    setPanelState("loading");
    setExpanded(true);
    try {
      const data = await adminGetListingAiAssessment(listingId);
      setAi(data);
      setPanelState("loaded");
    } catch {
      setPanelState("none");
    }
  }

  async function runAi() {
    setRunning(true);
    try {
      await adminRunAiAssessment(listingId);
      toast.success("AI screening triggered — reload in a few seconds to see the result.");
      setPanelState("idle");
      setAi(null);
      setExpanded(false);
    } catch {
      toast.error("Failed to trigger AI screening.");
    } finally {
      setRunning(false);
    }
  }

  const recStyle = ai ? (REC_STYLE[ai.recommendation] ?? "bg-stone-100 text-stone-700 border-stone-300") : "";
  const recIcon = ai ? (REC_ICON[ai.recommendation] ?? "·") : "";
  const fraudStyle = ai?.fraudRisk ? (FRAUD_STYLE[ai.fraudRisk] ?? "") : "";

  return (
    <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 dark:bg-violet-950/10 dark:border-violet-800 p-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:opacity-80 transition"
          onClick={() => {
            if (panelState === "idle") { loadAi(); return; }
            setExpanded((e) => !e);
          }}
        >
          <Bot className="h-3.5 w-3.5" />
          AI Screening
          {panelState === "loaded" && ai && (
            <>
              <span className={`ml-1 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-semibold ${recStyle}`}>
                {recIcon} {ai.recommendation.replace(/_/g, " ")}
              </span>
              {expanded ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
            </>
          )}
          {panelState === "idle" && <span className="ml-1 text-violet-400 font-normal">(click to load)</span>}
          {panelState === "none" && <span className="ml-1 text-stone-400 font-normal">no assessment yet</span>}
          {panelState === "loading" && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
        </button>

        {/* Force re-run button */}
        <button
          onClick={runAi}
          disabled={running}
          className="flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-full px-2 py-0.5 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-50 transition"
        >
          {running ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Bot className="h-2.5 w-2.5" />}
          {running ? "Running…" : "Run AI"}
        </button>
      </div>

      {/* Expanded detail */}
      {panelState === "loaded" && ai && expanded && (
        <div className="mt-3 space-y-2.5">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${recStyle}`}>
              {recIcon} {ai.recommendation.replace(/_/g, " ")}
            </span>
            {ai.fraudRisk && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${fraudStyle}`}>
                Fraud: {ai.fraudRisk}
              </span>
            )}
            {ai.conditionGrade && (
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 px-2 py-0.5 text-xs text-stone-600 dark:text-stone-400">
                Grade: {ai.conditionGrade}
              </span>
            )}
            {ai.eligibilityResult && (
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 px-2 py-0.5 text-xs text-stone-600 dark:text-stone-400">
                {ai.eligibilityResult}
              </span>
            )}
          </div>

          {/* Score bars */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <ScoreBar label="Confidence" value={ai.confidence} />
          </div>

          {/* Evidence notes */}
          {ai.evidenceNotes && (
            <p className="text-xs italic text-stone-600 dark:text-stone-400 leading-relaxed">{ai.evidenceNotes}</p>
          )}

          {/* Detected labels */}
          {ai.detectedLabels && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Detected in images</p>
              <div className="flex flex-wrap gap-1">
                {ai.detectedLabels.split(",").slice(0, 10).map((lbl, i) => (
                  <span key={i} className="rounded-full bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-stone-600 dark:text-stone-400">
                    {lbl.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {ai.missingInfoFlags && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Missing info: </span>{ai.missingInfoFlags}
            </p>
          )}
          {ai.safetyWarnings && (
            <p className="text-xs text-red-700 dark:text-red-400">
              <span className="font-semibold">Safety flags: </span>{ai.safetyWarnings}
            </p>
          )}

          <p className="text-[10px] text-stone-400">
            Assessed {new Date(ai.createdAt).toLocaleString()} · Model: {ai.modelVersion}
          </p>
        </div>
      )}

      {panelState === "none" && (
        <p className="mt-2 text-xs text-stone-500">No assessment on record yet. AI runs automatically on submission — use <strong>Run AI</strong> to force a re-screen.</p>
      )}
    </div>
  );
}

function ScoreBar({ label, value, colorClass = "bg-violet-500" }: { label: string; value: number; colorClass?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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

