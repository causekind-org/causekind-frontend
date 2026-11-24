"use client";

/*
 * Google sign-in that loads Google's script only when it is about to be used.
 *
 * 2026-11-20: @react-oauth/google's provider injected accounts.google.com/
 * gsi/client (~94 KiB, ~80 KiB of it unused) as soon as /login or /register
 * opened, whether or not the visitor ever touched the Google button.
 *
 * Now:
 *  - preloadGoogleSignIn() starts the download when a pointer or keyboard
 *    focus reaches the Google button (pointerenter / touchstart / focus), so
 *    the script is normally ready by the time the tap's click fires;
 *  - the trigger from useGoogleLogin() opens the popup straight away when the
 *    script is loaded, and otherwise loads it first. Chrome and Android keep
 *    the tap's user activation for several seconds, so the popup still opens;
 *    a browser that blocks it reports popup_failed_to_open, which the pages
 *    already turn into "allow popups / tap again".
 *
 * Drop-in for the subset of @react-oauth/google's useGoogleLogin the auth
 * pages use (implicit flow: scope, onSuccess, onError, onNonOAuthError).
 */

import { useCallback, useEffect, useRef } from "react";

import { oauth2, preloadGoogleSignIn, type GoogleNonOAuthError, type GoogleTokenResponse } from "./googleSignInPreload";

export type { GoogleNonOAuthError, GoogleTokenResponse };

export function useGoogleLogin(opts: {
  scope?: string;
  onSuccess: (r: GoogleTokenResponse) => void | Promise<void>;
  onError?: (r?: unknown) => void;
  onNonOAuthError?: (e: GoogleNonOAuthError) => void;
}): () => void {
  // Latest callbacks without re-creating the trigger on every render.
  const ref = useRef(opts);
  useEffect(() => { ref.current = opts; });

  return useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "missing-google-client-id";
    const open = () => {
      const api = oauth2();
      if (!api) { ref.current.onError?.(); return; }
      api.initTokenClient({
        client_id: clientId,
        scope: ref.current.scope ?? "openid email profile",
        callback: (r) => {
          if (r.error || !r.access_token) ref.current.onError?.(r);
          else void ref.current.onSuccess(r);
        },
        error_callback: (e) => ref.current.onNonOAuthError?.(e),
      }).requestAccessToken();
    };
    if (oauth2()) open();
    else preloadGoogleSignIn().then(open, () => ref.current.onError?.());
  }, []);
}
