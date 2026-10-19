"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { loginUrlFor } from "@/lib/safeRedirect";
import s from "./fundraising.module.css";

/**
 * Wraps every donee fundraising page: hidden while FEATURES.fundraising is off,
 * sends signed-out visitors to login, and tells non-donees why they can't apply.
 */
export function DoneeGate({ path, children }: { path: string; children: ReactNode }) {
  const { user, isLoading, isRestoring } = useAuth();
  const loading = isLoading || isRestoring;
  const router = useRouter();

  useEffect(() => {
    if (FEATURES.fundraising && !loading && !user) router.replace(loginUrlFor(path));
  }, [loading, user, router, path]);

  if (!FEATURES.fundraising) {
    return (
      <div className={s.root}>
        <main className={s.wrap} style={{ paddingTop: 64, paddingBottom: 64 }}>
          <h1 className={s.serif} style={{ fontSize: 28 }}>Fundraising isn&apos;t available yet</h1>
          <p className={s.muted} style={{ marginTop: 8 }}>You can still <Link href="/requests/new">request items</Link>.</p>
        </main>
      </div>
    );
  }
  if (loading || !user) return <div className={s.root} aria-busy="true" />;
  if (user.role !== "DONEE") {
    return (
      <div className={s.root}>
        <main className={s.wrap} style={{ paddingTop: 64, paddingBottom: 64 }}>
          <h1 className={s.serif} style={{ fontSize: 28 }}>Fundraisers are for recipient accounts</h1>
          <p className={s.muted} style={{ marginTop: 8 }}>Sign in with the account of the person organising the fundraiser.</p>
        </main>
      </div>
    );
  }
  return <div className={s.root}>{children}</div>;
}
