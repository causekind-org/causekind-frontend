import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * The NGO drive flow on the frontend: no admin step for donor offers, the handover
 * plan comes from the server for both sides, the NGO adds receipt photos, uploads
 * use the session cookie, and NGOs get bell notifications.
 */

const api = vi.hoisted(() => ({
  getNgoDriveOffer: vi.fn(),
  getNgoDriveOfferForNgo: vi.fn(),
  getNgoDriveOfferHandover: vi.fn(),
  uploadNgoDriveReceiptPhotos: vi.fn(),
  confirmNgoDriveOfferHandoverNgo: vi.fn(),
  scheduleNgoDriveOfferHandover: vi.fn(),
  rescheduleNgoDriveOfferHandover: vi.fn(),
  generateNgoDriveOfferHandoverOtp: vi.fn(),
  confirmNgoDriveOfferHandoverDonor: vi.fn(),
  adminGetNgoDriveOffers: vi.fn(),
  adminGetNgoDriveOffer: vi.fn(),
  getMyNgoDrives: vi.fn(),
  getNgoDriveOffersForNgo: vi.fn(),
  getMyNgoDriveOffers: vi.fn(),
  getMyMatches: vi.fn(),
  getMyItemRequests: vi.fn(),
  getMyItemListings: vi.fn(),
  getOffersForMyRequests: vi.fn(),
  getMyDonationOffers: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), ...api }));

const auth = vi.hoisted(() => ({ user: { email: "ngo@x.test", role: "NGO_PARTNER" } as { email: string; role: string } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: () => {} }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "7", offerId: "11" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/features/handover/HandoverHubShell", () => ({
  HandoverHubShell: ({ vm }: { vm: { state: string } }) => <div data-testid="hub">{vm.state}</div>,
}));
vi.mock("@/components/handover/HandoverCelebration", () => ({ default: () => null }));

const offer = (status: string, extra: Record<string, unknown> = {}) => ({
  id: 11, driveId: 7, donorDisplayName: "Asha", status, quantity: 3, driveTitle: "Winter blankets",
  ngoName: "Helping Hands", driveQuantityNeeded: 10, driveQuantityReceived: 0, driveQuantityPledged: 3,
  driveStillNeeded: 7, media: [], receiptPhotos: [], ...extra,
});
const plan = { id: 1, offerId: 11, method: "DROP_OFF", scheduledDateTime: "2026-10-10T10:00:00", locationAddress: "Pune",
  locationLatitude: null, locationLongitude: null, rescheduleCount: 0, atRisk: false, confirmation: null };

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  auth.user = { email: "ngo@x.test", role: "NGO_PARTNER" };
});
afterEach(() => vi.unstubAllGlobals());

describe("handover state for drive offers", () => {
  it("an NGO-accepted offer waits for the donor's plan; declined and ended offers are closed", async () => {
    const { resolveHandoverState } = await import("@/features/handover/model");
    const base = { flow: "NGO_OFFER" as const, hasSchedule: false, atRisk: false, donorConfirmedAt: null, doneeConfirmedAt: null };
    expect(resolveHandoverState({ ...base, status: "NGO_ACCEPTED" })).toBe("awaiting_schedule");
    expect(resolveHandoverState({ ...base, status: "NGO_DECLINED" })).toBe("cancelled_or_failed");
    expect(resolveHandoverState({ ...base, status: "ENDED" })).toBe("cancelled_or_failed");
  });
});

describe("uploads use the API host and the session cookie", () => {
  it("sends donor photos, receipt photos and every distribution proof photo with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ([]), text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const a = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const b = new File(["b"], "b.jpg", { type: "image/jpeg" });

    await real.uploadNgoDriveOfferMedia(11, new FormData());
    await real.uploadDistributionProof(7, [a, b], 42);
    await real.uploadNgoDriveReceiptPhotos(7, 11, [a]);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toMatch(/^https?:\/\/.+\/api\/v1\/drive-offers\/11\/media$/);
    expect(urls[1]).toMatch(/\/api\/v1\/ngo-drives\/7\/distribution-proof$/);
    expect(urls[2]).toMatch(/\/api\/v1\/ngo-drives\/7\/offers\/11\/receipt-photos$/);
    fetchMock.mock.calls.forEach((c) => expect(c[1].credentials).toBe("include"));
    expect((fetchMock.mock.calls[1][1].body as FormData).getAll("files")).toHaveLength(2);
    expect((fetchMock.mock.calls[1][1].body as FormData).get("beneficiariesReached")).toBe("42");
  });
});

describe("NGO handover page", () => {
  it("loads the offer through the NGO endpoint, the plan from the server, and asks for receipt photos", async () => {
    api.getNgoDriveOfferForNgo.mockResolvedValue(offer("HANDOVER_IN_PROGRESS"));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan);
    const Page = (await import("@/app/ngo/drives/[id]/offers/[offerId]/handover/page")).default;
    render(<Page />);
    expect(await screen.findByText("a. Photograph the items you received")).toBeInTheDocument();
    expect(api.getNgoDriveOfferForNgo).toHaveBeenCalledWith(7, 11);
    expect(api.getNgoDriveOfferHandover).toHaveBeenCalledWith(11);
    expect(api.getNgoDriveOffer).not.toHaveBeenCalled();
  });
});

describe("donor handover page", () => {
  it("reads the planned handover from the server, not from this browser's storage", async () => {
    auth.user = { email: "donor@x.test", role: "DONOR" };
    api.getNgoDriveOffer.mockResolvedValue(offer("NGO_ACCEPTED"));
    api.getNgoDriveOfferHandover.mockResolvedValue(null);
    const Page = (await import("@/app/ngo-drive-offers/[id]/handover/page")).default;
    render(<Page />);
    // Accepted and not planned yet: the donor gets the plan form (step 2).
    expect(await screen.findByRole("button", { name: "Confirm the plan" })).toBeInTheDocument();
    expect(api.getNgoDriveOfferHandover).toHaveBeenCalledWith(7);
  });
});

describe("admin drive offers", () => {
  it("is monitor only: no approve or reject controls", async () => {
    api.adminGetNgoDriveOffers.mockResolvedValue([{ id: 3, status: "PENDING_ADMIN_APPROVAL", driveId: 7, driveTitle: "Winter blankets" }]);
    const { NgoDriveOffersPanel } = await import("@/app/admin/ngo-drives/NgoDriveAdminPanels");
    render(<NgoDriveOffersPanel />);
    expect(await screen.findByText(/Winter blankets/)).toBeInTheDocument();
    expect(screen.getByText(/Read only/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
    expect(api.adminGetNgoDriveOffers).toHaveBeenCalledWith("IN_HANDOVER");
  });
});

describe("NGO bell notifications", () => {
  it("NGO partners get drive notifications (collection complete, new offers)", async () => {
    vi.stubGlobal("EventSource", class { addEventListener() {} close() {} onerror = null; });
    api.getMyNgoDrives.mockResolvedValue([
      { id: 7, title: "Winter blankets", status: "COLLECTION_COMPLETE", createdAt: "2026-10-01T00:00:00" },
      { id: 8, title: "School bags", status: "LIVE", createdAt: "2026-10-01T00:00:00" },
    ]);
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer("PENDING_NGO_REVIEW", { id: 12 })]);
    const { NotificationsProvider, useNotifications } = await import("@/hooks/useNotifications");
    function Titles() {
      const { notifications } = useNotifications();
      return <ul>{notifications.map((n) => <li key={n.id}>{n.title}</li>)}</ul>;
    }
    const wrap = ({ children }: { children: ReactNode }) => <NotificationsProvider>{children}</NotificationsProvider>;
    render(<Titles />, { wrapper: wrap });
    await waitFor(() => expect(screen.getByText("Upload your distribution proof")).toBeInTheDocument());
    expect(screen.getByText("New offer to review")).toBeInTheDocument();
    expect(api.getNgoDriveOffersForNgo).toHaveBeenCalledWith(8, "PENDING_NGO_REVIEW");
  });
});
