"use client";

import { useEffect, useState } from "react";
import { ROLE_THEME_ATTR, currentRoleColors, type RolePalette } from "@/lib/roleTheme";

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
  const [palette, setPalette] = useState<RolePalette>(() => currentRoleColors());

  useEffect(() => {
    const sync = () => setPalette(currentRoleColors());
    sync();   // re-resolve on mount: SSR had no document
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [ROLE_THEME_ATTR, "class"],
    });
    return () => mo.disconnect();
  }, []);

  return palette;
}
