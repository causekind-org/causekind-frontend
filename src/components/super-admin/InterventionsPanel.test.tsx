import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  SaCancellationOption,
  SaCancellationPreview,
  SaCancellationConsequence,
} from "@/lib/api";

const superAdminCancellationPreview = vi.fn();
const superAdminCancel = vi.fn();

vi.mock("@/lib/api", () => ({
  superAdminCancellationPreview: (...a: unknown[]) => superAdminCancellationPreview(...a),
  superAdminCancel: (...a: unknown[]) => superAdminCancel(...a),
  // Real values, not stubs — the panel's gating is supposed to agree with these,
  // and a fake list would let the gate pass while disagreeing with the server.
  SA_CANCELLATION_REASONS: [
    { value: "ITEM_NO_LONGER_AVAILABLE", label: "The item is no longer available" },
    { value: "CANNOT_ARRANGE_HANDOVER", label: "Unable to arrange handover" },
    { value: "SCHEDULING_PROBLEM", label: "Scheduling problem" },
    { value: "OTHER_PARTY_UNRESPONSIVE", label: "The other party is unresponsive" },
    { value: "SAFETY_CONCERN", label: "Safety concern" },
    { value: "CREATED_BY_MISTAKE", label: "Created by mistake" },
    { value: "OTHER", label: "Other" },
  ],
  saReasonRequiresDetails: (r: string) => r === "SAFETY_CONCERN" || r === "OTHER",
}));

import { InterventionsPanel } from "./InterventionsPanel";

/**
 * The safety properties of the staff cancellation screen.
 *
 * <p>The one that matters most is that the console never offers an action the
 * policy has already refused. `CancellationPreview.option` is the same answer the
 * execute endpoint consults, so a confirm button on a blocked record is not a
 * cosmetic bug — it is the UI promising something the server will reject, on a
 * screen whose whole purpose is ending other people's donations.
 */

function option(over: Partial<SaCancellationOption> = {}): SaCancellationOption {
  const base = {
    allowed: true,
    outcome: "CANCEL",
    actionLabel: "Cancel match",
    requiresReason: true,
    late: false,
    warning: null,
    blockedReason: null,
    ...over,
  } satisfies Omit<SaCancellationOption, "mutating">;
  // Derived rather than defaulted, mirroring CancellationOption.isMutating(), so
  // an override of allowed/outcome cannot leave a fixture in a shape the server
  // would never actually send.
  return {
    ...base,
    mutating:
      over.mutating ??
      (base.allowed && base.outcome !== "NONE" && base.outcome !== "DISPUTE"),
  };
}

function preview(
  over: Partial<SaCancellationPreview> = {},
  consequences: SaCancellationConsequence[] = []
): SaCancellationPreview {
  return {
    entityType: "MATCH",
    entityId: 42,
    currentStatus: "DONEE_ACCEPTED",
    option: option(),
    consequences,
    ...over,
  };
}

async function renderPanel(p: SaCancellationPreview) {
  superAdminCancellationPreview.mockResolvedValue(p);
  render(
    <InterventionsPanel isDark={false} initialTarget={{ entity: "matches", id: 42 }} />
  );
  await waitFor(() => expect(superAdminCancellationPreview).toHaveBeenCalled());
  return userEvent.setup();
}

function confirmButton(name: RegExp): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null;
}

beforeEach(() => {
  superAdminCancellationPreview.mockReset();
  superAdminCancel.mockReset();
});

describe("a record the policy refuses", () => {
  it("shows why and offers no action at all", async () => {
    await renderPanel(
      preview({
        option: option({
          allowed: false,
          outcome: "DISPUTE",
          actionLabel: "Report an issue",
          blockedReason: "The handover was confirmed by both parties.",
        }),
      })
    );

    expect(
      await screen.findByText("The handover was confirmed by both parties.")
    ).toBeTruthy();
    // Not merely disabled — absent. A disabled button still advertises the act.
    expect(confirmButton(/report an issue/i)).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("does not treat NONE as an error state", async () => {
    await renderPanel(
      preview({
        option: option({
          allowed: false,
          outcome: "NONE",
          actionLabel: null,
          blockedReason: "Nothing can be done to a cancelled match.",
        }),
      })
    );
    expect(await screen.findByText(/no action available here/i)).toBeTruthy();
  });
});

describe("consequences", () => {
  it("renders an empty list as a statement, never as a failure", async () => {
    await renderPanel(preview({ option: option({ outcome: "WITHDRAW", actionLabel: "Withdraw offer" }) }, []));
    expect(await screen.findByText(/nothing else follows from this/i)).toBeTruthy();
  });

  it("shows every consequence the server returned, including ones it cannot label", async () => {
    await renderPanel(
      preview({}, [
        { kind: "ITEM_RELEASED", description: "1 wheelchair returns to the donor." },
        { kind: "CONFIRMATION_ERASED", description: "Priya's handover confirmation stops standing." },
        // A kind the console does not know about must still be visible.
        { kind: "SOMETHING_NEW" as SaCancellationConsequence["kind"], description: "Unmapped." },
      ])
    );

    expect(await screen.findByText("1 wheelchair returns to the donor.")).toBeTruthy();
    expect(screen.getByText("Priya's handover confirmation stops standing.")).toBeTruthy();
    expect(screen.getByText("Unmapped.")).toBeTruthy();
    expect(screen.getByText("SOMETHING_NEW")).toBeTruthy();
  });
});

describe("the reason gate", () => {
  it("blocks submission until a safety concern is actually described", async () => {
    const user = await renderPanel(preview());

    const btn = confirmButton(/cancel match/i)!;
    expect(btn.disabled).toBe(false);

    await user.selectOptions(screen.getByRole("combobox"), "SAFETY_CONCERN");
    expect(confirmButton(/cancel match/i)!.disabled).toBe(true);

    await user.type(
      screen.getByRole("textbox", { name: /reason details/i }),
      "Donor sent threatening messages."
    );
    await waitFor(() => expect(confirmButton(/cancel match/i)!.disabled).toBe(false));
  });

  it("blocks submission on OTHER, which says nothing on its own", async () => {
    const user = await renderPanel(preview());
    await user.selectOptions(screen.getByRole("combobox"), "OTHER");
    expect(confirmButton(/cancel match/i)!.disabled).toBe(true);
  });
});

describe("staff override", () => {
  it("requires an explicit acknowledgement before it can be executed", async () => {
    const user = await renderPanel(
      preview({
        option: option({
          outcome: "OVERRIDE",
          actionLabel: "Override and cancel",
          late: true,
          warning: "This erases a confirmation Priya recorded.",
        }),
      })
    );

    // Exact string: the acknowledgement label below also ends "…a staff override."
    expect(await screen.findByText("Staff override")).toBeTruthy();
    const btn = confirmButton(/override and cancel/i)!;
    expect(btn.disabled).toBe(true);

    await user.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(confirmButton(/override and cancel/i)!.disabled).toBe(false)
    );
  });
});

describe("executing", () => {
  it("sends the chosen reason and re-reads the record afterwards", async () => {
    const user = await renderPanel(preview());
    superAdminCancel.mockResolvedValue(option({ outcome: "CANCEL" }));

    await user.click(confirmButton(/cancel match/i)!);

    await waitFor(() =>
      expect(superAdminCancel).toHaveBeenCalledWith("matches", 42, {
        reason: "ITEM_NO_LONGER_AVAILABLE",
        details: undefined,
      })
    );
    // Re-read rather than patched locally: what is possible next is the policy's
    // answer, not something the console can infer from a successful call.
    await waitFor(() => expect(superAdminCancellationPreview).toHaveBeenCalledTimes(2));
  });

  it("surfaces a refusal instead of reporting success", async () => {
    const user = await renderPanel(preview());
    superAdminCancel.mockRejectedValue(new Error("Details are required for this reason."));

    await user.click(confirmButton(/cancel match/i)!);

    expect(await screen.findByText("Details are required for this reason.")).toBeTruthy();
    expect(screen.queryByText(/^Done —/)).toBeNull();
  });
});
