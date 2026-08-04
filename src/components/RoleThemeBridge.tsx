"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_THEME_ATTR, themeForRole } from "@/lib/roleTheme";

/**
 * Keeps `data-ck-role-theme` on `<html>` in sync with the signed-in role.
 *
 * <p>Renders nothing. It reads the role from the existing `useAuth()` context —
 * no extra profile fetch, no second source of truth.
 *
 * <p><b>Why `<html>` and not a wrapper div.</b> Radix dialogs, selects, popovers,
 * vaul drawers and toasts all portal to `<body>`. A wrapper inside the tree would
 * leave every one of those outside the scope, and `var(--ck-role-accent)` would
 * resolve to nothing inside them — the exact failure already documented for
 * `--handover-*` in Decisions and Gotchas. On `<html>` there is nowhere to escape to.
 *
 * <p>The attribute is also set pre-paint by `ROLE_THEME_BOOT_SCRIPT`. This
 * component is what keeps it *honest* afterwards: the boot script trusts a cached
 * value, and this corrects it once the server has validated the session — and
 * removes it entirely on logout, so a recipient's blue never lingers over the
 * next person to use the browser.
 */
export function RoleThemeBridge() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const root = document.documentElement;

    // While auth is still resolving, leave whatever the boot script decided.
    // Clearing here would produce the very flash the boot script exists to stop.
    if (isLoading) return;

    const theme = themeForRole(user?.role);
    if (theme) root.setAttribute(ROLE_THEME_ATTR, theme);
    else root.removeAttribute(ROLE_THEME_ATTR);   // logout, admin, unknown role
  }, [user?.role, isLoading]);

  // Clean up if the provider itself unmounts, so no stale role colour survives.
  useEffect(() => () => document.documentElement.removeAttribute(ROLE_THEME_ATTR), []);

  return null;
}
