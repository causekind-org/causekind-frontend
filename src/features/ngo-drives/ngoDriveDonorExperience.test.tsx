import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import type { PublicNgoDrive } from "@/lib/api";
import { DriveDetailView } from "./components/DriveDetailView";
import { claimCelebration } from "@/lib/celebration";
import HandoverCelebration from "@/components/handover/HandoverCelebration";

// ── Mock navigation, auth, api, etc. ─────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (k: string) => k,
}));

vi.mock("@/lib/toast", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => "t"),
    dismiss: vi.fn(),
  }),
}));

const mockApi = vi.hoisted(() => ({
  submitHandoverFeedback: vi.fn().mockResolvedValue({ id: 1 }),
  initiatePlatformTip: vi.fn(),
  getNgoDrive: vi.fn(),
  updateNgoDriveOfferItem: vi.fn(),
  submitNgoDriveOffer: vi.fn(),
  uploadNgoDriveOfferMedia: vi.fn(),
  deleteNgoDriveOfferMedia: vi.fn(),
}));

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  ...mockApi,
}));

const mockUser = vi.hoisted(() => ({ current: null as { email: string; role: string } | null }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser.current, isLoading: false }),
}));

const baseDrive: PublicNgoDrive = {
  id: 1,
  title: "Winter Blankets for Families",
  tagline: "Help 50 families stay warm this winter",
  category: "Bedding",
  itemName: "Blankets",
  quantityNeeded: 50,
  unit: "PIECES",
  condition: "NEW_OR_GENTLY_USED",
  conditionRule: "Accepts: New or Gently Used",
  details: "Warm double or single blankets",
  description: "Distributing warm blankets to rural families in winter.",
  urgency: "HIGH",
  beneficiaryGroup: "Families",
  beneficiaryCount: 50,
  neededBy: "2026-11-01",
  availableDays: ["MON", "WED", "FRI"],
  availableFrom: "10:00",
  availableTo: "16:00",
  quantityPledged: 0,
  quantityReceived: 10,
  stillNeeded: 40,
  status: "APPROVED",
  ngoOrganizationName: "Helping Hands Trust",
  ngoCity: "Pune",
  verified: true,
  donorCount: 4,
};

describe("1. Redesigned Progress Card States (DriveDetailView)", () => {
  it("renders partial progress state with ring visual, headline, stat tiles, deadline, and enabled CTA", () => {
    render(
      <DriveDetailView
        drive={baseDrive}
        mode="live"
        giveStateResult={{ kind: "give", href: "/drives/1/give" }}
      />
    );

    // Headline numbers and status line
    expect(screen.getByText(/of 50 Pieces offered/i)).toBeInTheDocument();
    expect(screen.getByText("40 still needed")).toBeInTheDocument();

    // Segmented progressbar with aria attributes
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "10");
    expect(progressbar).toHaveAttribute("aria-valuemax", "50");

    // Three stat tiles: Received, On way, Needed
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("On way")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Needed")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();

    // Urgency chip when High or Critical
    expect(screen.getByText(/HIGH PRIORITY/i)).toBeInTheDocument();

    // Donor count with heart
    expect(screen.getByText(/4 donors have backed this drive/i)).toBeInTheDocument();

    // Prominent CTA button and Share button
    const cta = screen.getByRole("link", { name: /Give to this drive/i });
    expect(cta).toHaveAttribute("href", "/drives/1/give");
    expect(screen.getAllByRole("button", { name: "Share this" }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders fully offered state with 100% progress and disabled CTA", () => {
    const fullyOfferedDrive: PublicNgoDrive = {
      ...baseDrive,
      quantityReceived: 30,
      quantityPledged: 20,
      stillNeeded: 0,
    };

    render(
      <DriveDetailView
        drive={fullyOfferedDrive}
        mode="live"
        giveStateResult={{
          kind: "closed",
          reason: "This drive has reached its goal and is not accepting more offers.",
        }}
      />
    );

    expect(screen.getByText(/of 50 Pieces offered/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Fully offered/i).length).toBeGreaterThanOrEqual(1);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");

    expect(screen.getByText(/This drive has reached its goal and is not accepting more offers/i)).toBeInTheDocument();
  });

  it("renders closed drive state with disabled CTA and closed message", () => {
    const closedDrive: PublicNgoDrive = {
      ...baseDrive,
      status: "COMPLETED",
    };

    render(
      <DriveDetailView
        drive={closedDrive}
        mode="live"
        giveStateResult={{
          kind: "closed",
          reason: "This drive has ended and is not accepting more offers.",
        }}
      />
    );

    const closedBtn = screen.getByTestId("drive-cta-button");
    expect(closedBtn).toBeDisabled();
    expect(screen.getByText(/This drive has ended and is not accepting more offers/i)).toBeInTheDocument();
  });

  it("renders preview mode correctly with preview banner and preview styling", () => {
    render(
      <DriveDetailView
        drive={baseDrive}
        mode="preview"
      />
    );

    expect(screen.getByText(/Preview, not published yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Preview only — donations are disabled until published/i)).toBeInTheDocument();
    const previewBtn = screen.getByTestId("drive-cta-button");
    expect(previewBtn).toBeDisabled();
  });
});

describe("2. Stepper Bug Fix (NgoDriveOfferWizard & useFurthestStep)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("on step 1 with a pre-filled step 2, step 2 is not ticked", async () => {
    const { NgoDriveOfferWizard } = await import("./components/NgoDriveOfferWizard");

    const draftWithPrefilledStep2 = {
      id: 88,
      driveId: 1,
      status: "DRAFT",
      quantity: 5,
      driveTitle: "Winter Blankets",
      ngoName: "Helping Hands Trust",
      donorCity: "Pune", donorPincode: "411038", donorLatitude: 18.5, donorLongitude: 73.8,
      // No media uploaded -> stays on the photos step
      media: [],
    };

    render(
      <NgoDriveOfferWizard
        offerId={88}
        offer={draftWithPrefilledStep2 as never}
        driveId={1}
        ngoName="Helping Hands Trust"
        driveUnit="PIECES"
        initialQuantityReceived={0}
        initialQuantityPledged={0}
        requestTitle="Winter Blankets"
        requestedQuantity={50}
        stillNeededQuantity={40}
        adminNote={null}
        onSubmitted={vi.fn()}
        onExit={vi.fn()}
      />
    );

    // On Step 1 (Show the item / photos)
    const step1Heading = await screen.findByRole("heading", { name: "Show the item" });
    expect(step1Heading).toBeInTheDocument();

    // Check step 2 in the progress rail / bar:
    // Even though quantity is prefilled (5), step 2 ("Tell us about the item") has NOT been visited/reached yet.
    const step2Buttons = screen.getAllByRole("button", { name: /Tell us about the item/i });
    expect(step2Buttons.length).toBeGreaterThanOrEqual(1);

    // None of the step 2 buttons should be marked as completed
    step2Buttons.forEach((btn) => {
      expect(btn).not.toHaveAttribute("aria-label", expect.stringContaining("completed"));
      expect(btn.getAttribute("aria-label")).toMatch(/not yet available/i);
    });
  });
});

describe("3. Post-handover Feedback & Popups (Claim once for Donor and NGO)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockApi.submitHandoverFeedback.mockClear();
  });

  it("claims celebration popup exactly once per offer for donor and once for NGO", () => {
    // Donor claims first time: true
    expect(claimCelebration("NGO_DRIVE_OFFER", 42, "donor@example.com")).toBe(true);
    // Donor claims second time: false
    expect(claimCelebration("NGO_DRIVE_OFFER", 42, "donor@example.com")).toBe(false);

    // NGO claims first time: true
    expect(claimCelebration("NGO_DRIVE_OFFER", 42, "ngo@example.com")).toBe(true);
    // NGO claims second time: false
    expect(claimCelebration("NGO_DRIVE_OFFER", 42, "ngo@example.com")).toBe(false);

    // Different offer ID: can claim
    expect(claimCelebration("NGO_DRIVE_OFFER", 43, "donor@example.com")).toBe(true);
  });

  it("shows experience feedback to donor and submits with DONOR submitter role", async () => {
    mockUser.current = { email: "donor@example.com", role: "DONOR" };
    const onClose = vi.fn();

    render(
      <MotionConfig reducedMotion="always">
        <HandoverCelebration
          role="DONOR"
          contextType="NGO_DRIVE_OFFER"
          contextId={42}
          open={true}
          onClose={onClose}
        />
      </MotionConfig>
    );

    // Initial celebration screen
    expect(screen.getByText("You just did something kind")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Feedback rating screen
    expect(await screen.findByText("How did doing this act of kindness feel?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Amazing" }));
    fireEvent.change(screen.getByPlaceholderText(/Anything you'd like to share\?/i), {
      target: { value: "Everything went smoothly!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mockApi.submitHandoverFeedback).toHaveBeenCalledWith({
        contextType: "NGO_DRIVE_OFFER",
        contextId: 42,
        rating: 5,
        note: "Everything went smoothly!",
        submitterRole: "DONOR",
      });
    });
  });

  it("shows experience feedback to NGO and submits with NGO submitter role", async () => {
    mockUser.current = { email: "ngo@example.com", role: "NGO_PARTNER" };
    const onClose = vi.fn();

    render(
      <MotionConfig reducedMotion="always">
        <HandoverCelebration
          role="NGO"
          contextType="NGO_DRIVE_OFFER"
          contextId={42}
          open={true}
          onClose={onClose}
        />
      </MotionConfig>
    );

    // Celebrate screen
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Feedback screen
    expect(await screen.findByText("How did doing this act of kindness feel?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Great" }));

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mockApi.submitHandoverFeedback).toHaveBeenCalledWith({
        contextType: "NGO_DRIVE_OFFER",
        contextId: 42,
        rating: 4,
        note: undefined,
        submitterRole: "NGO",
      });
    });
  });
});

describe("4. Tip Popup Suppression for NGO Role", () => {
  beforeEach(() => {
    localStorage.clear();
    mockApi.submitHandoverFeedback.mockClear();
  });

  it("never renders tip popup for the NGO role after feedback", async () => {
    mockUser.current = { email: "ngo@example.com", role: "NGO_PARTNER" };
    const onClose = vi.fn();

    render(
      <MotionConfig reducedMotion="always">
        <HandoverCelebration
          role="NGO"
          contextType="NGO_DRIVE_OFFER"
          contextId={42}
          open={true}
          onClose={onClose}
        />
      </MotionConfig>
    );

    // Step 1: Celebrate
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Feedback
    expect(await screen.findByText("How did doing this act of kindness feel?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    // Expect to land straight on "done", never showing tip options
    await waitFor(() => {
      expect(screen.getByText("Thanks for being part of this")).toBeInTheDocument();
    });

    // Verify tip elements do not exist anywhere
    expect(screen.queryByText(/One small thing more\?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Send ₹50 tip/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tip CauseKind/i)).not.toBeInTheDocument();
    expect(mockApi.initiatePlatformTip).not.toHaveBeenCalled();
  });

  it("allows tip popup for DONOR role after feedback", async () => {
    mockUser.current = { email: "donor@example.com", role: "DONOR" };
    const onClose = vi.fn();

    render(
      <MotionConfig reducedMotion="always">
        <HandoverCelebration
          role="DONOR"
          contextType="NGO_DRIVE_OFFER"
          contextId={42}
          open={true}
          onClose={onClose}
        />
      </MotionConfig>
    );

    // Step 1: Celebrate
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Feedback -> Skip
    expect(await screen.findByText("How did doing this act of kindness feel?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    // Expect tip step to be shown for DONOR
    await waitFor(() => {
      expect(screen.getByText("One small thing more?")).toBeInTheDocument();
      expect(screen.getByText(/Send ₹50 tip/i)).toBeInTheDocument();
    });
  });
});
