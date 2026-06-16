"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { getCampaign, getProfile, type Campaign, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { DonateButton } from "@/components/DonateButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, MessageSquare, Send, ShieldCheck, User, Users } from "lucide-react";

const PRESETS_ONETIME = [500, 1000, 2500, 5000];
const PRESETS_DAILY = [5, 10, 20, 50, 100];

type CampaignUpdate = {
  id: string;
  content: string;
  createdAt: string;
  userName: string;
};

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
  const { user } = useAuth();
  const t = useTranslations("campaigns");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [translatedTitle, translatedDescription] = useDynamicTranslations([
    campaign?.title ?? null,
    campaign?.description ?? null,
  ]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(1000);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [addTip, setAddTip] = useState(true);
  const [tipPct, setTipPct] = useState(10);

  // Campaign updates
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [updateText, setUpdateText] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);

  // Mobile sticky donate bar
  const [showStickyBar, setShowStickyBar] = useState(true);
  const donatePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCampaign(Number(id))
      .then((c) => {
        setCampaign(c);
        try {
          const stored = localStorage.getItem(`ck_updates_${id}`);
          if (stored) setUpdates(JSON.parse(stored));
        } catch {}
      })
      .catch(() => setError("Campaign not found or not yet approved."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    getProfile().then(setMyProfile).catch(() => {});
  }, [user]);

  // Hide sticky bar when donate panel scrolls into view on mobile
  useEffect(() => {
    const el = donatePanelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [campaign]);

  function postUpdate() {
    if (!updateText.trim() || !campaign) return;
    setPostingUpdate(true);
    const newUpdate: CampaignUpdate = {
      id: Date.now().toString(),
      content: updateText.trim(),
      createdAt: new Date().toISOString(),
      userName: myProfile?.fullName || user?.email || "Organizer",
    };
    const next = [newUpdate, ...updates];
    setUpdates(next);
    try {
      localStorage.setItem(`ck_updates_${id}`, JSON.stringify(next));
    } catch {}
    setUpdateText("");
    setPostingUpdate(false);
    toast.success("Update posted!");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-5 w-40 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-64 rounded-2xl bg-stone-100 dark:bg-zinc-800 animate-pulse" />
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-5 w-28 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-3/4 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-40 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 p-6 space-y-3">
              <div className="h-5 w-40 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" style={{ width: `${65 + i * 5}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 p-6 space-y-4">
            <div className="h-2 w-full bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            ))}
            <div className="h-12 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>
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
  const isOrganizer = !!myProfile && myProfile.id === campaign.doneeId;

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-8">
      <div className="grid gap-0 lg:gap-8 lg:grid-cols-3 lg:px-4 lg:py-8">
        {/* Left — details */}
        <div className="space-y-0 lg:space-y-6 lg:col-span-2">
          {/* Hero image — full bleed on mobile, rounded on desktop */}
          <div className="relative h-64 sm:h-80 overflow-hidden bg-gradient-to-br from-[#b04a15]/15 via-orange-50 dark:via-zinc-800 to-[#1e3a60]/10 lg:rounded-2xl">
            {campaign.imageUrl && (
              <Image
                src={campaign.imageUrl}
                alt={campaign.title}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            )}
            {/* Back button overlaid on image */}
            <Link
              href="/campaigns"
              className="absolute top-4 left-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm shadow-md text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-zinc-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {/* Title + meta — padded on mobile */}
          <div className="px-4 pt-4 lg:px-0 lg:pt-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                <TranslatedText text={campaign.city} /> · <TranslatedText text={campaign.category} />
              </span>
              <span className="flex items-center gap-1 text-[#C17A3A] font-semibold">
                <ShieldCheck className="h-3 w-3" /> {t("adminVerified")}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl leading-tight">{translatedTitle ?? campaign.title}</h1>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {t("organizedBy")} <span className="font-medium text-foreground">{campaign.doneeName}</span>
            </div>

            {/* Funded inline on mobile */}
            <div className="mt-4 lg:hidden space-y-2">
              <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#C17A3A] to-[#e07b3a] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-[#C17A3A]">{formatINR(campaign.amountRaised)} {t("raised")}</span>
                <span className="text-muted-foreground">of {formatINR(campaign.targetAmount)}</span>
              </div>
              <p className="text-xs text-stone-400 font-semibold">{pct}% {t("funded")}</p>
            </div>
          </div>

          <div className="px-4 lg:px-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("aboutCampaign")}</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
              {translatedDescription ?? campaign.description}
            </CardContent>
          </Card>

          {/* Campaign updates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#b04a15]" />
                {t("updates")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOrganizer && (
                <div className="space-y-2 p-3 rounded-xl bg-orange-50/60 dark:bg-zinc-800/60 border border-orange-100 dark:border-stone-800">
                  <p className="text-xs font-semibold text-[#b04a15] dark:text-orange-300">{t("postUpdate")}</p>
                  <Textarea
                    placeholder="Share progress, milestones, or a thank-you with your donors…"
                    rows={3}
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    className="rounded-xl border-orange-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 resize-none text-sm bg-white dark:bg-zinc-900"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={postUpdate}
                      disabled={!updateText.trim() || postingUpdate}
                      className="bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl gap-1.5 font-semibold"
                    >
                      <Send className="h-3.5 w-3.5" /> Post update
                    </Button>
                  </div>
                </div>
              )}
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("noUpdates")}</p>
              ) : (
                <div className="space-y-3">
                  {updates.map((u) => (
                    <div key={u.id} className="rounded-xl border border-orange-100 dark:border-stone-800 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#b04a15] dark:text-orange-300">{u.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line"><TranslatedText text={u.content} /></p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> {t("recentDonors")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">{t("beFirstToDonate")}</p>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Right — sticky donate panel */}
        <div ref={donatePanelRef} id="donate-panel" className="px-4 lg:px-0">
          <Card className="h-fit lg:sticky lg:top-20">
            <CardContent className="space-y-5 p-6">
              {/* Progress bar — only visible on desktop (mobile shows it inline above) */}
              <div className="hidden lg:block">
                <Progress value={pct} className="h-2" />
                <div className="mt-2 flex justify-between text-sm">
                  <span className="font-semibold">{formatINR(campaign.amountRaised)} {t("raised")}</span>
                  <span className="text-muted-foreground">of {formatINR(campaign.targetAmount)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{pct}% {t("funded")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{t("donationAmount")}</Label>
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
                    <p className="text-sm font-medium">{t("makeRecurring")}</p>
                    <p className="text-xs text-muted-foreground">{t("giveRegularly")}</p>
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
                    <p className="text-sm font-medium">{t("addTip")}</p>
                    <p className="text-xs text-muted-foreground">{t("keepFree")}</p>
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

      {/* Mobile sticky bottom donate bar */}
      <div
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-orange-100 dark:border-stone-800 px-4 py-3 flex items-center gap-3 shadow-lg"
          style={{ marginBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate">{translatedTitle ?? campaign.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#b04a15] to-[#e07b3a] rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-stone-400 shrink-0">{pct}%</span>
            </div>
          </div>
          <Button
            onClick={() =>
              donatePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            className="bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl px-5 font-bold shrink-0 shadow-md"
          >
            Donate ₹{amount.toLocaleString("en-IN")}
          </Button>
        </div>
      </div>
    </div>
  );
}
