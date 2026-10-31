import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DonorPickupPersonCard, WhoConfirmed } from "./DonorPickupPerson";
import { DriveHandoverPage } from "./DriveHandoverPage";
import { NgoAcceptedOffersList } from "@/components/matches/NgoAcceptedOffers";
import { HiddenOnVolunteerPage } from "@/components/HiddenOnVolunteerPage";
import { adaptNgoOffer } from "@/features/handover/adapters";
import { PhotoCaptureDialog } from "./PhotoCaptureDialog";
import { getNgoDriveOffer, getNgoDriveOfferHandover, setVolunteerCallPermission } from "@/lib/api";

const live: { fire?: () => void } = {};
let path = "/dashboard";
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: (_t: string[], cb: () => void) => { live.fire = cb; } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "donor@test", role: "DONOR" }, isLoading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => path, useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("./DriveHandoverHub", () => ({
  DriveHandoverHub: ({ offer }: { offer: { assignedPerson?: { name: string } | null } }) => <p>{offer.assignedPerson ? `assigned ${offer.assignedPerson.name}` : "nobody yet"}</p>,
}));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  setVolunteerCallPermission: vi.fn(), getNgoDriveOffer: vi.fn(), getNgoDriveOfferHandover: vi.fn(), getNgoDriveOfferForNgo: vi.fn(),
}));

const offer = (over = {}) => ({ id: 7, driveId: 3, ngoName: "Hope Trust", status: "HANDOVER_IN_PROGRESS", donorAllowsVolunteerCall: false, ...over }) as never;
const handover = { method: "PICKUP", scheduledDateTime: "2026-11-05T10:00:00Z" } as never;

beforeEach(() => {
  vi.clearAllMocks();
  path = "/dashboard";
  vi.mocked(setVolunteerCallPermission).mockResolvedValue(undefined);
});

describe("Donor's pickup person", () => {
  it("before assignment, says someone will be assigned soon", () => {
    render(<DonorPickupPersonCard offer={offer()} handover={handover} onChanged={vi.fn()} />);
    expect(screen.getByTestId("donor-pickup-person")).toHaveTextContent("The NGO will assign someone for the pickup soon.");
  });

  it("names the assigned person, role, NGO and time, in IST as stored", () => {
    render(<DonorPickupPersonCard offer={offer({ assignedPerson: { name: "Ravi", role: "Driver" } })} handover={handover} onChanged={vi.fn()} />);
    const card = screen.getByTestId("donor-pickup-person");
    expect(card).toHaveTextContent("Ravi (Driver) from Hope Trust will pick up your items");
    expect(card).toHaveTextContent(/10:00 am IST/);
  });

  it("the call consent can be changed on the page, off by default", async () => {
    const onChanged = vi.fn();
    render(<DonorPickupPersonCard offer={offer()} handover={handover} onChanged={onChanged} />);
    const box = screen.getByRole("checkbox", { name: "Let the pickup person call me" });
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    await waitFor(() => expect(setVolunteerCallPermission).toHaveBeenCalledWith(7, true));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("Call dials the assigned person only when the NGO allows it, and the drive's contacts are not used", () => {
    const vm = (o: object) => adaptNgoOffer(offer({ quantity: 1, ...o }), handover, "donor@test", "DONOR")!;
    const details = { handoverDetails: { contactPhone: "+919000000000", contacts: [{ name: "Other", phone: "+919000000000" }] } };
    expect(vm({ ...details, assignedPerson: { name: "Ravi", phone: "+919812345678" } }).counterpart).toEqual({ name: "Ravi", phone: "+919812345678", chatName: "Hope Trust & Ravi" });
    expect(vm({ ...details, assignedPerson: { name: "Ravi", phone: null } }).counterpart).toEqual({ name: "Ravi", phone: null, chatName: "Hope Trust & Ravi" });
    expect(vm({}).counterpart.chatName).toBeUndefined();
    expect(vm({}).counterpart.name).toBe("Hope Trust");
    expect(vm({}).awaitingPickupPerson).toBe(true);
    expect(vm({ assignedPerson: { name: "Ravi" } }).awaitingPickupPerson).toBe(false);
    expect(vm({ status: "ISSUE_WINDOW_OPEN" }).awaitingPickupPerson).toBe(false);
  });

  it("shows who confirmed the code and who added the photo", () => {
    render(<WhoConfirmed handover={{ confirmation: { codeConfirmedBy: "Ravi", photoAddedBy: "the NGO" } } as never} />);
    const who = screen.getByTestId("who-confirmed");
    expect(who).toHaveTextContent("Code confirmed by Ravi");
    expect(who).toHaveTextContent("Photo added by the NGO");
  });

  it("nothing to show before anyone confirmed", () => {
    const { container } = render(<WhoConfirmed handover={{ confirmation: { otpVerified: false } } as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("the page refreshes live when the NGO assigns someone", async () => {
    vi.mocked(getNgoDriveOfferHandover).mockResolvedValue(handover);
    vi.mocked(getNgoDriveOffer).mockResolvedValue(offer());
    render(<DriveHandoverPage role="DONOR" offerId={7} />);
    expect(await screen.findByText("nobody yet")).toBeInTheDocument();
    vi.mocked(getNgoDriveOffer).mockResolvedValue(offer({ assignedPerson: { name: "Ravi" } }));
    await act(async () => { live.fire?.(); });
    expect(await screen.findByText("assigned Ravi")).toBeInTheDocument();
  });

  it("the Matches card shows who picks up", () => {
    render(<NgoAcceptedOffersList offers={[offer({ driveTitle: "Blankets", assignedPerson: { name: "Ravi" } })]} />);
    expect(screen.getByTestId("pickup-by")).toHaveTextContent("Pickup by Ravi");
  });
});

describe("Volunteer page exclusions", () => {
  it("global overlays, docks and redirects stay off the volunteer page only", () => {
    const { rerender } = render(<HiddenOnVolunteerPage><p>overlay</p></HiddenOnVolunteerPage>);
    expect(screen.getByText("overlay")).toBeInTheDocument();
    path = "/volunteer-handover";
    rerender(<HiddenOnVolunteerPage><p>overlay</p></HiddenOnVolunteerPage>);
    expect(screen.queryByText("overlay")).toBeNull();
  });

  it("a blocked camera shows only the given message, with no way to pick a file", async () => {
    vi.stubGlobal("isSecureContext", false);
    render(<PhotoCaptureDialog open onCancel={vi.fn()} onCaptured={vi.fn()} unavailableMessage="Allow camera access in your browser settings and reload." />);
    expect(await screen.findByText("Allow camera access in your browser settings and reload.")).toBeInTheDocument();
    expect(screen.queryByText(/Choose a photo/)).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    vi.unstubAllGlobals();
  });
});
