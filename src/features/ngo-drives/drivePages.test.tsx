import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NgoDriveOfferResponse, PublicNgoDrive } from "@/lib/api";

/**
 * Drive pages: only a real 404 says "Drive not found"; any other failure shows its
 * message with Retry. The donor's Give button follows who is looking and the drive state.
 */

const api = vi.hoisted(() => ({
  getNgoDrive: vi.fn(),
  getMyNgoDriveOffers: vi.fn(),
  getNgoDriveOffer: vi.fn(),
  createNgoDriveOfferDraft: vi.fn(),
  getNgoDriveDetail: vi.fn(),
  getNgoDriveOffersForNgo: vi.fn(),
  reviewNgoDriveOffer: vi.fn(),
  uploadDistributionProof: vi.fn(),
  closeNgoDrive: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), ...api }));

const auth = vi.hoisted(() => ({ user: null as null | { email: string; role: string } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: () => {} }));
const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "5" }), useRouter: () => nav }));
vi.mock("@/features/ngo-drives/components/NgoDriveOfferWizard", () => ({
  NgoDriveOfferWizard: ({ offerId, stillNeededQuantity }: { offerId: number; stillNeededQuantity: number }) =>
    <div data-testid="wizard">offer {offerId} · max {stillNeededQuantity}</div>,
}));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));

const drive = (extra: Partial<PublicNgoDrive> = {}): PublicNgoDrive => ({
  id: 5, title: "Winter blankets for the families", category: "Household", itemName: "blankets", quantityNeeded: 50,
  unit: "PIECES", urgency: "HIGH", neededBy: "2026-10-31", quantityPledged: 10, quantityReceived: 5, stillNeeded: 35,
  status: "LIVE", ngoOrganizationName: "Pet Foundation", ngoCity: "Virar", verified: true, description: "Winter is here",
  ...extra,
});
const offer = (status: string, extra: Partial<NgoDriveOfferResponse> = {}) =>
  ({ id: 9, driveId: 5, status, quantity: 4, donorDisplayName: "Asha", driveTitle: "Winter blankets", ...extra }) as NgoDriveOfferResponse;

async function apiError(status: number, message: string) {
  const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return new ApiError(status, message);
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  nav.replace.mockReset(); nav.push.mockReset();
  auth.user = { email: "donor@x.test", role: "DONOR" };
});

describe("giveState", () => {
  it("covers logged-out, wrong role, editable and active offers, and closed drives", async () => {
    const { giveState } = await import("@/features/ngo-drives/driveGiveState");
    expect(giveState(drive(), null, []).kind).toBe("login");
    expect(giveState(drive(), { role: "NGO_PARTNER" }, []).kind).toBe("wrong-role");
    expect(giveState(drive(), { role: "DONEE" }, []).kind).toBe("wrong-role");
    expect(giveState(drive(), { role: "ADMIN" }, []).kind).toBe("wrong-role");
    expect(giveState(drive(), { role: "DONOR" }, []).kind).toBe("give");
    expect(giveState(drive(), { role: "DONOR" }, [offer("DRAFT")]).kind).toBe("continue");
    const offered = giveState(drive(), { role: "DONOR" }, [offer("HANDOVER_IN_PROGRESS")]);
    expect(offered).toMatchObject({ kind: "offered", href: "/ngo-drive-offers/9/handover" });
    expect(giveState(drive(), { role: "DONOR" }, [offer("NGO_DECLINED")]).kind).toBe("give");
    expect(giveState(drive({ status: "FULLY_PLEDGED" }), { role: "DONOR" }, []).kind).toBe("closed");
  });
});

describe("donor drive page /drives/[id]", () => {
  const Page = async () => (await import("@/app/drives/[id]/page")).default;

  it("a non-404 error shows the message and Retry, not 'Drive not found'", async () => {
    api.getNgoDrive.mockRejectedValueOnce(await apiError(500, "Something went wrong on our end.")).mockResolvedValueOnce(drive());
    api.getMyNgoDriveOffers.mockResolvedValue([]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("Something went wrong on our end.")).toBeInTheDocument();
    expect(screen.queryByText(/Drive not found/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("heading", { name: /Winter blankets/ })).toBeInTheDocument();
  });

  it("a real 404 shows 'Drive not found'", async () => {
    api.getNgoDrive.mockRejectedValue(await apiError(404, "The requested item was not found."));
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("Drive not found")).toBeInTheDocument();
  });

  it("still shows the drive when the donor's offers fail to load", async () => {
    api.getNgoDrive.mockResolvedValue(drive());
    api.getMyNgoDriveOffers.mockRejectedValue(await apiError(500, "Offers are unavailable"));
    const P = await Page();
    render(<P />);
    expect(await screen.findByRole("heading", { name: /Winter blankets/ })).toBeInTheDocument();
    expect(await screen.findByText(/Offers are unavailable/)).toBeInTheDocument();
  });

  it("shows progress numbers and the Give link for a donor", async () => {
    api.getNgoDrive.mockResolvedValue(drive());
    api.getMyNgoDriveOffers.mockResolvedValue([]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByRole("link", { name: "Give to this drive" })).toHaveAttribute("href", "/drives/5/give");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "15");
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("an NGO account sees no Give button, only an explanation", async () => {
    auth.user = { email: "ngo@x.test", role: "NGO_PARTNER" };
    api.getNgoDrive.mockResolvedValue(drive());
    const P = await Page();
    render(<P />);
    expect(await screen.findByText(/NGO accounts run drives/)).toBeInTheDocument();
    expect(screen.queryByText("Give to this drive")).toBeNull();
    expect(api.getMyNgoDriveOffers).not.toHaveBeenCalled();
  });

  it("a fully pledged drive disables the button with the reason", async () => {
    api.getNgoDrive.mockResolvedValue(drive({ status: "FULLY_PLEDGED" }));
    api.getMyNgoDriveOffers.mockResolvedValue([]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByRole("button", { name: "Give to this drive" })).toBeDisabled();
    expect(screen.getByText(/Every item for this drive has been offered/)).toBeInTheDocument();
  });
});

describe("give page /drives/[id]/give", () => {
  const Page = async () => (await import("@/app/drives/[id]/give/page")).default;

  it("logged out → login with ?next= back to the give page", async () => {
    auth.user = null;
    const P = await Page();
    render(<P />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?next=%2Fdrives%2F5%2Fgive"));
  });

  it("a donor with no offer gets a new draft and the wizard (max = still needed)", async () => {
    api.getNgoDrive.mockResolvedValue(drive());
    api.getMyNgoDriveOffers.mockResolvedValue([]);
    api.createNgoDriveOfferDraft.mockResolvedValue({ id: 9 });
    api.getNgoDriveOffer.mockResolvedValue(offer("DRAFT"));
    const P = await Page();
    render(<P />);
    expect(await screen.findByTestId("wizard")).toHaveTextContent("offer 9 · max 35");
  });

  it("a donor with a draft reopens it instead of creating another", async () => {
    api.getNgoDrive.mockResolvedValue(drive());
    api.getMyNgoDriveOffers.mockResolvedValue([offer("DRAFT", { id: 4 })]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByTestId("wizard")).toHaveTextContent("offer 4");
    expect(api.createNgoDriveOfferDraft).not.toHaveBeenCalled();
  });

  it("a donor who already offered sees that, with a link to their handover", async () => {
    api.getNgoDrive.mockResolvedValue(drive());
    api.getMyNgoDriveOffers.mockResolvedValue([offer("NGO_ACCEPTED")]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("You already offered to this drive")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open your handover" })).toHaveAttribute("href", "/ngo-drive-offers/9/handover");
  });

  it("a drive that isn't LIVE explains why instead of opening the wizard", async () => {
    api.getNgoDrive.mockResolvedValue(drive({ status: "COLLECTION_COMPLETE" }));
    api.getMyNgoDriveOffers.mockResolvedValue([]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("This drive isn't taking offers")).toBeInTheDocument();
    expect(api.createNgoDriveOfferDraft).not.toHaveBeenCalled();
  });

  it("a wrong role sees a short explanation", async () => {
    auth.user = { email: "donee@x.test", role: "DONEE" };
    api.getNgoDrive.mockResolvedValue(drive());
    const P = await Page();
    render(<P />);
    expect(await screen.findByText(/needs a donor account/)).toBeInTheDocument();
  });

  it("a non-404 error shows the message and Retry, never 'Drive not found'", async () => {
    api.getNgoDrive.mockResolvedValue(drive());
    api.getMyNgoDriveOffers.mockRejectedValueOnce(await apiError(500, "Something went wrong on our end.")).mockResolvedValueOnce([offer("DRAFT")]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("Something went wrong on our end.")).toBeInTheDocument();
    expect(screen.queryByText(/Drive not found/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByTestId("wizard")).toBeInTheDocument();
  });
});

describe("NGO drive page /ngo/drives/[id]", () => {
  const Page = async () => (await import("@/app/ngo/drives/[id]/page")).default;
  const ngoDrive = (extra: Record<string, unknown> = {}) => ({
    ...drive(), itemCondition: "NEW_OR_GENTLY_USED", beneficiaryGroup: "Families", beneficiaryCount: 50,
    availableDays: "MON,TUE", availableFrom: "10:00", availableTo: "17:00", contactName: "Prachi", contactPhone: "9999999999",
    createdAt: "2026-10-01", ...extra,
  });
  beforeEach(() => { auth.user = { email: "ngo@x.test", role: "NGO_PARTNER" }; });

  it("shows the drive, its details, progress and the offers to review", async () => {
    api.getNgoDriveDetail.mockResolvedValue(ngoDrive());
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer("PENDING_NGO_REVIEW"), offer("HANDOVER_IN_PROGRESS", { id: 10 })]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByRole("heading", { name: /Winter blankets/ })).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("MON, TUE, 10:00–17:00")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Offers to review (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accept/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Handovers (1)" }));
    expect(screen.getByRole("link", { name: "Open handover" })).toHaveAttribute("href", "/ngo/drives/5/offers/10/handover");
  });

  it("a failing offers call still shows the drive, with Retry for the offers", async () => {
    api.getNgoDriveDetail.mockResolvedValue(ngoDrive());
    api.getNgoDriveOffersForNgo.mockRejectedValue(await apiError(403, "You don't have access to this."));
    const P = await Page();
    render(<P />);
    expect(await screen.findByRole("heading", { name: /Winter blankets/ })).toBeInTheDocument();
    expect(screen.getByText(/You don't have access to this./)).toBeInTheDocument();
    expect(screen.queryByText(/Drive not found/i)).toBeNull();
  });

  it("a non-404 drive error shows the message and Retry; a 404 shows 'Drive not found'", async () => {
    api.getNgoDriveDetail.mockRejectedValueOnce(await apiError(500, "Something went wrong on our end."));
    const P = await Page();
    const { unmount } = render(<P />);
    expect(await screen.findByText("Something went wrong on our end.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    unmount();
    api.getNgoDriveDetail.mockRejectedValueOnce(await apiError(404, "The requested item was not found."));
    render(<P />);
    expect(await screen.findByText("Drive not found")).toBeInTheDocument();
  });

  it("collection complete opens the proof tab with people reached", async () => {
    api.getNgoDriveDetail.mockResolvedValue(ngoDrive({ status: "COLLECTION_COMPLETE", quantityReceived: 20 }));
    api.getNgoDriveOffersForNgo.mockResolvedValue([]);
    const P = await Page();
    render(<P />);
    expect(await screen.findByLabelText("People reached")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit proof/ })).toBeInTheDocument();
  });
});
