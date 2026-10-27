import { beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

/**
 * NGO drive full drop-off address: required on the form, shown in review / manage / admin,
 * old-drive fallback, inside-radius drop-off (no map), outside-radius give step and handover.
 */

const api = vi.hoisted(() => ({
  scheduleNgoDriveOfferHandover: vi.fn(),
  getNgoDrive: vi.fn(() => new Promise(() => {})),
  getMyNgoApplication: vi.fn(async () => null),
  getNgoDriveDraft: vi.fn(async () => null),
  saveNgoDriveDraft: vi.fn(async () => ({})),
  deleteNgoDriveDraft: vi.fn(async () => ({})),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams("type=items") }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }) }));
vi.mock("@/components/ngo-landing/useNgoStatus", () => ({ useNgoStatus: () => ({ isVerified: true, isPhotosDue: false, canStartDrive: true, isLoading: false, error: null, refresh: vi.fn(), lockReason: null, driveLockReason: null, photosDueRequestName: null }) }));
vi.mock("@/features/ngo-drives/components/DriveLocationStep", () => ({ DriveLocationStep: () => <div data-testid="gps-fields">gps</div>, RADIUS_PRESETS: [10, 20, 30, 50, 100], radiusKm: () => 10 }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "donor@test", role: "DONOR" }, isLoading: false }) }));
vi.mock("@/features/handover/HandoverLocationField", () => ({
  HandoverLocationField: () => <div data-testid="handover-map">map</div>,
}));

import type { NgoDriveOfferResponse } from "@/lib/api";
import { driveDropOffAddress } from "./driveFormatters";
import { adaptNgoOffer, ngoOfferDropOffAddress } from "@/features/handover/adapters";
import { HandoverScheduleDialog } from "@/features/handover/HandoverScheduleDialog";
import { DriveDropOffPlanner, dropOffProblem } from "./components/DriveDropOffPlanner";
import { DriveHandoverHub } from "./components/DriveHandoverHub";


const offer = (over: Partial<NgoDriveOfferResponse> = {}) => ({
  id: 11, driveId: 5, donorDisplayName: "Asha", status: "NGO_ACCEPTED", quantity: 4, driveTitle: "Winter blankets",
  ngoName: "Hope Trust", driveQuantityNeeded: 50, driveQuantityReceived: 0, driveQuantityPledged: 4,
  driveLocationArea: "Shivajinagar", driveLocationCity: "Pune", driveLocationPincode: "411005",
  driveLocationLatitude: 18.53, driveLocationLongitude: 73.85, driveNeededBy: "2030-01-31",
  driveAvailableDays: ["MON", "WED"], driveAvailableFrom: "10:00", driveAvailableTo: "17:00",
  dropOffAddress: "Hope Trust, 12 FC Road, near Fergusson College, Pune 411005",
  handoverDetails: { organizationName: "Hope Trust", contactName: "Prachi", contactPhone: "9999999999" },
  media: [], handoverPhotos: [], receiptPhotos: [],
  ...over,
}) as NgoDriveOfferResponse;

beforeEach(() => vi.clearAllMocks());

describe("drive form: full drop-off address", () => {
  const renderForm = async () => {
    const Page = (await import("@/app/ngo/drives/new/page")).default;
    render(<Page />);
    return screen.findByLabelText(/Full address of the NGO \/ drop-off point/);
  };
  it("is a required textarea below the GPS fields, with an inline 10-300 error", async () => {
    const box = await renderForm();
    expect(box.tagName).toBe("TEXTAREA");
    expect(box).toBeRequired();
    expect(box).toHaveAttribute("maxLength", "300");
    expect(screen.getByTestId("gps-fields").compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(box, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Step 2/ }));
    expect(await screen.findByText("Enter the full address in 10 to 300 characters", { selector: "#dropOffAddress-error" })).toBeInTheDocument();
    expect(box).toHaveAttribute("aria-invalid", "true");
  });
  it("sends the value as dropOffAddress (server draft)", async () => {
    const box = await renderForm();
    fireEvent.change(box, { target: { value: "Hope Trust, 12 FC Road, Pune 411005" } });
    await waitFor(() => expect(api.saveNgoDriveDraft).toHaveBeenCalledWith(expect.objectContaining({ dropOffAddress: "Hope Trust, 12 FC Road, Pune 411005" })), { timeout: 6000 });
  });
});

describe("drive drop-off address fallback", () => {
  it("old drives fall back to locality + city + PIN", () => {
    expect(driveDropOffAddress({ dropOffAddress: "  12 FC Road, Pune  " })).toBe("12 FC Road, Pune");
    expect(driveDropOffAddress({ dropOffAddressDisplay: "Display", dropOffAddress: "Raw" })).toBe("Display");
    expect(driveDropOffAddress({ locationArea: "Shivajinagar", locationCity: "Pune", locationPincode: "411005" })).toBe("Shivajinagar, Pune, 411005");
    expect(ngoOfferDropOffAddress(offer({ dropOffAddress: null }))).toBe("Shivajinagar, Pune, 411005");
  });
});

describe("inside the radius: drop-off in the schedule popup", () => {
  it("has no map and shows the full address", () => {
    const base = adaptNgoOffer(offer({ dropOffOnly: false }), null, "donor@x.test", "DONOR")!;
    expect(base.methodOptions.some(o => o.value === "NGO_PICKUP")).toBe(true); // pickup still offered inside
    // Donor picks "drop off" (put it first so the popup opens on it).
    const vm = { ...base, methodOptions: [...base.methodOptions].sort((a) => (a.value === "DONOR_DROP_OFF" ? -1 : 1)) };
    render(<HandoverScheduleDialog vm={vm} open onOpenChange={vi.fn()} onSubmit={vi.fn()} isReschedule={false} />);
    expect(screen.getByTestId("drive-dropoff-details")).toHaveTextContent("12 FC Road, near Fergusson College");
    expect(screen.queryByTestId("handover-map")).toBeNull();
  });
});

describe("outside the radius: handover", () => {
  it("has no schedule button or method choice and shows the address first", () => {
    render(<DriveHandoverHub role="DONOR" offer={offer({ dropOffOnly: true })} handover={null} userEmail="donor@test" onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Schedule handover/ })).toBeNull();
    expect(screen.queryByText(/How will the items reach the NGO/)).toBeNull();
    const planner = screen.getByTestId("drive-dropoff-planner");
    const addr = screen.getByTestId("drive-dropoff-address");
    expect(addr).toHaveTextContent("12 FC Road, near Fergusson College");
    expect(planner.textContent!.indexOf("12 FC Road")).toBeLessThan(planner.textContent!.indexOf("When will you drop it off?"));
    expect(screen.getByRole("button", { name: /Copy address/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in Maps/ })).toHaveAttribute("href", expect.stringContaining("18.53,73.85"));
    expect(planner).toHaveTextContent("Prachi, 9999999999");
    expect(screen.getByTestId("drive-dropoff-allowed")).toHaveTextContent("Mon, Wed");
  });

  it("flags an out-of-hours time instantly and keeps save disabled", () => {
    render(<DriveDropOffPlanner offer={offer({ dropOffOnly: true })} onDone={vi.fn()} />);
    fireEvent.change(screen.getByTestId("drive-dropoff-date"), { target: { value: "2030-01-07" } }); // Monday
    fireEvent.change(screen.getByTestId("drive-dropoff-time"), { target: { value: "19:00" } });
    expect(screen.getByTestId("drive-dropoff-problem")).toHaveTextContent("Pick a time between 10:00 and 17:00.");
    expect(screen.getByTestId("drive-dropoff-time").className).toContain("border-red-600");
    expect(screen.getByRole("button", { name: /Save drop-off time/ })).toBeDisabled();
    fireEvent.change(screen.getByTestId("drive-dropoff-time"), { target: { value: "11:00" } });
    expect(screen.queryByTestId("drive-dropoff-problem")).toBeNull();
    expect(screen.getByRole("button", { name: /Save drop-off time/ })).not.toBeDisabled();
  });

  it("rejects dates after needed-by and wrong days (IST)", () => {
    const w = { availableDays: ["MON", "WED"], availableFrom: "10:00", availableTo: "17:00" };
    const now = new Date(Date.UTC(2030, 0, 1));
    expect(dropOffProblem(w, "2030-02-03", "11:00", "2030-01-31", now)).toMatch(/on or before/);
    expect(dropOffProblem(w, "2030-01-08", "11:00", "2030-01-31", now)).toMatch(/Mon, Wed only/);
    expect(dropOffProblem(w, "2030-01-07", "11:00", "2030-01-31", now)).toBeNull();
  });

  it("the NGO's handover shows the chosen time and the same address", () => {
    const handover = { id: 1, offerId: 11, method: "DROP_OFF", scheduledDateTime: "2030-01-07T11:00:00", locationAddress: null, rescheduleCount: 0, atRisk: false } as never;
    const vm = adaptNgoOffer(offer({ dropOffOnly: true, status: "HANDOVER_IN_PROGRESS" }), handover, "ngo@x.test", "DONEE")!;
    expect(vm.schedule?.address).toBe("Hope Trust, 12 FC Road, near Fergusson College, Pune 411005");
    expect(vm.schedule?.scheduledAt).toBeTruthy();
  });
});

describe("pickup flow unchanged", () => {
  it("inside the radius the donor still gets the Schedule handover button (popup with method + map)", () => {
    render(<DriveHandoverHub role="DONOR" offer={offer({ dropOffOnly: false })} handover={null} userEmail="donor@test" onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Schedule handover/ })).toBeInTheDocument();
    expect(screen.queryByTestId("drive-dropoff-planner")).toBeNull();
  });
  it("pickup keeps the donor's address on the record", () => {
    const handover = { id: 1, offerId: 11, method: "PICKUP", scheduledDateTime: "2030-01-07T11:00:00", locationAddress: "5 MG Road", rescheduleCount: 0, atRisk: false } as never;
    expect(adaptNgoOffer(offer(), handover, "d@x", "DONOR")!.schedule?.address).toBe("5 MG Road");
  });
});
