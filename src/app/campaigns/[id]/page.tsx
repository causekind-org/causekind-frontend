"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCampaign, type Campaign } from "@/lib/api";
import { DonateButton } from "@/components/DonateButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, MapPin, ShieldCheck, User, Users } from "lucide-react";

const PRESETS_ONETIME = [500, 1000, 2500, 5000];
const PRESETS_DAILY = [5, 10, 20, 50, 100];


function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(1000);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [addTip, setAddTip] = useState(true);
  const [tipPct, setTipPct] = useState(10);

  useEffect(() => {
    getCampaign(Number(id))
      .then(setCampaign)
      .catch(() => setError("Campaign not found or not yet approved."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-destructive mb-4">{error || "Campaign not found."}</p>
        <Button variant="outline" asChild>
          <Link href="/campaigns"><ArrowLeft className="size-4" /> Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
  const tip = addTip ? Math.round((amount * tipPct) / 100) : 0;
  const total = amount + tip;
  const fee = Math.round(amount * 0.05);
  const beneficiary = amount - fee;
  const periodLabel = frequency === "daily" ? "/day" : frequency === "monthly" ? "/month" : "/year";
  const presets = recurring && frequency === "daily" ? PRESETS_DAILY : PRESETS_ONETIME;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to campaigns
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left — details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-[#b04a15]/15 via-orange-50 to-[#1e3a60]/10" />

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{campaign.category}</Badge>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" /> {campaign.city}, {campaign.state}
              </span>
              <span className="flex items-center gap-1 text-primary">
                <ShieldCheck className="h-3 w-3" /> Admin verified
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{campaign.title}</h1>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Organized by <span className="font-medium text-foreground">{campaign.doneeName}</span>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>About this campaign</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
              {campaign.description}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Recent donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">Be the first to donate to this campaign!</p>
            </CardContent>
          </Card>
        </div>

        {/* Right — sticky donate panel */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="space-y-5 p-6">
            <div>
              <Progress value={pct} className="h-2" />
              <div className="mt-2 flex justify-between text-sm">
                <span className="font-semibold">{formatINR(campaign.amountRaised)} raised</span>
                <span className="text-muted-foreground">of {formatINR(campaign.targetAmount)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{pct}% funded</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Donation amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={amount === p ? "default" : "outline"}
                    onClick={() => setAmount(p)}
                  >
                    ₹{p.toLocaleString("en-IN")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="rounded-lg border bg-accent/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Make it recurring</p>
                  <p className="text-xs text-muted-foreground">Give a little, regularly. Cancel anytime.</p>
                </div>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>
              {recurring && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["daily", "monthly", "yearly"] as const).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={frequency === f ? "default" : "outline"}
                      onClick={() => setFrequency(f)}
                      className="capitalize"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Tip toggle */}
            <div className="rounded-lg border bg-accent/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Add a tip to CauseKind</p>
                  <p className="text-xs text-muted-foreground">Helps keep this platform free.</p>
                </div>
                <Switch checked={addTip} onCheckedChange={setAddTip} />
              </div>
              {addTip && (
                <div className="mt-3 flex gap-2">
                  {[5, 10, 15].map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={tipPct === p ? "default" : "outline"}
                      onClick={() => setTipPct(p)}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Fee breakdown */}
            {amount > 0 && (
              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <Row label="Donation" value={formatINR(amount)} />
                {addTip && <Row label={`Tip (${tipPct}%)`} value={formatINR(tip)} />}
                <div className="my-1 h-px bg-border" />
                <Row
                  label={recurring ? `You pay${periodLabel}` : "You pay (Razorpay)"}
                  value={`${formatINR(total)}${recurring ? periodLabel : ""}`}
                  bold
                />
                <p className="pt-2 text-xs text-muted-foreground">
                  Donee receives {formatINR(beneficiary)} after 5% platform fee ({formatINR(fee)}){recurring ? " each cycle" : ""}.
                </p>
              </div>
            )}

            <DonateButton
              campaignId={campaign.id}
              campaignTitle={campaign.title}
              amount={total}
            />
            <p className="text-center text-xs text-muted-foreground">
              Secured by Razorpay · Cards · UPI · Netbanking{recurring ? " · eMandate" : ""}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
