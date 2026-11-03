import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "./page";

/**
 * Production shows NGO as "coming soon" (owner, 2026-10-10): with NGO signup
 * off, the register page offers no NGO form, even from a `?role=NGO` link.
 */
vi.mock("@/lib/features", async (orig) => {
  const real = await orig<typeof import("@/lib/features")>();
  return { ...real, FEATURES: { ...real.FEATURES, ngoRegistration: false } };
});

let mockSearchParams = new URLSearchParams();
beforeEach(() => { mockSearchParams = new URLSearchParams(); });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));
vi.mock("@react-oauth/google", () => ({ useGoogleLogin: () => vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  registerNgo: vi.fn(),
  initiateRegistration: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  googleAuth: vi.fn(),
  googleComplete: vi.fn(),
}));

describe("register page while NGO signup is coming soon", () => {
  it("shows the NGO option as Coming soon, not selectable", () => {
    render(<RegisterPage />);
    const ngo = screen.getByRole("button", { name: /NGO.*Coming soon/i });
    expect(ngo).toBeDisabled();
  });

  it("a ?role=NGO link opens the donor form with a note, never the NGO form", () => {
    mockSearchParams = new URLSearchParams("role=NGO");
    render(<RegisterPage />);
    expect(screen.getByText(/NGO registration is coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create NGO Account/i })).toBeNull();
    expect(screen.queryByLabelText(/PAN Number/i)).toBeNull();
  });
});
