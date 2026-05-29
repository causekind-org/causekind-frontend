"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }

    adminGetCampaigns("PENDING_APPROVAL")
      .then(setCampaigns)
      .catch(() => toast.error("Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, [user, router]);

  async function handleApprove(id: number) {
    setProcessing(id);
    try {
      const updated = await approveCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== updated.id));
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
      setCampaigns((prev) => prev.filter((c) => c.id !== updated.id));
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

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Approval queues</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and approve submissions before they go live.
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">
              Campaigns {!loading && <Badge className="ml-1.5" variant="secondary">{campaigns.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests">Item requests</TabsTrigger>
            <TabsTrigger value="items">Item listings</TabsTrigger>
            <TabsTrigger value="contacts">Contact shares</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6 space-y-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="py-20 text-center text-muted-foreground">No pending campaigns.</p>
            ) : (
              campaigns.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.doneeName} · {c.city}, {c.state} · Goal {formatINR(c.targetAmount)}
                        </p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>

                    <p className="line-clamp-2 text-sm text-foreground/80">{c.description}</p>

                    {rejectId === c.id ? (
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
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => handleApprove(c.id)} disabled={processing === c.id} className="gap-1">
                          {processing === c.id ? <Loader2 className="size-4 animate-spin" /> : <><Check className="h-4 w-4" /> Approve</>}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectId(c.id)} className="gap-1">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">Item requests — coming soon</div>
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">Item listings — coming soon</div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">Contact share requests — coming soon</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
