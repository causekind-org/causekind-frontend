import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// The handover pages render the full shared hub now: give them time on a busy machine.
vi.setConfig({ testTimeout: 20000 });
import { configure as configureRtl } from "@testing-library/react";
configureRtl({ asyncUtilTimeout: 8000 });

/**
 * The NGO drive flow on the frontend: no admin step for donor offers, the handover
 * plan comes from the server for both sides, the NGO adds receipt photos, uploads
 * use the session cookie, and NGOs get bell notifications.
 */

const api = vi.hoisted(() => ({
  getMyNotifications: vi.fn().mockResolvedValue([]),
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
// One router object for every render, as Next's is: the handover page's load effect
// depends on `router`, so a fresh object each render re-ran the load and a later
// successful call could replace the error screen before the test saw it.
vi.mock("next/navigation", () => {
  const router = { push: vi.fn(), replace: vi.fn() };
  return {
    useParams: () => ({ id: "7", offerId: "11" }),
    useRouter: () => router,
  };
});
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
    expect(await screen.findByTestId("hub")).toHaveTextContent("ready_to_handover");
    expect(api.getNgoDriveOfferForNgo).toHaveBeenCalledWith(7, 11);
    expect(api.getNgoDriveOfferHandover).toHaveBeenCalledWith(11);
    expect(api.getNgoDriveOffer).not.toHaveBeenCalled();
  });

  it("shows an error screen with a Retry button when the API fails instead of 404, and reloads on click", async () => {
    api.getNgoDriveOfferForNgo
      .mockRejectedValueOnce(new Error("Unable to reach server"))
      .mockResolvedValue(offer("HANDOVER_IN_PROGRESS"));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan);

    const Page = (await import("@/app/ngo/drives/[id]/offers/[offerId]/handover/page")).default;
    render(<Page />);

    expect(await screen.findByText("We couldn't load this handover")).toBeInTheDocument();
    expect(screen.getByText("Unable to reach server")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    expect(screen.queryByText("Handover not found")).toBeNull();

    fireEvent.click(retryBtn);
    expect(await screen.findByTestId("hub")).toHaveTextContent("ready_to_handover");
  });

  it("shows Handover not found only when the API returns 404", async () => {
    const notFoundErr = new Error("Not found");
    (notFoundErr as unknown as { status: number }).status = 404;
    api.getNgoDriveOfferForNgo.mockRejectedValueOnce(notFoundErr);

    const Page = (await import("@/app/ngo/drives/[id]/offers/[offerId]/handover/page")).default;
    render(<Page />);

    expect(await screen.findByText("Handover not found")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
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
    expect(await screen.findByTestId("hub")).toBeInTheDocument();
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
  it("NGO drive notices come from the server only (stored once, grouped); nothing is derived in the browser", async () => {
    vi.stubGlobal("EventSource", class { addEventListener() {} close() {} onerror = null; });
    api.getMyNotifications.mockResolvedValue([
      { id: "n-1", type: "match", title: "3 new offers on \"School bags\"", body: "Accept or decline them.", link: "/dashboard/ngo?tab=activity&filter=offers&drive=8", createdAt: "2026-10-17T10:00:00", read: false },
    ]);
    const { NotificationsProvider, useNotifications } = await import("@/hooks/useNotifications");
    function Titles() {
      const { notifications } = useNotifications();
      return <ul>{notifications.map((n) => <li key={n.id}>{n.title}</li>)}</ul>;
    }
    const wrap = ({ children }: { children: ReactNode }) => <NotificationsProvider>{children}</NotificationsProvider>;
    render(<Titles />, { wrapper: wrap });
    expect(await screen.findByText("3 new offers on \"School bags\"")).toBeInTheDocument();
    expect(screen.queryByText("Upload your distribution proof")).toBeNull();
    expect(api.getMyNgoDrives).not.toHaveBeenCalled();
    expect(api.getNgoDriveOffersForNgo).not.toHaveBeenCalled();
  });
});
