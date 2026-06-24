"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Super admins must only ever see the command center. If an authenticated
 * SUPER_ADMIN lands on any non-/super-admin route (home, dashboard, profile,
 * etc.), bounce them to /super-admin. Mounted once in the root layout.
 */
export function SuperAdminRedirect() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === "SUPER_ADMIN" && !pathname.startsWith("/super-admin")) {
      router.replace("/super-admin");
    }
  }, [user, isLoading, pathname, router]);

  return null;
}
