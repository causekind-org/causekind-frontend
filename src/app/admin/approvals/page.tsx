"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, type ItemMatch,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, X } from "lucide-react";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listings, setListings] = useState<ItemListing[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectType, setRejectType] = useState<"campaign" | "listing" | "request" | "match" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }

    Promise.all([
      adminGetCampaigns("PENDING_APPROVAL"),
      adminGetItemListings("PENDING_APPROVAL"),
      adminGetItemRequests("PENDING_APPROVAL"),
      adminGetMatches("PENDING"),
    ])
      .then(([c, l, r, m]) => { setCampaigns(c); setListings(l); setRequests(r); setMatches(m); })
      .catch(() => toast.error("Failed to load approval queues"))
      .finally(() => setLoading(false));
  }, [user, router]);

  function openReject(id: number, type: "campaign" | "listing" | "request" | "match") {
    setRejectId(id); setRejectType(type); setRejectReason("");
  }
  function cancelReject() { setRejectId(null); setRejectType(null); setRejectReason(""); }

  async function handleApproveCampaign(id: number) {
    setProcessing(id);
    try {
      await approveCampaign(id);
      setCampaigns((p) => p.filter((c) => c.id !== id));
      toast.success("Campaign approved!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleRejectCampaign(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await rejectCampaign(id, rejectReason.trim());
      setCampaigns((p) => p.filter((c) => c.id !== id));
      cancelReject();
      toast.success("Campaign rejected.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveListing(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemListing(id);
      setListings((p) => p.filter((l) => l.id !== id));
      toast.success("Item listing approved!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleRejectListing(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectItemListing(id, rejectReason.trim());
      setListings((p) => p.filter((l) => l.id !== id));
      cancelReject();
      toast.success("Item listing rejected.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveRequest(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemRequest(id);
      setRequests((p) => p.filter((r) => r.id !== id));
      toast.success("Item request approved!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleRejectRequest(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectItemRequest(id, rejectReason.trim());
      setRequests((p) => p.filter((r) => r.id !== id));
      cancelReject();
      toast.success("Item request rejected.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveMatch(id: number) {
    setProcessing(id);
    try {
      await adminApproveMatch(id);
      setMatches((p) => p.filter((m) => m.id !== id));
      toast.success("Match approved! Contact details sent to both parties.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleRejectMatch(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectMatch(id, rejectReason.trim());
      setMatches((p) => p.filter((m) => m.id !== id));
      cancelReject();
      toast.success("Match rejected.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  function RejectForm({ id, onConfirm }: { id: number; onConfirm: (id: number) => void }) {
    return (
      <div className="space-y-2 pt-1">
        <Label htmlFor={`reason-${id}`}>Rejection reason</Label>
        <Input id={`reason-${id}`} placeholder="Explain why…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={() => onConfirm(id)} disabled={processing === id}>
            {processing === id ? <Loader2 className="size-4 animate-spin" /> : "Confirm reject"}
          </Button>
          <Button size="sm" variant="outline" onClick={cancelReject}>Cancel</Button>
        </div>
      </div>
    );
  }

  function ActionButtons({ id, type, onApprove }: { id: number; type: "campaign" | "listing" | "request" | "match"; onApprove: (id: number) => void }) {
    return (
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onApprove(id)} disabled={processing === id} className="gap-1">
          {processing === id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="h-4 w-4" /> Approve</>}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => openReject(id, type)} className="gap-1">
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Approval queues</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review and approve submissions before they go live.</p>
          </div>
          <Link href="/admin/dashboard"><Button variant="outline">Back to dashboard</Button></Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">
              Campaigns {!loading && <Badge className="ml-1.5" variant="secondary">{campaigns.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Item requests {!loading && <Badge className="ml-1.5" variant="secondary">{requests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="items">
              Item listings {!loading && <Badge className="ml-1.5" variant="secondary">{listings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contact shares {!loading && matches.length > 0 && <Badge className="ml-1.5" variant="secondary">{matches.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Campaigns */}
          <TabsContent value="campaigns" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : campaigns.length === 0 ? <p className="py-20 text-center text-muted-foreground">No pending campaigns.</p>
              : campaigns.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-sm text-muted-foreground">{c.doneeName} · {c.city}, {c.state} · Goal {formatINR(c.targetAmount)}</p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-foreground/80">{c.description}</p>
                    {rejectId === c.id && rejectType === "campaign"
                      ? <RejectForm id={c.id} onConfirm={handleRejectCampaign} />
                      : <ActionButtons id={c.id} type="campaign" onApprove={handleApproveCampaign} />}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Item requests */}
          <TabsContent value="requests" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : requests.length === 0 ? <p className="py-20 text-center text-muted-foreground">No pending item requests.</p>
              : requests.map((r) => (
                <Card key={r.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-muted-foreground">{r.doneeName} · {r.city} · {r.category} · Qty {r.quantity} · {r.urgency} urgency</p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    {r.description && <p className="line-clamp-2 text-sm text-foreground/80">{r.description}</p>}
                    {rejectId === r.id && rejectType === "request"
                      ? <RejectForm id={r.id} onConfirm={handleRejectRequest} />
                      : <ActionButtons id={r.id} type="request" onApprove={handleApproveRequest} />}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Item listings */}
          <TabsContent value="items" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : listings.length === 0 ? <p className="py-20 text-center text-muted-foreground">No pending item listings.</p>
              : listings.map((l) => (
                <Card key={l.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{l.title}</p>
                        <p className="text-sm text-muted-foreground">{l.donorName} · {l.city} · {l.category} · {l.condition} · Qty {l.quantity}</p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    {l.description && <p className="line-clamp-2 text-sm text-foreground/80">{l.description}</p>}
                    {rejectId === l.id && rejectType === "listing"
                      ? <RejectForm id={l.id} onConfirm={handleRejectListing} />
                      : <ActionButtons id={l.id} type="listing" onApprove={handleApproveListing} />}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          {/* Contact share matches */}
          <TabsContent value="contacts" className="mt-6 space-y-3">
            {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
              : matches.length === 0 ? <p className="py-20 text-center text-muted-foreground">No pending contact share requests.</p>
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
                            <Badge variant={m.matchScore >= 60 ? "default" : m.matchScore >= 30 ? "secondary" : "outline"}
                              className={`text-xs ${m.matchScore >= 60 ? "bg-green-600" : m.matchScore >= 30 ? "" : "text-muted-foreground"}`}>
                              AI match: {m.matchScore.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 font-medium">
                          {m.matchType === "DONATE_TO_REQUEST"
                            ? `${m.donorName} wants to donate for "${m.requestTitle}"`
                            : `${m.doneeName} requested "${m.listingTitle}"`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Donor: {m.donorName} ({m.donorCity}) · Donee: {m.doneeName} ({m.doneeCity})
                        </p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>

                    {/* Donor uploaded images for DONATE_TO_REQUEST */}
                    {m.matchType === "DONATE_TO_REQUEST" && m.donorImages.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Donor&apos;s item photos</p>
                        <div className="flex gap-2">
                          {m.donorImages.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Item photo ${i + 1}`}
                                className="h-20 w-20 rounded-lg border object-cover hover:opacity-80 transition" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Donor description */}
                    {m.donorItemDescription && (
                      <div className="rounded-md bg-accent/40 px-3 py-2 text-sm">
                        <span className="font-medium">Donor&apos;s description: </span>{m.donorItemDescription}
                      </div>
                    )}

                    {/* Donee reason for REQUEST_LISTING */}
                    {m.doneeReason && (
                      <div className="rounded-md bg-accent/40 px-3 py-2 text-sm">
                        <span className="font-medium">Donee&apos;s reason: </span>{m.doneeReason}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">Approving will share contact numbers between both parties via email.</p>
                    {rejectId === m.id && rejectType === "match"
                      ? <RejectForm id={m.id} onConfirm={handleRejectMatch} />
                      : <ActionButtons id={m.id} type="match" onApprove={handleApproveMatch} />}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
