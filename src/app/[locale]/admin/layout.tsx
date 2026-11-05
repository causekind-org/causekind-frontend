"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Shared guard for every /admin/** route — replaces the inline useEffect
 * check that used to be copy-pasted into each page. SUPER_ADMIN is allowed
 * here too: they hold ROLE_ADMIN server-side (JwtAuthFilter) and the
 * AdminCapabilityFilter exempts them unconditionally, so this stays
 * consistent end-to-end.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // CRM agents are confined to the call list; the backend refuses everything else.
  const onCalls = pathname?.endsWith("/admin/calls") ?? false;
  const allowed = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || (user?.role === "CRM_AGENT" && onCalls);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role === "CRM_AGENT" && !onCalls) { router.replace("/admin/calls"); return; }
    if (!allowed) { router.push("/"); return; }
  }, [user, isLoading, router, allowed, onCalls]);

  if (isLoading || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
