"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Normal admins must only ever see the admin dashboard.
 * If an authenticated ADMIN lands on any non-/admin route
 * (home, login, profile, etc.), bounce them to /admin/dashboard.
 * Mounted once in the root layout alongside SuperAdminRedirect.
 */
export function AdminRedirect() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === "ADMIN" && !pathname.startsWith("/admin")) {
      router.replace("/admin/dashboard");
    }
  }, [user, isLoading, pathname, router]);

  return null;
}
