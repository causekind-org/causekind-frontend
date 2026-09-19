import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HandoverSafetyActions } from "./HandoverSafetyActions";
import { HandoverJourneyRail } from "./HandoverJourneyRail";
import type { HandoverViewModel } from "./model";

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

vi.mock("@/lib/api", () => ({
  getOfferCancellationOptions: vi.fn().mockResolvedValue({ allowed: false, outcome: "HIDE" }),
  getMatchCancellationOptions: vi.fn().mockResolvedValue({
    allowed: false,
    outcome: "DISPUTE",
    blockedReason: "This donation has already been handed over, so it can't be cancelled. If something was wrong with it, report an issue instead.",
  }),
  reportPostDeliveryIssue: vi.fn().mockResolvedValue({}),
  reportMatchIssue: vi.fn().mockResolvedValue({}),
  confirmNoIssue: vi.fn().mockResolvedValue({}),
  CANCELLATION_REASONS: [],
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createVm(role: "DONOR" | "DONEE"): HandoverViewModel {
  return {
    flow: "OFFER",
    id: 42,
    role,
    state: "issue_window",
    rawStatus: "ISSUE_WINDOW_OPEN",
    title: "School Stationery",
    imageUrl: null,
    transactionCode: "OFFER-42",
    counterpart: { name: role === "DONOR" ? "Recipient" : "Donor", phone: null },
    donorAllowsDoneeCall: false,
    schedule: null,
    confirmation: {
      donorConfirmedAt: new Date().toISOString(),
      donorConfirmedQty: 1,
      doneeConfirmedAt: new Date().toISOString(),
      doneeConfirmedQty: 1,
      conditionRating: "GOOD",
      partlyConfirmed: false,
    },
    methodOptions: [],
    certificateCode: null,
    certificateHref: null,
    closed: false,
  };
}

describe("HandoverSafetyActions - Problem reporting options by role", { timeout: 15000 }, () => {
  it("displays 5 donor-specific problem options when user is the DONOR", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<HandoverSafetyActions vm={createVm("DONOR")} onChanged={vi.fn()} />);

    const reportBtn = screen.getByRole("button", { name: /report a problem/i });
    expect(reportBtn).toBeInTheDocument();
    await user.click(reportBtn);

    expect(screen.getByText("What went wrong?")).toBeInTheDocument();

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(5);

    expect(screen.getByRole("option", { name: "The recipient says they didn't get the item, but I handed it over" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "The recipient asked for money or something extra" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "The recipient behaved inappropriately or made me feel unsafe" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "I think the item is being resold or misused" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Something else" })).toBeInTheDocument();

    // Verify pre-handover no-show option is removed
    expect(screen.queryByRole("option", { name: "The recipient didn't show up for the handover" })).not.toBeInTheDocument();

    // Verify none of the donee-only options are present
    expect(screen.queryByRole("option", { name: "I never received the item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "The item arrived damaged" })).not.toBeInTheDocument();
  });

  it("displays 5 donee-specific problem options when user is the DONEE", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<HandoverSafetyActions vm={createVm("DONEE")} onChanged={vi.fn()} />);

    const reportBtn = screen.getByRole("button", { name: /report a problem/i });
    expect(reportBtn).toBeInTheDocument();
    await user.click(reportBtn);

    expect(screen.getByText("What went wrong?")).toBeInTheDocument();

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(5);

    expect(screen.getByRole("option", { name: "I never received the item" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "The item arrived damaged" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "It isn't what was described" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "The quantity was wrong" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Something else" })).toBeInTheDocument();

    // Verify none of the donor-only options are present
    expect(screen.queryByRole("option", { name: "The recipient says they didn't get the item, but I handed it over" })).not.toBeInTheDocument();
  });

  it("renders Report a problem and submits via reportMatchIssue when flow is MATCH and state is completed", async () => {
    const { reportMatchIssue } = await import("@/lib/api");
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const matchVm = createMatchVm("DONOR");
    render(<HandoverSafetyActions vm={matchVm} onChanged={vi.fn()} />);

    // In a completed match with disputeOnly, "Report a problem" must be rendered
    const reportBtn = await screen.findByRole("button", { name: /report a problem/i });
    expect(reportBtn).toBeInTheDocument();
    await user.click(reportBtn);

    expect(screen.getByText("What went wrong?")).toBeInTheDocument();

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);

    const option = screen.getByRole("option", { name: "The recipient asked for money or something extra" });
    await user.click(option);

    const descInput = screen.getByPlaceholderText("Tell us what happened, in your own words.");
    await user.type(descInput, "They asked for additional cash payment outside the platform.");

    const sendBtn = screen.getByRole("button", { name: /send report/i });
    expect(sendBtn).toBeEnabled();
    await user.click(sendBtn);

    expect(reportMatchIssue).toHaveBeenCalledWith(2, {
      issueType: "MONEY_DEMANDED",
      description: "They asked for additional cash payment outside the platform.",
      windowCategory: "GENERAL",
    });
  });

  it("renders Report a problem for DONEE on a completed MATCH", async () => {
    const { reportMatchIssue } = await import("@/lib/api");
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const matchVm = createMatchVm("DONEE");
    render(<HandoverSafetyActions vm={matchVm} onChanged={vi.fn()} />);

    const reportBtn = await screen.findByRole("button", { name: /report a problem/i });
    expect(reportBtn).toBeInTheDocument();
    await user.click(reportBtn);

    expect(screen.getByText("What went wrong?")).toBeInTheDocument();

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);

    const option = screen.getByRole("option", { name: "I never received the item" });
    await user.click(option);

    const descInput = screen.getByPlaceholderText("Tell us what happened, in your own words.");
    await user.type(descInput, "The donor never handed over the item at the location.");

    const sendBtn = screen.getByRole("button", { name: /send report/i });
    expect(sendBtn).toBeEnabled();
    await user.click(sendBtn);

    expect(reportMatchIssue).toHaveBeenCalledWith(2, {
      issueType: "ITEM_NOT_RECEIVED",
      description: "The donor never handed over the item at the location.",
      windowCategory: "GENERAL",
    });
  });
});

function createMatchVm(role: "DONOR" | "DONEE"): HandoverViewModel {
  return {
    flow: "MATCH",
    id: 2,
    role,
    state: "completed",
    rawStatus: "COMPLETED",
    title: "earbuds",
    imageUrl: null,
    transactionCode: "CK-M00002",
    counterpart: { name: role === "DONOR" ? "Prachi Madane" : "Donor User", phone: null },
    donorAllowsDoneeCall: false,
    schedule: null,
    confirmation: {
      donorConfirmedAt: new Date().toISOString(),
      donorConfirmedQty: 1,
      doneeConfirmedAt: new Date().toISOString(),
      doneeConfirmedQty: 1,
      conditionRating: "GOOD",
      partlyConfirmed: false,
    },
    methodOptions: [],
    certificateCode: "CERT-2",
    certificateHref: null,
    closed: true,
  };
}

describe("HandoverJourneyRail - Stepper completion", () => {
  it("marks all 5 steps (including Complete) as done when state is completed", () => {
    const { container } = render(<HandoverJourneyRail state="completed" />);

    // None of the steps should have aria-current="step"
    expect(container.querySelector('[aria-current="step"]')).toBeNull();

    // All 5 step labels should be present
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Handover")).toBeInTheDocument();
    expect(screen.getByText("Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();

    // Screen reader announcement indicates complete
    expect(screen.getByText("Handover complete: all steps finished.")).toBeInTheDocument();

    // New layout: each step owns a left and right half-connector (10 total for 5 steps).
    // The first step's left and last step's right are visibility:hidden but still in the DOM.
    // When completed every segment — including the hidden edge placeholders — scales to 1.
    const fills = container.querySelectorAll(".handover-rail-fill");
    expect(fills).toHaveLength(10);
    fills.forEach((fill) => {
      expect(fill).toHaveStyle({ transform: "scaleX(1)" });
    });
  });

  it("marks Confirmation as current and Complete as upcoming when state is issue_window", () => {
    const { container } = render(<HandoverJourneyRail state="issue_window" />);

    // Confirmation step is current
    const currentStep = container.querySelector('[aria-current="step"]');
    expect(currentStep).not.toBeNull();
    expect(currentStep).toHaveTextContent("Confirmation");

    expect(screen.getByText(/Step 4 of 5: Confirmation/)).toBeInTheDocument();
  });
});
