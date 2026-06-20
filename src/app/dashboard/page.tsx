"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getMyItemListings, getMyItemRequests, getMyMatches, getMyProfile,
  type ItemListing, type ItemRequest, type ItemMatch, type UserProfile
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Award, HandCoins, Loader2, Package, Pencil, Plus, ShieldCheck, X, Check,
  User, MapPin, Calendar, CircleDot, EyeOff, Info, ExternalLink, RefreshCw
} from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

function getFulfilmentStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING_APPROVAL: { label: "Pending Admin Approval", variant: "outline" },
    TRANSPORT_DISCUSSION: { label: "Discussion Enabled", variant: "secondary" },
    ARRANGEMENT_AGREED: { label: "Delivery Agreed", variant: "secondary" },
    PICKUP_SCHEDULED: { label: "Pickup Scheduled", variant: "secondary" },
    PICKED_UP: { label: "Picked Up", variant: "secondary" },
    IN_TRANSIT: { label: "In Transit", variant: "secondary" },
    DELIVERED_PENDING_CONFIRMATION: { label: "Delivered (Pending)", variant: "secondary" },
    FULFILLED: { label: "Completed & Closed", variant: "default" },
    FAILED: { label: "Delivery Failed", variant: "destructive" },
    CANCELLED: { label: "Match Cancelled", variant: "destructive" },
    REJECTED: { label: "Match Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

function getRequestStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    DRAFT: { label: "Draft", variant: "outline" },
    PENDING_VERIFICATION: { label: "Under Verification", variant: "outline" },
    VERIFIED_PRIVATE_MATCHING: { label: "Matching Privately", variant: "secondary" },
    POTENTIAL_MATCH_FOUND: { label: "Match Found", variant: "secondary" },
    AWAITING_MATCH_APPROVAL: { label: "Match Pending Approval", variant: "secondary" },
    PUBLICATION_CONSENT_REQUIRED: { label: "Consent Needed", variant: "secondary" },
    PUBLIC_REQUEST: { label: "Public Appeal", variant: "default" },
    RESERVED: { label: "Reserved", variant: "outline" },
    FULFILMENT_IN_PROGRESS: { label: "Fulfilment In Progress", variant: "secondary" },
    FULFILLED: { label: "Completed", variant: "default" },
    EXPIRED: { label: "Expired", variant: "outline" },
    REJECTED: { label: "Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"donor" | "donee">("donor");

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }

    Promise.all([
      getMyProfile().then((p) => {
        setMyProfile(p);
        if (p.role === "DONEE") {
          setActiveTab("donee");
        }
      }),
      getMyItemListings().then(setItemListings),
      getMyItemRequests().then(setItemRequests),
      getMyMatches().then(setMatches)
    ])
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  // Split matches based on current user's role
  const donorMatches = useMemo(() => {
    if (!myProfile) return [];
    return matches.filter(m => m.donorName === myProfile.fullName);
  }, [matches, myProfile]);

  const doneeMatches = useMemo(() => {
    if (!myProfile) return [];
    return matches.filter(m => m.doneeName === myProfile.fullName);
  }, [matches, myProfile]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-12">
      {/* Header and Welcome */}
      <div className="bg-[#1e2d10] bg-gradient-to-r from-[#0f1d30] via-[#1c0905] to-[#1e2d10] text-white py-10 px-4 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-2xl pointer-events-none" />
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#b04a15]/20 border border-[#b04a15]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> India verified setup
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Your Dashboard</h1>
              <p className="text-white/60 text-sm mt-1">Logged in as {user.email}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new">
                  <Button className="bg-[#b04a15] hover:bg-[#943e11] text-white font-bold rounded-xl px-5 py-2.5 h-auto btn-shine flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> List Item Privately
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <Link href="/requests/new">
                  <Button className="bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl px-5 py-2.5 h-auto flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> Post a Need
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* Toggle Switch Tabs (Only show for ADMIN to allow switching) */}
        {myProfile?.role === "ADMIN" && (
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-1.5 rounded-2xl flex gap-1 shadow-sm w-full max-w-md">
              <button
                onClick={() => setActiveTab("donor")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === "donor"
                    ? "bg-[#b04a15] text-white shadow-md"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                <HandCoins className="w-4 h-4" /> Donor Dashboard
              </button>
              <button
                onClick={() => setActiveTab("donee")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === "donee"
                    ? "bg-[#b04a15] text-white shadow-md"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                <User className="w-4 h-4" /> Donee Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "donor" ? (
          /* DONOR DASHBOARD VIEW */
          <div className="space-y-6">
            
            {/* Stats Row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-11 w-11 rounded-xl bg-orange-100 text-[#b04a15] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Private Inventory Items</p>
                    <p className="text-xl font-bold">{itemListings.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Active Match Handovers</p>
                    <p className="text-xl font-bold">{donorMatches.filter(m => m.status === "FULFILLED").length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Reliability Score</p>
                    <p className="text-xl font-bold">100%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Donor Listings & Donor Matches Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Private Inventory */}
              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-stone-400" /> My Private Inventory
                  </CardTitle>
                  <Link href="/items/new">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {itemListings.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-stone-400">You haven&apos;t listed any items to donate yet.</p>
                      <Link href="/items/new" className="inline-block mt-3">
                        <Button size="sm" className="bg-[#b04a15] text-white">List your first item</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y space-y-3">
                      {itemListings.map((l) => (
                        <div key={l.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-sm text-stone-900 dark:text-stone-100"><TranslatedText text={l.title} /></p>
                            <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
                              <span><TranslatedText text={l.city} /></span>
                              <span>•</span>
                              <span>Qty: {l.quantity}</span>
                              {l.maximumDeliveryRadius && (
                                <>
                                  <span>•</span>
                                  <span>Radius: {l.maximumDeliveryRadius}km</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant={l.status === "AVAILABLE" ? "default" : "secondary"} className="text-[10px]">
                            {l.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Donor Matches */}
              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardHeader className="border-b pb-4 mb-4">
                  <CardTitle className="text-base font-bold">Donation Match Opportunities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {donorMatches.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-stone-400">No active match proposals for your items yet.</p>
                      <p className="text-xs text-stone-400/80 mt-1">When matching needs are submitted, matches will appear here.</p>
                    </div>
                  ) : (
                    <div className="divide-y space-y-4">
                      {donorMatches.map((m) => {
                        const badge = getFulfilmentStatusBadge(m.status);
                        return (
                          <div key={m.id} className="pt-4 first:pt-0 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                  Matched need for: <TranslatedText text={m.requestTitle || "Requested Need"} />
                                </p>
                                <p className="text-xs text-stone-400 mt-0.5">Matched with item: <TranslatedText text={m.listingTitle || ""} /></p>
                              </div>
                              <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
                            </div>
                            
                            <div className="flex flex-wrap justify-between items-center text-xs bg-stone-50 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                              <div>
                                <p className="text-stone-500">Recipient Donee</p>
                                <p className="font-semibold text-stone-700 dark:text-stone-300">{m.doneeName}</p>
                              </div>
                              {m.matchScore && (
                                <div className="text-right">
                                  <p className="text-stone-500">AI Score</p>
                                  <p className="font-bold text-[#b04a15]">{m.matchScore}%</p>
                                </div>
                              )}
                            </div>

                            {m.status === "TRANSPORT_DISCUSSION" && (
                              <div className="flex justify-end gap-2 pt-1">
                                <Button size="sm" className="bg-[#b04a15] text-white text-xs font-bold rounded-lg flex items-center gap-1">
                                  Call Recipient (Masked)
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        ) : (
          /* DONEE DASHBOARD VIEW */
          <div className="space-y-6">
            
            {/* Stats Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-11 w-11 rounded-xl bg-orange-100 text-[#b04a15] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Total Needs Posted</p>
                    <p className="text-xl font-bold">{itemRequests.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Fulfilled Needs</p>
                    <p className="text-xl font-bold">{itemRequests.filter(r => r.status === "FULFILLED").length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Donee Requests & Donee Matches Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Requests list */}
              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                  <CardTitle className="text-base font-bold">My Needs & Requests</CardTitle>
                  <Link href="/requests/new">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">
                      <Plus className="w-3.5 h-3.5 mr-1" /> New Need
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {itemRequests.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-stone-400">You haven&apos;t posted any needs yet.</p>
                      <Link href="/requests/new" className="inline-block mt-3">
                        <Button size="sm" className="bg-[#b04a15] text-white">Post your first need</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y space-y-3">
                      {itemRequests.map((r) => {
                        const badge = getRequestStatusBadge(r.status);
                        return (
                          <div key={r.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-sm text-stone-900 dark:text-stone-100"><TranslatedText text={r.title} /></p>
                              <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
                                <span><TranslatedText text={r.category} /></span>
                                <span>•</span>
                                <span>Qty: {r.quantity}</span>
                                <span>•</span>
                                <span className="capitalize">{r.urgency.toLowerCase()} urgency</span>
                              </div>
                            </div>
                            <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">
                              {badge.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Donee Matches */}
              <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm">
                <CardHeader className="border-b pb-4 mb-4">
                  <CardTitle className="text-base font-bold">Matches & Handover Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doneeMatches.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-stone-400">No active matches found for your requests yet.</p>
                      <p className="text-xs text-stone-400/80 mt-1">We are actively checking private inventory to find matching items.</p>
                    </div>
                  ) : (
                    <div className="divide-y space-y-4">
                      {doneeMatches.map((m) => {
                        const badge = getFulfilmentStatusBadge(m.status);
                        return (
                          <div key={m.id} className="pt-4 first:pt-0 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                  Matched item: <TranslatedText text={m.listingTitle || "Donated Item"} />
                                </p>
                                <p className="text-xs text-stone-400 mt-0.5">For your need: <TranslatedText text={m.requestTitle || ""} /></p>
                              </div>
                              <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
                            </div>

                            <div className="flex flex-wrap justify-between items-center text-xs bg-stone-50 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                              <div>
                                <p className="text-stone-500">Donor</p>
                                <p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p>
                              </div>
                              {m.matchScore && (
                                <div className="text-right">
                                  <p className="text-stone-500">AI Score</p>
                                  <p className="font-bold text-[#b04a15]">{m.matchScore}%</p>
                                </div>
                              )}
                            </div>

                            {m.status === "TRANSPORT_DISCUSSION" && (
                              <div className="flex justify-end gap-2 pt-1">
                                <Button size="sm" className="bg-[#b04a15] text-white text-xs font-bold rounded-lg flex items-center gap-1">
                                  Call Donor (Masked)
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
