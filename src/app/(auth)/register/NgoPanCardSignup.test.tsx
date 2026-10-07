import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, configure } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";
import { registerNgo, registerNgoWithGoogle, readNgoPanCard, uploadSignupPanCard, ngoPanCheck, type PanCheckResult } from "@/lib/api";

/** NGO signup with the PAN card: field order, reading the card, PAN warnings, required fields, Google path. */

const mockReplace = vi.fn();
const mockRouter = { push: vi.fn(), replace: mockReplace };
let mockSearchParams = new URLSearchParams();


// The NGO form is long; under a parallel run the default 1s wait is too tight.
configure({ asyncUtilTimeout: 8000 });
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => ({ phone: "Phone", password: "Password", enterCity: "Enter city", complete: "complete" } as Record<string, string>)[key] ?? key,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  registerNgo: vi.fn().mockResolvedValue({ token: null, userId: 42, email: "contact@hope.test", role: "NGO_PARTNER" }),
  registerNgoWithGoogle: vi.fn().mockResolvedValue({ token: null, userId: 43, email: "hope@gmail.com", role: "NGO_PARTNER" }),
  initiateRegistration: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  googleAuth: vi.fn(),
  googleComplete: vi.fn(),
  readNgoPanCard: vi.fn(),
  uploadSignupPanCard: vi.fn().mockResolvedValue({}),
  ngoPanCheck: vi.fn(),
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
  URL.createObjectURL = vi.fn(() => "blob:pan-preview");
  URL.revokeObjectURL = vi.fn();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: "IN" }) });
  // GPS refused, so the page falls back to the IP country (as in NgoSignup.test).
  if (navigator.geolocation) {
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((_ok, error) => {
      error?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    });
  }
});

/** Stand-in for the backend helper, so the UI wiring can be tested without a server. */
function fakeCheck({ panNumber, legalStructure, organizationName }: { panNumber: string; legalStructure: string; organizationName: string }): PanCheckResult {
  const warnings: PanCheckResult["warnings"] = [];
  const expected = ({ trust: "T", society: "A", section8: "C" } as Record<string, string>)[legalStructure];
  if (panNumber[3] === "P") warnings.push({ code: "PERSONAL_PAN", severity: "DANGER", field: "panNumber", message: "This is a personal PAN. NGOs must use the organization's PAN." });
  else if (expected && panNumber[3] !== expected) warnings.push({ code: "STRUCTURE_MISMATCH", severity: "WARNING", field: "legalStructure", message: "This PAN is not a Trust PAN. Please check the structure or the PAN." });
  const first = organizationName.replace(/^the\s+/i, "").trim()[0]?.toUpperCase();
  if (first && panNumber[4] !== first) warnings.push({ code: "NAME_LETTER_MISMATCH", severity: "WARNING", field: "panNumber", message: "The PAN doesn't match the organization name's first letter. Please check both." });
  return { warnings } as unknown as PanCheckResult;
}

const card = () => new File(["fake card"], "pan.png", { type: "image/png" });

beforeEach(() => {
  mockSearchParams = new URLSearchParams("role=NGO");
  sessionStorage.clear();
  mockReplace.mockClear();
  vi.mocked(registerNgo).mockClear();
  vi.mocked(registerNgoWithGoogle).mockClear();
  vi.mocked(uploadSignupPanCard).mockClear();
  vi.mocked(readNgoPanCard).mockReset().mockResolvedValue({
    available: true, organizationName: "The Hope Welfare Trust", dateOfFormation: "2011-06-15", panNumber: "AAATH1234K",
  });
  vi.mocked(ngoPanCheck).mockReset().mockImplementation(async (d) => fakeCheck(d));
});

const el = (id: string) => document.getElementById(id) as HTMLInputElement;
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("NGO signup with the PAN card", { timeout: 90000 }, () => {
  it("shows the fields in the exact order", () => {
    render(<RegisterPage />);
    const order = ["legalStructure", "panCard", "fullName", "dateOfFormation", "panNumber", "email", "phone"].map(el);
    order.forEach((e) => expect(e).not.toBeNull());
    for (let i = 1; i < order.length; i++) expect(before(order[i - 1], order[i])).toBe(true);
    const location = screen.getByText("location");
    expect(before(el("phone"), location)).toBe(true);
    expect(before(location, el("website"))).toBe(true);
    expect(before(el("website"), el("password"))).toBe(true);
    expect(screen.getByLabelText(/Legal structure \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Upload your PAN card \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of formation \*/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Section 8 Company" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take a photo/i })).toBeInTheDocument();
  });

  it("fills name, date and PAN from the card with a note, never overwriting what was typed", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(el("panNumber"), "AAATX9999Z");
    await user.upload(el("panCard"), card());
    await waitFor(() => expect(el("fullName").value).toBe("The Hope Welfare Trust"));
    expect(el("dateOfFormation").value).toBe("2011-06-15");
    expect(el("panNumber").value).toBe("AAATX9999Z"); // typed first: kept
    expect(screen.getByTestId("fullName-card-note")).toHaveTextContent("Read from your PAN card, please check");
    expect(screen.getByTestId("dateOfFormation-card-note")).toHaveTextContent("Read from your PAN card, please check");
    expect(screen.queryByTestId("panNumber-card-note")).toBeNull();
    expect(screen.getByAltText("PAN card preview")).toBeInTheDocument();
    // Still editable; the note goes away once the value is changed.
    await user.clear(el("fullName"));
    await user.type(el("fullName"), "Hope Trust");
    expect(screen.queryByTestId("fullName-card-note")).toBeNull();
  });

  it("shows a spinner while reading", async () => {
    let resolve!: (v: Awaited<ReturnType<typeof readNgoPanCard>>) => void;
    vi.mocked(readNgoPanCard).mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.upload(el("panCard"), card());
    expect(screen.getByRole("status")).toHaveTextContent("Reading your PAN card");
    resolve({ available: true });
    await waitFor(() => expect(screen.queryByText(/Reading your PAN card/)).toBeNull());
  });

  it("asks the user to type what could not be read, and manual entry works", async () => {
    vi.mocked(readNgoPanCard).mockResolvedValueOnce({ available: true, organizationName: null, dateOfFormation: null, panNumber: null });
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.upload(el("panCard"), card());
    for (const id of ["fullName-card-note", "dateOfFormation-card-note", "panNumber-card-note"]) {
      expect(await screen.findByTestId(id)).toHaveTextContent("We couldn't read this, please type it.");
    }
    await user.type(el("panNumber"), "AAATH1234K");
    expect(screen.queryByTestId("panNumber-card-note")).toBeNull();
    expect(el("panNumber").value).toBe("AAATH1234K");
  });

  it("a reader failure also falls back to typing", async () => {
    vi.mocked(readNgoPanCard).mockRejectedValueOnce(new Error("You've tried this a few times in a short time."));
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.upload(el("panCard"), card());
    expect(await screen.findByTestId("fullName-card-note")).toHaveTextContent("We couldn't read this, please type it.");
  });

  it("refuses a wrong file type or a file over 10 MB without reading it", async () => {
    render(<RegisterPage />);
    fireEvent.change(el("panCard"), { target: { files: [new File(["x"], "pan.gif", { type: "image/gif" })] } });
    expect(await screen.findByText("Please upload a JPG, PNG or PDF of your PAN card.")).toBeInTheDocument();
    const big = new File(["x"], "pan.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(el("panCard"), { target: { files: [big] } });
    expect(await screen.findByText(/larger than 10 MB/)).toBeInTheDocument();
    expect(readNgoPanCard).not.toHaveBeenCalled();
  });

  it("updates the PAN warnings live when the structure, PAN or name changes", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.selectOptions(el("legalStructure"), "trust");
    await user.type(el("fullName"), "Hope Trust");
    await user.type(el("panNumber"), "ABCPH1234K");
    const personal = await screen.findByTestId("pan-warning-PERSONAL_PAN");
    expect(personal).toHaveAttribute("data-severity", "DANGER");
    expect(personal).toHaveTextContent("This is a personal PAN. NGOs must use the organization's PAN.");

    await user.clear(el("panNumber"));
    await user.type(el("panNumber"), "AAACH1234K");
    expect(await screen.findByTestId("pan-warning-STRUCTURE_MISMATCH")).toHaveTextContent("This PAN is not a Trust PAN");
    expect(screen.queryByTestId("pan-warning-PERSONAL_PAN")).toBeNull();

    await user.selectOptions(el("legalStructure"), "section8");
    await waitFor(() => expect(screen.queryByTestId("pan-warning-STRUCTURE_MISMATCH")).toBeNull());

    await user.clear(el("fullName"));
    await user.type(el("fullName"), "Care Foundation");
    expect(await screen.findByTestId("pan-warning-NAME_LETTER_MISMATCH")).toHaveTextContent("first letter");
    expect(vi.mocked(ngoPanCheck).mock.calls.at(-1)?.[0]).toEqual({ panNumber: "AAACH1234K", legalStructure: "section8", organizationName: "Care Foundation" });
  });

  it("requires the structure and the PAN card", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole("button", { name: /Create NGO Account/i }));
    expect(await screen.findByText("Please choose your organization's legal structure.")).toBeInTheDocument();
    expect(screen.getByText("Please upload your PAN card.")).toBeInTheDocument();
    expect(screen.getByText("Please enter the date of formation.")).toBeInTheDocument();
    expect(document.activeElement?.id).toBe("legalStructure");
    expect(registerNgo).not.toHaveBeenCalled();
  });

  async function fillRest(user: ReturnType<typeof userEvent.setup>, google = false) {
    await user.selectOptions(el("legalStructure"), "trust");
    await user.upload(el("panCard"), card());
    await waitFor(() => expect(el("fullName").value).toBe("The Hope Welfare Trust"));
    await user.clear(el("panNumber"));
    await user.type(el("panNumber"), "AAATH1234L"); // changed after the read: "typed"
    if (!google) await user.type(el("email"), "contact@hope.test");
    await user.type(el("phone"), "9876543210");
    if (!google) await user.type(el("password"), "Password@123");
    const city = await screen.findByPlaceholderText("Enter city");
    fireEvent.change(city, { target: { value: "Pune" } });
    fireEvent.blur(city);
  }

  it("sends the structure, date and value sources, then stores the card for the new account", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillRest(user);
    await user.click(screen.getByRole("button", { name: /Create NGO Account/i }));
    await waitFor(() => expect(registerNgo).toHaveBeenCalledTimes(1));
    expect(vi.mocked(registerNgo).mock.calls[0][0]).toMatchObject({
      organizationName: "The Hope Welfare Trust", panNumber: "AAATH1234L", legalStructure: "trust", dateOfFormation: "2011-06-15",
      organizationNameSource: "card", dateOfFormationSource: "card", panNumberSource: "typed",
      locationText: "Pune, India",
    });
    await waitFor(() => expect(uploadSignupPanCard).toHaveBeenCalledTimes(1));
    expect(vi.mocked(uploadSignupPanCard).mock.calls[0][0].name).toBe("pan.png");
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("Google NGO signup: same new fields, no password, card stored after signup", async () => {
    mockSearchParams = new URLSearchParams("social=google&role=NGO");
    sessionStorage.setItem("ck_google_token", "ya29.token");
    sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: "hope@gmail.com", fullName: "Ananya" }));
    const user = userEvent.setup();
    render(<RegisterPage />);
    expect(el("password")).toBeNull();
    expect(el("email").readOnly).toBe(true);
    expect(before(el("legalStructure"), el("fullName"))).toBe(true);
    await user.click(screen.getByRole("button", { name: /^complete$/i }));
    expect(await screen.findByText("Please upload your PAN card.")).toBeInTheDocument();
    expect(registerNgoWithGoogle).not.toHaveBeenCalled();

    await user.clear(el("fullName")); // Google filled a person's name; the card fills the organization's
    await fillRest(user, true);
    await user.click(screen.getByRole("button", { name: /^complete$/i }));
    await waitFor(() => expect(registerNgoWithGoogle).toHaveBeenCalledTimes(1));
    expect(vi.mocked(registerNgoWithGoogle).mock.calls[0][1]).toMatchObject({ legalStructure: "trust", dateOfFormation: "2011-06-15" });
    await waitFor(() => expect(uploadSignupPanCard).toHaveBeenCalledTimes(1));
  });
});
