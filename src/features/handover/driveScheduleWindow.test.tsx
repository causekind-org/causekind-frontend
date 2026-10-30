import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { driveSlotProblem, driveWindowText } from "./HandoverScheduleDialog";
import { scheduleNgoDriveOfferHandover } from "@/lib/api";
import { HandoversPanel } from "@/features/ngo-drives/components/manage/HandoversPanel";
import { NgoAcceptedOffersList } from "@/components/matches/NgoAcceptedOffers";

vi.mock("@/features/ngo-drives/components/DriveOfferChatPanel", () => ({ DriveOfferChatPanel: () => null }));

const drive = { availableDays: "MON,WED", availableFrom: "18:11", availableTo: "19:11" };
const now = new Date(2026, 9, 18, 10, 0); // Sun 18 Oct 2026, 10:00 local

describe("drive handover window (dialog)", () => {
  it("shows the NGO's days and hours", () => {
    expect(driveWindowText(drive)).toBe("on Mon, Wed between 18:11 and 19:11");
  });
  it("blocks days and times outside the window, checked on the picked local time", () => {
    expect(driveSlotProblem(drive, "2026-10-19T18:30", now)).toBeNull();                       // Mon 18:30 IST
    expect(driveSlotProblem(drive, "2026-10-19T13:00", now)).toBe("Pick a time between 18:11 and 19:11.");
    expect(driveSlotProblem(drive, "2026-10-20T18:30", now)).toBe("The NGO receives items on Mon, Wed only.");
    expect(driveSlotProblem(drive, "2026-10-17T18:30", now)).toBe("Pick a date and time in the future.");
  });
});

describe("api errors", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("shows the server's field message, not the generic 'couldn't read that request'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_FAILED", message: "We couldn't read that request. Please try again.",
      fieldErrors: [{ field: "scheduledDateTime", code: "INVALID_VALUE", message: "Pick a time between 18:11 and 19:11" }],
    }), { status: 400, headers: { "Content-Type": "application/json" } })));
    await expect(scheduleNgoDriveOfferHandover(3, { method: "DROP_OFF", scheduledDateTime: "2026-10-19T13:00:00" } as never)).rejects.toThrow("Pick a time between 18:11 and 19:11");
  });
});

describe("received handovers: no chat", () => {
  const d = { id: 5, title: "Laptops", unit: "PIECES", itemName: "Laptop" } as never;
  const row = (id: number, status: string) => ({ id, status, quantity: 5, receivedQuantity: 5, receivedAt: "2026-10-19T09:51:39", donorDisplayName: `Donor ${id}`, drive: d }) as never;
  it("NGO Activity > Received: 'Received on <date> · <qty>', View handover only while the window is open", () => {
    render(<HandoversPanel offers={[row(1, "ISSUE_WINDOW_OPEN"), row(2, "COMPLETED")]} reload={vi.fn()} />);
    fireEvent.click(screen.getByTestId("handover-chip-received"));
    const [open, done] = screen.getAllByTestId("handover-row");
    for (const r of [open, done]) {
      expect(within(r).queryByRole("button", { name: "Chat" })).toBeNull();
      expect(within(r).getByTestId("handover-plan")).toHaveTextContent("Received on 19 Oct 2026 · 5 Pieces");
      expect(within(r).queryByText(/hasn't planned/)).toBeNull();
    }
    expect(within(open).getByRole("link", { name: "View handover" })).toHaveAttribute("href", "/ngo/drives/5/offers/1/handover");
    expect(within(done).queryByRole("link")).toBeNull();
    expect(within(done).queryByRole("button")).toBeNull();
  });

  it("donor Matches > NGO: received shows the date and quantity and a small link, no handover button", () => {
    render(<NgoAcceptedOffersList offers={[{ id: 3, status: "ISSUE_WINDOW_OPEN", driveTitle: "Laptops", quantity: 5, receivedQuantity: 5, driveUnit: "PIECES", receivedAt: "2026-10-19T09:51:39" }]} />);
    expect(screen.getByTestId("drive-offer-received")).toHaveTextContent("Received on 19 Oct 2026 · 5 pieces");
    expect(screen.queryByRole("link", { name: /Open handover/ })).toBeNull();
    expect(screen.getByRole("link", { name: "View handover" })).toHaveAttribute("href", "/ngo-drive-offers/3/handover");
  });
});
