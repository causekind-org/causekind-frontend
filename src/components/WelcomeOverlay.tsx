"use client";

import { useEffect, useState, useCallback } from "react";
import { HandHeart, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type OverlayConfig = {
  icon: React.ReactNode;
  headline: string;
  subline: string;
  accentBg: string;      // card top-strip color
  iconWrapBg: string;    // icon circle bg
  iconColor: string;     // icon stroke/fill
  confettiColor: string; // sparkle dots
};

function getConfig(role: string | undefined): OverlayConfig {
  switch (role) {
    case "DONOR":
      return {
        icon: <HandHeart className="w-8 h-8" aria-hidden="true" />,
        headline: "Welcome, changemaker!",
        subline:
          "Browse verified in-kind requests nearby and give items that make a real difference — your generosity goes directly to those who need it.",
        accentBg: "bg-[#b04a15]",
        iconWrapBg: "bg-[#b04a15]/10 dark:bg-[#b04a15]/20",
        iconColor: "text-[#b04a15] dark:text-orange-400",
        confettiColor: "#e07b3a",
      };
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

// 12 lightweight CSS-only sparkle dots
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
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: color,
            animationDelay: p.delay,
            opacity: 0,
          }}
        />
      ))}
    </>
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
    // Bail out if auth is still hydrating
    if (isLoading) return;

    const pending = sessionStorage.getItem("ck_welcome_pending");
    if (pending !== "1") return;

    if (!user) {
      // Auth resolved but no user — clear flag and stay hidden
      sessionStorage.removeItem("ck_welcome_pending");
      return;
    }

    setShow(true);

    // Auto-dismiss after 3500 ms
    const t = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(t);
  }, [isLoading, user, dismiss]);

  if (!show) return null;

  const cfg = getConfig(user?.role);

  return (
    <>
      <style>{`
        @keyframes ck-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ck-overlay-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes ck-card-in {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes ck-card-out {
          from { opacity: 1; transform: scale(1)    translateY(0);    }
          to   { opacity: 0; transform: scale(0.92) translateY(12px); }
        }
        @keyframes ck-sparkle-pop {
          0%   { opacity: 0; transform: scale(0);   }
          40%  { opacity: 1; transform: scale(1.4); }
          70%  { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        .ck-sparkle-dot {
          animation: ck-sparkle-pop 2.2s ease-in-out infinite;
        }
        .ck-scrim-enter  { animation: ck-overlay-in  0.3s ease both; }
        .ck-scrim-exit   { animation: ck-overlay-out 0.4s ease both; }
        .ck-card-enter   { animation: ck-card-in  0.42s cubic-bezier(0.22,1,0.36,1) both; }
        .ck-card-exit    { animation: ck-card-out 0.38s cubic-bezier(0.4,0,1,1) both; }
      `}</style>

      {/* Backdrop scrim */}
      <div
        className={`
          fixed inset-0 z-[9999] flex items-center justify-center p-4
          bg-stone-950/50 dark:bg-black/60 backdrop-blur-sm
          ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}
        `}
        onClick={dismiss}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome message"
      >
        {/* Card — stop propagation so clicks inside don't dismiss */}
        <div
          className={`
            relative w-full max-w-sm
            bg-[#faf8f5] dark:bg-zinc-900
            rounded-3xl shadow-2xl shadow-stone-900/20 dark:shadow-black/50
            overflow-hidden
            ${exiting ? "ck-card-exit" : "ck-card-enter"}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkle dots (absolutely positioned relative to card) */}
          <Sparkles12 color={cfg.confettiColor} />

          {/* Accent top strip */}
          <div className={`${cfg.accentBg} h-1.5 w-full`} />

          {/* Close button */}
          <button
            onClick={dismiss}
            aria-label="Close welcome message"
            className="
              absolute top-4 right-4
              flex items-center justify-center w-8 h-8 rounded-full
              text-stone-400 hover:text-stone-600 dark:hover:text-stone-200
              hover:bg-stone-100 dark:hover:bg-zinc-800
              transition-all active:scale-95
            "
          >
            <X className="w-4 h-4" />
          </button>

          {/* Body */}
          <div className="px-8 pt-8 pb-9 flex flex-col items-center text-center gap-5">
            {/* Icon circle */}
            <span
              className={`
                flex items-center justify-center
                w-16 h-16 rounded-2xl
                ${cfg.iconWrapBg} ${cfg.iconColor}
              `}
            >
              {cfg.icon}
            </span>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight leading-snug">
                {cfg.headline}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-[280px]">
                {cfg.subline}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={dismiss}
              className={`
                mt-1 px-8 py-2.5 rounded-full
                ${cfg.accentBg} text-white text-sm font-bold
                hover:opacity-90 active:scale-95
                transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b04a15]/60
              `}
            >
              Get started
            </button>

            {/* Progress bar — drains over 3500 ms to signal auto-dismiss */}
            <div className="w-full h-[3px] bg-stone-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${cfg.accentBg} rounded-full`}
                style={{
                  animation: "ck-progress-drain 3.5s linear forwards",
                  transformOrigin: "left center",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress drain keyframe — must be in a separate <style> so it's not
          inside the component-level style block (avoids SSR mismatch) */}
      <style>{`
        @keyframes ck-progress-drain {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </>
  );
}
