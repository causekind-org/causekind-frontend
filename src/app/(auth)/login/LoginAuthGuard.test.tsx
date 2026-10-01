import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => searchParams,
}));

// Real English messages (loaded inside the hoisted factory), so a missing key
// surfaces as a raw dotted path instead of passing silently.
vi.mock("next-intl", async () => {
  const en = (await import("../../../../messages/en.json")).default as Record<string, unknown>;
  return {
    useTranslations: (ns: string) => (key: string) => {
      const node = ns.split(".").reduce<Record<string, unknown> | undefined>((o, k) => o?.[k] as Record<string, unknown> | undefined, en);
      const value = node?.[key];
      return typeof value === "string" ? value : `${ns}.${key}`;
    },
  };
});

const setUser = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, setUser }) }));

const login = vi.fn();
const googleAuth = vi.fn();
vi.mock("@/lib/api", () => ({
  login: (...a: unknown[]) => login(...a),
  googleAuth: (...a: unknown[]) => googleAuth(...a),
}));

vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Capture the options the page hands the OAuth hook, so tests can play the
// popup's outcomes (success, error, closed) directly.
type GoogleOpts = {
  onSuccess: (r: { access_token: string }) => Promise<void>;
  onError: () => void;
  onNonOAuthError: (e: { type: "popup_closed" | "popup_failed_to_open" | "unknown" }) => void;
};
let googleOpts: GoogleOpts;
const triggerGoogle = vi.fn();
vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: (opts: GoogleOpts) => { googleOpts = opts; return triggerGoogle; },
}));

import LoginPage from "./page";

function fillValid() {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "asha@example.com" } });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "correct-horse" } });
}
const signIn = () => screen.getByRole("button", { name: /^sign in$/i });
const google = () => screen.getByRole("button", { name: /google/i });

describe("login: one auth operation at a time", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("next=/requests/5/offer");
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client";
  });

  it("sends one login request for a rapid double submit", async () => {
    login.mockReturnValue(new Promise(() => {})); // stays in flight
    render(<LoginPage />);
    fillValid();
    const form = signIn().closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form); // Enter + click, same tick
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("passes Remember me through to the existing login API", async () => {
    login.mockReturnValue(new Promise(() => {}));
    render(<LoginPage />);
    fillValid();
    fireEvent.click(screen.getByLabelText("Remember me")); // default on → off
    fireEvent.submit(signIn().closest("form")!);
    expect(login).toHaveBeenCalledWith("asha@example.com", "correct-horse", false);
  });

  it("blocks Google while a password login is running", async () => {
    login.mockReturnValue(new Promise(() => {}));
    render(<LoginPage />);
    fillValid();
    fireEvent.submit(signIn().closest("form")!);
    await waitFor(() => expect(google()).toBeDisabled());
    fireEvent.click(google());
    expect(triggerGoogle).not.toHaveBeenCalled();
  });

  it("blocks password submission while the Google popup is open", () => {
    render(<LoginPage />);
    fillValid();
    fireEvent.click(google());
    expect(triggerGoogle).toHaveBeenCalledTimes(1);
    fireEvent.click(google()); // repeated click while the popup is open
    expect(triggerGoogle).toHaveBeenCalledTimes(1);
    fireEvent.submit(signIn().closest("form")!);
    expect(login).not.toHaveBeenCalled();
  });

  it("closing the popup releases the lock, quietly", async () => {
    const { toast } = await import("@/lib/toast");
    render(<LoginPage />);
    fireEvent.click(google());
    act(() => googleOpts.onNonOAuthError({ type: "popup_closed" }));
    expect(google()).not.toBeDisabled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("an OAuth error releases the lock", () => {
    render(<LoginPage />);
    fireEvent.click(google());
    act(() => googleOpts.onError());
    expect(google()).not.toBeDisabled();
  });

  it("a backend exchange failure releases the lock", async () => {
    googleAuth.mockRejectedValue(new Error("Google account is suspended"));
    render(<LoginPage />);
    fireEvent.click(google());
    await act(() => googleOpts.onSuccess({ access_token: "tok" }));
    expect(google()).not.toBeDisabled();
  });

  it("a failed password login can be retried", async () => {
    login.mockRejectedValueOnce(new Error("Invalid credentials"));
    render(<LoginPage />);
    fillValid();
    fireEvent.submit(signIn().closest("form")!);
    await waitFor(() => expect(signIn()).not.toBeDisabled());
    login.mockReturnValue(new Promise(() => {}));
    fireEvent.submit(signIn().closest("form")!);
    expect(login).toHaveBeenCalledTimes(2);
  });

  it("navigates immediately on success (no delay) and stays locked", async () => {
    login.mockResolvedValue({ email: "asha@example.com", role: "DONOR" });
    render(<LoginPage />);
    fillValid();
    fireEvent.submit(signIn().closest("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/requests/5/offer"));
    expect(setUser).toHaveBeenCalledWith({ email: "asha@example.com", role: "DONOR" });
    // Still locked: a second submit sends nothing.
    fireEvent.submit(screen.getByRole("button", { name: /signed in/i }).closest("form")!);
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("sends a new Google user to completion with the destination kept", async () => {
    googleAuth.mockResolvedValue({ needsCompletion: true, email: "n@example.com", fullName: "N" });
    render(<LoginPage />);
    fireEvent.click(google());
    await act(() => googleOpts.onSuccess({ access_token: "tok" }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining("social=google"));
    expect(push.mock.calls[0][0]).toContain("next=%2Frequests%2F5%2Foffer");
  });

  it("renders no raw translation keys", () => {
    render(<LoginPage />);
    expect(document.body.textContent).not.toMatch(/auth\.login\./);
  });
});
