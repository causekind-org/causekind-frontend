"use client";

import { useEffect, useState } from "react";
import { ROLE_THEME_ATTR, currentRoleColors, roleColors, type RolePalette } from "@/lib/roleTheme";

/**
 * The active role palette as **resolved literals**, for JavaScript that paints.
 *
 * <p><b>Never pass `var(--ck-role-*)` into a component's colour prop.</b> GSAP,
 * canvas and any library that parses a colour to RGB cannot resolve a CSS custom
 * property — GSAP logs "Color format not recognised" once per tween and silently
 * drops the colour. (Learned the hard way: 185 warnings from one StaggeredMenu.)
 * CSS-only surfaces should use the tokens; anything parsed in JS uses this.
 *
 * <p>A `MutationObserver` on `<html>` rather than `useAuth`, because both inputs
 * — `data-ck-role-theme` and the `dark` class — are attributes there. That also
 * catches the pre-paint boot script and the navbar's theme toggle, neither of
 * which flows through React state.
 */
export function useRoleColors(): RolePalette {
  /**
   * Starts at the neutral palette ON PURPOSE — the same value the server
   * rendered.
   *
   * <p>Reading the live theme in this initializer causes a hydration mismatch:
   * it runs during the client's FIRST render, by which point the pre-paint boot
   * script has already set `data-ck-role-theme`, so the client produced donee
   * blue where the server's HTML had donor terracotta. React reported it as a
   * prop diff on `.sm-prelayer` (`background: "#1e3a60"` vs the server's
   * `rgb(176, 74, 21)`). A `useEffect` cannot fix that — the divergence happens
   * before effects run.
   *
   * <p>The cost is one frame of neutral on these few JS-painted elements. The
   * CSS-token path — almost everything — has no flash at all, because the boot
   * script sets the attribute before first paint.
   */
  const [palette, setPalette] = useState<RolePalette>(() => roleColors(null, false));

  useEffect(() => {
    const sync = () => setPalette(currentRoleColors());
    sync();   // now safe: post-hydration, and the real theme is readable
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [ROLE_THEME_ATTR, "class"],
    });
    return () => mo.disconnect();
  }, []);

  return palette;
}
