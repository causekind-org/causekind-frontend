"use client";

import { useEffect, useState, useCallback } from "react";
import { HandHeart, Sparkles, X, Terminal, ShieldCheck, Database, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";

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

  function go() {
    dismiss();
  }

  return (
    <>
      <style>{`
        .ck-scrim-enter { animation: ck-overlay-in 0.5s ease-out both; }
        .ck-scrim-exit  { animation: ck-overlay-out 0.4s ease-in both; }
        @keyframes ck-overlay-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ck-overlay-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ck-donor-rise {
          0%   { opacity: 0; transform: translateY(32px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ck-donor-card { animation: ck-donor-rise 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
      `}</style>

      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-stone-950/85 backdrop-blur-xl ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}`}
        onClick={dismiss}
      >
        <button onClick={dismiss} className="absolute top-6 right-6 text-white/40 hover:text-white hover:rotate-90 transition-all duration-300 p-2">
          <X className="w-7 h-7" />
        </button>

        <div className="ck-donor-card w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#b04a15]/25 blur-[60px] -z-10 rounded-full" />
            <div className="w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-[#b04a15] to-[#e07b3a] flex items-center justify-center mx-auto shadow-xl shadow-[#b04a15]/30">
              <HandHeart className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight mb-3">
            Welcome back, Donor!
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
            Ready to make a difference? Choose what you&apos;d like to donate and we&apos;ll match you with someone nearby.
          </p>

          <button
            onClick={go}
            className="w-full bg-gradient-to-r from-[#b04a15] to-[#e07b3a] text-white font-extrabold py-3.5 rounded-2xl text-base shadow-lg shadow-[#b04a15]/30 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Start Giving →
          </button>
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

export function WelcomeOverlay() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);
  const isAdminDash = !!pathname?.startsWith("/admin/dashboard");

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      sessionStorage.removeItem("ck_welcome_pending");
      setShow(false);
    }, 400);
  }, []);

  useEffect(() => {
    if (isAdminDash) return;
    if (isLoading) return;
    const pending = sessionStorage.getItem("ck_welcome_pending");
    if (pending !== "1") return;
    if (!user) {
      sessionStorage.removeItem("ck_welcome_pending");
      return;
    }
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      sessionStorage.removeItem("ck_welcome_pending");
      return;
    }
    setExiting(false);
    setShow(true);
    // DONOR view is interactive (category picker) — no auto-dismiss.
    if (user.role !== "DONOR") {
      const delay = user.role === "SUPER_ADMIN" ? 4200 : 3500;
      const t = setTimeout(() => dismiss(), delay);
      return () => clearTimeout(t);
    }
  }, [isLoading, user, dismiss, isAdminDash]);

  if (isAdminDash || !show) return null;

  if (user?.role === "DONOR")       return <DonorWelcomeView exiting={exiting} dismiss={dismiss} />;
  if (user?.role === "SUPER_ADMIN") return <SuperAdminWelcomeView exiting={exiting} dismiss={dismiss} />;
  if (user?.role === "ADMIN")       return null;

  return <DefaultWelcomeView user={user} exiting={exiting} dismiss={dismiss} />;
}
