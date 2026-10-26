import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "./page";

/**
 * Pins the donor and donee signup forms. The register page is shared with the NGO
 * signup; the snapshots were recorded before the NGO legal-structure / PAN-card
 * fields were added, so any change to the donor or donee markup fails here.
 */

let mockSearchParams = new URLSearchParams();
beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  sessionStorage.clear();
});

const mockRouter = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  registerNgo: vi.fn(),
  registerNgoWithGoogle: vi.fn(),
  initiateRegistration: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  googleAuth: vi.fn(),
  googleComplete: vi.fn(),
  readNgoPanCard: vi.fn(),
  uploadSignupPanCard: vi.fn(),
}));
vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({
    countries: [{ value: "IN", label: "India" }],
    states: [],
    cities: [],
    dialCodes: [{ value: "IN", label: "India (+91)", phonecode: "91" }],
  }),
}));
vi.mock("@react-oauth/google", () => ({ useGoogleLogin: () => vi.fn() }));

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = vi.fn();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: "IN" }) });
});

function formMarkup() {
  return document.querySelector("form")!.outerHTML;
}

function fieldIds() {
  return Array.from(document.querySelectorAll("form input, form select, form textarea")).map(
    (el) => el.id || (el as HTMLInputElement).type,
  );
}

describe("Donor and donee signup are unchanged by the NGO signup", () => {
  it.each(["DONOR", "DONEE"])("%s email signup form is unchanged", async (role) => {
    mockSearchParams = new URLSearchParams(`role=${role}`);
    render(<RegisterPage />);
    expect(fieldIds()).toEqual(["fullName", "email", "phone", "password"]);
    expect(screen.queryByText(/PAN/i)).toBeNull();
    expect(screen.queryByText(/Legal structure/i)).toBeNull();
    expect(formMarkup()).toMatchSnapshot();
  });

  it.each(["DONOR", "DONEE"])("%s Google signup form is unchanged", async (role) => {
    mockSearchParams = new URLSearchParams(`social=google&role=${role}`);
    sessionStorage.setItem("ck_google_token", "ya29.token");
    sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: "jane@gmail.com", fullName: "Jane Doe" }));
    render(<RegisterPage />);
    expect(fieldIds()).toEqual(["fullName", "email", "phone"]);
    expect(screen.queryByText(/PAN/i)).toBeNull();
    expect(screen.queryByText(/Legal structure/i)).toBeNull();
    expect(formMarkup()).toMatchSnapshot();
  });
});
