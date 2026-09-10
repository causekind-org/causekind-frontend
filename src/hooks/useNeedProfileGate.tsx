"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getDoneeNeedProfile } from "@/lib/api";
import { NeedProfileGateModal } from "@/components/NeedProfileGateModal";

export type NeedProfileGateState =
  | { mode: "closed" }
  | { mode: "incomplete"; destination: string; missing: string[] }
  | { mode: "error"; destination: string; message: string };

type NeedProfileGateValue = {
  /**
   * Checks the donee's need-profile before a caller navigates to the request
   * wizard. Resolves true when the caller should proceed; resolves false having
   * opened the modal when it should not.
   */
  requestAccess: (destination: string) => Promise<boolean>;
  checking: boolean;
};

const NeedProfileGateContext = createContext<NeedProfileGateValue | null>(null);

export function NeedProfileGateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<NeedProfileGateState>({ mode: "closed" });
  const [checking, setChecking] = useState(false);
  // The element that opened the modal, so focus can be handed back on close.
  const triggerRef = useRef<HTMLElement | null>(null);

  const requestAccess = useCallback(async (destination: string): Promise<boolean> => {
    // Signed-out visitors and non-donees are not our problem: the wizard's own
    // role gate redirects them, and guessing here would only add a wrong modal.
    //
    // DONEE only, deliberately. The wizard also admits ADMIN, but
    // DoneeProfileService.owner() answers 403 for every role except DONEE, so
    // checking on an admin's behalf would only ever produce the error modal.
    //
    // The prefix strip is not cosmetic: useAuth carries the role straight from
    // the JWT, which sometimes spells it ROLE_DONEE. Comparing it raw made the
    // gate silently skip the very people it exists for.
    if (!user) return true;
    if ((user.role ?? "").toUpperCase().replace(/^ROLE_/, "") !== "DONEE") return true;

    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setChecking(true);
    try {
      // getDoneeNeedProfile() goes through request(), which dedupes in-flight
      // GETs and caches for CACHE_TTL_MS — repeated clicks cost nothing.
      const profile = await getDoneeNeedProfile();
      if (profile.complete) return true;
      setState({ mode: "incomplete", destination, missing: profile.missing });
      return false;
    } catch (e) {
      // An unreachable backend must never be reported as an incomplete profile.
      setState({
        mode: "error",
        destination,
        message: e instanceof Error && e.message && e.message !== "Failed to fetch"
          ? e.message
          : "We could not reach CauseKind to check your profile. Please check your connection and try again.",
      });
      return false;
    } finally {
      setChecking(false);
    }
  }, [user]);

  const close = useCallback(() => {
    setState({ mode: "closed" });
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const value = useMemo(() => ({ requestAccess, checking }), [requestAccess, checking]);

  return (
    <NeedProfileGateContext.Provider value={value}>
      {children}
      <NeedProfileGateModal state={state} checking={checking} onClose={close} onRetry={requestAccess} />
    </NeedProfileGateContext.Provider>
  );
}

export function useNeedProfileGate(): NeedProfileGateValue {
  const ctx = useContext(NeedProfileGateContext);
  if (!ctx) throw new Error("useNeedProfileGate must be used inside <NeedProfileGateProvider>");
  return ctx;
}
