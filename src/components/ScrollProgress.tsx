"use client";

import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (scrolled / max) * 100) : 0;
      bar.style.width = `${pct}%`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        height:     "3px",
        width:      "0%",
        zIndex:     9999,
        background: "linear-gradient(90deg, #b04a15 0%, #e07b3a 38%, #f59e0b 62%, #1e3a60 100%)",
        boxShadow:  "0 0 10px rgba(176,74,21,0.45), 0 0 4px rgba(176,74,21,0.25)",
        transition: "width 80ms linear",
        borderRadius: "0 2px 2px 0",
        pointerEvents: "none",
      }}
    />
  );
}
