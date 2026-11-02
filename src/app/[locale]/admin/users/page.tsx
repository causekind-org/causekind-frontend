"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy route — the User Journey now lives INSIDE the admin dashboard shell
 * as a tab. This page only forwards old links (/admin/users?u=<id>) to
 * /admin/dashboard?journeyUser=<id> so nothing breaks.
 */
export default function AdminUsersRedirect() {
  const router = useRouter();

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("u");
    router.replace(u ? `/admin/dashboard?journeyUser=${u}` : "/admin/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
