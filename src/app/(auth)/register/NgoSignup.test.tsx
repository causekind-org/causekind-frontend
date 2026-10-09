import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";
import { registerNgo, ApiError } from "@/lib/api";

const mockPush = vi.fn();
const mockReplace = vi.fn();

let mockSearchParams = new URLSearchParams();

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
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

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number; data?: unknown;
    constructor(status: number, message: string, data?: unknown) { super(message); this.status = status; this.data = data; }
  },
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
    const ngoButton = screen.getByRole("button", { name: /^NGO/i });
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

  it("automatically selects NGO role and renders NGO form when ?role=NGO is in the URL", () => {
    mockSearchParams = new URLSearchParams("role=NGO");
    render(<RegisterPage />);

    // Verify NGO role is active and NGO-specific fields are rendered immediately
    expect(screen.getByRole("button", { name: /Create NGO Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Official Email Address \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PAN Number \*/i)).toBeInTheDocument();
  });

  it("validates PAN format with inline feedback", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /^NGO/i }));

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

    await user.click(screen.getByRole("button", { name: /^NGO/i }));

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

  async function fillAndSubmit() {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole("button", { name: /^NGO/i }));
    await user.type(screen.getByLabelText(/Organization Name \*/i), "Helping Hands Trust");
    await user.type(screen.getByLabelText(/Official Email Address \*/i), "contact@helpinghands.org");
    await user.type(screen.getByLabelText(/Phone/i), "9876543210");
    await user.type(screen.getByLabelText(/PAN Number \*/i), "AABCT1234C");
    await user.type(screen.getByLabelText(/^Password/i), "Password@123");
    const cityInput = await screen.findByPlaceholderText("Enter city");
    fireEvent.change(cityInput, { target: { value: "Mumbai" } });
    fireEvent.blur(cityInput);
    await user.click(screen.getByRole("button", { name: /Create NGO Account/i }));
  }

  it("shows 'This email is already registered' next to the email field", async () => {
    vi.mocked(registerNgo).mockRejectedValueOnce(new ApiError(400, "Email already registered", {
      message: "Email already registered",
      fieldErrors: [{ field: "officialEmail", code: "ALREADY_REGISTERED", message: "This email is already registered" }],
    }));
    await fillAndSubmit();
    await waitFor(() => expect(document.getElementById("email-feedback")?.textContent).toContain("This email is already registered"), { timeout: 8000 });
    expect(document.getElementById("email")?.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById("phone")?.getAttribute("aria-invalid")).not.toBe("true");
    expect(mockReplace).not.toHaveBeenCalledWith("/");
  }, 15000);

  it("shows 'This phone number is already registered' next to the phone field", async () => {
    vi.mocked(registerNgo).mockRejectedValueOnce(new ApiError(400, "Phone number already registered", {
      message: "Phone number already registered",
      fieldErrors: [{ field: "phoneNumber", code: "ALREADY_REGISTERED", message: "This phone number is already registered" }],
    }));
    await fillAndSubmit();
    await waitFor(() => expect(document.getElementById("phone-feedback")?.textContent).toContain("This phone number is already registered"), { timeout: 8000 });
    expect(document.getElementById("email")?.getAttribute("aria-invalid")).not.toBe("true");
  }, 15000);

  it("shows both messages when both are taken, and keeps what was typed", async () => {
    vi.mocked(registerNgo).mockRejectedValueOnce(new ApiError(400, "Email already registered", {
      fieldErrors: [
        { field: "officialEmail", code: "ALREADY_REGISTERED", message: "This email is already registered" },
        { field: "phoneNumber", code: "ALREADY_REGISTERED", message: "This phone number is already registered" },
      ],
    }));
    await fillAndSubmit();
    await waitFor(() => expect(document.getElementById("phone-feedback")?.textContent).toContain("This phone number is already registered"), { timeout: 8000 });
    expect(document.getElementById("email-feedback")?.textContent).toContain("This email is already registered");
    expect(screen.getByLabelText(/Official Email Address \*/i)).toHaveValue("contact@helpinghands.org");
  }, 15000);

  it("an older message-only response still lands on the email field with the same wording", async () => {
    vi.mocked(registerNgo).mockRejectedValueOnce(new Error("Email already registered"));
    await fillAndSubmit();
    await waitFor(() => expect(document.getElementById("email-feedback")?.textContent).toContain("This email is already registered"), { timeout: 8000 });
  }, 15000);
});
