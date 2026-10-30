import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import { NgoProfileView, applicationSteps } from "@/app/profile/ngo-view";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getMyNgoApplication, getNgoDraft } from "@/lib/api";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), redirect: vi.fn() }));
// The approved NGO's About / past-activity sections have their own tests.
vi.mock("@/features/ngo-profile/PastActivity", () => ({ PastActivitySection: () => null }));
vi.mock("@/features/ngo-profile/NgoAboutSection", () => ({ NgoAboutSection: () => null }));
vi.mock("@/lib/api", () => ({
  getProfile: vi.fn(), updateProfile: vi.fn(), updateLocation: vi.fn(), getMyNgoApplication: vi.fn(),
  getNgoDraft: vi.fn(), submitNgoApplication: vi.fn(), saveNgoDraft: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({ countries: [{ value: "IN", label: "India" }], states: [], cities: [], dialCodes: [{ value: "IN", label: "India (+91)", phonecode: "91" }] }),
}));
vi.mock("@/app/actions/locations", () => ({
  resolveLocationFromGPS: vi.fn().mockResolvedValue({}),
  getDialCodes: vi.fn().mockResolvedValue([{ value: "IN", label: "India (+91)", phonecode: "91" }]),
}));

const app = (status: string, extra: Record<string, unknown> = {}) => ({
  applicationId: "CK-NGO-2026-TESTAPP", organizationName: "Smile Foundation", status,
  submittedAt: "2026-09-09T10:00:00", verifiedAt: null, updatedAt: null, rejectionReason: null, needsInformationDetails: null, ...extra,
});

async function renderCard(status: string, extra: Record<string, unknown> = {}) {
  vi.mocked(getMyNgoApplication).mockResolvedValue(app(status, extra) as never);
  render(<NgoProfileView />);
  await waitFor(() => expect(screen.getByText("CK-NGO-2026-TESTAPP")).toBeInTheDocument(), { timeout: 10000 });
  const steps = screen.getByRole("list", { name: "Application steps" });
  const items = within(steps).getAllByTestId("application-step");
  return { steps, items, states: items.map(i => i.getAttribute("data-state")) };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("fetch mock")) }));
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
    isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn(),
  } as never);
  vi.mocked(getProfile).mockResolvedValue({
    id: 101, email: "contact@smilefoundation.org", fullName: "Smile Foundation", organizationName: "Smile Foundation",
    role: "NGO_PARTNER", phone: "+919876543210", city: "Mumbai", latitude: null, longitude: null,
  } as never);
  vi.mocked(getNgoDraft).mockResolvedValue(null);
});

describe("/profile NGO application card", { timeout: 20000 }, () => {
  it("UNDER_REVIEW: 1 done, 2 in progress, 3 waiting; no verification call step", async () => {
    const { steps, items, states } = await renderCard("UNDER_REVIEW");
    expect(states).toEqual(["done", "active", "waiting"]);
    expect(items[0]).toHaveTextContent("1. Application & Documents Logged");
    expect(items[1]).toHaveTextContent("2. Legal Document & Compliance Review");
    expect(items[1]).toHaveTextContent(/In progress/i);
    expect(items[2]).toHaveTextContent("3. Verified NGO Partner Badge & Active Platform Access");
    expect(steps).not.toHaveTextContent(/Representative Verification Call/);
    expect(screen.queryByText(/Representative Verification Call/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Application submitted" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View / Edit Submission Details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download Application Summary \(PDF\)/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Home" })).toBeInTheDocument();
    // 2026-09-09T10:00:00 in IST (treated as UTC -> +5:30 -> 3:30 pm IST)
    expect(screen.getAllByText(/9 Sep 2026, 3:30 pm IST/).length).toBeGreaterThan(0);
  });

  it("NEEDS_INFORMATION: step 2 says Action needed and links to fix the items", async () => {
    const { items, states } = await renderCard("NEEDS_INFORMATION", { needsInformationDetails: "Please correct:\n• Registration number: Does not match" });
    expect(states).toEqual(["done", "action", "waiting"]);
    expect(items[1]).toHaveTextContent("Action needed");
    expect(items[1]).toHaveTextContent("Registration number: Does not match");
    expect(within(items[1]).getByRole("link", { name: /Fix the requested items/ })).toHaveAttribute("href", "/profile/ngo-details");
    expect(screen.getByRole("heading", { name: "Changes requested" })).toBeInTheDocument();
  });

  it("REJECTED: step 2 says Not approved with the reason, step 3 not reached", async () => {
    const { items, states } = await renderCard("REJECTED", { rejectionReason: "Registration could not be verified" });
    expect(states).toEqual(["done", "failed", "unreached"]);
    expect(items[1]).toHaveTextContent("Not approved");
    expect(items[1]).toHaveTextContent("Registration could not be verified");
    expect(items[2]).toHaveTextContent("Not reached");
    expect(screen.getAllByText("Registration could not be verified")).toHaveLength(1);
  });

  it("APPROVED: the whole application status card is hidden", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue(app("APPROVED") as never);
    render(<NgoProfileView />);
    await waitFor(() => expect(getMyNgoApplication).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByRole("heading", { name: "Application approved" })).not.toBeInTheDocument();
    expect(screen.queryByText("CK-NGO-2026-TESTAPP")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download Application Summary \(PDF\)/ })).not.toBeInTheDocument();
  });

  it("re-reads the status from the server: on approval the card goes away without a reload", async () => {
    await renderCard("UNDER_REVIEW");
    vi.mocked(getMyNgoApplication).mockResolvedValue(app("APPROVED") as never);
    act(() => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(screen.queryByText("CK-NGO-2026-TESTAPP")).not.toBeInTheDocument());
  });
});

describe("applicationSteps", () => {
  it("PENDING_VERIFICATION: step 1 in progress asking to verify the email", () => {
    const steps = applicationSteps({ status: "PENDING_VERIFICATION", rejectionReason: null, needsInformationDetails: null });
    expect(steps.map(s => s.state)).toEqual(["active", "waiting", "waiting"]);
    expect(steps[0].body).toMatch(/verify your email/i);
    expect(steps).toHaveLength(3);
  });
});
