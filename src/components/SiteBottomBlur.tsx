"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
// @ts-expect-error — GradualBlur is the JS/CSS React Bits variant (no types shipped)
import GradualBlur from "@/components/GradualBlur";

// How close (px) to the page bottom before the blur fades out. Roughly the
// blur's own max height plus a little, so the fade finishes right as the footer
// content clears the blurred band.
const FADE_THRESHOLD = 95;

/**
 * Band heights, per screen class.
 *
 * <p><b>`dvh`, not `vh`.</b> On mobile browsers `vh` is locked to the viewport
 * with the URL bar HIDDEN — the tallest it can ever be. Sizing against that
 * makes the band visibly too tall for the screen you are actually looking at
 * while the bar is showing. `dvh` tracks the live visible viewport, so the band
 * re-sizes itself as the browser chrome collapses and expands.
 *
 * <p><b>Plus the safe-area inset.</b> Without it the band stops short of the
 * physical bottom edge on notched phones and the home-indicator strip is left
 * unblurred — the band looks detached from the end of the screen. Adding the
 * inset to the HEIGHT (the element is already pinned to `bottom: 0`) extends it
 * down into that strip so it always finishes flush.
 */
const band = (min: string, dvh: string, max: string) =>
  `calc(clamp(${min}, ${dvh}, ${max}) + env(safe-area-inset-bottom, 0px))`;

const BAND_MOBILE = band("1rem", "5dvh", "2.5rem");     // <= 480px
const BAND_TABLET = band("1.25rem", "5.5dvh", "3rem");  // <= 768px
const BAND_DESKTOP = band("1.5rem", "6dvh", "3.5rem");  // <= 1024px
const BAND_WIDE = band("1.5rem", "6dvh", "3.5rem");     // > 1024px

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
      // `visualViewport.height` is the area actually on screen. `innerHeight`
      // does not shrink while the mobile URL bar is showing, so the old test was
      // off by the height of that bar and the fade triggered at the wrong point.
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const scrollBottom = viewportH + window.scrollY;
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
    // Showing/hiding the mobile URL bar resizes the visual viewport WITHOUT
    // always firing a window `resize`, notably on iOS Safari. Without these the
    // band keeps the measurements it took under the old chrome height.
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onScroll);
    vv?.addEventListener("scroll", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      vv?.removeEventListener("resize", onScroll);
      vv?.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  const isAdminSurface =
    pathname?.startsWith("/admin") || pathname?.startsWith("/super-admin");

  if (isAdminSurface) return null;

  return (
    <GradualBlur
      target="page"
      position="bottom"
      // `responsive` activates GradualBlur's own breakpoint lookup, which picks
      // mobile/tablet/desktop heights off these props at <=480 / <=768 / <=1024.
      responsive
      height={BAND_WIDE}
      desktopHeight={BAND_DESKTOP}
      tabletHeight={BAND_TABLET}
      mobileHeight={BAND_MOBILE}
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
