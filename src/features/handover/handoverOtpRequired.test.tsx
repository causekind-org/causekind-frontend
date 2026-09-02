import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HandoverConfirmationPanel } from "./HandoverConfirmationPanel";
import type { HandoverViewModel } from "./model";

/**
 * The donee cannot confirm a handover without the code.
 *
 * <p>The panel used to send `otp: otp.trim() || undefined`, and the server skipped
 * its check entirely when no OTP arrived — so leaving the box empty was not just
 * allowed, it was the quickest way through. A wrong code failed; no code succeeded.
 *
 * <p>These pin the client half of the fix. The server enforces it independently
 * (HandoverOtpEnforcementTest); this stops the UI offering the bypass in the first
 * place, and stops it sending `undefined` where a code is required.
 */

function doneeVm(): HandoverViewModel {
  return {
    flow: "MATCH",
    id: 1,
    role: "DONEE",
    state: "partially_confirmed",
    rawStatus: "LOGISTICS_CONFIRMED",
    title: "Winter blankets",
    imageUrl: null,
    transactionCode: "CK-1",
    counterpart: { name: "Donor", phone: null },
    donorAllowsDoneeCall: false,
    schedule: null,
    confirmation: {
      donorConfirmedAt: new Date().toISOString(),
      donorConfirmedQty: 2,
      doneeConfirmedAt: null,
      doneeConfirmedQty: null,
      conditionRating: null,
      partlyConfirmed: true,
    },
    methodOptions: [],
    certificateCode: null,
    certificateHref: null,
    closed: false,
  };
}

function renderPanel(onDoneeConfirm = vi.fn()) {
  render(
    <HandoverConfirmationPanel
      vm={doneeVm()}
      otp={null}
      onGenerateOtp={vi.fn()}
      onDonorConfirm={vi.fn()}
      onDoneeConfirm={onDoneeConfirm}
    />,
  );
  return onDoneeConfirm;
}

describe("the donee confirmation needs the code", () => {
  it("keeps confirm disabled until a full six-digit code is entered", async () => {
    const user = userEvent.setup();
    renderPanel();

    const qty = screen.getByRole("spinbutton");
    await user.type(qty, "2");

    const confirm = screen.getByRole("button", { name: /i received it/i });
    // Quantity alone used to be enough — that was the bug.
    expect(confirm).toBeDisabled();
  });

  it("stays disabled on a partial code", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByRole("spinbutton"), "2");
    const code = screen.getByLabelText(/six digit handover code/i);
    await user.type(code, "123");

    expect(screen.getByRole("button", { name: /i received it/i })).toBeDisabled();
  });

  it("never sends undefined for the code", async () => {
    const user = userEvent.setup();
    const onDoneeConfirm = renderPanel();

    await user.type(screen.getByRole("spinbutton"), "2");
    await user.type(screen.getByLabelText(/six digit handover code/i), "123456");

    const confirm = screen.getByRole("button", { name: /i received it/i });
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(onDoneeConfirm).toHaveBeenCalledTimes(1);
    const payload = onDoneeConfirm.mock.calls[0][0];
    expect(payload.otp).toBe("123456");
    // The old code sent `undefined` whenever the box was blank, which the server
    // read as "no OTP supplied" and waved through.
    expect(payload.otp).not.toBeUndefined();
  });
});
