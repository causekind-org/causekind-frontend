"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { getCampaign, getProfile, initiateDonation, type Campaign, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  User,
  Users,
  Heart,
  Share2,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Stethoscope,
  Pill,
  Bed,
  CheckCircle,
  Mail,
  Loader2
} from "lucide-react";

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
    <div className={`flex justify-between ${bold ? "font-semibold text-stone-900" : "text-stone-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
  
  // Donation States
  const [amount, setAmount] = useState(1000);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [addTip, setAddTip] = useState(true);
  const [tipPct, setTipPct] = useState(10);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Campaign updates
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [updateText, setUpdateText] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);

  // FAQs Accordion States
  const [faq1Open, setFaq1Open] = useState(false);
  const [faq2Open, setFaq2Open] = useState(false);

  // Sticky Donate Bar
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

  useEffect(() => {
    const el = donatePanelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.1 }
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

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleDonateCheckout() {
    if (!user) {
      router.push(`/login?redirect=/campaigns/${id}`);
      return;
    }
    if (!campaign) return;
    if (!amount || isNaN(amount) || amount < 1) {
      toast.error("Enter a valid amount (minimum ₹1)");
      return;
    }
    setCheckoutLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load Razorpay. Check your connection.");
        return;
      }
      const order = await initiateDonation(campaign.id, total);
      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: "CauseKind",
        description: campaign.title,
        order_id: order.razorpayOrderId,
        prefill: { email: user.email },
        theme: { color: "#8C3D1D" },
        handler: () => {
          setIsDonateModalOpen(false);
          router.push(
            `/thank-you?campaign=${encodeURIComponent(campaign.title)}&amount=${total}&campaignId=${campaign.id}`
          );
        },
        modal: { ondismiss: () => toast.info("Payment cancelled.") },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const handleShare = () => {
    const shareUrl = window.location.href;
    const shareTitle = campaign?.title || "Support this Campaign on CauseKind";
    if (navigator.share) {
      navigator
        .share({
          title: shareTitle,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Campaign link copied to clipboard!");
    }
  };

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
  const isOrganizer = !!myProfile && myProfile.id === campaign.doneeId;
  const presets = recurring && frequency === "daily" ? PRESETS_DAILY : PRESETS_ONETIME;

  // Mocked details matching visual layout
  const daysLeft = campaign.id % 2 === 0 ? 15 : 21;
  const donorsCount = campaign.id % 2 === 0 ? 42 : 18;

  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-24 text-stone-800 selection:bg-[#8C3D1D]/10 selection:text-[#8C3D1D]">
      {/* Alert Banner */}
      <div className="bg-[#D3F5DD] text-[#1E5631] px-4 py-3.5 text-center text-sm font-semibold flex items-center justify-center gap-2 border-b border-[#BBECC9]">
        <span className="flex h-2 w-2 rounded-full bg-[#2E9348] animate-ping" />
        <span className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-[#2E9348] text-[#2E9348]" />
          Just now: Someone donated ₹500 to this campaign!
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3 items-start">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Image */}
            <div className="relative h-64 sm:h-96 w-full overflow-hidden rounded-3xl bg-stone-200 border border-[#EDECE7] shadow-sm">
              {campaign.imageUrl ? (
                <Image
                  src={campaign.imageUrl}
                  alt={campaign.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover transition-transform duration-500 hover:scale-[1.01]"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#8C3D1D]/10 to-orange-50 flex items-center justify-center">
                  <Heart className="h-16 w-16 text-[#8C3D1D]/30" />
                </div>
              )}
              
              {/* Back Button */}
              <Link
                href="/campaigns"
                className="absolute top-4 left-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md text-stone-700 hover:bg-white transition-all hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>

            {/* Badges & Title */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#FDF0E9] text-[#8C3D1D] font-bold text-xs py-1 px-3 rounded-full uppercase tracking-wider">
                  <TranslatedText text={campaign.category} />
                </span>
                <span className="bg-[#EFEFEF] text-stone-600 font-bold text-xs py-1 px-3 rounded-full uppercase tracking-wider">
                  <TranslatedText text={campaign.city} />
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-400 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-[#8C3D1D]" /> Admin Verified
                </span>
              </div>
              
              <h1 className="text-3xl font-extrabold sm:text-4xl text-stone-900 leading-tight tracking-tight">
                {translatedTitle ?? campaign.title}
              </h1>
            </div>

            {/* Progress Card */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <span className="text-3xl font-extrabold text-[#8C3D1D]">{formatINR(campaign.amountRaised)}</span>
                  <span className="text-sm text-stone-500 font-medium ml-2">raised of {formatINR(campaign.targetAmount)} goal</span>
                </div>
                <div className="text-sm font-bold text-[#8C3D1D] uppercase tracking-wide shrink-0">
                  {pct}% Funded
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#F3F1EC] rounded-full h-3.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8C3D1D] to-[#BA5C38] rounded-full transition-all duration-700" 
                  style={{ width: `${pct}%` }} 
                />
              </div>

              {/* Progress Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-[#F2F1EC] text-sm text-stone-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-stone-400" />
                  {donorsCount} Donors
                </span>
                <span>{daysLeft} Days left</span>
              </div>
            </div>

            {/* About Campaign */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 sm:p-8 space-y-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl font-bold text-stone-900">About the Campaign</h2>
              <div className="text-sm sm:text-base leading-relaxed text-stone-700 whitespace-pre-line">
                {translatedDescription ?? campaign.description}
              </div>
            </div>

            {/* Where your money goes */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl font-bold text-stone-900">Where your money goes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1 */}
                <div className="bg-[#FAF9F5] border border-[#EDECE7] p-5 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                  <div className="h-10 w-10 bg-[#FBEFEA] text-[#8C3D1D] rounded-full flex items-center justify-center">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Surgery Cost</p>
                    <p className="text-lg font-extrabold text-[#8C3D1D] mt-0.5">{formatINR(Math.round(campaign.targetAmount * 0.6))}</p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-[#FAF9F5] border border-[#EDECE7] p-5 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                  <div className="h-10 w-10 bg-[#FBEFEA] text-[#8C3D1D] rounded-full flex items-center justify-center">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Medication</p>
                    <p className="text-lg font-extrabold text-[#8C3D1D] mt-0.5">{formatINR(Math.round(campaign.targetAmount * 0.25))}</p>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-[#FAF9F5] border border-[#EDECE7] p-5 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                  <div className="h-10 w-10 bg-[#FBEFEA] text-[#8C3D1D] rounded-full flex items-center justify-center">
                    <Bed className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Post-op Care</p>
                    <p className="text-lg font-extrabold text-[#8C3D1D] mt-0.5">{formatINR(Math.round(campaign.targetAmount * 0.15))}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Updates posting section for Organizer */}
            {isOrganizer && (
              <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] space-y-4">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#8C3D1D]" />
                  Organizer Updates
                </h2>
                <div className="space-y-3 p-4 rounded-2xl bg-[#FCFAF6] border border-[#EDECE7]">
                  <p className="text-xs font-semibold text-[#8C3D1D]">{t("postUpdate")}</p>
                  <Textarea
                    placeholder="Share progress, milestones, or a thank-you with your donors…"
                    rows={3}
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    className="rounded-xl border-[#EDECE7] focus-visible:ring-[#8C3D1D]/20 resize-none text-sm bg-white"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={postUpdate}
                      disabled={!updateText.trim() || postingUpdate}
                      className="bg-[#8C3D1D] hover:bg-[#733115] text-white rounded-xl gap-1.5 font-bold px-4"
                    >
                      <Send className="h-3.5 w-3.5" /> Post update
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Updates list if present */}
            {updates.length > 0 && (
              <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] space-y-4">
                <h2 className="text-lg font-bold text-stone-955">Milestones & Progress</h2>
                <div className="space-y-3">
                  {updates.map((u) => (
                    <div key={u.id} className="rounded-2xl border border-[#EDECE7] p-4 space-y-2 bg-[#FCFAF7]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#8C3D1D]">{u.userName}</span>
                        <span className="text-xs text-stone-400">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                        <TranslatedText text={u.content} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Support */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
              <h2 className="text-xl font-bold text-stone-900">Recent Support</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supporter 1 */}
                <div className="flex items-center gap-4 bg-[#FAF9F5] border border-[#EDECE7] p-4 rounded-2xl">
                  <div className="h-10 w-10 bg-[#E8E6DF] rounded-full flex items-center justify-center font-bold text-stone-600 text-sm">
                    AS
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900">Anjali S.</p>
                    <p className="text-xs text-stone-500">2 hours ago</p>
                  </div>
                  <div className="text-sm font-extrabold text-[#8C3D1D]">₹500</div>
                </div>

                {/* Supporter 2 */}
                <div className="flex items-center gap-4 bg-[#FAF9F5] border border-[#EDECE7] p-4 rounded-2xl">
                  <div className="h-10 w-10 bg-[#E8E6DF] rounded-full flex items-center justify-center font-bold text-stone-600 text-sm">
                    RK
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900">Rahul K.</p>
                    <p className="text-xs text-stone-500">5 hours ago</p>
                  </div>
                  <div className="text-sm font-extrabold text-[#8C3D1D]">₹1,000</div>
                </div>

                {/* Supporter 3 */}
                <div className="flex items-center gap-4 bg-[#FAF9F5] border border-[#EDECE7] p-4 rounded-2xl">
                  <div className="h-10 w-10 bg-[#E8E6DF] rounded-full flex items-center justify-center font-bold text-stone-600 text-sm">
                    PM
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-905">Priya M.</p>
                    <p className="text-xs text-stone-505">1 day ago</p>
                  </div>
                  <div className="text-sm font-extrabold text-[#8C3D1D]">₹250</div>
                </div>

                {/* Supporter 4 */}
                <div className="flex items-center gap-4 bg-[#FAF9F5] border border-[#EDECE7] p-4 rounded-2xl">
                  <div className="h-10 w-10 bg-[#E8E6DF] rounded-full flex items-center justify-center font-bold text-stone-606 text-sm">
                    <User className="h-4 w-4 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 italic text-stone-500">Anonymous</p>
                    <p className="text-xs text-stone-500">2 days ago</p>
                  </div>
                  <div className="text-sm font-extrabold text-[#8C3D1D]">₹352</div>
                </div>
              </div>

              <div className="text-center pt-2">
                <button className="text-[#8C3D1D] hover:text-[#733115] font-bold text-sm flex items-center justify-center gap-1.5 mx-auto hover:underline">
                  View all {donorsCount} donors &rarr;
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Sticky Sidebar) */}
          <div ref={donatePanelRef} id="donate-panel" className="space-y-6 lg:sticky lg:top-24">
            
            {/* Main Action Card */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-4">
              
              {/* Primary Action Button */}
              <button 
                onClick={() => setIsDonateModalOpen(true)}
                className="w-full bg-[#8C3D1D] hover:bg-[#733115] text-white py-4 px-6 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 shadow-md shadow-[#8c3d1d]/10"
              >
                <Heart className="h-5 w-5 fill-white" />
                Donate Now
              </button>

              {/* Secondary Share Button */}
              <button 
                onClick={handleShare}
                className="w-full border border-[#EDECE7] text-stone-700 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-50 hover:scale-[1.01] transition-all duration-150"
              >
                <Share2 className="h-5 w-5 text-stone-505" />
                Share Campaign
              </button>

              {/* Trust & Security Info */}
              <div className="pt-4 border-t border-[#F2F1EC] space-y-3.5">
                <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Trust & Security</p>
                
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-emerald-600 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-stone-900">Identity Verified Organizer</p>
                    <p className="text-stone-500">Government ID & bank verified details.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-stone-600 bg-stone-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="h-3 w-3" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-stone-900">Secure SSL Payment</p>
                    <p className="text-stone-505">256-bit encrypted transactions via Razorpay.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-stone-600 bg-stone-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-stone-900">Tax Deductible Receipt Available</p>
                    <p className="text-stone-500">Claim 80G tax exemptions instantly.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Campaign Organizer */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-4">
              <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Campaign Organizer</p>
              
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-tr from-[#8C3D1D]/35 to-orange-100 text-[#8C3D1D] rounded-full flex items-center justify-center font-bold text-lg border border-[#EDECE7]">
                  {campaign.doneeName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-stone-950 text-base">{campaign.doneeName}</h4>
                  <p className="text-xs text-stone-505 flex items-center gap-0.5">
                    <MapPin className="h-3.5 w-3.5 text-stone-400" />
                    {campaign.city || "India"}
                  </p>
                </div>
              </div>

              <button className="w-full border border-[#EDECE7] hover:bg-stone-50 text-stone-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                Contact Organizer
              </button>
            </div>

            {/* FAQ Accordion */}
            <div className="bg-white border border-[#EDECE7] rounded-3xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-4">
              <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">FAQ</p>
              
              <div className="space-y-3">
                {/* FAQ 1 */}
                <div className="border-b border-[#F2F1EC] pb-3.5">
                  <button
                    onClick={() => setFaq1Open(!faq1Open)}
                    className="w-full flex justify-between items-center text-left font-bold text-stone-800 hover:text-stone-950 text-sm transition-colors"
                  >
                    <span>Are donations tax-deductible?</span>
                    {faq1Open ? <ChevronUp className="h-4 w-4 text-[#8C3D1D]" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                  </button>
                  {faq1Open && (
                    <p className="mt-2 text-xs text-stone-500 leading-relaxed transition-all">
                      Yes! All donations made to this campaign are eligible for tax deduction under Section 80G of the Income Tax Act. A receipt will be sent to your registered email address automatically.
                    </p>
                  )}
                </div>

                {/* FAQ 2 */}
                <div className="pt-1">
                  <button
                    onClick={() => setFaq2Open(!faq2Open)}
                    className="w-full flex justify-between items-center text-left font-bold text-stone-800 hover:text-stone-950 text-sm transition-colors"
                  >
                    <span>How is the money withdrawn?</span>
                    {faq2Open ? <ChevronUp className="h-4 w-4 text-[#8C3D1D]" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                  </button>
                  {faq2Open && (
                    <p className="mt-2 text-xs text-stone-505 leading-relaxed transition-all">
                      The funds raised are transferred directly to the verified bank account of the beneficiary (or hospital partners supporting this medical cause) after thorough verification processes.
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Sticky Bottom Donate Bar */}
      <div
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="bg-white/95 backdrop-blur-sm border-t border-[#EDECE7] px-4 py-3.5 flex items-center gap-3 shadow-xl"
          style={{ marginBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-900 truncate">{translatedTitle ?? campaign.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-stone-105 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8C3D1D] to-[#BA5C38] rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-400 font-bold shrink-0">{pct}%</span>
            </div>
          </div>
          <button
            onClick={() => setIsDonateModalOpen(true)}
            className="bg-[#8C3D1D] hover:bg-[#733115] text-white rounded-xl px-5 py-2.5 text-sm font-extrabold shrink-0 shadow-md transition-all active:scale-95"
          >
            Donate ₹{amount.toLocaleString("en-IN")}
          </button>
        </div>
      </div>

      {/* DONATION MODAL OVERLAY */}
      {isDonateModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-[#EDECE7] flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsDonateModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-5">
              <span className="text-[10px] font-extrabold text-[#8C3D1D] bg-[#FDF0E9] py-1 px-2.5 rounded-full uppercase tracking-wider">
                Support this campaign
              </span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-2.5 line-clamp-1">{translatedTitle ?? campaign.title}</h3>
            </div>

            <div className="space-y-5 flex-1">
              
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="font-bold text-stone-700">Donation Amount (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-extrabold text-stone-400">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="pl-8 py-6 rounded-2xl border-[#EDECE7] focus-visible:ring-[#8C3D1D]/20 text-lg font-extrabold text-[#8C3D1D]"
                  />
                </div>

                {/* Preset Options */}
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={amount === p ? "default" : "outline"}
                      onClick={() => setAmount(p)}
                      className={`rounded-xl border-[#EDECE7] font-bold text-xs ${
                        amount === p 
                          ? "bg-[#8C3D1D] hover:bg-[#733115] text-white" 
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      ₹{p.toLocaleString("en-IN")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recurring Toggle */}
              <div className="rounded-2xl border border-[#EDECE7] bg-[#FAF9F5] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-stone-800">{t("makeRecurring")}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{t("giveRegularly")}</p>
                  </div>
                  <Switch checked={recurring} onCheckedChange={setRecurring} />
                </div>
                {recurring && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(["daily", "monthly", "yearly"] as const).map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant={frequency === f ? "default" : "outline"}
                        onClick={() => setFrequency(f)}
                        className={`capitalize font-bold text-xs rounded-xl ${
                          frequency === f 
                            ? "bg-[#8C3D1D] hover:bg-[#733115] text-white" 
                            : "hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tip Slider Section */}
              <div className="rounded-2xl border border-[#EDECE7] bg-[#FAF9F5] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-stone-800">{t("addTip")}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{t("keepFree")}</p>
                  </div>
                  <Switch checked={addTip} onCheckedChange={setAddTip} />
                </div>
                {addTip && (
                  <div className="flex gap-2 pt-1">
                    {[5, 10, 15].map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={tipPct === p ? "default" : "outline"}
                        onClick={() => setTipPct(p)}
                        className={`font-bold text-xs rounded-xl px-4 ${
                          tipPct === p 
                            ? "bg-[#8C3D1D] hover:bg-[#733115] text-white" 
                            : "hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        {p}%
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Donation Calculations */}
              {amount > 0 && (
                <div className="space-y-2 rounded-2xl border border-[#EDECE7] p-4 text-sm bg-stone-50">
                  <Row label="Donation Amount" value={formatINR(amount)} />
                  {addTip && <Row label={`Tip to Platform (${tipPct}%)`} value={formatINR(tip)} />}
                  <div className="my-1.5 h-px bg-[#EDECE7]" />
                  <Row
                    label="Total Amount"
                    value={formatINR(total)}
                    bold
                  />
                  <p className="pt-1 text-[11px] text-stone-400 font-medium leading-relaxed">
                    Donee receives {formatINR(amount - Math.round(amount * 0.05))} after 5% platform service charges ({formatINR(Math.round(amount * 0.05))}).
                  </p>
                </div>
              )}

              {/* Checkout Button */}
              <button 
                onClick={handleDonateCheckout}
                disabled={checkoutLoading || amount <= 0}
                className="w-full bg-[#8C3D1D] hover:bg-[#733115] disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-3.5 px-6 font-bold text-base rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening Razorpay Checkout...
                  </>
                ) : user ? (
                  `Pay ${formatINR(total)}`
                ) : (
                  "Log in to Donate"
                )}
              </button>

              <p className="text-center text-[10px] text-stone-400 font-bold">
                Secured by Razorpay · UPI · Cards · Netbanking
              </p>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
