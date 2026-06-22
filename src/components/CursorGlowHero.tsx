"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CursorGlowHero — a full-bleed dark hero panel with a warm cursor-tracking
 * radial spotlight. Works without canvas; uses only CSS transforms + opacity.
 */
export function CursorGlowHero({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // normalised 0-1
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setPos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
      setActive(true);
    };

    const handleLeave = () => setActive(false);

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes ck-glow-pulse-slow {
          0%, 100% { opacity: 0.14; transform: scale(1); }
          50%       { opacity: 0.22; transform: scale(1.08); }
        }
        @keyframes ck-glow-pulse-slow2 {
          0%, 100% { opacity: 0.10; transform: scale(1); }
          50%       { opacity: 0.18; transform: scale(1.06); }
        }
        .ck-glow-static-1 { animation: ck-glow-pulse-slow  7s ease-in-out infinite; }
        .ck-glow-static-2 { animation: ck-glow-pulse-slow2 9s ease-in-out 1.5s infinite; }
      `}</style>

      <div
        ref={containerRef}
        className="relative overflow-hidden bg-[#120c04] border-b border-stone-850 h-[280px] sm:h-[340px] flex items-center justify-center"
        style={{ cursor: "none" }}
      >
        {/* ── Static ambient glows (always visible) ── */}
        <div
          aria-hidden="true"
          className="ck-glow-static-1 pointer-events-none absolute rounded-full bg-[#b04a15]"
          style={{
            width: "520px",
            height: "520px",
            top: "-160px",
            left: "20%",
            filter: "blur(80px)",
          }}
        />
        <div
          aria-hidden="true"
          className="ck-glow-static-2 pointer-events-none absolute rounded-full bg-[#1e3a60]"
          style={{
            width: "380px",
            height: "380px",
            bottom: "-120px",
            right: "15%",
            filter: "blur(70px)",
          }}
        />

        {/* ── Cursor spotlight ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "360px",
            height: "360px",
            background:
              "radial-gradient(circle, rgba(176,74,21,0.28) 0%, rgba(176,74,21,0.10) 40%, transparent 70%)",
            left: `calc(${pos.x * 100}% - 180px)`,
            top: `calc(${pos.y * 100}% - 180px)`,
            opacity: active ? 1 : 0,
            transition: "left 0.06s linear, top 0.06s linear, opacity 0.5s ease",
            filter: "blur(2px)",
          }}
        />

        {/* ── Smaller sharp inner core ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "80px",
            height: "80px",
            background:
              "radial-gradient(circle, rgba(240,185,122,0.22) 0%, transparent 70%)",
            left: `calc(${pos.x * 100}% - 40px)`,
            top: `calc(${pos.y * 100}% - 40px)`,
            opacity: active ? 1 : 0,
            transition: "left 0.04s linear, top 0.04s linear, opacity 0.4s ease",
          }}
        />

        {/* Content sits above the glows */}
        <div className="relative z-20 w-full">{children}</div>
      </div>
    </>
  );
}
