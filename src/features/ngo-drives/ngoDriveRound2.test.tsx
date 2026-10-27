import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * NGO drives, round 2: drop-off without a map, several offers per donor, the removed
 * "giving safely" checklist, "Past work" (approved only), and the donor count on the card.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isLoading: false }) }));
vi.mock("@/features/handover/HandoverLocationField", () => ({
  HandoverLocationField: () => <div data-testid="handover-map">map</div>,
}));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getNgoDrive: vi.fn(() => new Promise(() => {})),
}));

import { HandoverScheduleDialog, driveSlotProblem } from "@/features/handover/HandoverScheduleDialog";
import { adaptNgoOffer } from "@/features/handover/adapters";
import { giveState } from "./driveGiveState";
import { PastWorkSection } from "./components/PastWorkSection";
import { NgoDriveCard } from "./components/NgoDriveCard";
import type { NgoDriveOfferResponse, PublicNgoDrive } from "@/lib/api";

const acceptedOffer = (over: Partial<NgoDriveOfferResponse> = {}) => ({
  id: 11, driveId: 5, donorDisplayName: "Asha", status: "NGO_ACCEPTED", quantity: 4, driveTitle: "Winter blankets",
  ngoName: "Hope Trust", driveQuantityNeeded: 50, driveQuantityReceived: 0, driveQuantityPledged: 4,
  driveLocationArea: "Shivajinagar", driveLocationCity: "Pune",
  driveAvailableDays: ["MON", "WED"], driveAvailableFrom: "10:00", driveAvailableTo: "17:00",
  handoverDetails: { organizationName: "Hope Trust", registeredOfficeAddress: "12 FC Road, Pune", contactName: "Prachi", contactPhone: "9999999999" },
  ...over,
}) as NgoDriveOfferResponse;

describe("handover schedule: drop-off has no map", () => {
  const vmFor = (o: NgoDriveOfferResponse) => adaptNgoOffer(o, null, "donor@x.test", "DONOR")!;

  it("drop-off shows the NGO address, contact and hours, and no map or pin picker", () => {
    render(<HandoverScheduleDialog vm={vmFor(acceptedOffer({ dropOffOnly: true }))} open onOpenChange={vi.fn()} onSubmit={vi.fn()} isReschedule={false} />);
    const box = screen.getByTestId("drive-dropoff-details");
    // Old drive (no full drop-off address): locality + city + PIN.
    expect(box).toHaveTextContent("Shivajinagar, Pune");
    expect(box).toHaveTextContent("Prachi, 9999999999");
    expect(box).toHaveTextContent("on Mon, Wed between 10:00 and 17:00");
    expect(screen.queryByTestId("handover-map")).toBeNull();
  });

  it("the slot rule is IST, whatever the browser's zone", () => {
    const d = { availableDays: ["MON", "WED"], availableFrom: "10:00", availableTo: "17:00" };
    // 2030-01-07 is a Monday; 'now' is 2030-01-07 04:00 UTC = 09:30 IST.
    const now = new Date(Date.UTC(2030, 0, 7, 4, 0));
    expect(driveSlotProblem(d, "2030-01-07T09:15", now)).toBe("Pick a date and time in the future.");
    expect(driveSlotProblem(d, "2030-01-07T10:30", now)).toBeNull();
    expect(driveSlotProblem(d, "2030-01-08T10:30", now)).toBe("The NGO receives items on Mon, Wed only.");
  });
});

describe("several offers on one drive", () => {
  const drive = { id: 5, status: "LIVE", quantityNeeded: 50, quantityReceived: 0, quantityPledged: 14 } as PublicNgoDrive;
  const donor = { role: "DONOR" };

  it("offering once never blocks: all offers are listed and Give again starts a new one", () => {
    const offers = [acceptedOffer({ id: 11, quantity: 4 }), acceptedOffer({ id: 12, quantity: 10, status: "PENDING_NGO_REVIEW" })];
    const s = giveState(drive, donor, offers);
    expect(s.kind).toBe("offered");
    if (s.kind !== "offered") return;
    expect(s.offers.map((o) => o.id)).toEqual([12, 11]);
    expect(s.total).toBe(14);
    expect(s.giveAgainHref).toBe("/drives/5/give?new=1");
  });

  it("a full drive lists the offers but has no Give again", () => {
    const s = giveState({ ...drive, quantityPledged: 50 }, donor, [acceptedOffer()]);
    expect(s.kind === "offered" && s.giveAgainHref).toBeNull();
  });
});

describe("the giving-safely checklist is gone", () => {
  const root = resolve(__dirname, "../../..");
  it("no page, no links, a redirect to the FAQ", () => {
    expect(existsSync(resolve(root, "src/app/give-safely"))).toBe(false);
    for (const f of ["src/components/Footer.tsx", "src/app/sitemap.ts", "src/features/ngo-drives/components/DriveDetailView.tsx"]) {
      expect(readFileSync(resolve(root, f), "utf8")).not.toContain("/give-safely");
    }
    expect(readFileSync(resolve(root, "messages/en.json"), "utf8")).not.toContain("\"giveSafely\"");
    expect(readFileSync(resolve(root, "next.config.ts"), "utf8")).toMatch(/source: "\/give-safely", destination: "\/faq"/);
  });
});

describe("Past work by the NGO", () => {
  const acts = [
    { id: 1, title: "Old meal drive", activityDate: "2025-01-01", status: "APPROVED", summary: "Fed 100 people", media: [{ mediaType: "IMAGE", url: "https://x.test/a.png" }, { mediaType: "IMAGE", url: "https://x.test/b.png" }] },
    { id: 2, title: "Pending draft", activityDate: "2026-09-01", status: "PENDING" },
    { id: 3, title: "Rejected one", activityDate: "2026-08-01", status: "REJECTED" },
    { id: 4, title: "Newest blanket drive", activityDate: "2026-10-01", status: "APPROVED", description: "x".repeat(300) },
    { id: 5, title: "Winter clothes", activityDate: "2026-02-01" },
    { id: 6, title: "School kits", activityDate: "2025-06-01", status: "LIVE" },
  ];

  it("shows approved only, newest first, 3 latest and See all", () => {
    render(<PastWorkSection ngoName="Hope Trust" activities={acts} limit={3} seeAllHref="/ngos/hope-trust" />);
    expect(screen.getByRole("heading", { name: "Past work by Hope Trust" })).toBeInTheDocument();
    const titles = screen.getAllByTestId("past-work-item").map((li) => li.querySelector("h3")?.textContent);
    expect(titles).toEqual(["Newest blanket drive", "Winter clothes", "School kits"]);
    expect(screen.queryByText("Pending draft")).toBeNull();
    expect(screen.queryByText("Rejected one")).toBeNull();
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/ngos/hope-trust");
    fireEvent.click(screen.getAllByRole("button", { name: "Read more" })[0]);
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("photo gallery shows +N and opens a lightbox", () => {
    render(<PastWorkSection ngoName="Hope Trust" activities={[acts[0]]} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View photos of Old meal drive" }));
    expect(screen.getByTestId("past-work-lightbox")).toBeInTheDocument();
  });

  it("hidden when there is nothing approved", () => {
    const { container } = render(<PastWorkSection ngoName="Hope Trust" activities={[acts[1], acts[2]]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("drive card", () => {
  const base = {
    id: 9, title: "Winter blankets", category: "Clothing", itemName: "Blankets", quantityNeeded: 50, quantityReceived: 20,
    quantityPledged: 0, unit: "PIECES", status: "LIVE", ngoOrganizationName: "Hope Trust", verified: true, neededBy: "2099-01-01",
    locationArea: "Kothrud", locationCity: "Pune",
  } as unknown as PublicNgoDrive;

  it("plain labels and the distinct donor count", () => {
    render(<NgoDriveCard drive={{ ...base, donorCount: 7 }} />);
    expect(screen.getByTestId("drive-ngo-name")).toHaveTextContent("Hope Trust");
    expect(screen.getByLabelText("Verified NGO")).toBeInTheDocument();
    const nums = screen.getByTestId("drive-card-numbers");
    expect(nums).toHaveTextContent("Needed50 pieces");
    expect(nums).toHaveTextContent("Received20");
    expect(nums).toHaveTextContent("Still needed30");
    expect(screen.getByTestId("drive-donor-count")).toHaveTextContent("Donors so far: 7");
    expect(screen.getByTestId("drive-needed-by")).toHaveTextContent(/Needed by .* days left/);
  });

  it("uses the cover photo when the server sends one, else the category icon (never another fallback)", () => {
    const { container, rerender } = render(<NgoDriveCard drive={{ ...base, coverPhotoUrl: null, referencePhotoUrl: "https://x.test/flowchart.png" }} />);
    expect(container.querySelector("img")).toBeNull();
    rerender(<NgoDriveCard drive={{ ...base, coverPhotoUrl: "https://x.test/cover.jpg" }} />);
    expect(container.querySelector("img")?.getAttribute("src")).toContain("cover.jpg");
  });
});
