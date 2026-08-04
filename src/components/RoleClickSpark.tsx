"use client";

import { useEffect, useState } from "react";
// @ts-expect-error — ClickSpark is the JS/React Bits variant (no types shipped)
import ClickSpark from "@/components/ClickSpark";
import { ROLE_THEME_ATTR, currentRoleColors } from "@/lib/roleTheme";

/**
 * Site-wide click spark, tinted by the signed-in role.
 *
 * <p>ClickSpark paints to a canvas, so it takes a colour *string* — it cannot
 * read `var(--ck-role-accent)`, and resolving one via `getComputedStyle` on every
 * frame would be wasteful. This wrapper resolves the literal once from the same
 * palette module the CSS tokens are generated from, then re-resolves only when
 * the role or the light/dark mode actually changes.
 *
 * <p>A `MutationObserver` rather than `useAuth`, deliberately: this sits above
 * the spark in the tree and both signals it needs — `data-ck-role-theme` and the
 * `dark` class — are attributes on `<html>`. Watching the element means it also
 * picks up the pre-paint boot script's value and the navbar's theme toggle,
 * neither of which flows through React state.
 */
export function RoleClickSpark(props: {
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  children: React.ReactNode;
}) {
  const [color, setColor] = useState<string>("#b04a15");

  useEffect(() => {
    const sync = () => setColor(currentRoleColors().accent);
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [ROLE_THEME_ATTR, "class"],
    });
    return () => mo.disconnect();
  }, []);

  return <ClickSpark sparkColor={color} {...props} />;
}
