"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** Shared guard for /super-admin — replaces the page's own inline check. */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SUPER_ADMIN") { router.replace("/"); return; }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
