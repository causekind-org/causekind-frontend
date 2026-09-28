import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("radio", { name: /Donor account/i })).toBeInTheDocument();

    // Donee button should be visible
    expect(screen.getByRole("radio", { name: /Donee account/i })).toBeInTheDocument();

    // NGO button should NOT be rendered in the UI
    expect(screen.queryByRole("radio", { name: /NGO/i })).not.toBeInTheDocument();

    // NGO specific form elements should not be visible
    expect(screen.queryByLabelText(/PAN Number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Organization Name/i)).not.toBeInTheDocument();
  });

  it("falls back to Donor when ?role=NGO is supplied in URL while NGO registration is disabled", () => {
    mockSearchParams = new URLSearchParams("role=NGO");
    render(<RegisterPage />);

    // NGO button should still NOT be rendered
    expect(screen.queryByRole("radio", { name: /NGO/i })).not.toBeInTheDocument();

    // Falls back to Donor, and the details step is ordinary registration, not NGO.
    expect(screen.getByRole("radio", { name: /Donor account/i })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /continue to your details/i }));
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/PAN Number/i)).not.toBeInTheDocument();
  });
});

describe("RegisterPage - Kindness journey steps", () => {
  it("asks only for the role first, then shows details on Continue", () => {
    mockSearchParams = new URLSearchParams();
    render(<RegisterPage />);

    expect(screen.queryByLabelText(/Full name/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Your part/).closest("li")).toHaveAttribute("aria-current", "step");

    fireEvent.click(screen.getByRole("button", { name: /continue to your details/i }));
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByText(/Your details/).closest("li")).toHaveAttribute("aria-current", "step");
  });

  it("keeps entered values and the chosen role across Back and Continue", () => {
    mockSearchParams = new URLSearchParams();
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole("radio", { name: /Donee account/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue to your details/i }));
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: "Asha Rao" } });

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("radio", { name: /Donee account/i })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /continue to your details/i }));
    expect(screen.getByLabelText(/Full name/i)).toHaveValue("Asha Rao");
  });

  it("preselects the role from ?role=DONEE", () => {
    mockSearchParams = new URLSearchParams("role=DONEE");
    render(<RegisterPage />);
    expect(screen.getByRole("radio", { name: /Donee account/i })).toBeChecked();
  });

  it("keeps ?next on the log-in link", () => {
    mockSearchParams = new URLSearchParams("next=/requests/5/offer");
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login?next=%2Frequests%2F5%2Foffer",
    );
  });

  it("never asks for location before the GPS button is pressed", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    mockSearchParams = new URLSearchParams();
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole("button", { name: /continue to your details/i }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
