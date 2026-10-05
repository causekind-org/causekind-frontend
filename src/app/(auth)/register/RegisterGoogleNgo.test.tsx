import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";
import { ApiError, registerNgo, registerNgoWithGoogle, googleComplete } from "@/lib/api";

/**
 * "Continue with Google" on the register page: with the NGO role the page now uses the
 * Google NGO signup (no password, email from Google, read-only); donors/donees keep the
 * Google completion call exactly as before.
 */
const mockPush = vi.fn();
const mockReplace = vi.fn();

let mockSearchParams = new URLSearchParams();

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
});

// One stable router, like Next's: the Google flow's effect depends on it.
const mockRouter = { push: mockPush, replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, any>) => {
    const translations: Record<string, string> = {
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      location: "Location",
      country: "Country",
      state: "State",
      city: "City",
      password: "Password",
      submit: "Submit",
      creating: "Creating...",
      haveAccount: "Already have an account?",
      logIn: "Log in",
      selectCountry: "Select country",
      selectState: "Select state",
      selectCity: "Select city",
      enterCity: "Enter city",
      panRequired: "PAN number is required",
      panInvalid: "PAN must be in standard Indian format (e.g. AABCT1234C)",
      panValid: "Valid PAN format",
      orgNameRequired: "Organization name is required",
      emailRequired: "Email is required",
      phoneRequired: "Phone number is required",
      passwordRequired: "Password is required",
      passwordTooShort: "Use at least 8 characters",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    setUser: vi.fn(),
  }),
}));

vi.mock("@/lib/api", async (orig) => ({
  ApiError: (await orig<typeof import("@/lib/api")>()).ApiError,
  registerNgo: vi.fn(),
  registerNgoWithGoogle: vi.fn().mockResolvedValue({ token: null, userId: 42, email: "hope@gmail.com", role: "NGO_PARTNER", fullName: "Hope Welfare Trust" }),
  initiateRegistration: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  googleAuth: vi.fn(),
  googleComplete: vi.fn().mockResolvedValue({ needsCompletion: false, userId: 7, email: "jane@gmail.com", role: "DONOR", fullName: "Jane Doe" }),
}));

vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({
    countries: [{ value: "IN", label: "India" }],
    states: [],
    cities: [],
    dialCodes: [{ value: "IN", label: "India (+91)", phonecode: "91" }],
  }),
}));

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = vi.fn();

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ country_code: "IN" }),
  });

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((_success, error) => {
      error?.({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    });
  }
});


function googleSession() {
  mockSearchParams = new URLSearchParams("social=google");
  sessionStorage.setItem("ck_google_token", "ya29.google-access-token");
  sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: "hope@gmail.com", fullName: "Ananya Sharma" }));
}

async function fillCity() {
  const cityInput = await screen.findByPlaceholderText("Enter city");
  fireEvent.change(cityInput, { target: { value: "Pune" } });
  fireEvent.blur(cityInput);
}

// Each test types through the whole form; the 5s default is tight under a parallel run.
describe("Register with Google", { timeout: 30000 }, () => {
  beforeEach(() => { vi.mocked(registerNgo).mockClear(); vi.mocked(registerNgoWithGoogle).mockClear(); vi.mocked(googleComplete).mockClear(); });

  it("NGO: no password field, Google email read-only, sends the Google NGO request", async () => {
    googleSession();
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole("button", { name: /^NGO/i }));
    expect(screen.queryByLabelText(/^Password/i)).toBeNull();
    const email = screen.getByLabelText(/Official Email Address \*/i) as HTMLInputElement;
    expect(email.value).toBe("hope@gmail.com");
    expect(email.readOnly).toBe(true);
    const org = screen.getByLabelText(/Organization Name \*/i) as HTMLInputElement;
    expect(org.readOnly).toBe(false);                     // an NGO types its organization name
    await user.clear(org);
    await user.type(org, "Hope Welfare Trust");
    await user.type(screen.getByLabelText(/Phone/i), "9876543210");
    await user.type(screen.getByLabelText(/PAN Number \*/i), "AABCT1234C");
    await fillCity();
    await user.click(screen.getByRole("button", { name: /^complete$/i }));
    await waitFor(() => expect(registerNgoWithGoogle).toHaveBeenCalledTimes(1));
    const [token, body] = vi.mocked(registerNgoWithGoogle).mock.calls[0];
    expect(token).toBe("ya29.google-access-token");
    expect(body).toMatchObject({ organizationName: "Hope Welfare Trust", panNumber: "AABCT1234C", country: "IN" });
    expect(body.phoneNumber).toMatch(/9876543210$/);
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("officialEmail");
    expect(registerNgo).not.toHaveBeenCalled();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));     // same landing as a normal NGO signup
  });

  it("NGO: a server field error is shown next to its field", async () => {
    googleSession();
    vi.mocked(registerNgoWithGoogle).mockRejectedValueOnce(new ApiError(400, "Some details need fixing. Check the highlighted fields.",
      { fieldErrors: [{ field: "phoneNumber", message: "Phone number already registered" }] }));
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole("button", { name: /^NGO/i }));
    const org = screen.getByLabelText(/Organization Name \*/i);
    await user.clear(org);
    await user.type(org, "Hope Welfare Trust");
    await user.type(screen.getByLabelText(/Phone/i), "9876543210");
    await user.type(screen.getByLabelText(/PAN Number \*/i), "AABCT1234C");
    await fillCity();
    await user.click(screen.getByRole("button", { name: /^complete$/i }));
    await waitFor(() => expect(document.getElementById("phone")?.getAttribute("aria-invalid")).toBe("true"));
  });

  it("donor: unchanged, still completes with googleComplete and never the NGO call", async () => {
    googleSession();
    sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: "jane@gmail.com", fullName: "Jane Doe" }));
    const user = userEvent.setup();
    render(<RegisterPage />);
    expect(screen.queryByLabelText(/^Password/i)).toBeNull();
    expect((screen.getByLabelText(/Full name/i) as HTMLInputElement).readOnly).toBe(true);
    await user.type(screen.getByLabelText(/Phone/i), "9876543210");
    await fillCity();
    await user.click(screen.getByRole("button", { name: /^complete$/i }));
    await waitFor(() => expect(googleComplete).toHaveBeenCalledTimes(1));
    expect(vi.mocked(googleComplete).mock.calls[0][0]).toBe("ya29.google-access-token");
    expect(vi.mocked(googleComplete).mock.calls[0][3]).toBe("DONOR");
    expect(registerNgoWithGoogle).not.toHaveBeenCalled();
  });
});
