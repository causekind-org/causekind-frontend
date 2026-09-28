"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope, BookOpen, Sprout, Users, Home, Package,
  MapPin, ChevronDown, ArrowRight, Plus, ShieldCheck,
  Loader2, Heart, Handshake, AlertTriangle,
  Armchair, Shirt, Smartphone, Dumbbell,
} from "lucide-react";
import { getItemRequests, getMyItemRequests, getAvailableDonorListings, type ItemRequest, type ItemListing } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/badge";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { ALL_REQUEST_CATEGORIES as CATEGORIES } from "@/lib/categoryVisuals";

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  "Medical aid": Stethoscope,
  "Education":   BookOpen,
  "Livelihood":  Sprout,
  "Relief":      Users,
  "Household":   Home,
  "Furniture":   Armchair,
  "Clothing":    Shirt,
  "Electronics": Smartphone,
  "Sports":      Dumbbell,
};

const CAT_GRADIENT: Record<string, string> = {
  "Medical aid": "from-[#0369a1] via-[#0c4a6e] to-[#1e3a60]",
  "Education":   "from-[#b45309] via-[#92400e] to-[#78350f]",
  "Livelihood":  "from-[#065f46] via-[#047857] to-[#064e3b]",
  "Relief":      "from-[#5b21b6] via-[#4c1d95] to-[#3b1582]",
  "Household":   "from-[#9f1239] via-[#881337] to-[#720e30]",
  "Furniture":   "from-[#4338ca] via-[#3730a3] to-[#312e81]",
  "Clothing":    "from-[#0f766e] via-[#115e59] to-[#134e4a]",
  "Electronics": "from-[#c2410c] via-[#9a3412] to-[#7c2d12]",
  "Sports":      "from-[#0e7490] via-[#155e75] to-[#164e63]",
};

const CAT_SHADOW: Record<string, string> = {
  "Medical aid": "hover:shadow-sky-600/30",
  "Education":   "hover:shadow-amber-600/30",
  "Livelihood":  "hover:shadow-emerald-600/30",
  "Relief":      "hover:shadow-violet-600/30",
  "Household":   "hover:shadow-rose-600/30",
  "Furniture":   "hover:shadow-indigo-600/30",
  "Clothing":    "hover:shadow-teal-600/30",
  "Electronics": "hover:shadow-orange-600/30",
  "Sports":      "hover:shadow-cyan-600/30",
};

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING_VERIFICATION:      { label: "Under Review",    variant: "outline"      },
    VERIFIED_PRIVATE_MATCHING: { label: "Finding a donor", variant: "secondary"    },
    POTENTIAL_MATCH_FOUND:     { label: "Confirming a possible donor", variant: "secondary" },
    AWAITING_MATCH_APPROVAL:   { label: "Approval Pending",variant: "secondary"    },
    PUBLIC_REQUEST:            { label: "Visible to donors", variant: "default"    },
    FULFILMENT_IN_PROGRESS:    { label: "In Progress",     variant: "secondary"    },
    FULFILLED:                 { label: "Received ✓",      variant: "default"      },
    REJECTED:                  { label: "Rejected",        variant: "destructive"  },
    EXPIRED:                   { label: "Expired",         variant: "outline"      },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

const NOISE_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

const HERO_TINT: Record<string, { bg: string; ic: string }> = {
  "Medical aid": { bg: "bg-sky-500/20",     ic: "text-sky-400"     },
  "Education":   { bg: "bg-amber-500/15",   ic: "text-amber-400"   },
  "Livelihood":  { bg: "bg-emerald-500/15", ic: "text-emerald-400" },
  "Relief":      { bg: "bg-violet-500/15",  ic: "text-violet-400"  },
  "Household":   { bg: "bg-rose-500/15",    ic: "text-rose-400"    },
  "Furniture":   { bg: "bg-indigo-500/15",  ic: "text-indigo-400"  },
  "Clothing":    { bg: "bg-teal-500/15",    ic: "text-teal-400"    },
  "Electronics": { bg: "bg-orange-500/15",  ic: "text-orange-400"  },
  "Sports":      { bg: "bg-cyan-500/15",    ic: "text-cyan-400"    },
};

const INACTIVE_STATUSES = ["FULFILLED", "REJECTED", "EXPIRED"];

function heroStatusPill(status: string): { label: string; cls: string; dot: string; pulse: boolean } {
  const label = getStatusBadge(status).label;
  if (status === "FULFILLED")
    return { label, cls: "bg-emerald-500/15 border-emerald-400/25 text-emerald-400", dot: "bg-emerald-400", pulse: false };
  if (status === "REJECTED" || status === "EXPIRED")
    return { label, cls: "bg-red-500/15 border-red-400/25 text-red-400", dot: "bg-red-400", pulse: false };
  if (status === "PENDING_VERIFICATION")
    return { label, cls: "bg-amber-500/15 border-amber-400/25 text-amber-400", dot: "bg-amber-400", pulse: true };
  return { label, cls: "bg-emerald-500/15 border-emerald-400/25 text-emerald-400", dot: "bg-emerald-400", pulse: true };
}

function byNewest(a: ItemRequest, b: ItemRequest) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// ── NGO Hero ──────────────────────────────────────────────────────────────────

function NgoHero({ myRequests }: { myRequests: ItemRequest[] }) {
  const [mouse, setMouse] = useState({ x: 50, y: 45 });
  const [active, setActive] = useState(false);

  const myRequestCount = myRequests.length;
  const sorted = [...myRequests].sort(byNewest);
  const primary = sorted.find((r) => !INACTIVE_STATUSES.includes(r.status)) ?? sorted[0];
  const secondary = sorted.find((r) => r.id !== primary?.id && r.status === "FULFILLED") ?? sorted.find((r) => r.id !== primary?.id);

  const primaryTint = primary ? (HERO_TINT[primary.category] ?? { bg: "bg-white/10", ic: "text-white/70" }) : null;
  const PrimaryIcon = primary ? (CAT_ICON[primary.category] ?? Package) : Package;
  const primaryPill = primary ? heroStatusPill(primary.status) : null;
  const secondaryTint = secondary ? (HERO_TINT[secondary.category] ?? { bg: "bg-white/10", ic: "text-white/70" }) : null;
  const SecondaryIcon = secondary ? (CAT_ICON[secondary.category] ?? Package) : BookOpen;

  return (
    <div
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative w-full min-h-[500px] sm:min-h-[540px] overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #110804 0%, #2a1107 42%, #1a0f05 72%, #0d0603 100%)" }}
    >
      {/* Mesh-gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 55%, rgba(176,74,21,0.45) 0%, transparent 52%), radial-gradient(ellipse at 78% 18%, rgba(217,119,6,0.2) 0%, transparent 45%), radial-gradient(ellipse at 55% 82%, rgba(180,83,9,0.18) 0%, transparent 40%)"
      }} />

      {/* Mouse warm glow */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-300 ease-out" style={{
        background: `radial-gradient(ellipse at ${mouse.x}% ${mouse.y}%, rgba(240,185,122,${active ? 0.15 : 0.07}) 0%, transparent 52%)`
      }} />

      {/* Dot-grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.09] pointer-events-none" />

      {/* Decorative rings */}
      <div className="absolute -top-28 right-[12%] w-[520px] h-[520px] rounded-full border border-[#b04a15]/18 animate-blob-a pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-80 h-80 rounded-full border border-amber-500/12 animate-blob-b pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-9 sm:py-16 lg:py-22">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-14 items-center">

          {/* ── LEFT: Copy ── */}
          <div className="space-y-7">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-4 py-1.5 anim-up anim-d1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-amber-300 text-3xs font-black uppercase tracking-widest">NGO Portal</span>
            </div>

            {/* Headline */}
            <h1
              className="text-white text-2xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.06] tracking-tight anim-up anim-d2"
            >
              Request supplies for<br />
              <span style={{
                background: "linear-gradient(90deg, #f0b97a 0%, #f59e0b 48%, #f0b97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                your organization.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg anim-up anim-d3">
              Post verified campaigns and in-kind requests for your organization — medical kits, books, relief packs, or appliances. We connect you directly with nearby donors. Zero fees, transparent tracking.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 anim-up anim-d4">
              <Link href="/requests/new">
                <button className="flex items-center gap-2.5 bg-[#b04a15] hover:bg-[#943d0f] active:scale-[0.97] text-white font-extrabold px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm transition-all shadow-xl shadow-[#b04a15]/30">
                  <Plus className="w-4 h-4" />
                  Post a Campaign / Request
                </button>
              </Link>
              {myRequestCount > 0 && (
                <a href="#my-requests" className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold transition-colors">
                  Your {myRequestCount} request{myRequestCount !== 1 ? "s" : ""}
                  <ChevronDown className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-2.5 sm:gap-3 anim-up anim-d5">
              {[
                { icon: ShieldCheck, text: "Admin verified", c: "text-emerald-400" },
                { icon: Handshake,   text: "Direct handover", c: "text-amber-400" },
                { icon: Heart,       text: "Zero fees",       c: "text-rose-400" },
              ].map(({ icon: Icon, text, c }) => (
                <div key={text} className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full px-2.5 sm:px-3 py-1.5 text-2xs font-bold text-white/65">
                  <Icon className={`w-3.5 h-3.5 ${c}`} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Floating request cards (live data) ── */}
          <div className="hidden lg:flex flex-col gap-2.5 sm:gap-3 items-end">
            {primary && primaryTint && primaryPill ? (
              <div className="float-card w-[296px] relative">
                <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-2xl">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${primaryTint.bg} flex items-center justify-center shrink-0`}>
                      <PrimaryIcon className={`w-4.5 h-4.5 ${primaryTint.ic}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`${primaryTint.ic} text-3xs font-black uppercase tracking-wider truncate`}>{primary.category}</p>
                      <p className="text-white/40 text-3xs truncate">{primary.city} · {primary.quantity} needed</p>
                    </div>
                  </div>
                  <p className="text-white font-extrabold text-sm leading-snug mb-3 line-clamp-2">
                    {primary.title}
                  </p>
                  <div className={`inline-flex items-center gap-2 border rounded-full px-2.5 sm:px-3 py-1.5 ${primaryPill.cls}`}>
                    <span className="relative flex h-2 w-2 shrink-0">
                      {primaryPill.pulse && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${primaryPill.dot} opacity-70`} />
                      )}
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${primaryPill.dot}`} />
                    </span>
                    <span className="text-3xs font-black">{primaryPill.label}</span>
                  </div>
                </div>
                <div className="absolute -bottom-2.5 -right-2.5 w-full h-full bg-white/4 border border-white/8 rounded-2xl sm:rounded-3xl -z-10 rotate-2" />
              </div>
            ) : (
              <div className="float-card w-[296px] relative">
                <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-2xl">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4.5 h-4.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-amber-400 text-3xs font-black uppercase tracking-wider">Education Aid</p>
                      <p className="text-white/40 text-3xs">Sample campaign</p>
                    </div>
                  </div>
                  <p className="text-white font-extrabold text-sm leading-snug mb-3">
                    50 school stationery &amp; notebook kits
                  </p>
                  <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/25 rounded-full px-2.5 sm:px-3 py-1.5">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-emerald-400 text-3xs font-black">Ready for donors</span>
                  </div>
                </div>
                <div className="absolute -bottom-2.5 -right-2.5 w-full h-full bg-white/4 border border-white/8 rounded-2xl sm:rounded-3xl -z-10 rotate-2" />
              </div>
            )}

            {secondary && secondaryTint && (
              <div
                className="w-[256px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-2.5 sm:p-4"
                style={{ animation: "need-board-float 6s ease-in-out 1.4s infinite" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${secondaryTint.bg} flex items-center justify-center shrink-0`}>
                    <SecondaryIcon className={`w-4 h-4 ${secondaryTint.ic}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs font-extrabold leading-tight truncate">{secondary.title}</p>
                    <p className="text-white/35 text-3xs truncate">{secondary.city} · {getStatusBadge(secondary.status).label}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── How Receiving Works Section (adapted for NGO) ──────────────────────────────

function NgoHowItWorksSection() {
  const steps = [
    {
      icon: Plus,
      title: "Post your request",
      desc: "Specify items needed, required quantities, and target beneficiaries. Takes under 2 minutes.",
      bg: "bg-[#b04a15]/10 dark:bg-[#b04a15]/20",
      ic: "text-[#b04a15] dark:text-amber-400",
      dot: "bg-[#b04a15]",
    },
    {
      icon: ShieldCheck,
      title: "Admin verifies",
      desc: "Fast-tracked verification for registered NGO partners to get your request live quickly.",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      ic: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    {
      icon: Handshake,
      title: "We find a match",
      desc: "Our platform matches your request with nearby verified donors who have matching items.",
      bg: "bg-violet-50 dark:bg-violet-950/20",
      ic: "text-violet-600 dark:text-violet-400",
      dot: "bg-violet-500",
    },
    {
      icon: Heart,
      title: "Direct handover",
      desc: "Receive supplies directly at your center or drive — verified, transparent, and zero fees.",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      ic: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-stone-100 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
        <Reveal>
          <div className="text-center mb-12">
            <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15] dark:text-amber-400 mb-2 block">Simple Process</span>
            <h2 className="text-lg sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              How receiving works for NGOs
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
          <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#b04a15]/20 via-amber-300/30 to-emerald-300/30 pointer-events-none" />

          {steps.map(({ icon: Icon, title, desc, bg, ic, dot }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="relative flex lg:flex-col items-start lg:items-center gap-2.5 sm:gap-4 text-left lg:text-center">
                <div className={`relative w-11 sm:w-14 h-11 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${bg}`}>
                  <Icon className={`w-6 h-6 ${ic}`} />
                  <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${dot} flex items-center justify-center text-4xs font-black text-white shadow-sm`}>
                    {i + 1}
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 dark:text-white text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-medium">{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Category Starter Grid ─────────────────────────────────────────────────────

function NgoCategoryStarterSection({ catCounts }: { catCounts: Record<string, number> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
      <Reveal>
        <div className="mb-5 sm:mb-10">
          <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15] dark:text-amber-400 mb-2 block">Quick Start</span>
          <h2 className="text-lg sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            What supplies does your organization need?
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 font-medium max-w-md">
            Pick a category to launch an in-kind campaign request — pre-filled and fast.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {CATEGORIES.map((cat, i) => {
          const Icon     = CAT_ICON[cat] ?? Package;
          const gradient = CAT_GRADIENT[cat];
          const shadow   = CAT_SHADOW[cat];
          const count    = catCounts[cat] ?? 0;

          return (
            <Reveal key={cat} delay={i * 75}>
              <Link href={`/requests/new?category=${encodeURIComponent(cat)}`}>
                <div className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${gradient}
                                h-[102px] sm:h-44 flex flex-col justify-between p-2 sm:p-5 cursor-pointer
                                hover:-translate-y-2 hover:shadow-xl ${shadow}
                                transition-all duration-300`}
                >
                  <div
                    className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none"
                    style={{ backgroundImage: NOISE_BG, backgroundSize: "200px" }}
                  />
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                  <div className="relative z-10 self-end">
                    {count > 0 && (
                      <span className="bg-white/15 backdrop-blur text-white text-4xs sm:text-3xs font-black px-1.5 py-0 sm:px-2.5 sm:py-1 rounded-full border border-white/20">
                        {count} active
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 space-y-1 sm:space-y-2.5">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-sm leading-tight">{cat}</p>
                      <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-white/60 text-4xs sm:text-3xs font-bold group-hover:text-white transition-colors">
                        Request this <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

// ── My Requests Section ───────────────────────────────────────────────────────

function NgoMyRequestsSection({ requests }: { requests: ItemRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <div id="my-requests" className="bg-white dark:bg-zinc-900 border-y border-stone-100 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-14">
        <Reveal>
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <div>
              <span className="text-3xs sm:text-2xs font-black uppercase tracking-widest text-[#b04a15] dark:text-amber-400 mb-0.5 sm:mb-1 block">Tracking</span>
              <h2 className="text-base sm:text-2xl font-extrabold text-stone-900 dark:text-white">
                Your Organization&apos;s Requests
                <span className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold text-stone-400">({requests.length})</span>
              </h2>
            </div>
            <Link href="/requests/new">
              <button className="flex items-center gap-1.5 sm:gap-2 bg-[#b04a15] hover:bg-[#963c0d] text-white font-bold px-2.5 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-2xs sm:text-xs transition-all shadow-sm">
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Post Request
              </button>
            </Link>
          </div>
        </Reveal>

        <div className="space-y-2 sm:space-y-3">
          {requests.map((r, i) => {
            const sb   = getStatusBadge(r.status);
            const Icon = CAT_ICON[r.category] ?? Package;
            const grad = CAT_GRADIENT[r.category] ?? CAT_GRADIENT["Medical aid"];

            return (
              <Reveal key={r.id} delay={i * 50}>
                <div className="group flex items-center gap-2.5 sm:gap-4 bg-stone-50 dark:bg-zinc-800/50 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 transition-all border border-stone-100 dark:border-zinc-700/50">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate group-hover:text-[#b04a15] dark:group-hover:text-amber-400 transition-colors">
                      <TranslatedText text={r.title} />
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-3xs sm:text-2xs text-stone-400 mt-0.5 flex-wrap">
                      <span>{r.category}</span>
                      <span>·</span>
                      <span>Qty: {r.quantity}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <TranslatedText text={r.city} />
                      </span>
                    </div>
                  </div>
                  <Badge variant={sb.variant} className="text-4xs sm:text-3xs px-1.5 sm:px-2.5 shrink-0 whitespace-nowrap">
                    {sb.label}
                  </Badge>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Available Donor Listings Section ──────────────────────────────────────────

function NgoAvailableDonorListingsSection({ listings }: { listings: ItemListing[] }) {
  const preview = listings.slice(0, 6);
  if (preview.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-14">
      <Reveal>
        <div className="mb-5 sm:mb-10">
          <span className="text-3xs sm:text-2xs font-black uppercase tracking-widest text-[#b04a15] dark:text-amber-400 mb-1 sm:mb-2 block">Donor Inventory</span>
          <h2 className="text-base sm:text-3xl font-extrabold text-stone-900 dark:text-white">
            Available Donor Listings
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 sm:mt-2 font-medium leading-snug">
            Real in-kind supplies listed by verified donors on CauseKind that can be matched to your needs.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {preview.map((l, i) => {
          const Icon = CAT_ICON[l.category] ?? Package;
          const grad = CAT_GRADIENT[l.category] ?? CAT_GRADIENT["Medical aid"];

          return (
            <Reveal key={l.id} delay={i * 65}>
              <div className="group flex items-start gap-2.5 sm:gap-4 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-stone-150 dark:border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 mb-1">
                    <TranslatedText text={l.title} />
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-3xs text-stone-400">
                    <span className="font-bold">Qty: {l.quantity}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /><TranslatedText text={l.city} /></span>
                    <span>·</span>
                    <span className="text-stone-500 font-medium">Donor: {l.donorName}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-4xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 shrink-0">
                  Available
                </Badge>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={420}>
        <div className="mt-7 sm:mt-12 text-center">
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-3 sm:mb-5">Need specific supplies for your cause?</p>
          <Link href="/requests/new">
            <button className="inline-flex items-center gap-2 sm:gap-2.5 bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-4 py-2.5 sm:px-8 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm transition-all shadow-lg shadow-orange-900/20">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Post What You Need
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

// ── Exported NGO Requests Page ─────────────────────────────────────────────────

export function NgoRequestsPage() {
  const [allRequests, setAllRequests] = useState<ItemRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([]);
  const [donorListings, setDonorListings] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getItemRequests().then(setAllRequests).catch(() => []),
      getMyItemRequests().then(setMyRequests).catch(() => []),
      getAvailableDonorListings().then(setDonorListings).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const catCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = allRequests.filter(r => r.category === cat).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] dark:bg-zinc-950">
        <Loader2 className="w-6 h-6 animate-spin text-[#b04a15]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100">
      <NgoHero myRequests={myRequests} />
      <NgoHowItWorksSection />
      <NgoCategoryStarterSection catCounts={catCounts} />
      <NgoMyRequestsSection requests={myRequests} />
      <NgoAvailableDonorListingsSection listings={donorListings} />
    </div>
  );
}
