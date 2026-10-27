import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/font/google", () => ({
  Dancing_Script: () => ({ style: { fontFamily: "cursive" } }),
  Playfair_Display: () => ({ style: { fontFamily: "serif" }, className: "" }),
}));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,x") } }));

const base = {
  id: 1, offerId: 7, matchId: null, certificateNumber: "CK-2026-001", donorName: "Asha Rao", category: "Blankets",
  quantityDelivered: 3, handoverDate: "2026-10-01T10:00:00", qrCodeUrl: null, pdfUrl: null, issuedAt: "2026-10-01T10:00:00",
};
const getDrive = vi.fn();
const getOffer = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  getNgoDriveOfferCertificate: (...a: unknown[]) => getDrive(...a),
  getOfferCertificate: (...a: unknown[]) => getOffer(...a),
}));

import CertificatePage from "./page";

const row = (label: string) => screen.queryByRole("cell", { name: label });

describe("certificate page", () => {
  beforeEach(() => { getDrive.mockReset(); getOffer.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("drive certificate: NGO and Drive rows right after the donor, no Condition", async () => {
    search = "offerId=7&type=ngo_drive";
    const longTitle = "Winter blankets for the night shelters of the old city ".repeat(3).trim();
    getDrive.mockResolvedValue({ ...base, condition: "GOOD", ngoName: "Helping Hands Foundation", driveTitle: longTitle, quantityUnit: "pieces" });
    render(<CertificatePage />);
    expect(await screen.findByText("Helping Hands Foundation")).toBeInTheDocument();
    expect(getDrive).toHaveBeenCalledWith(7);
    expect(getOffer).not.toHaveBeenCalled();
    expect(row("NGO")).toBeInTheDocument();
    expect(row("Drive")).toBeInTheDocument();
    expect(row("Condition")).toBeNull();
    expect(screen.queryByText("GOOD")).toBeNull();
    const labels = Array.from(document.querySelectorAll("tbody tr td:first-child")).map((td) => td.textContent);
    expect(labels).toEqual(["NGO", "Drive", "Item Donated", "Quantity", "Donation Date", "Certificate ID"]);
    expect(row("Quantity")?.nextElementSibling).toHaveTextContent(/^3 pieces$/);
    expect(screen.getByText(longTitle)).toHaveStyle({ overflowWrap: "anywhere" });
  });

  it("drive certificate: Download PDF fetches the drive PDF endpoint and downloads the blob", async () => {
    search = "offerId=7&type=ngo_drive";
    getDrive.mockResolvedValue({ ...base, ngoName: "N", driveTitle: "D" });
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(blob) });
    vi.stubGlobal("fetch", fetchMock);
    const createUrl = vi.fn(() => "blob:cert");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe("blob:cert");
      expect(this.download).toBe("CauseKind-Certificate-CK-2026-001.pdf");
    });
    render(<CertificatePage />);
    fireEvent.click(await screen.findByRole("button", { name: /Download PDF/ }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/drive-offers\/7\/certificate\/pdf$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "include" });
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(revoke).toHaveBeenCalledWith("blob:cert");
    click.mockRestore();
  });

  it("verify link (certNumber) for a drive certificate also shows NGO and Drive, no Condition", async () => {
    search = "certNumber=CK-2026-001";
    const api = await import("@/lib/api");
    vi.spyOn(api, "verifyCertificate").mockResolvedValue({ ...base, ngoName: "Helping Hands", driveTitle: "Winter drive" } as never);
    render(<CertificatePage />);
    expect(await screen.findByText("Helping Hands")).toBeInTheDocument();
    expect(row("Drive")).toBeInTheDocument();
    expect(row("Condition")).toBeNull();
  });

  it("donee certificate is unchanged: Condition shown, no NGO/Drive rows", async () => {
    search = "offerId=9";
    getOffer.mockResolvedValue({ ...base, offerId: 9, condition: "Like new" });
    render(<CertificatePage />);
    expect(await screen.findByText("Like new")).toBeInTheDocument();
    expect(getOffer).toHaveBeenCalledWith(9);
    expect(getDrive).not.toHaveBeenCalled();
    expect(row("Condition")).toBeInTheDocument();
    expect(row("NGO")).toBeNull();
    expect(row("Drive")).toBeNull();
    expect(row("Quantity")).toBeNull();
    const labels = Array.from(document.querySelectorAll("tbody tr td:first-child")).map((td) => td.textContent);
    expect(labels).toEqual(["Item Donated", "Condition", "Donation Date", "Certificate ID"]);
  });
});
