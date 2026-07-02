"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope, BookOpen, Sprout, Users, Home, Package,
  MapPin, ChevronDown, ArrowRight, Plus, ShieldCheck,
  Loader2, Heart, Handshake, AlertTriangle,
} from "lucide-react";
import { getItemRequests, getMyItemRequests, type ItemRequest } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/badge";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];

const CAT_ICON: Record<string, React.ElementType> = {
  "Medical aid": Stethoscope,
  "Education":   BookOpen,
  "Livelihood":  Sprout,
  "Relief":      Users,
  "Household":   Home,
};

const CAT_GRADIENT: Record<string, string> = {
  "Medical aid": "from-[#0369a1] via-[#0c4a6e] to-[#1e3a60]",
  "Education":   "from-[#b45309] via-[#92400e] to-[#78350f]",
  "Livelihood":  "from-[#065f46] via-[#047857] to-[#064e3b]",
  "Relief":      "from-[#5b21b6] via-[#4c1d95] to-[#3b1582]",
  "Household":   "from-[#9f1239] via-[#881337] to-[#720e30]",
};

const CAT_SHADOW: Record<string, string> = {
  "Medical aid": "hover:shadow-sky-600/30",
  "Education":   "hover:shadow-amber-600/30",
  "Livelihood":  "hover:shadow-emerald-600/30",
  "Relief":      "hover:shadow-violet-600/30",
  "Household":   "hover:shadow-rose-600/30",
};

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING_VERIFICATION:      { label: "Under Review",    variant: "outline"      },
    VERIFIED_PRIVATE_MATCHING: { label: "Matching",        variant: "secondary"    },
    POTENTIAL_MATCH_FOUND:     { label: "Match Found!",    variant: "secondary"    },
    AWAITING_MATCH_APPROVAL:   { label: "Approval Pending",variant: "secondary"    },
    PUBLIC_REQUEST:            { label: "Live",            variant: "default"      },
    FULFILMENT_IN_PROGRESS:    { label: "In Progress",     variant: "secondary"    },
    FULFILLED:                 { label: "Received ✓",      variant: "default"      },
    REJECTED:                  { label: "Rejected",        variant: "destructive"  },
    EXPIRED:                   { label: "Expired",         variant: "outline"      },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

// ── Noise SVG texture (inline, generates "AI-image" feel on category cards) ──

const NOISE_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

// ── Hero ──────────────────────────────────────────────────────────────────────

function DoneeHero({ myRequestCount }: { myRequestCount: number }) {
  const [mouse, setMouse] = useState({ x: 50, y: 45 });
  const [active, setActive] = useState(false);

  return (
    <div
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative w-full min-h-[500px] sm:min-h-[540px] overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #060c18 0%, #0d1e36 42%, #16103a 72%, #070f1e 100%)" }}
    >
      {/* Mesh-gradient overlay — gives "generated art" depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 55%, rgba(30,58,96,0.6) 0%, transparent 52%), radial-gradient(ellipse at 78% 18%, rgba(91,33,182,0.22) 0%, transparent 45%), radial-gradient(ellipse at 55% 82%, rgba(6,95,70,0.18) 0%, transparent 40%)"
      }} />

      {/* Mouse warm glow */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-300 ease-out" style={{
        background: `radial-gradient(ellipse at ${mouse.x}% ${mouse.y}%, rgba(240,185,122,${active ? 0.13 : 0.06}) 0%, transparent 52%)`
      }} />

      {/* Dot-grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.09] pointer-events-none" />

      {/* Decorative rings */}
      <div className="absolute -top-28 right-[12%] w-[520px] h-[520px] rounded-full border border-[#1e3a60]/18 animate-blob-a pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-80 h-80 rounded-full border border-[#5b21b6]/12 animate-blob-b pointer-events-none" />

      {/* Floating ambient dots */}
      <div className="absolute top-[18%] left-[7%]  w-2   h-2   rounded-full bg-[#f0b97a]/22  animate-float-shape-1 pointer-events-none" />
      <div className="absolute top-[64%] right-[9%] w-1.5 h-1.5 rounded-full bg-sky-400/28    animate-float-shape-3 pointer-events-none" />
      <div className="absolute top-[42%] left-[46%] w-1   h-1   rounded-full bg-violet-400/32 animate-float-shape-2 pointer-events-none" />
      <div className="absolute bottom-[24%] right-[34%] w-1.5 h-1.5 rounded-full bg-emerald-400/22 animate-float-shape-4 pointer-events-none" />
      <div className="absolute top-[28%] right-[26%] w-1 h-1 rounded-full bg-white/18 animate-float-shape-5 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 lg:py-22">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-14 items-center">

          {/* ── LEFT: Copy ── */}
          <div className="space-y-7">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 bg-[#1e3a60]/40 border border-[#4a7fba]/30 rounded-full px-4 py-1.5 anim-up anim-d1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f0b97a] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f0b97a]" />
              </span>
              <span className="text-[#f0b97a] text-[10px] font-black uppercase tracking-widest">Donee Portal</span>
            </div>

            {/* Headline */}
            <h1
              className="text-white text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.04] tracking-tight anim-up anim-d2"
            >
              Tell us what<br />
              <span style={{
                background: "linear-gradient(90deg, #f0b97a 0%, #e07b3a 48%, #f0b97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                you need.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-white/58 text-sm sm:text-base leading-relaxed max-w-lg anim-up anim-d3">
              Post a request for any physical item — books, clothes, wheelchair, medical equipment. We match you with a verified local donor within 10 km. No fees, no delays.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-4 anim-up anim-d4">
              <Link href="/requests/new">
                <button className="flex items-center gap-2.5 bg-[#f0b97a] hover:bg-[#e0a96a] active:scale-[0.97] text-stone-950 font-extrabold px-7 py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-[#f0b97a]/20 btn-shine">
                  <Plus className="w-4 h-4" />
                  Post a Need
                </button>
              </Link>
              {myRequestCount > 0 && (
                <a href="#my-requests" className="flex items-center gap-2 text-white/55 hover:text-white text-sm font-bold transition-colors">
                  My {myRequestCount} request{myRequestCount !== 1 ? "s" : ""}
                  <ChevronDown className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-3 anim-up anim-d5">
              {[
                { icon: ShieldCheck, text: "Admin verified", c: "text-emerald-400" },
                { icon: MapPin,      text: "10 km radius",   c: "text-[#f0b97a]"  },
                { icon: Heart,       text: "Zero fees",       c: "text-rose-400"   },
              ].map(({ icon: Icon, text, c }) => (
                <div key={text} className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-[11px] font-bold text-white/65">
                  <Icon className={`w-3.5 h-3.5 ${c}`} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Floating request-card mockup ── */}
          <div className="hidden lg:flex flex-col gap-3 items-end">

            {/* Primary card */}
            <div className="float-card w-[296px] relative">
              <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sky-400 text-[10px] font-black uppercase tracking-wider">Medical Aid</p>
                    <p className="text-white/35 text-[10px]">Bandra, Mumbai · 1 needed</p>
                  </div>
                </div>
                <p className="text-white font-extrabold text-sm leading-snug mb-3">
                  Wheelchair for elderly mother
                </p>
                <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/25 rounded-full px-3 py-1.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-emerald-400 text-[10px] font-black">Matching in progress…</span>
                </div>
              </div>
              {/* Shadow card behind */}
              <div className="absolute -bottom-2.5 -right-2.5 w-full h-full bg-white/4 border border-white/8 rounded-3xl -z-10 rotate-2" />
            </div>

            {/* Secondary mini card */}
            <div
              className="w-[256px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
              style={{ animation: "need-board-float 6s ease-in-out 1.4s infinite" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-extrabold leading-tight">Class 10 textbooks</p>
                  <p className="text-white/30 text-[10px]">Pune · Received ✓</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      icon: Plus,
      title: "Post your need",
      desc: "Choose a category, describe what you need, add a photo. Takes under 2 minutes.",
      bg: "bg-[#1e3a60]/10 dark:bg-[#1e3a60]/20",
      ic: "text-[#4a7fba] dark:text-blue-400",
      dot: "bg-[#1e3a60]",
    },
    {
      icon: ShieldCheck,
      title: "Admin verifies",
      desc: "Our team reviews every request within 24–48 hours before it goes live.",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      ic: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    {
      icon: Handshake,
      title: "We find a match",
      desc: "Our system matches you with a verified donor within 10 km who has what you need.",
      bg: "bg-violet-50 dark:bg-violet-950/20",
      ic: "text-violet-600 dark:text-violet-400",
      dot: "bg-violet-500",
    },
    {
      icon: Heart,
      title: "Direct handover",
      desc: "Receive the item directly — safe, verified, no middlemen, no shipping fees.",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      ic: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-stone-100 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <div className="text-center mb-12">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#1e3a60] dark:text-blue-400 mb-2 block">Simple Process</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              How receiving works
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Desktop connector line */}
          <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#1e3a60]/20 via-violet-300/30 to-emerald-300/30 pointer-events-none" />

          {steps.map(({ icon: Icon, title, desc, bg, ic, dot }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="relative flex lg:flex-col items-start lg:items-center gap-4 text-left lg:text-center">
                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${bg}`}>
                  <Icon className={`w-6 h-6 ${ic}`} />
                  <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${dot} flex items-center justify-center text-[9px] font-black text-white shadow-sm`}>
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

function CategoryStarterSection({ catCounts }: { catCounts: Record<string, number> }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <Reveal>
        <div className="mb-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#1e3a60] dark:text-blue-400 mb-2 block">Quick Start</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            What do you need?
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 font-medium max-w-md">
            Pick a category and we&apos;ll pre-fill your request form — takes under 2 minutes.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {CATEGORIES.map((cat, i) => {
          const Icon     = CAT_ICON[cat] ?? Package;
          const gradient = CAT_GRADIENT[cat];
          const shadow   = CAT_SHADOW[cat];
          const count    = catCounts[cat] ?? 0;

          return (
            <Reveal key={cat} delay={i * 75}>
              <Link href={`/requests/new?category=${encodeURIComponent(cat)}`}>
                <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient}
                                h-44 flex flex-col justify-between p-5 cursor-pointer
                                hover:-translate-y-2 hover:shadow-xl ${shadow}
                                transition-all duration-300`}
                >
                  {/* Noise overlay for "generated" texture */}
                  <div
                    className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none"
                    style={{ backgroundImage: NOISE_BG, backgroundSize: "200px" }}
                  />

                  {/* Soft glow orb */}
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                  {/* Request count */}
                  <div className="relative z-10 self-end">
                    {count > 0 && (
                      <span className="bg-white/15 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/20">
                        {count} active
                      </span>
                    )}
                  </div>

                  {/* Icon + name + arrow */}
                  <div className="relative z-10 space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-sm leading-tight">{cat}</p>
                      <div className="flex items-center gap-1 mt-1 text-white/55 text-[10px] font-bold group-hover:text-white/90 transition-colors">
                        Request this <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
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

// ── My Requests ───────────────────────────────────────────────────────────────

function MyRequestsSection({ requests }: { requests: ItemRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <div id="my-requests" className="bg-white dark:bg-zinc-900 border-y border-stone-100 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#1e3a60] dark:text-blue-400 mb-1 block">Tracking</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white">
                Your Requests
                <span className="ml-3 text-base font-semibold text-stone-400">({requests.length})</span>
              </h2>
            </div>
            <Link href="/requests/new">
              <button className="flex items-center gap-2 bg-[#1e3a60] hover:bg-[#162d4a] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> New Need
              </button>
            </Link>
          </div>
        </Reveal>

        <div className="space-y-3">
          {requests.map((r, i) => {
            const sb   = getStatusBadge(r.status);
            const Icon = CAT_ICON[r.category] ?? Package;
            const grad = CAT_GRADIENT[r.category] ?? CAT_GRADIENT["Medical aid"];

            return (
              <Reveal key={r.id} delay={i * 50}>
                <div className="group flex items-center gap-4 bg-stone-50 dark:bg-zinc-800/50 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-2xl p-4 transition-all border border-stone-100 dark:border-zinc-700/50">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate group-hover:text-[#1e3a60] dark:group-hover:text-blue-400 transition-colors">
                      <TranslatedText text={r.title} />
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5 flex-wrap">
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
                  <Badge variant={sb.variant} className="text-[10px] shrink-0 whitespace-nowrap">
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

// ── Community Board ───────────────────────────────────────────────────────────

function CommunityBoardSection({ requests }: { requests: ItemRequest[] }) {
  const preview = requests.slice(0, 6);
  if (preview.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <Reveal>
        <div className="mb-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#1e3a60] dark:text-blue-400 mb-2 block">Community</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
            Others are requesting too
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 font-medium">
            Browse what your community needs — and add yours.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {preview.map((r, i) => {
          const Icon = CAT_ICON[r.category] ?? Package;
          const grad = CAT_GRADIENT[r.category] ?? CAT_GRADIENT["Medical aid"];

          return (
            <Reveal key={r.id} delay={i * 65}>
              <div className="group flex items-start gap-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-stone-100 dark:border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 mb-1.5">
                    <TranslatedText text={r.title} />
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-400">
                    <span className="font-bold">{r.quantity} needed</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /><TranslatedText text={r.city} /></span>
                    {(r.urgency === "CRITICAL" || r.urgency === "HIGH") && (
                      <>
                        <span>·</span>
                        <span className={`font-bold flex items-center gap-0.5 ${r.urgency === "CRITICAL" ? "text-red-500" : "text-amber-500"}`}>
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {r.urgency === "CRITICAL" ? "Urgent" : "High"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={420}>
        <div className="mt-12 text-center">
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-5">Don&apos;t see what you need? Post your own.</p>
          <Link href="/requests/new">
            <button className="inline-flex items-center gap-2.5 bg-[#1e3a60] hover:bg-[#162d4a] text-white font-extrabold px-8 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-900/20 btn-shine">
              <Plus className="w-4 h-4" />
              Post What You Need
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

// ── Exported main component ───────────────────────────────────────────────────

export function DoneeRequestsPage() {
  const [allRequests, setAllRequests] = useState<ItemRequest[]>([]);
  const [myRequests,  setMyRequests]  = useState<ItemRequest[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      getItemRequests().then(setAllRequests).catch(() => {}),
      getMyItemRequests().then(setMyRequests).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const catCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = allRequests.filter(r => r.category === cat).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f5ff] dark:bg-zinc-950">
        <Loader2 className="w-6 h-6 animate-spin text-[#1e3a60]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f5ff] dark:bg-zinc-950 text-stone-900 dark:text-stone-100">
      <DoneeHero myRequestCount={myRequests.length} />
      <HowItWorksSection />
      <CategoryStarterSection catCounts={catCounts} />
      <MyRequestsSection requests={myRequests} />
      <CommunityBoardSection requests={allRequests} />
    </div>
  );
}
