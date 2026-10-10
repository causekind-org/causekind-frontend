import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NgoLandingView } from "./NgoLandingView";
import { getMyNgoApplication, getNgoDraft, getNgoOverview } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 101, email: "ngo@example.test", role: "NGO_PARTNER" }, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", () => ({ getMyNgoApplication: vi.fn(), getNgoDraft: vi.fn(), getNgoOverview: vi.fn() }));

const noActivity = { activeRequests: 0, itemsPledged: 0, dropoffsToConfirm: 0, photosDue: 0, photosDueRequestName: "", verifiedDeliveries: 0, handovers: [] };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("ngo-verified-welcome-shown-101", "true");
  vi.mocked(getNgoDraft).mockResolvedValue(null);
  vi.mocked(getNgoOverview).mockResolvedValue(noActivity);
});

describe("verified NGO hero (points 4 and 6)", () => {
  it("keeps only the green Start a Drive button: no View my application, no Or start a drive, no sample card", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Hope Foundation" } as never);
    render(<NgoLandingView />);
    await screen.findByText("✓ Verified by CauseKind");

    const start = screen.getAllByRole("link", { name: /Start a Drive/i })[0];
    expect(start).toHaveAttribute("href", "/ngo/drives/new");
    expect(start.className).toContain("bg-ngo-700");
    expect(screen.queryByRole("link", { name: /View my application/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Or start a drive/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your drives will look like this/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Sample$/i)).not.toBeInTheDocument();
  });

  it.each(["UNDER_REVIEW", "NEEDS_INFORMATION", null])("has no sample card for status %s either", async (status) => {
    vi.mocked(getMyNgoApplication).mockResolvedValue(status ? ({ status, organizationName: "Hope Foundation" } as never) : null);
    render(<NgoLandingView />);
    await waitFor(() => expect(getMyNgoApplication).toHaveBeenCalled());
    await screen.findAllByRole("button", { name: /Start a Drive/i });
    expect(screen.queryByText(/Your drives will look like this/i)).not.toBeInTheDocument();
  });

  it("still shows the NGO's own live drive card when it has one", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Hope Foundation" } as never);
    vi.mocked(getNgoOverview).mockResolvedValue({ ...noActivity, activeRequests: 1, itemsPledged: 4 });
    render(<NgoLandingView />);
    expect(await screen.findByText("Live Drive")).toBeInTheDocument();
    expect(screen.queryByText(/Your drives will look like this/i)).not.toBeInTheDocument();
  });
});

describe("verified notification card (point 7)", () => {
  it("is short: title with the tick on one line and one line of body", async () => {
    localStorage.removeItem("ngo-verified-welcome-shown-101");
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Hope Foundation" } as never);
    render(<NgoLandingView />);

    const title = await screen.findByText("You're verified");
    const line = title.parentElement!;
    expect(line.querySelector("svg")).not.toBeNull(); // tick sits inside the title line
    expect(line.className).toContain("flex");
    expect(line.className).toContain("items-center");
    const card = line.closest('[role="status"]')!;
    expect(card).toHaveTextContent("You're verified");
    expect(card).toHaveTextContent("You can now start drives.");
    expect(card.textContent).not.toMatch(/Partner status verified|10 km|certificates/);
    expect(screen.getByRole("button", { name: /Close verified welcome notification/i })).toBeInTheDocument();
  });
});
