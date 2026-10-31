import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VolunteerAssignPanel } from "./VolunteerAssignPanel";
import { assignVolunteer, getVolunteerAssignOptions, resendVolunteerLink } from "@/lib/api";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));
vi.mock("@/lib/api", () => ({
  getVolunteerAssignOptions: vi.fn(), assignVolunteer: vi.fn(), resendVolunteerLink: vi.fn(), unassignVolunteer: vi.fn(),
}));

const offer = { id: 7, driveId: 3, status: "HANDOVER_IN_PROGRESS" } as never;
const handover = { scheduledDateTime: "2026-11-05T10:00:00", confirmation: { otpVerified: false } } as never;
const contacts = [
  { name: "Rahul", phone: "+919876543210", role: "Driver", email: "rahul@x.test" },
  { name: "Old Rep", phone: "+918123456789", role: null },
];
const person = (over = {}) => ({ id: 1, name: "Rahul", phone: "+919876543210", email: "rahul@x.test", role: "Driver", status: "ACTIVE", emailStatus: "SENT", expiresAt: "", ...over });
const show = () => render(<VolunteerAssignPanel offer={offer} handover={handover} onChanged={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  vi.mocked(assignVolunteer).mockResolvedValue(person() as never);
  vi.mocked(getVolunteerAssignOptions).mockResolvedValue({ canAssign: true, assignment: null, contacts } as never);
});

describe("Assigning a pickup person", () => {
  it("assigns from the drive's list, asking for an email only if it's missing", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Assign a person" }));
    fireEvent.click(screen.getByRole("radio", { name: /Old Rep/ }));
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Email for this person"), { target: { value: "old@x.test" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(assignVolunteer).toHaveBeenCalledWith(3, 7, { contactIndex: 1, email: "old@x.test" }));

    vi.mocked(assignVolunteer).mockClear();
    fireEvent.click(await screen.findByRole("button", { name: "Assign a person" }));
    fireEvent.click(screen.getByRole("radio", { name: /Rahul/ }));
    expect(screen.queryByLabelText("Email for this person")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(assignVolunteer).toHaveBeenCalledWith(3, 7, { contactIndex: 0 }));
  });

  it("assigns a new person once the name, an Indian mobile and an email are valid", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Assign a person" }));
    fireEvent.click(screen.getByRole("radio", { name: /Add new person/ }));
    fireEvent.change(screen.getByLabelText("New person name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText("New person phone"), { target: { value: "5123456789" } });
    fireEvent.change(screen.getByLabelText("New person email"), { target: { value: "asha@x.test" } });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New person phone"), { target: { value: "9123456789" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(assignVolunteer).toHaveBeenCalledWith(3, 7, {
      newPerson: { name: "Asha", phone: "+919123456789", email: "asha@x.test", role: null } }));
  });

  it("opens the sheet from the popup's link", async () => {
    search = "assign=1";
    show();
    expect(await screen.findByTestId("assign-sheet")).toBeInTheDocument();
  });

  it("a failed email offers Copy link, which issues and shows a new link", async () => {
    vi.mocked(getVolunteerAssignOptions).mockResolvedValue({ canAssign: true, assignment: person({ emailStatus: "FAILED" }), contacts } as never);
    vi.mocked(resendVolunteerLink).mockResolvedValue({ assignment: person(), link: "https://ck.test/volunteer-handover#abc" } as never);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    show();
    expect(await screen.findByTestId("volunteer-email-status")).toHaveTextContent("Email failed");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://ck.test/volunteer-handover#abc"));
    expect(await screen.findByLabelText("Pickup link")).toHaveValue("https://ck.test/volunteer-handover#abc");
  });

  it("Copy link is only for a failed email", async () => {
    vi.mocked(getVolunteerAssignOptions).mockResolvedValue({ canAssign: true, assignment: person(), contacts } as never);
    show();
    expect(await screen.findByTestId("volunteer-email-status")).toHaveTextContent("Email sent");
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reassign" })).toBeInTheDocument();
  });

  it("hides Reassign and Unassign once the code is confirmed", async () => {
    vi.mocked(getVolunteerAssignOptions).mockResolvedValue({ canAssign: false, assignment: person(), contacts } as never);
    show();
    expect(await screen.findByRole("button", { name: "Resend link" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reassign" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Unassign" })).toBeNull();
  });
});
