import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup, configure } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NGORegistration } from "./NGORegistration";
import { getNgoDraft, ngoWizardPanCheck, type NgoDraftDto } from "@/lib/api";

/**
 * The wizard opens with everything given at NGO signup (the backend writes it into the
 * NGO's draft at signup, the PAN card into the PAN slot), for normal and Google signup
 * alike since both write the same draft; values survive a reload. A structure that does
 * not match the signup PAN warns next to the structure.
 */

configure({ asyncUtilTimeout: 8000 });

// One stable object, as the real hook returns: the wizard reloads its draft when the user changes.
const mockAuth = { user: { email: "contact@hope.test", fullName: "The Hope Welfare Trust", phone: "+919876543210", role: "NGO_PARTNER" } };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth }));

vi.mock("@/lib/api", () => ({
  uploadNgoDocument: vi.fn(),
  uploadNgoPhoto: vi.fn(),
  submitNgoApplication: vi.fn(),
  verifyNgoOtp: vi.fn(),
  resendNgoOtp: vi.fn(),
  getMyNgoApplication: vi.fn().mockResolvedValue(null),
  getNgoDraft: vi.fn(),
  saveNgoDraft: vi.fn().mockResolvedValue({}),
  ngoWizardPanCheck: vi.fn(),
}));

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = vi.fn();
});

/** What the backend saves at signup (see AuthController.startNgoWizardDraft + signup-pan-card). */
const signupDraft: NgoDraftDto = {
  currentStep: "org-details",
  organizationName: "The Hope Welfare Trust",
  legalStructure: "trust",
  yearOfEstablishment: "2011",
  registeredOfficeAddress: "Pune, Maharashtra, India",
  mobileNumber: "+919876543210",
  officialEmail: "contact@hope.test",
  documents: { "trust-pan": { documentId: 501, name: "pan.pdf", key: "ngo-documents/x.pdf", mimeType: "application/pdf", size: 1000 } },
} as unknown as NgoDraftDto;

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

beforeEach(() => {
  vi.mocked(getNgoDraft).mockReset().mockResolvedValue(signupDraft);
  vi.mocked(ngoWizardPanCheck).mockReset().mockImplementation(async ({ legalStructure }) => ({
    warnings: legalStructure === "trust" ? [] : [{
      code: "STRUCTURE_MISMATCH", severity: "WARNING", field: "legalStructure",
      message: "This PAN is not a Society PAN. Please check the structure or the PAN.",
    }],
  }) as never);
});

describe("NGO wizard prefilled from signup", { timeout: 30000 }, () => {
  it("pre-fills every mapped field, including the PAN document, and keeps them after a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("The Hope Welfare Trust"));
    expect(screen.getByRole("button", { name: /Trust/ })).toHaveAttribute("aria-pressed", "true");
    expect(input("ngo-year").value).toBe("2011");
    expect((document.getElementById("ngo-address") as HTMLTextAreaElement).value).toBe("Pune, Maharashtra, India");

    // Reload: a fresh mount reads the same saved draft.
    unmount();
    cleanup();
    render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("The Hope Welfare Trust"));
    expect(input("ngo-year").value).toBe("2011");

    // Step 2 holds the PAN card in the trust PAN slot.
    await user.type(input("ngo-reg-no"), "TR/2011/123");
    await user.click(screen.getByRole("button", { name: /Continue/i }));
    expect(await screen.findByText("pan.pdf")).toBeInTheDocument();
  });

  it("never replaces a value the NGO already saved in its draft", async () => {
    vi.mocked(getNgoDraft).mockResolvedValue({ ...signupDraft, organizationName: "Hope Welfare (edited)", mobileNumber: "+919800000000" } as NgoDraftDto);
    render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("Hope Welfare (edited)"));
  });

  it("warns next to the structure when it no longer matches the signup PAN", async () => {
    const user = userEvent.setup();
    render(<NGORegistration />);
    await waitFor(() => expect(input("ngo-org-name").value).toBe("The Hope Welfare Trust"));
    expect(screen.queryByTestId("pan-warning-STRUCTURE_MISMATCH")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Society/ }));
    expect(await screen.findByTestId("pan-warning-STRUCTURE_MISMATCH")).toHaveTextContent("This PAN is not a Society PAN");
    expect(vi.mocked(ngoWizardPanCheck).mock.calls.at(-1)?.[0]).toEqual({ legalStructure: "society", organizationName: "The Hope Welfare Trust" });
  });
});
