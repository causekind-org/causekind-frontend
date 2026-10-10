import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NgoDetailsPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyNgoApplication,
  getNgoDraft,
  saveNgoDraft,
  submitNgoApplication,
  uploadNgoDocument,
} from "@/lib/api";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
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
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));

type AuthUser = { id: number; email: string; role: string; fullName?: string; phone?: string };
function signedIn(user: AuthUser) {
  vi.mocked(useAuth).mockReturnValue({
    user, isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn(),
  } as never);
}

const NGO: AuthUser = { id: 7, email: "hope@ngo.test", role: "NGO_PARTNER", fullName: "Hope Welfare Trust", phone: "+919876543210" };

async function openStep(name: RegExp) {
  fireEvent.click(screen.getAllByRole("button", { name })[0]);
}

describe("NGO wizard: prefill from signup (point 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState(null, "", "/profile/ngo-details");
  });

  it("fills organization name, mobile and official email on first open", async () => {
    signedIn(NGO);
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);
    render(<NgoDetailsPage />);

    expect(await screen.findByLabelText(/Organization Name/i)).toHaveValue("Hope Welfare Trust");
    await openStep(/Authorized Representative/i);
    expect(await screen.findByLabelText(/Mobile Number/i)).toHaveValue("+919876543210");
    expect(screen.getByLabelText(/Official Email Address/i)).toHaveValue("hope@ngo.test");
  }, 15000);

  it("fills them when a saved draft has them empty, and keeps what the NGO typed", async () => {
    signedIn(NGO);
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue({
      currentStep: "org-details", organizationName: "Typed Name Trust", mobileNumber: "", officialEmail: "",
    } as never);
    render(<NgoDetailsPage />);

    expect(await screen.findByLabelText(/Organization Name/i)).toHaveValue("Typed Name Trust");
    await openStep(/Authorized Representative/i);
    expect(await screen.findByLabelText(/Mobile Number/i)).toHaveValue("+919876543210");
    expect(screen.getByLabelText(/Official Email Address/i)).toHaveValue("hope@ngo.test");
  }, 15000);

  it("fills the phone when it arrives after login, without resetting what was typed", async () => {
    // Login stores the user without a phone; /users/me adds it a moment later.
    signedIn({ ...NGO, phone: undefined });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);
    const { rerender } = render(<NgoDetailsPage />);

    const regNo = await screen.findByLabelText(/Registration Number/i);
    await userEvent.type(regNo, "TR-1");
    signedIn({ ...NGO });
    rerender(<NgoDetailsPage />);

    expect(screen.getByLabelText(/Registration Number/i)).toHaveValue("TR-1");
    expect(getMyNgoApplication).toHaveBeenCalledTimes(1);
    await openStep(/Authorized Representative/i);
    expect(await screen.findByLabelText(/Mobile Number/i)).toHaveValue("+919876543210");
  }, 15000);
});

describe("NGO wizard: per-item corrections (point 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState(null, "", "/profile/ngo-details");
  });

  const file = (id: number, name: string, kind: "documentId" | "photoId" = "documentId") =>
    ({ [kind]: id, name, size: 1024, mimeType: kind === "photoId" ? "image/png" : "application/pdf" });

  /** What the backend returns after "Request corrections" on registrationNumber + trust-deed. */
  function correctionRequested() {
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "NEEDS_INFORMATION",
      submittedAt: null, verifiedAt: null, updatedAt: null, rejectionReason: null,
      needsInformationDetails: "Please correct: …",
      correctionItems: [
        { field: "registrationNumber", note: "Does not match the certificate" },
        { field: "documents.trust-deed", note: "The deed scan is cut off" },
      ],
    } as never);
    vi.mocked(getNgoDraft).mockResolvedValue({
      currentStep: "org-details",
      organizationName: "Hope Welfare Trust", legalStructure: "trust", registrationNumber: "",
      registeredOfficeAddress: "12 Shanti Nagar, Pune", yearOfEstablishment: "2019",
      representativeName: "Ananya Sharma", designation: "Secretary", mobileNumber: "+919876543210",
      officialEmail: "contact@hope.test", confirmationChecked: false,
      documents: { "trust-reg-cert": file(11, "reg.pdf"), "trust-pan": file(13, "pan.pdf"), "trustee-info": file(14, "trustees.pdf") },
      authorizationLetter: file(15, "letter.pdf"),
      logo: file(21, "logo.png", "photoId"), officePhoto: file(22, "office.png", "photoId"),
      activityPhotos: [file(23, "activity.png", "photoId"), null, null],
    } as never);
  }

  it("shows everything else filled, the 2 flagged items empty with notes, then resubmits only the fixes", async () => {
    signedIn(NGO);
    correctionRequested();
    vi.mocked(uploadNgoDocument).mockResolvedValue({ documentId: 99, s3Key: "ngo-documents/new.pdf", fileUrl: null } as never);
    vi.mocked(submitNgoApplication).mockResolvedValue({ applicationId: "CK-NGO-2026-BBBB0002", status: "PENDING_VERIFICATION", officialEmail: "hope@ngo.test" } as never);
    render(<NgoDetailsPage />);

    // Summary at the top lists both items.
    const summary = await screen.findByRole("status", { name: /Changes requested/i });
    expect(within(summary).getByText(/fix 2 items/i)).toBeInTheDocument();
    expect(within(summary).getByRole("button", { name: "Registration number" })).toBeInTheDocument();
    expect(within(summary).getByRole("button", { name: "Registered Trust Deed" })).toBeInTheDocument();

    // Step 1 (first flagged step): registration number empty with its note; the rest filled.
    expect(screen.getAllByText(/Step 1 of 6/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Registration Number/i)).toHaveValue("");
    expect(screen.getByLabelText(/Organization Name/i)).toHaveValue("Hope Welfare Trust");
    expect(screen.getByLabelText(/Registered Office Address/i)).toHaveValue("12 Shanti Nagar, Pune");
    expect(screen.getByLabelText(/Year of Establishment/i)).toHaveValue("2019");
    expect(screen.getAllByTestId("correction-note").map(n => n.textContent)).toEqual(["Needs a fix: Does not match the certificate"]);

    // Step 2: three documents carried over, the deed empty with its note.
    await openStep(/Legal Documents/i);
    await screen.findAllByText(/Step 2 of 6/i);
    expect(screen.getAllByTestId("correction-note").map(n => n.textContent)).toEqual(["Needs a fix: The deed scan is cut off"]);
    expect(screen.getByText("reg.pdf")).toBeInTheDocument();
    expect(screen.getByText("pan.pdf")).toBeInTheDocument();
    expect(screen.getByText("trustees.pdf")).toBeInTheDocument();
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(1); // only the flagged deed is waiting for an upload

    // Steps 3 and 4 carried over too, with no notes.
    await openStep(/Authorized Representative/i);
    expect(await screen.findByLabelText(/Mobile Number/i)).toHaveValue("+919876543210");
    expect(screen.getByLabelText(/Official Email Address/i)).toHaveValue("contact@hope.test");
    expect(screen.getByText("letter.pdf")).toBeInTheDocument();
    expect(screen.queryAllByTestId("correction-note")).toHaveLength(0);

    // Fix the two items.
    await openStep(/Organization Details/i);
    await userEvent.type(await screen.findByLabelText(/Registration Number/i), "TR/2026/1002");
    await openStep(/Legal Documents/i);
    await screen.findAllByText(/Step 2 of 6/i);
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(["%PDF-1.4"], "deed-new.pdf", { type: "application/pdf" })] },
    });
    await screen.findByText("deed-new.pdf");

    // Resubmit.
    await openStep(/Review & Submit/i);
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/i }));
    await waitFor(() => expect(submitNgoApplication).toHaveBeenCalledTimes(1));
    const body = vi.mocked(submitNgoApplication).mock.calls[0][0] as never as Record<string, any>;
    expect(body.registrationNumber).toBe("TR/2026/1002");
    expect(body.organizationName).toBe("Hope Welfare Trust");
    expect(body.documents["trust-deed"].documentId).toBe(99);
    expect(body.documents["trust-reg-cert"].documentId).toBe(11);
    expect(body.documents["trust-pan"].documentId).toBe(13);
    expect(body.authorizationLetter.documentId).toBe(15);
    expect(body.logo.photoId).toBe(21);
    expect(body.officePhoto.photoId).toBe(22);
    expect(body.activityPhotos[0].photoId).toBe(23);
    expect((await screen.findAllByText(/Step 6 of 6/i)).length).toBeGreaterThan(0);
  }, 30000);

  it("never refills a flagged signup field (organization name) from the account", async () => {
    signedIn(NGO);
    correctionRequested();
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "NEEDS_INFORMATION",
      correctionItems: [{ field: "organizationName", note: "Use the registered name" }],
    } as never);
    const draft = (await getNgoDraft()) as Record<string, unknown>;
    vi.mocked(getNgoDraft).mockResolvedValue({ ...draft, organizationName: "", registrationNumber: "TR/2026/1001" } as never);
    render(<NgoDetailsPage />);

    expect(await screen.findByLabelText(/Organization Name/i)).toHaveValue("");
    expect(screen.getAllByText(/Use the registered name/)).toHaveLength(2); // summary + next to the field
    expect(saveNgoDraft).not.toHaveBeenCalled();
  }, 15000);

  it("opens on the first flagged step when only photos were flagged", async () => {
    signedIn(NGO);
    correctionRequested();
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "NEEDS_INFORMATION",
      correctionItems: [{ field: "officePhoto", note: "Show the nameboard" }],
    } as never);
    render(<NgoDetailsPage />);
    expect((await screen.findAllByText(/Step 4 of 6/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Show the nameboard/)).toHaveLength(2);
  }, 15000);
});
