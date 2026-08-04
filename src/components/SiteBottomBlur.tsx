"use client";

import { usePathname } from "next/navigation";
import { useNearFooter } from "@/hooks/useNearFooter";
import { FEATURES } from "@/lib/features";
// @ts-expect-error — GradualBlur is the JS/CSS React Bits variant (no types shipped)
import GradualBlur from "@/components/GradualBlur";

/**
 * Band heights, per screen class.
 *
 * <p><b>`dvh`, not `vh`.</b> On mobile browsers `vh` is locked to the viewport
 * with the URL bar HIDDEN — the tallest it can ever be. Sizing against that
 * makes the band visibly too tall for the screen you are actually looking at
 * while the bar is showing. `dvh` tracks the live visible viewport, so the band
 * re-sizes itself as the browser chrome collapses and expands.
 *
 * <p><b>Plus `--ck-bottom-chrome`.</b> That token (styles.css) is everything the
 * floating navbar occupies measured from the physical screen edge upward — its
 * float gap, the safe-area inset and its own height. Adding it means the fade
 * can only ever BEGIN above the navbar. Sized as a bare band instead, the blur
 * ended in mid-air just above the bar and the strip of page scrolling below the
 * bar stayed sharp, which is what made the nav look like it floated mid-page.
 *
 * <p>The element stays pinned to `bottom: 0`, so the extra height also carries
 * it down through the home-indicator strip and it always finishes flush.
 */
const band = (min: string, dvh: string, max: string) =>
  `calc(var(--ck-bottom-chrome) + clamp(${min}, ${dvh}, ${max}))`;

const BAND_MOBILE = band("0.75rem", "3dvh", "2rem");    // <= 480px
const BAND_TABLET = band("1rem", "3.5dvh", "2.25rem");  // <= 768px
const BAND_DESKTOP = band("1.5rem", "6dvh", "3.5rem");  // <= 1024px
const BAND_WIDE = band("1.5rem", "6dvh", "3.5rem");     // > 1024px

/* Site-wide bottom fade — suppressed on the admin / super-admin panels (their
   own dark dashboard chrome), and slid out of the way as the footer arrives so
   it never blurs the real footer content. */
export function SiteBottomBlur() {
  const pathname = usePathname();

  /**
   * The SAME signal the mobile navbar uses, so the two bottom-anchored elements
   * agree about when the footer is near and leave/return together.
   *
   * <p>This replaces a hardcoded 95px scroll threshold plus `scroll`, `resize`
   * and two `visualViewport` listeners that existed only to keep that guess
   * honest across screen sizes and a collapsing mobile URL bar. An
   * IntersectionObserver needs none of that: it measures nothing and has no
   * threshold to re-tune, so it is correct at any screen or browser size.
   */
  const nearFooter = useNearFooter();

  const isAdminSurface =
    pathname?.startsWith("/admin") || pathname?.startsWith("/super-admin");

  // Temporarily hidden. Deliberately below the hooks above, not at the top of
  // the component: an early return before them would change hook order the
  // moment the flag is flipped back on.
  if (!FEATURES.bottomBlur) return null;

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
        // Slides as well as fades, on the same 300ms ease-in-out as the navbar
        // so the two never visibly separate on the way out or back.
        opacity: nearFooter ? 0 : 1,
        transform: nearFooter ? "translateY(100%)" : "translateY(0)",
        transition: "opacity 300ms ease-in-out, transform 300ms ease-in-out",
      }}
    />
  );
}
