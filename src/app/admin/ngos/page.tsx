"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy route. NGO applications are reviewed in the admin dashboard's NGO Applications
 * tab; this forwards old links (/admin/ngos?application=<id>) there.
 */
export default function NgoReviewRedirect() {
  const router = useRouter();
  useEffect(() => {
    const application = new URLSearchParams(window.location.search).get("application");
    const qs = new URLSearchParams({ tab: "ngo-applications" });
    if (application) qs.set("application", application);
    router.replace(`/admin/dashboard?${qs.toString()}`);
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
