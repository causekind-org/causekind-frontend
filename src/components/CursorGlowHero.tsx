"use client";

import { useEffect, useRef } from "react";

/**
 * CursorGlowHero — cursor-tracking radial spotlight.
 * Uses direct DOM writes + transform (not setState + left/top) to avoid
 * per-mousemove React re-renders and layout reflows.
 */
export function CursorGlowHero({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!el || !outer || !inner) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      outer.style.transform = `translate(${x - 180}px, ${y - 180}px)`;
      inner.style.transform = `translate(${x - 40}px, ${y - 40}px)`;
      outer.style.opacity = "1";
      inner.style.opacity = "1";
    };

    const handleLeave = () => {
      outer.style.opacity = "0";
      inner.style.opacity = "0";
    };

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
        {/* Static ambient glows */}
        <div
          aria-hidden="true"
          className="ck-glow-static-1 pointer-events-none absolute rounded-full bg-[#b04a15]"
          style={{ width: "520px", height: "520px", top: "-160px", left: "20%", filter: "blur(80px)" }}
        />
        <div
          aria-hidden="true"
          className="ck-glow-static-2 pointer-events-none absolute rounded-full bg-[#1e3a60]"
          style={{ width: "380px", height: "380px", bottom: "-120px", right: "15%", filter: "blur(70px)" }}
        />

        {/* Cursor spotlight — positioned at top:0 left:0, moved via transform only */}
        <div
          ref={outerRef}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "360px",
            height: "360px",
            top: 0,
            left: 0,
            background: "radial-gradient(circle, rgba(176,74,21,0.28) 0%, rgba(176,74,21,0.10) 40%, transparent 70%)",
            opacity: 0,
            transform: "translate(-180px, -180px)",
            transition: "transform 0.06s linear, opacity 0.5s ease",
            filter: "blur(2px)",
            willChange: "transform",
          }}
        />

        {/* Inner sharp core */}
        <div
          ref={innerRef}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "80px",
            height: "80px",
            top: 0,
            left: 0,
            background: "radial-gradient(circle, rgba(240,185,122,0.22) 0%, transparent 70%)",
            opacity: 0,
            transform: "translate(-40px, -40px)",
            transition: "transform 0.04s linear, opacity 0.4s ease",
            willChange: "transform",
          }}
        />

        <div className="relative z-20 w-full">{children}</div>
      </div>
    </>
  );
}
