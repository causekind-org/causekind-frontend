"use client";

import { useEffect, useState, useCallback } from "react";
import { HandHeart, Sparkles, X, Stethoscope, BookOpen, Sprout, Users, Home, Terminal, ShieldCheck, Database, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

type OverlayConfig = {
  icon: React.ReactNode;
  headline: string;
  subline: string;
  accentBg: string;      
  iconWrapBg: string;    
  iconColor: string;     
  confettiColor: string; 
};

function getConfig(role: string | undefined): OverlayConfig {
  switch (role) {
    case "DONEE":
      return {
        icon: <Sparkles className="w-8 h-8" aria-hidden="true" />,
        headline: "Welcome — support starts here",
        subline:
          "Post your verified needs and connect with generous donors nearby. Your community is ready to help — let's get started.",
        accentBg: "bg-[#1e3a60]",
        iconWrapBg: "bg-[#1e3a60]/10 dark:bg-[#1e3a60]/30",
        iconColor: "text-[#1e3a60] dark:text-blue-400",
        confettiColor: "#4a7fba",
      };
    default:
      return {
        icon: <Sparkles className="w-8 h-8" aria-hidden="true" />,
        headline: "Welcome to CauseKind",
        subline:
          "You're all set. Explore nearby needs, manage requests, and help build a kinder community.",
        accentBg: "bg-[#f0b97a]",
        iconWrapBg: "bg-[#f0b97a]/20",
        iconColor: "text-[#b04a15]",
        confettiColor: "#f0b97a",
      };
  }
}

function Sparkles12({ color }: { color: string }) {
  const positions = [
    { top: "8%",  left: "12%", delay: "0s",    size: 6  },
    { top: "5%",  left: "50%", delay: "0.12s", size: 5  },
    { top: "10%", left: "82%", delay: "0.08s", size: 7  },
    { top: "25%", left: "94%", delay: "0.2s",  size: 4  },
    { top: "65%", left: "92%", delay: "0.15s", size: 6  },
    { top: "88%", left: "78%", delay: "0.05s", size: 5  },
    { top: "92%", left: "50%", delay: "0.18s", size: 7  },
    { top: "88%", left: "22%", delay: "0.1s",  size: 4  },
    { top: "65%", left: "6%",  delay: "0.22s", size: 6  },
    { top: "42%", left: "3%",  delay: "0.07s", size: 5  },
    { top: "30%", left: "88%", delay: "0.25s", size: 4  },
    { top: "50%", left: "96%", delay: "0.03s", size: 5  },
  ];

  return (
    <>
      {positions.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full pointer-events-none select-none ck-sparkle-dot"
          style={{
            top: p.top, left: p.left, width: p.size, height: p.size,
            background: color, animationDelay: p.delay, opacity: 0,
          }}
        />
      ))}
    </>
  );
}

function DonorWelcomeView({ exiting, dismiss }: { exiting: boolean; dismiss: () => void }) {
  const cats = [
    { name: "Medical aid", Icon: Stethoscope, color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30", hover: "hover:border-sky-400/60 hover:bg-sky-400/20 hover:shadow-[0_0_30px_rgba(56,189,248,0.2)]" },
    { name: "Education", Icon: BookOpen, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", hover: "hover:border-amber-400/60 hover:bg-amber-400/20 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]" },
    { name: "Livelihood", Icon: Sprout, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", hover: "hover:border-emerald-400/60 hover:bg-emerald-400/20 hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]" },
    { name: "Relief", Icon: Users, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30", hover: "hover:border-violet-400/60 hover:bg-violet-400/20 hover:shadow-[0_0_30px_rgba(167,139,250,0.2)]" },
    { name: "Household", Icon: Home, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/30", hover: "hover:border-rose-400/60 hover:bg-rose-400/20 hover:shadow-[0_0_30px_rgba(251,113,133,0.2)]" },
  ];

  return (
    <>
      <style>{`
        @keyframes ck-stagger-up {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .stagger-text { animation: ck-stagger-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .stagger-0 { animation: ck-stagger-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .stagger-1 { animation: ck-stagger-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.20s both; }
        .stagger-2 { animation: ck-stagger-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
        .stagger-3 { animation: ck-stagger-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.30s both; }
        .stagger-4 { animation: ck-stagger-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both; }
        .ck-scrim-enter { animation: ck-overlay-in 0.5s ease-out both; }
        .ck-scrim-exit { animation: ck-overlay-out 0.4s ease-in both; }
        @keyframes ck-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ck-overlay-out { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      <div
        className={`
          fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8
          bg-stone-950/80 backdrop-blur-xl
          ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}
        `}
        onClick={dismiss}
      >
        <button
          onClick={dismiss}
          className="absolute top-6 right-6 text-white/40 hover:text-white hover:rotate-90 transition-all duration-300 p-2"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="w-full max-w-4xl mx-auto flex flex-col items-center" onClick={e => e.stopPropagation()}>
          
          <div className="text-center mb-12 stagger-text relative">
            {/* Ambient glow behind text */}
            <div className="absolute inset-0 bg-[#b04a15]/20 blur-[80px] -z-10 rounded-full" />
            
            <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 tracking-tight leading-[1.1] mb-5">
              What are you interested <br className="hidden md:block" /> in giving today?
            </h2>
            <p className="text-stone-300/80 text-base md:text-lg font-medium max-w-xl mx-auto">
              Select a category that catches your heart. We'll instantly match you with verified, local needs in your community.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 w-full px-2">
            {cats.map((c, i) => (
              <button
                key={c.name}
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("filter-home-requests", { detail: { category: c.name } }));
                  dismiss();
                }}
                className={`
                  stagger-${i}
                  group relative overflow-hidden
                  w-[145px] h-[155px] md:w-[170px] md:h-[180px]
                  rounded-[2.5rem] border ${c.border}
                  bg-white/5 backdrop-blur-md
                  flex flex-col items-center justify-center gap-5
                  transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                  hover:-translate-y-3 hover:scale-[1.04] ${c.hover}
                `}
              >
                {/* Internal dynamic glow */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${c.bg} blur-2xl pointer-events-none`} />
                
                <div className={`w-16 h-16 rounded-[1.25rem] ${c.bg} border ${c.border} flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-lg`}>
                  <c.Icon className={`w-8 h-8 ${c.color} transition-colors duration-300 group-hover:brightness-125`} />
                </div>
                <span className="font-extrabold text-white text-sm md:text-[15px] tracking-wide group-hover:text-white/90 transition-colors">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function DefaultWelcomeView({ user, exiting, dismiss }: { user: any; exiting: boolean; dismiss: () => void }) {
  const cfg = getConfig(user?.role);
  return (
    <>
      <style>{`
        @keyframes ck-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ck-overlay-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ck-card-in { from { opacity: 0; transform: scale(0.88) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ck-card-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.92) translateY(12px); } }
        @keyframes ck-sparkle-pop {
          0%   { opacity: 0; transform: scale(0);   }
          40%  { opacity: 1; transform: scale(1.4); }
          70%  { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        .ck-sparkle-dot { animation: ck-sparkle-pop 2.2s ease-in-out infinite; }
        .ck-scrim-enter { animation: ck-overlay-in 0.3s ease both; }
        .ck-scrim-exit { animation: ck-overlay-out 0.4s ease both; }
        .ck-card-enter { animation: ck-card-in 0.42s cubic-bezier(0.22,1,0.36,1) both; }
        .ck-card-exit { animation: ck-card-out 0.38s cubic-bezier(0.4,0,1,1) both; }
        @keyframes ck-progress-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-950/50 dark:bg-black/60 backdrop-blur-sm ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}`} onClick={dismiss}>
        <div className={`relative w-full max-w-sm bg-[#faf8f5] dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-stone-900/20 dark:shadow-black/50 overflow-hidden ${exiting ? "ck-card-exit" : "ck-card-enter"}`} onClick={(e) => e.stopPropagation()}>
          <Sparkles12 color={cfg.confettiColor} />
          <div className={`${cfg.accentBg} h-1.5 w-full`} />
          <button onClick={dismiss} className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X className="w-4 h-4" />
          </button>
          <div className="px-8 pt-8 pb-9 flex flex-col items-center text-center gap-5">
            <span className={`flex items-center justify-center w-16 h-16 rounded-2xl ${cfg.iconWrapBg} ${cfg.iconColor}`}>{cfg.icon}</span>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight leading-snug">{cfg.headline}</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-[280px]">{cfg.subline}</p>
            </div>
            <button onClick={dismiss} className={`mt-1 px-8 py-2.5 rounded-full ${cfg.accentBg} text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all duration-200`}>Get started</button>
            <div className="w-full h-[3px] bg-stone-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div className={`h-full ${cfg.accentBg} rounded-full`} style={{ animation: "ck-progress-drain 3.5s linear forwards", transformOrigin: "left center" }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Super Admin — "command center boot-up" ──────────────────────────────────────
function SuperAdminWelcomeView({ exiting, dismiss }: { exiting: boolean; dismiss: () => void }) {
  const bootLines = [
    { icon: Terminal,     text: "Initializing CauseKind core…",       delay: 0.2 },
    { icon: Lock,         text: "Authenticating super-admin keys…",   delay: 0.6 },
    { icon: Database,     text: "Mounting database control surfaces…", delay: 1.0 },
    { icon: ShieldCheck,  text: "Elevating privileges → ROOT",         delay: 1.4 },
    { icon: CheckCircle2, text: "All systems online.",                 delay: 1.8 },
  ];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden bg-[#05070d] ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}`}
      onClick={dismiss}
    >
      {/* Animated grid backdrop */}
      <div className="absolute inset-0 sa-grid-bg sa-grid-pulse pointer-events-none" />
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[#b04a15]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[360px] h-[360px] rounded-full bg-[#1e3a60]/20 blur-[120px] pointer-events-none" />
      {/* Scanline sweep */}
      <div className="absolute left-0 right-0 top-0 h-12 bg-gradient-to-b from-[#f0b97a]/25 to-transparent sa-boot-scanline pointer-events-none" />

      <button onClick={dismiss} className="absolute top-6 right-6 text-white/30 hover:text-white hover:rotate-90 transition-all duration-300 p-2 z-10">
        <X className="w-7 h-7" />
      </button>

      <div className="relative z-10 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Boot log */}
        <div className="font-mono text-[13px] space-y-2 mb-8">
          {bootLines.map((l, i) => (
            <div key={i} className="sa-line-in flex items-center gap-2.5 text-emerald-400/90" style={{ animationDelay: `${l.delay}s` }}>
              <l.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-stone-300">{l.text}</span>
              <span className="text-emerald-400 ml-auto">[ ok ]</span>
            </div>
          ))}
        </div>

        {/* ACCESS GRANTED */}
        <div className="text-center">
          <h1 className="sa-access-granted text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#f0b97a] via-[#e07b3a] to-[#f0b97a] tracking-[0.35em] uppercase">
            Access Granted
          </h1>
          <p className="mt-4 font-mono text-xs text-stone-500">
            Entering Command Center<span className="sa-caret">_</span>
          </p>
        </div>

        {/* Enter button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={dismiss}
            className="font-mono text-xs uppercase tracking-widest px-6 py-2.5 rounded-lg border border-[#f0b97a]/40 text-[#f0b97a] hover:bg-[#f0b97a]/10 hover:border-[#f0b97a]/70 transition-all active:scale-95"
          >
            &gt; Enter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Normal Admin — warm aurora welcome ──────────────────────────────────────────
function AdminWelcomeView({ user, exiting, dismiss }: { user: { email?: string } | null; exiting: boolean; dismiss: () => void }) {
  const name = user?.email?.split("@")[0] ?? "Admin";
  const cards = [
    { icon: ShieldCheck,  label: "Review",  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { icon: CheckCircle2, label: "Approve", color: "text-[#b04a15]",                          bg: "bg-[#b04a15]/10" },
    { icon: Users,        label: "Connect", color: "text-[#1e3a60] dark:text-blue-400",       bg: "bg-[#1e3a60]/10" },
  ];

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-950/55 dark:bg-black/65 backdrop-blur-sm ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}`} onClick={dismiss}>
      <div className={`relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden ${exiting ? "ck-card-exit" : "ck-card-enter"}`} onClick={e => e.stopPropagation()}>
        {/* Aurora top band */}
        <div className="ck-aurora h-2 w-full" />

        <button onClick={dismiss} className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-all active:scale-95 z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pt-8 pb-9 flex flex-col items-center text-center gap-5">
          <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] text-white shadow-lg shadow-orange-900/20">
            <ShieldCheck className="w-8 h-8" />
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight capitalize">
              Welcome back, {name} 👋
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-[300px]">
              Your approval desk is ready. Review and action donor &amp; donee requests, listings, and donations.
            </p>
          </div>

          {/* Cards fanning in */}
          <div className="flex gap-3 pt-1">
            {cards.map((c, i) => (
              <div key={c.label} className="ck-card-fan flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border border-stone-100 dark:border-zinc-800" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg} ${c.color}`}>
                  <c.icon className="w-4.5 h-4.5" />
                </span>
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300">{c.label}</span>
              </div>
            ))}
          </div>

          <button onClick={dismiss} className="mt-2 px-8 py-2.5 rounded-full bg-[#b04a15] hover:bg-[#963c0d] text-white text-sm font-bold active:scale-95 transition-all duration-200">
            Open dashboard
          </button>
          <div className="w-full h-[3px] bg-stone-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#b04a15] rounded-full" style={{ animation: "ck-progress-drain 3.5s linear forwards", transformOrigin: "left center" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WelcomeOverlay() {
  const { user, isLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      sessionStorage.removeItem("ck_welcome_pending");
      setShow(false);
    }, 400);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const pending = sessionStorage.getItem("ck_welcome_pending");
    if (pending !== "1") return;
    if (!user) {
      sessionStorage.removeItem("ck_welcome_pending");
      return;
    }
    setShow(true);
    // DONOR view is interactive (category picker) — no auto-dismiss.
    if (user.role !== "DONOR") {
      const delay = user.role === "SUPER_ADMIN" ? 4200 : 3500;
      const t = setTimeout(() => dismiss(), delay);
      return () => clearTimeout(t);
    }
  }, [isLoading, user, dismiss]);

  if (!show) return null;

  if (user?.role === "DONOR")       return <DonorWelcomeView exiting={exiting} dismiss={dismiss} />;
  if (user?.role === "SUPER_ADMIN") return <SuperAdminWelcomeView exiting={exiting} dismiss={dismiss} />;
  if (user?.role === "ADMIN")       return <AdminWelcomeView user={user} exiting={exiting} dismiss={dismiss} />;

  return <DefaultWelcomeView user={user} exiting={exiting} dismiss={dismiss} />;
}
