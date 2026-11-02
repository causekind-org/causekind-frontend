import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "./page";

/**
 * The PAN card feature is hidden (kept but not used yet): the NGO signup form, normal and
 * Google, is the one from before it, with no structure, card upload, date of formation or
 * PAN warnings, and the PAN-card calls are never made.
 */

const mockRouter = { push: vi.fn(), replace: vi.fn() };
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter, useSearchParams: () => mockSearchParams }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn() }) }));
const readNgoPanCard = vi.fn();
const uploadSignupPanCard = vi.fn();
const ngoPanCheck = vi.fn();
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  registerNgo: vi.fn(),
  registerNgoWithGoogle: vi.fn(),
  initiateRegistration: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  googleAuth: vi.fn(),
  googleComplete: vi.fn(),
  readNgoPanCard: (...a: unknown[]) => readNgoPanCard(...a),
  uploadSignupPanCard: (...a: unknown[]) => uploadSignupPanCard(...a),
  ngoPanCheck: (...a: unknown[]) => ngoPanCheck(...a),
}));
vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({ countries: [{ value: "IN", label: "India" }], states: [], cities: [], dialCodes: [{ value: "IN", label: "India (+91)", phonecode: "91" }] }),
}));
vi.mock("@react-oauth/google", () => ({ useGoogleLogin: () => vi.fn() }));

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = vi.fn();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: "IN" }) });
});
beforeEach(() => sessionStorage.clear());

const ids = () => Array.from(document.querySelectorAll("form input[id], form select[id]")).map((e) => e.id);

function expectNoPanCardParts() {
  for (const id of ["legalStructure", "panCard", "dateOfFormation"]) expect(document.getElementById(id)).toBeNull();
  expect(screen.queryByText(/Upload your PAN card/i)).toBeNull();
  expect(screen.queryByText(/Legal structure/i)).toBeNull();
  expect(screen.queryByText(/Date of formation/i)).toBeNull();
  expect(screen.queryByTestId(/pan-warning-/)).toBeNull();
  expect(readNgoPanCard).not.toHaveBeenCalled();
  expect(uploadSignupPanCard).not.toHaveBeenCalled();
  expect(ngoPanCheck).not.toHaveBeenCalled();
}

describe("NGO signup with the PAN card feature hidden", () => {
  it("normal NGO signup shows the fields from before the feature, PAN typed", () => {
    mockSearchParams = new URLSearchParams("role=NGO");
    render(<RegisterPage />);
    expect(ids()).toEqual(["fullName", "email", "phone", "panNumber", "website", "password"]);
    expect(screen.getByLabelText(/PAN Number \*/i)).toBeInTheDocument();
    expectNoPanCardParts();
  });

  it("Google NGO signup shows the fields from before the feature, no password", () => {
    mockSearchParams = new URLSearchParams("social=google&role=NGO");
    sessionStorage.setItem("ck_google_token", "ya29.token");
    sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: "hope@gmail.com", fullName: "Ananya" }));
    render(<RegisterPage />);
    expect(ids()).toEqual(["fullName", "email", "phone", "panNumber", "website"]);
    expect((document.getElementById("email") as HTMLInputElement).readOnly).toBe(true);
    expect((document.getElementById("fullName") as HTMLInputElement).readOnly).toBe(false);
    expectNoPanCardParts();
  });
});
