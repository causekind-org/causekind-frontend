import { useCallback, useRef, useState } from "react";

/**
 * Which mutually exclusive authentication operation a page is running.
 * `authenticated` is terminal: the page is about to navigate away.
 */
export type AuthOperation = "idle" | "password" | "google" | "registering" | "authenticated";

/**
 * One lock per auth page, so password sign-in, Google sign-in and registration
 * can never run at the same time.
 *
 * <p>The ref is the real lock — it changes synchronously, so a double-click
 * that lands before React re-renders is still refused. The state copy only
 * drives disabled/loading UI.
 *
 * <p>Every `begin` returns an id. `release` and `succeed` take that id and do
 * nothing if it is not the current operation, so a late callback from an
 * earlier attempt (a slow Google exchange, say) can never unlock or overwrite
 * a newer one.
 */
export function useAuthOperation() {
  const ref = useRef<{ op: AuthOperation; id: number }>({ op: "idle", id: 0 });
  const [op, setOp] = useState<AuthOperation>("idle");

  /** Claims the lock. Returns the operation id, or null if something is already running. */
  const begin = useCallback((next: Exclude<AuthOperation, "idle" | "authenticated">): number | null => {
    if (ref.current.op !== "idle") return null;
    const id = ref.current.id + 1;
    ref.current = { op: next, id };
    setOp(next);
    return id;
  }, []);

  /** True while `id` is still the operation in flight. */
  const isCurrent = useCallback((id: number) => ref.current.id === id && ref.current.op !== "idle", []);

  /** Recoverable failure or cancellation: unlock, but only for the current operation. */
  const release = useCallback((id: number) => {
    if (ref.current.id !== id || ref.current.op === "authenticated") return;
    ref.current = { op: "idle", id };
    setOp("idle");
  }, []);

  /** Success: stays locked until the page navigates away / unmounts. */
  const succeed = useCallback((id: number): boolean => {
    if (ref.current.id !== id) return false;
    ref.current = { op: "authenticated", id };
    setOp("authenticated");
    return true;
  }, []);

  /**
   * Success reached through a flow that did not start here (the OTP screen
   * owns its own verification). Locks unconditionally.
   */
  const lockAuthenticated = useCallback(() => {
    ref.current = { op: "authenticated", id: ref.current.id + 1 };
    setOp("authenticated");
  }, []);

  /** Synchronous read, for effects that must not race a navigation this page started. */
  const isAuthenticated = useCallback(() => ref.current.op === "authenticated", []);

  return { op, busy: op !== "idle", begin, isCurrent, release, succeed, lockAuthenticated, isAuthenticated };
}
