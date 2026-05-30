"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getMyCampaigns, createCampaign, getMyItemRequests, type Campaign, type ItemRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HandCoins, Loader2, Package, Plus, ShieldCheck, X } from "lucide-react";

const CATEGORIES = ["Medical", "Education", "Disaster Relief", "Animal Welfare", "Environment", "Community", "Other"];

const emptyForm = { title: "", description: "", category: "", targetAmount: "", city: "", state: "" };

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function statusVariant(status: string) {
  if (status === "APPROVED") return "default" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "secondary" as const;
}

export default function DoneeDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "DONEE") { router.push("/"); return; }
    Promise.all([getMyCampaigns(), getMyItemRequests()])
      .then(([c, r]) => { setCampaigns(c); setItemRequests(r); })
      .finally(() => setLoading(false));
  }, [user, router]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const campaign = await createCampaign({ ...form, targetAmount: parseFloat(form.targetAmount) });
      setCampaigns((prev) => [campaign, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success("Campaign submitted for review!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const active = campaigns.filter((c) => c.status === "APPROVED").length;

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Donee dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your verified campaigns.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/requests/new">
              <Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Request item</Button>
            </Link>
            <Button className="gap-1" onClick={() => setShowForm((v) => !v)}>
              {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New campaign</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active campaigns", value: String(active), icon: HandCoins },
            { label: "Total campaigns", value: String(campaigns.length), icon: Package },
            { label: "Verification", value: "Verified", icon: ShieldCheck },
          ].map((s) => (
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

        {/* Create form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New fundraiser</CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Campaign title</Label>
                  <Input id="title" placeholder="e.g. Help restore our community library" value={form.title} onChange={(e) => set("title", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Your story</Label>
                  <Textarea id="description" placeholder="Tell donors why this campaign matters…" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => set("category", v)} required>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="targetAmount">Goal (₹)</Label>
                    <Input id="targetAmount" type="number" min="100" placeholder="50000" value={form.targetAmount} onChange={(e) => set("targetAmount", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" placeholder="Maharashtra" value={form.state} onChange={(e) => set("state", e.target.value)} required />
                  </div>
                </div>
                <div className="rounded-lg bg-accent/40 p-3 text-sm text-muted-foreground">
                  CauseKind deducts a transparent <strong>5% platform fee</strong>. The remaining 95% is settled to you after verification.
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit for review"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your money campaigns</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>New</Button>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">You haven&apos;t created any campaigns yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => {
                  const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
                  return (
                    <div key={c.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{c.title}</p>
                        <Badge variant={statusVariant(c.status)}>{c.status.replace("_", " ")}</Badge>
                      </div>
                      <Progress value={pct} className="mt-3 h-2" />
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>{formatINR(c.amountRaised)} raised</span>
                        <span>Goal {formatINR(c.targetAmount)} · 95% to you after fee</span>
                      </div>
                      {c.rejectionReason && (
                        <p className="mt-2 text-xs text-destructive">Rejected: {c.rejectionReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your item requests</CardTitle>
            <Link href="/requests/new"><Button size="sm" variant="ghost">New</Button></Link>
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
      </div>
    </div>
  );
}
