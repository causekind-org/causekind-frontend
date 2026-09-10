"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useNeedProfileGate } from "@/hooks/useNeedProfileGate";

/**
 * Drop-in replacement for `<Link href="/requests/new">` that checks the donee's
 * need-profile before navigating. The href is kept so middle-click, "open in
 * new tab" and crawlers behave normally — only a plain left-click is
 * intercepted, and the wizard still carries its own gate for those paths.
 */
export function NewRequestLink({
  href = "/requests/new",
  className,
  children,
  onClick,
  ...rest
}: React.ComponentProps<typeof Link>) {
  const { requestAccess } = useNeedProfileGate();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const destination = typeof href === "string" ? href : "/requests/new";

  return (
    <Link
      href={href}
      className={className}
      aria-busy={pending || undefined}
      onClick={async (e) => {
        // Callers' own handlers still run first (DoneeListingPrompt dismisses
        // itself here), and can opt out by preventing default themselves.
        onClick?.(e);
        // Let the browser handle modified clicks — those open a new context
        // where our in-page modal would never be seen.
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        // Several callers pass a role-dependent href that is only sometimes the
        // request wizard (the homepage hero sends donors to /items/new and
        // admins to their dashboard). Gate on the destination, not the caller.
        if (!destination.startsWith("/requests/new")) return;
        e.preventDefault();
        if (pending) return;
        setPending(true);
        try {
          if (await requestAccess(destination)) router.push(destination);
        } finally {
          setPending(false);
        }
      }}
      {...rest}
    >
      {children}
      {pending && <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin align-[-2px]" />}
    </Link>
  );
}
