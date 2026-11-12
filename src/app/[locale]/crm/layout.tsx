"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { adminGetMyPermissions } from "@/lib/api";
import { CrmLogin } from "./CrmLogin";

/**
 * Guard for the staff CRM portal. Same accounts as /admin (ADMIN, SUPER_ADMIN),
 * but only those holding CRM_ACCESS. The backend's AdminCapabilityFilter
 * enforces the same rule on every /api/v1/admin/crm call, so this only spares
 * staff a page of 403s.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    setAllowed(null);
    if (isLoading || !user) return;
    if (!isAdmin) { setAllowed(false); return; }
    adminGetMyPermissions()
      .then((p) => setAllowed(p.CRM_ACCESS !== false))
      .catch(() => setAllowed(false));
  }, [user, isLoading, isAdmin]);

  if (!isLoading && !user) return <CrmLogin />;

  if (allowed === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <p>This account cannot use the CRM. Sign in with the CRM login your super admin gave you.</p>
        <button type="button" onClick={logout} className="font-medium text-blue-700 hover:underline">Sign out</button>
      </div>
    );
  }

  if (isLoading || !user || allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
