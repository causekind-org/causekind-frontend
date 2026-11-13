import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NgoSuccessStories } from "./NgoSuccessStories";
import { NgoWelcomeView } from "./NgoWelcomeView";
import { PreApprovalLanding } from "./PreApprovalLanding";
import { useNgoStatus } from "./useNgoStatus";

vi.mock("framer-motion", async (orig) => ({ ...(await orig<typeof import("framer-motion")>()), useReducedMotion: () => true }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("./useNgoStatus", async (orig) => ({ ...(await orig<typeof import("./useNgoStatus")>()), useNgoStatus: vi.fn() }));

const base = { isLoading: false, ngoName: "Hope Foundation", wizardHref: "/profile/ngo-details?step=2", status: "incomplete" };
beforeEach(() => vi.mocked(useNgoStatus).mockReturnValue(base as never));

describe("NGO welcome popup", () => {
  it("unverified NGO: org name, NGO points and Complete your verification", () => {
    render(<NgoWelcomeView exiting={false} dismiss={() => {}} />);
    expect(screen.getByRole("heading", { name: "Welcome to CauseKind, Hope Foundation" })).toBeInTheDocument();
    expect(screen.getByText("Start drives for what you need")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete your verification" })).toHaveAttribute("href", "/profile/ngo-details?step=2");
    expect(screen.queryByText(/Start Giving/)).toBeNull();
  });

  it("approved NGO: Start your first drive", () => {
    vi.mocked(useNgoStatus).mockReturnValue({ ...base, status: "verified" } as never);
    render(<NgoWelcomeView exiting={false} dismiss={() => {}} />);
    expect(screen.getByRole("link", { name: "Start your first drive" })).toHaveAttribute("href", "/ngo/drives/new");
  });
});

describe("NGO success stories", () => {
  it("shows only approved-proof stories with photo, facts and the proof note", () => {
    render(<NgoSuccessStories stories={[
      { id: 1, title: "Winter blankets", photoUrls: ["https://s3.example/a.jpg?sig=1", "https://s3.example/b.jpg"], peopleReached: 40, quantityDistributed: 35,
        distributedOn: "2026-10-12", location: "Pune", note: "Handed out at the village hall.", unit: "BLANKETS" },
      { id: 2, title: "No photos", photoUrls: [] },
    ]} />);
    const cards = screen.getAllByTestId("ngo-success-story");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("Winter blankets");
    expect(cards[0]).toHaveTextContent("40 people reached");
    expect(cards[0]).toHaveTextContent("35 blankets distributed");
    expect(cards[0]).toHaveTextContent("12 Oct 2026");
    expect(cards[0]).toHaveAttribute("href", "/drives/1/proof");
    expect(cards[0]).toHaveTextContent("Pune");
    expect(cards[0]).toHaveTextContent("Handed out at the village hall.");
    expect(screen.getByRole("img", { name: "Distribution proof for Winter blankets" })).toHaveAttribute("src", "https://s3.example/a.jpg?sig=1");
  });

  it("with none, the section stays with the calm All caught up card, never sample stories", () => {
    render(<NgoSuccessStories stories={[]} />);
    expect(screen.getByTestId("ngo-success-stories-empty")).toHaveTextContent("All caught up: no stories of help delivered yet");
    expect(screen.getByText("Stories appear here once your drive proof is approved.")).toBeInTheDocument();
    expect(screen.queryByTestId("ngo-success-story")).toBeNull();
  });

  it("shows at most 6, newest first as sent, in a carousel when more than 3", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, title: `Drive ${i + 1}`, photoUrls: [`https://s3.example/${i}.jpg`] }));
    render(<NgoSuccessStories stories={many} />);
    const cards = screen.getAllByTestId("ngo-success-story");
    expect(cards).toHaveLength(6);
    expect(cards[0]).toHaveTextContent("Drive 1");
    expect(screen.getByTestId("ngo-success-carousel")).toBeInTheDocument();
  });

  it("the approved landing renders the real stories, with no hardcoded sample titles", () => {
    const src = readFileSync(resolve(__dirname, "PostApprovalLanding.tsx"), "utf8");
    expect(src).toContain("<NgoSuccessStories stories={overview?.successStories} />");
    for (const t of ["Stationery Donation Drive", "Community Food Kits", "Old Age Home Visit", "ngo-stories/"]) expect(src).not.toContain(t);
  });
});

describe("Unverified landing", () => {
  it("has no Review the checklist button and shows the five steps", async () => {
    render(<PreApprovalLanding status={{ ...base, status: "incomplete", overview: null, stepNumber: 0, totalSteps: 6 } as never} />);
    await waitFor(() => expect(screen.getAllByTestId("ngo-step")).toHaveLength(5));
    expect(screen.queryByText("Review the checklist")).toBeNull();
    expect(screen.getByText("Complete registration")).toBeInTheDocument();
  });
});
