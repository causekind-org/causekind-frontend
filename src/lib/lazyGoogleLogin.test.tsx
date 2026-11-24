import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const gsi = () => document.head.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]');

// Fresh module per test: the loader keeps its download promise at module level.
async function load() {
  vi.resetModules();
  return (await import("./lazyGoogleLogin")).useGoogleLogin;
}

describe("lazy Google sign-in", () => {
  beforeEach(() => {
    gsi().forEach((s) => s.remove());
    delete (window as unknown as { google?: unknown }).google;
  });

  it("does not load Google's script until the trigger is used, then loads it once and returns the token", async () => {
    const onSuccess = vi.fn();
    const useGoogleLogin = await load();
    const { result } = renderHook(() => useGoogleLogin({ onSuccess }));
    expect(gsi()).toHaveLength(0);

    act(() => result.current());
    act(() => result.current());
    expect(gsi()).toHaveLength(1);

    const requestAccessToken = vi.fn();
    const initTokenClient = vi.fn((cfg: { callback: (r: { access_token: string }) => void }) => {
      requestAccessToken.mockImplementation(() => cfg.callback({ access_token: "tok" }));
      return { requestAccessToken };
    });
    (window as unknown as { google: unknown }).google = { accounts: { oauth2: { initTokenClient } } };
    act(() => { (gsi()[0] as HTMLScriptElement).onload?.(new Event("load")); });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ access_token: "tok" }));
    expect(initTokenClient).toHaveBeenCalledWith(expect.objectContaining({ scope: "openid email profile" }));
  });

  it("reports a failed script load as an error", async () => {
    const onError = vi.fn();
    const useGoogleLogin = await load();
    const { result } = renderHook(() => useGoogleLogin({ onSuccess: vi.fn(), onError }));
    act(() => result.current());
    act(() => { (gsi()[0] as HTMLScriptElement).onerror?.(new Event("error")); });
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
