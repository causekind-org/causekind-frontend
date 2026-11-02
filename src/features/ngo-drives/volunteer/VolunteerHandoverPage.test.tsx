import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { formatPickupTime, VolunteerHandoverPage } from "./VolunteerHandoverPage";

vi.mock("@/features/ngo-drives/components/PhotoCaptureDialog", () => ({
  PhotoCaptureDialog: ({ open, onCaptured }: { open: boolean; onCaptured: (f: File) => void }) =>
    open ? <button type="button" onClick={() => onCaptured(new File(["x"], "p.jpg", { type: "image/jpeg" }))}>Capture</button> : null,
}));
vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input aria-label="Code" value={value} onChange={(e) => onChange(e.target.value)} />,
  InputOTPGroup: () => null,
  InputOTPSlot: () => null,
}));

const TOKEN = "a".repeat(43);
const base = {
  volunteerName: "Ravi", ngoName: "Hope Trust", driveTitle: "Winter blankets", donorFirstName: "Priya", donorPhone: null,
  itemName: "Blanket", quantity: 3, donorNotes: "Ring twice", pickupAt: "2026-11-05T10:00:00", address: "12 Shanti Nagar, Pune",
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=x", codeConfirmed: false, codeConfirmedByNgo: false,
  confirmedQuantity: 0, photoAdded: false, completed: false, photoUrls: [], linkExpiresAt: "2026-11-07T18:29:59",
};
let details: Record<string, unknown>;
let confirmResponse: { status: number; body: unknown };
let deadStatus: number | null;
const calls: { url: string; init: RequestInit }[] = [];
const json = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), { status });

beforeEach(() => {
  calls.length = 0;
  details = { ...base };
  deadStatus = null;
  confirmResponse = { status: 200, body: { ...base, codeConfirmed: true, confirmedQuantity: 2 } };
  sessionStorage.clear();
  window.history.replaceState(null, "", `/volunteer-handover#${TOKEN}`);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    if (deadStatus) return json(deadStatus, { detail: "gone", fieldErrors: [{ field: "link", message: "This link is no longer active. Ask Hope Trust for a new one." }] });
    if (url.endsWith("/confirm-code")) return json(confirmResponse.status, confirmResponse.body);
    if (url.endsWith("/photo")) { details = { ...details, completed: true, confirmedQuantity: 3, photoUrls: ["https://s.test/p.jpg"] }; return json(204, null); }
    if (url.endsWith("/chat")) return json(200, init.method === "POST" ? { id: 9, mine: true, senderName: "Ravi", content: "on my way", sentAt: "" } : [{ id: 1, mine: false, senderName: "Priya", content: "gate code 42", sentAt: "" }]);
    return json(200, details);
  }));
});
afterEach(() => vi.unstubAllGlobals());

const headerOf = (c: { init: RequestInit }) => (c.init.headers as Record<string, string>)["X-Handover-Token"];

describe("Volunteer handover page", () => {
  it("reads the token from the hash, removes it from the URL, and sends it only as a header", async () => {
    render(<VolunteerHandoverPage />);
    expect(screen.getByTestId("volunteer-loading")).toBeInTheDocument();
    await screen.findByText("Winter blankets");
    expect(window.location.hash).toBe("");
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((c) => {
      expect(headerOf(c)).toBe(TOKEN);
      expect(c.url).not.toContain(TOKEN);
      expect(c.init.credentials).toBe("omit");
    });
    expect(screen.getByTestId("volunteer-when")).toHaveTextContent("10:00 am IST");
    expect(screen.getByText("Ring twice")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", base.directionsUrl);
  });

  it("a refresh keeps working from this tab's storage", async () => {
    sessionStorage.setItem("ck_volunteer_token", TOKEN);
    window.history.replaceState(null, "", "/volunteer-handover");
    render(<VolunteerHandoverPage />);
    await screen.findByText("Winter blankets");
    expect(headerOf(calls[0])).toBe(TOKEN);
  });

  it.each([401, 410])("a dead link (%i) shows only the message and forgets the token", async (status) => {
    deadStatus = status;
    render(<VolunteerHandoverPage />);
    expect(await screen.findByTestId("volunteer-dead")).toHaveTextContent("This link is no longer active. Ask Hope Trust for a new one.");
    expect(screen.queryByText("12 Shanti Nagar, Pune")).toBeNull();
    expect(sessionStorage.getItem("ck_volunteer_token")).toBeNull();
  });

  it("no token at all is a dead link, with no call made", async () => {
    window.history.replaceState(null, "", "/volunteer-handover");
    render(<VolunteerHandoverPage />);
    expect(await screen.findByTestId("volunteer-dead")).toHaveTextContent("Ask the NGO for a new one.");
    expect(calls).toHaveLength(0);
  });

  it("confirms the code with a quantity, shows the API's errors, then moves to the photo", async () => {
    render(<VolunteerHandoverPage />);
    await screen.findByTestId("volunteer-code-step");
    const confirm = screen.getByRole("button", { name: "Confirm code" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "111111" } });
    fireEvent.change(screen.getByLabelText(/Quantity received/), { target: { value: "4" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Quantity received/), { target: { value: "2" } });

    confirmResponse = { status: 400, body: { detail: "generic", fieldErrors: [{ field: "otp", message: "Wrong code. 4 attempts left." }] } };
    fireEvent.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong code. 4 attempts left.");

    confirmResponse = { status: 429, body: { detail: "Too many wrong codes. Ask the donor to generate a new code." } };
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "222222" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm code" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Too many wrong codes"));

    confirmResponse = { status: 200, body: { ...base, codeConfirmed: true, confirmedQuantity: 2 } };
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm code" }));
    expect(await screen.findByTestId("volunteer-photo-step")).toHaveTextContent("Code confirmed (2)");
    const sent = calls.filter((c) => c.url.endsWith("/confirm-code")).pop()!;
    expect(JSON.parse(String(sent.init.body))).toEqual({ otp: "123456", quantity: 2 });
  });

  it("skips to the photo when the NGO already confirmed, and the photo completes it", async () => {
    details = { ...base, codeConfirmed: true, codeConfirmedByNgo: true, confirmedQuantity: 3 };
    render(<VolunteerHandoverPage />);
    expect(await screen.findByTestId("volunteer-photo-step")).toHaveTextContent("Code already confirmed by the NGO");
    expect(screen.queryByTestId("volunteer-code-step")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Capture" }));
    const done = await screen.findByTestId("volunteer-complete");
    expect(done).toHaveTextContent("Handover complete, thank you");
    expect(done).toHaveTextContent("3 × Blanket");
    expect(done.querySelector("img")).toHaveAttribute("src", "https://s.test/p.jpg");
  });

  it("offers Call only when the donor allowed it", async () => {
    const { unmount } = render(<VolunteerHandoverPage />);
    await screen.findByText("Winter blankets");
    expect(screen.queryByRole("link", { name: "Call donor" })).toBeNull();
    unmount();
    details = { ...base, donorPhone: "+919812345678" };
    sessionStorage.setItem("ck_volunteer_token", TOKEN);
    render(<VolunteerHandoverPage />);
    expect(await screen.findByRole("link", { name: "Call donor" })).toHaveAttribute("href", "tel:+919812345678");
  });

  it("labels the chat and posts a message", async () => {
    render(<VolunteerHandoverPage />);
    expect(await screen.findByText("gate code 42")).toBeInTheDocument();
    expect(within(screen.getByTestId("volunteer-chat")).getByText("Priya")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message to the donor"), { target: { value: "on my way" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("on my way")).toBeInTheDocument();
    const post = calls.find((c) => c.url.endsWith("/chat") && c.init.method === "POST")!;
    expect(JSON.parse(String(post.init.body))).toEqual({ content: "on my way" });
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("formats the pickup time as written, in IST", () => {
    expect(formatPickupTime("2026-11-05T15:30:00")).toMatch(/5 Nov 2026.*3:30 pm IST/);
  });
});
