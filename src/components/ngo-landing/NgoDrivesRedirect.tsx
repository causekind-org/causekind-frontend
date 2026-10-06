"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Sends an NGO account away from a donor/donee page to its drives. */
export function NgoDrivesRedirect({ to = "/dashboard/ngo#live-drives" }: { to?: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  return <p role="status" className="p-8">Opening your drives…</p>;
}
