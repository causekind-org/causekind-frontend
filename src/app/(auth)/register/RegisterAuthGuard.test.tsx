import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, setUser: vi.fn() }) }));

// Both plausible detected countries, neither with states, so the city is free text.
vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({
    countries: [{ value: "IN", label: "India" }, { value: "US", label: "United States" }],
    states: [],
    cities: [],
    dialCodes: [
      { value: "IN", label: "India (+91)", phonecode: "91" },
      { value: "US", label: "United States (+1)", phonecode: "1" },
    ],
  }),
}));

const initiateRegistration = vi.fn();
const googleAuth = vi.fn();
vi.mock("@/lib/api", () => ({
  initiateRegistration: (...a: unknown[]) => initiateRegistration(...a),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  registerNgo: vi.fn(),
  googleAuth: (...a: unknown[]) => googleAuth(...a),
  googleComplete: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

type GoogleOpts = {
  onSuccess: (r: { access_token: string }) => Promise<void>;
  onNonOAuthError: (e: { type: "popup_closed" | "popup_failed_to_open" | "unknown" }) => void;
};
let googleOpts: GoogleOpts;
const triggerGoogle = vi.fn();
vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: (opts: GoogleOpts) => { googleOpts = opts; return triggerGoogle; },
}));

import RegisterPage from "./page";

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const continueBtn = () => screen.getByRole("button", { name: /continue to your details/i });
const google = () => screen.getByRole("button", { name: /google/i });

function fillDetails() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "asha@example.com" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "9876543210" } });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "long-enough-pw" } });
}

describe("register: auth guard, Google lifecycle and cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams("next=/requests/5/offer");
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client";
  });

  it("carries the chosen role and the destination into Google completion", async () => {
    googleAuth.mockResolvedValue({ needsCompletion: true, email: "n@example.com", fullName: "N" });
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole("radio", { name: /donee account/i }));
    fireEvent.click(google());
    await act(() => googleOpts.onSuccess({ access_token: "tok" }));

    const url = new URL(push.mock.calls[0][0], "http://x");
    expect(url.pathname).toBe("/register");
    expect(url.searchParams.get("social")).toBe("google");
    expect(url.searchParams.get("role")).toBe("DONEE");
    expect(url.searchParams.get("next")).toBe("/requests/5/offer");
  });

  it("locks role and Continue while the Google popup is open, and unlocks on close", () => {
    render(<RegisterPage />);
    fireEvent.click(google());
    fireEvent.click(google());
    expect(triggerGoogle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: /donee account/i })).toBeDisabled();
    expect(continueBtn()).toBeDisabled();

    act(() => googleOpts.onNonOAuthError({ type: "popup_closed" }));
    expect(continueBtn()).not.toBeDisabled();
    expect(screen.getByRole("radio", { name: /donee account/i })).not.toBeDisabled();
  });

  it("no longer shows the unwired Remember me or the Facebook placeholder", () => {
    render(<RegisterPage />);
    expect(screen.queryByText(/facebook/i)).toBeNull();
    fireEvent.click(continueBtn());
    expect(screen.queryByLabelText(/remember me/i)).toBeNull();
    expect(screen.queryByText(/log out on close/i)).toBeNull();
  });

  it("submits the unchanged payload once, then moves to the OTP step", async () => {
    let resolve!: () => void;
    initiateRegistration.mockReturnValue(new Promise<void>(r => { resolve = r; }));
    render(<RegisterPage />);
    fireEvent.click(continueBtn());
    fillDetails();

    const form = screen.getByRole("button", { name: /create account/i }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form); // double submit in the same tick
    expect(initiateRegistration).toHaveBeenCalledTimes(1);

    const payload = initiateRegistration.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(["city", "email", "fullName", "password", "phone", "role"]);
    expect(payload).not.toHaveProperty("rememberMe");
    expect(payload.role).toBe("DONOR");

    await act(async () => { resolve(); });
    await waitFor(() => expect(screen.getByText("Check your inbox")).toBeInTheDocument());
  });

  it("renders no raw translation keys on either step", () => {
    render(<RegisterPage />);
    expect(document.body.textContent).not.toMatch(/auth\.register\./);
    fireEvent.click(continueBtn());
    expect(document.body.textContent).not.toMatch(/auth\.register\./);
  });
});
