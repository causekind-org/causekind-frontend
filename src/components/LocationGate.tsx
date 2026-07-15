"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { updateLocation, getMyProfile } from "@/lib/api";
import { detectLocationFromServer } from "@/app/actions/locations";

type ModalState = "hidden" | "visible" | "loading";

export function LocationGate() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<ModalState>("hidden");
  const [shown, setShown] = useState(false);
  const isAdminPath = !!pathname?.startsWith("/admin/dashboard") || !!pathname?.startsWith("/super-admin");

  // Per-account gate: the "prompted" flag is scoped to the signed-in account
  // (a shared browser holds many test/family accounts — one account dismissing
  // the prompt must not silence it for every other account forever). And if the
  // browser permission is ALREADY granted, we skip the modal entirely and sync
  // coordinates to whichever account just signed in without one.
  useEffect(() => {
    if (isAdminPath) return;
    if (typeof window === "undefined") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const promptedKey = user ? `ck_location_prompted_${user.email}` : "ck_location_prompted";

    async function decide() {
      if (user) {
        // Already has coordinates on this account? Nothing to do.
        try {
          const profile = await getMyProfile();
          if (cancelled) return;
          if (profile.latitude != null && profile.longitude != null) return;
        } catch {
          return; // can't read profile — don't nag
        }

        // Account lacks coordinates. If the site already has geolocation
        // permission, save silently — no modal.
        let permState: PermissionState = "prompt";
        try {
          permState = (await navigator.permissions.query({ name: "geolocation" })).state;
        } catch {
          // Permissions API unavailable — fall through to the modal path
        }
        if (cancelled) return;
        if (permState === "granted") {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await updateLocation(pos.coords.latitude, pos.coords.longitude);
                toast.success("Location saved to your account");
              } catch { /* non-fatal */ }
            },
            () => {},
            { timeout: 10000 }
          );
          return;
        }
        if (permState === "denied") return;
      }

      if (localStorage.getItem(promptedKey)) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        setShown(true);
        setState("visible");
      }, 1200);
    }

    decide();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isAdminPath, user]);

  // When a previously logged-out visitor who shared a location signs in, sync it to their account.
  useEffect(() => {
    if (isAdminPath || !user || typeof window === "undefined") return;
    const pending = localStorage.getItem("ck_pending_location");
    if (!pending) return;
    try {
      const { latitude, longitude } = JSON.parse(pending);
      if (typeof latitude === "number" && typeof longitude === "number") {
        updateLocation(latitude, longitude)
          .then(() => localStorage.removeItem("ck_pending_location"))
          .catch(() => {});
      } else {
        localStorage.removeItem("ck_pending_location");
      }
    } catch {
      localStorage.removeItem("ck_pending_location");
    }
  }, [user, isAdminPath]);

  const dismiss = useCallback(() => {
    localStorage.setItem(user ? `ck_location_prompted_${user.email}` : "ck_location_prompted", "1");
    setState("hidden");
  }, [user]);

  const handleMaybeLater = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleAllow = useCallback(() => {
    if (!navigator?.geolocation) {
      toast.info("Geolocation is not supported by your browser. You can set your location later in your profile.");
      dismiss();
      return;
    }

    setState("loading");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let cityLabel = "";

        // Best-effort reverse geocode — ignore failures
        try {
          const geo = await detectLocationFromServer(latitude, longitude);
          if (geo?.address) {
            const addr = geo.address;
            cityLabel = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
          }
        } catch {
          // silent
        }

        if (user) {
          // Logged-in path: persist to backend
          try {
            await updateLocation(latitude, longitude);
            toast.success(
              cityLabel
                ? `Location saved — ${cityLabel}`
                : "Location saved successfully!"
            );
          } catch {
            // coords saved; backend error is non-fatal
            toast.success(
              cityLabel
                ? `Location set — ${cityLabel}`
                : "Location set!"
            );
          }
        } else {
          // Logged-out path: stash coords locally for later sync
          localStorage.setItem(
            "ck_pending_location",
            JSON.stringify({ latitude, longitude })
          );
          toast.success(
            cityLabel
              ? `Location set — ${cityLabel}`
              : "Location set! It will sync when you sign in."
          );
        }

        dismiss();
      },
      (_err) => {
        toast.info("No problem — you can set your location later in your profile.");
        dismiss();
      },
      { timeout: 10000 }
    );
  }, [user, dismiss]);

  if (isAdminPath || !shown || state === "hidden") return null;

  return (
    <>
      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes ck-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ck-modal-in {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes ck-ring-1 {
          0%   { transform: scale(1);    opacity: 0.55; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ck-ring-2 {
          0%   { transform: scale(1);    opacity: 0.38; }
          100% { transform: scale(3.2); opacity: 0; }
        }
        @keyframes ck-pin-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        .ck-backdrop-anim  { animation: ck-backdrop-in 0.28s ease forwards; }
        .ck-modal-anim     { animation: ck-modal-in    0.36s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .ck-ring-1         { animation: ck-ring-1 2.2s ease-out infinite; }
        .ck-ring-2         { animation: ck-ring-2 2.2s ease-out 0.7s infinite; }
        .ck-pin-float      { animation: ck-pin-float 2.8s ease-in-out infinite; }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="ck-backdrop-anim fixed inset-0 z-[9990] flex items-center justify-center p-4
                   bg-black/50 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
        aria-label="Share your location"
      >
        {/* ── Modal card ── */}
        <div
          className="ck-modal-anim relative w-full max-w-sm rounded-2xl shadow-2xl
                     bg-[#faf8f5] dark:bg-zinc-900
                     border border-[#e07b3a]/20 dark:border-zinc-700
                     p-6 text-center"
        >
          {/* Close button */}
          <button
            onClick={handleMaybeLater}
            className="absolute top-3 right-3 p-1.5 rounded-full
                       text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200
                       hover:bg-zinc-100 dark:hover:bg-zinc-800
                       transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* ── Animated pin + rings ── */}
          <div className="relative mx-auto mb-5 w-16 h-16 flex items-center justify-center">
            {/* Ring 1 */}
            <span
              className="ck-ring-1 absolute inset-0 rounded-full
                         border-2 border-[#b04a15]/50"
            />
            {/* Ring 2 */}
            <span
              className="ck-ring-2 absolute inset-0 rounded-full
                         border border-[#e07b3a]/35"
            />
            {/* Icon container */}
            <span
              className="ck-pin-float relative z-10 flex items-center justify-center
                         w-16 h-16 rounded-full
                         bg-gradient-to-br from-[#b04a15] to-[#e07b3a]
                         shadow-lg shadow-[#b04a15]/30"
            >
              <MapPin size={28} className="text-[#faf8f5]" fill="rgba(250,248,245,0.18)" />
            </span>
          </div>

          {/* ── Headline ── */}
          <h2
            className="text-lg font-bold mb-1
                       text-[#1e3a60] dark:text-[#f0b97a]"
          >
            Help closer to home
          </h2>

          {/* ── Body copy ── */}
          <p
            className="text-sm leading-relaxed mb-6
                       text-zinc-600 dark:text-zinc-300"
          >
            CauseKind connects you with needs and donations{" "}
            <span className="font-semibold text-[#b04a15] dark:text-[#e07b3a]">
              within ~10 km
            </span>{" "}
            of where you are. Sharing your location means local families in need
            reach the right helping hands first — no wasted journeys, more
            smiles.
          </p>

          {/* ── Buttons ── */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleAllow}
              disabled={state === "loading"}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm
                         bg-[#b04a15] hover:bg-[#9a3e10] active:bg-[#7d320d]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-[#faf8f5]
                         transition-all duration-150
                         shadow-md shadow-[#b04a15]/25
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#b04a15] focus-visible:ring-offset-2"
            >
              {state === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-[#faf8f5]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Detecting…
                </span>
              ) : (
                "Allow location"
              )}
            </button>

            <button
              onClick={handleMaybeLater}
              disabled={state === "loading"}
              className="w-full py-2 px-4 rounded-xl font-medium text-sm
                         text-zinc-500 dark:text-zinc-400
                         hover:text-[#b04a15] dark:hover:text-[#e07b3a]
                         hover:bg-[#b04a15]/8 dark:hover:bg-[#e07b3a]/10
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#b04a15]/50 focus-visible:ring-offset-2"
            >
              Maybe later
            </button>
          </div>

          {/* ── Subtle footnote ── */}
          <p className="mt-4 text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
            Your exact coordinates are never shared publicly.
          </p>
        </div>
      </div>
    </>
  );
}
