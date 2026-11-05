import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScanDonation } from "./ScanDonation";
import { captureUtm } from "./tracking";
import { normalizePhone } from "./schema";

vi.mock("next/script", () => ({ default: () => null }));

const ORDER = { donationId: 7, razorpayOrderId: "order_1", keyId: "rzp_test", amount: 10100, currency: "INR" };
type Options = {
  key: string;
  prefill: Record<string, string>;
  handler: (r: Record<string, string>) => void;
  modal: { ondismiss: () => void };
};

let checkout: Options;
let onFailed: () => void;
const fetchMock = vi.fn();
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const bodyOf = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);
const paid = () =>
  checkout.handler({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" });

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Full name"), "Asha Rao");
  await user.type(screen.getByLabelText("Phone"), "9876543210");
  await user.type(screen.getByLabelText("Email"), "asha@example.com");
  await user.type(screen.getByLabelText("PAN"), "ABCDE1234F");
  await user.type(screen.getByLabelText("Street"), "1 MG Road");
  await user.type(screen.getByLabelText("City"), "Pune");
  await user.type(screen.getByLabelText("State"), "Maharashtra");
  await user.type(screen.getByLabelText("PIN code"), "411001");
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  (window as unknown as { Razorpay: unknown }).Razorpay = class {
    constructor(options: Options) {
      checkout = options;
    }
    on(_: string, cb: () => void) {
      onFailed = cb;
    }
    open() {}
  };
  window.history.replaceState(null, "", "/scan?utm_source=video&utm_campaign=diwali");
});

describe("ScanDonation", () => {
  it("keeps Donate disabled until required fields are valid, and defaults to ₹101 plus ₹30 support", async () => {
    const user = userEvent.setup();
    render(<ScanDonation />);
    const donate = screen.getByRole("button", { name: "Donate ₹131" });
    expect(donate).toBeDisabled();
    await fillRequired(user);
    await waitFor(() => expect(donate).toBeEnabled());
  });

  it("requires PAN and address from everyone, with or without the 80G tick", async () => {
    const user = userEvent.setup();
    render(<ScanDonation />);
    await user.type(screen.getByLabelText("Full name"), "Asha Rao");
    await user.type(screen.getByLabelText("Phone"), "9876543210");
    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    const donate = screen.getByRole("button", { name: /Donate/ });
    await user.type(screen.getByLabelText("PAN"), "abcde1234f");
    expect(screen.getByLabelText("PAN")).toHaveValue("ABCDE1234F");
    await waitFor(() => expect(donate).toBeDisabled());
    await user.type(screen.getByLabelText("Street"), "1 MG Road");
    await user.type(screen.getByLabelText("City"), "Pune");
    await user.type(screen.getByLabelText("State"), "Maharashtra");
    await user.type(screen.getByLabelText("PIN code"), "411001");
    await waitFor(() => expect(donate).toBeEnabled());
    await user.click(screen.getByLabelText(/80G tax receipt/));
    expect(donate).toBeEnabled();
  });

  it("enforces the ₹10 minimum on Other amount", async () => {
    const user = userEvent.setup();
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByLabelText("Other amount"));
    await user.clear(screen.getByLabelText(/Your amount/));
    await user.type(screen.getByLabelText(/Your amount/), "9");
    expect(screen.getByRole("button", { name: "Donate ₹39" })).toBeDisabled();
    await user.type(screen.getByLabelText(/Your amount/), "0");
    await waitFor(() => expect(screen.getByRole("button", { name: "Donate ₹120" })).toBeEnabled());
  });

  it("opens Other amount on the amount just selected, and lets the donor change it", async () => {
    const user = userEvent.setup();
    render(<ScanDonation />);
    await user.click(screen.getByLabelText("Other amount"));
    expect(screen.getByLabelText(/Your amount/)).toHaveValue("101");
    await user.click(screen.getByLabelText("₹501"));
    await user.click(screen.getByLabelText("Other amount"));
    const input = screen.getByLabelText(/Your amount/);
    expect(input).toHaveValue("501");
    await user.clear(input);
    await user.type(input, "750");
    expect(screen.getByRole("button", { name: "Donate ₹780" })).toBeInTheDocument();
  });

  it("adds an optional tip to the total but sends it separately from the donation", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ok(ORDER));
    render(<ScanDonation />);
    await fillRequired(user);
    expect(screen.getByRole("radio", { name: "₹30" })).toBeChecked();
    expect(screen.getByText("₹101 donation + ₹30 support to CauseKind, separate from your donation and not covered by 80G")).toBeInTheDocument();
    await user.click(screen.getByLabelText("No thanks"));
    expect(screen.queryByText(/support to CauseKind/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: "₹50" }));
    await user.click(screen.getByRole("button", { name: "Donate ₹151" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(bodyOf(0)).toMatchObject({ amount: 101, tipAmount: 50 });
  });

  it("takes a custom support amount", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ok(ORDER));
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByRole("radio", { name: "Other" }));
    await user.type(screen.getByLabelText("Support amount in ₹"), "75");
    await user.click(screen.getByRole("button", { name: "Donate ₹176" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(bodyOf(0)).toMatchObject({ amount: 101, tipAmount: 75 });
  });

  it("shows success only after verify returns PAID, and sends the contract payload", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ok(ORDER));
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Donate ₹131" }));
    await waitFor(() => expect(checkout?.key).toBe("rzp_test"));

    expect(bodyOf(0)).toMatchObject({
      name: "Asha Rao",
      phone: "9876543210",
      amount: 101,
      tipAmount: 30,
      wants80g: false,
      pan: "ABCDE1234F",
      utm: { source: "video", campaign: "diwali", medium: "", content: "" },
      website: "",
    });
    expect(checkout.prefill.contact).toBe("+919876543210");

    fetchMock.mockResolvedValueOnce(
      ok({ status: "PAID", donationId: 7, firstName: "Asha", amount: 101, wants80g: true }),
    );
    paid();
    expect(await screen.findByText(/Thank you, Asha. Your ₹101 will feed/)).toBeInTheDocument();
    expect(screen.getByText("pay_1")).toBeInTheDocument();
    expect(screen.getByText("Your 80G receipt and donation certificate will be emailed to you.")).toBeInTheDocument();
    expect(bodyOf(1)).toEqual({ razorpayOrderId: "order_1", razorpayPaymentId: "pay_1", razorpaySignature: "sig" });
  });

  it("reads a verify amount that echoes the order's paise as the rupees chosen", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ok(ORDER));
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Donate ₹131" }));
    await waitFor(() => expect(checkout).toBeDefined());
    fetchMock.mockResolvedValueOnce(ok({ status: "PAID", firstName: "Asha", amount: 10100, wants80g: false }));
    paid();
    expect(await screen.findByText(/Your ₹101 will feed/)).toBeInTheDocument();
  });

  it.each([
    ["a status other than PAID", () => ok({ status: "PENDING" })],
    ["a failed verify call", () => new Response("{}", { status: 500 })],
  ])("never shows success on %s, and offers a re-check instead of a second payment", async (_, reply) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ok(ORDER));
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Donate ₹131" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(checkout.key).toBe("rzp_test"));
    fetchMock.mockResolvedValueOnce(reply());
    paid();
    expect(await screen.findByRole("button", { name: "Check again" })).toBeInTheDocument();
    expect(screen.queryByText(/Thank you/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Try again|Donate/ })).toBeNull();

    fetchMock.mockResolvedValueOnce(ok({ status: "PAID", firstName: "Asha", amount: 101, wants80g: false }));
    await user.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText(/Thank you, Asha/)).toBeInTheDocument();
  });

  it("keeps the entered data and offers Try again when checkout closes after a decline", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(ok(ORDER));
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Donate ₹131" }));
    await waitFor(() => expect(checkout.key).toBe("rzp_test"));
    onFailed();
    checkout.modal.ondismiss();
    expect(await screen.findByRole("alert")).toHaveTextContent("didn't go through");
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Rao");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("puts backend validation errors on their fields", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: "Invalid",
          fieldErrors: [
            { field: "email", message: "This email is blocked." },
            { field: "address.pincode", message: "Unknown PIN code." },
          ],
        }),
        { status: 400 },
      ),
    );
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Donate ₹131" }));
    expect(await screen.findByText("This email is blocked.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(await screen.findByText("Unknown PIN code.")).toBeInTheDocument();
  });

  it("stores only UTMs in the browser, never donor details", async () => {
    const user = userEvent.setup();
    render(<ScanDonation />);
    await fillRequired(user);
    await user.click(screen.getByLabelText(/80G tax receipt/));
    expect(Object.keys(sessionStorage)).toEqual(["ck_scan_utm"]);
    expect(sessionStorage.getItem("ck_scan_utm")).not.toMatch(/Asha|ABCDE/);
    expect(localStorage.length).toBe(0);
  });
});

describe("helpers", () => {
  it("restores UTMs from sessionStorage when the URL has none", () => {
    captureUtm("?utm_source=video");
    expect(captureUtm("").source).toBe("video");
  });

  it("normalizes autofilled phone numbers", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });
});
