"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  getMyDonations, getMyItemListings, getMyCampaigns, getMyItemRequests, getMyMatches,
  type Donation, type ItemListing, type Campaign, type ItemRequest, type ItemMatch
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, HandCoins, Loader2, Package, Plus, ShieldCheck } from "lucide-react";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function donationVariant(status: string) {
  if (status === "COMPLETED") return "default" as const;
  return "secondary" as const;
}

function campaignVariant(status: string) {
  if (status === "APPROVED") return "default" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "secondary" as const;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    Promise.all([getMyDonations(), getMyCampaigns(), getMyItemListings(), getMyItemRequests(), getMyMatches()])
      .then(([d, c, l, r, m]) => {
        setDonations(d);
        setCampaigns(c);
        setItemListings(l);
        setItemRequests(r);
        setMatches(m);
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const completed = donations.filter((d) => d.status === "COMPLETED");
  const totalGiven = completed.reduce((s, d) => s + Number(d.amount), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "APPROVED").length;

  const stats = [
    { label: "Money donated", value: formatINR(totalGiven), icon: HandCoins },
    { label: "Campaigns created", value: String(campaigns.length), icon: Package },
    { label: "Items listed", value: String(itemListings.length), icon: Award },
    { label: "Items requested", value: String(itemRequests.length), icon: ShieldCheck },
  ];

  return (
    <div>
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/campaigns"><Button variant="outline" className="gap-1">Donate money</Button></Link>
            <Link href="/items/new"><Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> List an item</Button></Link>
            <Link href="/campaigns/new"><Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Start campaign</Button></Link>
            <Link href="/requests/new"><Button className="gap-1"><Plus className="h-4 w-4" /> Request an item</Button></Link>
          </div>
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

        {/* Donations + Annual goal */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My donations</CardTitle>
              <Link href="/campaigns"><Button variant="ghost" size="sm">Browse campaigns</Button></Link>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-muted-foreground">You haven&apos;t donated yet.</p>
                  <Link href="/campaigns"><Button>Browse campaigns</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {donations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.campaignTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{formatINR(Number(d.amount))}</span>
                        <Badge variant={donationVariant(d.status)}>{d.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Annual giving goal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Progress value={totalGiven > 0 ? Math.min(100, Math.round((totalGiven / 26000) * 100)) : 0} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatINR(totalGiven)} given</span>
                <span>Goal ₹26,000</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {totalGiven >= 26000 ? "Goal reached!" : `₹${(26000 - totalGiven).toLocaleString("en-IN")} to go`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns + Item listings */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My campaigns</CardTitle>
              <Link href="/campaigns/new"><Button variant="ghost" size="sm">New</Button></Link>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-muted-foreground">You haven&apos;t created any campaigns yet.</p>
                  <Link href="/campaigns/new"><Button>Start a campaign</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => {
                    const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
                    return (
                      <div key={c.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{c.title}</p>
                          <Badge variant={campaignVariant(c.status)}>{c.status.replace("_", " ")}</Badge>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatINR(c.amountRaised)} raised</span>
                          <span>Goal {formatINR(c.targetAmount)}</span>
                        </div>
                        {c.rejectionReason && (
                          <p className="text-xs text-destructive">Rejected: {c.rejectionReason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My item listings</CardTitle>
              <Link href="/items/new"><Button variant="ghost" size="sm">Add new</Button></Link>
            </CardHeader>
            <CardContent>
              {itemListings.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">You haven&apos;t listed any items yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {itemListings.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{l.title}</p>
                        <p className="text-xs text-muted-foreground">{l.city} · {l.condition}</p>
                      </div>
                      <Badge variant={l.status === "APPROVED" ? "default" : l.status === "MATCHED" ? "secondary" : "outline"}>
                        {l.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Item requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My item requests</CardTitle>
            <Link href="/requests/new"><Button variant="ghost" size="sm">New</Button></Link>
          </CardHeader>
          <CardContent>
            {itemRequests.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">You haven&apos;t made any item requests yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {itemRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.city} · {r.urgency.charAt(0) + r.urgency.slice(1).toLowerCase()} urgency</p>
                    </div>
                    <Badge variant={r.status === "APPROVED" ? "default" : r.status === "REJECTED" ? "destructive" : "outline"}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My matches */}
        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My in-kind matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{m.listingTitle} → {m.requestTitle}</p>
                      <Badge variant={m.status === "APPROVED" ? "default" : m.status === "REJECTED" ? "destructive" : "secondary"}>
                        {m.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.donorName} · {m.donorCity} → {m.doneeName} · {m.doneeCity}</p>
                    {m.status === "APPROVED" && (
                      <div className="mt-2 rounded-md bg-accent/40 p-2 text-xs space-y-0.5">
                        <p className="font-medium text-foreground">Contact details shared:</p>
                        {m.donorContact && <p>Donor: {m.donorContact}</p>}
                        {m.doneeContact && <p>Donee: {m.doneeContact}</p>}
                      </div>
                    )}
                    {m.rejectionReason && (
                      <p className="text-xs text-destructive">Rejected: {m.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
