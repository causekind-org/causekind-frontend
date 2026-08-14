import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SaInterventionAction, SaInterventionType } from "@/lib/api";

const superAdminHold = vi.fn();
const superAdminResume = vi.fn();
const superAdminReassess = vi.fn();
const superAdminRequestInfoFor = vi.fn();

vi.mock("@/lib/api", () => ({
  superAdminHold: (...a: unknown[]) => superAdminHold(...a),
  superAdminResume: (...a: unknown[]) => superAdminResume(...a),
  superAdminReassess: (...a: unknown[]) => superAdminReassess(...a),
  superAdminRequestInfoFor: (...a: unknown[]) => superAdminRequestInfoFor(...a),
}));

import { InterventionActions } from "./InterventionActions";

/**
 * The safety properties of the named-action surface.
 *
 * <p>The one that matters most is that a blocked action still <b>says why</b>.
 * "Why can't I do this" is the question staff arrive with, and an action that
 * disappears from the list answers it with a blank space — the same defect
 * `MyTasksCard` had in Phase 3, where "not mounted", "failed" and "nothing here"
 * all rendered identically.
 */

function action(over: Partial<SaInterventionAction> & { type: SaInterventionType }): SaInterventionAction {
  return {
    available: true,
    label: "Do the thing",
    requiresText: false,
    blockedReason: null,
    warning: null,
    ...over,
  };
}

function renderActions(actions: SaInterventionAction[], onChanged = vi.fn()) {
  render(
    <InterventionActions
      entity="requests"
      id={15}
      actions={actions}
      isDark={false}
      onChanged={onChanged}
    />
  );
  return userEvent.setup();
}

beforeEach(() => {
  superAdminHold.mockReset();
  superAdminResume.mockReset();
  superAdminReassess.mockReset();
  superAdminRequestInfoFor.mockReset();
});

describe("actions the policy refuses", () => {
  it("shows the server's reason and offers no button", () => {
    renderActions([
      action({
        type: "HOLD",
        available: false,
        label: null,
        blockedReason: "Someone has already committed to this.",
      }),
    ]);

    expect(screen.getByText("Someone has already committed to this.")).toBeTruthy();
    // Not disabled — absent. A disabled button still advertises the act.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("still lists the action rather than hiding it", () => {
    renderActions([
      action({ type: "REPUBLISH", available: false, label: null, blockedReason: "Nothing implements this yet." }),
    ]);
    // The type is rendered even with no server label, so an action this console
    // cannot name is still visible to whoever is looking for it.
    expect(screen.getByText(/republish/i)).toBeTruthy();
  });
});

describe("the text gate", () => {
  it("blocks a hold until a reason is written, because the owner reads it", async () => {
    const user = renderActions([
      action({ type: "HOLD", label: "Hold this request", requiresText: true }),
    ]);

    await user.click(screen.getByRole("button", { name: /hold this request/i }));

    const confirm = screen.getAllByRole("button", { name: /hold this request/i }).at(-1)!;
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/cannot be blank/i)).toBeTruthy();

    await user.type(screen.getByLabelText(/reason/i), "Duplicate of request 12");
    await waitFor(() =>
      expect((screen.getAllByRole("button", { name: /hold this request/i }).at(-1) as HTMLButtonElement).disabled)
        .toBe(false)
    );

    superAdminHold.mockResolvedValue([]);
    await user.click(screen.getAllByRole("button", { name: /hold this request/i }).at(-1)!);
    await waitFor(() => expect(superAdminHold).toHaveBeenCalledWith("requests", 15, "Duplicate of request 12"));
  });

  it("lets an optional reason through empty", async () => {
    const user = renderActions([action({ type: "RESUME", label: "Resume verification" })]);
    await user.click(screen.getByRole("button", { name: /resume verification/i }));

    superAdminResume.mockResolvedValue([]);
    await user.click(screen.getAllByRole("button", { name: /resume verification/i }).at(-1)!);
    await waitFor(() => expect(superAdminResume).toHaveBeenCalledWith("requests", 15, undefined));
  });
});

describe("asking for information", () => {
  it("needs both instructions and at least one labelled item", async () => {
    const user = renderActions([
      action({ type: "REQUEST_INFO", label: "Ask the donee for information", requiresText: true }),
    ]);
    await user.click(screen.getByRole("button", { name: /ask the donee for information/i }));

    const confirm = () =>
      screen.getAllByRole("button", { name: /ask the donee for information/i }).at(-1) as HTMLButtonElement;

    expect(confirm().disabled).toBe(true);

    // Instructions alone are not a question — nothing is being asked for.
    await user.type(screen.getByLabelText(/instructions/i), "We need proof of address");
    await waitFor(() => expect(screen.getByText(/at least one thing/i)).toBeTruthy());
    expect(confirm().disabled).toBe(true);

    await user.type(screen.getByLabelText(/item 1 label/i), "Utility bill from the last 3 months");
    await waitFor(() => expect(confirm().disabled).toBe(false));

    superAdminRequestInfoFor.mockResolvedValue({ informationRequestId: 7 });
    await user.click(confirm());

    await waitFor(() =>
      expect(superAdminRequestInfoFor).toHaveBeenCalledWith("requests", 15, expect.objectContaining({
        instructions: "We need proof of address",
        items: [expect.objectContaining({ itemType: "DOCUMENT", label: "Utility bill from the last 3 months" })],
      }))
    );
    expect(await screen.findByText(/information request #7 is now open/i)).toBeTruthy();
  });
});

describe("after an action runs", () => {
  it("hands the server's refreshed list upstream rather than guessing", async () => {
    const onChanged = vi.fn();
    const user = renderActions([action({ type: "REASSESS", label: "Re-run verification" })], onChanged);

    const refreshed = [action({ type: "REASSESS", available: false, label: null, blockedReason: "Already running." })];
    superAdminReassess.mockResolvedValue(refreshed);

    await user.click(screen.getByRole("button", { name: /re-run verification/i }));
    await user.click(screen.getAllByRole("button", { name: /re-run verification/i }).at(-1)!);

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(refreshed));
  });

  it("surfaces a refusal instead of reporting success", async () => {
    const user = renderActions([action({ type: "REASSESS", label: "Re-run verification" })]);
    superAdminReassess.mockRejectedValue(new Error("Only a request awaiting verification can be reassessed"));

    await user.click(screen.getByRole("button", { name: /re-run verification/i }));
    await user.click(screen.getAllByRole("button", { name: /re-run verification/i }).at(-1)!);

    expect(await screen.findByText(/only a request awaiting verification/i)).toBeTruthy();
  });
});

describe("warnings", () => {
  it("shows counterpart impact before the agent acts", () => {
    renderActions([
      action({
        type: "HOLD",
        label: "Hold this request",
        warning: "This request is live on the public need board.",
      }),
    ]);
    expect(screen.getByText(/live on the public need board/i)).toBeTruthy();
  });
});
