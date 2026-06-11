"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { adminGetCampaigns, approveCampaign, rejectCampaign, adminGetItemListings, adminGetItemRequests, adminGetAllDonations, adminGetDonationStats, adminGetMatches, type Campaign, type AdminDonation, type DonationStats } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, CreditCard, HandCoins, Loader2, MapPin, Package, ShieldCheck, TrendingUp, Users, XCircle } from "lucide-react";


const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function statusVariant(status: string) {
  if (status === "APPROVED") return "default" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "secondary" as const;
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignCount, setActiveCampaignCount] = useState(0);
  const [pendingCampaignCount, setPendingCampaignCount] = useState(0);
  const [pendingListings, setPendingListings] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingMatches, setPendingMatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_APPROVAL");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [donationStats, setDonationStats] = useState<DonationStats | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }

    let cancelled = false;
    setLoading(true);
    Promise.all([
      adminGetCampaigns(statusFilter === "ALL" ? undefined : statusFilter),
      adminGetCampaigns("APPROVED"),
      adminGetCampaigns("PENDING_APPROVAL"),
      adminGetItemListings("PENDING_APPROVAL"),
      adminGetItemRequests("PENDING_APPROVAL"),
      adminGetMatches("PENDING"),
    ]).then(([c, approved, pending, l, r, m]) => {
      if (!cancelled) {
        setCampaigns(c);
        setActiveCampaignCount(approved.length);
        setPendingCampaignCount(pending.length);
        setPendingListings(l.length);
        setPendingRequests(r.length);
        setPendingMatches(m.length);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user, router, statusFilter]);

  async function loadPayments() {
    if (donations.length > 0) return;
    setPaymentsLoading(true);
    try {
      const [d, s] = await Promise.all([adminGetAllDonations(), adminGetDonationStats()]);
      setDonations(d);
      setDonationStats(s);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function handleApprove(id: number) {
    setProcessing(id);
    try {
      const updated = await approveCampaign(id);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success("Campaign approved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      const updated = await rejectCampaign(id, rejectReason.trim());
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setRejectId(null);
      setRejectReason("");
      toast.success("Campaign rejected.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setProcessing(null);
    }
  }

  if (!user) return null;

  const stats = [
    { label: "Verified donees", value: "—", icon: Users },
    { label: "Active campaigns", value: String(activeCampaignCount), icon: HandCoins },
    { label: "Pending review", value: String(pendingCampaignCount), icon: Package },
    { label: "Verified rate", value: "100%", icon: ShieldCheck },
  ];

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Verify campaigns, item listings, and connection requests.</p>
          </div>
          <Link href="/admin/approvals">
            <Button>Open approval queue</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Queues overview + radius */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Approval queues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">Campaigns awaiting review</p>
                  <Badge>{campaigns.filter((c) => c.status === "PENDING_APPROVAL").length}</Badge>
                </div>
              </Link>
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">Item requests pending</p>
                  <Badge>{pendingRequests}</Badge>
                </div>
              </Link>
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">Donor item listings pending</p>
                  <Badge>{pendingListings}</Badge>
                </div>
              </Link>
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">Contact share requests</p>
                  <Badge>{pendingMatches}</Badge>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Matching radius
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Default radius for matching in-kind donors and donees.
              </p>
              <div className="space-y-2">
                <Label>Radius (km)</Label>
                <Input defaultValue={10} type="number" min={1} max={100} disabled />
              </div>
              <Button className="w-full" disabled>Update radius</Button>
              <p className="text-xs text-muted-foreground">Available when the matching system is live.</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="items">Item requests</TabsTrigger>
            <TabsTrigger value="listings">Item listings</TabsTrigger>
            <TabsTrigger value="contacts">Contact shares</TabsTrigger>
            <TabsTrigger value="payments" onClick={loadPayments}>Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} shown</p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">No campaigns found.</p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{c.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {c.doneeName} · {c.city}, {c.state} · {c.category}
                          </p>
                        </div>
                        <Badge variant={statusVariant(c.status)} className="shrink-0">
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <p className="text-sm text-foreground/80 line-clamp-2">{c.description}</p>
                      <p className="text-sm font-medium">Goal: {formatINR(c.targetAmount)}</p>

                      {c.rejectionReason && (
                        <p className="text-sm text-destructive">Rejection reason: {c.rejectionReason}</p>
                      )}

                      {rejectId === c.id && (
                        <div className="space-y-2 pt-1">
                          <Label htmlFor={`reason-${c.id}`}>Rejection reason</Label>
                          <Input
                            id={`reason-${c.id}`}
                            placeholder="Explain why this campaign is being rejected…"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => handleReject(c.id)} disabled={processing === c.id}>
                              {processing === c.id ? <Loader2 className="size-4 animate-spin" /> : "Confirm reject"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {c.status === "PENDING_APPROVAL" && rejectId !== c.id && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={() => handleApprove(c.id)} disabled={processing === c.id}>
                            {processing === c.id ? <Loader2 className="size-4 animate-spin" /> : <><CheckCircle className="size-4" /> Approve</>}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectId(c.id)}>
                            <XCircle className="size-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center space-y-3">
              <p className="text-muted-foreground">Manage item requests from the approval queue.</p>
              <Link href="/admin/approvals"><Button variant="outline">Go to approval queue</Button></Link>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center space-y-3">
              <p className="text-muted-foreground">Manage item listings from the approval queue.</p>
              <Link href="/admin/approvals"><Button variant="outline">Go to approval queue</Button></Link>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center space-y-3">
              <p className="text-muted-foreground">Manage contact share requests from the approval queue.</p>
              <Link href="/admin/approvals"><Button variant="outline">Go to approval queue</Button></Link>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-6 space-y-6">
            {paymentsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {donationStats && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total collected</p>
                          <p className="text-xl font-bold">{formatINR(donationStats.totalCollected)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-xl font-bold">{donationStats.completedTransactions}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Unique donors</p>
                          <p className="text-xl font-bold">{donationStats.uniqueDonors}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total transactions</p>
                          <p className="text-xl font-bold">{donationStats.totalTransactions}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {donations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-20">No donations yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Donor</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {donations.map((d) => (
                          <tr key={d.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{d.donorName}</p>
                              <p className="text-xs text-muted-foreground">{d.donorEmail}</p>
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate">{d.campaignTitle}</td>
                            <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatINR(d.amount)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={d.status === "COMPLETED" ? "default" : d.status === "FAILED" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {d.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                              {d.razorpayPaymentId ?? <span className="text-muted-foreground/50">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
