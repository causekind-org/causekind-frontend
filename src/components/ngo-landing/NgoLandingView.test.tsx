import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NgoLandingView } from "./NgoLandingView";
import { getMyNgoApplication, getNgoDraft, getNgoOverview } from "@/lib/api";

// What made the approved-NGO tests slow under load, removed at the source:
// - the stat counters animate with a 60 fps setInterval unless reduced motion is on (each tick a React update);
// - both landing variants are lazy chunks, imported during the first test that renders them.
vi.mock("framer-motion", async (orig) => ({ ...(await orig<typeof import("framer-motion")>()), useReducedMotion: () => true }));
beforeAll(async () => {
  await Promise.all([import("./PostApprovalLanding"), import("./PreApprovalLanding")]);
});

const auth = vi.hoisted(() => ({ user: { id: 101, email: "ngo@example.test", role: "NGO_PARTNER" } as Record<string, unknown> | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", () => ({ getMyNgoApplication: vi.fn(), getNgoDraft: vi.fn(), getNgoOverview: vi.fn() }));
const totals = { activeRequests: 3, itemsPledged: 12, dropoffsToConfirm: 1, photosDue: 0, photosDueRequestName: "", verifiedDeliveries: 2, handovers: [] };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  auth.user = { id: 101, email: "ngo@example.test", role: "NGO_PARTNER" };
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
      panNumber: "ABCDE1234F", organizationPhone: "+919876543210", officialEmail: "info@helpinghands.org",
      aboutUs: "We collect school bags and books for children in rural Pune and run weekend reading classes for them.",
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
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Start a Drive/i })[0]).toHaveAttribute("href", "/ngo/drives/new"));
  });
  it("keeps an approved NGO approved when the activity counters fail, showing them as —", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Hope Foundation" } as never);
    vi.mocked(getNgoOverview).mockRejectedValue(new Error("Activity unavailable"));
    render(<NgoLandingView />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Start a Drive/i })[0]).toHaveAttribute("href", "/ngo/drives/new"));
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("asks an NGO with a pending OTP to verify its email, not to wait for review", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "PENDING_VERIFICATION", organizationName: "Hope Foundation" } as never);
    render(<NgoLandingView />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Verify your email/i })[0]).toHaveAttribute("href", "/profile/ngo-details"));
    expect(screen.queryByRole("link", { name: /View application status/i })).not.toBeInTheDocument();
  });
  it("shows a rejection with its reason and no Fix documents action", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "REJECTED", organizationName: "Hope Foundation", rejectionReason: "Registration could not be confirmed." } as never);
    render(<NgoLandingView />);
    expect((await screen.findAllByText(/Registration could not be confirmed\./)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Fix documents/i })).not.toBeInTheDocument();
  });
  it("sends a guest to log in instead of the wizard, without NGO API calls", async () => {
    auth.user = null;
    render(<NgoLandingView />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Log in as an NGO to apply/i })[0]).toHaveAttribute("href", "/login?next=/ngo"));
    expect(getMyNgoApplication).not.toHaveBeenCalled();
  });
  it("shows donors a neutral notice and makes no NGO API calls", async () => {
    auth.user = { id: 7, email: "giver@example.test", role: "DONOR" };
    render(<NgoLandingView />);
    expect(await screen.findByText("This area is for NGO partners.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to home/i })).toHaveAttribute("href", "/");
    expect(getMyNgoApplication).not.toHaveBeenCalled();
    expect(getNgoOverview).not.toHaveBeenCalled();
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
    // FAQ section removed from this landing
    expect(screen.queryByText("Everything you need to know.")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequently asked questions")).not.toBeInTheDocument();
  });
});
