"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyDonations, getMyItemListings, type Donation, type ItemListing } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, HandCoins, Loader2, Package, Plus } from "lucide-react";


function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function statusVariant(status: string) {
  if (status === "COMPLETED") return "default" as const;
  if (status === "FAILED" || status === "REFUNDED") return "destructive" as const;
  return "secondary" as const;
}

export default function DonorDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    Promise.all([getMyDonations(), getMyItemListings()])
      .then(([d, i]) => { setDonations(d); setItemListings(i); })
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const completed = donations.filter((d) => d.status === "COMPLETED");
  const totalGiven = completed.reduce((s, d) => s + Number(d.amount), 0);
  const campaignsSupported = new Set(completed.map((d) => d.campaignId)).size;

  const stats = [
    { label: "Money donated", value: formatINR(totalGiven), icon: HandCoins },
    { label: "Campaigns supported", value: String(campaignsSupported), icon: Package },
    { label: "Certificates", value: String(completed.length > 0 ? 1 : 0), icon: Award },
  ];

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Donor dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user.email}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/items/new">
              <Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> List an item</Button>
            </Link>
            <Link href="/campaigns">
              <Button className="gap-1">Donate money</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
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

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Donations list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your donations</CardTitle>
              <Link href="/campaigns"><Button variant="ghost" size="sm">Browse more</Button></Link>
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
                        <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Annual goal */}
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

        {/* Item listings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your item listings</CardTitle>
            <Link href="/items/new"><Button variant="ghost" size="sm">Add new</Button></Link>
          </CardHeader>
          <CardContent>
            {itemListings.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">You haven&apos;t listed any items yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {itemListings.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.city} · {m.condition}</p>
                    </div>
                    <Badge variant={m.status === "APPROVED" ? "default" : m.status === "MATCHED" ? "secondary" : "outline"}>
                      {m.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
