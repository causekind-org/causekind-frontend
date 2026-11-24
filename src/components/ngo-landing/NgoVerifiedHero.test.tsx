import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, screen, waitFor } from "@testing-library/react";
import { NgoLandingView } from "./NgoLandingView";
import { getMyNgoApplication, getNgoDraft, getNgoOverview } from "@/lib/api";

// The hero renders a slideshow and motion; on a busy machine a test can pass 5 s.
vi.setConfig({ testTimeout: 30000 });
// The landing chunks load lazily; under full-suite load findBy* needs more than 1 s.
configure({ asyncUtilTimeout: 8000 });

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 101, email: "ngo@example.test", role: "NGO_PARTNER" }, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", () => ({ getMyNgoApplication: vi.fn(), getNgoDraft: vi.fn(), getNgoOverview: vi.fn() }));

// NgoLandingView loads these with React.lazy. Importing them once up front means the
// slow first transform happens here, not inside a findBy* window during the tests.
beforeAll(async () => {
  await Promise.all([import("./PostApprovalLanding"), import("./PreApprovalLanding")]);
}, 60000);

const noActivity ={ activeRequests: 0, itemsPledged: 0, dropoffsToConfirm: 0, photosDue: 0, photosDueRequestName: "", verifiedDeliveries: 0, handovers: [] };

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
    await screen.findByText("Verified by CauseKind");

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

describe("verified toast", () => {
  it("is gone: no \"You can now start drives\" corner card on the approved landing", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Hope Foundation" } as never);
    render(<NgoLandingView />);
    await screen.findAllByText(/verified/i);
    expect(screen.queryByText("You can now start drives.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Close verified welcome notification/i })).toBeNull();
  });
});

describe("mobile hero (full-bleed photo, no collage)", () => {
  it.each([
    ["APPROVED", /Start a Drive/i],
    ["UNDER_REVIEW", /Start a Drive/i],
  ])("status %s: mobile photo + existing content, collage desktop-only", async (status, cta) => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status, organizationName: "Hope Foundation" } as never);
    const { container } = render(<NgoLandingView />);
    await screen.findAllByRole(status === "APPROVED" ? "link" : "button", { name: cta });

    const photo = await screen.findByTestId("ngo-hero-mobile-photo");
    expect(photo.className).toContain("md:hidden");
    expect(photo.querySelector("img")?.getAttribute("src")).toContain("ngo-hero-mobile.webp");
    expect(container.querySelector("#ngo-hero")?.className).toContain("ck-ngo-hero-stage");
    // No green tint on mobile: the mesh and grain layers are hidden; only a bottom dark gradient.
    expect(container.querySelector(".ngo-hero-bg")?.className).toContain("max-md:hidden");
    expect(container.querySelector(".ngo-hero-grain")?.className).toContain("max-md:hidden");
    expect(photo.querySelector("div")?.className).toContain("ck-ngo-hero-shade");
    expect(photo.querySelector("img")?.className).toContain("object-[center_30%]");

    // The collage is hidden below 768px; the desktop cluster is unchanged.
    expect(screen.getByTestId("ngo-hero-mobile-collage").className).toContain("hidden md:block lg:hidden");
    expect(container.querySelector('[class^="hidden lg:block"]')).not.toBeNull();
    if (status === "APPROVED") expect(screen.getByText("Verified by CauseKind")).toBeInTheDocument();
  });
});
