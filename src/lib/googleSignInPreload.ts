"use client";

/* Loads accounts.google.com/gsi/client on demand (see lazyGoogleLogin.ts).
   Kept in its own module so tests that mock the login hook still get a real,
   harmless preload. */

const SRC = "https://accounts.google.com/gsi/client";

export type GoogleTokenResponse = { access_token: string };
export type GoogleNonOAuthError = { type: "popup_failed_to_open" | "popup_closed" | "unknown" };

type TokenClient = { requestAccessToken: () => void };
export type GoogleOAuth2 = {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (r: GoogleTokenResponse & { error?: string }) => void;
    error_callback?: (e: GoogleNonOAuthError) => void;
  }) => TokenClient;
};
type GoogleGlobal = { accounts?: { oauth2?: GoogleOAuth2 } };

let loading: Promise<void> | null = null;

export function oauth2(): GoogleOAuth2 | undefined {
  return (window as unknown as { google?: GoogleGlobal }).google?.accounts?.oauth2;
}

/** Start (or reuse) the script download. Safe to call many times. */
export function preloadGoogleSignIn(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (oauth2()) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; s.remove(); reject(new Error("Google sign-in failed to load")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}
