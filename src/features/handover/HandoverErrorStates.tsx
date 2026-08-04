"use client";

import Link from "next/link";
import { CircleAlert, Lock, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Honest failure states.
 *
 * <p>The old hubs collapsed everything into `.catch(() => {})` and a bare
 * "Loading..." that never resolved, so a 500 and a not-yet-scheduled handover
 * looked identical. These distinguish "we couldn't reach the server" (retryable)
 * from "this isn't yours" (not).
 */

export function HandoverLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Centered>
      <CircleAlert className="h-8 w-8 text-amber-500" aria-hidden />
      <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
        We couldn&apos;t load this handover
      </h1>
      <p role="alert" className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
        {message}
      </p>
      <Button onClick={onRetry} className="min-h-[44px]">
        <RotateCw aria-hidden /> Try again
      </Button>
    </Centered>
  );
}

export function HandoverNotAParticipant() {
  return (
    <Centered>
      <Lock className="h-8 w-8 text-stone-400" aria-hidden />
      <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
        This handover isn&apos;t yours
      </h1>
      <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
        Only the donor and the recipient can open it. If you think this is a mistake,
        check you&apos;re signed in with the right account.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex min-h-[44px] items-center rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
      >
        Back to dashboard
      </Link>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] px-4">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">{children}</div>
    </main>
  );
}
