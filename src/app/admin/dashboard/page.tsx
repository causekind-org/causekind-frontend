"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { adminGetCampaigns, approveCampaign, rejectCampaign, adminGetItemListings, adminGetItemRequests, adminGetAllDonations, adminGetDonationStats, adminGetMatches, type Campaign, type AdminDonation, type DonationStats } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CheckCircle, CreditCard, HandCoins, Loader2, MapPin, Package, ShieldCheck, TrendingUp, Users, XCircle } from "lucide-react";

// Auth guard: show spinner while rehydrating; then check user/role.

const STATUS_OPTIONS_VALUES = ["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;

function statusVariant(status: string) {
  if (status === "APPROVED") return "default" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "secondary" as const;
}

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-amber-50 text-amber-700 border border-amber-200";
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminDashboardPage() {
  const t = useTranslations("adminDashboard");
  const { user, isLoading } = useAuth();
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
    if (isLoading) return;
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
  }, [user, isLoading, router, statusFilter]);

  async function loadPayments() {
    if (donations.length > 0) return;
    setPaymentsLoading(true);
    try {
      const [d, s] = await Promise.all([adminGetAllDonations(), adminGetDonationStats()]);
      setDonations(d);
      setDonationStats(s);
    } catch {
      toast.error(t("failedToLoadPayments"));
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function handleApprove(id: number) {
    setProcessing(id);
    try {
      const updated = await approveCampaign(id);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success(t("campaignApproved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToApprove"));
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: number) {
    if (!rejectReason.trim()) { toast.error(t("enterRejectionReason")); return; }
    setProcessing(id);
    try {
      const updated = await rejectCampaign(id, rejectReason.trim());
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setRejectId(null);
      setRejectReason("");
      toast.success(t("campaignRejected"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToReject"));
    } finally {
      setProcessing(null);
    }
  }

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="size-8 animate-spin text-stone-400" />
    </div>
  );
  if (!user) return null;

  const stats = [
    { label: t("verifiedDonees"), value: "—", icon: Users },
    { label: t("activeCampaigns"), value: String(activeCampaignCount), icon: HandCoins },
    { label: t("pendingReview"), value: String(pendingCampaignCount), icon: Package },
    { label: t("verifiedRate"), value: "100%", icon: ShieldCheck },
  ];

  return (
    <div className="bg-[#F7F0E8] dark:bg-zinc-950 min-h-screen">
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/analytics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("analytics")}
              </Button>
            </Link>
            <Link href="/admin/approvals">
              <Button>{t("openApprovalQueue")}</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-black text-[#C17A3A]">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Queues overview + radius */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader>
              <CardTitle>{t("approvalQueues")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">{t("campaignsAwaitingReview")}</p>
                  <Badge>{campaigns.filter((c) => c.status === "PENDING_APPROVAL").length}</Badge>
                </div>
              </Link>
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">{t("itemRequestsPending")}</p>
                  <Badge>{pendingRequests}</Badge>
                </div>
              </Link>
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">{t("donorItemListingsPending")}</p>
                  <Badge>{pendingListings}</Badge>
                </div>
              </Link>
              <Link href="/admin/approvals" className="block">
                <div className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-accent/40">
                  <p className="font-medium">{t("contactShareRequests")}</p>
                  <Badge>{pendingMatches}</Badge>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> {t("matchingRadius")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("matchingRadiusDescription")}
              </p>
              <div className="space-y-2">
                <Label>{t("radiusKm")}</Label>
                <Input defaultValue={10} type="number" min={1} max={100} disabled />
              </div>
              <Button className="w-full" disabled>{t("updateRadius")}</Button>
              <p className="text-xs text-muted-foreground">{t("matchingSystemLive")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#C17A3A] data-[state=active]:text-white">{t("tabCampaigns")}</TabsTrigger>
            <TabsTrigger value="items" className="data-[state=active]:bg-[#C17A3A] data-[state=active]:text-white">{t("tabItemRequests")}</TabsTrigger>
            <TabsTrigger value="listings" className="data-[state=active]:bg-[#C17A3A] data-[state=active]:text-white">{t("tabItemListings")}</TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-[#C17A3A] data-[state=active]:text-white">{t("tabContactShares")}</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-[#C17A3A] data-[state=active]:text-white" onClick={loadPayments}>{t("tabPayments")}</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("campaignsShown", { count: campaigns.length })}</p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>{t(`statusOption_${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">{t("noCampaignsFound")}</p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => (
                  <Card key={c.id} className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{c.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {c.doneeName} · {c.city}, {c.state} · {c.category}
                          </p>
                        </div>
                        <Badge variant={statusVariant(c.status)} className={`shrink-0 ${statusBadgeClass(c.status)}`}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <p className="text-sm text-foreground/80 line-clamp-2">{c.description}</p>
                      <p className="text-sm font-medium">{t("goal")}: {formatINR(c.targetAmount)}</p>

                      {c.rejectionReason && (
                        <p className="text-sm text-destructive">{t("rejectionReason")}: {c.rejectionReason}</p>
                      )}

                      {rejectId === c.id && (
                        <div className="space-y-2 pt-1">
                          <Label htmlFor={`reason-${c.id}`}>{t("rejectionReasonLabel")}</Label>
                          <Input
                            id={`reason-${c.id}`}
                            placeholder={t("rejectPlaceholder")}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => handleReject(c.id)} disabled={processing === c.id}>
                              {processing === c.id ? <Loader2 className="size-4 animate-spin" /> : t("confirmReject")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>
                              {t("cancel")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {c.status === "PENDING_APPROVAL" && rejectId !== c.id && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="bg-[#C17A3A] hover:bg-[#a86430] text-white rounded-xl" onClick={() => handleApprove(c.id)} disabled={processing === c.id}>
                            {processing === c.id ? <Loader2 className="size-4 animate-spin" /> : <><CheckCircle className="size-4" /> {t("approve")}</>}
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => setRejectId(c.id)}>
                            <XCircle className="size-4" /> {t("reject")}
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
              <p className="text-muted-foreground">{t("manageItemRequests")}</p>
              <Link href="/admin/approvals"><Button variant="outline">{t("goToApprovalQueue")}</Button></Link>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center space-y-3">
              <p className="text-muted-foreground">{t("manageItemListings")}</p>
              <Link href="/admin/approvals"><Button variant="outline">{t("goToApprovalQueue")}</Button></Link>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center space-y-3">
              <p className="text-muted-foreground">{t("manageContactShares")}</p>
              <Link href="/admin/approvals"><Button variant="outline">{t("goToApprovalQueue")}</Button></Link>
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
                    <Card className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-400 uppercase tracking-wide">{t("totalCollected")}</p>
                          <p className="text-xl font-black text-[#C17A3A]">{formatINR(donationStats.totalCollected)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-400 uppercase tracking-wide">{t("completed")}</p>
                          <p className="text-xl font-black text-[#C17A3A]">{donationStats.completedTransactions}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-400 uppercase tracking-wide">{t("uniqueDonors")}</p>
                          <p className="text-xl font-black text-[#C17A3A]">{donationStats.uniqueDonors}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-stone-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-400 uppercase tracking-wide">{t("totalTransactions")}</p>
                          <p className="text-xl font-black text-[#C17A3A]">{donationStats.totalTransactions}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {donations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-20">{t("noDonationsYet")}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colDate")}</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colDonor")}</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colCampaign")}</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("colAmount")}</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colStatus")}</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("colPaymentId")}</th>
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
