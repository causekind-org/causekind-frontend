import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NgoLandingView } from "./NgoLandingView";
import { getMyNgoApplication, getNgoDraft, getNgoOverview } from "@/lib/api";

// The hero renders a slideshow and motion; on a busy machine a test can pass 5 s.
vi.setConfig({ testTimeout: 20000 });

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 101, email: "ngo@example.test", role: "NGO_PARTNER" }, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", () => ({ getMyNgoApplication: vi.fn(), getNgoDraft: vi.fn(), getNgoOverview: vi.fn() }));
const totals = { activeRequests: 3, itemsPledged: 12, dropoffsToConfirm: 1, photosDue: 0, photosDueRequestName: "", verifiedDeliveries: 2, handovers: [] };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("ngo-verified-welcome-shown-101", "true");
  vi.mocked(getMyNgoApplication).mockResolvedValue(null);
  vi.mocked(getNgoDraft).mockResolvedValue(null);
  vi.mocked(getNgoOverview).mockResolvedValue(totals);
});
describe("NGO landing with server-backed status", () => {
  it("does not trust a forged locally cached approval", async () => {
    localStorage.setItem("ngo-application-101", JSON.stringify({ status: "APPROVED" }));
    render(<NgoLandingView />);
    await screen.findByRole("link", { name: /Start your application/ });
    expect(screen.queryByText("Verified by CauseKind")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Start a Drive/i })).toBeInTheDocument();
  });
  it("opens the next incomplete section from the server draft", async () => {
    vi.mocked(getNgoDraft).mockResolvedValue({ organizationName: "Helping Hands", legalStructure: "trust", registrationNumber: "REG-1", registeredOfficeAddress: "Pune", yearOfEstablishment: "2005",
      panNumber: "ABCDE1234F", organizationPhone: "+919876543210",
      documents: { pan: { name: "pan.pdf" }, "trust-reg-cert": { name: "cert.pdf" } } } as never);
    render(<NgoLandingView />);
    expect(await screen.findByRole("link", { name: /Continue application/ })).toHaveAttribute("href", "/profile/ngo-details?step=legal-documents");
  });
  it.each([['UNDER_REVIEW', /View application status/i], ['NEEDS_INFORMATION', /Fix documents/i]])("shows the recovery action for %s", async (status, label) => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status, organizationName: "Hope Foundation" } as never);
    render(<NgoLandingView />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: label })[0]).toHaveAttribute("href", "/profile/ngo-details"));
  });
  it("unlocks drive creation only after server approval", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Hope Foundation" } as never);
    render(<NgoLandingView />);
    await screen.findByText("Verified by CauseKind");
    expect(screen.getAllByRole("link", { name: /Start a Drive/i })[0]).toHaveAttribute("href", "/ngo/drives/new");
  });
  it("shows a failed activity read as an error rather than zero activity", async () => {
    vi.mocked(getNgoOverview).mockRejectedValue(new Error("Activity unavailable"));
    render(<NgoLandingView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Activity unavailable");
    expect(screen.queryByText("Verified by CauseKind")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
  it("does not present sample donations or testimonials as live evidence", async () => {
    render(<NgoLandingView />);
    await screen.findByRole("link", { name: /Start your application/ });
    expect(screen.queryByText("Live activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Trusted by Givers and NGOs")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified Impact Score")).not.toBeInTheDocument();
    // The handover-record and verification cards were removed from the landing page.
    expect(screen.queryByText("Keep a clear record of each handover")).not.toBeInTheDocument();
    expect(screen.queryByText(/Your organization.s verification/)).not.toBeInTheDocument();
  });
});
