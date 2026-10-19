import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";

const api = vi.hoisted(() => ({
  uploadDistributionProof: vi.fn(),
  getMyNgoApplication: vi.fn(), getNgoDraft: vi.fn(), getNgoOverview: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
const auth = vi.hoisted(() => ({ user: { id: 11, email: "ngo@x.test", role: "NGO_PARTNER", fullName: "Hope" } as Record<string, unknown> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));

import { DriveProofPanel, validateProof, type ProofForm } from "./manage/DriveProofPanel";
import { DriveProofCard } from "./DriveProofCard";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";

const drive = { id: 1, status: "COLLECTION_COMPLETE", quantityReceived: 12, beneficiaryCount: 50, collectionCompletedAt: "2026-10-10T09:00:00", title: "Jackets" } as never;
const full: ProofForm = { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })], reached: "40", distributedOn: "2026-10-12", location: "Hall", quantity: "12", note: "Done", consent: true };

beforeEach(() => vi.clearAllMocks());

describe("proof form validation", () => {
  it("every field is required, quantity within what was received, consent needed", () => {
    expect(validateProof(full, drive)).toEqual({});
    const e = validateProof({ files: [], reached: "", distributedOn: "", location: " ", quantity: "13", note: "", consent: false }, drive);
    expect(Object.keys(e).sort()).toEqual(["consent", "distributedOn", "files", "location", "note", "quantity", "reached"]);
    expect(validateProof({ ...full, files: Array(11).fill(full.files[0]) }, drive).files).toBe("Up to 10 photos.");
  });

  it("the date isn't limited to today: any day from collection completed on, including the future", () => {
    expect(validateProof({ ...full, distributedOn: "2030-01-01" }, drive)).toEqual({});
    expect(validateProof({ ...full, distributedOn: "2026-10-09" }, drive).distributedOn).toMatch(/on or after 2026-10-10/);
  });

  it("the card: quantity defaults to the received amount, the date input has no max, Submit waits until all valid", () => {
    const { container } = render(<DriveProofPanel drive={drive} onSubmitted={vi.fn()} />);
    const date = container.querySelector('input[name="distributedOn"]') as HTMLInputElement;
    expect(date.max).toBe("");
    expect(date.min).toBe("2026-10-10");
    expect((container.querySelector('input[name="quantityDistributed"]') as HTMLInputElement).value).toBe("12");
    expect(screen.getByRole("button", { name: /Submit proof/ })).toBeDisabled();
    expect(screen.getByTestId("proof-submit-hint")).toHaveTextContent(/need your attention/);
    // A wrong file type is refused inline; a photo is counted.
    fireEvent.change(screen.getByTestId("proof-file-input"), { target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] } });
    expect(screen.getByText(/only JPG or PNG/)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("proof-file-input"), { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
    expect(screen.getByTestId("proof-photo-count")).toHaveTextContent("1/10");
    fireEvent.change(date, { target: { value: "2026-10-12" } });
    fireEvent.change(container.querySelector('input[name="location"]')!, { target: { value: "Hall" } });
    fireEvent.change(container.querySelector('textarea[name="note"]')!, { target: { value: "Done" } });
    fireEvent.click(container.querySelector('input[name="consentConfirmed"]')!);
    expect(screen.getByRole("button", { name: /Submit proof/ })).toBeEnabled();
  });
});

describe("donor proof card", () => {
  it("shows people, quantity, date, location, note and NGO; photos enlarge; no consent flag", async () => {
    render(<DriveProofCard proof={{ id: 1, driveId: 1, uploadedAt: "", status: "APPROVED", media: [{ mediaUrl: "https://x/1.jpg", mediaType: "IMAGE" }],
      quantityDistributed: 10, beneficiariesReached: 50, ngoStatement: "Given on Sunday", distributedOn: "2026-10-12", location: "Community hall",
      ngoName: "Hope Trust", itemName: "Jackets", beneficiaryGroup: "Children" }} />);
    const card = screen.getByTestId("drive-proof-card");
    for (const t of ["Hope Trust", "50 children", "10 jackets", "12 Oct 2026", "Community hall", "Given on Sunday"]) expect(card).toHaveTextContent(t);
    expect(card).not.toHaveTextContent(/consent/i);
    fireEvent.click(screen.getByRole("button", { name: "Enlarge photo 1" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByRole("img", { name: "Distribution photo 1" })).toHaveAttribute("src", "https://x/1.jpg"));
  });
});

describe("NGO pages don't flicker on refresh", () => {
  it("a background refresh keeps isVerified (no loading flip), first load shows loading", async () => {
    api.getMyNgoApplication.mockResolvedValue({ status: "APPROVED", organizationName: "Hope" });
    api.getNgoDraft.mockResolvedValue(null);
    api.getNgoOverview.mockResolvedValue({ canStartDrive: true });
    const { result } = renderHook(() => useNgoStatus());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isVerified).toBe(true));
    let release!: (v: unknown) => void;
    api.getMyNgoApplication.mockReturnValue(new Promise((r) => { release = r; }));
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(result.current.isLoading).toBe(false);           // was true for ~2s: every NGO page dropped to its locked state
    expect(result.current.isVerified).toBe(true);
    await act(async () => { release({ status: "APPROVED" }); });
    expect(result.current.isVerified).toBe(true);
  });
});
