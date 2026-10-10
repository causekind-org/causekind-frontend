"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";

/**
 * "I can help", resolved against who is looking.
 *
 * - Guest → login with `?next=/requests/{id}/offer`. Login, Google sign-in and
 *   registration all return there through `resolvePostAuthDestination`.
 * - Donor → straight into the existing offer wizard. Nothing is created until
 *   they submit it there.
 * - Any other signed-in role → an accurate note. Offers are donor-only on the
 *   server (`DonationOfferService.resolveDonor`), so a button would only 403.
 *
 * While auth is still resolving, a neutral placeholder holds the space so a
 * signed-in visitor never sees a flash of "Log in".
 */
export default function HelpAction({ requestId }: { requestId: number }) {
  const { user, isLoading } = useAuth();
  const offerPath = `/requests/${requestId}/offer`;
  const primary =
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ck-role-accent)] px-5 text-base font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 sm:w-auto";

  if (isLoading) {
    return <div className="h-12 w-full animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none dark:bg-white/10 sm:w-40" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link href={loginUrlFor(offerPath)} className={primary}>
          I can help <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          You&apos;ll sign in or create a donor account, then come straight back to this request.
        </p>
      </div>
    );
  }

  if (user.role === "DONOR") {
    return (
      <Link href={offerPath} className={primary}>
        I can help <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <p role="note" className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
      Offering an item needs a donor account. You&apos;re signed in with a different account type,
      so you can read this request but not make an offer from here.
    </p>
  );
}
