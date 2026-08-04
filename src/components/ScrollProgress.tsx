"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ScrollProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const isAdminPath = !!pathname?.startsWith("/super-admin") || !!pathname?.startsWith("/admin/dashboard");

  useEffect(() => {
    if (isAdminPath) return;
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, scrolled / max) : 0;
      bar.style.transform = `scaleX(${pct})`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [isAdminPath]);

  if (isAdminPath) return null;

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{
        position:        "fixed",
        top:             0,
        left:            0,
        height:          "3px",
        width:           "100%",
        zIndex:          9999,
        /* Role-aware via tokens, not literals — an inline `style` resolves
           var() against this element, which inherits from <html> where the
           theme attribute lives. The amber midpoint is deliberately kept: it is
           the one stop that reads as "progress" rather than as brand colour,
           and it works against both the terracotta and the navy ramp. */
        background:      "linear-gradient(90deg, var(--ck-role-accent) 0%, var(--ck-role-secondary) 38%, #f59e0b 62%, var(--ck-role-deep) 100%)",
        /* color-mix keeps the glow tied to the accent without needing a
           separate rgba token per role. */
        boxShadow:       "0 0 10px color-mix(in srgb, var(--ck-role-accent) 45%, transparent), 0 0 4px color-mix(in srgb, var(--ck-role-accent) 25%, transparent)",
        transition:      "transform 80ms linear",
        borderRadius:    "0 2px 2px 0",
        pointerEvents:   "none",
        transformOrigin: "left center",
        transform:       "scaleX(0)",
        willChange:      "transform",
      }}
    />
  );
}
