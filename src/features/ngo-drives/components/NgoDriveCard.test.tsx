import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NgoDriveCard } from "./NgoDriveCard";
import type { PublicNgoDrive, NgoDriveOfferResponse } from "@/lib/api";

let mockUser: { role: string; id: number } | null = null;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, isLoading: false }),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

const TEST_DRIVE: PublicNgoDrive = {
  id: 42,
  title: "Warm Blankets for Winter",
  tagline: "Help 200 families stay warm this winter",
  category: "Clothing",
  urgency: "HIGH",
  status: "LIVE",
  quantityNeeded: 200,
  quantityReceived: 50,
  quantityPledged: 20,
  unit: "BLANKETS",
  itemName: "Woolen Blankets",
  beneficiaryCount: 200,
  beneficiaryGroup: "Families",
  ngoOrganizationName: "Goonj Community Support",
  ngoCity: "Delhi",
  locationArea: "Kashmere Gate",
  locationCity: "Delhi",
  referencePhotoUrl: null,
  driveType: "ITEMS",
  donorCount: 15,
  neededBy: new Date(Date.now() + 5 * 86400000).toISOString(),
};

describe("NgoDriveCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  it("links the default card button to /drives/{id} with label 'View drive & give' (guest)", () => {
    mockUser = null; // Guest
    render(<NgoDriveCard drive={TEST_DRIVE} />);

    const cta = screen.getByTestId("drive-cta-button");
    expect(cta).toHaveTextContent("View drive & give");
    expect(cta).toHaveAttribute("href", "/drives/42");

    // Has only one link target on the card
    const allLinks = screen.getAllByRole("link");
    expect(allLinks).toHaveLength(1);
    expect(allLinks[0]).toHaveAttribute("href", "/drives/42");
  });

  it("links the default card button to /drives/{id} with label 'View drive & give' (logged-in donor with no offer)", () => {
    mockUser = { role: "ROLE_DONOR", id: 101 };
    render(<NgoDriveCard drive={TEST_DRIVE} offers={[]} />);

    const cta = screen.getByTestId("drive-cta-button");
    expect(cta).toHaveTextContent("View drive & give");
    expect(cta).toHaveAttribute("href", "/drives/42");

    // Only one link target on the card for default state
    const allLinks = screen.getAllByRole("link");
    expect(allLinks).toHaveLength(1);
    expect(allLinks[0]).toHaveAttribute("href", "/drives/42");
  });

  it("links 'Continue offer' to the give flow (/drives/{id}/give) when donor has an editable offer", () => {
    mockUser = { role: "ROLE_DONOR", id: 101 };
    const editableOffers: NgoDriveOfferResponse[] = [
      {
        id: 99,
        driveId: 42,
        driveTitle: "Warm Blankets for Winter",
        donorDisplayName: "Test Donor",
        ngoName: "Goonj Community Support",
        driveQuantityNeeded: 200,
        driveQuantityReceived: 50,
        driveQuantityPledged: 20,
        status: "DRAFT",
        quantity: 10,
        condition: "GENTLY_USED",
      },
    ];

    render(<NgoDriveCard drive={TEST_DRIVE} offers={editableOffers} />);

    const cta = screen.getByTestId("drive-cta-button");
    expect(cta).toHaveTextContent("Continue offer");
    expect(cta).toHaveAttribute("href", "/drives/42/give");

    // Whole card background still links to /drives/42
    const backgroundLink = screen.getByRole("link", { name: `View drive: ${TEST_DRIVE.title}` });
    expect(backgroundLink).toHaveAttribute("href", "/drives/42");
  });

  it("links 'View your offer' to handover page when donor has an accepted offer", () => {
    mockUser = { role: "ROLE_DONOR", id: 101 };
    const acceptedOffers: NgoDriveOfferResponse[] = [
      {
        id: 88,
        driveId: 42,
        driveTitle: "Warm Blankets for Winter",
        donorDisplayName: "Test Donor",
        ngoName: "Goonj Community Support",
        driveQuantityNeeded: 200,
        driveQuantityReceived: 50,
        driveQuantityPledged: 20,
        status: "NGO_ACCEPTED",
        quantity: 10,
        condition: "NEW",
      },
    ];

    render(<NgoDriveCard drive={TEST_DRIVE} offers={acceptedOffers} />);

    const cta = screen.getByTestId("drive-cta-button");
    expect(cta).toHaveTextContent("View your offer");
    expect(cta).toHaveAttribute("href", "/ngo-drive-offers/88/handover");

    // Whole card background still links to /drives/42
    const backgroundLink = screen.getByRole("link", { name: `View drive: ${TEST_DRIVE.title}` });
    expect(backgroundLink).toHaveAttribute("href", "/drives/42");
  });

  it("disables the button with 'Fully offered' when the drive is fully pledged", () => {
    mockUser = { role: "ROLE_DONOR", id: 101 };
    const fullyOfferedDrive: PublicNgoDrive = {
      ...TEST_DRIVE,
      status: "FULLY_PLEDGED",
      quantityReceived: 100,
      quantityPledged: 100,
    };

    render(<NgoDriveCard drive={fullyOfferedDrive} offers={[]} />);

    const cta = screen.getByTestId("drive-cta-button");
    expect(cta).toBeDisabled();
    expect(cta).toHaveTextContent("Fully offered");

    // Card background still links to detail page
    const backgroundLink = screen.getByRole("link", { name: `View drive: ${fullyOfferedDrive.title}` });
    expect(backgroundLink).toHaveAttribute("href", "/drives/42");
  });

  it("shows 'View drive' linking to /drives/{id} for NGO or DONEE accounts", () => {
    mockUser = { role: "ROLE_NGO", id: 201 };
    render(<NgoDriveCard drive={TEST_DRIVE} offers={[]} />);

    const cta = screen.getByTestId("drive-cta-button");
    expect(cta).toHaveTextContent("View drive");
    expect(cta).toHaveAttribute("href", "/drives/42");

    const allLinks = screen.getAllByRole("link");
    expect(allLinks).toHaveLength(1);
    expect(allLinks[0]).toHaveAttribute("href", "/drives/42");
  });
});
