import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "./page";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      location: "Location",
      password: "Password",
      submit: "Submit",
      creating: "Creating...",
      joinTitle: "Join CauseKind",
      createSubtitle: "Sign up to start giving or receiving",
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
});

describe("RegisterPage - Role Visibility (NGO option hidden)", () => {
  it("shows only Donor and Donee role options and hides NGO option from UI", () => {
    mockSearchParams = new URLSearchParams();
    render(<RegisterPage />);

    // Donor button should be visible
    expect(screen.getByRole("button", { name: /Donor/i })).toBeInTheDocument();

    // Donee button should be visible
    expect(screen.getByRole("button", { name: /Donee/i })).toBeInTheDocument();

    // NGO button should NOT be rendered in the UI
    expect(screen.queryByRole("button", { name: /NGO/i })).not.toBeInTheDocument();

    // NGO specific form elements should not be visible
    expect(screen.queryByLabelText(/PAN Number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Organization Name/i)).not.toBeInTheDocument();
  });

  it("falls back to Donor when ?role=NGO is supplied in URL while NGO registration is disabled", () => {
    mockSearchParams = new URLSearchParams("role=NGO");
    render(<RegisterPage />);

    // NGO button should still NOT be rendered
    expect(screen.queryByRole("button", { name: /NGO/i })).not.toBeInTheDocument();

    // The heading and labels should be for normal user registration (Donor), not NGO
    expect(screen.getByText(/Join CauseKind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/PAN Number/i)).not.toBeInTheDocument();
  });
});
