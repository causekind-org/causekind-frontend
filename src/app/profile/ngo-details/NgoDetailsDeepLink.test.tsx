import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NgoDetailsPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication, getNgoDraft, getNgoFilePreviewUrl } from "@/lib/api";
import { ChangesRequestedCard } from "@/features/ngo-registration/components/ChangesRequestedCard";
import { correctionFieldInfo, correctionFixHref, orderedCorrectionFields } from "@/features/ngo-registration/ngoCorrectionFields";
import { isNgoFixLink } from "@/components/NotificationBell";

let mockParams: Record<string, string> = {};
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => mockParams[k] ?? null }),
}));
vi.mock("@/lib/api", () => ({
  getMyNgoApplication: vi.fn(),
  getNgoDraft: vi.fn(),
  saveNgoDraft: vi.fn(),
  submitNgoApplication: vi.fn(),
  verifyNgoOtp: vi.fn(),
  resendNgoOtp: vi.fn(),
  uploadNgoDocument: vi.fn(),
  uploadNgoPhoto: vi.fn(),
  getNgoFilePreviewUrl: vi.fn(),
  checkNgoPanLetters: vi.fn().mockResolvedValue({ warnings: [] }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));

const file = (id: number, name: string, kind: "documentId" | "photoId" = "documentId") =>
  ({ [kind]: id, name, size: 1024, mimeType: kind === "photoId" ? "image/png" : "application/pdf" });

/** NEEDS_INFORMATION with one flagged item; the file links come back null (url unavailable). */
function correctionsFor(field: string) {
  vi.mocked(getMyNgoApplication).mockResolvedValue({
    applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "NEEDS_INFORMATION",
    submittedAt: null, verifiedAt: null, updatedAt: null, rejectionReason: null,
    needsInformationDetails: "Please fix", overallNote: "Please fix",
    correctionItems: [{ field, note: "Admin says fix this" }],
  } as never);
  vi.mocked(getNgoDraft).mockResolvedValue({
    currentStep: "org-details",
    organizationName: "Hope Welfare Trust", legalStructure: "trust", registrationNumber: "REG/1",
    registeredOfficeAddress: "12 Shanti Nagar, Pune", yearOfEstablishment: "2019", panNumber: "AAATH1234K",
    officialEmail: "contact@hope.test", organizationPhone: "+919876543210", confirmationChecked: false,
    representatives: [{ fullName: "Ananya Sharma", designation: "Secretary", mobileNumber: "+919876543210",
      email: "contact@hope.test", panNumber: "ABCPS1234K", idProof: file(16, "ananya-id.pdf"), emailVerified: true }],
    documents: { "trust-reg-cert": file(11, "reg.pdf"), pan: file(13, "pan.pdf"), "trust-deed": file(12, "deed.pdf"),
      "bank-proof": file(14, "bank.pdf"), "cert-12a": file(17, "12a.pdf") },
    authorizationLetter: file(15, "letter.pdf"),
    logo: file(21, "logo.png", "photoId"), officePhoto: { ...file(22, "office.png", "photoId"), url: null, unavailable: true },
    activityPhotos: [file(23, "a1.png", "photoId"), file(24, "a2.png", "photoId"), null],
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/profile/ngo-details");
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 7, email: "hope@ngo.test", role: "NGO_PARTNER", fullName: "Hope Welfare Trust" },
    isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn(),
  } as never);
  // A file link that can't be loaded: the card shows a placeholder, never breaks.
  vi.mocked(getNgoFilePreviewUrl).mockRejectedValue(new Error("unavailable"));
});

describe("correction deep link /profile/ngo-details?step=…&fix=…", () => {
  it.each([
    ["officePhoto", 4],
    ["documents.trust-deed", 2],
    ["representatives.0.mobileNumber", 3],
    ["activityPhotos.1", 4],
  ])("opens %s on step %i, focuses it and pulses its note", async (field, step) => {
    correctionsFor(field);
    const url = new URL(correctionFixHref(field), "http://x");
    mockParams = { step: url.searchParams.get("step")!, fix: url.searchParams.get("fix")! };
    render(<NgoDetailsPage />);

    await waitFor(() => expect(screen.getAllByText(new RegExp(`Step ${step} of 6`)).length).toBeGreaterThan(0), { timeout: 8000 });
    const note = await screen.findByText((_, el) => el?.getAttribute("data-correction-field") === field, undefined, { timeout: 8000 });
    await waitFor(() => expect(note.getAttribute("data-pulse")).toBe("true"));
    // Focus moved to the item's own control (its input, or its file card's Replace/thumbnail), not left on the page.
    const active = document.activeElement as HTMLElement | null;
    expect(active && active !== document.body).toBe(true);
    let scope: HTMLElement | null = note.parentElement;
    let inside = false;
    for (let d = 0; scope && d < 4 && !inside; d++, scope = scope.parentElement) inside = scope.contains(active);
    expect(inside || active?.id === "rep-0-mobile").toBe(true);
  }, 20000);

  it("renders with a file whose link is unavailable: placeholder, Replace still there", async () => {
    correctionsFor("logo");
    mockParams = { step: "org-photos", fix: "logo" };
    render(<NgoDetailsPage />);
    await waitFor(() => expect(screen.getAllByText(/Step 4 of 6/).length).toBeGreaterThan(0), { timeout: 8000 });
    expect(screen.getAllByRole("button", { name: /Replace/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Let’s restore your application/)).not.toBeInTheDocument();
  }, 20000);
});

/** Every key the admin can flag (the canonical list), with the step it must open on. */
const ALL_KEYS: [string, number][] = [
  ["organizationName", 1], ["organizationPhone", 1], ["legalStructure", 1], ["registrationNumber", 1],
  ["registeredOfficeAddress", 1], ["yearOfEstablishment", 1], ["officialEmail", 1], ["panNumber", 1],
  ["documents.pan", 1], ["documents.trust-reg-cert", 1], ["documents.trust-deed", 2], ["documents.bank-proof", 2], ["documents.cert-12a", 2],
  ["representativeName", 3], ["designation", 3], ["mobileNumber", 3], ["authorizationLetter", 3],
  ["representatives.0.fullName", 3], ["representatives.0.designation", 3], ["representatives.0.mobileNumber", 3],
  ["representatives.0.email", 3], ["representatives.0.panNumber", 3], ["representatives.0.idProof", 3],
  ["logo", 4], ["officePhoto", 4], ["activityPhotos.0", 4], ["activityPhotos.1", 4],
];

describe("every correction key", () => {
  it.each(ALL_KEYS)("%s: deep link opens step %i, its note is on the page and focus lands on its control", async (field, step) => {
    correctionsFor(field);
    const url = new URL(correctionFixHref(field), "http://x");
    expect(Number(["org-details", "legal-documents", "authorized-rep", "org-photos"].indexOf(url.searchParams.get("step")!)) + 1).toBe(step);
    mockParams = { step: url.searchParams.get("step")!, fix: field };
    render(<NgoDetailsPage />);
    await waitFor(() => expect(screen.getAllByText(new RegExp(`Step ${step} of 6`)).length).toBeGreaterThan(0), { timeout: 8000 });
    const note = await screen.findByText((_, el) => el?.getAttribute("data-correction-field") === field, undefined, { timeout: 8000 });
    await waitFor(() => expect(note.getAttribute("data-pulse")).toBe("true"));
    const active = document.activeElement as HTMLElement | null;
    expect(active && active !== document.body).toBe(true);
    const { fieldId } = correctionFieldInfo(field);
    if (fieldId) expect(active?.id).toBe(fieldId);
  }, 20000);
});

describe("several flagged items", () => {
  const FIELDS = ["officePhoto", "registrationNumber", "documents.trust-deed", "representatives.0.mobileNumber"];

  it("all are highlighted, the first in wizard order opens first, and Next fix walks through all of them", async () => {
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "NEEDS_INFORMATION",
      submittedAt: null, verifiedAt: null, updatedAt: null, rejectionReason: null, needsInformationDetails: "Fix these",
      correctionItems: FIELDS.map((field) => ({ field, note: `Fix ${field}` })),
    } as never);
    correctionsFor("officePhoto");
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "NEEDS_INFORMATION",
      submittedAt: null, verifiedAt: null, updatedAt: null, rejectionReason: null, needsInformationDetails: "Fix these",
      correctionItems: FIELDS.map((field) => ({ field, note: `Fix ${field}` })),
    } as never);
    const first = orderedCorrectionFields(FIELDS)[0];
    expect(first).toBe("registrationNumber");
    const url = new URL(correctionFixHref(first), "http://x");
    mockParams = { step: url.searchParams.get("step")!, fix: first };
    render(<NgoDetailsPage />);

    const summary = await screen.findByRole("status", { name: /Changes requested/i }, { timeout: 8000 });
    expect(summary).toHaveTextContent(/fix 4 items/i);
    const visited: string[] = [];
    const pulsed = async () => {
      await waitFor(() => expect(document.querySelector('[data-pulse="true"]')).not.toBeNull(), { timeout: 8000 });
      const f = document.querySelector('[data-pulse="true"]')!.getAttribute("data-correction-field")!;
      visited.push(f);
      document.querySelector('[data-pulse="true"]')!.removeAttribute("data-pulse");
    };
    await pulsed();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Next fix" }));
      await pulsed();
    }
    expect(visited).toEqual(orderedCorrectionFields(FIELDS));
  }, 30000);

  it("/profile card lists all of them, each with its own Fix this link", () => {
    render(<ChangesRequestedCard application={{
      status: "NEEDS_INFORMATION", overallNote: "Fix these", needsInformationDetails: null, correctionRound: 1,
      correctionItems: FIELDS.map((field) => ({ field, note: `Fix ${field}` })),
    } as never} />);
    expect(screen.getAllByTestId("changes-requested-row")).toHaveLength(4);
    for (const f of FIELDS) {
      expect(screen.getAllByRole("link", { name: /^Fix this:/ }).map((l) => l.getAttribute("href"))).toContain(correctionFixHref(f));
    }
    expect(screen.getByRole("link", { name: /Fix and resubmit/ }).getAttribute("href")).toBe(correctionFixHref("registrationNumber"));
  });
});

describe("links to a flagged item", () => {
  it("/profile card: a Fix this link per row, and Fix and resubmit opens the first item in wizard order", () => {
    render(<ChangesRequestedCard application={{
      status: "NEEDS_INFORMATION", overallNote: "Two fixes", needsInformationDetails: null, correctionRound: 1,
      correctionItems: [{ field: "officePhoto", note: "Wrong photo" }, { field: "registrationNumber", note: "Typo" }],
    } as never} />);
    expect(screen.getByRole("link", { name: "Fix this: Office photo" }).getAttribute("href")).toMatch(/^\/profile\/ngo-details\?step=org-photos&fix=officePhoto$/i);
    expect(screen.getByRole("link", { name: /Fix this: Registration/ }).getAttribute("href")).toBe("/profile/ngo-details?step=org-details&fix=registrationNumber");
    expect(screen.getByRole("link", { name: /Fix and resubmit/ }).getAttribute("href")).toBe("/profile/ngo-details?step=org-details&fix=registrationNumber");
  });

  it("notification Fix now: the backend's link format is a fix deep link; other NGO links are not", () => {
    expect(isNgoFixLink("/profile/ngo-details?step=org-photos&fix=officePhoto")).toBe(true);
    expect(isNgoFixLink(correctionFixHref("representatives.0.mobileNumber"))).toBe(true);
    expect(isNgoFixLink("/profile/ngo-details")).toBe(false);
    expect(isNgoFixLink("/ngo/drives/4")).toBe(false);
  });
});
