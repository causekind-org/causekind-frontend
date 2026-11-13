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
/** The staff CRM portal, with or without a locale prefix. */
export function isCrmPath(pathname: string) {
  return pathname === "/crm" || pathname.startsWith("/crm/") || /^\/[a-z]{2}(-[A-Za-z]{2})?\/crm(\/|$)/.test(pathname);
}

export function AdminRedirect() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    // /crm is the staff CRM portal: admins (CRM staff logins included) work there too.
    if (user.role === "ADMIN" && !pathname.startsWith("/admin") && !isCrmPath(pathname)) {
      router.replace("/admin/dashboard");
    }
  }, [user, isLoading, pathname, router]);

  return null;
}
