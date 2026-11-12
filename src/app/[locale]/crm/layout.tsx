"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { adminGetMyPermissions } from "@/lib/api";

/**
 * Guard for the staff CRM portal. Same accounts as /admin (ADMIN, SUPER_ADMIN),
 * but only those holding CRM_ACCESS. The backend's AdminCapabilityFilter
 * enforces the same rule on every /api/v1/admin/crm call, so this only spares
 * staff a page of 403s.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login?next=/crm"); return; }
    if (!isAdmin) { router.push("/"); return; }
    adminGetMyPermissions()
      .then((p) => setAllowed(p.CRM_ACCESS !== false))
      .catch(() => setAllowed(false));
  }, [user, isLoading, isAdmin, router]);

  if (allowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        This account does not have access to the CRM. Ask a super admin to turn on &quot;Call list&quot; for you.
      </div>
    );
  }

  if (isLoading || !user || !isAdmin || allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
