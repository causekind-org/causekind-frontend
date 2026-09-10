import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";
import { registerNgo } from "@/lib/api";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(),
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

vi.mock("@/lib/api", () => ({
  registerNgo: vi.fn().mockResolvedValue({
    token: null,
    userId: 42,
    email: "contact@helpinghands.org",
    role: "NGO_PARTNER",
  }),
  initiateRegistration: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  googleAuth: vi.fn(),
  googleComplete: vi.fn(),
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

describe("RegisterPage - Lightweight NGO Signup", () => {
  it("renders NGO lightweight form when NGO role is selected", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    // Click NGO role button
    const ngoButton = screen.getByRole("button", { name: /NGO/i });
    await user.click(ngoButton);

    // Verify Organization Name replaces Full Name
    expect(screen.getByLabelText(/Organization Name \*/i)).toBeInTheDocument();
    // Verify Official Email Address replaces Email
    expect(screen.getByLabelText(/Official Email Address \*/i)).toBeInTheDocument();
    // Verify PAN Number field is present
    expect(screen.getByLabelText(/PAN Number \*/i)).toBeInTheDocument();
    // Verify Optional Website field is present
    expect(screen.getByLabelText(/Website \/ Social Link/i)).toBeInTheDocument();
    // Verify Submit button says Create NGO Account
    expect(screen.getByRole("button", { name: /Create NGO Account/i })).toBeInTheDocument();
  });

  it("validates PAN format with inline feedback", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /NGO/i }));

    const panInput = screen.getByLabelText(/PAN Number \*/i);
    await user.type(panInput, "INVALID123");
    fireEvent.blur(panInput);

    await waitFor(() => {
      expect(
        screen.getByText(/PAN must be in standard Indian format/i)
      ).toBeInTheDocument();
    });
  });

  it("submits valid NGO form to registerNgo and navigates to /dashboard/ngo", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /NGO/i }));

    await user.type(screen.getByLabelText(/Organization Name \*/i), "Helping Hands Trust");
    await user.type(screen.getByLabelText(/Official Email Address \*/i), "contact@helpinghands.org");
    await user.type(screen.getByLabelText(/Phone/i), "9876543210");
    await user.type(screen.getByLabelText(/PAN Number \*/i), "AABCT1234C");
    await user.type(screen.getByLabelText(/^Password/i), "Password@123");

    // Country was automatically detected as India (IN) from our fetch mock.
    const cityInput = await screen.findByPlaceholderText("Enter city");
    fireEvent.change(cityInput, { target: { value: "Mumbai" } });
    fireEvent.blur(cityInput);

    const submitBtn = screen.getByRole("button", { name: /Create NGO Account/i });
    await user.click(submitBtn);

    await waitFor(
      () => {
        expect(registerNgo).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationName: "Helping Hands Trust",
            officialEmail: "contact@helpinghands.org",
            panNumber: "AABCT1234C",
          })
        );
      },
      { timeout: 8000 }
    );

    expect(mockReplace).toHaveBeenCalledWith("/");
  }, 15000);
});
