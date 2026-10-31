import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, back: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => "/dashboard/ngo",
}));
const api = vi.hoisted(() => ({
  getNgoDriveOffersForNgo: vi.fn(),
  reviewNgoDriveOffer: vi.fn(),
  reviewNgoDriveOffersBulk: vi.fn(),
  releaseNgoDriveOffer: vi.fn(),
  uploadDistributionProof: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
const live = vi.hoisted(() => ({ listeners: [] as { types: string[]; cb: () => void }[] }));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: (types: string[], cb: () => void) => { live.listeners.push({ types, cb }); } }));
vi.mock("@/features/ngo-drives/components/DriveOfferChatPanel", () => ({ DriveOfferChatPanel: ({ offerId }: { offerId: number }) => <div data-testid="chat">chat {offerId}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 11, email: "ngo@x.test", role: "NGO_PARTNER" }, isLoading: false }) }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { NgoDashboardSections } from "./NgoDashboardSections";

export const drive = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id, status, title: `Drive ${id}`, category: "Clothing", itemName: "Jackets", unit: "PIECES", quantityNeeded: 20,
  quantityReceived: 0, quantityPledged: 0, beneficiaryCount: 50, beneficiaryGroup: "children", neededBy: "2026-12-01",
  createdAt: `2026-10-0${id}`, ...extra,
});
export const offer = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id, status, quantity: 3, donorDisplayName: `Donor ${id}`, condition: "Like New", media: [], submittedAt: `2026-10-1${id}T10:00:00`, ...extra,
});

const renderSections = (drives: unknown[]) => render(
  <NgoDashboardSections drives={drives as never} verified loading={false} error={false} onRetry={vi.fn()} startDrive={<Link href="/ngo/drives/new">Start a Drive</Link>} />,
);

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
});

describe("NGO dashboard: 3 tabs", () => {
  it("shows Your Drives, Activity and History; Activity gets a green dot when an offer waits", async () => {
    api.getNgoDriveOffersForNgo.mockImplementation(async (id: number) => (id === 1 ? [offer(1, "PENDING_NGO_REVIEW"), offer(2, "HANDOVER_IN_PROGRESS")] : []));
    renderSections([drive(1, "LIVE"), drive(2, "PENDING_REVIEW"), drive(3, "CLOSED")]);
    expect(screen.getByTestId("ngo-tab-drives")).toHaveTextContent("Your Drives");
    await waitFor(() => expect(screen.getByTestId("ngo-tab-activity")).toHaveTextContent("Activity2"));
    expect(screen.getByTestId("ngo-tab-activity-dot")).toBeInTheDocument();
    expect(screen.queryByTestId("ngo-tab-history-dot")).toBeNull();
    // Drive card: "1 offer to review", and it opens the drive page.
    const card = screen.getAllByTestId("ngo-drive-card").find((c) => c.textContent?.includes("Drive 1"))!;
    expect(within(card).getByTestId("drive-card-pending")).toHaveTextContent("1 offer to review");
    expect(within(card).getByRole("link")).toHaveAttribute("href", "/ngo/drives/1");
  });

  it("chips: In review = PENDING_REVIEW+CHANGES_REQUESTED, Live = LIVE+FULLY_PLEDGED, Drive completed = COLLECTION_COMPLETE+PROOF_SUBMITTED; approved/ended drives leave for History", async () => {
    api.getNgoDriveOffersForNgo.mockResolvedValue([]);
    renderSections([drive(1, "LIVE"), drive(2, "FULLY_PLEDGED"), drive(3, "CHANGES_REQUESTED"), drive(4, "PROOF_SUBMITTED"), drive(7, "COLLECTION_COMPLETE"),
      drive(5, "CLOSED"), drive(6, "FULFILLED"), drive(8, "REJECTED")]);
    const titles = () => screen.getAllByTestId("ngo-drive-card").map((c) => within(c).getByRole("heading").textContent).sort();
    expect(titles()).toEqual(["Drive 1", "Drive 2", "Drive 3", "Drive 4", "Drive 7"]);
    expect(screen.getByTestId("ngo-tab-history")).toHaveTextContent(/History\s*3/);
    fireEvent.click(screen.getByTestId("drive-chip-live"));
    expect(titles()).toEqual(["Drive 1", "Drive 2"]);
    fireEvent.click(screen.getByTestId("drive-chip-review"));
    expect(titles()).toEqual(["Drive 3"]);
    fireEvent.click(screen.getByTestId("drive-chip-completed"));
    expect(screen.getByTestId("drive-chip-completed")).toHaveTextContent("Drive completed");
    expect(titles()).toEqual(["Drive 4", "Drive 7"]);
    expect(screen.getAllByTestId("drive-status-label").map((l) => l.textContent).sort()).toEqual(["Collection complete", "Proof submitted"]);
  });

  it("?tab=activity opens Activity; switching tabs writes ?tab= and drops the Activity filter", async () => {
    api.getNgoDriveOffersForNgo.mockResolvedValue([]);
    nav.params = new URLSearchParams("tab=activity&filter=offers&drive=1");
    renderSections([drive(1, "LIVE")]);
    expect(screen.getByTestId("ngo-tab-activity")).toHaveAttribute("data-state", "active");
    fireEvent.mouseDown(screen.getByTestId("ngo-tab-history"));
    expect(nav.replace).toHaveBeenCalledWith("/dashboard/ngo?tab=history", { scroll: false });
  });

  it("no drives: the existing Start a Drive control shows", async () => {
    renderSections([]);
    expect(screen.getByRole("link", { name: "Start a Drive" })).toHaveAttribute("href", "/ngo/drives/new");
  });
});

describe("Activity: offers to review", { timeout: 20000 }, () => {
  const live = drive(1, "LIVE", { quantityPledged: 9 });
  const pending = [
    offer(1, "PENDING_NGO_REVIEW", { quantity: 5, condition: "Good", distanceKm: 8, submittedAt: "2026-10-12T10:00:00" }),
    offer(2, "PENDING_NGO_REVIEW", { quantity: 2, condition: "Unused", distanceKm: 2, submittedAt: "2026-10-11T10:00:00" }),
    offer(3, "HANDOVER_IN_PROGRESS", { quantity: 2 }),
  ];
  const open = async (params: string) => {
    nav.params = new URLSearchParams(params);
    api.getNgoDriveOffersForNgo.mockResolvedValue(pending);
    renderSections([live]);
    await screen.findAllByTestId("offer-review-card");
  };
  const donors = () => screen.getAllByTestId("offer-review-card").map((c) => within(c).getByRole("heading").textContent);

  it("lists only PENDING_NGO_REVIEW, oldest first, with the live 'Offer / Drive still needs' line; sorting works", async () => {
    await open("tab=activity&filter=offers");
    expect(donors()).toEqual(["Donor 2", "Donor 1"]);
    expect(screen.getAllByTestId("offer-vs-need")[0]).toHaveTextContent("Offer: 2 Pieces · Drive still needs: 11");
    fireEvent.change(screen.getByTestId("offer-sort"), { target: { value: "quantity" } });
    expect(donors()).toEqual(["Donor 1", "Donor 2"]);
    fireEvent.change(screen.getByTestId("offer-sort"), { target: { value: "distance" } });
    expect(donors()).toEqual(["Donor 2", "Donor 1"]);
    expect(screen.getByTestId("activity-chip-handovers")).toHaveTextContent(/Handovers\s*1/);
  });

  it("one-click accept sends the full offered quantity, with no dialog", async () => {
    api.reviewNgoDriveOffer.mockResolvedValue({});
    await open("tab=activity&filter=offers");
    const card = screen.getAllByTestId("offer-review-card").find((c) => c.textContent?.includes("Donor 1"))!;
    fireEvent.click(within(card).getByRole("button", { name: "Accept" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("accept-qty")).toBeNull();
    await waitFor(() => expect(api.reviewNgoDriveOffer).toHaveBeenCalledWith(1, 1, "ACCEPT", undefined, 5));
    expect(api.reviewNgoDriveOffer).toHaveBeenCalledTimes(1);
  });

  it("bulk: Accept selected and Decline selected (with a reason) per drive", async () => {
    api.reviewNgoDriveOffersBulk.mockResolvedValue([]);
    await open("tab=activity&filter=offers");
    screen.getAllByRole("checkbox").forEach((c) => fireEvent.click(c));
    expect(screen.getByTestId("bulk-bar")).toHaveTextContent("2 selected");
    fireEvent.click(screen.getByRole("button", { name: "Accept selected" }));
    await waitFor(() => expect(api.reviewNgoDriveOffersBulk).toHaveBeenCalledWith(1, expect.arrayContaining([1, 2]), "ACCEPT"));
    screen.getAllByRole("checkbox").forEach((c) => { if (!(c as HTMLInputElement).checked) fireEvent.click(c); });
    fireEvent.click(screen.getByRole("button", { name: "Decline selected" }));
    fireEvent.change(await screen.findByTestId("decline-reason"), { target: { value: "Too many" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Decline" }).at(-1)!);
    await waitFor(() => expect(api.reviewNgoDriveOffersBulk).toHaveBeenCalledWith(1, expect.arrayContaining([1, 2]), "DECLINE", "Too many"));
  });

  it("a fully pledged drive labels its pending offers 'Drive covered' and offers 'Decline all remaining'", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=offers");
    api.getNgoDriveOffersForNgo.mockResolvedValue(pending);
    api.reviewNgoDriveOffersBulk.mockResolvedValue([]);
    renderSections([drive(1, "FULLY_PLEDGED")]);
    expect((await screen.findAllByText("Drive covered")).length).toBe(2);
    fireEvent.click(screen.getByTestId("decline-remaining"));
    expect(screen.getByTestId("decline-reason")).toHaveValue("This drive is now covered. Thank you for offering.");
    fireEvent.click(screen.getAllByRole("button", { name: "Decline" }).at(-1)!);
    await waitFor(() => expect(api.reviewNgoDriveOffersBulk).toHaveBeenCalledWith(1, expect.arrayContaining([1, 2]), "DECLINE", "This drive is now covered. Thank you for offering."));
  });

  it("?drive= narrows Activity to one drive", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=offers&drive=2");
    api.getNgoDriveOffersForNgo.mockImplementation(async (id: number) => (id === 1 ? pending : [offer(9, "PENDING_NGO_REVIEW")]));
    renderSections([live, drive(2, "LIVE")]);
    await waitFor(() => expect(donors()).toEqual(["Donor 9"]));
    expect(screen.getByTestId("activity-drive-filter")).toHaveTextContent("Showing Drive 2");
  });
});

describe("Activity: handovers", { timeout: 20000 }, () => {
  it("each handover card has a Scheduled / Received / Issue label", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=handovers");
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer(1, "HANDOVER_IN_PROGRESS"), offer(2, "ISSUE_WINDOW_OPEN"), offer(3, "ISSUE_RAISED")]);
    renderSections([drive(1, "LIVE")]);
    await waitFor(() => expect(screen.getByTestId("handover-status-label")).toHaveTextContent("Scheduled"));
    fireEvent.click(screen.getByTestId("handover-chip-received"));
    expect(screen.getByTestId("handover-status-label")).toHaveTextContent("Received");
    fireEvent.click(screen.getByTestId("handover-chip-issues"));
    expect(screen.getByTestId("handover-status-label")).toHaveTextContent("Issue");
  });

  it("chips map the real statuses; rows have Chat, Open handover, Cancel (with reason); no Mark received", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=handovers");
    api.getNgoDriveOffersForNgo.mockResolvedValue([
      offer(1, "NGO_ACCEPTED"), offer(2, "HANDOVER_IN_PROGRESS", { handoverMethod: "NGO_PICKUP" }), offer(3, "ISSUE_WINDOW_OPEN"), offer(4, "HANDOVER_AT_RISK"), offer(5, "PENDING_NGO_REVIEW"),
    ]);
    api.releaseNgoDriveOffer.mockResolvedValue({});
    renderSections([drive(1, "LIVE")]);
    await waitFor(() => expect(screen.getAllByTestId("handover-row")).toHaveLength(2));
    expect(screen.getByTestId("handover-chip-received")).toHaveTextContent(/Received\s*1/);
    expect(screen.getByTestId("handover-chip-issues")).toHaveTextContent(/Issues\s*1/);
    expect(screen.queryByRole("button", { name: /mark received/i })).toBeNull();
    const [accepted, planned] = screen.getAllByTestId("handover-row");
    expect(within(planned).getByRole("link", { name: "Open handover" })).toHaveAttribute("href", "/ngo/drives/1/offers/2/handover");
    expect(within(planned).queryByRole("button", { name: "Cancel" })).toBeNull();
    fireEvent.click(within(planned).getByRole("button", { name: "Chat" }));
    expect(screen.getByTestId("chat")).toHaveTextContent("chat 2");
    fireEvent.click(within(accepted).getByRole("button", { name: "Cancel" }));
    fireEvent.change(await screen.findByTestId("cancel-reason"), { target: { value: "Storage full" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel handover" }));
    await waitFor(() => expect(api.releaseNgoDriveOffer).toHaveBeenCalledWith(1, 1, "Storage full"));
    fireEvent.click(screen.getByTestId("handover-chip-issues"));
    expect(screen.getAllByTestId("handover-row")).toHaveLength(1);
  });
});

describe("Activity: proof due", { timeout: 20000 }, () => {
  it("lists COLLECTION_COMPLETE drives with the deadline; the upload sends every required detail", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=proof");
    api.getNgoDriveOffersForNgo.mockResolvedValue([]);
    api.uploadDistributionProof.mockResolvedValue(undefined);
    const due = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 19);
    renderSections([drive(1, "COLLECTION_COMPLETE", { quantityReceived: 12, proofDueAt: due }), drive(2, "PROOF_SUBMITTED")]);
    // Proof due includes a submitted proof, labelled "Waiting for admin".
    expect(await screen.findAllByTestId("proof-due-drive")).toHaveLength(2);
    expect(screen.getByTestId("proof-waiting-admin")).toHaveTextContent("Waiting for admin");
    expect(screen.getByTestId("proof-deadline")).toHaveTextContent("Due in 2 days");
    expect(screen.getByTestId("ngo-tab-activity-dot")).toBeInTheDocument();
    const form = screen.getAllByTestId("proof-form")[0];
    const photo = new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" });
    fireEvent.change(form.querySelector('input[name="proofFiles"]')!, { target: { files: [photo] } });
    fireEvent.change(form.querySelector('input[name="beneficiariesReached"]')!, { target: { value: "40" } });
    fireEvent.change(form.querySelector('input[name="quantityDistributed"]')!, { target: { value: "10" } });
    fireEvent.change(form.querySelector('input[name="distributedOn"]')!, { target: { value: "2026-12-01" } });
    fireEvent.change(form.querySelector('input[name="location"]')!, { target: { value: "Community hall" } });
    fireEvent.change(form.querySelector('textarea[name="note"]')!, { target: { value: "Given on Sunday" } });
    fireEvent.click(form.querySelector('input[name="consentConfirmed"]')!);
    fireEvent.submit(form);
    await waitFor(() => expect(api.uploadDistributionProof).toHaveBeenCalledWith(1, [photo], 40,
      expect.objectContaining({ quantityDistributed: 10, location: "Community hall", note: "Given on Sunday", consentConfirmed: true })));
  });
});

describe("History", { timeout: 20000 }, () => {
  it("shows fulfilled drives with View proof plus declined/cancelled/ended offers, and searches them", async () => {
    nav.params = new URLSearchParams("tab=history");
    api.getNgoDriveOffersForNgo.mockImplementation(async (id: number) => (id === 1
      ? [offer(1, "NGO_DECLINED", { ngoDeclineReason: "Torn" }), offer(2, "ENDED"), offer(3, "COMPLETED")] : []));
    renderSections([drive(1, "FULFILLED", { quantityReceived: 10, beneficiariesReached: 50 }), drive(2, "LIVE")]);
    // Declined and ended offers only; the completed one is in the drive report (and never in Activity).
    await waitFor(() => expect(screen.getAllByTestId("history-offer")).toHaveLength(2));
    expect(screen.getByTestId("ngo-tab-activity")).toHaveTextContent(/Activity\s*0/);
    const fulfilled = screen.getByTestId("history-drive");
    expect(fulfilled).toHaveTextContent("50 people reached");
    expect(within(fulfilled).getByRole("link", { name: "View proof" })).toHaveAttribute("href", "/ngo/drives/1/report");
    fireEvent.change(screen.getByTestId("history-search"), { target: { value: "torn" } });
    expect(screen.getAllByTestId("history-offer")).toHaveLength(1);
    expect(screen.getByTestId("history-offer")).toHaveTextContent(/Declined.*Reason: Torn/);
  });
});

describe("live update: a drive handover completing", { timeout: 20000 }, () => {
  it("NGO_DRIVE_OFFER refetches Activity: the offer moves from Scheduled to Received", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=handovers");
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer(3, "HANDOVER_IN_PROGRESS")]);
    renderSections([drive(5, "LIVE")]);
    await waitFor(() => expect(screen.getByTestId("handover-chip-scheduled")).toHaveTextContent(/Scheduled\s*1/));
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer(3, "ISSUE_WINDOW_OPEN")]);
    const listener = [...live.listeners].reverse().find((l) => l.types.includes("NGO_DRIVE_OFFER"))!;
    await act(async () => { listener.cb(); });
    await waitFor(() => expect(screen.getByTestId("handover-chip-received")).toHaveTextContent(/Received\s*1/));
    expect(screen.getByTestId("handover-chip-scheduled")).toHaveTextContent(/Scheduled\s*0/);
  });
});

describe("rows: each item sits in exactly one row", { timeout: 20000 }, () => {
  it("Your Drives: Draft, In review, Live, Drive completed rows under All; a chip shows only its row; approved drives leave", async () => {
    localStorage.setItem("ngo-drive-draft-11", JSON.stringify({ title: "Blankets draft", category: "Clothing" }));
    api.getNgoDriveOffersForNgo.mockResolvedValue([]);
    renderSections([drive(1, "PENDING_REVIEW"), drive(2, "LIVE"), drive(3, "PROOF_SUBMITTED"), drive(4, "FULFILLED")]);
    const rows = () => ["draft", "review", "live", "completed"].filter((r) => screen.queryByTestId(`drive-row-${r}`));
    await waitFor(() => expect(rows()).toEqual(["draft", "review", "live", "completed"]));
    expect(within(screen.getByTestId("drive-row-draft")).getByText("Blankets draft")).toBeInTheDocument();
    expect(within(screen.getByTestId("drive-row-completed")).getByText("Drive 3")).toBeInTheDocument();
    expect(screen.queryByText("Drive 4")).toBeNull();                       // FULFILLED: History only
    fireEvent.click(screen.getByTestId("drive-chip-live"));
    expect(rows()).toEqual(["live"]);
    fireEvent.click(screen.getByTestId("drive-chip-draft"));
    expect(screen.getByRole("link", { name: "Continue editing" })).toHaveAttribute("href", "/ngo/drives/new");
    fireEvent.click(screen.getByRole("button", { name: /Delete draft/ }));
    expect(localStorage.getItem("ngo-drive-draft-11")).toBeNull();
    expect(within(screen.getByTestId("drive-row-draft")).getByText("Nothing here.")).toBeInTheDocument();
  });

  it("Activity: three rows always (empty ones say so); an offer moves Offers -> Handovers -> History as it progresses", async () => {
    nav.params = new URLSearchParams("tab=activity");
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer(1, "PENDING_NGO_REVIEW")]);
    const { unmount } = renderSections([drive(1, "LIVE")]);
    await waitFor(() => expect(within(screen.getByTestId("activity-row-offers")).getAllByTestId("offer-review-card")).toHaveLength(1));
    expect(screen.getByTestId("activity-row-handovers")).toHaveTextContent("No handovers here.");
    expect(screen.getByTestId("activity-row-proof")).toHaveTextContent("No proof due right now.");
    unmount();
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer(1, "NGO_ACCEPTED")]);
    const second = renderSections([drive(1, "LIVE")]);
    await waitFor(() => expect(within(screen.getByTestId("activity-row-handovers")).getAllByTestId("handover-row")).toHaveLength(1));
    expect(within(screen.getByTestId("activity-row-offers")).queryAllByTestId("offer-review-card")).toHaveLength(0);
    second.unmount();
    // Proof approved: the drive and its offer leave Activity for History.
    api.getNgoDriveOffersForNgo.mockResolvedValue([offer(1, "COMPLETED")]);
    renderSections([drive(1, "FULFILLED")]);
    await waitFor(() => expect(screen.getByTestId("ngo-tab-history")).toHaveTextContent(/History\s*1/));
    expect(screen.getByTestId("ngo-tab-activity")).toHaveTextContent(/Activity\s*0/);
  });

  it("an old ?filter= link shows just that row; clicking the chip again shows all three", async () => {
    nav.params = new URLSearchParams("tab=activity&filter=proof");
    api.getNgoDriveOffersForNgo.mockResolvedValue([]);
    renderSections([drive(1, "LIVE")]);
    await waitFor(() => expect(screen.getByTestId("activity-row-proof")).toBeInTheDocument());
    expect(screen.queryByTestId("activity-row-offers")).toBeNull();
    fireEvent.click(screen.getByTestId("activity-chip-proof"));
    expect(nav.replace).toHaveBeenLastCalledWith("/dashboard/ngo?tab=activity", { scroll: false });
  });
});
