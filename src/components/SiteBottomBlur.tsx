"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
// @ts-expect-error — GradualBlur is the JS/CSS React Bits variant (no types shipped)
import GradualBlur from "@/components/GradualBlur";

// How close (px) to the page bottom before the blur fades out. Roughly the
// blur's own height (6rem ≈ 96px) plus a little, so the fade finishes right as
// the footer content clears the blurred band.
const FADE_THRESHOLD = 160;

/* Site-wide bottom fade — but suppressed on the admin / super-admin panels
   (their own dark dashboard chrome), and faded out once the user reaches the
   very bottom of the page so it stops covering the real footer content. */
export function SiteBottomBlur() {
  const pathname = usePathname();
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollBottom = window.innerHeight + window.scrollY;
      const distanceFromBottom = document.documentElement.scrollHeight - scrollBottom;
      setAtBottom(distanceFromBottom <= FADE_THRESHOLD);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update(); // set initial state (e.g. short pages already at the bottom)
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  const isAdminSurface =
    pathname?.startsWith("/admin") || pathname?.startsWith("/super-admin");

  if (isAdminSurface) return null;

  return (
    <GradualBlur
      target="page"
      position="bottom"
      height="6rem"
      strength={2}
      divCount={5}
      curve="bezier"
      exponential
      opacity={1}
      style={{
        zIndex: 40,
        opacity: atBottom ? 0 : 1,
        transition: "opacity 0.35s ease",
      }}
    />
  );
}
