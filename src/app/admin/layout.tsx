"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") { router.push("/"); return; }
  }, [user, isLoading, router]);

  if (isLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
