"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getMyDonations, getMyItemListings, getMyCampaigns, getMyItemRequests, getMyMatches,
  type Donation, type ItemListing, type Campaign, type ItemRequest, type ItemMatch
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, HandCoins, Loader2, Package, Pencil, Plus, ShieldCheck, X, Check } from "lucide-react";

const DEFAULT_GOAL = 26000;
const GOAL_KEY_PREFIX = "ck_annual_goal_";

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

function toTitleCase(str: string) {
  return str.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [annualGoal, setAnnualGoal] = useState<number>(DEFAULT_GOAL);
  const [goalIsCustom, setGoalIsCustom] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState<string>("");
  const [goalError, setGoalError] = useState<string>("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }

    const stored = localStorage.getItem(GOAL_KEY_PREFIX + user.email);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 100) {
        setAnnualGoal(parsed);
        setGoalIsCustom(true);
      }
    }

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
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  const completed = donations.filter((d) => d.status === "COMPLETED");
  const totalGiven = completed.reduce((s, d) => s + Number(d.amount), 0);

  const stats = [
    { label: t("moneyDonated"), value: formatINR(totalGiven), icon: HandCoins },
    { label: t("campaignsCreated"), value: String(campaigns.length), icon: Package },
    { label: t("itemsListed"), value: String(itemListings.length), icon: Award },
    { label: t("itemsRequested"), value: String(itemRequests.length), icon: ShieldCheck },
  ];

  const goalPct = annualGoal > 0 ? Math.round((totalGiven / annualGoal) * 100) : 0;
  const goalBarValue = Math.min(100, goalPct);
  const goalReached = totalGiven >= annualGoal;

  function openGoalEditor() {
    setGoalInput(String(annualGoal));
    setGoalError("");
    setEditingGoal(true);
  }

  function cancelGoalEdit() {
    setEditingGoal(false);
    setGoalError("");
  }

  function saveGoal() {
    if (!user) return;
    const val = parseInt(goalInput, 10);
    if (isNaN(val) || val < 100) {
      setGoalError("Please enter a goal of at least ₹100.");
      return;
    }
    if (val > 100_000_000) {
      setGoalError("Goal seems too large. Max ₹10 crore.");
      return;
    }
    localStorage.setItem(GOAL_KEY_PREFIX + user.email, String(val));
    setAnnualGoal(val);
    setGoalIsCustom(true);
    setEditingGoal(false);
    setGoalError("");
    toast.success("Annual goal updated!");
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("welcomeBack")}, {user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/campaigns" className="w-fit"><Button variant="outline" className="gap-1">{t("donateMoney")}</Button></Link>
            <Link href="/items/new" className="w-fit"><Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> {t("listItem")}</Button></Link>
            <Link href="/campaigns/new" className="w-fit"><Button variant="outline" className="gap-1"><Plus className="h-4 w-4" /> {t("startCampaign")}</Button></Link>
            <Link href="/requests/new" className="w-fit"><Button className="gap-1"><Plus className="h-4 w-4" /> {t("requestItem")}</Button></Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-2 p-3 sm:gap-4 sm:p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                  <p className="text-base font-bold leading-tight sm:text-xl">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Donations + Annual goal */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("myDonations")}</CardTitle>
              <Link href="/campaigns" className="w-fit"><Button variant="ghost" size="sm">{t("browseCampaigns")}</Button></Link>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-muted-foreground">{t("noDonations")}</p>
                  <Link href="/campaigns" className="inline-flex"><Button>{t("browseCampaigns")}</Button></Link>
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
                        <Badge variant={donationVariant(d.status)}>{toTitleCase(d.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Annual giving goal */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{t("annualGoal")}</CardTitle>
              {!editingGoal && (
                <button
                  onClick={openGoalEditor}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Edit annual goal"
                >
                  <Pencil className="h-3 w-3" />
                  {t("edit")}
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {editingGoal ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("setGoalLabel")}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={100}
                      max={10_000_000}
                      value={goalInput}
                      onChange={(e) => { setGoalInput(e.target.value); setGoalError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") cancelGoalEdit(); }}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  {goalError && <p className="text-xs text-destructive">{goalError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveGoal} className="gap-1">
                      <Check className="h-3 w-3" /> {t("save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelGoalEdit} className="gap-1">
                      <X className="h-3 w-3" /> {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {!goalIsCustom && (
                    <button
                      onClick={openGoalEditor}
                      className="w-full rounded-md border border-dashed border-muted-foreground/40 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      {t("setOwnGoal")}
                    </button>
                  )}
                  <Progress value={goalBarValue} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatINR(totalGiven)} {t("given")}</span>
                    <span>{t("goal")} {formatINR(annualGoal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {goalReached
                      ? `${t("goalReached")} (${goalPct}%)`
                      : `${goalPct}% · ₹${(annualGoal - totalGiven).toLocaleString("en-IN")} ${t("toGo")}`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaigns + Item listings */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("myCampaigns")}</CardTitle>
              <Link href="/campaigns/new" className="w-fit"><Button variant="ghost" size="sm">{t("new") || "New"}</Button></Link>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-muted-foreground">{t("noCampaigns")}</p>
                  <Link href="/campaigns/new" className="inline-flex"><Button>{t("startCampaign")}</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => {
                    const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
                    return (
                      <div key={c.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{c.title}</p>
                          <Badge variant={campaignVariant(c.status)}>{toTitleCase(c.status)}</Badge>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatINR(c.amountRaised)} {t("raised")}</span>
                          <span>{t("goal")} {formatINR(c.targetAmount)}</span>
                        </div>
                        {c.rejectionReason && (
                          <p className="text-xs text-destructive">{t("rejected")}: {c.rejectionReason}</p>
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
              <CardTitle>{t("myListings")}</CardTitle>
              <Link href="/items/new" className="w-fit"><Button variant="ghost" size="sm">{t("addNew")}</Button></Link>
            </CardHeader>
            <CardContent>
              {itemListings.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">{t("noListings")}</p>
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
                        {toTitleCase(l.status)}
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
            <CardTitle>{t("myRequests")}</CardTitle>
            <Link href="/requests/new" className="w-fit"><Button variant="ghost" size="sm">{t("new") || "New"}</Button></Link>
          </CardHeader>
          <CardContent>
            {itemRequests.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">{t("noRequests")}</p>
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
                      {toTitleCase(r.status)}
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
              <CardTitle>{t("myMatches")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{m.listingTitle} → {m.requestTitle}</p>
                      <Badge variant={m.status === "APPROVED" ? "default" : m.status === "REJECTED" ? "destructive" : "secondary"}>
                        {toTitleCase(m.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.donorName} · {m.donorCity} → {m.doneeName} · {m.doneeCity}</p>
                    {m.status === "APPROVED" && (
                      <div className="mt-2 rounded-md bg-accent/40 p-2 text-xs space-y-0.5">
                        <p className="font-medium text-foreground">{t("contactDetails")}</p>
                        {m.donorContact && <p>{t("donor")}: {m.donorContact}</p>}
                        {m.doneeContact && <p>{t("donee")}: {m.doneeContact}</p>}
                      </div>
                    )}
                    {m.rejectionReason && (
                      <p className="text-xs text-destructive">{t("rejected")}: {m.rejectionReason}</p>
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
